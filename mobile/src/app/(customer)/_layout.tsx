import { Redirect, Tabs } from 'expo-router';
import { tabIcon as icon } from '@/components/TabIcon';
import { useUnreadCount } from '@/lib/queries';
import { useAuth } from '@/store/auth';
import { colors } from '@/theme';

export default function CustomerTabs() {
  const { status, user } = useAuth();
  const unread = useUnreadCount();

  if (status !== 'signedIn') return <Redirect href="/welcome" />;
  if (user?.role === 'PROVIDER') return <Redirect href="/dashboard" />;


  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.card },
        tabBarLabelStyle: { fontWeight: '600', fontSize: 11 },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="bookings" options={{ title: 'Bookings', tabBarIcon: icon('calendar') }} />
      <Tabs.Screen name="assistant" options={{ title: 'Ask AI', tabBarIcon: icon('sparkles') }} />
      <Tabs.Screen
        name="inbox"
        options={{ title: 'Inbox', tabBarIcon: icon('notifications'), tabBarBadge: unread.data?.unread ? unread.data.unread : undefined }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('person') }} />
    </Tabs>
  );
}
