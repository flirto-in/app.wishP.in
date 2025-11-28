import { useContext } from 'react';
import { Text, View, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatContext } from '../../src/context/ChatContext';
import { AuthContext } from '../../src/context/AuthContext';

export default function SettingScreen() {
  const { e2eeInitialized } = useContext(ChatContext);
  const { user } = useContext(AuthContext);

  const openPrivacyPolicy = async () => {
    const url = 'https://whisp-legal.vercel.app/privacy-policy.html';
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Cannot open privacy policy link');
    }
  };

  const openTerms = async () => {
    const url = 'https://whisp-legal.vercel.app/terms-of-service.html';
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Info', 'Terms of Service coming soon');
    }
  };

  return (
    <ScrollView className="flex-1 bg-dark-bg">
      <View className="p-4">
        <Text className="text-2xl font-bold mb-6 text-dark-text-primary">Settings</Text>

        {/* User Info Section */}
        <View className="bg-dark-surface rounded-lg p-4 mb-4">
          <Text className="text-lg font-semibold mb-3 text-dark-text-primary">
            👤 Account
          </Text>
          <View className="flex-row items-center mb-2">
            <Text className="text-sm text-dark-text-secondary flex-1">User ID:</Text>
            <Text className="text-sm text-dark-text-primary font-mono">{user?.U_Id || 'Loading...'}</Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-sm text-dark-text-secondary flex-1">Phone:</Text>
            <Text className="text-sm text-dark-text-primary">{user?.phoneNumber || 'N/A'}</Text>
          </View>
          <View className="mt-3 p-2 bg-yellow-900/20 rounded-lg border border-yellow-700">
            <Text className="text-xs text-yellow-300">
              ⚠️ Single Device Login: Logging in on another device will automatically log you out here.
            </Text>
          </View>
        </View>

        {/* E2EE Status Section */}
        <View className="bg-dark-surface rounded-lg p-4 mb-4">
          <Text className="text-lg font-semibold mb-3 text-dark-text-primary">
            🔒 End-to-End Encryption
          </Text>

          <View className="p-4 bg-green-900/20 rounded-lg border border-green-700 mb-3">
            <Text className="text-green-400 font-semibold mb-2">✅ Always Enabled</Text>
            <Text className="text-xs text-green-300">
              All your messages are automatically encrypted using Signal Protocol
            </Text>
          </View>

          <View className="mt-2 p-3 bg-dark-bg rounded-lg">
            <Text className="text-sm text-dark-text-secondary mb-2">
              <Text className="font-semibold">Status: </Text>
              {e2eeInitialized ? (
                <Text className="text-green-400">✅ Active & Ready</Text>
              ) : (
                <Text className="text-yellow-400">⏳ Initializing...</Text>
              )}
            </Text>
            <Text className="text-xs text-dark-text-secondary mt-2">
              • Messages encrypted on your device
            </Text>
            <Text className="text-xs text-dark-text-secondary">
              • Server cannot read your content
            </Text>
            <Text className="text-xs text-dark-text-secondary">
              • Forward secrecy protects past messages
            </Text>
            <Text className="text-xs text-dark-text-secondary">
              • Uses Signal Protocol (ChaCha20-Poly1305)
            </Text>
          </View>
        </View>

        {/* Legal & Privacy Section */}
        <View className="bg-dark-surface rounded-lg p-4 mb-4">
          <Text className="text-lg font-semibold mb-3 text-dark-text-primary">
            📄 Legal & Privacy
          </Text>
          
          <TouchableOpacity
            onPress={openPrivacyPolicy}
            className="flex-row items-center justify-between p-3 bg-dark-bg rounded-lg mb-2"
          >
            <View className="flex-row items-center flex-1">
              <Ionicons name="shield-checkmark" size={20} color="#3B82F6" />
              <Text className="text-sm text-dark-text-primary ml-3">Privacy Policy</Text>
            </View>
            <Ionicons name="open-outline" size={18} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={openTerms}
            className="flex-row items-center justify-between p-3 bg-dark-bg rounded-lg"
          >
            <View className="flex-row items-center flex-1">
              <Ionicons name="document-text" size={20} color="#3B82F6" />
              <Text className="text-sm text-dark-text-primary ml-3">Terms of Service</Text>
            </View>
            <Ionicons name="open-outline" size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Test User Info for Play Store Review */}
        <View className="bg-dark-surface rounded-lg p-4 mb-4 border border-blue-700">
          <Text className="text-lg font-semibold mb-3 text-blue-400">
            🎮 Test Account (Play Store Review)
          </Text>
          <View className="p-3 bg-blue-900/20 rounded-lg">
            <Text className="text-sm text-blue-300 mb-1">
              <Text className="font-bold">Phone:</Text> +91 9852041676
            </Text>
            <Text className="text-sm text-blue-300">
              <Text className="font-bold">OTP:</Text> 7962 (Fixed)
            </Text>
            <Text className="text-xs text-blue-400 mt-2">
              Note: This is a test account for Play Store reviewers. The OTP is fixed for review builds.
            </Text>
          </View>
        </View>

        {/* App Info Section */}
        <View className="bg-dark-surface rounded-lg p-4 mb-4">
          <Text className="text-lg font-semibold mb-3 text-dark-text-primary">
            ℹ️ About
          </Text>
          <Text className="text-sm text-dark-text-secondary mb-2">
            <Text className="font-semibold">Version:</Text> 1.0.0
          </Text>
          <Text className="text-sm text-dark-text-secondary mb-2">
            <Text className="font-semibold">Build:</Text> Production
          </Text>
          <Text className="text-xs text-dark-text-muted mt-3">
            Your messages are protected with military-grade encryption. Every conversation is
            encrypted end-to-end automatically - no setup required.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
