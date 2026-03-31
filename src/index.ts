/**
 * @unstorm/openclaw-browser
 *
 * OpenClaw fallback fetch solution for JS-rendered pages and WeChat articles.
 * Uses Playwright under the hood with guardrails for safety and cost control.
 */

// Main client
export { OpenClawBrowserClient } from './core/browser-client';

// Types
export type { BrowserClientOptions } from './types/config';
export type { FetchOptions } from './types/fetch';
export type {
  FetchResult,
  ExtractedContent,
  WechatArticleMeta,
} from './types/result';
export type { CostMetrics, FetchDiagnostics } from './types/metrics';
export type { DomainRule, NetworkRequest } from './types/common';
export type {
  BrowserFetchErrorShape,
  BrowserFetchErrorCode,
} from './types/errors';
export type {
  GuardrailContext,
  GuardrailResult,
  Guardrail,
} from './types/guardrails';

// Errors
export {
  BrowserFetchError,
  TimeoutError,
  DomainBlockedError,
  ContentTooLargeError,
  ReadonlyViolationError,
  NavigationFailedError,
  ConcurrencyLimitError,
  BrowserCrashError,
} from './errors';

// Guardrails (for custom configurations)
export {
  GuardrailManager,
  ConcurrencyGuard,
  TimeoutGuard,
  ContentSizeGuard,
  ReadonlyGuard,
  DomainWhitelistGuard,
  CostGuard,
} from './guardrails';

// Extractors
export {
  HtmlExtractor,
  TextExtractor,
  WechatArticleExtractor,
} from './extractors';

// Policies
export { applyPolicy } from './policies/default-policy';
export { applyWechatPolicy, WECHAT_DOMAINS } from './policies/wechat';
