import '@fortmont/auth-client-mobile/dist/polyfills.js';

import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import messaging from '@react-native-firebase/messaging';
import './global.css';
import { LoginScreen, type AuthResponse } from './components/LoginScreen';
import { SamplePage } from './components/SamplePage';
import { clearAuthSession, loadAuthSession, saveAuthSession } from './lib/authStorage';
import { ThemePreferenceProvider, useThemePreference } from './lib/useThemePreference';

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('Message handled in the background!', remoteMessage);
});

function AppShell({
  auth,
  isHydrating,
  onAuthenticated,
  onLogout,
}: {
  auth: AuthResponse | null;
  isHydrating: boolean;
  onAuthenticated: (session: AuthResponse) => void;
  onLogout: () => void;
}) {
  const { colorScheme } = useColorScheme();

  if (isHydrating) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
        <ActivityIndicator color={colorScheme === 'dark' ? '#ffffff' : '#18181b'} />
        <Text className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Restoring session...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-black">
      {auth ? (
        <SamplePage auth={auth} onLogout={onLogout} />
      ) : (
        <LoginScreen onAuthenticated={onAuthenticated} />
      )}
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </View>
  );
}

function AppContent() {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const { isReady: isThemeReady } = useThemePreference();

  useEffect(() => {
    let mounted = true;

    (async () => {
      const storedSession = await loadAuthSession();
      if (!mounted) return;

      if (storedSession) {
        setAuth(storedSession);
      }

      setIsHydrating(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleAuthenticated = async (session: AuthResponse) => {
    setAuth(session);
    await saveAuthSession(session);
  };

  const handleLogout = async () => {
    setAuth(null);
    await clearAuthSession();
  };

  return (
    <AppShell
      auth={auth}
      isHydrating={isHydrating || !isThemeReady}
      onAuthenticated={handleAuthenticated}
      onLogout={handleLogout}
    />
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemePreferenceProvider>
        <AppContent />
      </ThemePreferenceProvider>
    </SafeAreaProvider>
  );
}
