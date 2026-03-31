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

  async beforeFetch(ctx: GuardrailContext): Promise<GuardrailResult> {
    await this.semaphore.acquire();
    this.acquiredContexts.add(ctx);
    return { pass: true };
  }

  async detach(ctx: GuardrailContext): Promise<void> {
    if (this.acquiredContexts.has(ctx)) {
      this.acquiredContexts.delete(ctx);
      this.semaphore.release();
    }
  }

  get stats() {
    return {
      available: this.semaphore.available,
      waiting: this.semaphore.waiting,
    };
  }
}
