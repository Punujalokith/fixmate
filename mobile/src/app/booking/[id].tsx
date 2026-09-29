import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { StatusBadge } from '@/components/cards';
import { Avatar, Button, Card, Divider, ErrorView, Input, Loading, Row, Screen, SectionHeader, StarPicker } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { dateTime, money, priceLabel, STATUS, timeAgo } from '@/lib/format';
import { confirm, notify, useBooking, useBookingAction } from '@/lib/queries';
import type { BookingAction } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { colors, font, radius, spacing } from '@/theme';

const ACTION_LABELS: Record<BookingAction, { title: string; icon: 'checkmark' | 'close' | 'play' | 'flag' | 'ban'; variant: 'primary' | 'secondary' | 'danger' }> = {
  accept: { title: 'Accept job', icon: 'checkmark', variant: 'primary' },
  start: { title: 'Start job', icon: 'play', variant: 'primary' },
  complete: { title: 'Mark as completed', icon: 'flag', variant: 'primary' },
  reject: { title: 'Decline', icon: 'close', variant: 'secondary' },
  cancel: { title: 'Cancel booking', icon: 'ban', variant: 'danger' },
};

export default function BookingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuth((s) => s.user);
  const queryClient = useQueryClient();
  const booking = useBooking(id);
  const act = useBookingAction(id);
  const [reasonFor, setReasonFor] = useState<'cancel' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reply, setReply] = useState('');

  const review = useMutation({
    mutationFn: () => api(`/bookings/${id}/review`, { method: 'POST', body: { rating, comment: comment.trim() || undefined } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      notify('Thank you!', 'Your review helps other customers.');
    },
    onError: (e) => notify('Could not send review', errorMessage(e)),
  });
  const sendReply = useMutation({
    mutationFn: () => api(`/bookings/${id}/review/reply`, { method: 'POST', body: { reply: reply.trim() } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['booking', id] }),
    onError: (e) => notify('Could not send reply', errorMessage(e)),
  });

  if (booking.isLoading) return <Loading />;
  if (booking.error || !booking.data) return <ErrorView message={errorMessage(booking.error)} onRetry={booking.refetch} />;
  const b = booking.data;
  const isProvider = user?.id === b.business.ownerId;
  const other = isProvider
    ? { name: b.customer.fullName, avatar: b.customer.avatarUrl, phone: b.customer.phone, subtitle: 'Customer' }
    : { name: b.business.name, avatar: b.business.logoUrl, phone: b.business.phone, subtitle: 'Service provider' };
  const chatOpen = ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(b.status);

  const runAction = (action: BookingAction) => {
    if (action === 'cancel' || action === 'reject') return setReasonFor(action);
    const messages: Partial<Record<BookingAction, string>> = {
      accept: 'The customer will be notified right away.',
      start: 'Let the customer know you have started.',
      complete: 'Confirm the job is finished and cash is collected.',
    };
    confirm(ACTION_LABELS[action].title + '?', messages[action] ?? '', () => act.mutate({ action }), 'Yes');
  };

  return (
    <Screen refreshing={booking.isRefetching} onRefresh={booking.refetch} edges={[]}>
      <Card style={{ backgroundColor: STATUS[b.status].bg }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <StatusBadge status={b.status} />
          <Text style={font.tiny}>{b.code}</Text>
        </Row>
        <Text style={[font.h2, { marginTop: spacing.sm }]}>{b.serviceTitle}</Text>
        <Row gap={6} style={{ marginTop: spacing.xs }}>
          <Ionicons name="calendar" size={15} color={colors.textMuted} />
          <Text style={font.body}>{dateTime(b.scheduledAt)}</Text>
        </Row>
        {b.cancelReason ? <Text style={[font.small, { marginTop: spacing.sm }]}>Reason: {b.cancelReason}</Text> : null}
      </Card>

      {/* Who you're dealing with */}
      <Card style={{ marginTop: spacing.md }}>
        <Row gap={spacing.md}>
          <Avatar name={other.name} url={other.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={[font.body, { fontWeight: '700' }]}>{other.name}</Text>
            <Text style={font.small}>{other.subtitle}</Text>
          </View>
          {other.phone && ['ACCEPTED', 'IN_PROGRESS'].includes(b.status) ? (
            <Button title="Call" icon="call" variant="secondary" small onPress={() => Linking.openURL(`tel:${other.phone}`)} />
          ) : null}
        </Row>
        {chatOpen ? <Button title="Message" icon="chatbubble-ellipses" small style={{ marginTop: spacing.md }} onPress={() => router.push(`/chat/${b.id}`)} /> : null}
      </Card>

      {/* Actions allowed for this user right now */}
      {b.actions.length ? (
        <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
          {reasonFor ? (
            <Card>
              <Text style={[font.body, { fontWeight: '700', marginBottom: spacing.sm }]}>{reasonFor === 'cancel' ? 'Why are you cancelling?' : 'Why are you declining?'}</Text>
              <Input value={reason} onChangeText={setReason} placeholder="A short reason helps the other person" multiline />
              <Row>
                <Button title="Back" variant="secondary" small style={{ flex: 1 }} onPress={() => setReasonFor(null)} />
                <Button
                  title="Confirm"
                  variant="danger"
                  small
                  style={{ flex: 1 }}
                  disabled={reason.trim().length < 3}
                  loading={act.isPending}
                  onPress={() => act.mutate({ action: reasonFor, reason: reason.trim() }, { onSuccess: () => setReasonFor(null) })}
                />
              </Row>
            </Card>
          ) : (
            b.actions.map((action) => (
              <Button key={action} {...ACTION_LABELS[action]} loading={act.isPending && act.variables?.action === action} onPress={() => runAction(action)} />
            ))
          )}
        </View>
      ) : null}

      {/* Review */}
      {b.canReview ? (
        <Card style={{ marginTop: spacing.lg }}>
          <Text style={[font.h3, { textAlign: 'center' }]}>How was {b.business.name}?</Text>
          <StarPicker value={rating} onChange={setRating} />
          <Input value={comment} onChangeText={setComment} placeholder="Tell others about your experience (optional)" multiline maxLength={1000} />
          <Button title="Submit review" disabled={!rating} loading={review.isPending} onPress={() => review.mutate()} />
        </Card>
      ) : null}
      {b.review ? (
        <Card style={{ marginTop: spacing.lg }}>
          <Text style={font.tiny}>{isProvider ? 'CUSTOMER REVIEW' : 'YOUR REVIEW'}</Text>
          <Row gap={2} style={{ marginTop: spacing.xs }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Ionicons key={n} name={n <= b.review!.rating ? 'star' : 'star-outline'} size={18} color={colors.accent} />
            ))}
          </Row>
          {b.review.comment ? <Text style={[font.body, { marginTop: spacing.sm }]}>{b.review.comment}</Text> : null}
          {b.review.providerReply ? (
            <View style={{ marginTop: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.bg }}>
              <Text style={font.tiny}>PROVIDER REPLY</Text>
              <Text style={font.small}>{b.review.providerReply}</Text>
            </View>
          ) : isProvider ? (
            <View style={{ marginTop: spacing.md }}>
              <Input value={reply} onChangeText={setReply} placeholder="Thank the customer or respond…" multiline />
              <Button title="Reply" small disabled={!reply.trim()} loading={sendReply.isPending} onPress={() => sendReply.mutate()} />
            </View>
          ) : null}
        </Card>
      ) : null}

      <SectionHeader title="Details" />
      <Card>
        <DetailRow icon="location-outline" label="Address" value={`${b.addressLine}, ${b.city}`} />
        <Divider />
        <DetailRow icon="pricetag-outline" label="Price" value={priceLabel(b.price, b.priceType)} />
        <Divider />
        <DetailRow
          icon="cash-outline"
          label="Payment"
          value={b.payment ? `${b.payment.method === 'CASH' ? 'Cash' : 'Card'} · ${b.payment.status === 'PAID' ? `Paid ${money(b.payment.amount)}` : 'Pay after the job'}` : '—'}
        />
        {b.notes ? (
          <>
            <Divider />
            <DetailRow icon="document-text-outline" label="Notes" value={b.notes} />
          </>
        ) : null}
      </Card>

      {b.statusHistory?.length ? (
        <>
          <SectionHeader title="Timeline" />
          <Card>
            {b.statusHistory.map((h, i) => (
              <Row key={h.id} style={{ alignItems: 'flex-start' }} gap={spacing.md}>
                <View style={{ alignItems: 'center' }}>
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: STATUS[h.toStatus].color, marginTop: 4 }} />
                  {i < b.statusHistory!.length - 1 ? <View style={{ width: 2, height: 34, backgroundColor: colors.border }} /> : null}
                </View>
                <View style={{ flex: 1, paddingBottom: spacing.sm }}>
                  <Text style={{ fontWeight: '700', color: colors.text }}>{STATUS[h.toStatus].label}</Text>
                  <Text style={font.tiny}>
                    {timeAgo(h.createdAt)}
                    {h.changedBy ? ` · ${h.changedBy.fullName}` : h.toStatus === 'EXPIRED' ? ' · automatic' : ''}
                  </Text>
                </View>
              </Row>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function DetailRow({ icon, label, value }: { icon: 'location-outline' | 'pricetag-outline' | 'cash-outline' | 'document-text-outline'; label: string; value: string }) {
  return (
    <Row style={{ alignItems: 'flex-start' }} gap={spacing.md}>
      <Ionicons name={icon} size={18} color={colors.textMuted} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={font.tiny}>{label.toUpperCase()}</Text>
        <Text style={font.body}>{value}</Text>
      </View>
    </Row>
  );
}
