import { useRouter } from 'expo-router';
import { useContext, useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AuthContext } from '../../src/context/AuthContext';

// Country codes with their phone number formats
const COUNTRIES = [
  {
    code: '+1',
    name: 'US/Canada',
    flag: '🇺🇸',
    minLength: 10,
    maxLength: 10,
    format: '(XXX) XXX-XXXX',
  },
  { code: '+44', name: 'UK', flag: '🇬🇧', minLength: 10, maxLength: 10, format: 'XXXX XXX XXX' },
  { code: '+91', name: 'India', flag: '🇮🇳', minLength: 10, maxLength: 10, format: 'XXXXX XXXXX' },
  { code: '+86', name: 'China', flag: '🇨🇳', minLength: 11, maxLength: 11, format: 'XXX XXXX XXXX' },
  { code: '+81', name: 'Japan', flag: '🇯🇵', minLength: 10, maxLength: 10, format: 'XX XXXX XXXX' },
  { code: '+61', name: 'Australia', flag: '🇦🇺', minLength: 9, maxLength: 9, format: 'XXX XXX XXX' },
  {
    code: '+49',
    name: 'Germany',
    flag: '🇩🇪',
    minLength: 10,
    maxLength: 11,
    format: 'XXX XXXXXXXX',
  },
  { code: '+33', name: 'France', flag: '🇫🇷', minLength: 9, maxLength: 9, format: 'X XX XX XX XX' },
];

export default function AuthScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[2]); // Default to India
  const { sendOTP } = useContext(AuthContext);
  const router = useRouter();

  // Format phone number according to country
  const formatPhoneNumber = (text, country) => {
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
    if (phone.length < selectedCountry.minLength) {
      Alert.alert(
        'Error',
        `Please enter a valid ${selectedCountry.name} phone number (${selectedCountry.minLength} digits)`,
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
    <View className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100">
      <View className="flex-1 justify-center px-6">
        {/* Header */}
        <View className="items-center mb-10">
          <View className="w-20 h-20 bg-blue-500 rounded-full items-center justify-center mb-4">
            <Text className="text-4xl">💬</Text>
          </View>
          <Text className="text-3xl font-bold text-gray-800 mb-2">Welcome</Text>
          <Text className="text-base text-gray-600 text-center">
            Enter your phone number to get started
          </Text>
        </View>

        {/* Phone Input Card */}
        <View className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <Text className="text-sm font-semibold text-gray-700 mb-3">Phone Number</Text>

          {/* Country Selector */}
          <TouchableOpacity
            onPress={() => setShowCountryPicker(!showCountryPicker)}
            className="flex-row items-center border border-gray-300 rounded-xl p-4 mb-3 bg-gray-50"
            disabled={loading}
          >
            <Text className="text-2xl mr-2">{selectedCountry.flag}</Text>
            <Text className="text-base font-semibold text-gray-800 flex-1">
              {selectedCountry.name} ({selectedCountry.code})
            </Text>
            <Text className="text-gray-400">▼</Text>
          </TouchableOpacity>

          {/* Country Picker Dropdown */}
          {showCountryPicker && (
            <View className="bg-white border border-gray-200 rounded-xl mb-3 max-h-64 overflow-hidden">
              {COUNTRIES.map((country) => (
                <TouchableOpacity
                  key={country.code}
                  onPress={() => handleCountrySelect(country)}
                  className={`flex-row items-center p-4 border-b border-gray-100 ${
                    selectedCountry.code === country.code ? 'bg-blue-50' : ''
                  }`}
                >
                  <Text className="text-2xl mr-3">{country.flag}</Text>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-800">{country.name}</Text>
                    <Text className="text-xs text-gray-500">
                      {country.code} • {country.format}
                    </Text>
                  </View>
                  {selectedCountry.code === country.code && (
                    <Text className="text-blue-500 text-xl">✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Phone Number Input */}
          <View className="flex-row items-center border border-gray-300 rounded-xl bg-gray-50 overflow-hidden">
            <View className="px-4 py-4 bg-gray-100 border-r border-gray-300">
              <Text className="text-base font-semibold text-gray-700">{selectedCountry.code}</Text>
            </View>
            <TextInput
              placeholder={selectedCountry.format}
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="number-pad"
              editable={!loading}
              maxLength={selectedCountry.maxLength}
              className="flex-1 px-4 py-4 text-base text-gray-800"
            />
          </View>

          {/* Helper Text */}
          <Text className="text-xs text-gray-500 mt-2">
            {phone.length}/{selectedCountry.maxLength} digits • Min: {selectedCountry.minLength}
          </Text>
        </View>

        {/* Send OTP Button */}
        <TouchableOpacity
          onPress={handleSendOTP}
          disabled={loading || phone.length < selectedCountry.minLength}
          className={`rounded-xl py-4 items-center shadow-md ${
            loading || phone.length < selectedCountry.minLength ? 'bg-gray-300' : 'bg-blue-500'
          }`}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-base font-bold">Send OTP</Text>
          )}
        </TouchableOpacity>

        {/* Footer */}
        <Text className="text-xs text-gray-500 text-center mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );
}
