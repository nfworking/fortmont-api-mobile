import * as SecureStore from 'expo-secure-store';
import type { AuthResponse } from '../components/LoginScreen';

const AUTH_STORAGE_KEY = 'auth.session';

export async function saveAuthSession(auth: AuthResponse) {
  await SecureStore.setItemAsync(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

export async function loadAuthSession() {
  const rawSession = await SecureStore.getItemAsync(AUTH_STORAGE_KEY);
  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession) as AuthResponse;
  } catch {
    await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
    return null;
  }
}

export async function clearAuthSession() {
  await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
}
