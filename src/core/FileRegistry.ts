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
