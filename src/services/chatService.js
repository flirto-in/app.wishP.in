import api from './api';

export const chatService = {
  // Get all chats
  getChats: async () => {
    try {
      const response = await api.get('/chats');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Create temporary chat
  createTempChat: async (mood) => {
    try {
      const response = await api.post('/chats/temp', {
        mood: mood,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Send message
  sendMessage: async (chatId, message) => {
    try {
      const response = await api.post(`/chats/${chatId}/messages`, {
        message: message,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get messages for a chat
  getMessages: async (chatId) => {
    try {
      const response = await api.get(`/chats/${chatId}/messages`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};
