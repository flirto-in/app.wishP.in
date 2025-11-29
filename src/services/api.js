import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import logger from '../utils/logger';

// API server configuration from environment variables
const getServerURL = () => {
  const baseURL = process.env.EXPO_PUBLIC_API_URL;

  if (!baseURL) {
    logger.error('❌ EXPO_PUBLIC_API_URL is not defined in .env file');
    throw new Error('API URL not configured. Please check your .env file.');
  }

  return `${baseURL}/api/v1`;
};

// Create axios instance with base configuration
const api = axios.create({
  baseURL: getServerURL(), // Dynamic server URL
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor - Automatically add auth token to requests
api.interceptors.request.use(
  async (config) => {
    try {
      // Skip auth header for authentication endpoints
      const isAuthEndpoint =
        config.url?.includes('/auth/authentication') ||
        config.url?.includes('/auth/send-otp') ||
        config.url?.includes('/auth/temp-session');

      if (!isAuthEndpoint) {
        // Get token from secure storage
        const token = await SecureStore.getItemAsync('userToken');

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }

      logger.log('📤 Request:', config.method.toUpperCase(), config.url);
      return config;
    } catch (error) {
      logger.error('Error in request interceptor:', error);
      return config;
    }
  },
  (error) => {
    logger.error('Request error:', error);
    return Promise.reject(error);
  },
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => {
    logger.log('✅ Response:', response.status, response.config.url);
    return response;
  },
  async (error) => {
    // Handle different error scenarios
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      logger.error('❌ HTTP Error:', status, error.config.url);

      switch (status) {
        case 401:
          // Unauthorized - token expired or invalid
          logger.log('🔒 Unauthorized - clearing token');
          await SecureStore.deleteItemAsync('userToken');
          // You can trigger logout here or refresh token
          break;

        case 403:
          // Forbidden
          logger.error('🚫 Forbidden:', data.message);
          break;

        case 404:
          // Not found
          logger.error('🔍 Not found:', error.config.url);
          break;

        case 500:
          // Server error
          logger.error('🔥 Server error:', data.message);
          break;

        default:
          logger.error('Error:', data.message || 'Unknown error');
      }
    } else if (error.request) {
      // Request made but no response (network error)
      logger.error('🌐 Network error - no response received');
    } else {
      // Error setting up the request
      logger.error('⚙️ Request setup error:', error.message);
    }

    return Promise.reject(error);
  },
);

export default api;
