import { Stack } from 'expo-router';
import { useContext } from 'react';
import '../global.css';
import { AuthContext, AuthProvider } from '../src/context/AuthContext';
import { ChatProvider } from '../src/context/ChatContext';

// Polyfills for crypto operations
import { Buffer } from 'buffer';
global.Buffer = Buffer;

function RootNavigator() {
  const { user, isLoading } = useContext(AuthContext);

  // Show nothing while checking auth status
  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="auth/index" />
        <Stack.Screen name="auth/verify" />
      </Stack.Protected>

      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="temp-session" />
        <Stack.Screen name="feedback" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ChatProvider>
        <RootNavigator />
      </ChatProvider>
    </AuthProvider>
  );
}
