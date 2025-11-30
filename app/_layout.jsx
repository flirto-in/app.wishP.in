import { Stack } from 'expo-router';
import { useContext } from 'react';
import '../global.css';
import { AuthContext, AuthProvider } from '../src/context/AuthContext';
import ErrorBoundary from '../components/ErrorBoundary';

// Polyfills for crypto operations
import { Buffer } from 'buffer';
global.Buffer = Buffer;

function RootNavigator() {
  const { user, isLoading } = useContext(AuthContext);

  // Show nothing while checking auth status
  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Index route will handle redirects */}
      <Stack.Screen name="index" />

      {/* Auth screens */}
      <Stack.Screen name="auth/index" />
      <Stack.Screen name="auth/verify" />

      {/* Authenticated screens */}
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="chat-conversation" />
      <Stack.Screen name="temp-session" />
      <Stack.Screen name="feedback" />
    </Stack>
  );
}

<ErrorBoundary>
  <AuthProvider>
    <ChatProvider>
      <RootNavigator />
    </ChatProvider>
  </AuthProvider>
</ErrorBoundary>
