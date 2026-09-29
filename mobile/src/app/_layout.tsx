import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Loading } from '@/components/ui';
import { registerForPush } from '@/lib/push';
import { closeSocket, useLiveUpdates } from '@/lib/socket';
import { useAuth } from '@/store/auth';
import { colors } from '@/theme';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function AppShell() {
  const status = useAuth((s) => s.status);
  const bootstrap = useAuth((s) => s.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (status === 'signedIn') registerForPush();
    if (status === 'signedOut') {
      closeSocket();
      queryClient.clear();
    }
  }, [status]);

  useLiveUpdates(status === 'signedIn');

  if (status === 'loading') return <Loading />;

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        contentStyle: { backgroundColor: colors.bg },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(customer)" options={{ headerShown: false }} />
      <Stack.Screen name="(provider)" options={{ headerShown: false }} />
      <Stack.Screen name="search" options={{ title: 'Find a service' }} />
      <Stack.Screen name="business/[id]" options={{ title: '', headerTransparent: true }} />
      <Stack.Screen name="book/[serviceId]" options={{ title: 'Book service', presentation: 'modal' }} />
      <Stack.Screen name="booking/[id]" options={{ title: 'Booking' }} />
      <Stack.Screen name="chat/[bookingId]" options={{ title: 'Chat' }} />
      <Stack.Screen name="addresses" options={{ title: 'My addresses' }} />
      <Stack.Screen name="edit-profile" options={{ title: 'Edit profile' }} />
      <Stack.Screen name="favourites" options={{ title: 'Favourites' }} />
      <Stack.Screen name="provider/business-form" options={{ title: 'Business profile' }} />
      <Stack.Screen name="provider/service-form" options={{ title: 'Service', presentation: 'modal' }} />
      <Stack.Screen name="provider/hours" options={{ title: 'Working hours' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <AppShell />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
