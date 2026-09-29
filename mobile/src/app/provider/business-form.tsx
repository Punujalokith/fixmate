import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { pickAndUpload } from '@/components/ProfileScreen';
import { Avatar, Button, Card, Chip, Input, Loading, Row, Screen, SectionHeader } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useMyBusiness } from '@/lib/provider';
import { notify } from '@/lib/queries';
import { useAuth } from '@/store/auth';
import { colors, font, spacing } from '@/theme';

const CITIES = ['Colombo', 'Kandy', 'Galle', 'Negombo', 'Jaffna', 'Kurunegala', 'Matara'];

export default function BusinessForm() {
  const queryClient = useQueryClient();
  const refreshUser = useAuth((s) => s.refreshUser);
  const business = useMyBusiness();
  const isNew = !business.data;
  const [form, setForm] = useState({ name: '', description: '', phone: '', addressLine: '', city: '', logoUrl: '' });

  useEffect(() => {
    if (business.data) {
      const b = business.data;
      setForm({ name: b.name, description: b.description ?? '', phone: b.phone ?? '', addressLine: b.addressLine ?? '', city: b.city, logoUrl: b.logoUrl ?? '' });
    }
  }, [business.data]);

  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const save = useMutation({
    mutationFn: () => {
      const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || undefined]));
      return api('/provider/business', { method: isNew ? 'POST' : 'PATCH', body });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-business'] });
      await refreshUser();
      if (isNew) {
        router.replace('/provider/hours');
        notify('Business created 🎉', 'Next, set your working hours and add your services.');
      } else router.back();
    },
    onError: (e) => notify('Could not save', errorMessage(e)),
  });

  const uploadLogo = useMutation({
    mutationFn: () => pickAndUpload('BUSINESS_LOGO'),
    onSuccess: (url) => url && set('logoUrl')(url),
    onError: (e) => notify('Upload failed', errorMessage(e)),
  });

  if (business.isLoading) return <Loading />;

  return (
    <Screen edges={[]}>
      {isNew ? (
        <>
          <Text style={font.h2}>Tell customers about your business</Text>
          <Text style={[font.small, { marginBottom: spacing.lg }]}>You can change this any time.</Text>
        </>
      ) : null}

      <Card>
        <Pressable onPress={() => uploadLogo.mutate()} style={{ alignItems: 'center', marginBottom: spacing.lg }}>
          <Avatar name={form.name || 'Logo'} url={form.logoUrl || null} size={80} />
          <Text style={{ color: colors.primary, fontWeight: '700', marginTop: spacing.sm }}>{uploadLogo.isPending ? 'Uploading…' : 'Upload logo'}</Text>
        </Pressable>
        <Input label="Business name" value={form.name} onChangeText={set('name')} placeholder="Perera Plumbing Services" />
        <Input label="About your business" value={form.description} onChangeText={set('description')} placeholder="Experience, specialities, what makes you great" multiline />
        <Input label="Business phone" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholder="+94 77 123 4567" />
        <Input label="Address" value={form.addressLine} onChangeText={set('addressLine')} placeholder="45 Galle Road, Colombo 03" />
      </Card>

      <SectionHeader title="City you work in" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {CITIES.map((c) => (
          <Chip key={c} label={c} selected={form.city === c} onPress={() => set('city')(c)} />
        ))}
      </View>
      <Input label="Or type another city" value={CITIES.includes(form.city) ? '' : form.city} onChangeText={set('city')} placeholder="e.g. Anuradhapura" />

      <Row style={{ marginTop: spacing.md }}>
        <Button
          title={isNew ? 'Create business' : 'Save changes'}
          style={{ flex: 1 }}
          onPress={() => save.mutate()}
          loading={save.isPending}
          disabled={form.name.trim().length < 3 || form.city.trim().length < 2}
        />
      </Row>
    </Screen>
  );
}
