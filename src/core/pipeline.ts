/**
 * Pipeline - Orchestrates the full fetch lifecycle:
 *   guardails.beforeFetch → attach guardrails → navigate → afterFetch checks → extract
 */

import { FetchOptions } from '../types/fetch';
import { FetchResult, ExtractedContent } from '../types/result';
import { CostMetrics, FetchDiagnostics } from '../types/metrics';
import { BrowserFetchErrorShape } from '../types/errors';
import { GuardrailContext } from '../types/guardrails';
import { GuardrailManager } from '../guardrails/guardrail-manager';
import { ContentSizeGuard } from '../guardrails/content-size-guard';
import { PageSession } from './page-session';
import { FetchRunner } from './fetch-runner';
import { ContentExtractor } from './content-extractor';
import { BrowserFetchError } from '../errors/base-error';

export class Pipeline {
  private guardrailManager: GuardrailManager;
  private fetchRunner: FetchRunner;
  private contentExtractor: ContentExtractor;

  constructor(guardrailManager: GuardrailManager) {
    this.guardrailManager = guardrailManager;
    this.fetchRunner = new FetchRunner();
    this.contentExtractor = new ContentExtractor();
  }

  async run(session: PageSession, options: FetchOptions): Promise<FetchResult> {
    const startedAt = Date.now();
    const abortController = new AbortController();

    const partialMetrics: Partial<CostMetrics> = {
      startedAt,
      requestCount: 0,
      blockedRequestCount: 0,
      totalBytesDownloaded: 0,
    };

    const ctx: GuardrailContext = {
      page: session.page,
      context: session.context,
      options,
      metrics: partialMetrics,
      abortSignal: abortController.signal,
      abortController,
    };

    try {
      // Run pre-flight checks
      await this.guardrailManager.runBeforeFetch(ctx);

      // Attach page-level guardrail listeners
      await this.guardrailManager.attachAll(ctx);

      // Execute navigation
      const navResult = await this.fetchRunner.navigate(
        session.page,
        options,
        abortController.signal
      );

      // Post-navigation guardrail checks
      await this.guardrailManager.runAfterFetch(ctx, navResult.html);

      // Extract content
      const content = await this.contentExtractor.extract(
        session.page,
        options
      );

      // Layer 3: Check output size (ContentSizeGuard)
      const contentSizeGuard =
        this.guardrailManager.findGuardrail(ContentSizeGuard);
      if (contentSizeGuard) {
        const outputText =
          content.html ?? content.text ?? content.markdown ?? '';
        contentSizeGuard.checkOutputSize(outputText, options.maxContentSize);
      }

      const completedAt = Date.now();
      const metrics: CostMetrics = {
        durationMs: completedAt - startedAt,
        totalBytesDownloaded: partialMetrics.totalBytesDownloaded ?? 0,
        requestCount: partialMetrics.requestCount ?? 0,
        blockedRequestCount: partialMetrics.blockedRequestCount ?? 0,
        ttfbMs: partialMetrics.ttfbMs,
        startedAt,
        completedAt,
      };

      const diagnostics: FetchDiagnostics = {
        isWechatArticle: !!content.wechat,
        htmlSizeBytes: Buffer.byteLength(navResult.html, 'utf8'),
        outputSizeBytes: this.computeOutputSize(content, options.outputFormat),
        domainsEncountered: session.networkTracker.getDomainsEncountered(),
        redirectChain: session.networkTracker.getRedirectChain(),
      };

      return {
        ok: true,
        finalUrl: navResult.finalUrl,
        status: navResult.status,
        title: content.title,
        content,
        metrics,
        diagnostics,
      };
    } catch (err: any) {
      const completedAt = Date.now();

      let errorShape: BrowserFetchErrorShape;
      if (err instanceof BrowserFetchError) {
        errorShape = err.toShape();
      } else {
        errorShape = {
          code: 'UNKNOWN',
          message: err?.message ?? String(err),
          stack: err?.stack,
        };
      }

      // Capture screenshot on error if requested
      let errorScreenshot: string | undefined;
      if (options.screenshotOnError) {
        try {
          const buf = await session.page.screenshot({
            type: 'png',
            fullPage: false,
          });
          errorScreenshot = buf.toString('base64');
        } catch {
          // Non-fatal
        }
      }

      const metrics: CostMetrics = {
        durationMs: completedAt - startedAt,
        totalBytesDownloaded: partialMetrics.totalBytesDownloaded ?? 0,
        requestCount: partialMetrics.requestCount ?? 0,
        blockedRequestCount: partialMetrics.blockedRequestCount ?? 0,
        ttfbMs: partialMetrics.ttfbMs,
        startedAt,
        completedAt,
      };

      const diagnostics: FetchDiagnostics = {
        isWechatArticle: false,
        htmlSizeBytes: 0,
        outputSizeBytes: 0,
        domainsEncountered: session.networkTracker.getDomainsEncountered(),
        redirectChain: session.networkTracker.getRedirectChain(),
        errorScreenshot,
      };

      return {
        ok: false,
        finalUrl: session.page.url() || options.url,
        content: {},
        metrics,
        diagnostics,
        error: errorShape,
      };
    } finally {
      await this.guardrailManager.detachAll(ctx);
    }
  }

  private computeOutputSize(
    content: ExtractedContent,
    format?: string
  ): number {
    const text = content.html ?? content.text ?? content.markdown ?? '';
    return Buffer.byteLength(text, 'utf8');
  }
}
