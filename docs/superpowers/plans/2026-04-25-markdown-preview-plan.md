# Markdown Preview 插件实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建 VSCode 插件，启动本地 HTTP 服务器，在系统浏览器中实时预览 Markdown 文件，支持语法高亮、Mermaid 图表、多文件并发。

**Architecture:** Express HTTP 服务器 + WebSocket 推送变更通知。插件注册文件到 FileRegistry，保存时广播刷新消息，浏览器端接收后自动 reload。marked 解析 Markdown，highlight.js 语法高亮，mermaid.js 客户端渲染图表。

**Tech Stack:** TypeScript, VSCode Extension API, Express, ws, marked, highlight.js, mermaid.js, github-markdown-css, esbuild, Vitest

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `package.json` | 插件清单、依赖、命令注册 |
| `tsconfig.json` | TypeScript 配置 |
| `esbuild.config.ts` | 构建配置 |
| `src/extension.ts` | 插件入口，激活/注册命令 |
| `src/core/FileRegistry.ts` | 文件注册表，跟踪预览文件 |
| `src/core/MarkdownRenderer.ts` | Markdown → HTML 渲染引擎 |
| `src/core/FileWatcher.ts` | 文件保存/删除事件监听 |
| `src/server/PreviewServer.ts` | HTTP + WebSocket 服务器 |
| `src/server/routes.ts` | Express 路由 |
| `src/server/wsHandler.ts` | WebSocket 连接管理 |
| `src/client/preview.html` | 预览页面 HTML 模板（内联 CSS/JS） |
| `src/client/index.html` | 首页模板（文件列表） |
| `src/test/FileRegistry.test.ts` | FileRegistry 单元测试 |
| `src/test/MarkdownRenderer.test.ts` | MarkdownRenderer 单元测试 |
| `src/test/PreviewServer.test.ts` | PreviewServer 集成测试 |

---

## Task 1: 项目脚手架搭建

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `esbuild.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: 初始化 package.json**

Run:
```bash
cd d:/projstxx/markdownpreview
npm init -y
```

然后修改 `package.json` 为以下内容：

```json
{
  "name": "markdown-preview",
  "displayName": "Markdown Preview",
  "description": "在浏览器中实时预览 Markdown 文件，支持语法高亮和 Mermaid 图表",
  "version": "0.1.0",
  "publisher": "local",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": ["Other"],
  "activationEvents": [],
  "main": "./dist/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "markdownPreview.open",
        "title": "Markdown Preview: Open in Browser"
      },
      {
        "command": "markdownPreview.stop",
        "title": "Markdown Preview: Stop Server"
      }
    ],
    "menus": {
      "editor/title": [
        {
          "command": "markdownPreview.open",
          "when": "resourceLangId == markdown",
          "group": "navigation"
        }
      ],
      "editor/context": [
        {
          "command": "markdownPreview.open",
          "when": "resourceLangId == markdown",
          "group": "navigation"
        }
      ]
    },
    "configuration": {
      "title": "Markdown Preview",
      "properties": {
        "markdownPreview.port": {
          "type": "number",
          "default": 8080,
          "description": "预览服务器端口号"
        }
      }
    }
  },
  "scripts": {
    "build": "esbuild --bundle --outfile=dist/extension.js --external:vscode --format=cjs --platform=node src/extension.ts",
    "watch": "esbuild --bundle --outfile=dist/extension.js --external:vscode --format=cjs --platform=node --watch src/extension.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/vscode": "^1.85.0",
    "@types/ws": "^8.5.0",
    "esbuild": "^0.24.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  },
  "dependencies": {
    "express": "^4.21.0",
    "highlight.js": "^11.11.0",
    "marked": "^15.0.0",
    "marked-highlight": "^2.2.0",
    "ws": "^8.18.0"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2022",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "src/test"]
}
```

- [ ] **Step 3: 创建 esbuild.config.ts**

```typescript
import { build } from "esbuild";

build({
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "dist/extension.js",
  external: ["vscode"],
  format: "cjs",
  platform: "node",
  sourcemap: true,
}).catch(() => process.exit(1));
```

- [ ] **Step 4: 创建 .gitignore**

```
node_modules/
dist/
*.vsix
.vscode-test/
```

- [ ] **Step 5: 安装依赖**

Run:
```bash
cd d:/projstxx/markdownpreview && npm install
```
Expected: 依赖安装成功，`node_modules` 目录生成

- [ ] **Step 6: 创建目录结构**

Run:
```bash
cd d:/projstxx/markdownpreview && mkdir -p src/core src/server src/client src/test
```

- [ ] **Step 7: 验证构建**

创建最小入口文件 `src/extension.ts`：

```typescript
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log("Markdown Preview activated");
}

