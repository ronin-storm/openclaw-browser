/**
 * DomainWhitelistGuard - Domain-level access control with wildcard support
 * e.g. *.weixin.qq.com matches mp.weixin.qq.com
 */

import {
  Guardrail,
  GuardrailContext,
  GuardrailResult,
} from '../types/guardrails';
import { DomainRule } from '../types/common';
import { DomainBlockedError } from '../errors/base-error';

function patternToRegex(pattern: string): RegExp {
  // Escape regex special chars, then convert * to .*
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`, 'i');
}

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function isDomainAllowed(
  hostname: string,
  rules: DomainRule[]
): boolean {
  if (!rules || rules.length === 0) return true;

  for (const rule of rules) {
    const regex = patternToRegex(rule.pattern);
    if (regex.test(hostname)) {
      return rule.allow !== false;
    }
  }

  // Default: deny if whitelist rules exist but none matched
  return false;
}

export class DomainWhitelistGuard implements Guardrail {
  readonly name = 'DomainWhitelistGuard';

  private defaultRules: DomainRule[];

  constructor(defaultRules: DomainRule[] = []) {
    this.defaultRules = defaultRules;
  }

  async beforeFetch(ctx: GuardrailContext): Promise<GuardrailResult> {
    const rules = ctx.options.allowedDomains ?? this.defaultRules;
    if (!rules || rules.length === 0) return { pass: true };

    const hostname = extractHostname(ctx.options.url);
    if (!isDomainAllowed(hostname, rules)) {
      return {
        pass: false,
        reason: `Domain not allowed: ${hostname}`,
        code: 'DOMAIN_BLOCKED',
      };
    }

    return { pass: true };
  }

  async attach(ctx: GuardrailContext): Promise<void> {
    const rules = ctx.options.allowedDomains ?? this.defaultRules;
    if (!rules || rules.length === 0) return;

    // Block sub-resource requests to non-whitelisted domains
    await ctx.page.route('**/*', (route) => {
      const url = route.request().url();
      const hostname = extractHostname(url);

      if (!isDomainAllowed(hostname, rules)) {
        route.abort('blockedbyresponse').catch(() => {
          // Route may have already been handled
        });
        // Track blocked request
        if (ctx.metrics.blockedRequestCount !== undefined) {
          (ctx.metrics as any).blockedRequestCount++;
        }
      } else {
        route.continue().catch(() => {});
      }
    });
  }
}
