import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function UserUpdateModal({ visible, onClose, currentDescription, onUpdate }) {
  const [description, setDescription] = useState(currentDescription || '');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (description.trim().length === 0) {
      Alert.alert('Error', 'Description cannot be empty');
      return;
    }

    setLoading(true);
    try {
      await onUpdate(description);
      Alert.alert('Success', 'Profile updated successfully!');
      onClose();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-dark-surface rounded-2xl w-11/12 max-w-md p-6 shadow-lg">
          {/* Header */}
          <Text className="text-2xl font-bold text-dark-text-primary mb-2">Edit Profile</Text>
          <Text className="text-sm text-dark-text-muted mb-6">Update your description</Text>

          {/* Description Input */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-dark-text-secondary mb-2">Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Tell us about yourself..."
              placeholderTextColor="#666666"
              multiline
              numberOfLines={4}
              maxLength={200}
              editable={!loading}
              className="border border-dark-border rounded-xl p-4 text-base text-dark-text-primary min-h-[100px] bg-dark-card"
              textAlignVertical="top"
            />
            <Text className="text-xs text-dark-text-muted mt-1 text-right">
              {description.length}/200
            </Text>
          </View>

          {/* Buttons */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={onClose}
              disabled={loading}
              className="flex-1 bg-dark-card rounded-xl py-3 items-center border border-dark-border"
            >
              <Text className="text-dark-text-secondary font-semibold text-base">Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleUpdate}
              disabled={loading}
              className="flex-1 bg-blue-500 rounded-xl py-3 items-center"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
