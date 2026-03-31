/**
 * TimeoutGuard - Total operation timeout control
 * This is a wall-clock timeout that wraps the entire fetch operation,
 * independent of Playwright's internal timeouts.
 */

import {
  Guardrail,
  GuardrailContext,
  GuardrailResult,
} from '../types/guardrails';
import { TimeoutError } from '../errors/base-error';

const DEFAULT_TIMEOUT_MS = 15_000;

export class TimeoutGuard implements Guardrail {
  readonly name = 'TimeoutGuard';

  private defaultTimeoutMs: number;
  private timers = new Map<GuardrailContext, NodeJS.Timeout>();

  constructor(defaultTimeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  async attach(ctx: GuardrailContext): Promise<void> {
    const timeoutMs = ctx.options.pageTimeout ?? this.defaultTimeoutMs;

    const timer = setTimeout(() => {
      // Abort the fetch via the abort controller
      ctx.abortController.abort(new Error(`Timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    // Don't block Node.js exit
    if (timer.unref) timer.unref();
    this.timers.set(ctx, timer);
  }

  async detach(ctx: GuardrailContext): Promise<void> {
    const timer = this.timers.get(ctx);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(ctx);
    }
  }

  /**
   * Wrap a promise with a timeout. Throws TimeoutError if exceeded.
   */
  static withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new TimeoutError(`Operation timed out after ${ms}ms`));
      }, ms);

      promise.then(
        (val) => {
          clearTimeout(timer);
          resolve(val);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        }
      );
    });
  }
}
