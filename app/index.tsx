import { useAuth } from '@clerk/clerk-expo';
import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

/**
 * Root route — redirects based on auth state.
 *
 * The guard in `_layout.tsx` also catches mismatches (e.g. signed-in
 * users on `(auth)` routes), but doing the right thing here avoids
 * a brief flash where an unauthenticated user lands on `(tabs)`
 * before the guard kicks them back.
 */
export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <View style={styles.splash} accessibilityLabel="Loading">
        <ActivityIndicator color="#60A5FA" size="large" />
      </View>
    );
  }

  return isSignedIn ? <Redirect href="/(tabs)" /> : <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  splash: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    flex: 1,
    justifyContent: 'center',
  },
});
