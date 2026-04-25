# Mermaid 全屏显示与图片下载 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Markdown 预览中的 mermaid 渲染图表添加悬停工具栏、全屏查看（含缩放平移）和 SVG/PNG 下载功能。

**Architecture:** 纯客户端方案，只修改 `MarkdownRenderer.ts`，将 mermaid 块包裹为 wrapper 容器，通过内联 CSS/JS 实现悬停工具栏、全屏遮罩和图片导出。

**Tech Stack:** TypeScript, 内联 HTML/CSS/JS, Canvas API, Blob API

---

### Task 1: 包裹 mermaid 块为 wrapper 容器

**Files:**
- Modify: `src/core/MarkdownRenderer.ts:35-43`

- [ ] **Step 1: 修改 processMermaidBlocks 方法**

将 mermaid div 包裹为 wrapper 容器，添加 `data-mermaid-source` 属性存储原始代码（用于提取文件名）。

修改 `src/core/MarkdownRenderer.ts` 中 `processMermaidBlocks` 方法的 return 语句：

```typescript
private processMermaidBlocks(html: string): string {
  return html.replace(
    /<pre><code class="hljs language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
    (_match, code) => {
      const decodedCode = this.decodeHtmlEntities(code);
      const escapedAttr = decodedCode.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      return `<div class="mermaid-wrapper" data-mermaid-source="${escapedAttr}"><div class="mermaid">${decodedCode}</div></div>`;
    }
  );
}
```

- [ ] **Step 2: 编译验证**

Run: `cd d:/projstxx/markdownpreview && npm run compile 2>&1 || npm run build 2>&1`

确认编译通过，无类型错误。

- [ ] **Step 3: Commit**

```bash
git add src/core/MarkdownRenderer.ts
git commit -m "feat(mermaid): wrap mermaid blocks in wrapper container with source data"
```

---

### Task 2: 添加悬停工具栏 CSS

**Files:**
- Modify: `src/core/MarkdownRenderer.ts` (wrapInTemplate 方法中的 `<style>` 块)

- [ ] **Step 1: 在现有 `.markdown-body img` 规则之后（第 85 行后）添加工具栏和 wrapper 样式**

在 `wrapInTemplate` 的 `<style>` 块中，`.markdown-body img { max-width: 100%; box-sizing: content-box; }` 这行之后插入：

```css
    .mermaid-wrapper { position: relative; margin-bottom: 16px; }
    .mermaid-wrapper .mermaid { overflow: auto; }
    .mermaid-toolbar {
      display: none; position: absolute; top: 8px; right: 8px; z-index: 10;
      background: rgba(27,31,36,0.85); border-radius: 6px; padding: 4px 6px;
      gap: 4px; align-items: center;
    }
    .mermaid-wrapper:hover .mermaid-toolbar { display: flex; }
    .mermaid-toolbar button {
      background: transparent; color: #e6edf3; border: 1px solid rgba(240,246,252,0.15);
      padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; line-height: 1;
    }
    .mermaid-toolbar button:hover { background: rgba(240,246,252,0.12); }
```

- [ ] **Step 2: 在 `@media print` 块中添加隐藏规则**

在 `@media print {` 块内的 `.markdown-body pre { border: 1px solid #ddd; }` 之后追加：

```css
      .mermaid-toolbar, .mermaid-fullscreen-overlay { display: none !important; }
```

- [ ] **Step 3: 编译验证**

Run: `cd d:/projstxx/markdownpreview && npm run compile 2>&1 || npm run build 2>&1`

- [ ] **Step 4: Commit**

```bash
git add src/core/MarkdownRenderer.ts
git commit -m "feat(mermaid): add hover toolbar CSS styles"
```

---

### Task 3: 添加全屏遮罩 CSS

**Files:**
- Modify: `src/core/MarkdownRenderer.ts` (wrapInTemplate 方法中的 `<style>` 块)

- [ ] **Step 1: 在 `.mermaid-toolbar button:hover` 规则之后添加全屏遮罩样式**

```css
    .mermaid-fullscreen-overlay {
      display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      z-index: 10000; background: rgba(0,0,0,0.85);
      justify-content: center; align-items: center; flex-direction: column;
    }
    .mermaid-fullscreen-overlay.active { display: flex; }
    .mermaid-fullscreen-content {
      position: relative; cursor: grab; max-width: 90vw; max-height: 85vh;
      overflow: hidden;
    }
    .mermaid-fullscreen-content:active { cursor: grabbing; }
    .mermaid-fullscreen-content svg { max-width: none; max-height: none; }
    .mermaid-fullscreen-toolbar {
      position: fixed; top: 16px; right: 16px; z-index: 10001;
      display: flex; gap: 8px; align-items: center;
    }
    .mermaid-fullscreen-toolbar button {
      background: rgba(27,31,36,0.9); color: #e6edf3; border: 1px solid rgba(240,246,252,0.2);
      padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 13px;
    }
    .mermaid-fullscreen-toolbar button:hover { background: rgba(240,246,252,0.15); }
    .mermaid-fullscreen-zoom-hint {
      position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);
      color: rgba(230,237,243,0.5); font-size: 12px; z-index: 10001;
    }
```

