import { Redirect } from 'expo-router';
import { useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { AuthContext } from '../src/context/AuthContext';

export default function Index() {
  const authContext = useContext(AuthContext);

  // Handle case where context is not yet available
  if (!authContext) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#0F172A',
        }}
      >
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const { user } = authContext;

  // Redirect based on login
  if (user) return <Redirect href="(tabs)/profile" />;
  else return <Redirect href="auth/" />;
}
