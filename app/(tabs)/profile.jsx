import { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Button, Text, View } from 'react-native';
import { AuthContext } from '../../src/context/AuthContext';

export default function ProfileScreen() {
  const { getUser, logout } = useContext(AuthContext);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getUser();
      setUserData(data);
      console.log('✅ User data loaded:', data);
    } catch (error) {
      console.error('❌ Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  }, [getUser]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>User Profile</Text>

      {userData ? (
        <View style={{ width: '100%', marginBottom: 30 }}>
          <Text style={{ fontSize: 16, marginBottom: 10 }}>📱 Phone: {userData.phoneNumber}</Text>
          <Text style={{ fontSize: 16, marginBottom: 10 }}>🆔 User ID: {userData.U_Id}</Text>
          <Text style={{ fontSize: 16, marginBottom: 10 }}>
            📝 Description: {userData.description || 'No description'}
          </Text>
          <Text style={{ fontSize: 16, marginBottom: 10 }}>
            🟢 Status: {userData.online ? 'Online' : 'Offline'}
          </Text>
        </View>
      ) : (
        <Text style={{ marginBottom: 20 }}>No user data available</Text>
      )}

      <Button title="Logout" onPress={logout} color="#FF3B30" />
    </View>
  );
}
