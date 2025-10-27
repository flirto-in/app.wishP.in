import { createContext, useCallback, useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { userService } from '../services/user.service';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on app start
  useEffect(() => {
    checkStoredSession();
  }, []);

  const checkStoredSession = async () => {
    try {
      const userData = await authService.checkAuth();
      if (userData) {
        setUser(userData);
      }
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendOTP = async (phoneNumber) => {
    try {
      const response = await authService.sendOTP(phoneNumber);
      console.log('📤 OTP sent:', response);
      return { success: true };
    } catch (error) {
      console.error('❌ Send OTP error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send OTP',
      };
    }
  };

  const verifyOTP = async (phoneNumber, otp) => {
    try {
      const response = await authService.verifyOTP(phoneNumber, otp);
      console.log('📱 Verify response:', response);

      // ✅ FIXED: Check correct response structure based on your API
      // Your API returns: { success: true, data: { user: {...}, accessToken: "..." } }
      if (response.success && response.data?.user) {
        setUser(response.data.user);
        return { success: true, user: response.data.user };
      } else {
        return {
          success: false,
          error: response.message || 'Verification failed',
        };
      }
    } catch (error) {
      console.error('❌ Verify OTP error:', error);
      return {
        success: false,
        error: error.message || 'Invalid OTP',
      };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear user state even if API fails
      setUser(null);
    }
  };

  const getUser = useCallback(async () => {
    try {
      const response = await userService.checkAuth();
      console.log('📱 User data response:', response);

      // Based on your API response structure: { success: true, data: { user: {...} } }
      if (response.success && response.data?.user) {
        setUser(response.data.user); // Update context with fresh user data
        return response.data.user;
      }
      return null;
    } catch (error) {
      console.error('❌ Get user error:', error);
      throw error.response?.data || error;
    }
  }, []); // Empty deps - this function doesn't depend on any external values

  const updateUserProfile = useCallback(async (description) => {
    try {
      const response = await userService.updateProfile(description);
      console.log('📱 Update profile response:', response);

      if (response.success && response.data?.user) {
        setUser(response.data.user); // Update context with new user data
        return response.data.user;
      }
      throw new Error(response.message || 'Failed to update profile');
    } catch (error) {
      console.error('❌ Update profile error:', error);
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        sendOTP,
        verifyOTP,
        logout,
        getUser,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
