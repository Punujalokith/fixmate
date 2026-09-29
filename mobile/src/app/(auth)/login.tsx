import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { Button, Input, Screen } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { colors, font, radius, spacing } from '@/theme';

export default function Login() {
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={[]}>
        <Text style={font.h1}>Welcome back</Text>
        <Text style={[font.small, { marginBottom: spacing.xl }]}>Log in to manage your bookings.</Text>

        <Input label="Email" icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@example.com" />
        <Input label="Password" icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" placeholder="••••••••" onSubmitEditing={submit} />

        {error ? (
          <View style={{ backgroundColor: colors.dangerSoft, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md }}>
            <Text style={{ color: colors.danger }}>{error}</Text>
          </View>
        ) : null}

        <Button title="Log in" onPress={submit} loading={loading} disabled={!email || !password} />
        <Button title="New here? Create an account" variant="ghost" onPress={() => router.replace('/register')} style={{ marginTop: spacing.sm }} />

        {__DEV__ ? (
          <View style={{ marginTop: spacing.xl, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' }}>
            <Text style={font.tiny}>DEMO ACCOUNTS (development only)</Text>
            {[
              ['Customer', 'customer@fixmate.lk', 'Customer@123'],
              ['Provider', 'provider@fixmate.lk', 'Provider@123'],
            ].map(([label, demoEmail, demoPassword]) => (
              <Button
                key={label}
                title={`Use ${label.toLowerCase()} demo`}
                variant="secondary"
                small
                style={{ marginTop: spacing.sm }}
                onPress={() => {
                  setEmail(demoEmail);
                  setPassword(demoPassword);
                }}
              />
            ))}
          </View>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}
