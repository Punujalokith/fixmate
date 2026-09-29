import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/store/auth';
import { colors } from '@/theme';

export default function AuthLayout() {
  const status = useAuth((s) => s.status);
  if (status === 'signedIn') return <Redirect href="/" />;
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitle: '',
        contentStyle: { backgroundColor: colors.bg },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
    </Stack>
  );
}
