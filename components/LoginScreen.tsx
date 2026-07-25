import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { ArrowRight, Sparkles } from 'lucide-react-native';
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
        <View className="absolute right-4 z-10" style={{ top: insets.top + 12 }}>
    
        </View>

        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-1 justify-center py-16">
            <View
              className={cn(
                'mx-auto w-full max-w-xl rounded-[30px] border px-6 py-8 shadow-2xl',
                isDark ? 'border-white/10 bg-zinc-950/90' : 'border-zinc-200/90 bg-white/95'
              )}
            >
              <View className="mb-8 gap-5">
                <View className="items-center gap-3">
                  <View
                    className={cn(
                      'h-12 w-12 items-center justify-center rounded-2xl border',
                      isDark ? 'bg-white/10' : 'bg-zinc-900'
                    )}
                    style={{ borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.2)' }}
                  >
                    <Sparkles size={22} color="#ffffff" />
                  </View>
                  <View className="w-full items-center">
                    <Text className={cn('text-center text-xs font-semibold uppercase tracking-[0.22em]', isDark ? 'text-zinc-500' : 'text-zinc-400')}>
                      Fortmont mobile
                    </Text>
                    <Text
                      className={cn('mt-1 text-center text-[28px] font-semibold tracking-tight', isDark ? 'text-white' : 'text-zinc-950')}
                      numberOfLines={2}
                      adjustsFontSizeToFit
                      minimumFontScale={0.85}
                    >
                      Welcome to Fortmont Mobile
                    </Text>
                  </View>
                </View>

                <Text className={cn('max-w-lg text-center text-[15px] leading-6', isDark ? 'text-zinc-400' : 'text-zinc-600')}>
                 Continue with Fortmont Inc to access this app. You&apos;ll be redirected to Fortmont to complete authentication.
                </Text>
              </View>

              <View className="gap-3">
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
                    {isLoading ? 'Opening Fortmont...' : 'Continue with Fortmont IAM'}
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
