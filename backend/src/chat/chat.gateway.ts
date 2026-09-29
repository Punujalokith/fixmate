import { HttpException } from '@nestjs/common';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import type { AuthUser } from '../common/types/auth-user.js';
import type { AuthedSocket } from '../realtime/realtime.gateway.js';
import { ChatService } from './chat.service.js';

type Ack<T> = { ok: true; data: T } | { ok: false; error: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Socket.IO chat events (the socket is already authenticated by RealtimeGateway).
 *   client → server  "message:send" { bookingId, body }   → ack { ok, data | error }
 *   client → server  "message:read" { bookingId }
 *   client → server  "typing"       { bookingId, isTyping }
 */
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class ChatGateway {
  constructor(private readonly chat: ChatService) {}

  @SubscribeMessage('message:send')
  send(@ConnectedSocket() socket: AuthedSocket, @MessageBody() payload: { bookingId?: string; body?: string }) {
    return this.run(socket, payload?.bookingId, (user, bookingId) =>
      this.chat.send(user, bookingId, String(payload?.body ?? '')),
    );
  }

  @SubscribeMessage('message:read')
  read(@ConnectedSocket() socket: AuthedSocket, @MessageBody() payload: { bookingId?: string }) {
    return this.run(socket, payload?.bookingId, (user, bookingId) => this.chat.markRead(user, bookingId));
  }

  @SubscribeMessage('typing')
  typing(@ConnectedSocket() socket: AuthedSocket, @MessageBody() payload: { bookingId?: string; isTyping?: boolean }) {
    return this.run(socket, payload?.bookingId, (user, bookingId) =>
      this.chat.typing(user, bookingId, Boolean(payload?.isTyping)),
    );
  }

  /** Common checks + turns errors into an ack the app can show. */
  private async run<T>(
    socket: AuthedSocket,
    bookingId: unknown,
    action: (user: AuthUser, bookingId: string) => Promise<T>,
  ): Promise<Ack<T>> {
    const user = socket.data.user;
    if (!user) return { ok: false, error: 'Not authenticated' };
    if (typeof bookingId !== 'string' || !UUID.test(bookingId)) return { ok: false, error: 'Invalid bookingId' };
    try {
      return { ok: true, data: await action(user, bookingId) };
    } catch (error) {
      return { ok: false, error: error instanceof HttpException ? error.message : 'Something went wrong' };
    }
  }
}
