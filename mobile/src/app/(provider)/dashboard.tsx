import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { VerifiedTick } from '@/components/cards';
import { Avatar, Badge, Button, Card, EmptyState, ErrorView, IconCircle, Loading, Row, Screen, SectionHeader, Stars, type IconName } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { dateTime, money } from '@/lib/format';
import { useDashboard, useMyBusiness } from '@/lib/provider';
import { useAuth } from '@/store/auth';
import { colors, font, radius, spacing } from '@/theme';

export default function Dashboard() {
  const user = useAuth((s) => s.user);
  const business = useMyBusiness();
  const dashboard = useDashboard(!!business.data);

  if (business.isLoading) return <Loading />;
  if (business.error) return <ErrorView message={errorMessage(business.error)} onRetry={business.refetch} />;

  if (!business.data) {
    return (
      <Screen>
        <Text style={font.h1}>Welcome, {user?.fullName.split(' ')[0]}</Text>
        <EmptyState
          icon="storefront-outline"
          title="Set up your business"
          message="Add your business details, services and working hours so customers can find and book you."
          action="Create business profile"
          onAction={() => router.push('/provider/business-form')}
        />
      </Screen>
    );
  }

  const d = dashboard.data;
  const maxMonth = Math.max(1, ...(d?.earnings.monthly.map((m) => m.total) ?? [1]));
  const pending = d?.bookings.PENDING ?? 0;

  return (
    <Screen refreshing={dashboard.isRefetching} onRefresh={() => { business.refetch(); dashboard.refetch(); }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={font.small}>Your business</Text>
          <Row gap={6}>
            <Text style={[font.h2, { flexShrink: 1 }]} numberOfLines={1}>{business.data.name}</Text>
            {business.data.isVerified ? <VerifiedTick /> : null}
          </Row>
        </View>
        <Avatar name={business.data.name} url={business.data.logoUrl} size={48} />
      </Row>
      {!business.data.isVerified ? (
        <View style={{ marginTop: spacing.sm }}>
          <Badge label="Verification pending" icon="time-outline" color={colors.warning} bg={colors.warningSoft} />
        </View>
      ) : null}

      {pending ? (
        <Pressable onPress={() => router.push('/jobs')} style={styles.alert}>
          <Ionicons name="notifications" size={20} color={colors.warning} />
          <Text style={{ flex: 1, color: colors.warning, fontWeight: '700' }}>
            {pending} new request{pending > 1 ? 's' : ''} waiting for you
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.warning} />
        </Pressable>
      ) : null}

      <View style={styles.earnings}>
        <View style={styles.earningsBlob} />
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>Earned this month</Text>
        <Text style={{ color: colors.white, fontSize: 34, fontWeight: '800', marginTop: 4 }}>{money(d?.earnings.thisMonth ?? 0)}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>All time: {money(d?.earnings.allTime ?? 0)}</Text>

        <View style={styles.chart}>
          {d?.earnings.monthly.map((m) => (
            <View key={m.month} style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ height: 70, justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}>
                <View style={{ width: 18, height: Math.max(4, (m.total / maxMonth) * 70), borderRadius: 6, backgroundColor: m.total ? colors.accent : 'rgba(255,255,255,0.25)' }} />
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 4 }}>
                {new Date(`${m.month}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'short' })}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Row style={{ marginTop: spacing.lg }} gap={spacing.md}>
        <StatTile icon="hourglass-outline" label="Pending" value={d?.bookings.PENDING ?? 0} />
        <StatTile icon="calendar-outline" label="Upcoming" value={(d?.bookings.ACCEPTED ?? 0) + (d?.bookings.IN_PROGRESS ?? 0)} />
        <StatTile icon="checkmark-done-outline" label="Done" value={d?.bookings.COMPLETED ?? 0} />
      </Row>
      <Card style={{ marginTop: spacing.md }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={font.body}>Your rating</Text>
          <Stars rating={business.data.ratingAvg} count={business.data.ratingCount} size={16} />
        </Row>
      </Card>

      <SectionHeader title="Coming up" action="All jobs" onAction={() => router.push('/jobs')} />
      {d?.upcoming.length ? (
        d.upcoming.map((b) => (
          <Card key={b.id} onPress={() => router.push(`/booking/${b.id}`)} style={{ marginBottom: spacing.sm }}>
            <Row gap={spacing.md}>
              <Avatar name={b.customer.fullName} url={b.customer.avatarUrl} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={[font.body, { fontWeight: '700' }]} numberOfLines={1}>{b.serviceTitle}</Text>
                <Text style={font.small}>{b.customer.fullName} · {dateTime(b.scheduledAt)}</Text>
              </View>
              {b.status === 'PENDING' ? <Badge label="New" color={colors.warning} bg={colors.warningSoft} /> : null}
            </Row>
          </Card>
        ))
      ) : (
        <Text style={font.small}>No upcoming jobs. New requests will appear here.</Text>
      )}

      <SectionHeader title="Quick actions" />
      <Row gap={spacing.md}>
        <Button title="Add service" icon="add" variant="secondary" small style={{ flex: 1 }} onPress={() => router.push('/provider/service-form')} />
        <Button title="Working hours" icon="time-outline" variant="secondary" small style={{ flex: 1 }} onPress={() => router.push('/provider/hours')} />
      </Row>
    </Screen>
  );
}

function StatTile({ icon, label, value }: { icon: IconName; label: string; value: number }) {
  return (
    <Card style={{ flex: 1, alignItems: 'center', padding: spacing.md }}>
      <IconCircle name={icon} size={36} />
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, marginTop: spacing.sm }}>{value}</Text>
      <Text style={font.small}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  alert: { marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.warningSoft, padding: spacing.md, borderRadius: radius.md },
  earnings: { marginTop: spacing.lg, backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg, overflow: 'hidden' },
  earningsBlob: { position: 'absolute', right: -50, top: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: colors.primaryDark },
  chart: { flexDirection: 'row', marginTop: spacing.lg },
});
