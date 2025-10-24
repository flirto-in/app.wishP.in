import { Stack } from "expo-router";
import { AuthProvider, AuthContext } from "../src/context/AuthContext";
import { useContext } from "react";

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
      <RootNavigator />
    </AuthProvider>
  );
}
