/**
 * Configuration types
 */

import { DomainRule } from './common';

export interface BrowserClientOptions {
  /** Maximum concurrent pages. Default: 2 */
  maxConcurrency?: number;
  /** Default page timeout in ms. Default: 15000 */
  defaultPageTimeout?: number;
  /** Default max content size in bytes. Default: 5MB */
  defaultMaxContentSize?: number;
  /** Browser executable path override */
  executablePath?: string;
  /** Launch in headless mode. Default: true */
  headless?: boolean;
  /** Proxy URL */
  proxy?: string;
  /** Default allowed domains. If empty, all domains allowed */
  allowedDomains?: DomainRule[];
  /** Whether to enable readonly mode by default. Default: true */
  readonlyMode?: boolean;
  /** User agent override */
  userAgent?: string;
  /** Extra browser args */
  args?: string[];
}

export interface BrowserPoolOptions {
  maxConcurrency: number;
  executablePath?: string;
  headless: boolean;
  proxy?: string;
  userAgent?: string;
  args?: string[];
}
