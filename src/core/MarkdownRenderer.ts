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
        return `<div class="mermaid">${decodedCode}</div>`;
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
    .markdown-body hr { border: 0; border-top: 1px solid #d0d7de; height: 0; margin: 24px 0; }
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
  <script src="/assets/mermaid.js"></script>
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
