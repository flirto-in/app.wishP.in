import { View, Text, TextInput, Button } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';

export default function AuthScreen() {
  const [phone, setPhone] = useState('');
  const router = useRouter();

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Enter your number</Text>
      <TextInput
        placeholder="Phone number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 8,
          padding: 10,
          marginBottom: 20,
        }}
      />
      <Button
        title="Send OTP"
        onPress={() => router.push({ pathname: '/auth/verify', params: { phone } })}
      />
    </View>
  );
}
