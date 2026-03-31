/**
 * GuardrailManager - Orchestrates all guardrails in order
 */

import {
  Guardrail,
  GuardrailContext,
  GuardrailResult,
} from '../types/guardrails';
import { BrowserFetchError } from '../errors/base-error';

export class GuardrailManager {
  private guardrails: Guardrail[] = [];

  register(guardrail: Guardrail): this {
    this.guardrails.push(guardrail);
    return this;
  }

  registerAll(guardrails: Guardrail[]): this {
    for (const g of guardrails) {
      this.register(g);
    }
    return this;
  }

  async runBeforeFetch(ctx: GuardrailContext): Promise<void> {
    for (const g of this.guardrails) {
      if (g.beforeFetch) {
        const result = await g.beforeFetch(ctx);
        this.assertPass(result, g.name);
      }
    }
  }

  async attachAll(ctx: GuardrailContext): Promise<void> {
    for (const g of this.guardrails) {
      if (g.attach) {
        await g.attach(ctx);
      }
    }
  }

  async runAfterFetch(ctx: GuardrailContext, html: string): Promise<void> {
    for (const g of this.guardrails) {
      if (g.afterFetch) {
        const result = await g.afterFetch(ctx, html);
        this.assertPass(result, g.name);
      }
    }
  }

  findGuardrail<T extends Guardrail>(
    ctor: new (...args: any[]) => T
  ): T | undefined {
    return this.guardrails.find((g): g is T => g instanceof ctor);
  }

  async detachAll(ctx: GuardrailContext): Promise<void> {
    // Detach in reverse order
    for (const g of [...this.guardrails].reverse()) {
      if (g.detach) {
        try {
          await g.detach(ctx);
        } catch {
          // Non-fatal cleanup errors
        }
      }
    }
  }

  private assertPass(result: GuardrailResult, guardrailName: string): void {
    if (!result.pass) {
      const code = result.code ?? 'UNKNOWN';
      throw new BrowserFetchError(
        code as any,
        result.reason ?? `Guardrail ${guardrailName} failed`
      );
    }
  }
}
