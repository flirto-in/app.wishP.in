import { useCallback, useContext, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import UserUpdateModal from '../../components/userUpadteModal';
import { AuthContext } from '../../src/context/AuthContext';
import { ChatContext } from '../../src/context/ChatContext';

export default function ProfileScreen() {
  const { getUser, logout, updateUserProfile } = useContext(AuthContext);
  const { primaryChats, secondaryChats } = useContext(ChatContext);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

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

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, loading]);

  const handleUpdateProfile = async (description) => {
    try {
      const updatedUser = await updateUserProfile(description);
      setUserData(updatedUser);
    } catch (error) {
      throw error;
    }
  };

  const totalChats = (primaryChats?.length || 0) + (secondaryChats?.length || 0);
  const secondaryCount = secondaryChats?.length || 0;
  const primaryCount = primaryChats?.length || 0;

  if (loading) {
    return (
      <View className="flex-1 bg-dark-bg px-6 py-10">
        {/* Skeleton header */}
        <View className="items-center mb-8">
          <View className="w-28 h-28 rounded-full bg-dark-surface animate-pulse mb-4" />
          <View className="w-40 h-6 bg-dark-surface rounded-full animate-pulse" />
        </View>
        {/* Skeleton cards */}
        <View className="flex-row justify-between mb-4">
          {[1, 2, 3].map((i) => (
            <View key={i} className="flex-1 mx-1 h-24 bg-dark-surface rounded-2xl animate-pulse" />
          ))}
        </View>
        <View className="h-40 bg-dark-surface rounded-2xl animate-pulse" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-dark-bg" contentContainerClassName="pb-10">
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Decorative header */}
        <View className="h-56 mb-16 bg-dark-surface/60">
          <View className="absolute inset-0">
            <View className="absolute -top-8 -left-10 w-52 h-52 rounded-full bg-blue-700/20" />
            <View className="absolute -bottom-12 -right-16 w-64 h-64 rounded-full bg-indigo-600/10" />
          </View>
          <View className="flex-1 justify-end items-center pb-4">
            <View className="relative">
              <View className="w-28 h-28 rounded-full bg-blue-500 justify-center items-center shadow-lg">
                <Text className="text-4xl text-white font-bold">☠️</Text>
              </View>
              <View className="absolute bottom-2 right-2 w-5 h-5 rounded-full border-2 border-dark-surface justify-center items-center bg-dark-bg">
                <View
                  className={`w-3 h-3 rounded-full ${userData?.online ? 'bg-green-500' : 'bg-gray-500'}`}
                />
              </View>
            </View>
            <Text className="mt-4 text-xl font-semibold text-dark-text-primary">
              {userData?.U_Id || 'Unknown User'}
            </Text>
          </View>
        </View>

        {/* Stats Section */}
        <View className="px-6 -mt-12">
          <View className="flex-row mb-6">
            <View className="flex-1 bg-dark-surface rounded-2xl p-4 mr-2 border border-dark-border">
              <Text className="text-xs text-dark-text-muted mb-1">TOTAL CHATS</Text>
              <View className="flex-row items-center">
                <Ionicons name="chatbubbles" size={20} color="#3B82F6" />
                <Text className="ml-2 text-lg font-semibold text-dark-text-primary">
                  {totalChats}
                </Text>
              </View>
            </View>
            <View className="flex-1 bg-dark-surface rounded-2xl p-4 mr-2 border border-dark-border">
              <Text className="text-xs text-dark-text-muted mb-1">PRIMARY</Text>
              <View className="flex-row items-center">
                <Ionicons name="star" size={18} color="#FCD34D" />
                <Text className="ml-2 text-lg font-semibold text-dark-text-primary">
                  {primaryCount}
                </Text>
              </View>
            </View>
            <View className="flex-1 bg-dark-surface rounded-2xl p-4 border border-dark-border">
              <Text className="text-xs text-dark-text-muted mb-1">SECONDARY</Text>
              <View className="flex-row items-center">
                <Ionicons name="people" size={20} color="#6366F1" />
                <Text className="ml-2 text-lg font-semibold text-dark-text-primary">
                  {secondaryCount}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Description & Info Card */}
        <View className="mx-6 bg-dark-surface rounded-3xl p-6 mb-6 border border-dark-border">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-xs text-dark-text-muted tracking-wide">BIO</Text>
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              className="flex-row items-center"
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={16} color="#3B82F6" />
              <Text className="ml-1 text-sm font-medium text-dark-accent-blue">Edit</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-base leading-6 text-dark-text-primary">
            {userData?.description || 'No bio yet. Tap edit to add something about yourself.'}
          </Text>
          <View className="mt-5">
            <Text className="text-xs text-dark-text-muted mb-1">STATUS</Text>
            <View className="flex-row items-center">
              <Ionicons
                name={userData?.online ? 'radio-button-on' : 'radio-button-off'}
                size={16}
                color={userData?.online ? '#22C55E' : '#6B7280'}
              />
              <Text className="ml-2 text-sm font-medium text-dark-text-primary">
                {userData?.online ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="mx-6 flex-row mb-4">
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            className="flex-1 bg-blue-600 rounded-2xl py-4 flex-row justify-center items-center mr-3"
            activeOpacity={0.85}
          >
            <Ionicons name="pencil" size={18} color="#fff" />
            <Text className="ml-2 text-white font-semibold">Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={logout}
            className="flex-1 bg-red-600 rounded-2xl py-4 flex-row justify-center items-center"
            activeOpacity={0.85}
          >
            <Ionicons name="log-out" size={18} color="#fff" />
            <Text className="ml-2 text-white font-semibold">Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Footer hint */}
        <Text className="text-center text-xs text-dark-text-muted">
          Profile data refreshes automatically when you reopen this page.
        </Text>
      </Animated.View>

      {/* Update Modal */}
      <UserUpdateModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        currentDescription={userData?.description || ''}
        onUpdate={handleUpdateProfile}
      />
    </ScrollView>
  );
}
