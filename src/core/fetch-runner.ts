/**
 * FetchRunner - Executes the actual Playwright navigation
 */

import { Page } from 'playwright';
import { FetchOptions } from '../types/fetch';
import { TimeoutError, NavigationFailedError } from '../errors/base-error';
import { TimeoutGuard } from '../guardrails/timeout-guard';

const DEFAULT_TIMEOUT_MS = 15_000;

export interface NavigationResult {
  finalUrl: string;
  status: number;
  html: string;
}

export class FetchRunner {
  async navigate(
    page: Page,
    options: FetchOptions,
    abortSignal: AbortSignal
  ): Promise<NavigationResult> {
    const timeoutMs = options.pageTimeout ?? DEFAULT_TIMEOUT_MS;

    // Set custom headers if provided
    if (options.headers) {
      await page.setExtraHTTPHeaders(options.headers);
    }

    let status = 0;

    // Navigate with timeout
    const navigationPromise = async () => {
      try {
        const response = await page.goto(options.url, {
          waitUntil: options.waitUntil ?? 'load',
          timeout: timeoutMs,
        });

        if (!response) {
          throw new NavigationFailedError(options.url, 'No response received');
        }

        status = response.status();

        // Extra wait for lazy-loaded content
        if (options.extraWaitMs && options.extraWaitMs > 0) {
          await page.waitForTimeout(options.extraWaitMs);
        }
      } catch (err: any) {
        if (abortSignal.aborted) {
          throw new TimeoutError(`Navigation aborted after ${timeoutMs}ms`);
        }
        if (
          err instanceof NavigationFailedError ||
          err instanceof TimeoutError
        ) {
          throw err;
        }
        // Playwright timeout error
        if (err.message?.includes('Timeout') || err.name === 'TimeoutError') {
          throw new TimeoutError(`Navigation timed out after ${timeoutMs}ms`);
        }
        throw new NavigationFailedError(options.url, err.message);
      }
    };

    await TimeoutGuard.withTimeout(navigationPromise(), timeoutMs);

    const finalUrl = page.url();
    const html = await page.content();

    return { finalUrl, status, html };
  }
}
