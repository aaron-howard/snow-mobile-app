import { ClerkProvider, useAuth, type TokenCache } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useUserSync } from '../src/domain/auth';
import { useOfflineStatus } from '../src/domain/offline/useOfflineStatus';
import { useStaleDownloads } from '../src/domain/offline/useStaleDownloads';
import { OfflineBanner } from '../src/ui/OfflineBanner';
import { ContentStaleWarning } from '../src/ui/ContentStaleWarning';
import { ThemeProvider } from '../src/ui/theme';

/**
 * SecureStore-backed token cache for Clerk. Keys are short and
 * device-local; the JWT itself is encrypted at rest on iOS Keychain /
 * Android Keystore.
 */
const tokenCache: TokenCache = {
  async getToken(key) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
       
      console.warn('[clerk] SecureStore.getItemAsync failed', err);
      return null;
    }
  },
  async saveToken(key, value) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
       
      console.warn('[clerk] SecureStore.setItemAsync failed', err);
    }
  },
};

function readPublishableKey(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  const fromEnv = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const fromExtra = extra.CLERK_PUBLISHABLE_KEY as string | undefined;
  const key = fromEnv ?? fromExtra ?? '';
  if (!key) {
     
    console.warn(
      '[clerk] EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set. Auth flows will be unavailable.',
    );
  }
  return key;
}

/**
 * Inner layout that runs *inside* the ClerkProvider so it can call
 * `useAuth`. Owns:
 *
 *  - Auth guard (Req 1.14, Task 15.2): redirect unauthenticated users
 *    out of any protected segment, and redirect authenticated users
 *    out of the `(auth)` group.
 *  - User mirror: keep the local `users` row in sync with the Clerk
 *    user via `useUserSync`.
 */
function RootStack() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const isOffline = useOfflineStatus();
  const hasStaleDownloads = useStaleDownloads();

  useUserSync();

  useEffect(() => {
    if (!isSignedIn) return;
    if (process.env.NODE_ENV === 'test') return;
    void import('@/db/seedDevCatalog').then((m) => m.seedDevCatalogIfEmpty());
  }, [isSignedIn]);

  // Notification handler + tap routing (Req 8.5, 8.6). Loaded lazily so the
  // native module is never imported under jest.
  useEffect(() => {
    if (process.env.NODE_ENV === 'test') return;
    let subscription: { remove: () => void } | undefined;
    void import('@/notifications/notificationService').then((m) => {
      m.configureNotificationHandler();
      subscription = m.addNotificationResponseRouter((path) =>
        router.push(path as Parameters<typeof router.push>[0]),
      );
      if (isSignedIn) void m.ensureNotificationPermissions();
    });
    return () => subscription?.remove();
  }, [isSignedIn, router]);

  // Connectivity-driven sync: begins within 60s of a stable (≥5s) reconnect and
  // retries queued updates until synchronized (Req 9.4–9.6). Lazy import keeps
  // NetInfo/timers out of the jest environment.
  useEffect(() => {
    if (process.env.NODE_ENV === 'test') return;
    if (!isSignedIn) return;
    let handle: { unsubscribe: () => void } | undefined;
    void import('@/db/sync').then((m) => {
      handle = m.startSyncWatcher({ getToken: () => getToken() });
    });
    return () => handle?.unsubscribe();
  }, [isSignedIn, getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    const firstSegment = segments[0];
    const inAuthGroup = firstSegment === '(auth)';

    if (!isSignedIn && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isSignedIn && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isLoaded, isSignedIn, segments, router]);

  if (!isLoaded) {
    return (
      <View style={styles.splash} accessibilityLabel="Loading">
        <ActivityIndicator color="#60A5FA" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <OfflineBanner visible={isOffline} />
      <ContentStaleWarning visible={hasStaleDownloads} />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ClerkProvider publishableKey={readPublishableKey()} tokenCache={tokenCache}>
        <StatusBar style="light" />
        <RootStack />
      </ClerkProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#0F172A',
    flex: 1,
  },
  splash: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    flex: 1,
    justifyContent: 'center',
  },
});
