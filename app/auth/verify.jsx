import { useLocalSearchParams, useRouter } from 'expo-router';
import { useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AuthContext } from '../../src/context/AuthContext';

export default function VerifyScreen() {
  const [otp, setOtp] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const { phone } = useLocalSearchParams();
  const { verifyOTP, sendOTP } = useContext(AuthContext);
  const router = useRouter();
  const inputRefs = useRef([]);

  // Timer for resend OTP
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const handleOtpChange = (text, index) => {
    // Only accept numbers
    if (text && !/^\d+$/.test(text)) return;

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-focus next input
    if (text && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 4 digits are entered
    if (index === 3 && text) {
      const otpString = [...newOtp.slice(0, 3), text].join('');
      if (otpString.length === 4) {
        handleVerify(otpString);
      }
    }
  };

  const handleKeyPress = (e, index) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpString = otp.join('')) => {
    if (otpString.length < 4) {
      Alert.alert('Error', 'Please enter the complete 4-digit OTP');
      return;
    }

    setLoading(true);
    console.log('🔄 Verifying OTP for:', phone);

    const otp = parseInt(otpString);
    const result = await verifyOTP(phone, otp);

    setLoading(false);

    if (result.success) {
      console.log('✅ Verification successful:', result.user);
      router.replace('/(tabs)/profile');
    } else {
      console.error('❌ Verification failed:', result.error);
      Alert.alert('Verification Failed', result.error || 'Invalid OTP. Please try again.');
      // Clear OTP on error
      setOtp(['', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;

    setLoading(true);
    const result = await sendOTP(phone);
    setLoading(false);

    if (result.success) {
      Alert.alert('Success', 'OTP has been resent to your phone number');
      setTimer(60);
      setCanResend(false);
      setOtp(['', '', '', '']);
      inputRefs.current[0]?.focus();
    } else {
      Alert.alert('Error', result.error || 'Failed to resend OTP');
    }
  };

  const formatPhoneNumber = (phoneNumber) => {
    // Format phone number for display (e.g., +91 98765 43210)
    if (phoneNumber.length > 10) {
      const countryCode = phoneNumber.slice(0, -10);
      const number = phoneNumber.slice(-10);
      return `+${countryCode} ${number.slice(0, 5)} ${number.slice(5)}`;
    }
    return phoneNumber;
  };

  return (
    <View className="flex-1 bg-dark-bg dark">
      <View className="flex-1 justify-center px-6">
        {/* Header */}
        <View className="items-center mb-10">
          <View className="w-24 h-24 bg-dark-accent-blue rounded-full items-center justify-center mb-4 shadow-lg">
            <Text className="text-5xl">🔐</Text>
          </View>
          <Text className="text-3xl font-bold text-dark-text-primary mb-2">Verify OTP</Text>
          <Text className="text-base text-dark-text-secondary text-center px-6">
            We&apos;ve sent a 4-digit code to
          </Text>
          <Text className="text-base font-semibold text-dark-text-primary mt-1">
            {formatPhoneNumber(phone)}
          </Text>
        </View>

        {/* OTP Input Card */}
        <View className="bg-dark-surface rounded-2xl p-6 shadow-xl border border-dark-border mb-6">
          <Text className="text-sm font-semibold text-dark-text-primary mb-4 text-center">
            Enter Verification Code
          </Text>

          {/* OTP Input Boxes */}
          <View className="flex-row justify-between mb-6">
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                value={digit}
                onChangeText={(text) => handleOtpChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                editable={!loading}
                selectTextOnFocus
                className={`w-12 h-14 border-2 rounded-xl text-center text-xl font-bold ${
                  digit
                    ? 'border-dark-accent-blue bg-dark-accent-blue/20 text-dark-accent-blue'
                    : 'border-dark-border bg-dark-card text-dark-text-primary'
                }`}
                placeholderTextColor="#808080"
              />
            ))}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            onPress={() => handleVerify()}
            disabled={loading || otp.join('').length < 4}
            className={`rounded-xl py-4 items-center ${
              loading || otp.join('').length < 4 ? 'bg-dark-border' : 'bg-blue-500'
            }`}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-base font-bold">Verify & Continue</Text>
            )}
          </TouchableOpacity>

          {/* Timer / Resend */}
          <View className="items-center mt-4">
            {canResend ? (
              <TouchableOpacity onPress={handleResendOTP} disabled={loading}>
                <Text className="text-dark-accent-blue font-semibold text-sm">Resend OTP</Text>
              </TouchableOpacity>
            ) : (
              <Text className="text-dark-text-muted text-sm">
                Resend OTP in <Text className="font-bold text-dark-text-secondary">{timer}s</Text>
              </Text>
            )}
          </View>
        </View>

        {/* Back Button */}
        <TouchableOpacity
          onPress={() => router.back()}
          disabled={loading}
          className="items-center py-3"
        >
          <Text className="text-dark-text-secondary font-semibold">← Change Phone Number</Text>
        </TouchableOpacity>

        {/* Helper Text */}
        <Text className="text-xs text-dark-text-muted text-center mt-6 px-8">
          Didn&apos;t receive the code? Check your phone or try resending
        </Text>
      </View>
    </View>
  );
}
