import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { tokens } from './api';
import { SERVER_URL } from './config';
import type { Message } from './types';

let socket: Socket | null = null;

/** One shared live connection per logged-in user. */
export function getSocket(): Socket | null {
  if (!tokens.access) return null;
  if (!socket) {
    socket = io(SERVER_URL, {
      transports: ['websocket'],
      // Called on every (re)connect, so a refreshed access token is always used.
      auth: (cb) => cb({ token: tokens.access }),
      reconnectionDelayMax: 10_000,
    });
  }
  return socket;
}

export function closeSocket() {
  socket?.disconnect();
  socket = null;
}

/**
 * Listens for live events and refreshes the matching screens' data.
 * Mount once, inside the logged-in part of the app.
 */
export function useLiveUpdates(enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    const s = getSocket();
    if (!s) return;

    const onBooking = (payload: { id: string }) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', payload.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    };
    const onNotification = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
    const onMessage = (message: Message) => {
      queryClient.setQueryData<Message[]>(['messages', message.bookingId], (old) =>
        old && !old.some((m) => m.id === message.id) ? [message, ...old] : old,
      );
      queryClient.invalidateQueries({ queryKey: ['unread-chats'] });
    };
    const onRead = (payload: { bookingId: string }) => queryClient.invalidateQueries({ queryKey: ['messages', payload.bookingId] });

    s.on('booking:updated', onBooking);
    s.on('notification:new', onNotification);
    s.on('message:new', onMessage);
    s.on('message:read', onRead);
    return () => {
      s.off('booking:updated', onBooking);
      s.off('notification:new', onNotification);
      s.off('message:new', onMessage);
      s.off('message:read', onRead);
    };
  }, [enabled, queryClient]);
}
