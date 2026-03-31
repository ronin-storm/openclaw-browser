/**
 * Base error class for openclaw-browser
 */

import { BrowserFetchErrorCode, BrowserFetchErrorShape } from '../types/errors';

export class BrowserFetchError extends Error {
  public readonly code: BrowserFetchErrorCode;
  public readonly httpStatus?: number;

  constructor(
    code: BrowserFetchErrorCode,
    message: string,
    httpStatus?: number
  ) {
    super(message);
    this.name = 'BrowserFetchError';
    this.code = code;
    this.httpStatus = httpStatus;
    // Fix prototype chain for TypeScript
    Object.setPrototypeOf(this, BrowserFetchError.prototype);
  }

  toShape(): BrowserFetchErrorShape {
    return {
      code: this.code,
      message: this.message,
      stack: this.stack,
      httpStatus: this.httpStatus,
    };
  }
}

export class TimeoutError extends BrowserFetchError {
  constructor(message = 'Operation timed out') {
    super('TIMEOUT', message);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

export class DomainBlockedError extends BrowserFetchError {
  constructor(domain: string) {
    super('DOMAIN_BLOCKED', `Domain not allowed: ${domain}`);
    this.name = 'DomainBlockedError';
    Object.setPrototypeOf(this, DomainBlockedError.prototype);
  }
}

export class ContentTooLargeError extends BrowserFetchError {
  constructor(
    layer: 'network' | 'html' | 'output',
    size: number,
    limit: number
  ) {
    super(
      'CONTENT_TOO_LARGE',
      `Content too large at ${layer} layer: ${size} bytes (limit: ${limit} bytes)`
    );
    this.name = 'ContentTooLargeError';
    Object.setPrototypeOf(this, ContentTooLargeError.prototype);
  }
}

export class ReadonlyViolationError extends BrowserFetchError {
  constructor(operation: string) {
    super(
      'READONLY_VIOLATION',
      `Readonly mode violation: attempted ${operation}`
    );
    this.name = 'ReadonlyViolationError';
    Object.setPrototypeOf(this, ReadonlyViolationError.prototype);
  }
}

export class NavigationFailedError extends BrowserFetchError {
  constructor(url: string, reason: string, httpStatus?: number) {
    super(
      'NAVIGATION_FAILED',
      `Navigation failed for ${url}: ${reason}`,
      httpStatus
    );
    this.name = 'NavigationFailedError';
    Object.setPrototypeOf(this, NavigationFailedError.prototype);
  }
}

export class ConcurrencyLimitError extends BrowserFetchError {
  constructor() {
    super('CONCURRENCY_LIMIT', 'Concurrency limit reached');
    this.name = 'ConcurrencyLimitError';
    Object.setPrototypeOf(this, ConcurrencyLimitError.prototype);
  }
}

export class BrowserCrashError extends BrowserFetchError {
  constructor(message = 'Browser process crashed') {
    super('BROWSER_CRASH', message);
    this.name = 'BrowserCrashError';
    Object.setPrototypeOf(this, BrowserCrashError.prototype);
  }
}
