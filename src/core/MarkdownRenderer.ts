import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";

export class MarkdownRenderer {
  private marked: Marked;

  constructor() {
    this.marked = new Marked(
      markedHighlight({
        langPrefix: "hljs language-",
        highlight(code: string, lang: string) {
          if (lang === "mermaid") {
            return code;
          }
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
        const escapedAttr = decodedCode
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
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
  <title>${fileName} - Markdown HTML Preview</title>
  <link rel="stylesheet" href="/assets/highlight.css">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #f6f8fa; color: #24292e; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.6; }
    .markdown-body { color: #24292e; }
    .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6 { color: #1f2328; margin-top: 24px; margin-bottom: 16px; font-weight: 600; line-height: 1.25; }
    .markdown-body h1 { font-size: 2em; padding-bottom: 0.3em; border-bottom: 1px solid #d0d7de; }
    .markdown-body h2 { font-size: 1.5em; padding-bottom: 0.3em; border-bottom: 1px solid #d0d7de; }
    .markdown-body h3 { font-size: 1.25em; }
    .markdown-body p { margin-top: 0; margin-bottom: 16px; }
    .markdown-body ul, .markdown-body ol { margin-top: 0; margin-bottom: 16px; padding-left: 2em; }
    .markdown-body li { margin-top: 4px; }
    .markdown-body a { color: #0969da; text-decoration: none; }
    .markdown-body a:hover { text-decoration: underline; }
    .markdown-body strong { font-weight: 600; }
    .markdown-body blockquote { padding: 0 1em; color: #656d76; border-left: 0.25em solid #d0d7de; margin-bottom: 16px; }
    .markdown-body pre { background: #f6f8fa; border-radius: 6px; padding: 16px; overflow: auto; margin-bottom: 16px; font-size: 85%; line-height: 1.45; }
    .markdown-body code { background: #eff1f3; border-radius: 6px; padding: 0.2em 0.4em; font-size: 85%; }
    .markdown-body pre code { background: transparent; padding: 0; font-size: 100%; }
    .markdown-body table { border-collapse: collapse; width: 100%; margin-bottom: 16px; border-top: 1px solid #e1e4e8; }
    .markdown-body th, .markdown-body td { padding: 8px 13px; border: none; }
    .markdown-body th { font-weight: 600; background: #f6f8fa; color: #57606a; text-align: left; border-bottom: 2px solid #e1e4e8; }
    .markdown-body td { border-bottom: 1px solid #eff2f5; color: #24292e; }
    .markdown-body tr { background: transparent; }
    .markdown-body img { max-width: 100%; box-sizing: content-box; }
    .mermaid-wrapper { position: relative; margin-bottom: 16px; }
    .mermaid-wrapper .mermaid { overflow: auto; }
    .mermaid-toolbar {
      opacity: 0; position: absolute; top: 8px; right: 8px; z-index: 10;
      background: rgba(27,31,36,0.85); border-radius: 6px; padding: 4px 6px;
      gap: 4px; align-items: center; transition: opacity 0.2s ease;
      pointer-events: none;
    }
    .mermaid-wrapper:hover .mermaid-toolbar { opacity: 1; pointer-events: auto; }
    .mermaid-toolbar button {
      background: transparent; color: #e6edf3; border: 1px solid rgba(240,246,252,0.15);
      padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; line-height: 1;
    }
    .mermaid-toolbar button:hover { background: rgba(240,246,252,0.12); }
    .mermaid-fullscreen-overlay {
      display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      z-index: 10000; background: rgba(0,0,0,0.85);
      justify-content: center; align-items: center; flex-direction: column;
    }
    .mermaid-fullscreen-overlay.active { display: flex; }
    .mermaid-fullscreen-content {
      position: relative; cursor: grab; max-width: 90vw; max-height: 85vh;
      overflow: hidden; background: #fff; border-radius: 8px; padding: 24px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.4);
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
    .markdown-body hr { border: 0; border-top: 1px solid #d0d7de; height: 0; margin: 24px 0; }
    @media print {
      .toolbar, .disconnected-banner { display: none !important; }
      body { background: #fff; }
      .content { margin: 0; padding: 0; max-width: 100%; }
      .markdown-body { box-shadow: none; padding: 0; border-radius: 0; }
      .markdown-body pre { border: 1px solid #ddd; }
      .mermaid-toolbar, .mermaid-fullscreen-overlay,
      .mermaid-fullscreen-toolbar, .mermaid-fullscreen-zoom-hint { display: none !important; }
    }
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
    <button onclick="window.print()">导出PDF</button>
  </div>
  <div class="disconnected-banner" id="disconnectedBanner">连接已断开，正在尝试重连...</div>
  <div class="content">
    <div class="markdown-body">${bodyHtml}</div>
  </div>
  <script src="/assets/mermaid.js"></script>
  <script>
    mermaid.initialize({ startOnLoad: true, theme: 'default' });
  </script>
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
      var svgEl = wrapper.querySelector('.mermaid svg');
      if (!svgEl) return;
      var svgRect = svgEl.getBoundingClientRect();
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
      var mouseMoveHandler = function(e) {
        if (!dragging) return;
        tx = e.clientX - startX; ty = e.clientY - startY;
        updateTransform();
      };
      var mouseUpHandler = function() { dragging = false; };
      document.addEventListener('mousemove', mouseMoveHandler);
      document.addEventListener('mouseup', mouseUpHandler);

      function closeOverlay() {
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
        document.removeEventListener('keydown', onEsc);
        if (document.body.contains(overlay)) document.body.removeChild(overlay);
      }

      toolbar.querySelector('.fs-close').addEventListener('click', closeOverlay);
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeOverlay();
      });
      function onEsc(e) {
        if (e.key === 'Escape' && document.body.contains(overlay)) closeOverlay();
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
