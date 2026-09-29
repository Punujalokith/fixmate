import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { BookingCard } from '@/components/cards';
import { Chip, EmptyState, ErrorView, Loading, Row, Screen } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useBookings } from '@/lib/queries';
import { font, spacing } from '@/theme';

export default function Bookings() {
  const [scope, setScope] = useState<'active' | 'history'>('active');
  const bookings = useBookings(scope);

  return (
    <Screen refreshing={bookings.isRefetching} onRefresh={bookings.refetch}>
      <Text style={[font.h1, { marginBottom: spacing.lg }]}>My bookings</Text>
      <Row style={{ marginBottom: spacing.lg }}>
        <Chip label="Active" selected={scope === 'active'} onPress={() => setScope('active')} />
        <Chip label="History" selected={scope === 'history'} onPress={() => setScope('history')} />
      </Row>

      {bookings.isLoading ? (
        <Loading />
      ) : bookings.error ? (
        <ErrorView message={errorMessage(bookings.error)} onRetry={bookings.refetch} />
      ) : !bookings.data?.data.length ? (
        <EmptyState
          icon="calendar-outline"
          title={scope === 'active' ? 'No active bookings' : 'No past bookings yet'}
          message="Find a trusted professional in a few taps."
          action="Find a service"
          onAction={() => router.push('/search')}
        />
      ) : (
        bookings.data.data.map((b) => <BookingCard key={b.id} booking={b} perspective="customer" />)
      )}
    </Screen>
  );
}
