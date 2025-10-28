import { Text, View } from 'react-native';

export default function SettingScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-dark-bg">
      <Text className="text-2xl font-bold mb-3 text-dark-text-primary">Settings</Text>
      <Text className="text-dark-text-secondary">Configure your app preferences here</Text>
    </View>
  );
}
