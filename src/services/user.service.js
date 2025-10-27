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
};
