import { Injectable, Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ namespace: '/ws', cors: true })
@Injectable()
export class WsGateway {
  private readonly logger = new Logger(WsGateway.name);

  @WebSocketServer()
  server: Server;

  emitInsideCount(eventId: string, delta: number, insideCount: number) {
    // [CONTRACT-LOCK:INSIDE_WS] NO MODIFICAR SIN MIGRACIÓN
    if (!this.server) {
      this.logger.debug('WebSocket server not ready, skipping broadcast');
      return;
    }
    this.server.emit('inside_incr', { eventId, delta, insideCount });
  }
}
