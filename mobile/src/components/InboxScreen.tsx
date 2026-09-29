import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { api, errorMessage } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { useNotifications } from '@/lib/queries';
import type { AppNotification } from '@/lib/types';
import { colors, font, radius, spacing } from '@/theme';
import { Button, EmptyState, ErrorView, IconCircle, Loading, Row, Screen, type IconName } from './ui';

const ICONS: Record<string, { icon: IconName; color: string; bg: string }> = {
  BOOKING_CREATED: { icon: 'add-circle', color: colors.info, bg: colors.infoSoft },
  BOOKING_ACCEPTED: { icon: 'checkmark-circle', color: colors.success, bg: colors.successSoft },
  BOOKING_REJECTED: { icon: 'close-circle', color: colors.danger, bg: colors.dangerSoft },
  BOOKING_STARTED: { icon: 'hammer', color: colors.primary, bg: colors.primarySoft },
  BOOKING_COMPLETED: { icon: 'trophy', color: colors.success, bg: colors.successSoft },
  BOOKING_CANCELLED: { icon: 'ban', color: colors.textMuted, bg: colors.border },
  BOOKING_EXPIRED: { icon: 'time', color: colors.warning, bg: colors.warningSoft },
  BOOKING_REMINDER: { icon: 'alarm', color: colors.warning, bg: colors.warningSoft },
  NEW_REVIEW: { icon: 'star', color: colors.accent, bg: colors.accentSoft },
  SYSTEM: { icon: 'megaphone', color: colors.primary, bg: colors.primarySoft },
};

/** Notification list — shared by the customer and provider tabs. */
export function InboxScreen() {
  const queryClient = useQueryClient();
  const notifications = useNotifications();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });

  const readAll = useMutation({ mutationFn: () => api('/notifications/read-all', { method: 'POST' }), onSuccess: refresh });
  const open = async (n: AppNotification) => {
    if (!n.readAt) api(`/notifications/${n.id}/read`, { method: 'POST' }).then(refresh).catch(() => undefined);
    if (n.data?.bookingId) router.push(`/booking/${n.data.bookingId}`);
  };

  return (
    <Screen refreshing={notifications.isRefetching} onRefresh={notifications.refetch}>
      <Row style={{ justifyContent: 'space-between', marginBottom: spacing.lg }}>
        <Text style={font.h1}>Inbox</Text>
        {notifications.data?.unread ? <Button title="Mark all read" variant="ghost" small onPress={() => readAll.mutate()} /> : null}
      </Row>

      {notifications.isLoading ? (
        <Loading />
      ) : notifications.error ? (
        <ErrorView message={errorMessage(notifications.error)} onRetry={notifications.refetch} />
      ) : !notifications.data?.data.length ? (
        <EmptyState icon="notifications-outline" title="You're all caught up" message="Booking updates and messages will appear here." />
      ) : (
        notifications.data.data.map((n) => {
          const style = ICONS[n.type] ?? ICONS.SYSTEM;
          return (
            <Pressable
              key={n.id}
              onPress={() => open(n)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                gap: spacing.md,
                padding: spacing.md,
                borderRadius: radius.md,
                marginBottom: spacing.sm,
                backgroundColor: n.readAt ? 'transparent' : colors.card,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <IconCircle name={style.icon} color={style.color} bg={style.bg} size={40} />
              <View style={{ flex: 1 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={[font.body, { fontWeight: n.readAt ? '500' : '800', flex: 1 }]} numberOfLines={1}>
                    {n.title}
                  </Text>
                  <Text style={font.tiny}>{timeAgo(n.createdAt)}</Text>
                </Row>
                <Text style={font.small} numberOfLines={2}>
                  {n.body}
                </Text>
              </View>
              {!n.readAt ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 }} /> : null}
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}
