/**
 * ReadonlyGuard - Intercept all interactive page operations
 * Prevents click, type, hover, fill, etc. from executing.
 */

import {
  Guardrail,
  GuardrailContext,
  GuardrailResult,
} from '../types/guardrails';
import { ReadonlyViolationError } from '../errors/base-error';
import { Page } from 'playwright';

// Playwright Page methods to intercept
const INTERACTIVE_PAGE_METHODS: Array<keyof Page> = [
  'click',
  'dblclick',
  'tap',
  'hover',
  'type',
  'fill',
  'press',
  'check',
  'uncheck',
  'selectOption',
  'dragAndDrop',
  'focus',
  'dispatchEvent',
];

// Keyboard sub-object methods to intercept
const INTERACTIVE_KEYBOARD_METHODS = [
  'press',
  'type',
  'insertText',
  'down',
  'up',
];

// Mouse sub-object methods to intercept
const INTERACTIVE_MOUSE_METHODS = [
  'click',
  'dblclick',
  'move',
  'down',
  'up',
  'wheel',
];

function blockAll(obj: any, methods: string[], label: string): () => void {
  const originals: Record<string, Function> = {};
  for (const method of methods) {
    if (typeof obj[method] === 'function') {
      originals[method] = obj[method];
      obj[method] = (..._args: any[]) => {
        throw new ReadonlyViolationError(`${label}.${method}`);
      };
    }
  }
  return () => {
    for (const [method, original] of Object.entries(originals)) {
      obj[method] = original;
    }
  };
}

export class ReadonlyGuard implements Guardrail {
  readonly name = 'ReadonlyGuard';

  private restorers: Array<() => void> = [];

  async attach(ctx: GuardrailContext): Promise<void> {
    if (ctx.options.readonlyMode === false) return;

    const page = ctx.page;

    // Patch Page direct methods
    this.restorers.push(
      blockAll(page, INTERACTIVE_PAGE_METHODS as string[], 'page')
    );

    // Patch page.keyboard
    try {
      this.restorers.push(
        blockAll(page.keyboard, INTERACTIVE_KEYBOARD_METHODS, 'keyboard')
      );
    } catch {
      // keyboard may not be accessible; non-fatal
    }

    // Patch page.mouse
    try {
      this.restorers.push(
        blockAll(page.mouse, INTERACTIVE_MOUSE_METHODS, 'mouse')
      );
    } catch {
      // mouse may not be accessible; non-fatal
    }

    // Patch page.locator by wrapping locator() to return a blocked proxy
    const originalLocator = (page as any).locator?.bind(page);
    if (typeof originalLocator === 'function') {
      (page as any).locator = (...args: any[]) => {
        throw new ReadonlyViolationError(
          'page.locator (readonly mode — use page.content() to read DOM)'
        );
      };
      this.restorers.push(() => {
        (page as any).locator = originalLocator;
      });
    }

    // Patch page.frame (frame access could be used for interaction)
    const originalFrame = (page as any).frame?.bind(page);
    if (typeof originalFrame === 'function') {
      (page as any).frame = (...args: any[]) => {
        throw new ReadonlyViolationError('page.frame (readonly mode)');
      };
      this.restorers.push(() => {
        (page as any).frame = originalFrame;
      });
    }

    // Also intercept via init script to block in-page JS interactions
    await this.injectReadonlyScript(page);
  }

  async detach(ctx: GuardrailContext): Promise<void> {
    if (ctx.options.readonlyMode === false) return;

    for (const restore of this.restorers) {
      try {
        restore();
      } catch {
        /* non-fatal */
      }
    }
    this.restorers = [];
  }

  private async injectReadonlyScript(page: Page): Promise<void> {
    try {
      // Inject script to disable form submissions and anchor navigations
      await page.addInitScript(() => {
        // Prevent form submission
        document.addEventListener('submit', (e) => e.preventDefault(), true);
        // Prevent link navigation (allow external navigation by playwright)
        document.addEventListener(
          'click',
          (e) => {
            const target = e.target as HTMLElement;
            const anchor = target.closest('a');
            if (anchor && anchor.href && !anchor.href.startsWith('#')) {
              e.preventDefault();
            }
          },
          true
        );
      });
    } catch {
      // Page may already be navigated; non-fatal
    }
  }
}
