import { describe, it, expect, afterEach } from "vitest";
import { PreviewServer } from "../server/PreviewServer";
import { FileRegistry } from "../core/FileRegistry";
import { MarkdownRenderer } from "../core/MarkdownRenderer";

describe("PreviewServer", () => {
  let server: PreviewServer;

  afterEach(async () => {
    if (server && server.isRunning) {
      await server.stop();
    }
  });

  it("should start on specified port", async () => {
    const registry = new FileRegistry();
    const renderer = new MarkdownRenderer();
    server = new PreviewServer(registry, renderer);
    const port = await server.start(9090);
    expect(port).toBe(9090);
    expect(server.isRunning).toBe(true);
  });

  it("should find next available port if occupied", async () => {
    const registry = new FileRegistry();
    const renderer = new MarkdownRenderer();
    const server1 = new PreviewServer(registry, renderer);
    const port1 = await server1.start(9091);

    const server2 = new PreviewServer(registry, renderer);
    const port2 = await server2.start(9091);
    expect(port2).toBe(9092);

    await server1.stop();
    await server2.stop();
  });

  it("should stop gracefully", async () => {
    const registry = new FileRegistry();
    const renderer = new MarkdownRenderer();
    server = new PreviewServer(registry, renderer);
    await server.start(9093);
    await server.stop();
    expect(server.isRunning).toBe(false);
  });
});