- [ ] **Step 2: 编译验证**

Run: `cd d:/projstxx/markdownpreview && npm run compile 2>&1 || npm run build 2>&1`

- [ ] **Step 3: Commit**

```bash
git add src/core/MarkdownRenderer.ts
git commit -m "feat(mermaid): add fullscreen overlay CSS styles"
```

---

### Task 4: 添加悬停工具栏 HTML 生成

**Files:**
- Modify: `src/core/MarkdownRenderer.ts:35-43`

- [ ] **Step 1: 更新 processMermaidBlocks 在 wrapper 中注入工具栏按钮**

修改 `processMermaidBlocks` 方法的 return 语句，在 wrapper 中添加工具栏 HTML：

```typescript
private processMermaidBlocks(html: string): string {
  return html.replace(
    /<pre><code class="hljs language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
    (_match, code) => {
      const decodedCode = this.decodeHtmlEntities(code);
      const escapedAttr = decodedCode.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      return `<div class="mermaid-wrapper" data-mermaid-source="${escapedAttr}">` +
        `<div class="mermaid-toolbar">` +
        `<button class="mermaid-btn-fullscreen" title="全屏查看">\u{1F5B1}</button>` +
        `<button class="mermaid-btn-download-svg" title="下载 SVG">SVG</button>` +
        `<button class="mermaid-btn-download-png" title="下载 PNG">PNG</button>` +
        `</div>` +
        `<div class="mermaid">${decodedCode}</div></div>`;
    }
  );
}
```

注意：全屏按钮使用 Unicode 字符 ⊕ (U+1F5B1) 作为图标，简洁无需外部图标库。

- [ ] **Step 2: 编译验证**

Run: `cd d:/projstxx/markdownpreview && npm run compile 2>&1 || npm run build 2>&1`

- [ ] **Step 3: Commit**

```bash
git add src/core/MarkdownRenderer.ts
git commit -m "feat(mermaid): add toolbar buttons HTML to mermaid wrapper"
```

---

### Task 5: 添加客户端 JS — 工具栏交互与全屏显示

**Files:**
- Modify: `src/core/MarkdownRenderer.ts` (wrapInTemplate 方法，在 mermaid initialize script 之后添加新的 script 块)

- [ ] **Step 1: 在 `mermaid.initialize({...});` script 块之后、WebSocket script 块之前，插入 mermaid 交互脚本**

在 wrapInTemplate 方法中，`<script>` mermaid init 块的闭合 `</script>` 标签之后，WebSocket `<script>` 之前，插入以下完整的 script 块：

