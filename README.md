# @unstorm/openclaw-browser

OpenClaw 浏览器抓取能力扩展。当 `web_fetch` 无法处理的页面（JS 渲染、微信公众号文章等），通过 Playwright 打开真实浏览器抓取内容。

**定位：web_fetch 的备份方案，不是主力。**

## 安装

```bash
npm install -g @unstorm/openclaw-browser
```

## 使用方式

### CLI

```bash
# 基础抓取（纯文本输出）
openclaw-browser --url "https://example.com"

# 微信公众号文章（自动识别，提取正文 + 元数据）
openclaw-browser --url "https://mp.weixin.qq.com/s/xxx" --format markdown

# 输出完整 JSON 结果
openclaw-browser --url "https://example.com" --json --pretty

# 自定义超时和内容大小限制
openclaw-browser --url "https://example.com" --timeout 30000 --max-size 10485760
```

### 代码调用

```typescript
import { OpenClawBrowserClient } from '@unstorm/openclaw-browser';

const client = new OpenClawBrowserClient({
  maxConcurrency: 2,
  defaultPageTimeout: 15000,
  headless: true,
  readonlyMode: true,
});

const result = await client.fetch({
  url: 'https://mp.weixin.qq.com/s/xxx',
  outputFormat: 'markdown',
});

if (result.ok) {
  console.log(result.content.text);
  console.log(result.content.wechat); // 微信文章元数据
}

await client.close();
```

## CLI 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--url` | 目标 URL（必填） | — |
| `--format` | 输出格式：`html` / `text` / `markdown` | `text` |
| `--timeout` | 页面超时（ms） | `15000` |
| `--max-size` | 最大内容大小（bytes） | `5242880`（5MB） |
| `--wait` | 页面加载后额外等待（ms） | `0` |
| `--headless` / `--no-headless` | 无头模式 | `true` |
| `--readonly` / `--no-readonly` | 只读模式 | `true` |
| `--proxy` | 代理 URL | — |
| `--user-agent` | 自定义 UA | — |
| `--allowed-domains` | 允许的域名（逗号分隔，支持通配符） | 全部 |
| `--screenshot-on-error` | 失败时截图 | `false` |
| `--json` / `--pretty` | 输出完整 JSON | `false` |

## 内置 Guardrails

所有抓取操作都经过以下安全守卫：

| 守卫 | 作用 |
|------|------|
| **并发限制** | 默认最多 2 个页面同时打开 |
| **超时控制** | 单页默认 15s，可配置 |
| **内容大小限制** | 默认 5MB，防止内存溢出 |
| **只读模式** | 默认开启，禁止点击/滚动/表单提交 |
| **域名白名单** | 可配置允许抓取的域名范围 |
| **成本监控** | 追踪每次抓取的时间和资源消耗 |

## 微信公众号支持

自动检测 `mp.weixin.qq.com` URL，应用专用策略：

- 使用移动端 UA（模拟微信内置浏览器）
- 自动等待懒加载图片
- 提取文章元数据：标题、作者、发布时间、公众号名称、摘要、封面图
- 解析 `data-src` 懒加载图片为真实 URL

## 错误类型

| 错误码 | 说明 |
|--------|------|
| `TIMEOUT` | 页面加载超时 |
| `DOMAIN_BLOCKED` | 域名不在白名单内 |
| `CONTENT_TOO_LARGE` | 内容超过大小限制 |
| `READONLY_VIOLATION` | 只读模式下尝试了交互操作 |
| `NAVIGATION_FAILED` | 页面导航失败 |
| `CONCURRENCY_LIMIT` | 并发数达到上限 |
| `BROWSER_CRASH` | 浏览器进程崩溃 |

## 开发

```bash
# 安装依赖
npm install

# 类型检查
npx tsc --noEmit

# 构建
npm run build

# 运行 CLI
node dist/cli.js --url "https://example.com"
```

## 依赖

- Node.js >= 18
- Playwright（Chromium）

首次使用需要安装 Playwright 浏览器：

```bash
npx playwright install chromium
```

## License

MIT
