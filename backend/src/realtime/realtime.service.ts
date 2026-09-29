import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';

export const userRoom = (userId: string) => `user:${userId}`;

// Events the server pushes to phones / the admin site.
export const SERVER_EVENTS = {
  BOOKING_UPDATED: 'booking:updated',
  MESSAGE_NEW: 'message:new',
  MESSAGE_READ: 'message:read',
  TYPING: 'typing',
  NOTIFICATION_NEW: 'notification:new',
} as const;

/** Lets any service send a live event to a user without knowing about sockets. */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private server?: Server;

  attach(server: Server) {
    this.server = server;
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server?.to(userRoom(userId)).emit(event, payload);
  }

  emitToUsers(userIds: string[], event: string, payload: unknown) {
    const rooms = [...new Set(userIds)].map(userRoom);
    if (rooms.length) this.server?.to(rooms).emit(event, payload);
  }

  /** True if the user has the app open right now (at least one live socket). */
  async isOnline(userId: string): Promise<boolean> {
    if (!this.server) return false;
    try {
      const sockets = await this.server.in(userRoom(userId)).fetchSockets();
      return sockets.length > 0;
    } catch (error) {
      this.logger.warn(`isOnline check failed: ${(error as Error).message}`);
      return false;
    }
  }
}
