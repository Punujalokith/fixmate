import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { extractBearerToken } from '../common/guards/jwt-auth.guard.js';
import type { AuthUser, JwtPayload } from '../common/types/auth-user.js';
import { RealtimeService, userRoom } from './realtime.service.js';

export type AuthedSocket = Socket & { data: { user?: AuthUser } };

/**
 * Socket.IO entry point. The app connects with `io(url, { auth: { token: accessToken } })`.
 * Each user joins a private room "user:<id>", so the server can reach all their devices.
 */
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly realtime: RealtimeService,
  ) {}

  afterInit(server: Server) {
    this.realtime.attach(server);
  }

  async handleConnection(socket: AuthedSocket) {
    const token =
      (socket.handshake.auth?.['token'] as string | undefined) ??
      extractBearerToken(socket.handshake.headers.authorization);
    try {
      if (!token) throw new Error('missing token');
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      socket.data.user = { id: payload.sub, email: payload.email, role: payload.role };
      await socket.join(userRoom(payload.sub));
      socket.emit('ready', { userId: payload.sub });
    } catch {
      socket.emit('error', { message: 'Unauthorized socket connection' });
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: AuthedSocket) {
    if (socket.data.user) this.logger.debug(`Socket closed for user ${socket.data.user.id}`);
  }
}
