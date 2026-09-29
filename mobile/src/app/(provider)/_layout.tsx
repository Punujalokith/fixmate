import { Redirect, Tabs } from 'expo-router';
import { tabIcon as icon } from '@/components/TabIcon';
import { useUnreadCount } from '@/lib/queries';
import { useAuth } from '@/store/auth';
import { colors } from '@/theme';

export default function ProviderTabs() {
  const { status, user } = useAuth();
  const unread = useUnreadCount();

  if (status !== 'signedIn') return <Redirect href="/welcome" />;
  if (user?.role !== 'PROVIDER') return <Redirect href="/home" />;


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
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarIcon: icon('stats-chart') }} />
      <Tabs.Screen name="jobs" options={{ title: 'Jobs', tabBarIcon: icon('briefcase') }} />
      <Tabs.Screen name="services" options={{ title: 'Services', tabBarIcon: icon('construct') }} />
      <Tabs.Screen name="alerts" options={{ title: 'Inbox', tabBarIcon: icon('notifications'), tabBarBadge: unread.data?.unread ? unread.data.unread : undefined }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: icon('person') }} />
    </Tabs>
  );
}
