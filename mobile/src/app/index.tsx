import { Redirect } from 'expo-router';
import { useAuth } from '@/store/auth';

// Sends each user to the right part of the app.
export default function Index() {
  const { status, user } = useAuth();
  if (status !== 'signedIn' || !user) return <Redirect href="/welcome" />;
  return <Redirect href={user.role === 'PROVIDER' ? '/dashboard' : '/home'} />;
}
