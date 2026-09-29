import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { BookingCard, BusinessCardView, CategoryTile } from '@/components/cards';
import { Row, Screen, SectionHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { useBookings, useCategories, useUnreadCount } from '@/lib/queries';
import type { BusinessCard, Paginated } from '@/lib/types';
import { useAuth } from '@/store/auth';
import { colors, font, radius, shadow, spacing } from '@/theme';

export default function Home() {
  const user = useAuth((s) => s.user);
  const categories = useCategories();
  const unread = useUnreadCount();
  const active = useBookings('active');
  const top = useQuery({
    queryKey: ['businesses', 'top'],
    queryFn: () => api<Paginated<BusinessCard>>('/businesses?sort=rating&limit=8', { auth: false }),
  });

  const refreshing = categories.isRefetching || top.isRefetching || active.isRefetching;
  const refresh = () => {
    categories.refetch();
    top.refetch();
    active.refetch();
  };
  const next = active.data?.data[0];
  const firstName = user?.fullName.split(' ')[0] ?? 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View>
          <Text style={font.small}>{greeting},</Text>
          <Text style={font.h2}>{firstName} 👋</Text>
        </View>
        <Pressable onPress={() => router.push('/inbox')} style={styles.bell} accessibilityLabel="Notifications">
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
          {unread.data?.unread ? <View style={styles.dot} /> : null}
        </Pressable>
      </Row>

      <Pressable onPress={() => router.push('/search')} style={styles.search}>
        <Ionicons name="search" size={18} color={colors.textFaint} />
        <Text style={{ color: colors.textFaint, fontSize: 15 }}>Search plumbers, AC repair, cleaning…</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/assistant')} style={({ pressed }) => [styles.ai, pressed && { opacity: 0.9 }]}>
        <View style={styles.aiBlob} />
        <Row gap={spacing.md}>
          <View style={styles.aiIcon}>
            <Ionicons name="sparkles" size={22} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.white, fontWeight: '800', fontSize: 17 }}>Not sure who to call?</Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>Describe the problem and our AI finds the right service.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.white} />
        </Row>
      </Pressable>

      {next ? (
        <>
          <SectionHeader title="Your next booking" action="See all" onAction={() => router.push('/bookings')} />
          <BookingCard booking={next} perspective="customer" />
        </>
      ) : null}

      <SectionHeader title="Categories" action="See all" onAction={() => router.push('/search')} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {categories.data?.map((c) => (
          <CategoryTile key={c.id} category={c} onPress={() => router.push({ pathname: '/search', params: { category: c.slug } })} />
        ))}
      </View>

      <SectionHeader title="Top rated providers" />
      <FlatList
        horizontal
        data={top.data?.data ?? []}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => <BusinessCardView business={item} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.sm, paddingRight: spacing.lg }}
        style={{ marginHorizontal: -spacing.lg, paddingLeft: spacing.lg }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', ...shadow },
  dot: { position: 'absolute', top: 10, right: 12, width: 9, height: 9, borderRadius: 5, backgroundColor: colors.danger, borderWidth: 2, borderColor: colors.card },
  search: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ai: { marginTop: spacing.lg, backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg, overflow: 'hidden' },
  aiBlob: { position: 'absolute', right: -40, top: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: colors.primaryDark },
  aiIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
});
