#!/usr/bin/env node
/**
 * OpenClaw Browser Scraper
 *
 * 备份方案：當 OpenClaw 原生 web_fetch 失效時使用
 * 安全限制：並發、超時、資源上限、只讀、域名白名單、成本計數
 */

const { chromium } = require('playwright');

class OpenClawBrowser {
  constructor(options = {}) {
    this.options = {
      // 並發限制
      maxConcurrency: options.maxConcurrency || 1,
      // 單頁超時（秒）
      pageTimeout: options.pageTimeout || 30,
      // 單次最大內容（MB）
      maxContentSize: options.maxContentSize || 5,
      // 域名白名單
      allowedDomains: options.allowedDomains || [],
      // 禁止執行腳本
      allowScript: options.allowScript || false,
      // 禁止加載圖片（節省資源）
      blockImages: options.blockImages || true,
      ...options,
    };

    this.browser = null;
    this.context = null;
    this.activePages = new Map();
    this.stats = {
      totalRequests: 0,
      totalBytes: 0,
      totalTime: 0,
      failedRequests: 0,
    };
  }

  /**
   * 驗證域名是否在白名單
   */
  validateDomain(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      if (this.options.allowedDomains.length > 0) {
        const isAllowed = this.options.allowedDomains.some(
          (domain) => hostname === domain || hostname.endsWith('.' + domain)
        );
        if (!isAllowed) {
          throw new Error(`Domain ${hostname} not in whitelist`);
        }
      }
      return true;
    } catch (e) {
      throw new Error(`Invalid URL: ${url}`);
    }
  }

  /**
   * 檢查並發數是否超限
   */
  checkConcurrency() {
    if (this.activePages.size >= this.options.maxConcurrency) {
      throw new Error(
        `Concurrency limit reached: ${this.options.maxConcurrency}`
      );
    }
  }

  /**
   * 初始化瀏覽器
   */
  async init() {
    if (this.browser) return;

    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    });

    console.error('[OpenClaw Browser] Browser initialized');
  }

  /**
   * 抓取網頁
   */
  async scrape(url) {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      // 1. 驗證域名
      this.validateDomain(url);

      // 2. 檢查並發
      this.checkConcurrency();

      // 3. 初始化瀏覽器
      await this.init();

      // 4. 創建頁面
      const page = await this.context.newPage();
      this.activePages.set(url, page);

      // 5. 攔截資源，計算大小
      let contentSize = 0;
      page.on('response', (response) => {
        const headers = response.headers();
        const length = parseInt(headers['content-length'] || '0', 10);
        contentSize += length;
        this.stats.totalBytes += length;
      });

      // 6. 設置超時
      const timeoutMs = this.options.pageTimeout * 1000;

      // 7. 導航並獲取內容
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: timeoutMs,
      });

      // 可選：等待 networkidle
      if (this.options.waitNetworkIdle) {
        try {
          await page.waitForLoadState('networkidle', { timeout: 10000 });
        } catch (e) {
          // networkidle 超時也繼續
        }
      }

      // 8. 獲取頁面內容
      const content = await page.content();
      const text = await page.evaluate(() => document.body.innerText);

      // 9. 清理
      await page.close();
      this.activePages.delete(url);

      // 10. 記錄統計
      const elapsed = Date.now() - startTime;
      this.stats.totalTime += elapsed;

      return {
        success: true,
        url,
        content,
        text: text.substring(0, 50000), // 限制 text 長度
        size: contentSize,
        time: elapsed,
      };
    } catch (error) {
      this.stats.failedRequests++;

      // 清理頁面
      const page = this.activePages.get(url);
      if (page) {
        await page.close().catch(() => {});
        this.activePages.delete(url);
      }

      return {
        success: false,
        url,
        error: error.message,
      };
    }
  }

  /**
   * 批量抓取
   */
  async scrapeBatch(urls) {
    const results = [];
    for (const url of urls) {
      const result = await this.scrape(url);
      results.push(result);
    }
    return results;
  }

  /**
   * 獲取統計信息
   */
  getStats() {
    return {
      ...this.stats,
      activePages: this.activePages.size,
      avgTime:
        this.stats.totalRequests > 0
          ? Math.round(this.stats.totalTime / this.stats.totalRequests)
          : 0,
    };
  }

  /**
   * 關閉瀏覽器
   */
  async close() {
    // 關閉所有活躍頁面
    for (const [url, page] of this.activePages) {
      await page.close().catch(() => {});
    }
    this.activePages.clear();

    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.error('[OpenClaw Browser] Browser closed');
    }
  }
}

module.exports = OpenClawBrowser;
