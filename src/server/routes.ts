import { Router, Request, Response } from "express";
import { FileRegistry } from "../core/FileRegistry";
import { MarkdownRenderer } from "../core/MarkdownRenderer";
import * as fs from "fs";
import * as path from "path";

function findNodeModules(): string {
  // dist/extension.js → node_modules is at ../node_modules
  // src/server/routes.ts → node_modules is at ../../node_modules
  const candidates = [
    path.resolve(__dirname, "..", "node_modules"),
    path.resolve(__dirname, "..", "..", "node_modules"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "mermaid"))) {
      return dir;
    }
  }
  return candidates[0];
}

const NODE_MODULES = findNodeModules();

export function createRoutes(registry: FileRegistry, renderer: MarkdownRenderer, port: number): Router {
  const router = Router();

  // Serve local static assets (no CDN dependency)
  router.get("/assets/mermaid.js", (_req: Request, res: Response) => {
    const filePath = path.join(NODE_MODULES, "mermaid", "dist", "mermaid.min.js");
    res.setHeader("Content-Type", "application/javascript");
    fs.createReadStream(filePath).pipe(res);
  });
  router.get("/assets/highlight.css", (_req: Request, res: Response) => {
    const filePath = path.join(NODE_MODULES, "highlight.js", "styles", "github.css");
    res.setHeader("Content-Type", "text/css");
    fs.createReadStream(filePath).pipe(res);
  });
  router.get("/assets/github-markdown.css", (_req: Request, res: Response) => {
    const filePath = path.join(NODE_MODULES, "github-markdown-css", "github-markdown.css");
    res.setHeader("Content-Type", "text/css");
    fs.createReadStream(filePath).pipe(res);
  });

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
  <title>Markdown HTML Preview - 文件列表</title>
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
  <h1>Markdown HTML Preview</h1>
  ${files.length > 0 ? `<ul>${fileList}</ul>` : '<p class="empty">暂无预览文件。在 VSCode 中打开 Markdown 文件并执行 "Markdown HTML Preview: Open in Browser" 命令。</p>'}
</body>
</html>`;
}
