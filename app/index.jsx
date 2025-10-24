import { Redirect } from 'expo-router';
import { useContext } from 'react';
import { AuthContext } from '../src/context/AuthContext';

export default function Index() {
  const { user } = useContext(AuthContext);

  // Redirect based on login
  if (user) return <Redirect href="(tabs)/home" />;
  else return <Redirect href="auth/" />;
}
