import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Text, View, PermissionsAndroid } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import messaging from '@react-native-firebase/messaging'; // CRUCIAL IMPORT
import './global.css';
import { LoginScreen, type AuthResponse } from './components/LoginScreen';
import { SamplePage } from './components/SamplePage';
import { clearAuthSession, loadAuthSession, saveAuthSession } from './lib/authStorage';

// ==========================================
// 1. REGISTER BACKGROUND HANDLER (TOP LEVEL)
// ==========================================
// This MUST sit outside the App component so Android Headless JS can invoke it 
// when the app process is completely dead or minimized.
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('Message handled in the background!', remoteMessage);
  // Perform background actions here (e.g., writing to local storage)
});

export default function App() {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  // ==========================================
  // 2. NOTIFICATION PERMISSIONS & FOREGROUND LISTENERS
  // ==========================================
  useEffect(() => {
    async function setupFirebaseMessaging() {
      // Android 13+ requires explicit runtime permission to show notifications
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Notification permission granted.');
        } else {
          console.log('Notification permission denied.');
        }
      }

      // Fetch the FCM device token (Send this to the Fortmont API backend on login)
      try {
        const token = await messaging().getToken();
        console.log('FCM Device Token:', token);
      } catch (error) {
        console.error('Error getting FCM token:', error);
      }
    }

    setupFirebaseMessaging();

    // Listen for messages while the app is actively open and running (Foreground)
    const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
      console.log('A new FCM message arrived in the foreground!', remoteMessage);
      // You can trigger a UI alert or banner here if you want to notify the user in-app
    });

    return () => {
      unsubscribeForeground();
    };
  }, []);

  // ==========================================
  // EXISTING AUTH HYDRATION
  // ==========================================
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