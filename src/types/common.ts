/**
 * Common shared types for openclaw-browser
 */

export type WaitUntilOption = 'domcontentloaded' | 'load' | 'networkidle';
export type OutputFormat = 'html' | 'text' | 'markdown';

export interface DomainRule {
  /** Domain pattern, supports wildcards: *.weixin.qq.com */
  pattern: string;
  /** Whether to allow (true) or block (false). Default: true */
  allow?: boolean;
}

export interface NetworkRequest {
  url: string;
  method: string;
  resourceType: string;
  status?: number;
  size?: number;
  startTime: number;
  endTime?: number;
}
