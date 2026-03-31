/**
 * WeChat policy - specialized settings for WeChat public account articles
 *
 * Automatically detected from URL patterns
 */

import { FetchOptions } from '../types/fetch';

const WECHAT_DOMAINS = [
  { pattern: '*.weixin.qq.com', allow: true },
  { pattern: 'weixin.qq.com', allow: true },
  { pattern: 'mp.weixin.qq.com', allow: true },
  // WeChat article CDN domains
  { pattern: 'mmbiz.qpic.cn', allow: true },
  { pattern: 'mmbiz.qlogo.cn', allow: true },
];

const WECHAT_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.43(0x18002b2a) NetType/WIFI Language/zh_CN';

function isWechatUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.endsWith('weixin.qq.com') ||
      parsed.hostname === 'mp.weixin.qq.com'
    );
  } catch {
    return false;
  }
}

export function applyWechatPolicy(options: FetchOptions): FetchOptions {
  if (!isWechatUrl(options.url)) {
    return options;
  }

  return {
    ...options,
    // Override waitUntil only if not explicitly set by caller
    waitUntil: options.waitUntil ?? 'networkidle',
    // Give extra time for lazy images
    extraWaitMs: options.extraWaitMs ?? 2000,
    // Use mobile UA to get proper article layout
    headers: {
      'User-Agent': WECHAT_USER_AGENT,
      ...options.headers,
    },
    // Allow WeChat CDN domains for images
    allowedDomains: options.allowedDomains?.length
      ? options.allowedDomains
      : WECHAT_DOMAINS,
  };
}

export { WECHAT_DOMAINS };
