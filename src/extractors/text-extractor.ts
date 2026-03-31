/**
 * TextExtractor - Extracts plain text or markdown from the page
 */

import { Page } from 'playwright';

export class TextExtractor {
  async extract(page: Page, isWechat: boolean): Promise<string> {
    if (isWechat) {
      return this.extractWechatText(page);
    }
    return this.extractBodyText(page);
  }

  async extractAsMarkdown(page: Page, isWechat: boolean): Promise<string> {
    if (isWechat) {
      return this.extractWechatMarkdown(page);
    }
    return this.extractPageMarkdown(page);
  }

  private async extractBodyText(page: Page): Promise<string> {
    return page.evaluate(() => {
      // Remove script and style elements before extracting text
      const clone = document.body.cloneNode(true) as HTMLElement;
      clone
        .querySelectorAll('script, style, noscript')
        .forEach((el) => el.remove());
      return clone.innerText ?? clone.textContent ?? '';
    });
  }

  private async extractWechatText(page: Page): Promise<string> {
    return page.evaluate(() => {
      const content = document.querySelector(
        '#js_content'
      ) as HTMLElement | null;
      if (!content) {
        return document.body.innerText ?? '';
      }
      const clone = content.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('script, style').forEach((el) => el.remove());
      return clone.innerText ?? clone.textContent ?? '';
    });
  }

  private async extractPageMarkdown(page: Page): Promise<string> {
    return page.evaluate(() => {
      function nodeToMarkdown(node: Node, depth = 0): string {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent?.trim() ?? '';
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return '';

        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();
        const children = Array.from(el.childNodes)
          .map((c) => nodeToMarkdown(c, depth))
          .join('');

        switch (tag) {
          case 'h1':
            return `# ${children}\n\n`;
          case 'h2':
            return `## ${children}\n\n`;
          case 'h3':
            return `### ${children}\n\n`;
          case 'h4':
            return `#### ${children}\n\n`;
          case 'h5':
            return `##### ${children}\n\n`;
          case 'h6':
            return `###### ${children}\n\n`;
          case 'p':
            return `${children}\n\n`;
          case 'br':
            return '\n';
          case 'strong':
          case 'b':
            return `**${children}**`;
          case 'em':
          case 'i':
            return `*${children}*`;
          case 'code':
            return `\`${children}\``;
          case 'pre':
            return `\`\`\`\n${children}\n\`\`\`\n\n`;
          case 'a': {
            const href = (el as HTMLAnchorElement).href;
            return `[${children}](${href})`;
          }
          case 'img': {
            const src =
              (el as HTMLImageElement).src || el.getAttribute('data-src') || '';
            const alt = (el as HTMLImageElement).alt || '';
            return `![${alt}](${src})`;
          }
          case 'ul':
            return (
              Array.from(el.children)
                .map((li) => `- ${nodeToMarkdown(li, depth + 1)}`)
                .join('\n') + '\n\n'
            );
          case 'ol':
            return (
              Array.from(el.children)
                .map((li, i) => `${i + 1}. ${nodeToMarkdown(li, depth + 1)}`)
                .join('\n') + '\n\n'
            );
          case 'blockquote':
            return `> ${children}\n\n`;
          case 'script':
          case 'style':
          case 'nav':
          case 'footer':
          case 'header':
            return '';
          default:
            return children;
        }
      }

      return nodeToMarkdown(document.body);
    });
  }

  private async extractWechatMarkdown(page: Page): Promise<string> {
    return page.evaluate(() => {
      function nodeToMarkdown(node: Node): string {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent?.trim() ?? '';
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return '';

        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();
        const children = Array.from(el.childNodes).map(nodeToMarkdown).join('');

        switch (tag) {
          case 'h1':
            return `# ${children}\n\n`;
          case 'h2':
            return `## ${children}\n\n`;
          case 'h3':
            return `### ${children}\n\n`;
          case 'p':
            return `${children}\n\n`;
          case 'br':
            return '\n';
          case 'strong':
          case 'b':
            return `**${children}**`;
          case 'em':
          case 'i':
            return `*${children}*`;
          case 'img': {
            // Handle WeChat lazy loading: data-src takes precedence
            const src =
              el.getAttribute('data-src') || (el as HTMLImageElement).src || '';
            const alt = (el as HTMLImageElement).alt || '';
            return `![${alt}](${src})\n`;
          }
          case 'script':
          case 'style':
            return '';
          default:
            return children;
        }
      }

      const content = document.querySelector('#js_content');
      if (!content) return '';
      return nodeToMarkdown(content);
    });
  }
}
