import * as SecureStore from 'expo-secure-store';
import { io } from 'socket.io-client';

// Network configuration - change based on your setup
const getSocketURL = () => {
  // For development, use localhost for web/emulator, network IP for physical device
  const NETWORK_IP = '10.59.76.54';
  const LOCALHOST_IP = 'localhost';

  // Using NETWORK_IP for physical device (Expo Go)
  const SERVER_IP = NETWORK_IP; // Use LOCALHOST_IP for web/emulator

  return `http://${SERVER_IP}:8000`;
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

      if (!token) {
        console.error('❌ No token found for socket connection');
        return false;
      }

      // Disconnect existing socket if any
      if (this.socket) {
        this.disconnect();
      }

      console.log('🔌 Connecting to socket...', SOCKET_URL);
      console.log(
        '🔑 Using token:',
        token ? 'Token found (length: ' + token.length + ')' : 'NO TOKEN',
      );

      // Return a promise that resolves when socket is connected
      return new Promise((resolve, reject) => {
        this.socket = io(SOCKET_URL, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
          timeout: 10000,
        });

        // Setup default event listeners
        this.setupDefaultListeners();

        // Wait for actual connection
        this.socket.once('connect', () => {
          console.log('✅ Socket connection established');
          resolve(true);
        });

        this.socket.once('connect_error', (error) => {
          console.error('❌ Socket connection failed:', error);
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
      console.error('❌ Socket connection error:', error);
      return false;
    }
  }

  /**
   * Setup default socket event listeners
   */
  setupDefaultListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Socket connected');
      this.isConnected = true;
      this.emit('connection_status', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      this.isConnected = false;
      this.emit('connection_status', { connected: false, reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      this.isConnected = false;
      this.emit('connection_error', error);
    });

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      this.emit('socket_error', error);
    });
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting socket...');
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
      console.warn('⚠️ Socket not connected, cannot listen to:', event);
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
      console.warn('⚠️ Socket not connected, cannot emit:', event);
      console.log('🔍 Socket state:', {
        hasSocket: !!this.socket,
        isConnected: this.isConnected,
        socketConnected: this.socket?.connected,
      });
      return;
    }

    console.log('📡 Emitting socket event:', event, 'Data:', data);
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
