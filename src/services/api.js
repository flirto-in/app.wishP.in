import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Network configuration - change based on your setup
const getServerURL = () => {
  // For development, use localhost for web/emulator, network IP for physical device
  // Change this IP to your actual network IP when testing on physical device
  const NETWORK_IP = '10.59.76.54';
  // Removed unused LOCALHOST_IP to satisfy lint rule

  // Using NETWORK_IP for physical device (Expo Go)
  const SERVER_IP = NETWORK_IP; // Use 'localhost' for web/emulator if needed

  return `http://${SERVER_IP}:8000/api/v1`;
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

      console.log('📤 Request:', config.method.toUpperCase(), config.url);
      return config;
    } catch (error) {
      console.error('Error in request interceptor:', error);
      return config;
    }
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  },
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => {
    console.log('✅ Response:', response.status, response.config.url);
    return response;
  },
  async (error) => {
    // Handle different error scenarios
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      console.error('❌ HTTP Error:', status, error.config.url);

      switch (status) {
        case 401:
          // Unauthorized - token expired or invalid
          console.log('🔒 Unauthorized - clearing token');
          await SecureStore.deleteItemAsync('userToken');
          // You can trigger logout here or refresh token
          break;

        case 403:
          // Forbidden
          console.error('🚫 Forbidden:', data.message);
          break;

        case 404:
          // Not found
          console.error('🔍 Not found:', error.config.url);
          break;

        case 500:
          // Server error
          console.error('🔥 Server error:', data.message);
          break;

        default:
          console.error('Error:', data.message || 'Unknown error');
      }
    } else if (error.request) {
      // Request made but no response (network error)
      console.error('🌐 Network error - no response received');
    } else {
      // Error setting up the request
      console.error('⚙️ Request setup error:', error.message);
    }

    return Promise.reject(error);
  },
);

export default api;
