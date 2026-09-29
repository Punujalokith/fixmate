import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { Button, Card, Input, Screen, SectionHeader } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { notify } from '@/lib/queries';
import { useAuth } from '@/store/auth';
import { font, spacing } from '@/theme';

export default function EditProfile() {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });

  const save = useMutation({
    mutationFn: () => api('/me', { method: 'PATCH', body: { fullName: fullName.trim(), ...(phone.trim() && { phone: phone.trim() }) } }),
    onSuccess: async () => {
      await refreshUser();
      router.back();
    },
    onError: (e) => notify('Could not save', errorMessage(e)),
  });

  const changePassword = useMutation({
    mutationFn: () => api('/me/password', { method: 'POST', body: passwords }),
    onSuccess: () => {
      setPasswords({ currentPassword: '', newPassword: '' });
      notify('Password changed', 'Other devices have been logged out.');
    },
    onError: (e) => notify('Could not change password', errorMessage(e)),
  });

  return (
    <Screen edges={[]}>
      <Card>
        <Input label="Full name" value={fullName} onChangeText={setFullName} />
        <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+94 77 123 4567" />
        <Text style={[font.small, { marginBottom: spacing.md }]}>Email: {user?.email}</Text>
        <Button title="Save changes" onPress={() => save.mutate()} loading={save.isPending} disabled={fullName.trim().length < 2} />
      </Card>

      <SectionHeader title="Change password" />
      <Card>
        <Input label="Current password" value={passwords.currentPassword} onChangeText={(v) => setPasswords((p) => ({ ...p, currentPassword: v }))} secureTextEntry />
        <Input label="New password" value={passwords.newPassword} onChangeText={(v) => setPasswords((p) => ({ ...p, newPassword: v }))} secureTextEntry placeholder="8+ characters, a letter and a number" />
        <Button
          title="Update password"
          variant="secondary"
          onPress={() => changePassword.mutate()}
          loading={changePassword.isPending}
          disabled={!passwords.currentPassword || !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(passwords.newPassword)}
        />
      </Card>
    </Screen>
  );
}
