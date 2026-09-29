import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { dateTime, money, priceLabel, STATUS } from '@/lib/format';
import type { Booking, BookingStatus, BusinessCard as BusinessCardData, Category, Service } from '@/lib/types';
import { colors, font, radius, spacing } from '@/theme';
import { Avatar, Badge, Card, IconCircle, Row, Stars, type IconName } from './ui';

export function StatusBadge({ status }: { status: BookingStatus }) {
  const s = STATUS[status];
  return <Badge label={s.label} color={s.color} bg={s.bg} />;
}

export function VerifiedTick() {
  return <Ionicons name="checkmark-circle" size={16} color={colors.info} accessibilityLabel="Verified" />;
}

export function CategoryTile({ category, onPress }: { category: Category; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ width: '25%', alignItems: 'center', marginBottom: spacing.lg }, pressed && { opacity: 0.7 }]}>
      <IconCircle name={(category.icon as IconName) ?? 'construct'} size={56} />
      <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text, marginTop: 6, textAlign: 'center' }} numberOfLines={2}>
        {category.name}
      </Text>
    </Pressable>
  );
}

export function ServiceCard({ service, onPress }: { service: Service; onPress?: () => void }) {
  const b = service.business;
  return (
    <Card onPress={onPress ?? (() => router.push(`/business/${service.businessId}`))} style={{ marginBottom: spacing.md }}>
      <Row style={{ alignItems: 'flex-start' }} gap={spacing.md}>
        <IconCircle name={(service.category.icon as IconName) ?? 'construct'} />
        <View style={{ flex: 1 }}>
          <Text style={[font.body, { fontWeight: '700' }]} numberOfLines={2}>
            {service.title}
          </Text>
          {b ? (
            <Row gap={4} style={{ marginTop: 2 }}>
              <Text style={font.small} numberOfLines={1}>
                {b.name} · {b.city}
              </Text>
              {b.isVerified ? <VerifiedTick /> : null}
            </Row>
          ) : null}
          <Row style={{ justifyContent: 'space-between', marginTop: spacing.sm }}>
            {b ? <Stars rating={b.ratingAvg} count={b.ratingCount} size={13} /> : <Text style={font.small}>{service.durationMinutes} min</Text>}
            <Text style={{ fontWeight: '800', color: colors.primary }}>{priceLabel(service.price, service.priceType)}</Text>
          </Row>
        </View>
      </Row>
    </Card>
  );
}

export function BusinessCardView({ business }: { business: BusinessCardData }) {
  return (
    <Card onPress={() => router.push(`/business/${business.id}`)} style={{ width: 220, marginRight: spacing.md, padding: 0, overflow: 'hidden' }}>
      <View style={{ height: 72, backgroundColor: colors.primary, justifyContent: 'flex-end', padding: spacing.md }}>
        <View style={{ position: 'absolute', right: -20, top: -30, width: 110, height: 110, borderRadius: 55, backgroundColor: colors.primaryDark }} />
      </View>
      <View style={{ padding: spacing.md, paddingTop: 0 }}>
        <View style={{ marginTop: -24, borderWidth: 3, borderColor: colors.card, borderRadius: 30, alignSelf: 'flex-start' }}>
          <Avatar name={business.name} url={business.logoUrl} size={48} />
        </View>
        <Row gap={4} style={{ marginTop: spacing.sm }}>
          <Text style={[font.body, { fontWeight: '700', flexShrink: 1 }]} numberOfLines={1}>
            {business.name}
          </Text>
          {business.isVerified ? <VerifiedTick /> : null}
        </Row>
        <Text style={font.small}>
          {business.categories?.[0]?.name ?? 'Services'} · {business.city}
        </Text>
        <Row style={{ justifyContent: 'space-between', marginTop: spacing.sm }}>
          <Stars rating={business.ratingAvg} count={business.ratingCount} size={13} />
          {business.startingPrice ? <Text style={[font.small, { fontWeight: '700', color: colors.text }]}>from {money(business.startingPrice)}</Text> : null}
        </Row>
      </View>
    </Card>
  );
}

export function BookingCard({ booking, perspective }: { booking: Booking; perspective: 'customer' | 'provider' }) {
  const counterpart = perspective === 'customer' ? booking.business.name : booking.customer.fullName;
  return (
    <Card onPress={() => router.push(`/booking/${booking.id}`)} style={{ marginBottom: spacing.md }}>
      <Row style={{ justifyContent: 'space-between', marginBottom: spacing.sm }}>
        <StatusBadge status={booking.status} />
        <Text style={font.tiny}>{booking.code}</Text>
      </Row>
      <Text style={[font.body, { fontWeight: '700' }]}>{booking.serviceTitle}</Text>
      <Text style={font.small}>{counterpart}</Text>
      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={6}>
          <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
          <Text style={font.small}>{dateTime(booking.scheduledAt)}</Text>
        </Row>
        <Text style={{ fontWeight: '800', color: colors.text }}>{priceLabel(booking.price, booking.priceType)}</Text>
      </Row>
      {perspective === 'provider' && booking.status === 'PENDING' ? (
        <View style={{ marginTop: spacing.md, backgroundColor: colors.warningSoft, borderRadius: radius.sm, padding: spacing.sm }}>
          <Text style={{ color: colors.warning, fontWeight: '600', fontSize: 13 }}>New request — respond before it expires</Text>
        </View>
      ) : null}
    </Card>
  );
}