export function deactivate() {}
```

Run:
```bash
cd d:/projstxx/markdownpreview && npm run build
```
Expected: `dist/extension.js` 生成成功

---

## Task 2: FileRegistry 文件注册表

**Files:**
- Create: `src/core/FileRegistry.ts`
- Create: `src/test/FileRegistry.test.ts`

- [ ] **Step 1: 编写 FileRegistry 测试**

创建 `src/test/FileRegistry.test.ts`：

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { FileRegistry } from "../core/FileRegistry";
import * as path from "path";

describe("FileRegistry", () => {
  let registry: FileRegistry;

  beforeEach(() => {
    registry = new FileRegistry();
  });

  it("should register a file and return a fileId", () => {
    const filePath = "/path/to/test.md";
    const fileId = registry.register(filePath);
    expect(fileId).toBeTruthy();
    expect(typeof fileId).toBe("string");
  });

  it("should return the same fileId for the same file", () => {
    const filePath = "/path/to/test.md";
    const id1 = registry.register(filePath);
    const id2 = registry.register(filePath);
    expect(id1).toBe(id2);
  });

  it("should return different fileIds for different files", () => {
    const id1 = registry.register("/path/to/a.md");
    const id2 = registry.register("/path/to/b.md");
    expect(id1).not.toBe(id2);
  });

  it("should get all registered files", () => {
    registry.register("/path/to/a.md");
    registry.register("/path/to/b.md");
    const files = registry.getAll();
    expect(files).toHaveLength(2);
    expect(files[0].fileName).toBe("a.md");
    expect(files[1].fileName).toBe("b.md");
  });

  it("should check if file is registered", () => {
    registry.register("/path/to/test.md");
    expect(registry.hasFile("/path/to/test.md")).toBe(true);
    expect(registry.hasFile("/path/to/other.md")).toBe(false);
  });

  it("should unregister a file by fileId", () => {
    const fileId = registry.register("/path/to/test.md");
    registry.unregister(fileId);
    expect(registry.hasFile("/path/to/test.md")).toBe(false);
    expect(registry.getAll()).toHaveLength(0);
  });

  it("should find fileId by file path", () => {
    const filePath = "/path/to/test.md";
    registry.register(filePath);
    const fileId = registry.getFileId(filePath);
    expect(fileId).toBeTruthy();
  });

  it("should return undefined for unregistered file path", () => {
    const fileId = registry.getFileId("/not/registered.md");
    expect(fileId).toBeUndefined();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
cd d:/projstxx/markdownpreview && npx vitest run src/test/FileRegistry.test.ts
```
Expected: FAIL — `FileRegistry` 模块不存在

- [ ] **Step 3: 实现 FileRegistry**

创建 `src/core/FileRegistry.ts`：

