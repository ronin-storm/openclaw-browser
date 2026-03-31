#!/usr/bin/env node
/**
 * openclaw-browser CLI
 *
 * Usage:
 *   openclaw-browser --url "https://example.com" [options]
 *
 * Options:
 *   --url <url>           Target URL to fetch (required)
 *   --format <format>     Output format: html | text | markdown (default: text)
 *   --timeout <ms>        Page timeout in ms (default: 15000)
 *   --max-size <bytes>    Max content size in bytes (default: 5242880)
 *   --wait <ms>           Extra wait after page load in ms (default: 0)
 *   --headless            Run browser in headless mode (default: true)
 *   --no-headless         Run browser with UI visible
 *   --readonly            Enforce readonly mode (default: true)
 *   --no-readonly         Allow interactive operations
 *   --proxy <url>         HTTP/HTTPS proxy URL
 *   --user-agent <ua>     Custom User-Agent string
 *   --allowed-domains     Comma-separated list of allowed domains (glob supported)
 *   --screenshot-on-error Save screenshot on failure
 *   --json                Output full result as JSON
 *   --pretty              Pretty-print JSON output
 *   --version             Show version
 *   --help                Show this help
 */

import { OpenClawBrowserClient } from './core/browser-client';
import { OutputFormat } from './types/common';
import { FetchOptions } from './types/fetch';
import { BrowserClientOptions } from './types/config';

function showHelp(): void {
  console.log(`
openclaw-browser - Fetch JS-rendered pages and WeChat articles via Playwright

Usage:
  openclaw-browser --url <url> [options]

Options:
  --url <url>              Target URL to fetch (required)
  --format <format>        Output format: html | text | markdown (default: text)
  --timeout <ms>           Page timeout in ms (default: 15000)
  --max-size <bytes>       Max content size in bytes (default: 5242880)
  --wait <ms>              Extra wait after page load in ms (default: 0)
  --headless               Run browser in headless mode (default: true)
  --no-headless            Run browser with UI visible
  --readonly               Enforce readonly mode (default: true)
  --no-readonly            Allow interactive operations
  --proxy <url>            HTTP/HTTPS proxy URL
  --user-agent <ua>        Custom User-Agent string
  --allowed-domains <list> Comma-separated list of allowed domains
  --screenshot-on-error    Save screenshot on failure
  --json                   Output full result as JSON
  --pretty                 Pretty-print JSON output (implies --json)
  -v, --version            Show version
  -h, --help               Show this help

Examples:
  openclaw-browser --url "https://example.com"
  openclaw-browser --url "https://mp.weixin.qq.com/s/xxx" --format markdown
  openclaw-browser --url "https://example.com" --json --pretty
  openclaw-browser --url "https://example.com" --timeout 30000 --format text
`);
}

function showVersion(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('../package.json');
    console.log(`${pkg.name} v${pkg.version}`);
  } catch {
    console.log('openclaw-browser (version unknown)');
  }
}

interface ParsedArgs {
  url?: string;
  format: OutputFormat;
  timeout: number;
  maxSize: number;
  wait: number;
  headless: boolean;
  readonly: boolean;
  proxy?: string;
  userAgent?: string;
  allowedDomains: string[];
  screenshotOnError: boolean;
  json: boolean;
  pretty: boolean;
  help: boolean;
  version: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  const result: ParsedArgs = {
    format: 'text',
    timeout: 15_000,
    maxSize: 5 * 1024 * 1024,
    wait: 0,
    headless: true,
    readonly: true,
    allowedDomains: [],
    screenshotOnError: false,
    json: false,
    pretty: false,
    help: false,
    version: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--url':
        result.url = next;
        i++;
        break;
      case '--format':
        result.format = (next as OutputFormat) || 'text';
        i++;
        break;
      case '--timeout':
        result.timeout = parseInt(next, 10);
        i++;
        break;
      case '--max-size':
        result.maxSize = parseInt(next, 10);
        i++;
        break;
      case '--wait':
        result.wait = parseInt(next, 10);
        i++;
        break;
      case '--headless':
        result.headless = true;
        break;
      case '--no-headless':
        result.headless = false;
        break;
      case '--readonly':
        result.readonly = true;
        break;
      case '--no-readonly':
        result.readonly = false;
        break;
      case '--proxy':
        result.proxy = next;
        i++;
        break;
      case '--user-agent':
        result.userAgent = next;
        i++;
        break;
      case '--allowed-domains':
        result.allowedDomains = (next || '')
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean);
        i++;
        break;
      case '--screenshot-on-error':
        result.screenshotOnError = true;
        break;
      case '--json':
        result.json = true;
        break;
      case '--pretty':
        result.pretty = true;
        result.json = true;
        break;
      case '-h':
      case '--help':
        result.help = true;
        break;
      case '-v':
      case '--version':
        result.version = true;
        break;
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
    }
  }

  return result;
}

