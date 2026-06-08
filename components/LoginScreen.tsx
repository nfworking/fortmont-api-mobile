import { useMemo, useState } from 'react';
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
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';

WebBrowser.maybeCompleteAuthSession();

const AUTH_URL = 'https://api.fortmont.me/api/auth/login';
const ENTRA_AUTH_URL = 'https://api.fortmont.me/api/auth/entra-login';
const DEFAULT_ENTRA_SCOPES = ['openid', 'profile', 'email', 'User.Read'];

type AppExtra = {
  entraClientId?: string;
  entraTenantId?: string;
  entraScopes?: string[];
};

type AuthUser = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  isActive: boolean;
  role: string | null;
  phone: string | null;
  avatarUrl: string | null;
};

export type AuthResponse = {
  token: string;
  tokenType: string;
  user: AuthUser;
};

type LoginScreenProps = {
  onAuthenticated: (auth: AuthResponse) => void;
};

function cn(...values: (string | false | null | undefined)[]) {
  return values.filter(Boolean).join(' ');
}

export function LoginScreen({ onAuthenticated }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoading2, setIsLoading2] = useState(false);

  const extra = (Constants.expoConfig?.extra ?? {}) as AppExtra;
  const entraClientId = extra.entraClientId?.trim() ?? '';
  const entraTenantId = extra.entraTenantId?.trim() ?? '';
  const entraEnabled = entraClientId.length > 0 && entraTenantId.length > 0;

  const appScheme = Array.isArray(Constants.expoConfig?.scheme)
    ? Constants.expoConfig?.scheme[0]
    : Constants.expoConfig?.scheme;

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: appScheme ?? 'com.fortmontapi.app',
    path: 'auth',
  });

  const entraScopes = useMemo(() => {
    if (Array.isArray(extra.entraScopes) && extra.entraScopes.length > 0) {
      return extra.entraScopes;
    }
    return DEFAULT_ENTRA_SCOPES;
  }, [extra.entraScopes]);

  const discovery = AuthSession.useAutoDiscovery(
    `https://login.microsoftonline.com/${entraTenantId || 'common'}/v2.0`
  );

  const [request, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: entraClientId || 'missing-entra-client-id',
      scopes: entraScopes,
      prompt: AuthSession.Prompt.SelectAccount,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      redirectUri,
    },
    discovery
  );

  const handleLogin = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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
      await Haptics.notificationAsync(
       Haptics.NotificationFeedbackType.Success
      );

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
  }

  const handleEntraLogin = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!entraEnabled) {
      setError(
        'Entra ID is not configured. Set expo.extra.entraClientId and expo.extra.entraTenantId.'
      );
      return;
    }

    if (!request) {
      setError('Microsoft sign-in is still initializing. Please try again.');
      return;
    }

    if (!discovery) {
      setError('Provider discovery is not ready yet. Please try again.');
      return;
    }

    setIsLoading2(true);
    setError('');

    try {
      const result = await promptAsync();

      if (result.type === 'cancel' || result.type === 'dismiss') {
        return;
      }

      if (result.type !== 'success') {
        const details = result.type === 'error' ? result.error?.message : '';
        throw new Error(details || 'Microsoft sign-in failed.');
      }

      const code = result.params?.code;
      if (!code) {
        throw new Error('Microsoft did not return an authorization code.');
      }

      // Exchange the authorization code for tokens using PKCE.
      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          clientId: entraClientId,
          code,
          redirectUri,
          extraParams: {
            code_verifier: request.codeVerifier!,
          },
        } as any,
        discovery as any
      );

      // We need the ID token — not the access token — for backend verification.
      // Different versions/shapes of the response expose tokens in different
      // properties. Cast to `any` and check common places for the ID token.
      const anyResp = tokenResponse as any;
      const microsoftToken =
        anyResp.idToken ??
        anyResp.authentication?.idToken ??
        anyResp.authentication?.accessToken ??
        anyResp.accessToken ??
        anyResp.params?.access_token ??
        anyResp.access_token;

      if (!microsoftToken) {
        throw new Error(
          'Microsoft did not return an ID token. Ensure the openid scope is requested and the app registration has ID tokens enabled.'
        );
      }

      const response = await fetch(ENTRA_AUTH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ token: microsoftToken }),
      });

      const payload = (await response.json()) as Partial<AuthResponse> & {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message || payload.error || 'Entra login failed.');
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
      const message = err instanceof Error ? err.message : 'Entra login failed.';
      setError(message);
    } finally {
      setIsLoading2(false);
    }
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
                  <Pressable
                    onPress={() =>
                      Alert.alert('Forgot password', 'Use the support flow for password resets.')
                    }
                    className="ml-auto"
                  >
                    <Text className="text-sm text-zinc-400 underline-offset-4">
                      Forgot your password?
                    </Text>
                  </Pressable>
                </View>
                <TextInput
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
                  <Text
                    className={cn(
                      'mr-2 font-semibold',
                      isLoading ? 'text-zinc-200' : 'text-black'
                    )}
                  >
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
                    onPress={() =>
                      Alert.alert('Request access', 'Submit a request for access.')
                    }
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