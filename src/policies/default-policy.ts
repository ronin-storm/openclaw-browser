/**
 * Default fetch policy - sensible defaults for general web pages
 */

import { FetchOptions } from '../types/fetch';

export function applyPolicy(options: FetchOptions): FetchOptions {
  return {
    waitUntil: 'load',
    outputFormat: 'html',
    readonlyMode: true,
    ...options,
  };
}
