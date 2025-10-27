import { useLocalSearchParams, useRouter } from 'expo-router';
import { useContext, useState } from 'react';
import { Alert, Button, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { AuthContext } from '../../src/context/AuthContext';

export default function VerifyScreen() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { phone } = useLocalSearchParams();
  const { verifyOTP } = useContext(AuthContext);
  const router = useRouter();

  const handleVerify = async () => {
    // Validate OTP length
    if (otp.length < 4) {
      Alert.alert('Error', 'Please enter a valid OTP');
      return;
    }

    setLoading(true);
    console.log('🔄 Verifying OTP for:', phone);

    const result = await verifyOTP(phone, otp);

    setLoading(false);

    if (result.success) {
      console.log('✅ Verification successful:', result.user);
      // Navigate to chat screen
      router.replace('/(tabs)/profile');
    } else {
      console.error('❌ Verification failed:', result.error);
      Alert.alert('Verification Failed', result.error || 'Invalid OTP. Please try again.');
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 10, fontWeight: 'bold' }}>
        Verify Phone Number
      </Text>
      <Text style={{ fontSize: 16, marginBottom: 20, color: '#666' }}>
        Enter the OTP sent to {phone}
      </Text>

      <TextInput
        placeholder="Enter OTP"
        value={otp}
        onChangeText={setOtp}
        keyboardType="number-pad"
        maxLength={6}
        editable={!loading}
        style={{
          borderWidth: 1,
          borderColor: loading ? '#ccc' : '#007AFF',
          borderRadius: 8,
          padding: 15,
          marginBottom: 20,
          fontSize: 18,
          textAlign: 'center',
          letterSpacing: 5,
        }}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <Button title="Verify OTP" onPress={handleVerify} disabled={loading || otp.length < 4} />
      )}
    </View>
  );
}
