/**
 * BrowserClient - Main entry point for openclaw-browser
 */

import { BrowserClientOptions } from '../types/config';
import { FetchOptions } from '../types/fetch';
import { FetchResult } from '../types/result';
import { BrowserPool } from './browser-pool';
import { PageSession } from './page-session';
import { Pipeline } from './pipeline';
import { GuardrailManager } from '../guardrails/guardrail-manager';
import { ConcurrencyGuard } from '../guardrails/concurrency-guard';
import { TimeoutGuard } from '../guardrails/timeout-guard';
import { ContentSizeGuard } from '../guardrails/content-size-guard';
import { ReadonlyGuard } from '../guardrails/readonly-guard';
import { DomainWhitelistGuard } from '../guardrails/domain-whitelist-guard';
import { CostGuard } from '../guardrails/cost-guard';
import { applyPolicy } from '../policies/default-policy';
import { applyWechatPolicy } from '../policies/wechat';

const DEFAULT_OPTIONS: Required<BrowserClientOptions> = {
  maxConcurrency: 2,
  defaultPageTimeout: 15_000,
  defaultMaxContentSize: 5 * 1024 * 1024,
  executablePath: '',
  headless: true,
  proxy: '',
  allowedDomains: [],
  readonlyMode: true,
  userAgent: '',
  args: [],
};

export class OpenClawBrowserClient {
  private pool: BrowserPool;
  private pipeline: Pipeline;
  private guardrailManager: GuardrailManager;
  private options: Required<BrowserClientOptions>;
  private concurrencyGuard: ConcurrencyGuard;

  constructor(options: BrowserClientOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.pool = new BrowserPool({
      maxConcurrency: this.options.maxConcurrency,
      executablePath: this.options.executablePath || undefined,
      headless: this.options.headless,
      proxy: this.options.proxy || undefined,
      userAgent: this.options.userAgent || undefined,
      args: this.options.args,
    });

    this.concurrencyGuard = new ConcurrencyGuard(this.options.maxConcurrency);
    this.guardrailManager = new GuardrailManager();

    this.guardrailManager.registerAll([
      this.concurrencyGuard,
      new TimeoutGuard(this.options.defaultPageTimeout),
      new ContentSizeGuard({
        maxOutputBytes: this.options.defaultMaxContentSize,
      }),
      new ReadonlyGuard(),
      new DomainWhitelistGuard(this.options.allowedDomains),
      new CostGuard(),
    ]);

    this.pipeline = new Pipeline(this.guardrailManager);
  }

  async fetch(options: FetchOptions): Promise<FetchResult> {
    // Apply defaults from client options
    const mergedOptions: FetchOptions = {
      readonlyMode: this.options.readonlyMode,
      pageTimeout: this.options.defaultPageTimeout,
      maxContentSize: this.options.defaultMaxContentSize,
      allowedDomains:
        this.options.allowedDomains.length > 0
          ? this.options.allowedDomains
          : undefined,
      ...options,
    };

    // Apply URL-based policies
    let finalOptions = applyPolicy(mergedOptions);
    finalOptions = applyWechatPolicy(finalOptions);

    const session = await PageSession.create(this.pool);
    try {
      return await this.pipeline.run(session, finalOptions);
    } finally {
      await session.close();
    }
  }

  async close(): Promise<void> {
    await this.pool.close();
  }

  get concurrencyStats() {
    return this.concurrencyGuard.stats;
  }
}
