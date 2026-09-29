import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Tokens live in the phone's encrypted keychain/keystore. (Web has no keychain: use localStorage.)
const isWeb = Platform.OS === 'web';

export const secureStorage = {
  async get(key: string): Promise<string | null> {
    if (isWeb) return globalThis.localStorage?.getItem(key) ?? null;
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string) {
    if (isWeb) return globalThis.localStorage?.setItem(key, value);
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string) {
    if (isWeb) return globalThis.localStorage?.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  },
};
