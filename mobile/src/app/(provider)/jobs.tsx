import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { BookingCard } from '@/components/cards';
import { Chip, EmptyState, ErrorView, Loading, Screen } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import type { Booking, Paginated } from '@/lib/types';
import { font, spacing } from '@/theme';

const FILTERS = [
  { key: 'pending', label: 'New requests', query: 'status=PENDING' },
  { key: 'active', label: 'Upcoming', query: 'scope=active' },
  { key: 'history', label: 'History', query: 'scope=history' },
] as const;

export default function Jobs() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>(FILTERS[0]);
  const jobs = useQuery({
    queryKey: ['bookings', 'provider', filter.key],
    queryFn: () => api<Paginated<Booking>>(`/bookings?${filter.query}&limit=50`),
  });

  return (
    <Screen refreshing={jobs.isRefetching} onRefresh={jobs.refetch}>
      <Text style={[font.h1, { marginBottom: spacing.lg }]}>Jobs</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, marginBottom: spacing.lg }}>
        {FILTERS.map((f) => (
          <Chip key={f.key} label={f.label} selected={filter.key === f.key} onPress={() => setFilter(f)} />
        ))}
      </ScrollView>

      {jobs.isLoading ? (
        <Loading />
      ) : jobs.error ? (
        <ErrorView message={errorMessage(jobs.error)} onRetry={jobs.refetch} />
      ) : !jobs.data?.data.length ? (
        <EmptyState icon="briefcase-outline" title="Nothing here" message={filter.key === 'pending' ? 'New booking requests will appear here instantly.' : 'No jobs in this list yet.'} />
      ) : (
        jobs.data.data.map((b) => <BookingCard key={b.id} booking={b} perspective="provider" />)
      )}
    </Screen>
  );
}
