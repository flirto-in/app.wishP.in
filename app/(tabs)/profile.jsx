import { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Button, Text, TouchableOpacity, View } from 'react-native';
import UserUpdateModal from '../../components/userUpadteModal';
import { AuthContext } from '../../src/context/AuthContext';

export default function ProfileScreen() {
  const { getUser, logout, updateUserProfile } = useContext(AuthContext);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

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

  const handleUpdateProfile = async (description) => {
    try {
      const updatedUser = await updateUserProfile(description);
      setUserData(updatedUser);
    } catch (error) {
      throw error;
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10 }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 30 }}>
        <View
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: '#007AFF',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 15,
          }}
        >
          <Text style={{ fontSize: 40, color: '#fff', fontWeight: 'bold' }}>
            {userData?.phoneNumber?.toString().charAt(0) || '?'}
          </Text>
        </View>
        <Text className='text-red-500' style={{ fontSize: 24, fontWeight: 'bold'}}>
          {userData?.U_Id || 'Unknown User'}
        </Text>
      </View>

      {/* Profile Info Card */}
      {userData && (
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <View style={{ marginBottom: 15 }}>
            <Text style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>
              PHONE NUMBER
            </Text>
            <Text style={{ fontSize: 16, color: '#333', fontWeight: '500' }}>
              {userData.phoneNumber}
            </Text>
          </View>

          <View style={{ marginBottom: 15 }}>
            <Text style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>
              USER ID
            </Text>
            <Text style={{ fontSize: 16, color: '#333', fontWeight: '500' }}>
              {userData.U_Id}
            </Text>
          </View>

          <View style={{ marginBottom: 15 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 5,
              }}
            >
              <Text style={{ fontSize: 12, color: '#666' }}>DESCRIPTION</Text>
              <TouchableOpacity onPress={() => setModalVisible(true)}>
                <Text style={{ fontSize: 14, color: '#007AFF', fontWeight: '600' }}>
                  ✏️ Edit
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 16, color: '#333', lineHeight: 22 }}>
              {userData.description || 'No description added yet'}
            </Text>
          </View>

          <View>
            <Text style={{ fontSize: 12, color: '#666', marginBottom: 5 }}>
              STATUS
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: userData.online ? '#34C759' : '#8E8E93',
                  marginRight: 8,
                }}
              />
              <Text style={{ fontSize: 16, fontWeight: '500' }}>
                {userData.online ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Logout Button */}
      <View style={{ marginTop: 'auto', marginBottom: 20 }}>
        <Button title="Logout" onPress={logout} color="#FF3B30" />
      </View>

      {/* Update Modal */}
      <UserUpdateModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        currentDescription={userData?.description || ''}
        onUpdate={handleUpdateProfile}
      />
    </View>
  );
}
