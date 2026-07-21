import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { ArrowRight, BadgeCheck, ShieldCheck, Sparkles } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeToggle } from './ThemeToggle';
import { useAppTheme } from '../lib/useAppTheme';
import {
  createLoginRequest,
  exchangeCode,
  fetchUserInfo,
} from '@fortmont/auth-client-mobile';

WebBrowser.maybeCompleteAuthSession();

const DEFAULT_FORTMONT_ISSUER = 'https://api.fortmont.me';
const DEFAULT_FORTMONT_SCOPES = ['openid', 'profile', 'email'];

type AppExtra = {
  fortmontIssuer?: string;
  fortmontClientId?: string;
  fortmontScopes?: string[];
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

function mapUserInfo(userInfo: { sub: string; email?: string; name?: string; picture?: string }) {
  const email = userInfo.email?.trim() || '';
  const displayName = userInfo.name?.trim() || email || 'Fortmont user';

  return {
    id: userInfo.sub,
    username: email || userInfo.sub,
    displayName,
    email,
    isActive: true,
    role: null,
    phone: null,
    avatarUrl: userInfo.picture ?? null,
  } satisfies AuthUser;
}

export function LoginScreen({ onAuthenticated }: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const extra = (Constants.expoConfig?.extra ?? {}) as AppExtra;
  const issuer = extra.fortmontIssuer?.trim() || DEFAULT_FORTMONT_ISSUER;
  const clientId = extra.fortmontClientId?.trim() || '';
  const redirectUri = useMemo(() => Linking.createURL('auth/callback'), []);
  const scopes = useMemo(() => {
    if (Array.isArray(extra.fortmontScopes) && extra.fortmontScopes.length > 0) {
      return extra.fortmontScopes;
    }

    return DEFAULT_FORTMONT_SCOPES;
  }, [extra.fortmontScopes]);

  const handleLogin = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!clientId) {
      setError('Set fortmontClientId in app.json before signing in.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const loginRequest = await createLoginRequest({
        issuer,
        clientId,
        redirectUri,
        scopes,
      });

      const result = await WebBrowser.openAuthSessionAsync(loginRequest.authUrl, redirectUri);

      if (result.type === 'cancel' || result.type === 'dismiss') {
        return;
      }

      if (result.type !== 'success' || !result.url) {
        throw new Error('Fortmont sign-in was not completed.');
      }

      const code = new URL(result.url).searchParams.get('code');
      if (!code) {
        throw new Error('Fortmont did not return an authorization code.');
      }

      const tokenResponse = await exchangeCode(
        {
          issuer,
          clientId,
          redirectUri,
        },
        code,
        loginRequest.codeVerifier
      );

      const userInfo = await fetchUserInfo(tokenResponse.access_token, issuer);

      onAuthenticated({
        token: tokenResponse.access_token,
        tokenType: tokenResponse.token_type ?? 'Bearer',
        user: mapUserInfo(userInfo),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fortmont sign-in failed.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className={cn('flex-1', isDark ? 'bg-zinc-950' : 'bg-zinc-50')}>
        <View
          className={cn(
            'absolute -top-24 left-[-72px] h-72 w-72 rounded-full opacity-70',
            isDark ? 'bg-cyan-400/10' : 'bg-cyan-500/10'
          )}
        />
        <View
          className={cn(
            'absolute bottom-0 right-[-64px] h-80 w-80 rounded-full opacity-80',
            isDark ? 'bg-emerald-400/10' : 'bg-indigo-500/10'
          )}
        />

        <View className="absolute right-4 z-10" style={{ top: insets.top + 12 }}>
          <ThemeToggle />
        </View>

        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-center py-16">
            <View
              className={cn(
                'mx-auto w-full max-w-xl rounded-[28px] border px-6 py-8 shadow-2xl',
                isDark ? 'border-white/10 bg-zinc-950/90' : 'border-zinc-200/80 bg-white/95'
              )}
            >
              <View className="mb-8 gap-4">
                <View className="flex-row items-center gap-3">
                  <View
                    className={cn(
                      'h-12 w-12 items-center justify-center rounded-2xl',
                      isDark ? 'bg-white/10' : 'bg-zinc-900'
                    )}
                  >
                    <Sparkles size={22} color="#ffffff" />
                  </View>
                  <View>
                    <Text className={cn('text-xs font-semibold uppercase tracking-[0.28em]', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                      Fortmont access
                    </Text>
                    <Text className={cn('mt-1 text-3xl font-semibold tracking-tight', isDark ? 'text-white' : 'text-zinc-950')}>
                      Sign in with Fortmont
                    </Text>
                  </View>
                </View>

                <Text className={cn('max-w-lg text-base leading-6', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                  Continue with your Fortmont identity to open the mobile app. The login happens in the
                  system browser and returns straight back to this screen.
                </Text>
              </View>

              <View className="gap-3">
                <View className="flex-row flex-wrap gap-3">
                  <View className={cn('flex-row items-center gap-2 rounded-full px-3 py-2', isDark ? 'bg-white/5' : 'bg-zinc-100')}>
                    <ShieldCheck size={15} color={isDark ? '#a1a1aa' : '#52525b'} />
                    <Text className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                      PKCE protected
                    </Text>
                  </View>
                  <View className={cn('flex-row items-center gap-2 rounded-full px-3 py-2', isDark ? 'bg-white/5' : 'bg-zinc-100')}>
                    <BadgeCheck size={15} color={isDark ? '#a1a1aa' : '#52525b'} />
                    <Text className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                      Secure callback flow
                    </Text>
                  </View>
                </View>

                {error ? <Text className="text-sm text-red-500 dark:text-red-400">{error}</Text> : null}

                <Pressable
                  onPress={handleLogin}
                  disabled={isLoading}
                  className={cn(
                    'mt-2 flex-row items-center justify-center rounded-2xl px-6 py-4',
                    isLoading ? 'bg-zinc-400 dark:bg-zinc-700' : 'bg-zinc-900 dark:bg-white'
                  )}
                >
                  <Text
                    className={cn(
                      'mr-2 text-base font-semibold',
                      isLoading ? 'text-zinc-100 dark:text-zinc-200' : 'text-white dark:text-zinc-950'
                    )}
                  >
                    {isLoading ? 'Opening Fortmont...' : 'Continue with Fortmont'}
                  </Text>
                  {!isLoading ? <ArrowRight size={18} color={isDark ? '#09090b' : '#ffffff'} /> : null}
                </Pressable>

                <Text className={cn('pt-2 text-center text-sm', isDark ? 'text-zinc-500' : 'text-zinc-500')}>
                  You&apos;ll be redirected to Fortmont to complete authentication.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
