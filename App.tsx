import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import './global.css';
import { LoginScreen, type AuthResponse } from './components/LoginScreen';
import { SamplePage } from './components/SamplePage';
import { clearAuthSession, loadAuthSession, saveAuthSession } from './lib/authStorage';

export default function App() {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const storedSession = await loadAuthSession();
      if (!mounted) {
        return;
      }

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

  if (isHydrating) {
    return (
      <SafeAreaProvider>
        <View className="dark flex-1 items-center justify-center bg-black">
          <ActivityIndicator color="#ffffff" />
          <Text className="mt-4 text-sm text-zinc-400">Restoring session...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View className="dark flex-1 bg-black">
        {auth ? (
          <SamplePage auth={auth} onLogout={handleLogout} />
        ) : (
          <LoginScreen onAuthenticated={handleAuthenticated} />
        )}
        <StatusBar style="light" />
      </View>
    </SafeAreaProvider>
  );
}
