import * as SecureStore from 'expo-secure-store';
import api from './api';

export const authService = {
  // Send OTP to phone number
  sendOTP: async (phoneNumber) => {
    try {
      const response = await api.post('/auth/send-otp', {
        phoneNumber,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Verify OTP and get token
  verifyOTP: async (phoneNumber, otp) => {
    try {
      // Clear any old token before verification
      await SecureStore.deleteItemAsync('userToken');

      const response = await api.post('/auth/authentication', {
        phoneNumber,
        otp: parseInt(otp, 10), // ✅ Convert OTP to number
      });

      console.log('✅ Full API Response:', JSON.stringify(response.data, null, 2));

      // Save token - check the exact response structure from your API
      if (response.data.data?.accessToken) {
        await SecureStore.setItemAsync('userToken', response.data.data.accessToken);
        console.log('🔐 Token saved successfully');
      }

      // Return the full response for context to handle
      return response.data;
    } catch (error) {
      console.error('❌ Verify OTP Error:', error.response?.data || error.message);
      throw error.response?.data || error;
    }
  },

  // Logout
  logout: async () => {
    try {
      await SecureStore.deleteItemAsync('userToken');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  // Check if user has valid token
  checkAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        console.log('❌ No token found');
        return null;
      }

      console.log('✅ Token found, checking auth...');
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      await SecureStore.deleteItemAsync('userToken');
      return null;
    }
  },
};
