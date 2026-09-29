import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { VerifiedTick } from '@/components/cards';
import { Avatar, Card, EmptyState, Loading, Row, Screen, Stars } from '@/components/ui';
import { api } from '@/lib/api';
import type { BusinessCard } from '@/lib/types';
import { font, spacing } from '@/theme';

export default function Favourites() {
  const favourites = useQuery({ queryKey: ['favourites'], queryFn: () => api<BusinessCard[]>('/me/favourites') });
  if (favourites.isLoading) return <Loading />;

  return (
    <Screen edges={[]} refreshing={favourites.isRefetching} onRefresh={favourites.refetch}>
      {!favourites.data?.length ? (
        <EmptyState icon="heart-outline" title="No favourites yet" message="Tap the heart on a provider's profile to save them here." action="Browse providers" onAction={() => router.push('/search')} />
      ) : (
        favourites.data.map((b) => (
          <Card key={b.id} onPress={() => router.push(`/business/${b.id}`)} style={{ marginBottom: spacing.md }}>
            <Row gap={spacing.md}>
              <Avatar name={b.name} url={b.logoUrl} size={48} />
              <View style={{ flex: 1 }}>
                <Row gap={4}>
                  <Text style={[font.body, { fontWeight: '700' }]}>{b.name}</Text>
                  {b.isVerified ? <VerifiedTick /> : null}
                </Row>
                <Text style={font.small}>{b.city}</Text>
              </View>
              <Stars rating={b.ratingAvg} count={b.ratingCount} />
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}
