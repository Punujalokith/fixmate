import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Where is the API?
 * 1. EXPO_PUBLIC_API_URL if set (e.g. your deployed server).
 * 2. Otherwise the same computer that runs `npx expo start` (your laptop), port 3000.
 *    Expo tells the phone the laptop's Wi-Fi IP through `hostUri`, so this works on a real phone
 *    as long as phone and laptop are on the same Wi-Fi.
 */
function resolveServerUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) return `http://${host}:3000`;
  return Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
}

export const SERVER_URL = resolveServerUrl();
export const API_URL = `${SERVER_URL}/api/v1`;
