# Mermaid 图表全屏显示与图片下载

## 概述

为 Markdown 预览中的 mermaid 渲染图表添加全屏查看和图片导出功能。用户悬停到 mermaid 图表上时显示工具栏，支持全屏查看、SVG/PNG 下载。

## 方案选型

**采用纯客户端 DOM 操作方案**，直接从浏览器 DOM 中提取 mermaid 渲染后的 SVG 元素。零后端改动，所有逻辑在客户端 HTML 模板中完成。

未采用方案：
- 服务端 Puppeteer 截图：依赖过重（~300MB），架构复杂度大增
- mermaid API 重新渲染：增加不必要的复杂度和性能开销

## 功能设计

### 1. 悬停工具栏

- 每个 mermaid 渲染结果外层包裹 `.mermaid-wrapper` 容器
- 鼠标悬停时，右上角浮现半透明工具栏，包含 3 个按钮：全屏、下载 SVG、下载 PNG
- 工具栏默认隐藏，hover 时 fade-in 动画显示
- absolute 定位，不占用文档流

### 2. 全屏显示

- 点击全屏按钮 → 提取当前 SVG → 创建全屏遮罩层（fixed，z-index 最高） → SVG 居中显示在深色半透明背景上
- 遮罩层右上角提供：关闭按钮、下载 SVG、下载 PNG
- 退出方式：关闭按钮 / 点击遮罩背景 / ESC 键
- 支持鼠标滚轮缩放和拖拽平移（CSS transform 实现）

### 3. 图片下载

**SVG 下载：**
- 从 DOM 提取 `<svg>` 元素，序列化为字符串
- 构造 `data:image/svg+xml` Blob 触发下载
- 自动填充 xmlns 属性

**PNG 下载：**
- SVG 绘制到 Canvas（2x devicePixelRatio 分辨率）
- `canvas.toBlob('image/png')` 触发下载
- 白色背景，避免透明底显示异常

**文件命名：**
- 从 mermaid 代码块第一行非空内容提取文件名
- 无有效内容时使用 `mermaid-diagram` 作为默认名
- 格式：`<名称>.svg` / `<名称>.png`

## 技术实现

### 改动范围

仅修改 `src/core/MarkdownRenderer.ts` 一个文件，后端零改动。

| 改动点 | 内容 |
|--------|------|
| mermaid 块包裹 | `generateFullHtml()` 中将 `<div class="mermaid">` 包裹为 `<div class="mermaid-wrapper">` |
| 新增 CSS | 工具栏样式、全屏遮罩样式、缩放/平移样式 |
| 新增客户端 JS | 悬停工具栏、全屏显示/关闭、SVG/PNG 下载、滚轮缩放/拖拽平移 |

### 关键设计决策

- 所有新逻辑作为内联 JS/CSS 嵌入 HTML 模板，与现有架构一致
- mermaid 代码块原文存储在 `data-mermaid-source` 属性中，用于提取文件名
- 全屏状态通过全局函数管理，避免多实例冲突
- 打印时全屏遮罩和工具栏通过 `@media print` 隐藏

### 不受影响的部分

- 后端代码（routes.ts、PreviewServer.ts、wsHandler.ts）
- mermaid 初始化逻辑
- 现有 PDF 导出、WebSocket 实时更新
