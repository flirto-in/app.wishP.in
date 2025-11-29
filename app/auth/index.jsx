import { useRouter } from 'expo-router';
import { useContext, useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../src/context/AuthContext';

// Country codes with their phone number formats
const COUNTRIES = [
  // {code: '+1', name: 'US/Canada', flag: '🇺🇸', minLength: 10, maxLength: 10,   format: '(XXX) XXX-XXXX',  },
  // { code: '+44', name: 'UK', flag: '🇬🇧', minLength: 10, maxLength: 10, format: 'XXXX XXX XXX' },
  { code: '+91', name: 'India', flag: '🇮🇳', minLength: 10, maxLength: 10, format: 'XXXXX XXXXX' },
  // { code: '+86', name: 'China', flag: '🇨🇳', minLength: 11, maxLength: 11, format: 'XXX XXXX XXXX' },
  // { code: '+81', name: 'Japan', flag: '🇯🇵', minLength: 10, maxLength: 10, format: 'XX XXXX XXXX' },
  // { code: '+61', name: 'Australia', flag: '🇦🇺', minLength: 9, maxLength: 9, format: 'XXX XXX XXX' },
  // {
  //   code: '+49',
  //   name: 'Germany',
  //   flag: '🇩🇪',
  //   minLength: 10,
  //   maxLength: 11,
  //   format: 'XXX XXXXXXXX',
  // },
  // { code: '+33', name: 'France', flag: '🇫🇷', minLength: 9, maxLength: 9, format: 'X XX XX XX XX' },
];

export default function AuthScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(
    COUNTRIES[0] || {
      code: '+91',
      name: 'India',
      flag: '🇮🇳',
      minLength: 10,
      maxLength: 10,
      format: 'XXXXX XXXXX',
    },
  ); // Default to India with fallback
  const authContext = useContext(AuthContext);
  const sendOTP =
    authContext?.sendOTP || (() => ({ success: false, error: 'Auth service not available' }));
  const router = useRouter();

  // Format phone number according to country
  const formatPhoneNumber = (text, country) => {
    // Add safety check
    if (!country || !country.maxLength) return text.replace(/\D/g, '').slice(0, 10);

    // Remove all non-numeric characters
    const cleaned = text.replace(/\D/g, '');

    // Limit to max length
    const limited = cleaned.slice(0, country.maxLength);

    return limited;
  };

  const handlePhoneChange = (text) => {
    const formatted = formatPhoneNumber(text, selectedCountry);
    setPhone(formatted);
  };

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setShowCountryPicker(false);
    setPhone(''); // Clear phone when country changes
  };

  const handleSendOTP = async () => {
    // Add safety checks
    if (!selectedCountry || !selectedCountry.minLength || !selectedCountry.code) {
      Alert.alert('Error', 'Please select a valid country');
      return;
    }

    if (phone.length < selectedCountry.minLength) {
      Alert.alert(
        'Error',
        `Please enter a valid ${selectedCountry.name || 'phone'} number (${selectedCountry.minLength} digits)`,
      );
      return;
    }

    const fullPhoneNumber = selectedCountry.code.replace('+', '') + phone;

    setLoading(true);
    const result = await sendOTP(fullPhoneNumber);
    setLoading(false);

    if (result.success) {
      router.push({
        pathname: '/auth/verify',
        params: { phone: fullPhoneNumber },
      });
    } else {
      Alert.alert('Error', result.error);
    }
  };

  return (
    <View className="flex-1 bg-dark-bg dark">
      <View className="flex-1 justify-center px-6">
        {/* Header */}
        <View className="items-center mb-10">
          <View className="w-20 h-20 bg-dark-accent-blue rounded-full items-center justify-center mb-4 shadow-lg">
            <Ionicons name="chatbubbles" size={40} color="#fff" />
          </View>
          <Text className="text-3xl font-bold text-dark-text-primary mb-2">Welcome</Text>
          <Text className="text-base text-dark-text-secondary text-center">
            Enter your phone number to get started
          </Text>
        </View>

        {/* Phone Input Card */}
        <View className="bg-dark-surface rounded-2xl p-6 shadow-xl border border-dark-border mb-6">
          <Text className="text-sm font-semibold text-dark-text-primary mb-3">Phone Number</Text>

          {/* Country Selector */}
          <TouchableOpacity
            onPress={() => setShowCountryPicker(!showCountryPicker)}
            className="flex-row items-center border border-dark-border rounded-xl p-4 mb-3 bg-dark-card"
            disabled={loading}
          >
            <Text className="text-2xl mr-2">{selectedCountry?.flag || '🇮🇳'}</Text>
            <Text className="text-base font-semibold text-dark-text-primary flex-1">
              {selectedCountry?.name || 'India'} ({selectedCountry?.code || '+91'})
            </Text>
            <Text className="text-dark-text-muted">▼</Text>
          </TouchableOpacity>

          {/* Country Picker Dropdown */}
          {showCountryPicker && (
            <View className="bg-dark-surface border border-dark-border rounded-xl mb-3 max-h-64 overflow-hidden shadow-lg">
              {COUNTRIES.map((country) => (
                <TouchableOpacity
                  key={country.code}
                  onPress={() => handleCountrySelect(country)}
                  className={`flex-row items-center p-4 border-b border-dark-border ${
                    selectedCountry?.code === country.code ? 'bg-dark-accent-blue/20' : ''
                  }`}
                >
                  <Text className="text-2xl mr-3">{country.flag}</Text>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-dark-text-primary">
                      {country.name}
                    </Text>
                    <Text className="text-xs text-dark-text-muted">
                      {country.code} • {country.format}
                    </Text>
                  </View>
                  {selectedCountry?.code === country.code && (
                    <Text className="text-dark-accent-blue text-xl">✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Phone Number Input */}
          <View className="flex-row items-center border border-dark-border rounded-xl bg-dark-card overflow-hidden">
            <View className="px-4 py-4 bg-dark-border/30 border-r border-dark-border">
              <Text className="text-base font-semibold text-dark-text-secondary">
                {selectedCountry?.code || '+91'}
              </Text>
            </View>
            <TextInput
              placeholder={selectedCountry?.format || 'XXXXX XXXXX'}
              placeholderTextColor="#808080"
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="number-pad"
              editable={!loading}
              maxLength={selectedCountry?.maxLength || 10}
              className="flex-1 px-4 py-4 text-base text-dark-text-primary"
            />
          </View>

          {/* Helper Text */}
          <Text className="text-xs text-dark-text-muted mt-2">
            {phone.length}/{selectedCountry?.maxLength || 10} digits • Min:{' '}
            {selectedCountry?.minLength || 10}
          </Text>
        </View>

        {/* Send OTP Button */}
        <TouchableOpacity
          onPress={handleSendOTP}
          disabled={loading || phone.length < (selectedCountry?.minLength || 10)}
          className={`rounded-xl py-4 items-center shadow-lg ${
            loading || phone.length < (selectedCountry?.minLength || 10)
              ? 'bg-dark-border'
              : 'bg-dark-accent-blue'
          }`}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white text-base font-bold">Send OTP</Text>
          )}
        </TouchableOpacity>

        {/* Test Credentials Info */}
        <View className="bg-blue-900/20 border border-blue-700 rounded-xl p-4 mt-4">
          <Text className="text-xs text-blue-400 font-semibold mb-1">
            🎮 Play Store Test Account:
          </Text>
          <Text className="text-xs text-blue-300">
            Phone: <Text className="font-bold">+91 9852041676</Text> • OTP:{' '}
            <Text className="font-bold">7962</Text>
          </Text>
          <Text className="text-xs text-blue-400 mt-1">(Fixed OTP for review builds)</Text>
        </View>

        {/* Footer */}
        <Text className="text-xs text-dark-text-muted text-center mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );
}
