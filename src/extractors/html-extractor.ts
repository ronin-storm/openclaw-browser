/**
 * HtmlExtractor - Extracts HTML content from the page
 * For WeChat articles, extracts only #js_content
 */

import { Page } from 'playwright';

export class HtmlExtractor {
  async extract(page: Page, isWechat: boolean): Promise<string> {
    if (isWechat) {
      return this.extractWechatHtml(page);
    }
    return page.content();
  }

  private async extractWechatHtml(page: Page): Promise<string> {
    try {
      const articleHtml = await page.$eval('#js_content', (el) => el.innerHTML);
      return articleHtml;
    } catch {
      // Fallback to full page content
      return page.content();
    }
  }
}
