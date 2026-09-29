import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Badge, Button, Card, EmptyState, IconCircle, Loading, Row, Screen, type IconName } from '@/components/ui';
import { priceLabel } from '@/lib/format';
import { useMyBusiness } from '@/lib/provider';
import { colors, font, spacing } from '@/theme';

export default function Services() {
  const business = useMyBusiness();
  if (business.isLoading) return <Loading />;

  return (
    <Screen refreshing={business.isRefetching} onRefresh={business.refetch}>
      <Row style={{ justifyContent: 'space-between', marginBottom: spacing.lg }}>
        <Text style={font.h1}>Services</Text>
        {business.data ? <Button title="Add" icon="add" small onPress={() => router.push('/provider/service-form')} /> : null}
      </Row>

      {!business.data ? (
        <EmptyState icon="storefront-outline" title="Create your business first" action="Set up business" onAction={() => router.push('/provider/business-form')} />
      ) : !business.data.services.length ? (
        <EmptyState icon="construct-outline" title="No services yet" message="Add what you offer and set your prices." action="Add a service" onAction={() => router.push('/provider/service-form')} />
      ) : (
        business.data.services.map((s) => (
          <Card
            key={s.id}
            onPress={() => router.push({ pathname: '/provider/service-form', params: { id: s.id } })}
            style={{ marginBottom: spacing.md, opacity: s.isActive ? 1 : 0.6 }}
          >
            <Row gap={spacing.md} style={{ alignItems: 'flex-start' }}>
              <IconCircle name={(s.category.icon as IconName) ?? 'construct'} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={[font.body, { fontWeight: '700' }]}>{s.title}</Text>
                <Text style={font.small}>{s.category.name} · ~{s.durationMinutes} min</Text>
                <Row style={{ justifyContent: 'space-between', marginTop: spacing.sm }}>
                  <Text style={{ fontWeight: '800', color: colors.primary }}>{priceLabel(s.price, s.priceType)}</Text>
                  {s.isActive ? <Badge label="Live" color={colors.success} bg={colors.successSoft} /> : <Badge label="Hidden" color={colors.textMuted} bg={colors.border} />}
                </Row>
              </View>
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}
