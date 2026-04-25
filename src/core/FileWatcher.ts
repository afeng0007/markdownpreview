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
