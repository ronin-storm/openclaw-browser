/**
 * CostGuard - Track request counts, traffic, and timing
 */

import {
  Guardrail,
  GuardrailContext,
  GuardrailResult,
} from '../types/guardrails';
import { Request, Response } from 'playwright';

export class CostGuard implements Guardrail {
  readonly name = 'CostGuard';

  private requestListeners = new Map<
    GuardrailContext,
    (req: Request) => void
  >();
  private responseListeners = new Map<
    GuardrailContext,
    (res: Response) => void
  >();

  async attach(ctx: GuardrailContext): Promise<void> {
    const metrics = ctx.metrics;
    metrics.requestCount = 0;
    metrics.blockedRequestCount = 0;
    metrics.totalBytesDownloaded = 0;

    const onRequest = (_req: Request) => {
      metrics.requestCount = (metrics.requestCount ?? 0) + 1;
    };

    const onResponse = async (res: Response) => {
      try {
        const headers = res.headers();
        const contentLength = headers['content-length'];
        if (contentLength) {
          metrics.totalBytesDownloaded =
            (metrics.totalBytesDownloaded ?? 0) + parseInt(contentLength, 10);
        } else {
          // Try to get body size
          try {
            const body = await res.body();
            metrics.totalBytesDownloaded =
              (metrics.totalBytesDownloaded ?? 0) + body.length;
          } catch {
            // Body may not be available for all resource types
          }
        }

        // Track TTFB from the first navigation/document response
        if (metrics.ttfbMs === undefined) {
          const req = res.request();
          const isNavDoc =
            req.isNavigationRequest() || req.resourceType() === 'document';
          if (isNavDoc) {
            metrics.ttfbMs = Date.now() - (metrics.startedAt ?? Date.now());
          }
        }
      } catch {
        // Non-fatal
      }
    };

    this.requestListeners.set(ctx, onRequest);
    this.responseListeners.set(ctx, onResponse);

    ctx.page.on('request', onRequest);
    ctx.page.on('response', onResponse);
  }

  async detach(ctx: GuardrailContext): Promise<void> {
    const onRequest = this.requestListeners.get(ctx);
    const onResponse = this.responseListeners.get(ctx);

    if (onRequest) {
      ctx.page.off('request', onRequest);
      this.requestListeners.delete(ctx);
    }
    if (onResponse) {
      ctx.page.off('response', onResponse);
      this.responseListeners.delete(ctx);
    }
  }
}
