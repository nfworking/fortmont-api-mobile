import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ArrowRight } from 'lucide-react-native';

const AUTH_URL = 'http://172.20.0.100:3000/api/auth/login';

type AuthUser = {
  id: string;
  username: string;
  displayName: string;
  email: string;
};

export type AuthResponse = {
  token: string;
  tokenType: string;
  user: AuthUser;
};

type LoginScreenProps = {
  onAuthenticated: (auth: AuthResponse) => void;
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function LoginScreen({ onAuthenticated }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoading2, setIsLoading2] = useState(false);

  const handleLogin = async () => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      setError('Enter your username and password.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(AUTH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          username: trimmedUsername,
          password,
        }),
      });

      const payload = (await response.json()) as Partial<AuthResponse> & {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message || payload.error || 'Login failed.');
      }

      if (!payload.token || !payload.user) {
        throw new Error('Server response was missing the expected token or user data.');
      }

      onAuthenticated({
        token: payload.token,
        tokenType: payload.tokenType ?? 'Bearer',
        user: payload.user,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEntraLogin = async () => {
    setIsLoading2(true);
    Alert.alert('Entra ID', 'Entra ID sign-in is not wired yet.');
    setIsLoading2(false);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-black"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center py-16">
          <View className="mx-auto w-full max-w-xl rounded-3xl border border-zinc-800 bg-zinc-950 px-6 py-8">
            <View className="items-center gap-2 text-center mb-6">
              <View className="mb-2 h-16 w-16 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900">
                <Text className="text-lg font-bold text-white">L</Text>
              </View>
              <Text className="text-2xl font-bold text-white">Login to your account</Text>
              <Text className="text-sm text-center text-zinc-400">
                Enter your username below to login to your account
              </Text>
            </View>

            <View className="gap-5">
              <View className="gap-2">
                <Text className="text-sm font-medium text-zinc-200">Username</Text>
                <TextInput
                  id="username"
                  value={username}
                  onChangeText={setUsername}
                  placeholder="your.username"
                  placeholderTextColor="#71717a"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-base text-white"
                />
              </View>

              <View className="gap-2">
                <View className="flex-row items-center">
                  <Text className="text-sm font-medium text-zinc-200">Password</Text>
                  <Pressable onPress={() => Alert.alert('Forgot password', 'Use the support flow for password resets.') } className="ml-auto">
                    <Text className="text-sm text-zinc-400 underline-offset-4">Forgot your password?</Text>
                  </Pressable>
                </View>
                <TextInput
                  id="password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#71717a"
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-4 text-base text-white"
                />
              </View>

              {error ? <Text className="text-sm text-red-400">{error}</Text> : null}

              <View className="gap-3">
                <Pressable
                  onPress={handleLogin}
                  disabled={isLoading}
                  className={cn(
                    'flex-row items-center justify-center rounded-xl px-6 py-4',
                    isLoading ? 'bg-zinc-700' : 'bg-white'
                  )}
                >
                  <Text className={cn('mr-2 font-semibold', isLoading ? 'text-zinc-200' : 'text-black')}>
                    {isLoading ? 'Signing in...' : 'Login'}
                  </Text>
                  {!isLoading ? <ArrowRight size={18} color="#111827" /> : null}
                </Pressable>

                <Text className="text-center text-xs uppercase tracking-[0.3em] text-zinc-500">
                  continue with
                </Text>

                <Pressable
                  onPress={handleEntraLogin}
                  disabled={isLoading2}
                  className={cn(
                    'flex-row items-center justify-center rounded-xl border border-zinc-700 px-6 py-4',
                    isLoading2 ? 'bg-zinc-900' : 'bg-transparent'
                  )}
                >
                  <Text className="font-semibold text-white">
                    {isLoading2 ? 'Signing in...' : 'Login with Entra ID'}
                  </Text>
                </Pressable>

                <Text className="text-center text-sm text-zinc-400">
                  Don&apos;t have an account?{' '}
                  <Text
                    className="text-white underline underline-offset-4"
                    onPress={() => Alert.alert('Request access', 'Submit a request for access.')}
                  >
                    Submit a request for access
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
