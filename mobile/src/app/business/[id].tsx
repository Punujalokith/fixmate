import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { VerifiedTick } from '@/components/cards';
import { Avatar, Badge, Button, Card, ErrorView, IconCircle, Loading, Row, Screen, SectionHeader, Stars, type IconName } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { DAYS, minuteToTime, priceLabel, timeAgo } from '@/lib/format';
import type { BusinessDetail, Paginated, Review } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { colors, font, radius, spacing } from '@/theme';

export default function BusinessProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const user = useAuth((s) => s.user);
  const isCustomer = user?.role === 'CUSTOMER';

  const business = useQuery({ queryKey: ['business', id], queryFn: () => api<BusinessDetail>(`/businesses/${id}`) });
  const reviews = useQuery({
    queryKey: ['business', id, 'reviews'],
    queryFn: () => api<Paginated<Review> & { stars: Record<string, number> }>(`/businesses/${id}/reviews?limit=5`, { auth: false }),
  });

  const favourite = useMutation({
    mutationFn: (add: boolean) => api(`/me/favourites/${id}`, { method: add ? 'POST' : 'DELETE' }),
    onMutate: (add) => queryClient.setQueryData<BusinessDetail>(['business', id], (b) => (b ? { ...b, isFavourite: add } : b)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['favourites'] }),
  });

  if (business.isLoading) return <Loading />;
  if (business.error || !business.data) return <ErrorView message={errorMessage(business.error)} onRetry={business.refetch} />;
  const b = business.data;

  // Group working hours by day for display.
  const hours = DAYS.map((day, dayOfWeek) => ({
    day,
    slots: b.availability.filter((s) => s.dayOfWeek === dayOfWeek).map((s) => `${minuteToTime(s.startMinute)} – ${minuteToTime(s.endMinute)}`),
  }));
  const today = new Date().getDay();

  return (
    <Screen padded={false} edges={[]}>
      <View style={styles.cover}>
        <View style={styles.coverBlob} />
      </View>
      <View style={{ paddingHorizontal: spacing.lg, marginTop: -44 }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={styles.logo}>
            <Avatar name={b.name} url={b.logoUrl} size={80} />
          </View>
          {isCustomer ? (
            <Pressable onPress={() => favourite.mutate(!b.isFavourite)} style={styles.heart} accessibilityLabel="Favourite">
              <Ionicons name={b.isFavourite ? 'heart' : 'heart-outline'} size={22} color={b.isFavourite ? colors.danger : colors.text} />
            </Pressable>
          ) : null}
        </Row>

        <Row gap={6} style={{ marginTop: spacing.md }}>
          <Text style={[font.h2, { flexShrink: 1 }]}>{b.name}</Text>
          {b.isVerified ? <VerifiedTick /> : null}
        </Row>
        <Row gap={spacing.md} style={{ marginTop: 4 }}>
          <Stars rating={b.ratingAvg} count={b.ratingCount} />
          <Text style={font.small}>· {b.completedJobs} jobs done</Text>
          <Text style={font.small}>· {b.city}</Text>
        </Row>
        {b.isVerified ? <View style={{ marginTop: spacing.sm }}><Badge label="Verified by FixMate" icon="shield-checkmark" color={colors.info} bg={colors.infoSoft} /></View> : null}
        {b.description ? <Text style={[font.body, { marginTop: spacing.md, color: colors.textMuted }]}>{b.description}</Text> : null}

        <SectionHeader title="Services" />
        {b.services.map((s) => (
          <Card key={s.id} style={{ marginBottom: spacing.md }}>
            <Row style={{ alignItems: 'flex-start' }} gap={spacing.md}>
              <IconCircle name={(s.category.icon as IconName) ?? 'construct'} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={[font.body, { fontWeight: '700' }]}>{s.title}</Text>
                {s.description ? <Text style={font.small}>{s.description}</Text> : null}
                <Row style={{ justifyContent: 'space-between', marginTop: spacing.sm }}>
                  <Text style={{ fontWeight: '800', color: colors.primary }}>{priceLabel(s.price, s.priceType)}</Text>
                  <Text style={font.small}>~{s.durationMinutes} min</Text>
                </Row>
                {s.priceType === 'INSPECTION' ? <Text style={[font.tiny, { marginTop: 4 }]}>Final price agreed after inspection</Text> : null}
              </View>
            </Row>
            {isCustomer ? (
              <Button title="Book" small icon="calendar" style={{ marginTop: spacing.md }} onPress={() => router.push({ pathname: '/book/[serviceId]', params: { serviceId: s.id } })} />
            ) : null}
          </Card>
        ))}

        <SectionHeader title="Working hours" />
        <Card>
          {b.availability.length === 0 ? (
            <Text style={font.small}>Flexible — contact the provider.</Text>
          ) : (
            hours.map((h, i) => (
              <Row key={h.day} style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
                <Text style={[font.body, i === today && { fontWeight: '800', color: colors.primary }]}>{h.day}</Text>
                <Text style={[font.small, !h.slots.length && { color: colors.textFaint }]}>{h.slots.join(', ') || 'Closed'}</Text>
              </Row>
            ))
          )}
        </Card>

        <SectionHeader title={`Reviews (${b.ratingCount})`} />
        {reviews.data && b.ratingCount > 0 ? (
          <Card style={{ marginBottom: spacing.md }}>
            <Row gap={spacing.xl}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 40, fontWeight: '800', color: colors.text }}>{b.ratingAvg.toFixed(1)}</Text>
                <Stars rating={b.ratingAvg} size={12} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = reviews.data.stars[star] ?? 0;
                  return (
                    <Row key={star} gap={6}>
                      <Text style={[font.tiny, { width: 10 }]}>{star}</Text>
                      <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.border }}>
                        <View style={{ width: `${(count / b.ratingCount) * 100}%`, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
                      </View>
                    </Row>
                  );
                })}
              </View>
            </Row>
          </Card>
        ) : null}
        {reviews.data?.data.length ? (
          reviews.data.data.map((r) => (
            <Card key={r.id} style={{ marginBottom: spacing.md }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row>
                  <Avatar name={r.customer.fullName} url={r.customer.avatarUrl} size={32} />
                  <View>
                    <Text style={{ fontWeight: '700', color: colors.text }}>{r.customer.fullName}</Text>
                    <Text style={font.tiny}>{timeAgo(r.createdAt)}</Text>
                  </View>
                </Row>
                <Row gap={2}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Ionicons key={n} name={n <= r.rating ? 'star' : 'star-outline'} size={13} color={colors.accent} />
                  ))}
                </Row>
              </Row>
              {r.comment ? <Text style={[font.body, { marginTop: spacing.sm }]}>{r.comment}</Text> : null}
              {r.providerReply ? (
                <View style={{ marginTop: spacing.sm, padding: spacing.md, backgroundColor: colors.bg, borderRadius: radius.md }}>
                  <Text style={font.tiny}>REPLY FROM {b.name.toUpperCase()}</Text>
                  <Text style={[font.small, { color: colors.text, marginTop: 2 }]}>{r.providerReply}</Text>
                </View>
              ) : null}
            </Card>
          ))
        ) : (
          <Text style={font.small}>No reviews yet.</Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cover: { height: 170, backgroundColor: colors.primary, overflow: 'hidden' },
  coverBlob: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: colors.primaryDark, right: -60, top: -80 },
  logo: { borderWidth: 4, borderColor: colors.bg, borderRadius: 48 },
  heart: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
});
