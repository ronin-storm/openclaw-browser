/**
 * BrowserPool - Manages a single browser instance with context creation
 */

import { Browser, BrowserContext, chromium, firefox, webkit } from 'playwright';
import { BrowserPoolOptions } from '../types/config';
import { BrowserCrashError } from '../errors/base-error';

export class BrowserPool {
  private browser: Browser | null = null;
  private options: BrowserPoolOptions;
  private initPromise: Promise<Browser> | null = null;

  constructor(options: BrowserPoolOptions) {
    this.options = options;
  }

  private async launchBrowser(): Promise<Browser> {
    const launchOptions: Parameters<typeof chromium.launch>[0] = {
      headless: this.options.headless,
      executablePath: this.options.executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        ...(this.options.args ?? []),
      ],
    };

    if (this.options.proxy) {
      launchOptions.proxy = { server: this.options.proxy };
    }

    const browser = await chromium.launch(launchOptions);

    browser.on('disconnected', () => {
      this.browser = null;
      this.initPromise = null;
    });

    return browser;
  }

  async getBrowser(): Promise<Browser> {
    if (this.browser?.isConnected()) {
      return this.browser;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.launchBrowser().then((b) => {
      this.browser = b;
      this.initPromise = null;
      return b;
    });

    return this.initPromise;
  }

  async newContext(): Promise<BrowserContext> {
    let browser: Browser;
    try {
      browser = await this.getBrowser();
    } catch (err: any) {
      throw new BrowserCrashError(`Failed to launch browser: ${err.message}`);
    }

    const contextOptions: Parameters<Browser['newContext']>[0] = {};

    if (this.options.userAgent) {
      contextOptions.userAgent = this.options.userAgent;
    }

    return browser.newContext(contextOptions);
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  get isConnected(): boolean {
    return this.browser?.isConnected() ?? false;
  }
}
