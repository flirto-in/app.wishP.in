import { useCallback, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
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
      <View className="flex-1 justify-center items-center bg-dark-bg">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-2 text-dark-text-primary">Loading profile...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 p-5 bg-dark-bg">
      {/* Header */}
      <View className="items-center mt-5 mb-8">
        <View className="w-24 h-24 rounded-full bg-blue-500 justify-center items-center mb-4">
          <Text className="text-4xl text-white font-bold">
            {userData?.phoneNumber?.toString().charAt(0) || '?'}
          </Text>
        </View>
        <Text className="text-2xl font-bold text-dark-text-primary">
          {userData?.U_Id || 'Unknown User'}
        </Text>
      </View>

      {/* Profile Info Card */}
      {userData && (
        <View className="bg-dark-surface rounded-2xl p-5 mb-5 shadow-lg">
          <View className="mb-4">
            <Text className="text-xs text-dark-text-muted mb-1">PHONE NUMBER</Text>
            <Text className="text-base text-dark-text-primary font-medium">
              {userData.phoneNumber}
            </Text>
          </View>

          <View className="mb-4">
            <Text className="text-xs text-dark-text-muted mb-1">USER ID</Text>
            <Text className="text-base text-dark-text-primary font-medium">{userData.U_Id}</Text>
          </View>

          <View className="mb-4">
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-xs text-dark-text-muted">DESCRIPTION</Text>
              <TouchableOpacity onPress={() => setModalVisible(true)}>
                <Text className="text-sm text-dark-accent-blue font-semibold">✏️ Edit</Text>
              </TouchableOpacity>
            </View>
            <Text className="text-base text-dark-text-primary leading-6">
              {userData.description || 'No description added yet'}
            </Text>
          </View>

          <View>
            <Text className="text-xs text-dark-text-muted mb-1">STATUS</Text>
            <View className="flex-row items-center">
              <View className={`w-2 h-2 rounded-full mr-2 ${
                userData.online ? 'bg-green-500' : 'bg-gray-500'
              }`} />
              <Text className="text-base font-medium text-dark-text-primary">
                {userData.online ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Logout Button */}
      <View className="mt-auto mb-5">
        <TouchableOpacity 
          onPress={logout}
          className="bg-red-600 rounded-xl py-4 items-center"
        >
          <Text className="text-white font-bold text-base">Logout</Text>
        </TouchableOpacity>
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
