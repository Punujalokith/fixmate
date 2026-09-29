import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Badge, Button, Card, EmptyState, Input, Loading, Row, Screen, SectionHeader } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { confirm, notify } from '@/lib/queries';
import type { Address } from '@/lib/types';
import { colors, font, spacing } from '@/theme';

export default function Addresses() {
  const queryClient = useQueryClient();
  const addresses = useQuery({ queryKey: ['addresses'], queryFn: () => api<Address[]>('/me/addresses') });
  const [form, setForm] = useState({ label: 'Home', line1: '', line2: '', city: '' });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['addresses'] });

  const add = useMutation({
    mutationFn: () => api('/me/addresses', { method: 'POST', body: { ...form, line2: form.line2 || undefined } }),
    onSuccess: () => {
      setForm({ label: 'Home', line1: '', line2: '', city: '' });
      refresh();
    },
    onError: (e) => notify('Could not save address', errorMessage(e)),
  });
  const makeDefault = useMutation({ mutationFn: (id: string) => api(`/me/addresses/${id}`, { method: 'PATCH', body: { isDefault: true } }), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (id: string) => api(`/me/addresses/${id}`, { method: 'DELETE' }), onSuccess: refresh });

  if (addresses.isLoading) return <Loading />;
  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  return (
    <Screen edges={[]}>
      {!addresses.data?.length ? <EmptyState icon="location-outline" title="No saved addresses" message="Save your home or office to book faster." /> : null}
      {addresses.data?.map((a) => (
        <Card key={a.id} style={{ marginBottom: spacing.md }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row>
              <Ionicons name={a.label.toLowerCase() === 'work' || a.label.toLowerCase() === 'office' ? 'briefcase' : 'home'} size={18} color={colors.primary} />
              <Text style={[font.body, { fontWeight: '700' }]}>{a.label}</Text>
              {a.isDefault ? <Badge label="Default" /> : null}
            </Row>
            <Pressable onPress={() => confirm('Delete address?', a.line1, () => remove.mutate(a.id), 'Delete')} hitSlop={8} accessibilityLabel="Delete address">
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </Pressable>
          </Row>
          <Text style={[font.small, { marginTop: 4 }]}>{[a.line1, a.line2, a.city].filter(Boolean).join(', ')}</Text>
          {!a.isDefault ? <Button title="Make default" variant="ghost" small style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} onPress={() => makeDefault.mutate(a.id)} /> : null}
        </Card>
      ))}

      <SectionHeader title="Add a new address" />
      <Card>
        <Row style={{ marginBottom: spacing.md }}>
          {['Home', 'Work', 'Other'].map((label) => (
            <Pressable
              key={label}
              onPress={() => set('label')(label)}
              style={{ paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, backgroundColor: form.label === label ? colors.primary : colors.bg }}
            >
              <Text style={{ color: form.label === label ? colors.white : colors.text, fontWeight: '600' }}>{label}</Text>
            </Pressable>
          ))}
        </Row>
        <Input label="Street address" value={form.line1} onChangeText={set('line1')} placeholder="27 Flower Road" />
        <Input label="Area / landmark (optional)" value={form.line2} onChangeText={set('line2')} placeholder="Colombo 07, near the park" />
        <Input label="City" value={form.city} onChangeText={set('city')} placeholder="Colombo" />
        <View>
          <Button title="Save address" icon="add" onPress={() => add.mutate()} loading={add.isPending} disabled={form.line1.length < 3 || form.city.length < 2} />
        </View>
      </Card>
    </Screen>
  );
}
