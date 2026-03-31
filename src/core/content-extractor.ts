/**
 * ContentExtractor - Routes extraction to appropriate extractor based on URL/content
 */

import { Page } from 'playwright';
import { FetchOptions } from '../types/fetch';
import { ExtractedContent } from '../types/result';
import { HtmlExtractor } from '../extractors/html-extractor';
import { TextExtractor } from '../extractors/text-extractor';
import { WechatArticleExtractor } from '../extractors/wechat-article-extractor';

function isWechatArticleUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.endsWith('weixin.qq.com') ||
      parsed.hostname.endsWith('mp.weixin.qq.com')
    );
  } catch {
    return false;
  }
}

export class ContentExtractor {
  private htmlExtractor = new HtmlExtractor();
  private textExtractor = new TextExtractor();
  private wechatExtractor = new WechatArticleExtractor();

  async extract(page: Page, options: FetchOptions): Promise<ExtractedContent> {
    const url = page.url();
    const format = options.outputFormat ?? 'html';
    const isWechat = isWechatArticleUrl(url);

    const result: ExtractedContent = {};

    if (isWechat) {
      result.wechat = await this.wechatExtractor.extract(page);
    }

    switch (format) {
      case 'html':
        result.html = await this.htmlExtractor.extract(page, isWechat);
        break;
      case 'text':
        result.text = await this.textExtractor.extract(page, isWechat);
        break;
      case 'markdown':
        result.markdown = await this.textExtractor.extractAsMarkdown(
          page,
          isWechat
        );
        break;
    }

    result.title = await page.title();

    return result;
  }
}
