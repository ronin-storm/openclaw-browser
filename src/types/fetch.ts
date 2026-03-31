/**
 * Fetch request/options types
 */

import { WaitUntilOption, OutputFormat, DomainRule } from './common';

export interface FetchOptions {
  /** Target URL to fetch */
  url: string;
  /** When to consider navigation done. Default: 'load' */
  waitUntil?: WaitUntilOption;
  /** Output content format. Default: 'html' */
  outputFormat?: OutputFormat;
  /** Page-level timeout in ms. Overrides client default */
  pageTimeout?: number;
  /** Max content size in bytes. Overrides client default */
  maxContentSize?: number;
  /** Allowed domain rules. Overrides client default */
  allowedDomains?: DomainRule[];
  /** Prevent interactive operations. Default: true */
  readonlyMode?: boolean;
  /** Extra wait after page load (ms). Useful for lazy-load content */
  extraWaitMs?: number;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Screenshot on failure */
  screenshotOnError?: boolean;
}
