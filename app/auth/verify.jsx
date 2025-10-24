import { View, Text, TextInput, Button } from 'react-native';
import { useState, useContext } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthContext } from '../../src/context/AuthContext';

export default function VerifyScreen() {
  const [otp, setOtp] = useState('');
  const { phone } = useLocalSearchParams();
  const { login } = useContext(AuthContext);
  const router = useRouter();

  const handleVerify = () => {
    // if (otp.length >= 4) {
    //   login(phone);
    //   // Redirect to the correct tab screen
    //   router.replace("/(tabs)/chat");
    // } else {
    //   alert("Please enter a valid OTP");
    // }
    router.replace('/(tabs)/chat');
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 10 }}>Verify {phone}</Text>
      <TextInput
        placeholder="Enter OTP"
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        maxLength={6}
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 8,
          padding: 10,
          marginBottom: 20,
        }}
      />
      <Button title="Verify" onPress={handleVerify} />
    </View>
  );
}
