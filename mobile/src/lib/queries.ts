import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Platform } from 'react-native';
import { api, errorMessage } from './api';
import type { AppNotification, Booking, BookingAction, Category, Paginated } from './types';

// Small, shared data hooks. TanStack Query caches results and refetches when needed.

export const useCategories = () => useQuery({ queryKey: ['categories'], queryFn: () => api<Category[]>('/categories', { auth: false }), staleTime: 10 * 60_000 });

export const useUnreadCount = () =>
  useQuery({ queryKey: ['notifications', 'unread'], queryFn: () => api<{ unread: number }>('/notifications/unread-count'), refetchInterval: 60_000 });

export const useNotifications = () =>
  useQuery({ queryKey: ['notifications', 'list'], queryFn: () => api<Paginated<AppNotification> & { unread: number }>('/notifications?limit=50') });

export const useBookings = (scope: 'active' | 'history') =>
  useQuery({ queryKey: ['bookings', scope], queryFn: () => api<Paginated<Booking>>(`/bookings?scope=${scope}&limit=50`) });

export const useBooking = (id: string) => useQuery({ queryKey: ['booking', id], queryFn: () => api<Booking>(`/bookings/${id}`) });

export function useBookingAction(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ action, reason }: { action: BookingAction; reason?: string }) =>
      api<Booking>(`/bookings/${id}/${action}`, { method: 'POST', body: reason ? { reason } : {} }),
    onSuccess: (booking) => {
      queryClient.setQueryData(['booking', id], booking);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => notify('Could not update booking', errorMessage(error)),
  });
}

/** Alert that also works on web. */
export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') globalThis.alert?.(message ? `${title}\n\n${message}` : title);
  else Alert.alert(title, message);
}

/** Yes/No confirmation that also works on web. */
export function confirm(title: string, message: string, onYes: () => void, yesLabel = 'Yes') {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: 'No', style: 'cancel' },
    { text: yesLabel, style: 'destructive', onPress: onYes },
  ]);
}
