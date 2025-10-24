import { View, Text, Button } from 'react-native';
import { useContext } from 'react';
import { AuthContext } from '../../src/context/AuthContext';

export default function ProfileScreen() {
  const { logout } = useContext(AuthContext);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>User Profile & Settings</Text>
      <Button title="Logout" onPress={logout} />
    </View>
  );
}
