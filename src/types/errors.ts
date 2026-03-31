/**
 * Error types
 */

export type BrowserFetchErrorCode =
  | 'TIMEOUT'
  | 'NAVIGATION_FAILED'
  | 'DOMAIN_BLOCKED'
  | 'CONTENT_TOO_LARGE'
  | 'READONLY_VIOLATION'
  | 'CONCURRENCY_LIMIT'
  | 'BROWSER_CRASH'
  | 'UNKNOWN';

export interface BrowserFetchErrorShape {
  code: BrowserFetchErrorCode;
  message: string;
  /** Original error stack */
  stack?: string;
  /** HTTP status if available */
  httpStatus?: number;
}
