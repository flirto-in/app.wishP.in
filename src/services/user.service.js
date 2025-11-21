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

  /**
   * @api /users/updateUserProfile    ✅
   * @method PATCH
   * @accept auth token from headers
   * @accept body: {description}
   * @return updated user profile data
   */
  updateProfile: async (description) => {
    try {
      const response = await api.patch('/users/updateUserProfile', {
        description,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * @api /messages/search?uid=:uId    ✅
   * @method GET
   * @accept auth token from headers
   * @param uId - User ID to search for
   * @return user profile data (name, avatar, bio)
   */
  getUserByUId: async (uId) => {
    try {
      const response = await api.get(`/messages/search?uid=${encodeURIComponent(uId)}`);
      console.log('====================================');
      console.log(response.data);
      console.log('====================================');
      return response.data?.data?.user || response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * @api /users/push-token
   * @method POST
   * @accept auth token from headers
   * @param token - Expo push token
   * @return success response
   */
  registerPushToken: async (token) => {
    try {
      const response = await api.post('/users/push-token', { pushToken: token });
      return response.data;
    } catch (error) {
      console.error('Failed to register push token:', error.message || 'Unknown error');

      // Log detailed error info for debugging
      if (error.response) {
        console.error('Backend error:', {
          status: error.response.status,
          data: error.response.data,
        });
      }

      throw error.response?.data || error;
    }
  },
};
