/**
 * WechatArticleExtractor - Specialized extractor for WeChat public account articles
 *
 * Handles:
 * - #js_content article body
 * - data-src lazy-loaded images
 * - Title, author, publish time extraction
 */

import { Page } from 'playwright';
import { WechatArticleMeta } from '../types/result';

export class WechatArticleExtractor {
  async extract(page: Page): Promise<WechatArticleMeta> {
    return page.evaluate((): WechatArticleMeta => {
      function getText(selector: string): string | undefined {
        const el = document.querySelector(selector);
        return el?.textContent?.trim() || undefined;
      }

      function getAttr(selector: string, attr: string): string | undefined {
        const el = document.querySelector(selector);
        return (el as HTMLElement)?.getAttribute(attr) || undefined;
      }

      // Title
      const title =
        getText('#activity-name') ||
        getText('.rich_media_title') ||
        document.title ||
        '';

      // Author
      const author =
        getText('#js_name') ||
        getText('.rich_media_meta_text') ||
        getAttr('meta[name="author"]', 'content');

      // Account name
      const accountName =
        getText('#js_name') || getText('.account_nickname_inner');

      // Published time
      const publishedAt =
        getText('#publish_time') ||
        getText('.rich_media_meta_text:nth-child(2)') ||
        getAttr('meta[property="article:published_time"]', 'content');

      // Digest/summary
      const digest =
        getAttr('meta[name="description"]', 'content') ||
        getAttr('meta[property="og:description"]', 'content');

      // Cover image
      const coverImageUrl =
        getAttr('meta[property="og:image"]', 'content') ||
        getAttr('#js_content img', 'data-src') ||
        getAttr('#js_content img', 'src');

      // Resolve lazy-loaded images: copy data-src to src
      document.querySelectorAll('#js_content img[data-src]').forEach((img) => {
        const dataSrc = img.getAttribute('data-src');
        if (dataSrc && !(img as HTMLImageElement).src) {
          (img as HTMLImageElement).src = dataSrc;
        }
      });

      return {
        title,
        author,
        accountName,
        publishedAt,
        digest,
        coverImageUrl,
      };
    });
  }

  /**
   * Resolve all lazy-loaded images in #js_content
   * Sets src = data-src for images that haven't loaded yet
   */
  async resolveLazyImages(page: Page): Promise<void> {
    await page.evaluate(() => {
      document.querySelectorAll('#js_content img').forEach((img) => {
        const el = img as HTMLImageElement;
        const dataSrc = el.getAttribute('data-src');
        if (dataSrc) {
          el.src = dataSrc;
        }
      });
    });
  }
}
