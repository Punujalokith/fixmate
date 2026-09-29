import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { Button, Card, Loading, Row, Screen } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { DAYS, minuteToTime } from '@/lib/format';
import { useMyBusiness } from '@/lib/provider';
import { notify } from '@/lib/queries';
import { colors, font, radius, spacing } from '@/theme';

type Day = { open: boolean; start: number; end: number };
const DEFAULT: Day = { open: false, start: 8 * 60, end: 18 * 60 };
const STEP = 30;

function Stepper({ value, onChange, min, max }: { value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <Row gap={4} style={{ backgroundColor: colors.bg, borderRadius: radius.sm, padding: 2 }}>
      <Pressable onPress={() => onChange(Math.max(min, value - STEP))} hitSlop={6} style={{ padding: 6 }} accessibilityLabel="Earlier">
        <Ionicons name="remove" size={16} color={colors.text} />
      </Pressable>
      <Text style={{ minWidth: 70, textAlign: 'center', fontWeight: '700', color: colors.text }}>{minuteToTime(value)}</Text>
      <Pressable onPress={() => onChange(Math.min(max, value + STEP))} hitSlop={6} style={{ padding: 6 }} accessibilityLabel="Later">
        <Ionicons name="add" size={16} color={colors.text} />
      </Pressable>
    </Row>
  );
}

export default function Hours() {
  const queryClient = useQueryClient();
  const business = useMyBusiness();
  const [days, setDays] = useState<Day[]>(() => DAYS.map(() => ({ ...DEFAULT })));

  useEffect(() => {
    if (!business.data) return;
    const slots = business.data.availability;
    setDays(
      DAYS.map((_, dayOfWeek) => {
        const s = slots.find((x) => x.dayOfWeek === dayOfWeek);
        return s ? { open: true, start: s.startMinute, end: s.endMinute } : { ...DEFAULT, open: slots.length === 0 && dayOfWeek >= 1 && dayOfWeek <= 6 };
      }),
    );
  }, [business.data]);

  const update = (i: number, patch: Partial<Day>) => setDays((d) => d.map((day, idx) => (idx === i ? { ...day, ...patch } : day)));

  const save = useMutation({
    mutationFn: () =>
      api('/provider/business/availability', {
        method: 'PUT',
        body: { slots: days.flatMap((d, dayOfWeek) => (d.open ? [{ dayOfWeek, startMinute: d.start, endMinute: d.end }] : [])) },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-business'] });
      if (!business.data?.services.length) router.replace('/provider/service-form');
      else router.back();
    },
    onError: (e) => notify('Could not save hours', errorMessage(e)),
  });

  if (business.isLoading) return <Loading />;

  return (
    <Screen edges={[]} footer={<Button title="Save working hours" onPress={() => save.mutate()} loading={save.isPending} />}>
      <Text style={[font.small, { marginBottom: spacing.lg }]}>Customers can only book times when you're open. Times are Sri Lanka time.</Text>
      {days.map((d, i) => (
        <Card key={DAYS[i]} style={{ marginBottom: spacing.sm, paddingVertical: spacing.md }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={[font.body, { fontWeight: '700', width: 50 }]}>{DAYS[i]}</Text>
            {d.open ? (
              <View style={{ flex: 1, alignItems: 'flex-end', gap: 6 }}>
                <Stepper value={d.start} min={0} max={d.end - STEP} onChange={(start) => update(i, { start })} />
                <Stepper value={d.end} min={d.start + STEP} max={24 * 60} onChange={(end) => update(i, { end })} />
              </View>
            ) : (
              <Text style={[font.small, { flex: 1, textAlign: 'right', marginRight: spacing.md }]}>Closed</Text>
            )}
            <Switch value={d.open} onValueChange={(open) => update(i, { open })} trackColor={{ true: colors.primary, false: colors.border }} style={{ marginLeft: spacing.md }} />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