```typescript
import * as crypto from "crypto";
import * as path from "path";

interface FileEntry {
  id: string;
  filePath: string;
  fileName: string;
}

export class FileRegistry {
  private files = new Map<string, FileEntry>();
  private pathToId = new Map<string, string>();

  register(filePath: string): string {
    const existing = this.pathToId.get(filePath);
    if (existing) {
      return existing;
    }

    const id = this.generateId(filePath);
    const entry: FileEntry = {
      id,
      filePath,
      fileName: path.basename(filePath),
    };
    this.files.set(id, entry);
    this.pathToId.set(filePath, id);
    return id;
  }

  unregister(fileId: string): void {
    const entry = this.files.get(fileId);
    if (entry) {
      this.pathToId.delete(entry.filePath);
      this.files.delete(fileId);
    }
  }

  getAll(): FileEntry[] {
    return Array.from(this.files.values());
  }

  hasFile(filePath: string): boolean {
    return this.pathToId.has(filePath);
  }

  getFileId(filePath: string): string | undefined {
    return this.pathToId.get(filePath);
  }

  getFilePath(fileId: string): string | undefined {
    return this.files.get(fileId)?.filePath;
  }

  clear(): void {
    this.files.clear();
    this.pathToId.clear();
  }

  private generateId(filePath: string): string {
    return crypto.createHash("sha256").update(filePath).digest("hex").substring(0, 10);
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
cd d:/projstxx/markdownpreview && npx vitest run src/test/FileRegistry.test.ts
```
Expected: 全部 PASS

---

## Task 3: MarkdownRenderer 渲染引擎

**Files:**
- Create: `src/core/MarkdownRenderer.ts`
- Create: `src/test/MarkdownRenderer.test.ts`

- [ ] **Step 1: 编写 MarkdownRenderer 测试**

创建 `src/test/MarkdownRenderer.test.ts`：

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { MarkdownRenderer } from "../core/MarkdownRenderer";

