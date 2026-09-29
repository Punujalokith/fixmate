import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { Button, Input, Row, Screen } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { colors, font, radius, spacing } from '@/theme';

type RoleChoice = 'CUSTOMER' | 'PROVIDER';

export default function Register() {
  const register = useAuth((s) => s.register);
  const [role, setRole] = useState<RoleChoice>('CUSTOMER');
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const update = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const passwordOk = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(form.password);

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const user = await register({ ...form, email: form.email.trim(), phone: form.phone.trim() || undefined, role });
      router.replace(user.role === 'PROVIDER' ? '/provider/business-form' : '/');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={[]}>
        <Text style={font.h1}>Create account</Text>
        <Text style={[font.small, { marginBottom: spacing.xl }]}>It takes less than a minute.</Text>

        <Row gap={spacing.md} style={{ marginBottom: spacing.xl }}>
          {(
            [
              { value: 'CUSTOMER', icon: 'home-outline', title: 'I need a service' },
              { value: 'PROVIDER', icon: 'briefcase-outline', title: 'I offer services' },
            ] as const
          ).map((option) => {
            const selected = role === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setRole(option.value)}
                style={{
                  flex: 1,
                  padding: spacing.lg,
                  borderRadius: radius.lg,
                  borderWidth: 2,
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primarySoft : colors.card,
                }}
              >
                <Ionicons name={option.icon} size={24} color={selected ? colors.primary : colors.textMuted} />
                <Text style={{ fontWeight: '700', marginTop: spacing.sm, color: colors.text }}>{option.title}</Text>
              </Pressable>
            );
          })}
        </Row>

        <Input label="Full name" icon="person-outline" value={form.fullName} onChangeText={update('fullName')} placeholder="Nimal Perera" autoComplete="name" />
        <Input label="Email" icon="mail-outline" value={form.email} onChangeText={update('email')} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
        <Input label="Phone (optional)" icon="call-outline" value={form.phone} onChangeText={update('phone')} keyboardType="phone-pad" placeholder="+94 77 123 4567" />
        <Input
          label="Password"
          icon="lock-closed-outline"
          value={form.password}
          onChangeText={update('password')}
          secureTextEntry
          placeholder="At least 8 characters"
          error={form.password && !passwordOk ? 'Use 8+ characters with a letter and a number' : undefined}
        />

        {error ? (
          <View style={{ backgroundColor: colors.dangerSoft, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md }}>
            <Text style={{ color: colors.danger }}>{error}</Text>
          </View>
        ) : null}

        <Button title="Create account" onPress={submit} loading={loading} disabled={!form.fullName || !form.email || !passwordOk} />
        <Button title="Already registered? Log in" variant="ghost" onPress={() => router.replace('/login')} style={{ marginTop: spacing.sm }} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
