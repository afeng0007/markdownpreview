# Markdown Preview - VSCode 浏览器预览插件设计

## 概述

VSCode 插件，在本地启动 HTTP 服务器，将编辑器中的 Markdown 文件渲染为 HTML，在系统浏览器中实时预览。支持语法高亮、Mermaid 图表、多文件并发预览。

## 核心需求

1. 外部浏览器预览 Markdown 文件（非 VSCode 内嵌 WebView）
2. 保存文件时自动刷新 + 手动刷新按钮
3. 多文件并发预览（不同浏览器标签页）
4. 编程语言语法高亮
5. Mermaid 图表渲染
6. GitHub 风格主题样式

## 架构

### 三层架构

```
┌─────────────────┐     HTTP/WS      ┌──────────────┐
│  VSCode Editor  │◄───────────────►│   Browser     │
│  (保存 .md 文件) │     localhost    │  (预览页面)    │
└────────┬────────┘                  └──────────────┘
         │ onDidSave
         ▼
┌─────────────────┐
│  Extension Host │
│  (文件注册表)    │
└────────┬────────┘
         │ 通知变更
         ▼
┌─────────────────┐
│  Express Server │
│  (marked+hljs)  │
└─────────────────┘
```

**1. VSCode 扩展层（Extension Host）**

- 注册命令：`Open Preview`、`Stop Server`
- 监听 `onDidSaveTextDocument` 事件，过滤 `.md` 文件
- 管理 HTTP 服务器生命周期
- 维护文件注册表

**2. HTTP 服务器层**

- Express 服务器监听本地端口（默认 8080，可配置）
- 路由：
  - `GET /` → 首页，列出所有已注册的预览文件
  - `GET /preview/:fileId` → 渲染指定 Markdown 文件为 HTML
  - `GET /api/files` → JSON 接口，返回活跃文件列表
  - WebSocket 端点 `/ws` → 推送文件变更通知

**3. 浏览器客户端层**

- 接收服务端渲染的 HTML 页面（内联 CSS/JS）
- mermaid.js 客户端脚本处理图表渲染
- WebSocket 客户端监听变更通知，自动刷新
- 工具栏：手动刷新按钮 + 文件名显示

## 核心组件

### PreviewServer（服务器管理器）

单一职责：管理 HTTP 服务器的启停和配置。

- `start(port?)` — 启动服务器，端口冲突时自动递增尝试（8080-8090）
- `stop()` — 关闭服务器和所有 WebSocket 连接
- `restart()` — 重启服务器
- 维护 WebSocket 连接池，广播变更消息

### FileRegistry（文件注册表）

单一职责：跟踪需要预览的 Markdown 文件。

- `register(filePath)` — 注册文件，生成唯一 fileId（基于相对路径的短 hash）
- `unregister(fileId)` — 移除文件
- `getAll()` — 返回所有注册文件（id、路径、文件名、最后修改时间）
- `getContent(fileId)` — 读取文件原始内容
- `hasFile(filePath)` — 检查是否已注册

### MarkdownRenderer（渲染引擎）

单一职责：将 Markdown 文本转换为完整 HTML。

渲染流程：
1. `marked` 解析 Markdown 为 HTML
2. 代码块通过 `highlight.js` 添加语法高亮
3. 识别 `mermaid` 代码块，保留为 `<pre class="mermaid">` 原始内容
4. 注入 GitHub 风格 CSS（github-markdown-css）
5. 注入 mermaid.js 客户端脚本（浏览器端渲染图表）
6. 注入 WebSocket 客户端脚本（监听刷新通知）
7. 注入工具栏 HTML（刷新按钮 + 文件名）

### FileWatcher（文件监听器）

单一职责：检测文件变更并通知服务器。

- 监听 `onDidSaveTextDocument`，过滤 `.md` 文件
- 文件保存时通知 PreviewServer 广播 `refresh` 消息（携带 fileId）
- 仅通知已注册的文件，忽略无关文件

## 数据流

### 打开预览

```
用户打开 .md 文件 → 执行 "Markdown Preview: Open in Browser"
→ FileRegistry.register(absolutePath) → 生成 fileId
→ PreviewServer 启动（如未启动）
→ vscode.env.openExternal("http://localhost:8080/preview/{fileId}")
→ 浏览器打开预览页面
```