describe("MarkdownRenderer", () => {
  let renderer: MarkdownRenderer;

  beforeEach(() => {
    renderer = new MarkdownRenderer();
  });

  it("should render basic markdown to HTML", () => {
    const html = renderer.render("# Hello", "test.md", 8080);
    expect(html).toContain("<h1>Hello</h1>");
  });

  it("should include GitHub-style CSS", () => {
    const html = renderer.render("# Test", "test.md", 8080);
    expect(html).toContain("markdown-body");
  });

  it("should include mermaid.js script", () => {
    const html = renderer.render("```mermaid\ngraph LR\nA-->B\n```", "test.md", 8080);
    expect(html).toContain("mermaid");
  });

  it("should render code blocks with syntax highlighting", () => {
    const html = renderer.render("```javascript\nconst x = 1;\n```", "test.md", 8080);
    expect(html).toContain("hljs");
  });

  it("should preserve mermaid blocks as raw content", () => {
    const md = "```mermaid\ngraph LR\n    A-->B\n```";
    const html = renderer.render(md, "test.md", 8080);
    expect(html).toContain("class=\"mermaid\"");
    expect(html).toContain("graph LR");
  });

  it("should include WebSocket client script", () => {
    const html = renderer.render("# Test", "test.md", 8080);
    expect(html).toContain("WebSocket");
    expect(html).toContain("8080");
  });

  it("should include toolbar with refresh button", () => {
    const html = renderer.render("# Test", "test.md", 8080);
    expect(html).toContain("toolbar");
    expect(html).toContain("test.md");
  });

  it("should include highlight.js CSS", () => {
    const html = renderer.render("# Test", "test.md", 8080);
    expect(html).toContain("hljs");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:
```bash
cd d:/projstxx/markdownpreview && npx vitest run src/test/MarkdownRenderer.test.ts
```
Expected: FAIL — `MarkdownRenderer` 模块不存在

- [ ] **Step 3: 实现 MarkdownRenderer**

创建 `src/core/MarkdownRenderer.ts`：

```typescript
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";

const HIGHLIGHT_JS_CSS = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css`;
const GITHUB_MARKDOWN_CSS = `https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.8.1/github-markdown.min.css`;
const MERMAID_CDN = `https://cdnjs.cloudflare.com/ajax/libs/mermaid/11.4.1/mermaid.min.js`;

export class MarkdownRenderer {
  private marked: Marked;

  constructor() {
    this.marked = new Marked(
      markedHighlight({
        langPrefix: "hljs language-",
        highlight(code: string, lang: string) {
          if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
          }
          return hljs.highlightAuto(code).value;
        },
      })
    );
  }

  render(markdown: string, fileName: string, port: number): string {
    const bodyHtml = this.renderMarkdown(markdown);
    return this.wrapInTemplate(bodyHtml, fileName, port);
  }

  private renderMarkdown(markdown: string): string {
    const rawHtml = this.marked.parse(markdown) as string;
    return this.processMermaidBlocks(rawHtml);
  }

  private processMermaidBlocks(html: string): string {
    return html.replace(
      /<pre><code class="hljs language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
      (_match, code) => {
        const decodedCode = this.decodeHtmlEntities(code);
        return `<pre class="mermaid">${decodedCode}</pre>`;
      }
    );
  }

  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  private wrapInTemplate(bodyHtml: string, fileName: string, port: number): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileName} - Markdown Preview</title>
  <link rel="stylesheet" href="${GITHUB_MARKDOWN_CSS}">
  <link rel="stylesheet" href="${HIGHLIGHT_JS_CSS}">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #f6f8fa; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }
    .toolbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      background: #24292e; color: #fff; padding: 8px 16px;
      display: flex; align-items: center; gap: 12px; font-size: 13px;
    }
    .toolbar .file-name { font-weight: 600; flex: 1; }
    .toolbar button {
      background: #2ea44f; color: #fff; border: none; padding: 4px 12px;
      border-radius: 4px; cursor: pointer; font-size: 12px;
    }
    .toolbar button:hover { background: #2c974b; }
    .disconnected-banner {
      display: none; position: fixed; top: 36px; left: 0; right: 0; z-index: 99;
      background: #d73a49; color: #fff; padding: 6px 16px; font-size: 13px;
    }
    .content { max-width: 980px; margin: 56px auto 40px; padding: 45px; }
    .markdown-body { background: #fff; border-radius: 6px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.12); }
  </style>
</head>
<body>
  <div class="toolbar">
    <span class="file-name">${fileName}</span>
    <button onclick="location.reload()">刷新</button>
  </div>
  <div class="disconnected-banner" id="disconnectedBanner">连接已断开，正在尝试重连...</div>
  <div class="content">
    <div class="markdown-body">${bodyHtml}</div>
  </div>
  <script src="${MERMAID_CDN}"></script>
  <script>
    mermaid.initialize({ startOnLoad: true, theme: 'default' });
  </script>
  <script>
    (function() {
      var ws = new WebSocket('ws://localhost:${port}/ws');
      ws.onmessage = function(event) {
        var msg = JSON.parse(event.data);
        if (msg.type === 'refresh') { location.reload(); }
        if (msg.type === 'deleted') {
          document.querySelector('.markdown-body').innerHTML =
            '<h2>文件已删除</h2><p>该文件已被删除或移动。</p>';
        }
      };
      ws.onclose = function() {
        document.getElementById('disconnectedBanner').style.display = 'block';
        setTimeout(function() { location.reload(); }, 3000);
      };
      ws.onopen = function() {
        document.getElementById('disconnectedBanner').style.display = 'none';
      };
    })();
  </script>
</body>
</html>`;
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
cd d:/projstxx/markdownpreview && npx vitest run src/test/MarkdownRenderer.test.ts
```
Expected: 全部 PASS

- [ ] **Step 5: 如 mermaid 正则匹配失败，调试修复**

如果测试 `should preserve mermaid blocks as raw content` 失败，检查 `marked-highlight` 处理后 mermaid 代码块的实际 HTML 输出，调整 `processMermaidBlocks` 中的正则表达式。可能需要匹配 `<code class="hljs language-mermaid">` 或 `<code class="language-mermaid">`。

---

## Task 4: WsHandler WebSocket 连接管理

**Files:**
- Create: `src/server/wsHandler.ts`

- [ ] **Step 1: 实现 WsHandler**

创建 `src/server/wsHandler.ts`：

```typescript
import { WebSocketServer, WebSocket } from "ws";
import * as http from "http";

interface ClientInfo {
  ws: WebSocket;
  fileId?: string;
}

export class WsHandler {
  private wss: WebSocketServer | null = null;
  private clients = new Set<ClientInfo>();

  attach(server: http.Server): void {
    this.wss = new WebSocketServer({ server, path: "/ws" });
    this.wss.on("connection", (ws) => {
      const client: ClientInfo = { ws };
      this.clients.add(client);

      ws.on("close", () => {
        this.clients.delete(client);
      });
    });
  }

  broadcastRefresh(fileId: string): void {
    const message = JSON.stringify({ type: "refresh", fileId });
    this.sendToAll(message);
  }

  broadcastDeleted(fileId: string): void {
    const message = JSON.stringify({ type: "deleted", fileId });
    this.sendToAll(message);
  }

  broadcastServerStop(): void {
    const message = JSON.stringify({ type: "serverStopped" });
    this.sendToAll(message);
    this.closeAll();
  }

  private sendToAll(message: string): void {
    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }
  }

  private closeAll(): void {
    for (const client of this.clients) {
      client.ws.close();
    }
    this.clients.clear();
  }

  dispose(): void {
    this.closeAll();
    this.wss?.close();
    this.wss = null;
  }
}
```

---

## Task 5: PreviewServer HTTP 服务器

**Files:**
- Create: `src/server/routes.ts`
- Create: `src/server/PreviewServer.ts`
- Create: `src/test/PreviewServer.test.ts`

- [ ] **Step 1: 实现 Express 路由**

创建 `src/server/routes.ts`：

```typescript
import { Router, Request, Response } from "express";
import { FileRegistry } from "../core/FileRegistry";
import { MarkdownRenderer } from "../core/MarkdownRenderer";
import * as fs from "fs";

export function createRoutes(registry: FileRegistry, renderer: MarkdownRenderer, port: number): Router {
  const router = Router();

  router.get("/", (_req: Request, res: Response) => {
    const files = registry.getAll();
    const html = renderIndexPage(files);
    res.type("html").send(html);
  });

  router.get("/preview/:fileId", (req: Request, res: Response) => {
    const { fileId } = req.params;
    const filePath = registry.getFilePath(fileId);

    if (!filePath) {
      res.status(404).type("html").send("<h1>文件未找到</h1><p>该文件可能已取消预览。</p>");
      return;
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const html = renderer.render(content, filePath.split(/[\\/]/).pop() || "unknown.md", port);
      res.type("html").send(html);
    } catch (err) {
      const message = err instanceof Error ? err.message : "未知错误";
      res.status(500).type("html").send(`<h1>文件读取失败</h1><p>${message}</p>`);
    }
  });

  router.get("/api/files", (_req: Request, res: Response) => {
    const files = registry.getAll();
    res.json(files);
  });

  return router;
}

function renderIndexPage(files: { id: string; fileName: string }[]): string {
  const fileList = files
    .map((f) => `<li><a href="/preview/${f.id}">${f.fileName}</a></li>`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Markdown Preview - 文件列表</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 600px; margin: 60px auto; background: #f6f8fa; }
    h1 { color: #24292e; }
    ul { list-style: none; padding: 0; }
    li { padding: 8px 0; }
    a { color: #0366d6; text-decoration: none; font-size: 16px; }
    a:hover { text-decoration: underline; }
    .empty { color: #586069; font-style: italic; }
  </style>
</head>
<body>
  <h1>Markdown Preview</h1>
  ${files.length > 0 ? `<ul>${fileList}</ul>` : '<p class="empty">暂无预览文件。在 VSCode 中打开 Markdown 文件并执行 "Markdown Preview: Open in Browser" 命令。</p>'}
</body>
</html>`;
}
```

- [ ] **Step 2: 实现 PreviewServer**

创建 `src/server/PreviewServer.ts`：

```typescript
import express from "express";
import * as http from "http";
import { FileRegistry } from "../core/FileRegistry";
import { MarkdownRenderer } from "../core/MarkdownRenderer";
import { createRoutes } from "./routes";
import { WsHandler } from "./wsHandler";

export class PreviewServer {
  private server: http.Server | null = null;
  private wsHandler: WsHandler;
  private registry: FileRegistry;
  private renderer: MarkdownRenderer;
  private currentPort: number | null = null;

  constructor(registry: FileRegistry, renderer: MarkdownRenderer) {
    this.registry = registry;
    this.renderer = renderer;
    this.wsHandler = new WsHandler();
  }

  get port(): number | null {
    return this.currentPort;
  }

  get isRunning(): boolean {
    return this.server !== null && this.server.listening;
  }

  async start(preferredPort: number = 8080): Promise<number> {
    if (this.isRunning) {
      return this.currentPort!;
    }

    const app = express();
    app.use("/", createRoutes(this.registry, this.renderer, preferredPort));

    this.server = http.createServer(app);
    this.wsHandler.attach(this.server);

    const port = await this.findAvailablePort(preferredPort);
    this.currentPort = port;

    return new Promise((resolve, reject) => {
      this.server!.listen(port, () => {
        resolve(port);
      }).on("error", (err) => {
        reject(err);
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.server) return;

    this.wsHandler.broadcastServerStop();
    this.wsHandler.dispose();

    return new Promise((resolve) => {
      this.server!.close(() => {
        this.server = null;
        this.currentPort = null;
        resolve();
      });
    });
  }

  broadcastRefresh(fileId: string): void {
    this.wsHandler.broadcastRefresh(fileId);
  }

  broadcastDeleted(fileId: string): void {
    this.wsHandler.broadcastDeleted(fileId);
  }

  private findAvailablePort(startPort: number): Promise<number> {
    const maxPort = 8090;

    return new Promise((resolve, reject) => {
      const tryPort = (port: number) => {
        if (port > maxPort) {
          reject(new Error(`无可用端口（尝试范围 ${startPort}-${maxPort}），请手动配置端口`));
          return;
        }

        const testServer = http.createServer();
        testServer.listen(port, () => {
          testServer.close(() => resolve(port));
        }).on("error", () => {
          tryPort(port + 1);
        });
      };
      tryPort(startPort);
    });
  }
}
```

- [ ] **Step 3: 编写 PreviewServer 集成测试**

创建 `src/test/PreviewServer.test.ts`：

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { PreviewServer } from "../server/PreviewServer";
import { FileRegistry } from "../core/FileRegistry";
import { MarkdownRenderer } from "../core/MarkdownRenderer";

describe("PreviewServer", () => {
  let server: PreviewServer;

  afterEach(async () => {
    if (server && server.isRunning) {
      await server.stop();
    }
  });

  it("should start on specified port", async () => {
    const registry = new FileRegistry();
    const renderer = new MarkdownRenderer();
    server = new PreviewServer(registry, renderer);
    const port = await server.start(9090);
    expect(port).toBe(9090);
    expect(server.isRunning).toBe(true);
  });

  it("should find next available port if occupied", async () => {
    const registry = new FileRegistry();
    const renderer = new MarkdownRenderer();
    const server1 = new PreviewServer(registry, renderer);
    const port1 = await server1.start(9091);

    const server2 = new PreviewServer(registry, renderer);
    const port2 = await server2.start(9091);
    expect(port2).toBe(9092);

    await server1.stop();
    await server2.stop();
  });

  it("should stop gracefully", async () => {
    const registry = new FileRegistry();
    const renderer = new MarkdownRenderer();
    server = new PreviewServer(registry, renderer);
    await server.start(9093);
    await server.stop();
    expect(server.isRunning).toBe(false);
  });
});
```

- [ ] **Step 4: 运行测试确认通过**

Run:
```bash
cd d:/projstxx/markdownpreview && npx vitest run
```
Expected: 全部 PASS

---

## Task 6: FileWatcher 文件监听器

**Files:**
- Create: `src/core/FileWatcher.ts`

- [ ] **Step 1: 实现 FileWatcher**

创建 `src/core/FileWatcher.ts`：

```typescript
import * as vscode from "vscode";
import { FileRegistry } from "./FileRegistry";

export class FileWatcher {
  private disposables: vscode.Disposable[] = [];

  constructor(
    private registry: FileRegistry,
    private onSave: (fileId: string) => void,
    private onDelete: (fileId: string) => void
  ) {}

  start(): void {
    const saveWatcher = vscode.workspace.onDidSaveTextDocument((doc) => {
      if (!this.isMarkdown(doc)) return;
      const fileId = this.registry.getFileId(doc.uri.fsPath);
      if (fileId) {
        this.onSave(fileId);
      }
    });

    const deleteWatcher = vscode.workspace.onDidDeleteFiles((event) => {
      for (const uri of event.files) {
        const fileId = this.registry.getFileId(uri.fsPath);
        if (fileId) {
          this.registry.unregister(fileId);
          this.onDelete(fileId);
        }
      }
    });

    this.disposables.push(saveWatcher, deleteWatcher);
  }

  dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
  }

  private isMarkdown(doc: vscode.TextDocument): boolean {
    return doc.languageId === "markdown" || doc.uri.fsPath.endsWith(".md");
  }
}
```

---

## Task 7: Extension 插件入口

**Files:**
- Modify: `src/extension.ts`

- [ ] **Step 1: 实现完整的插件入口**

替换 `src/extension.ts` 内容：

```typescript
import * as vscode from "vscode";
import { FileRegistry } from "./core/FileRegistry";
import { MarkdownRenderer } from "./core/MarkdownRenderer";
import { PreviewServer } from "./server/PreviewServer";
import { FileWatcher } from "./core/FileWatcher";

let registry: FileRegistry;
let renderer: MarkdownRenderer;
let server: PreviewServer;
let watcher: FileWatcher;

export function activate(context: vscode.ExtensionContext) {
  registry = new FileRegistry();
  renderer = new MarkdownRenderer();
  server = new PreviewServer(registry, renderer);

  const openCommand = vscode.commands.registerCommand("markdownPreview.open", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage("请先打开一个 Markdown 文件");
      return;
    }

    const filePath = editor.document.uri.fsPath;
    if (!isMarkdown(editor.document)) {
      vscode.window.showWarningMessage("当前文件不是 Markdown 文件");
      return;
    }

    try {
      if (!server.isRunning) {
        const configPort = vscode.workspace.getConfiguration("markdownPreview").get<number>("port", 8080);
        const port = await server.start(configPort);
        vscode.window.showInformationMessage(`Markdown Preview 服务器已启动: http://localhost:${port}`);

        watcher = new FileWatcher(
          registry,
          (fileId) => server.broadcastRefresh(fileId),
          (fileId) => server.broadcastDeleted(fileId)
        );
        watcher.start();
      }

      const fileId = registry.register(filePath);
      const port = server.port!;
      const url = `http://localhost:${port}/preview/${fileId}`;
      vscode.env.openExternal(vscode.Uri.parse(url));
    } catch (err) {
      const message = err instanceof Error ? err.message : "启动服务器失败";
      vscode.window.showErrorMessage(message);
    }
  });

  const stopCommand = vscode.commands.registerCommand("markdownPreview.stop", async () => {
    if (!server.isRunning) {
      vscode.window.showInformationMessage("服务器未在运行");
      return;
    }

    await server.stop();
    watcher?.dispose();
    registry.clear();
    vscode.window.showInformationMessage("Markdown Preview 服务器已停止");
  });

  context.subscriptions.push(openCommand, stopCommand);
}

export function deactivate() {
  watcher?.dispose();
  server?.stop();
  registry?.clear();
}

function isMarkdown(doc: vscode.TextDocument): boolean {
  return doc.languageId === "markdown" || doc.uri.fsPath.endsWith(".md");
}
```

- [ ] **Step 2: 构建验证**

Run:
```bash
cd d:/projstxx/markdownpreview && npm run build
```
Expected: 构建成功，无错误

---

## Task 8: 创建测试用 Markdown 样本文件

**Files:**
- Create: `test-samples/basic.md`
- Create: `test-samples/code.md`
- Create: `test-samples/mermaid.md`

- [ ] **Step 1: 创建测试样本**

创建 `test-samples/basic.md`：

```markdown
# 测试标题

这是一段 **粗体** 和 *斜体* 文本。

## 列表

- 项目一
- 项目二
- 项目三

## 表格

| 名称 | 类型 | 说明 |
|------|------|------|
| name | string | 名称 |
| age  | number | 年龄 |

## 链接

[GitHub](https://github.com)
```

创建 `test-samples/code.md`：

```markdown
# 代码高亮测试

## JavaScript

```javascript
function greet(name) {
  console.log(`Hello, ${name}!`);
  return { message: `Hello, ${name}!` };
}
```

## Python

```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
```

## TypeScript

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

function createUser(data: Partial<User>): User {
  return { id: Date.now(), name: "", email: "", ...data };
}
```
```

创建 `test-samples/mermaid.md`：

```markdown
# Mermaid 图表测试

## 流程图

```mermaid
graph TD
    A[开始] --> B{判断条件}
    B -->|是| C[执行操作A]
    B -->|否| D[执行操作B]
    C --> E[结束]
    D --> E
```

## 序列图

```mermaid
sequenceDiagram
    participant 用户
    participant 服务器
    participant 数据库
    用户->>服务器: 发送请求
    服务器->>数据库: 查询数据
    数据库-->>服务器: 返回结果
    服务器-->>用户: 响应结果
```
```

---

## Task 9: 端到端手动测试

- [ ] **Step 1: 按 F5 启动 Extension Development Host**

在 VSCode 中打开项目，按 F5 启动扩展调试。

- [ ] **Step 2: 测试基本预览**

在 Extension Development Host 中打开 `test-samples/basic.md`，通过命令面板执行 "Markdown Preview: Open in Browser"，确认浏览器打开并正确渲染。

- [ ] **Step 3: 测试代码高亮**

打开 `test-samples/code.md`，确认 JavaScript/Python/TypeScript 代码高亮正确显示。

- [ ] **Step 4: 测试 Mermaid 图表**

打开 `test-samples/mermaid.md`，确认流程图和序列图正确渲染。

- [ ] **Step 5: 测试保存刷新**

修改 `test-samples/basic.md` 内容并保存（Ctrl+S），确认浏览器自动刷新。

- [ ] **Step 6: 测试多文件并发**

同时打开 `basic.md` 和 `mermaid.md` 预览，确认两个标签页互不干扰。修改其中一个并保存，确认只有对应标签页刷新。

- [ ] **Step 7: 测试首页文件列表**

浏览器访问 `http://localhost:8080/`，确认列出所有已注册的预览文件。

- [ ] **Step 8: 测试停止服务器**

执行 "Markdown Preview: Stop Server" 命令，确认服务器关闭，浏览器页面显示断开提示。

---

## 任务依赖关系

```
Task 1 (脚手架) → Task 2 (FileRegistry) → Task 4 (WsHandler)
                                      ↘
                 Task 3 (Renderer)   → Task 5 (PreviewServer) → Task 6 (FileWatcher) → Task 7 (Extension) → Task 8 (测试样本) → Task 9 (E2E 测试)
```

Task 2、3、4 可并行开发。Task 5 依赖 2+3+4。Task 6 依赖 2。Task 7 依赖全部核心组件。
