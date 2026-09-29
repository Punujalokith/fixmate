import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Chip, Input, Loading, Screen, SectionHeader } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useMyBusiness } from '@/lib/provider';
import { confirm, notify, useCategories } from '@/lib/queries';
import type { PriceType } from '@/lib/types';
import { font, spacing } from '@/theme';

const PRICE_TYPES: { value: PriceType; label: string; hint: string }[] = [
  { value: 'FIXED', label: 'Fixed price', hint: 'One price for the whole job' },
  { value: 'HOURLY', label: 'Per hour', hint: 'Charged by the hour' },
  { value: 'INSPECTION', label: 'Visit fee', hint: 'Final price agreed after inspection' },
];
const DURATIONS = [30, 60, 90, 120, 180, 240, 480];

export default function ServiceForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const queryClient = useQueryClient();
  const categories = useCategories();
  const business = useMyBusiness();
  const existing = business.data?.services.find((s) => s.id === id);

  const [form, setForm] = useState({ title: '', description: '', categoryId: '', priceType: 'FIXED' as PriceType, price: '', durationMinutes: 60 });
  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title,
        description: existing.description ?? '',
        categoryId: existing.categoryId,
        priceType: existing.priceType,
        price: String(Number(existing.price)),
        durationMinutes: existing.durationMinutes,
      });
    }
  }, [existing]);

  const done = () => {
    queryClient.invalidateQueries({ queryKey: ['my-business'] });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    router.back();
  };

  const save = useMutation({
    mutationFn: () =>
      api(id ? `/provider/services/${id}` : '/provider/services', {
        method: id ? 'PATCH' : 'POST',
        body: { ...form, description: form.description.trim() || undefined, title: form.title.trim(), price: Number(form.price) },
      }),
    onSuccess: done,
    onError: (e) => notify('Could not save service', errorMessage(e)),
  });
  const toggle = useMutation({
    mutationFn: (isActive: boolean) => api(`/provider/services/${id}`, { method: 'PATCH', body: { isActive } }),
    onSuccess: done,
  });

  if (categories.isLoading || business.isLoading) return <Loading />;
  const price = Number(form.price);
  const valid = form.title.trim().length >= 3 && form.categoryId && form.price !== '' && !Number.isNaN(price) && price >= 0;

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: id ? 'Edit service' : 'New service' }} />
      <Input label="Service name" value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="e.g. Leak detection & repair" />
      <Input label="Description" value={form.description} onChangeText={(v) => setForm((f) => ({ ...f, description: v }))} placeholder="What's included?" multiline />

      <SectionHeader title="Category" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {categories.data?.map((c) => (
          <Chip key={c.id} label={c.name} selected={form.categoryId === c.id} onPress={() => setForm((f) => ({ ...f, categoryId: c.id }))} />
        ))}
      </View>

      <SectionHeader title="Pricing" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm }}>
        {PRICE_TYPES.map((p) => (
          <Chip key={p.value} label={p.label} selected={form.priceType === p.value} onPress={() => setForm((f) => ({ ...f, priceType: p.value }))} />
        ))}
      </View>
      <Text style={[font.small, { marginBottom: spacing.md }]}>{PRICE_TYPES.find((p) => p.value === form.priceType)?.hint}</Text>
      <Input label="Price (LKR)" value={form.price} onChangeText={(v) => setForm((f) => ({ ...f, price: v.replace(/[^0-9.]/g, '') }))} keyboardType="numeric" placeholder="3500" icon="cash-outline" />

      <SectionHeader title="How long does it usually take?" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {DURATIONS.map((m) => (
          <Chip key={m} label={m < 60 ? `${m} min` : `${m / 60} h`} selected={form.durationMinutes === m} onPress={() => setForm((f) => ({ ...f, durationMinutes: m }))} />
        ))}
      </View>

      <Button title={id ? 'Save changes' : 'Add service'} style={{ marginTop: spacing.xl }} onPress={() => save.mutate()} loading={save.isPending} disabled={!valid} />
      {existing ? (
        existing.isActive ? (
          <Button
            title="Hide this service"
            variant="danger"
            style={{ marginTop: spacing.md }}
            onPress={() => confirm('Hide service?', 'Customers will no longer see it. Past bookings are kept.', () => toggle.mutate(false), 'Hide')}
          />
        ) : (
          <Button title="Show this service again" variant="secondary" style={{ marginTop: spacing.md }} onPress={() => toggle.mutate(true)} />
        )
      ) : null}
    </Screen>
  );
}
