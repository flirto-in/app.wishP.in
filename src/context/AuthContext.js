import { createContext, useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { authService } from '../services/authService';
import { userService } from '../services/user.service';
import { keyService } from '../services/keyService';
import { socketService } from '../services/socket';
import signalProtocol from '../services/signalProtocol'; // ✅ NEW: For background key generation

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on app start and setup force logout listener
  useEffect(() => {
    console.log('🔄 App mounted - checking for existing session...');
    checkStoredSession();

    // ✅ FIX: Listen for force logout from another device
    const handleForceLogout = (data) => {
      console.log('🚪 Force logout event received:', data);
      Alert.alert(
        'Logged Out',
        data.message || 'You have been logged out because you logged in on another device',
        [
          {
            text: 'OK',
            onPress: () => {
              logout();
            },
          },
        ],
        { cancelable: false },
      );
    };

    // Listen for force logout events
    socketService.on('force:logout', handleForceLogout);

    // Cleanup
    return () => {
      socketService.off('force:logout', handleForceLogout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ... imports

  // ✅ NEW: Generate E2EE keys in background after login
  const generateKeysInBackground = async () => {
    try {
      console.log('🔑 Checking/Generating E2EE keys in background...');
      // This will check if keys exist, if not generate and upload them
      const bundle = await signalProtocol.generatePrekeyBundle();

      if (bundle) {
        console.log('📤 Uploading E2EE keys to server...');
        await keyService.uploadPrekeyBundle(bundle);
        console.log('✅ E2EE keys uploaded successfully');
      }
    } catch (error) {
      console.warn('⚠️ Background key generation/upload failed:', error);
    }
  };

  const checkStoredSession = useCallback(async () => {
    try {
      console.log('🔍 Checking stored session...');
      const userData = await authService.checkAuth();

      if (userData) {
        console.log('✅ Session restored for user:', userData.U_Id);
        setUser(userData);
        // Trigger background key generation
        generateKeysInBackground();
      } else {
        console.log('❌ No valid session found');
      }
    } catch (error) {
      console.error('❌ Session check failed:', error);
    } finally {
      setIsLoading(false);
      console.log('✅ Auth check complete');
    }
  }, []);

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
        // Trigger background key generation
        generateKeysInBackground();
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
      console.log('🚪 Logout initiated...');
      await authService.logout();
      setUser(null);
      console.log('✅ User logged out successfully');
    } catch (error) {
      console.error('❌ Logout error:', error);
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

  const updateUserProfile = useCallback(async ({ about, avatarId }) => {
    try {
      const response = await userService.updateProfile({ about, avatarId });
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
