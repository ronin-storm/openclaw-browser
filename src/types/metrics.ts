/**
 * Cost and performance metrics types
 */

export interface CostMetrics {
  /** Total elapsed time in ms */
  durationMs: number;
  /** Total bytes downloaded (network traffic) */
  totalBytesDownloaded: number;
  /** Number of network requests made */
  requestCount: number;
  /** Number of blocked requests */
  blockedRequestCount: number;
  /** Time to first byte (ms) */
  ttfbMs?: number;
  /** Navigation start timestamp */
  startedAt: number;
  /** Navigation end timestamp */
  completedAt: number;
}

export interface FetchDiagnostics {
  /** Whether page was identified as a WeChat article */
  isWechatArticle: boolean;
  /** Final HTML size in bytes */
  htmlSizeBytes: number;
  /** Output content size in bytes */
  outputSizeBytes: number;
  /** Domains encountered during page load */
  domainsEncountered: string[];
  /** Redirect chain */
  redirectChain: string[];
  /** Screenshot as base64 (only on error, if enabled) */
  errorScreenshot?: string;
}
