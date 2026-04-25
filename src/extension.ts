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
