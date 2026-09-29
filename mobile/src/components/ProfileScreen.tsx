import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { router, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { api, errorMessage } from '@/lib/api';
import { SERVER_URL } from '@/lib/config';
import { confirm, notify } from '@/lib/queries';
import { useAuth } from '@/store/auth';
import { colors, font, radius, spacing } from '@/theme';
import { Avatar, Badge, Card, Row, Screen, type IconName } from './ui';

type MenuItem = { icon: IconName; label: string; href: Href };

/** Upload a picked image and return its public URL. */
export async function pickAndUpload(purpose: string, extra: Record<string, string> = {}): Promise<string | null> {
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true });
  if (picked.canceled) return null;
  const asset = picked.assets[0];
  const form = new FormData();
  form.append('purpose', purpose);
  for (const [k, v] of Object.entries(extra)) form.append(k, v);
  if (asset.file) form.append('file', asset.file); // web
  else form.append('file', { uri: asset.uri, name: asset.fileName ?? 'photo.jpg', type: asset.mimeType ?? 'image/jpeg' } as unknown as Blob);
  const file = await api<{ url: string }>('/files', { method: 'POST', form });
  return file.url;
}

/** Profile tab — shared by customers and providers (menu differs). */
export function ProfileScreen({ menu }: { menu: MenuItem[] }) {
  const { user, logout, refreshUser } = useAuth();

  const changeAvatar = useMutation({
    mutationFn: async () => {
      const url = await pickAndUpload('AVATAR');
      if (url) {
        await api('/me', { method: 'PATCH', body: { avatarUrl: url } });
        await refreshUser();
      }
    },
    onError: (e) => notify('Upload failed', errorMessage(e)),
  });

  if (!user) return null;
  return (
    <Screen>
      <Text style={[font.h1, { marginBottom: spacing.lg }]}>Profile</Text>
      <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
        <Pressable onPress={() => changeAvatar.mutate()} accessibilityLabel="Change photo">
          <Avatar name={user.fullName} url={user.avatarUrl} size={84} />
          <View style={{ position: 'absolute', right: -2, bottom: -2, backgroundColor: colors.primary, borderRadius: 14, padding: 6, borderWidth: 2, borderColor: colors.card }}>
            <Ionicons name="camera" size={14} color={colors.white} />
          </View>
        </Pressable>
        <Text style={[font.h2, { marginTop: spacing.md }]}>{user.fullName}</Text>
        <Text style={font.small}>{user.email}</Text>
        <View style={{ marginTop: spacing.sm }}>
          <Badge label={user.role === 'PROVIDER' ? 'Service provider' : 'Customer'} icon={user.role === 'PROVIDER' ? 'briefcase' : 'person'} />
        </View>
      </Card>

      <Card style={{ marginTop: spacing.lg, padding: 0 }}>
        {menu.map((item, i) => (
          <Pressable
            key={item.label}
            onPress={() => router.push(item.href)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              padding: spacing.lg,
              borderTopWidth: i ? 1 : 0,
              borderTopColor: colors.border,
              backgroundColor: pressed ? colors.bg : 'transparent',
            })}
          >
            <Ionicons name={item.icon} size={20} color={colors.primary} />
            <Text style={[font.body, { flex: 1 }]}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </Pressable>
        ))}
      </Card>

      <Pressable
        onPress={() => confirm('Log out?', 'You will need to log in again.', logout, 'Log out')}
        style={{ marginTop: spacing.lg, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.dangerSoft, alignItems: 'center' }}
      >
        <Row>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={{ color: colors.danger, fontWeight: '700' }}>Log out</Text>
        </Row>
      </Pressable>
      <Text style={[font.tiny, { textAlign: 'center', marginTop: spacing.lg }]}>FixMate v1.0 · {SERVER_URL.replace(/^https?:\/\//, '')}</Text>
    </Screen>
  );
}
