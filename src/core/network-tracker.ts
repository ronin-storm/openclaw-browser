/**
 * NetworkTracker - Tracks network activity for diagnostics
 */

import { Page } from 'playwright';
import { NetworkRequest } from '../types/common';

export class NetworkTracker {
  private requests: NetworkRequest[] = [];
  private domains = new Set<string>();
  private redirectChain: string[] = [];

  private requestHandler?: (req: import('playwright').Request) => void;
  private responseHandler?: (res: import('playwright').Response) => void;

  attach(page: Page): void {
    this.requestHandler = (req) => {
      try {
        const url = req.url();
        const hostname = new URL(url).hostname;
        this.domains.add(hostname);

        this.requests.push({
          url,
          method: req.method(),
          resourceType: req.resourceType(),
          startTime: Date.now(),
        });
      } catch {
        // Invalid URL
      }
    };

    this.responseHandler = (res) => {
      try {
        const url = res.url();
        const status = res.status();

        // Track redirects
        if (status >= 300 && status < 400) {
          this.redirectChain.push(url);
        }

        // Update matching request
        const req = this.requests.find((r) => r.url === url && !r.endTime);
        if (req) {
          req.status = status;
          req.endTime = Date.now();
        }
      } catch {
        // Non-fatal
      }
    };

    page.on('request', this.requestHandler);
    page.on('response', this.responseHandler);
  }

  detach(page: Page): void {
    if (this.requestHandler) page.off('request', this.requestHandler);
    if (this.responseHandler) page.off('response', this.responseHandler);
  }

  getDomainsEncountered(): string[] {
    return Array.from(this.domains);
  }

  getRedirectChain(): string[] {
    return [...this.redirectChain];
  }

  getRequests(): NetworkRequest[] {
    return [...this.requests];
  }

  reset(): void {
    this.requests = [];
    this.domains.clear();
    this.redirectChain = [];
  }
}
