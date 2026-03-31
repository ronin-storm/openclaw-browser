/**
 * ConcurrencyGuard - Semaphore-based concurrency limiter
 */

import {
  Guardrail,
  GuardrailContext,
  GuardrailResult,
} from '../types/guardrails';

class Semaphore {
  private count: number;
  private queue: Array<() => void> = [];

  constructor(maxConcurrency: number) {
    this.count = maxConcurrency;
  }

  async acquire(): Promise<void> {
    if (this.count > 0) {
      this.count--;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next();
    } else {
      this.count++;
    }
  }

  get available(): number {
    return this.count;
  }

  get waiting(): number {
    return this.queue.length;
  }
}

export class ConcurrencyGuard implements Guardrail {
  readonly name = 'ConcurrencyGuard';

  private semaphore: Semaphore;
  private acquiredContexts = new WeakSet<object>();

  constructor(maxConcurrency: number = 2) {
    this.semaphore = new Semaphore(maxConcurrency);
  }

  /**
   * Acquire the semaphore slot directly (called before PageSession.create()).
   * Returns a release function. Callers must invoke release() on cleanup.
   */
  async acquireSlot(): Promise<() => void> {
    await this.semaphore.acquire();
    let released = false;
    return () => {
      if (!released) {
        released = true;
        this.semaphore.release();
      }
    };
  }

  /**
   * beforeFetch is a no-op when the slot has already been acquired via
   * acquireSlot() before PageSession.create(). The semaphore is tracked
   * and released by the caller through the release handle returned by
   * acquireSlot(), so we skip re-acquisition here.
   */
  async beforeFetch(_ctx: GuardrailContext): Promise<GuardrailResult> {
    // Slot is already held by the time pipeline.run() is called.
    // Acquisition moved to BrowserClient.fetch() via acquireSlot().
    return { pass: true };
  }

  async detach(_ctx: GuardrailContext): Promise<void> {
    // Release is now handled by the slot handle returned from acquireSlot().
    // This method is kept for interface compatibility.
  }

  get stats() {
    return {
      available: this.semaphore.available,
      waiting: this.semaphore.waiting,
    };
  }
}