function formatOutput(
  result: import('./types/result').FetchResult,
  args: ParsedArgs
): string {
  if (args.json || args.pretty) {
    return JSON.stringify(result, null, args.pretty ? 2 : undefined);
  }

  const { content } = result;
  switch (args.format) {
    case 'html':
      return content.html ?? '';
    case 'markdown':
      return content.markdown ?? content.text ?? '';
    case 'text':
    default:
      return content.text ?? content.html ?? '';
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (args.version) {
    showVersion();
    process.exit(0);
  }

  if (!args.url) {
    console.error('Error: --url is required\n');
    showHelp();
    process.exit(1);
  }

  // Runtime validation
  const validFormats: OutputFormat[] = ['html', 'text', 'markdown'];
  if (!validFormats.includes(args.format)) {
    console.error(
      `Error: --format must be one of: ${validFormats.join(', ')} (got: ${args.format})`
    );
    process.exit(1);
  }

  if (isNaN(args.timeout) || args.timeout <= 0) {
    console.error(
      `Error: --timeout must be a positive integer (got: ${args.timeout})`
    );
    process.exit(1);
  }

  if (isNaN(args.maxSize) || args.maxSize <= 0) {
    console.error(
      `Error: --max-size must be a positive integer (got: ${args.maxSize})`
    );
    process.exit(1);
  }

  if (isNaN(args.wait) || args.wait < 0) {
    console.error(
      `Error: --wait must be a non-negative integer (got: ${args.wait})`
    );
    process.exit(1);
  }

  try {
    new URL(args.url);
  } catch {
    console.error(`Error: --url is not a valid URL: ${args.url}`);
    process.exit(1);
  }

  const clientOptions: BrowserClientOptions = {
    headless: args.headless,
    readonlyMode: args.readonly,
    defaultPageTimeout: args.timeout,
    defaultMaxContentSize: args.maxSize,
    ...(args.proxy ? { proxy: args.proxy } : {}),
    ...(args.userAgent ? { userAgent: args.userAgent } : {}),
    ...(args.allowedDomains.length > 0
      ? { allowedDomains: args.allowedDomains.map((d) => ({ pattern: d })) }
      : {}),
  };

  const fetchOptions: FetchOptions = {
    url: args.url,
    outputFormat: args.format,
    pageTimeout: args.timeout,
    maxContentSize: args.maxSize,
    readonlyMode: args.readonly,
    extraWaitMs: args.wait > 0 ? args.wait : undefined,
    screenshotOnError: args.screenshotOnError,
    ...(args.allowedDomains.length > 0
      ? { allowedDomains: args.allowedDomains.map((d) => ({ pattern: d })) }
      : {}),
  };

  const client = new OpenClawBrowserClient(clientOptions);

  try {
    const result = await client.fetch(fetchOptions);

    if (!result.ok) {
      if (args.json || args.pretty) {
        process.stdout.write(
          JSON.stringify(result, null, args.pretty ? 2 : undefined) + '\n'
        );
      } else {
        const errCode = result.error?.code ?? 'UNKNOWN';
        const errMsg = result.error?.message ?? 'Fetch failed';
        console.error(`Error [${errCode}]: ${errMsg}`);
      }
      process.exit(1);
    }

    const output = formatOutput(result, args);
    process.stdout.write(output);
    if (!output.endsWith('\n')) {
      process.stdout.write('\n');
    }
  } finally {
    await client.close();
  }
}

main().catch((err: Error) => {
  console.error('Fatal:', err.message ?? err);
  process.exit(1);
});
