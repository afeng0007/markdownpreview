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

    // 先查找可用端口
    const port = await this.findAvailablePort(preferredPort);
    this.currentPort = port;

    const app = express();
    app.use("/", createRoutes(this.registry, this.renderer, port));

    this.server = http.createServer(app);
    this.wsHandler.attach(this.server);

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
    const maxAttempts = 100; // 最多尝试100个端口

    return new Promise((resolve, reject) => {
      const tryPort = (port: number, attempt: number) => {
        if (attempt > maxAttempts) {
          reject(new Error(`无可用端口（已尝试 ${maxAttempts} 次），请手动配置端口`));
          return;
        }

        const testServer = http.createServer();
        testServer.listen(port, () => {
          testServer.close(() => resolve(port));
        }).on("error", () => {
          tryPort(port + 1, attempt + 1);
        });
      };
      tryPort(startPort, 1);
    });
  }
}
