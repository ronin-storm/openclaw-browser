/**
 * ContentSizeGuard - Three-layer content size enforcement
 * Layer 1: Network download bytes
 * Layer 2: Raw HTML size
 * Layer 3: Extracted output size
 */

import {
  Guardrail,
  GuardrailContext,
  GuardrailResult,
} from '../types/guardrails';
import { ContentTooLargeError } from '../errors/base-error';

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // 5MB
const DEFAULT_MAX_HTML_BYTES = 10 * 1024 * 1024; // 10MB
const DEFAULT_MAX_NETWORK_BYTES = 20 * 1024 * 1024; // 20MB

export interface ContentSizeGuardOptions {
  maxNetworkBytes?: number;
  maxHtmlBytes?: number;
  maxOutputBytes?: number;
}

export class ContentSizeGuard implements Guardrail {
  readonly name = 'ContentSizeGuard';

  private maxNetworkBytes: number;
  private maxHtmlBytes: number;
  private maxOutputBytes: number;

  constructor(options: ContentSizeGuardOptions = {}) {
    this.maxNetworkBytes = options.maxNetworkBytes ?? DEFAULT_MAX_NETWORK_BYTES;
    this.maxHtmlBytes = options.maxHtmlBytes ?? DEFAULT_MAX_HTML_BYTES;
    this.maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_BYTES;
  }

  async afterFetch(
    ctx: GuardrailContext,
    html: string
  ): Promise<GuardrailResult> {
    // Layer 1: Check network bytes
    const networkBytes = ctx.metrics.totalBytesDownloaded ?? 0;
    if (networkBytes > this.maxNetworkBytes) {
      return {
        pass: false,
        reason: `Network download too large: ${networkBytes} bytes (limit: ${this.maxNetworkBytes})`,
        code: 'CONTENT_TOO_LARGE',
      };
    }

    // Layer 2: Check HTML size
    const htmlBytes = Buffer.byteLength(html, 'utf8');
    const htmlLimit = ctx.options.maxContentSize ?? this.maxHtmlBytes;
    if (htmlBytes > htmlLimit) {
      return {
        pass: false,
        reason: `HTML too large: ${htmlBytes} bytes (limit: ${htmlLimit})`,
        code: 'CONTENT_TOO_LARGE',
      };
    }

    return { pass: true };
  }

  /**
   * Check output size after extraction. Call this in pipeline.
   */
  checkOutputSize(output: string, limitOverride?: number): void {
    const limit = limitOverride ?? this.maxOutputBytes;
    const size = Buffer.byteLength(output, 'utf8');
    if (size > limit) {
      throw new ContentTooLargeError('output', size, limit);
    }
  }
}
