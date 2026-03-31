/**
 * Guardrail types
 */

import { Page, BrowserContext } from 'playwright';
import { FetchOptions } from './fetch';
import { CostMetrics } from './metrics';

export interface GuardrailContext {
  page: Page;
  context: BrowserContext;
  options: FetchOptions;
  metrics: Partial<CostMetrics>;
  abortSignal: AbortSignal;
  /** The underlying AbortController — use this to trigger cancellation */
  abortController: AbortController;
}

export interface GuardrailResult {
  /** Whether this guardrail passed */
  pass: boolean;
  /** Reason for failure */
  reason?: string;
  /** Error code */
  code?: string;
}

export interface Guardrail {
  /** Unique name for this guardrail */
  readonly name: string;
  /** Called before navigation starts */
  beforeFetch?(ctx: GuardrailContext): Promise<GuardrailResult>;
  /** Called after navigation completes */
  afterFetch?(ctx: GuardrailContext, html: string): Promise<GuardrailResult>;
  /** Called to attach page-level listeners */
  attach?(ctx: GuardrailContext): Promise<void>;
  /** Called on cleanup */
  detach?(ctx: GuardrailContext): Promise<void>;
}
