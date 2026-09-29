import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Button, Card, Chip, ErrorView, IconCircle, Input, Loading, Row, Screen, SectionHeader, type IconName } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { minuteToTime, priceLabel } from '@/lib/format';
import type { Address, Booking, BusinessDetail, Service, Slot } from '@/lib/types';
import { colors, font, radius, spacing } from '@/theme';

// Providers work in Sri Lanka time (UTC+5:30, no daylight saving).
const COLOMBO_OFFSET_MIN = 330;
const LEAD_MINUTES = 60;

/** The 14 upcoming days as they are in Colombo. */
function nextDays(count = 14) {
  const nowColombo = new Date(Date.now() + COLOMBO_OFFSET_MIN * 60_000);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(nowColombo.getUTCFullYear(), nowColombo.getUTCMonth(), nowColombo.getUTCDate() + i));
    return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), dayOfWeek: d.getUTCDay() };
  });
}

/** Exact moment for a Colombo date + minutes-from-midnight. */
const colomboMoment = (day: { y: number; m: number; d: number }, minute: number) =>
  new Date(Date.UTC(day.y, day.m, day.d) + (minute - COLOMBO_OFFSET_MIN) * 60_000);

/** Start times every 30 min where the whole job fits inside working hours. */
function slotsFor(day: ReturnType<typeof nextDays>[number], availability: Slot[], duration: number) {
  const windows = availability.length ? availability.filter((s) => s.dayOfWeek === day.dayOfWeek) : [{ startMinute: 8 * 60, endMinute: 18 * 60 }];
  const earliest = Date.now() + LEAD_MINUTES * 60_000;
  return windows.flatMap((w) => {
    const starts: number[] = [];
    for (let m = w.startMinute; m + duration <= w.endMinute; m += 30) {
      if (colomboMoment(day, m).getTime() >= earliest) starts.push(m);
    }
    return starts;
  });
}

export default function Book() {
  const { serviceId, note } = useLocalSearchParams<{ serviceId: string; note?: string }>();
  const queryClient = useQueryClient();

  const service = useQuery({ queryKey: ['service', serviceId], queryFn: () => api<Service>(`/services/${serviceId}`, { auth: false }) });
  const business = useQuery({
    queryKey: ['business', service.data?.businessId],
    queryFn: () => api<BusinessDetail>(`/businesses/${service.data!.businessId}`),
    enabled: !!service.data,
  });
  const addresses = useQuery({ queryKey: ['addresses'], queryFn: () => api<Address[]>('/me/addresses') });

  const days = useMemo(() => nextDays(), []);
  const [dayIndex, setDayIndex] = useState(0);
  const [minute, setMinute] = useState<number | null>(null);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [manual, setManual] = useState({ addressLine: '', city: '' });
  const [notes, setNotes] = useState(note ?? '');

  const duration = service.data?.durationMinutes ?? 60;
  const availability = business.data?.availability ?? [];
  const daySlots = useMemo(() => days.map((d) => slotsFor(d, availability, duration)), [days, availability, duration]);
  const chosenAddress = addressId ?? addresses.data?.find((a) => a.isDefault)?.id ?? null;

  const book = useMutation({
    mutationFn: () =>
      api<Booking>('/bookings', {
        method: 'POST',
        body: {
          serviceId,
          scheduledAt: colomboMoment(days[dayIndex], minute!).toISOString(),
          ...(chosenAddress ? { addressId: chosenAddress } : manual),
          notes: notes.trim() || undefined,
        },
      }),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      router.dismissAll();
      router.push(`/booking/${booking.id}`);
    },
  });

  if (service.isLoading || business.isLoading) return <Loading />;
  if (service.error || !service.data) return <ErrorView message={errorMessage(service.error)} />;
  const s = service.data;
  const canSubmit = minute !== null && (chosenAddress || (manual.addressLine.length >= 3 && manual.city.length >= 2));

  return (
    <Screen
      edges={[]}
      footer={
        <View>
          {book.error ? <Text style={{ color: colors.danger, marginBottom: spacing.sm }}>{errorMessage(book.error)}</Text> : null}
          <Button title={minute === null ? 'Choose a time' : `Confirm · ${priceLabel(s.price, s.priceType)}`} onPress={() => book.mutate()} loading={book.isPending} disabled={!canSubmit} />
          <Text style={[font.tiny, { textAlign: 'center', marginTop: spacing.sm }]}>Pay in cash after the job · Free cancellation before it's accepted</Text>
        </View>
      }
    >
      <Card>
        <Row gap={spacing.md}>
          <IconCircle name={(s.category.icon as IconName) ?? 'construct'} />
          <View style={{ flex: 1 }}>
            <Text style={[font.body, { fontWeight: '700' }]}>{s.title}</Text>
            <Text style={font.small}>{s.business?.name} · ~{s.durationMinutes} min</Text>
          </View>
          <Text style={{ fontWeight: '800', color: colors.primary }}>{priceLabel(s.price, s.priceType)}</Text>
        </Row>
      </Card>

      <SectionHeader title="Pick a day" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        {days.map((d, i) => {
          const selected = i === dayIndex;
          const open = daySlots[i].length > 0;
          const date = new Date(Date.UTC(d.y, d.m, d.d));
          return (
            <Pressable
              key={i}
              disabled={!open}
              onPress={() => {
                setDayIndex(i);
                setMinute(null);
              }}
              style={{
                width: 62,
                paddingVertical: spacing.md,
                borderRadius: radius.md,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? colors.primary : open ? colors.card : colors.bg,
                opacity: open ? 1 : 0.45,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: selected ? colors.white : colors.textMuted }}>
                {i === 0 ? 'Today' : date.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' })}
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: selected ? colors.white : colors.text }}>{d.d}</Text>
              <Text style={{ fontSize: 11, color: selected ? colors.white : colors.textMuted }}>{date.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <SectionHeader title="Pick a time" />
      {daySlots[dayIndex].length === 0 ? (
        <Text style={font.small}>No free times on this day. Try another day.</Text>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {daySlots[dayIndex].map((m) => (
            <Chip key={m} label={minuteToTime(m)} selected={minute === m} onPress={() => setMinute(m)} />
          ))}
        </View>
      )}

      <SectionHeader title="Where?" action={addresses.data?.length ? 'Manage' : undefined} onAction={() => router.push('/addresses')} />
      {addresses.data?.length ? (
        <View style={{ gap: spacing.sm }}>
          {addresses.data.map((a) => (
            <Pressable
              key={a.id}
              onPress={() => setAddressId(a.id)}
              style={{
                padding: spacing.md,
                borderRadius: radius.md,
                borderWidth: 2,
                borderColor: chosenAddress === a.id ? colors.primary : colors.border,
                backgroundColor: colors.card,
              }}
            >
              <Text style={{ fontWeight: '700', color: colors.text }}>{a.label}</Text>
              <Text style={font.small}>
                {[a.line1, a.line2, a.city].filter(Boolean).join(', ')}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <>
          <Input label="Address" value={manual.addressLine} onChangeText={(v) => setManual((m) => ({ ...m, addressLine: v }))} placeholder="House no, street" />
          <Input label="City" value={manual.city} onChangeText={(v) => setManual((m) => ({ ...m, city: v }))} placeholder="Colombo" />
        </>
      )}

      <SectionHeader title="Notes for the provider" />
      <Input value={notes} onChangeText={setNotes} placeholder="Describe the problem, gate code, parking…" multiline maxLength={1000} />
    </Screen>
  );
}
