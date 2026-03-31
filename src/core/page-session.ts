/**
 * PageSession - Wraps a single Playwright page with lifecycle management
 */

import { Page, BrowserContext } from 'playwright';
import { BrowserPool } from './browser-pool';
import { NetworkTracker } from './network-tracker';

export class PageSession {
  public readonly page: Page;
  public readonly context: BrowserContext;
  public readonly networkTracker: NetworkTracker;
  private closed = false;

  private constructor(page: Page, context: BrowserContext) {
    this.page = page;
    this.context = context;
    this.networkTracker = new NetworkTracker();
  }

  static async create(pool: BrowserPool): Promise<PageSession> {
    const context = await pool.newContext();
    const page = await context.newPage();
    const session = new PageSession(page, context);
    session.networkTracker.attach(page);
    return session;
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;

    this.networkTracker.detach(this.page);

    try {
      await this.page.close();
    } catch {
      // Non-fatal
    }
    try {
      await this.context.close();
    } catch {
      // Non-fatal
    }
  }

  get isClosed(): boolean {
    return this.closed;
  }
}
