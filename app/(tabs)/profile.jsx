import { useContext, useEffect, useState } from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  TextInput,
  Alert,
  Clipboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../src/context/AuthContext';

// Predefined Avatars (Ionicons names)
const AVATARS = [
  { id: 1, icon: 'person' },
  { id: 2, icon: 'happy' },
  { id: 3, icon: 'skull' },
  { id: 4, icon: 'rocket' },
  { id: 5, icon: 'planet' },
  { id: 6, icon: 'leaf' },
  { id: 7, icon: 'paw' },
  { id: 8, icon: 'game-controller' },
  { id: 9, icon: 'musical-notes' },
  { id: 10, icon: 'glasses' },
];

export default function ProfileScreen() {
  const { user, logout, updateUserProfile } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [about, setAbout] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState(1);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (user) {
      setAbout(user.about || 'Hey there! I am using WhispChat.');
      setSelectedAvatarId(user.avatarId || 1);
    }
  }, [user]);

  const handleSave = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await updateUserProfile({ about, avatarId: selectedAvatarId });
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (user?.U_Id) {
      Clipboard.setString(user.U_Id);
      Alert.alert('Copied', 'User ID copied to clipboard');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-dark-bg"
    >
      <ScrollView contentContainerClassName="pb-10 px-6 pt-10">
        {/* Header / Avatar Section */}
        <View className="items-center mb-8">
          <View className="w-32 h-32 rounded-full bg-dark-surface justify-center items-center mb-4 border-4 border-blue-500/30">
            <Ionicons
              name={AVATARS.find((a) => a.id === selectedAvatarId)?.icon || 'person'}
              size={64}
              color="#3B82F6"
            />
          </View>

          <TouchableOpacity
            onPress={copyToClipboard}
            className="flex-row items-center bg-dark-surface px-4 py-2 rounded-full border border-dark-border"
          >
            <Text className="text-xl font-bold text-white mr-2 tracking-wider">
              {user?.U_Id || 'LOADING...'}
            </Text>
            <Ionicons name="copy-outline" size={18} color="#9CA3AF" />
          </TouchableOpacity>
          <Text className="text-dark-text-muted text-xs mt-2">
            This is your unique username. Share it to connect.
          </Text>
        </View>

        {/* Avatar Selector (Only visible when editing) */}
        {isEditing && (
          <View className="mb-8">
            <Text className="text-dark-text-muted text-xs mb-3 font-bold uppercase tracking-wider">
              Choose Avatar
            </Text>
            <View className="flex-row flex-wrap justify-between bg-dark-surface p-4 rounded-2xl border border-dark-border">
              {AVATARS.map((avatar) => (
                <TouchableOpacity
                  key={avatar.id}
                  onPress={() => setSelectedAvatarId(avatar.id)}
                  className={`w-14 h-14 justify-center items-center rounded-xl mb-2 ${
                    selectedAvatarId === avatar.id ? 'bg-blue-600' : 'bg-dark-bg'
                  }`}
                >
                  <Ionicons
                    name={avatar.icon}
                    size={28}
                    color={selectedAvatarId === avatar.id ? '#fff' : '#6B7280'}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* About Section */}
        <View className="mb-8">
          <Text className="text-dark-text-muted text-xs mb-2 font-bold uppercase tracking-wider">
            About
          </Text>
          <View className="bg-dark-surface rounded-2xl border border-dark-border p-4">
            {isEditing ? (
              <TextInput
                value={about}
                onChangeText={setAbout}
                className="text-dark-text-primary text-base min-h-[80px]"
                multiline
                placeholder="Write something about yourself..."
                placeholderTextColor="#6B7280"
                maxLength={150}
              />
            ) : (
              <Text className="text-dark-text-primary text-base leading-6">
                {user?.about || 'Hey there! I am using WhispChat.'}
              </Text>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View className="mt-4">
          {isEditing ? (
            <View className="flex-row space-x-4">
              <TouchableOpacity
                onPress={() => {
                  setIsEditing(false);
                  setAbout(user?.about || '');
                  setSelectedAvatarId(user?.avatarId || 1);
                }}
                className="flex-1 bg-dark-surface border border-dark-border py-4 rounded-xl items-center"
              >
                <Text className="text-dark-text-primary font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={loading}
                className={`flex-1 bg-blue-600 py-4 rounded-xl items-center ${
                  loading ? 'opacity-50' : ''
                }`}
              >
                <Text className="text-white font-bold">
                  {loading ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setIsEditing(true)}
              className="bg-dark-surface border border-blue-500/50 py-4 rounded-xl items-center mb-4"
            >
              <Text className="text-blue-400 font-bold text-lg">Edit Profile</Text>
            </TouchableOpacity>
          )}

          {!isEditing && (
            <TouchableOpacity
              onPress={logout}
              className="bg-red-500/10 border border-red-500/50 py-4 rounded-xl items-center mt-4"
            >
              <Text className="text-red-500 font-bold">Logout</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
