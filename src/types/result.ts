/**
 * Result types
 */

import { CostMetrics, FetchDiagnostics } from './metrics';
import { BrowserFetchErrorShape } from './errors';

export interface ExtractedContent {
  /** Raw HTML of the page (or main article node) */
  html?: string;
  /** Extracted plain text */
  text?: string;
  /** Extracted markdown */
  markdown?: string;
  /** Page title */
  title?: string;
  /** WeChat article specific fields */
  wechat?: WechatArticleMeta;
}

export interface WechatArticleMeta {
  /** Article title */
  title: string;
  /** Author name */
  author?: string;
  /** Published at (ISO string or raw text) */
  publishedAt?: string;
  /** WeChat account name */
  accountName?: string;
  /** Article digest/summary */
  digest?: string;
  /** Cover image URL */
  coverImageUrl?: string;
}

export interface FetchResult {
  /** Whether the fetch succeeded */
  ok: boolean;
  /** Final URL after redirects */
  finalUrl: string;
  /** HTTP status code */
  status?: number;
  /** Page title */
  title?: string;
  /** Extracted content */
  content: ExtractedContent;
  /** Performance and cost metrics */
  metrics: CostMetrics;
  /** Diagnostic info */
  diagnostics: FetchDiagnostics;
  /** Error info (only when ok=false) */
  error?: BrowserFetchErrorShape;
}
