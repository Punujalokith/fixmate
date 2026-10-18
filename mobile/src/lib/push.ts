import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from './api';

// Expo Go (the "store client") no longer supports remote push on Android since SDK 53,
// and even importing expo-notifications there throws. So we only load it in real builds
// (development build / APK). Live updates still work everywhere through the socket.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Asks permission and registers this phone with the API for push notifications.
 * Needs a real device, a development/production build and an EAS project id (after `eas init`).
 * In Expo Go / web it quietly does nothing.
 */
export async function registerForPush(): Promise<void> {
  try {
    if (Platform.OS === 'web' || isExpoGo || !Device.isDevice) return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    if (!projectId) return;

    const Notifications = await import('expo-notifications');

    // Show notifications even while the app is open.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Bookings & messages',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    const status = current.granted ? 'granted' : (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api('/me/devices', { method: 'POST', body: { token, platform: Platform.OS } });
  } catch (error) {
    console.warn('Push registration skipped:', (error as Error).message);
  }
}
