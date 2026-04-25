import { WebSocketServer, WebSocket } from "ws";
import * as http from "http";

interface ClientInfo {
  ws: WebSocket;
  fileId?: string;
}

export class WsHandler {
  private wss: WebSocketServer | null = null;
  private clients = new Set<ClientInfo>();

  attach(server: http.Server): void {
    this.wss = new WebSocketServer({ server, path: "/ws" });
    this.wss.on("connection", (ws) => {
      const client: ClientInfo = { ws };
      this.clients.add(client);

      ws.on("close", () => {
        this.clients.delete(client);
      });
    });
  }

  broadcastRefresh(fileId: string): void {
    const message = JSON.stringify({ type: "refresh", fileId });
    this.sendToAll(message);
  }

  broadcastDeleted(fileId: string): void {
    const message = JSON.stringify({ type: "deleted", fileId });
    this.sendToAll(message);
  }

  broadcastServerStop(): void {
    const message = JSON.stringify({ type: "serverStopped" });
    this.sendToAll(message);
    this.closeAll();
  }

  private sendToAll(message: string): void {
    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }
  }

  private closeAll(): void {
    for (const client of this.clients) {
      client.ws.close();
    }
    this.clients.clear();
  }

  dispose(): void {
    this.closeAll();
    this.wss?.close();
    this.wss = null;
  }
}