```html
  <script>
  (function() {
    function getFileName(source) {
      var firstLine = source.trim().split('\\n')[0].trim();
      if (firstLine && firstLine.length > 0 && firstLine.length < 80) {
        return firstLine.replace(/[^a-zA-Z0-9一-鿿._-]/g, '_');
      }
      return 'mermaid-diagram';
    }

    function extractSvg(wrapper) {
      var svg = wrapper.querySelector('.mermaid svg');
      if (!svg) return null;
      var clone = svg.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      var width = svg.getAttribute('width') || svg.getBoundingClientRect().width;
      var height = svg.getAttribute('height') || svg.getBoundingClientRect().height;
      clone.setAttribute('width', width);
      clone.setAttribute('height', height);
      return clone;
    }

    function downloadSvg(wrapper) {
      var source = wrapper.getAttribute('data-mermaid-source') || '';
      var fileName = getFileName(source);
      var clone = extractSvg(wrapper);
      if (!clone) return;
      var svgStr = new XMLSerializer().serializeToString(clone);
      var blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      triggerDownload(URL.createObjectURL(blob), fileName + '.svg');
    }

    function downloadPng(wrapper) {
      var source = wrapper.getAttribute('data-mermaid-source') || '';
      var fileName = getFileName(source);
      var clone = extractSvg(wrapper);
      if (!clone) return;
      var svgStr = new XMLSerializer().serializeToString(clone);
      var scale = (window.devicePixelRatio || 1) * 2;
      var svgRect = wrapper.querySelector('.mermaid svg').getBoundingClientRect();
      var canvas = document.createElement('canvas');
      canvas.width = svgRect.width * scale;
      canvas.height = svgRect.height * scale;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      var img = new Image();
      var svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      var url = URL.createObjectURL(svgBlob);
      img.onload = function() {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob(function(blob) {
          triggerDownload(URL.createObjectURL(blob), fileName + '.png');
        }, 'image/png');
      };
      img.src = url;
    }

    function triggerDownload(url, filename) {
      var a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    function openFullscreen(wrapper) {
      var clone = extractSvg(wrapper);
      if (!clone) return;
      var overlay = document.createElement('div');
      overlay.className = 'mermaid-fullscreen-overlay active';
      var content = document.createElement('div');
      content.className = 'mermaid-fullscreen-content';
      content.appendChild(clone);
      var toolbar = document.createElement('div');
      toolbar.className = 'mermaid-fullscreen-toolbar';
      toolbar.innerHTML =
        '<button class="fs-close" title="关闭 (ESC)">&#10005;</button>' +
        '<button class="fs-download-svg" title="下载 SVG">SVG</button>' +
        '<button class="fs-download-png" title="下载 PNG">PNG</button>';
      var hint = document.createElement('div');
      hint.className = 'mermaid-fullscreen-zoom-hint';
      hint.textContent = '滚轮缩放 · 拖拽平移 · ESC 退出';
      overlay.appendChild(content);
      overlay.appendChild(toolbar);
      overlay.appendChild(hint);
      document.body.appendChild(overlay);

      var scale = 1, tx = 0, ty = 0, dragging = false, startX, startY;
      function updateTransform() {
        content.style.transform = 'scale(' + scale + ') translate(' + tx + 'px,' + ty + 'px)';
      }

      content.addEventListener('wheel', function(e) {
        e.preventDefault();
        var delta = e.deltaY > 0 ? 0.9 : 1.1;
        scale = Math.min(Math.max(0.1, scale * delta), 10);
        updateTransform();
      }, { passive: false });

      content.addEventListener('mousedown', function(e) {
        dragging = true; startX = e.clientX - tx; startY = e.clientY - ty;
      });
      document.addEventListener('mousemove', function onMove(e) {
        if (!dragging) return;
        tx = e.clientX - startX; ty = e.clientY - startY;
        updateTransform();
      });
      document.addEventListener('mouseup', function onUp() {
        dragging = false;
      });

      toolbar.querySelector('.fs-close').addEventListener('click', function() {
        document.body.removeChild(overlay);
      });
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) document.body.removeChild(overlay);
      });
      function onEsc(e) {
        if (e.key === 'Escape' && document.body.contains(overlay)) {
          document.body.removeChild(overlay);
          document.removeEventListener('keydown', onEsc);
        }
      }
      document.addEventListener('keydown', onEsc);

      toolbar.querySelector('.fs-download-svg').addEventListener('click', function() {
        downloadSvg(wrapper);
      });
      toolbar.querySelector('.fs-download-png').addEventListener('click', function() {
        downloadPng(wrapper);
      });
    }

    function setupMermaidInteractions() {
      document.querySelectorAll('.mermaid-wrapper').forEach(function(wrapper) {
        var btnFs = wrapper.querySelector('.mermaid-btn-fullscreen');
        var btnSvg = wrapper.querySelector('.mermaid-btn-download-svg');
        var btnPng = wrapper.querySelector('.mermaid-btn-download-png');
        if (btnFs) btnFs.addEventListener('click', function() { openFullscreen(wrapper); });
        if (btnSvg) btnSvg.addEventListener('click', function() { downloadSvg(wrapper); });
        if (btnPng) btnPng.addEventListener('click', function() { downloadPng(wrapper); });
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        setTimeout(setupMermaidInteractions, 500);
      });
    } else {
      setTimeout(setupMermaidInteractions, 500);
    }
  })();
  </script>
```

- [ ] **Step 2: 编译验证**

Run: `cd d:/projstxx/markdownpreview && npm run compile 2>&1 || npm run build 2>&1`

- [ ] **Step 3: Commit**

```bash
git add src/core/MarkdownRenderer.ts
git commit -m "feat(mermaid): add fullscreen, zoom/pan, and SVG/PNG download client logic"
```

---

### Task 6: 集成测试与验证

**Files:**
- Test: `test-samples/` 目录下的测试文件

- [ ] **Step 1: 创建包含 mermaid 图表的测试文件**

创建 `test-samples/mermaid-test.md`：

```markdown
# Mermaid 测试

## 流程图

\`\`\`mermaid
graph TD
    A[开始] --> B{判断}
    B -->|是| C[执行]
    B -->|否| D[结束]
    C --> D
\`\`\`

## 时序图

\`\`\`mermaid
sequenceDiagram
    participant A as 客户端
    participant B as 服务器
    A->>B: 发送请求
    B-->>A: 返回响应
\`\`\`
```

- [ ] **Step 2: 编译并启动扩展测试**

Run: `cd d:/projstxx/markdownpreview && npm run compile 2>&1 || npm run build 2>&1`

在 VSCode 中按 F5 启动扩展开发宿主，打开测试文件，触发预览，验证：

1. mermaid 图表渲染正常
2. 悬停时右上角出现工具栏（3 个按钮）
3. 点击全屏按钮 → 遮罩层出现，SVG 居中显示
4. 全屏中滚轮缩放、拖拽平移正常
5. ESC / 关闭按钮 / 点击背景均可退出全屏
6. 下载 SVG → 文件可正常打开
7. 下载 PNG → 图片清晰（2x 分辨率），白色背景
8. 文件名取自代码块第一行
9. 打印预览中不显示工具栏和遮罩

- [ ] **Step 3: 运行已有单元测试**

Run: `cd d:/projstxx/markdownpreview && npm test 2>&1`

确认所有现有测试通过，无回归。

- [ ] **Step 4: Commit 测试文件**

```bash
git add test-samples/mermaid-test.md
git commit -m "test: add mermaid fullscreen/download test sample"
```
