import * as SecureStore from 'expo-secure-store';
import api from './api';
import logger from '../utils/logger';

export const authService = {
  // Send OTP to phone number
  sendOTP: async (phoneNumber) => {
    try {
      logger.log('📤 Sending OTP to:', phoneNumber);
      const response = await api.post('/auth/send-otp', {
        phoneNumber,
      });
      logger.log('✅ OTP sent successfully');
      return response.data;
    } catch (error) {
      logger.error('❌ Send OTP failed:', error.response?.data || error.message);
      throw error.response?.data || error;
    }
  },

  // Verify OTP and get token
  verifyOTP: async (phoneNumber, otp) => {
    try {
      logger.log('🔄 Verifying OTP for:', phoneNumber);

      // Clear any old token before verification
      await SecureStore.deleteItemAsync('userToken');
      logger.log('🗑️ Old token cleared');

      // Generate or retrieve device ID
      let deviceId = await SecureStore.getItemAsync('deviceId');
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        await SecureStore.setItemAsync('deviceId', deviceId);
        logger.log('🆕 New device ID generated:', deviceId);
      } else {
        logger.log('📱 Existing device ID:', deviceId);
      }

      const response = await api.post('/auth/authentication', {
        phoneNumber,
        otp, // Send as string, not parseInt
        deviceId, // Send device ID for single device login tracking
      });

      logger.log('✅ API Response:', JSON.stringify(response.data, null, 2));

      // Save token to SecureStore
      if (response.data.success && response.data.data?.accessToken) {
        const token = response.data.data.accessToken;
        await SecureStore.setItemAsync('userToken', token);
        logger.log('🔐 Token saved to SecureStore:', token.substring(0, 20) + '...');

        // Verify token was saved
        const savedToken = await SecureStore.getItemAsync('userToken');
        if (savedToken) {
          logger.log('✅ Token verified in SecureStore');
        } else {
          logger.error('❌ Token NOT found in SecureStore after save!');
        }
      } else {
        logger.warn('⚠️ No token in response');
      }

      return response.data;
    } catch (error) {
      logger.error('❌ Verify OTP Error:', error.response?.data || error.message);
      throw error.response?.data || error;
    }
  },

  // Check if user has valid token and restore session
  checkAuth: async () => {
    try {
      logger.log('🔍 Checking for existing token...');
      const token = await SecureStore.getItemAsync('userToken');

      if (!token) {
        logger.log('❌ No token found in SecureStore');
        return null;
      }

      logger.log('✅ Token found:', token.substring(0, 20) + '...');
      logger.log('📡 Fetching user profile from /users/me...');

      // Fetch user profile using the token
      const response = await api.get('/users/me');
      logger.log('✅ User profile retrieved:', response.data);

      // Return user data based on your API structure
      if (response.data.success && response.data.data?.user) {
        logger.log('✅ User authenticated:', response.data.data.user.U_Id);
        return response.data.data.user;
      }

      logger.warn('⚠️ Unexpected response structure');
      return null;
    } catch (error) {
      logger.error('❌ Auth check failed:', error.response?.data || error.message);
      logger.log('🗑️ Deleting invalid token...');
      await SecureStore.deleteItemAsync('userToken');
      return null;
    }
  },

  // Logout and clear token
  logout: async () => {
    try {
      logger.log('🚪 Logging out...');

      // Delete token from SecureStore
      await SecureStore.deleteItemAsync('userToken');
      logger.log('🗑️ Token deleted from SecureStore');

      // Verify deletion
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        logger.log('✅ Token successfully removed');
      } else {
        logger.error('❌ Token still exists after deletion!');
      }

      // Optional: Call backend logout endpoint if you have one
      // await api.post('/auth/logout');
    } catch (error) {
      logger.error('❌ Logout error:', error);
      // Still try to delete token even if error
      await SecureStore.deleteItemAsync('userToken');
      throw error;
    }
  },
};
