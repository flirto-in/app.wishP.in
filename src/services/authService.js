import * as SecureStore from 'expo-secure-store';
import api from './api';

export const authService = {
  // Send OTP to phone number
  sendOTP: async (phoneNumber) => {
    try {
      console.log('📤 Sending OTP to:', phoneNumber);
      const response = await api.post('/auth/send-otp', {
        phoneNumber,
      });
      console.log('✅ OTP sent successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Send OTP failed:', error.response?.data || error.message);
      throw error.response?.data || error;
    }
  },

  // Verify OTP and get token
  verifyOTP: async (phoneNumber, otp) => {
    try {
      console.log('🔄 Verifying OTP for:', phoneNumber);

      // Clear any old token before verification
      await SecureStore.deleteItemAsync('userToken');
      console.log('🗑️ Old token cleared');

      const response = await api.post('/auth/authentication', {
        phoneNumber,
        otp, // Send as string, not parseInt
      });

      console.log('✅ API Response:', JSON.stringify(response.data, null, 2));

      // Save token to SecureStore
      if (response.data.success && response.data.data?.accessToken) {
        const token = response.data.data.accessToken;
        await SecureStore.setItemAsync('userToken', token);
        console.log('🔐 Token saved to SecureStore:', token.substring(0, 20) + '...');

        // Verify token was saved
        const savedToken = await SecureStore.getItemAsync('userToken');
        if (savedToken) {
          console.log('✅ Token verified in SecureStore');
        } else {
          console.error('❌ Token NOT found in SecureStore after save!');
        }
      } else {
        console.warn('⚠️ No token in response');
      }

      return response.data;
    } catch (error) {
      console.error('❌ Verify OTP Error:', error.response?.data || error.message);
      throw error.response?.data || error;
    }
  },

  // Check if user has valid token and restore session
  checkAuth: async () => {
    try {
      console.log('🔍 Checking for existing token...');
      const token = await SecureStore.getItemAsync('userToken');

      if (!token) {
        console.log('❌ No token found in SecureStore');
        return null;
      }

      console.log('✅ Token found:', token.substring(0, 20) + '...');
      console.log('📡 Fetching user profile from /users/me...');

      // Fetch user profile using the token
      const response = await api.get('/users/me');
      console.log('✅ User profile retrieved:', response.data);

      // Return user data based on your API structure
      if (response.data.success && response.data.data?.user) {
        console.log('✅ User authenticated:', response.data.data.user.U_Id);
        return response.data.data.user;
      }

      console.warn('⚠️ Unexpected response structure');
      return null;
    } catch (error) {
      console.error('❌ Auth check failed:', error.response?.data || error.message);
      console.log('🗑️ Deleting invalid token...');
      await SecureStore.deleteItemAsync('userToken');
      return null;
    }
  },

  // Logout and clear token
  logout: async () => {
    try {
      console.log('🚪 Logging out...');

      // Delete token from SecureStore
      await SecureStore.deleteItemAsync('userToken');
      console.log('🗑️ Token deleted from SecureStore');

      // Verify deletion
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        console.log('✅ Token successfully removed');
      } else {
        console.error('❌ Token still exists after deletion!');
      }

      // Optional: Call backend logout endpoint if you have one
      // await api.post('/auth/logout');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Still try to delete token even if error
      await SecureStore.deleteItemAsync('userToken');
      throw error;
    }
  },
};
