import api from './api';

export const keyService = {
  /**
   * Upload prekey bundle to server
   * @param {object} bundle - { identityKey, signedPrekey, oneTimePrekeys }
   */
  uploadPrekeyBundle: async (bundle) => {
    try {
      const response = await api.post('/keys/prekeys', bundle);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Fetch prekey bundle for a user
   * @param {string} userId
   */
  fetchPrekeyBundle: async (userId) => {
    try {
      const response = await api.get(`/keys/prekeys/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Check key status
   */
  getKeyStatus: async () => {
    try {
      const response = await api.get('/keys/status');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};
