import api from './api';

export const chatService = {
  /**
   * Get all chats (primary and secondary)
   * @api /messages/all
   * @method GET
   * @returns {Object} { primaryChat: [], secondaryChat: [] }
   */
  getChats: async () => {
    try {
      const response = await api.get('/messages/all');
      return response.data?.data || { primaryChat: [], secondaryChat: [] };
    } catch (error) {
      console.error('❌ Failed to load chats:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get messages for a specific user
   * @api /messages/:userId/messages
   * @method GET
   * @param {string} userId - User ID to get messages with
   * @returns {Object} { messages: [] }
   */
  getMessages: async (userId) => {
    try {
      const response = await api.get(`/messages/${userId}/messages`);
      return response.data?.data || { messages: [] };
    } catch (error) {
      console.error('❌ Failed to load messages:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Get messages for a specific room
   * @api /messages/room/:roomId
   * @method GET
   * @param {string} roomId - Room ID to get messages for
   * @returns {Object} { messages: [] }
   */
  getRoomMessages: async (roomId) => {
    try {
      const response = await api.get(`/messages/room/${roomId}`);
      return response.data?.data || { messages: [] };
    } catch (error) {
      console.error('❌ Failed to load room messages:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Search for a user by User ID
   * @api /messages/search?uid=:uId
   * @method GET
   * @param {string} uId - User ID to search
   * @returns {Object} { user: {} }
   */
  searchUser: async (uId) => {
    try {
      const response = await api.get(`/messages/search?uid=${encodeURIComponent(uId)}`);
      return response.data?.data || null;
    } catch (error) {
      console.error('❌ User search failed:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Delete message for self
   * @api /messages/:messageId/delete-for-me
   * @method DELETE
   * @param {string} messageId - Message ID to delete
   */
  deleteMessageForMe: async (messageId) => {
    try {
      const response = await api.delete(`/messages/${messageId}/delete-for-me`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to delete message:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Delete message for everyone
   * @api /messages/:messageId/delete-for-everyone
   * @method DELETE
   * @param {string} messageId - Message ID to delete
   */
  deleteMessageForEveryone: async (messageId) => {
    try {
      const response = await api.delete(`/messages/${messageId}/delete-for-everyone`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to delete message for everyone:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Move chat to primary section
   * @api /messages/:userId/move-to-primary
   * @method PUT
   * @param {string} userId - User ID to move to primary
   */
  moveToPrimary: async (userId) => {
    try {
      const response = await api.put(`/messages/${userId}/move-to-primary`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to move to primary:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Move chat to secondary section
   * @api /messages/:userId/move-to-secondary
   * @method PUT
   * @param {string} userId - User ID to move to secondary
   */
  moveToSecondary: async (userId) => {
    try {
      const response = await api.put(`/messages/${userId}/move-to-secondary`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to move to secondary:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Delete entire chat with user
   * @api /messages/:userId/delete-chat
   * @method DELETE
   * @param {string} userId - User ID to delete chat with
   */
  deleteChat: async (userId) => {
    try {
      const response = await api.delete(`/messages/${userId}/delete-chat`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to delete chat:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Clear all messages in chat
   * @api /messages/:userId/clear-chat
   * @method PUT
   * @param {string} userId - User ID to clear chat with
   */
  clearChat: async (userId) => {
    try {
      const response = await api.put(`/messages/${userId}/clear-chat`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to clear chat:', error);
      throw error.response?.data || error;
    }
  },

  /**
   * Toggle mute status for chat
   * @api /messages/:userId/mute
   * @method PUT
   * @param {string} userId - User ID to toggle mute
   */
  muteChat: async (userId) => {
    try {
      const response = await api.put(`/messages/${userId}/mute`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to toggle mute:', error);
      throw error.response?.data || error;
    }
  },
  /**
   * Create a temp session
   * @api /temp/session
   * @method POST
   */
  createTempSession: async () => {
    try {
      const response = await api.post('/temp/session');
      return response.data?.data;
    } catch (error) {
      console.error('❌ Failed to create temp session:', error);
      throw error.response?.data || error;
    }
  },
  /**
   * Join temp session by code
   * @api /temp/session/join
   * @method POST
   */
  joinTempSession: async (code) => {
    try {
      const response = await api.post('/temp/session/join', { code });
      return response.data?.data;
    } catch (error) {
      console.error('❌ Failed to join temp session:', error);
      throw error.response?.data || error;
    }
  },
  /**
   * End temp session
   * @api /temp/session/:id/end
   * @method POST
   */
  endTempSession: async (sessionId) => {
    try {
      const response = await api.post(`/temp/session/${sessionId}/end`);
      return response.data?.data;
    } catch (error) {
      console.error('❌ Failed to end temp session:', error);
      throw error.response?.data || error;
    }
  },
  /**
   * Get temp session messages
   * @api /temp/session/:id/messages
   * @method GET
   */
  getTempSessionMessages: async (sessionId) => {
    try {
      const response = await api.get(`/temp/session/${sessionId}/messages`);
      return response.data?.data || { messages: [] };
    } catch (error) {
      console.error('❌ Failed to load temp session messages:', error);
      throw error.response?.data || error;
    }
  },
  /**
   * Upload a file (normal chat or room). Supports E2EE encrypted files.
   * @api /messages/upload
   * @method POST multipart/form-data
   * @param {Object} params { fileUri, fileName, mimeType, receiverId?, roomId?, hideInTemp?, encryptedData? }
   */
  uploadFileMessage: async ({
    fileUri,
    fileName,
    mimeType,
    receiverId,
    roomId,
    hideInTemp = true,
    encryptedData = null, // { encryptedBlob, encryptedFileKey, fileNonce, originalName, mimeType }
  }) => {
    try {
      const formData = new FormData();

      // If file is encrypted, upload encrypted blob
      if (encryptedData) {
        console.log('📦 Preparing encrypted file upload...', encryptedData.originalName);

        // Convert base64 encrypted blob to blob for upload
        // Create a Blob from base64 encryptedBlob
        const encryptedBlobBase64 = encryptedData.encryptedBlob;

        // Convert base64 to binary
        const binaryString = atob(encryptedBlobBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        formData.append('file', {
          uri: `data:application/octet-stream;base64,${encryptedBlobBase64}`,
          name: `encrypted_${encryptedData.originalName}`,
          type: 'application/octet-stream', // Encrypted blobs are binary
        });

        // Add E2EE metadata
        formData.append('isEncrypted', 'true');
        formData.append('encryptedFileKey', JSON.stringify(encryptedData.encryptedFileKey));
        formData.append('fileNonce', encryptedData.fileNonce);
        formData.append('originalFileName', encryptedData.originalName);
        formData.append('fileMimeType', encryptedData.mimeType);

        console.log('✅ Encrypted file prepared for upload');
      } else {
        // Upload plaintext file (legacy or rooms)
        formData.append('file', {
          uri: fileUri,
          name: fileName || 'upload',
          type: mimeType || 'application/octet-stream',
        });
        formData.append('isEncrypted', 'false');
      }

      if (receiverId) formData.append('receiverId', receiverId);
      if (roomId) formData.append('roomId', roomId);
      if (hideInTemp) formData.append('hideInTemp', 'true');

      const response = await api.post('/messages/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log('✅ File uploaded to server:', response.data?.data?.message?.mediaUrl);
      return response.data?.data?.message;
    } catch (error) {
      console.error('❌ Failed to upload file message:', error);
      throw error.response?.data || error;
    }
  },
};
