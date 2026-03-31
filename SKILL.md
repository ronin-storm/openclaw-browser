---
name: openclaw-browser
description: >
  Fetch web pages using a real browser (Playwright) when web_fetch cannot handle them.
  Use when: (1) the page requires JavaScript rendering (SPA, React, Vue, Angular),
  (2) fetching WeChat public account articles (mp.weixin.qq.com),
  (3) web_fetch returns empty or incomplete content,
  (4) the page has lazy-loaded images or dynamic content that needs waiting.
  DO NOT use when web_fetch works fine — this is the fallback, not the default.
---

# openclaw-browser

Browser-based web fetcher built on Playwright. Fallback for when `web_fetch` can't handle a page.

## Prerequisites

Ensure Playwright Chromium is installed:

```bash
npx playwright install chromium
```

## Usage

The CLI is available globally after `npm install -g @unstorm/openclaw-browser`. Run:

```bash
openclaw-browser --url <url> [options]
```

### Common Patterns

**Basic fetch (text output):**

```bash
openclaw-browser --url "https://example.com"
```

**WeChat article (auto-detects, uses mobile UA, extracts metadata):**

```bash
openclaw-browser --url "https://mp.weixin.qq.com/s/xxx" --format markdown
```

**Full JSON result with metrics:**

```bash
openclaw-browser --url "https://example.com" --json --pretty
```

**Wait for lazy content to load:**

```bash
openclaw-browser --url "https://example.com" --wait 3000
```

**Domain restriction:**

```bash
openclaw-browser --url "https://example.com" --allowed-domains "example.com,*.cdn.com"
```

## Key Options

| Flag | Description | Default |
|------|-------------|---------|
| `--url` | Target URL (required) | — |
| `--format` | Output: `text` / `html` / `markdown` | `text` |
| `--timeout` | Page load timeout (ms) | `15000` |
| `--wait` | Extra wait after load (ms) | `0` |
| `--max-size` | Max content size (bytes) | `5242880` |
| `--readonly` / `--no-readonly` | Readonly mode | `true` |
| `--allowed-domains` | Comma-separated domain whitelist | all |
| `--json` / `--pretty` | Output full JSON | `false` |

## Output

Default output is plain text. With `--json`:

```json
{
  "ok": true,
  "finalUrl": "https://example.com/",
  "status": 200,
  "title": "Example Domain",
  "content": {
    "text": "...",
    "title": "..."
  },
  "metrics": {
    "durationMs": 3500,
    "totalBytesDownloaded": 528,
    "requestCount": 1
  }
}
```

When `ok: false`, check `error.code`:

| Code | Meaning |
|------|---------|
| `TIMEOUT` | Page load timed out |
| `DOMAIN_BLOCKED` | Domain not in whitelist |
| `CONTENT_TOO_LARGE` | Response exceeds size limit |
| `NAVIGATION_FAILED` | Page navigation error |
| `BROWSER_CRASH` | Browser process crashed |

## WeChat Specifics

When URL matches `mp.weixin.qq.com`:

- Auto-applies mobile User-Agent (mimics WeChat in-app browser)
- Waits for lazy-loaded images (`data-src` → real URL)
- Extracts article metadata: title, author, publish date, account name, abstract, cover image
- Outputs as `markdown` format by default for best readability

## Tips

- **When `web_fetch` returns empty content** → likely JS-rendered, try openclaw-browser with `--wait 2000`
- **For WeChat articles** → always use `--format markdown` for best result
- **Slow pages** → increase `--timeout 30000` and add `--wait 3000`
- **Memory concerns** → reduce `--max-size` to limit content size
