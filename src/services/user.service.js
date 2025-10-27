import * as SecureStore from 'expo-secure-store';
import api from './api';

export const userService = {
  // get user info if token is valid
  /**
   * @api /users/me    ✅
   * @method GET
   * @accept auth token from headers
   * @return user current profile data
   */

  checkAuth: async () => {
    try {
      const response = await api.get('/users/me');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};
