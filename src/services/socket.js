import * as SecureStore from 'expo-secure-store';
import { io } from 'socket.io-client';
import logger from '../utils/logger';

// Socket server configuration from environment variables
const getSocketURL = () => {
  const socketURL = process.env.EXPO_PUBLIC_SOCKET_URL;

  if (!socketURL) {
    logger.error('❌ EXPO_PUBLIC_SOCKET_URL is not defined in .env file');
    throw new Error('Socket URL not configured. Please check your .env file.');
  }

  return socketURL;
};

const SOCKET_URL = getSocketURL();

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  /**
   * Initialize and connect socket with authentication token
   */
  async connect() {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const deviceId = await SecureStore.getItemAsync('deviceId'); // ✅ FIX: Get device ID

      if (!token) {
        logger.error('❌ No token found, cannot connect socket');
        return false;
      }

      // Disconnect existing socket if any
      if (this.socket) {
        this.disconnect();
      }

      logger.log('🔌 Connecting to socket with token...', SOCKET_URL);
      logger.log(
        '🔑 Using token:',
        token ? 'Token found (length: ' + token.length + ')' : 'NO TOKEN',
      );
      logger.log(
        '📱 Using deviceId:',
        deviceId ? 'Device ID found (length: ' + deviceId.length + ')' : 'NO DEVICE ID',
      );

      // Return a promise that resolves when socket is connected
      return new Promise((resolve, reject) => {
        this.socket = io(SOCKET_URL, {
          auth: { token, deviceId }, // ✅ FIX: Send device ID for verification
          transports: ['websocket', 'polling'], // WebSocket first, polling as fallback
          reconnection: true,
          reconnectionDelay: 1000, // 1 second delay between reconnection attempts
          reconnectionDelayMax: 5000, // Max delay of 5 seconds
          reconnectionAttempts: 5, // More attempts for reliability
          timeout: 20000, // 20 second timeout
          forceNew: false, // Reuse existing connection if possible
          autoConnect: true,
        }); // Setup default event listeners
        this.setupDefaultListeners();

        // Wait for actual connection
        this.socket.once('connect', () => {
          logger.log('✅ Socket connection established');
          resolve(true);
        });

        this.socket.once('connect_error', (error) => {
          logger.error('❌ Socket connection failed:', error);
          reject(error);
        });

        // Timeout after 15 seconds
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Socket connection timeout'));
          }
        }, 15000);
      });
    } catch (error) {
      logger.error('❌ Socket connection error:', error);
      return false;
    }
  }

  /**
   * Setup default socket event listeners
   */
  setupDefaultListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      logger.log('✅ Socket connected');
      this.isConnected = true;
      this.emit('connection_status', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      if (reason === 'transport error' || reason === 'ping timeout') {
        logger.warn('⚠️ Socket disconnected due to transport error - reconnecting...');
      } else {
        logger.warn('🔌 Socket disconnected:', reason); // Changed from log to warn
      }
      this.isConnected = false;
      this.emit('connection_status', { connected: false, reason });
    });

    this.socket.on('connect_error', (error) => {
      logger.error('❌ Socket connection error:', error.message);
      this.isConnected = false;
      this.emit('connection_error', error);
      this.emit('connection_status', { connected: false }); // Added this line

      // ✅ FIX: Handle device login conflict
      if (error.message === 'Logged in from another device') {
        logger.warn('⚠️ Logged in from another device - clearing local session');
        this.emit('force:logout', {
          reason: 'Logged in from another device',
          message: 'You have been logged out because you logged in on another device',
        });
      }
    });

    this.socket.on('error', (error) => {
      logger.error('❌ Socket error:', error);
      this.emit('socket_error', error);
    });

    // ✅ FIX: Handle force logout from another device
    this.socket.on('force:logout', (data) => {
      logger.warn('🚪 Force logout:', data.reason);
      this.emit('force:logout', data);
    });

    // E2EE session initialization handler
    this.socket.on('e2ee:init-session', (data) => {
      logger.log('🔐 E2EE session initialization received:', data);
      this.emit('e2ee:init-session', data);
    });

    // Force logout handler (single device login)
    this.socket.on('force:logout', (data) => {
      logger.log('🚪 Force logout received:', data);
      this.emit('force:logout', data);
    });
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      logger.log('🔌 Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  /**
   * Subscribe to a socket event
   * @param {string} event - Event name
   * @param {function} callback - Callback function
   */
  on(event, callback) {
    if (!this.socket) {
      logger.warn('⚠️ Socket not connected, cannot listen to:', event);
      return;
    }

    // Store listener for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    this.socket.on(event, callback);
  }

  /**
   * Unsubscribe from a socket event
   * @param {string} event - Event name
   * @param {function} callback - Callback function (optional)
   */
  off(event, callback) {
    if (!this.socket) return;

    if (callback) {
      this.socket.off(event, callback);

      // Remove from listeners map
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    } else {
      this.socket.off(event);
      this.listeners.delete(event);
    }
  }

  /**
   * Emit a socket event
   * @param {string} event - Event name
   * @param {any} data - Data to send
   */
  emit(event, data) {
    if (!this.socket || !this.isConnected) {
      logger.warn('⚠️ Socket not connected, cannot emit:', event);
      logger.log('🔍 Socket state:', {
        hasSocket: !!this.socket,
        isConnected: this.isConnected,
        socketConnected: this.socket?.connected,
      });
      return;
    }

    logger.log('📡 Emitting socket event:', event, 'Data:', data);
    this.socket.emit(event, data);
  }

  /**
   * Send a message
   * @param {string} receiverId - Receiver user ID
   * @param {string} text - Message text
   * @param {string} messageType - Message type (default: 'text')
   * @param {string} roomId - Room ID for public rooms (optional)
   * @param {object} selfDestruct - Self destruct settings (optional)
   */
  sendMessage(receiverId, text, messageType = 'text', roomId = null, selfDestruct = null) {
    const messageData = {
      text,
      messageType,
    };

    if (roomId) {
      messageData.roomId = roomId;
      if (receiverId) {
        messageData.receiverId = receiverId;
      }
    } else {
      messageData.receiverId = receiverId;
    }

    if (selfDestruct && selfDestruct.enabled) {
      messageData.selfDestruct = selfDestruct;
    }

    this.emit('message:send', messageData);
  }

  /**
   * Join a room
   * @param {string} roomId - Room ID to join
   */
  joinRoom(roomId) {
    this.emit('room:join', { roomId });
  }

  /**
   * Leave a room
   * @param {string} roomId - Room ID to leave
   */
  leaveRoom(roomId) {
    this.emit('room:leave', { roomId });
  }

  /**
   * Mark message as read
   * @param {string} messageId - Message ID
   * @param {string} senderId - Sender user ID
   */
  markMessageAsRead(messageId, senderId) {
    this.emit('message:read', {
      messageId,
      senderId,
    });
  }

  /**
   * Start typing indicator
   * @param {string} receiverId - Receiver user ID
   */
  startTyping(receiverId) {
    this.emit('typing:start', { receiverId });
  }

  /**
   * Stop typing indicator
   * @param {string} receiverId - Receiver user ID
   */
  stopTyping(receiverId) {
    this.emit('typing:stop', { receiverId });
  }

  /**
   * React to a message
   * @param {string} messageId - Message ID
   * @param {string} emoji - Emoji reaction
   */
  reactToMessage(messageId, emoji) {
    this.emit('message:react', { messageId, emoji });
  }

  /**
   * Check if socket is connected
   */
  isSocketConnected() {
    return this.isConnected && this.socket?.connected;
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
