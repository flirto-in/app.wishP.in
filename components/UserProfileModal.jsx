import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Text, TouchableOpacity, View } from 'react-native';

export default function UserProfileModal({ visible, onClose, userId, userName }) {
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  // Load user profile when modal opens
  const loadUserProfile = useCallback(async () => {
    if (!userId && !userName) return;

    setLoading(true);
    try {
      // Import the userService dynamically to avoid circular dependencies
      const { userService } = await import('../src/services/user.service');
      const profile = await userService.getUserByUId(userName);
      setUserProfile(profile);
    } catch (error) {
      console.error('Failed to load user profile:', error);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  }, [userId, userName]);

  // Load profile when modal becomes visible
  useEffect(() => {
    if (visible && (userId || userName)) {
      loadUserProfile();
    }
  }, [visible, userId, userName, loadUserProfile]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      onShow={loadUserProfile}
    >
      <View className="flex-1 justify-center items-center bg-black/70">
        <View className="bg-dark-surface rounded-3xl w-11/12 max-w-md p-6 shadow-2xl">
          {loading ? (
            <View className="py-10 items-center">
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text className="text-dark-text-muted mt-3">Loading profile...</Text>
            </View>
          ) : userProfile ? (
            <>
              {/* Avatar */}
              <View className="items-center mb-6">
                <View className="w-28 h-28 rounded-full bg-blue-500 justify-center items-center mb-4 shadow-lg">
                  <Text className="text-5xl text-white font-bold">
                    {userProfile.U_Id?.toString().charAt(0).toUpperCase() || '?'}
                  </Text>
                </View>

                {/* Online Status Indicator */}
                <View className="flex-row items-center gap-2">
                  <View
                    className={`w-3 h-3 rounded-full ${
                      userProfile.online ? 'bg-green-500' : 'bg-gray-500'
                    }`}
                  />
                  <Text className="text-dark-text-muted text-sm">
                    {userProfile.online ? 'Online' : 'Offline'}
                  </Text>
                </View>
              </View>

              {/* User Name */}
              <View className="mb-5 items-center">
                <Text className="text-2xl font-bold text-dark-text-primary mb-1">
                  {userProfile.U_Id || 'Unknown User'}
                </Text>
                <Text className="text-xs text-dark-text-muted">User ID</Text>
              </View>

              {/* Bio/Description */}
              <View className="bg-dark-card rounded-xl p-4 mb-6 border border-dark-border">
                <Text className="text-xs text-dark-text-muted mb-2 font-semibold">ABOUT</Text>
                <Text className="text-base text-dark-text-secondary leading-6">
                  {userProfile.description || 'No bio available'}
                </Text>
              </View>

              {/* Close Button */}
              <TouchableOpacity
                onPress={onClose}
                className="bg-blue-500 rounded-xl py-4 items-center"
              >
                <Text className="text-white font-semibold text-base">Close</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View className="py-10 items-center">
              <Text className="text-dark-text-muted text-lg mb-4">Profile not found</Text>
              <TouchableOpacity
                onPress={onClose}
                className="bg-dark-card rounded-xl py-3 px-6 border border-dark-border"
              >
                <Text className="text-dark-text-secondary font-semibold">Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