### 保存文件触发刷新

```
用户保存 .md 文件 → FileWatcher 检测到保存事件
→ 检查文件是否在 FileRegistry 中
→ PreviewServer.broadcast({type:"refresh", fileId})
→ 浏览器 WebSocket 客户端收到消息 → location.reload()
→ 服务器重新读取文件 → MarkdownRenderer.render() → 返回新 HTML
```

### 多文件并发

```
用户打开 file-a.md、file-b.md 预览
→ FileRegistry: { "abc123": "/path/file-a.md", "def456": "/path/file-b.md" }
→ 浏览器标签页1: http://localhost:8080/preview/abc123
→ 浏览器标签页2: http://localhost:8080/preview/def456
→ 保存 file-a.md 只广播 refresh 给 fileId=abc123，互不干扰
```

### 首页文件列表

```
访问 http://localhost:8080/ → 列出 FileRegistry 所有文件
→ 每个文件显示文件名 + 预览链接 → 点击跳转 /preview/{fileId}
```

### 关闭预览

```
执行 "Markdown Preview: Stop Server"
→ PreviewServer.stop() → 关闭 HTTP/WS → 清空 FileRegistry
→ 浏览器显示"服务器已关闭"提示
```

## 错误处理

### 端口冲突

启动时尝试默认端口 8080，被占用则自动递增 8081-8090，超过上限报错提示用户手动指定端口。实际端口通过 `showInformationMessage` 通知用户。

### 文件被删除/移动

FileWatcher 监听 `onDidDeleteFiles`，自动从 FileRegistry 移除，广播 `{type: "deleted", fileId}`，浏览器显示"文件已删除"提示。

### 文件读取失败

MarkdownRenderer 捕获异常，返回错误提示 HTML 而非崩溃。

### Mermaid 语法错误

mermaid.js 浏览器端渲染，语法错误由其自身显示错误提示。

### 服务器异常

未捕获异常全局处理，崩溃时 `showErrorMessage` 通知用户，提供重新启动命令。

### WebSocket 断开

客户端检测 `onclose`，显示"连接已断开"横幅，每 3 秒自动重连，重连成功后自动刷新。

## 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 语言 | TypeScript | 全栈统一语言 |
| 扩展框架 | VSCode Extension API | 插件注册与命令 |
| HTTP 服务器 | Express | 轻量、路由清晰 |
| WebSocket | ws | 轻量级双向通信 |
| Markdown 解析 | marked | 速度快、插件生态好 |
| 代码高亮 | highlight.js | 广泛语言支持 |
| Mermaid | mermaid.js（客户端） | 浏览器端渲染图表 |
| CSS | github-markdown-css | GitHub 风格样式 |
| 构建 | esbuild | 快速打包 |
| 测试 | Vitest | 单元测试 + 集成测试 |

## 项目结构

```
markdownpreview/
├── src/
│   ├── extension.ts          # 插件入口
│   ├── server/
│   │   ├── PreviewServer.ts  # HTTP + WebSocket 服务器
│   │   ├── routes.ts         # Express 路由
│   │   └── wsHandler.ts      # WebSocket 连接管理
│   ├── core/
│   │   ├── FileRegistry.ts   # 文件注册表
│   │   ├── MarkdownRenderer.ts # Markdown → HTML
│   │   └── FileWatcher.ts    # 文件变更监听
│   └── client/
│       ├── index.html        # 首页模板
│       ├── preview.html      # 预览页面模板
│       ├── ws-client.js      # WebSocket 客户端
│       └── toolbar.js        # 工具栏交互
├── package.json
├── tsconfig.json
├── esbuild.config.ts
└── src/test/
    ├── extension.test.ts
    ├── FileRegistry.test.ts
    └── MarkdownRenderer.test.ts
```

## 插件命令

| 命令 | 触发方式 | 行为 |
|------|----------|------|
| `markdownPreview.open` | 命令面板 / 右键菜单 | 注册当前文件并打开浏览器预览 |
| `markdownPreview.stop` | 命令面板 | 停止服务器 |
| `markdownPreview.openInEditor` | 编辑器标题栏按钮 | 一键预览当前文件 |
