import { View, Text, TextInput, Button, Alert } from 'react-native';
import { useState, useContext } from 'react';
import { useRouter } from 'expo-router';
import { AuthContext } from '../../src/context/AuthContext';

export default function AuthScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const { sendOTP } = useContext(AuthContext);
  const router = useRouter();

  const handleSendOTP = async () => {
    if (phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);
    const result = await sendOTP(phone);
    setLoading(false);

    if (result.success) {
      router.push({
        pathname: '/auth/verify',
        params: { phone },
      });
    } else {
      Alert.alert('Error', result.error);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Enter your number</Text>
      <TextInput
        placeholder="Phone number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        editable={!loading}
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 8,
          padding: 10,
          marginBottom: 20,
        }}
      />
      <Button
        title={loading ? 'Sending...' : 'Send OTP'}
        onPress={handleSendOTP}
        disabled={loading}
      />
    </View>
  );
}
