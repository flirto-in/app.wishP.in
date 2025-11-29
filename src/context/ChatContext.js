import { useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { chatService } from '../services/chatService';
import notificationService from '../services/notificationService';
import { socketService } from '../services/socket';
import { userService } from '../services/user.service';
import {
  initializeE2EE,
  sendEncryptedMessage,
  receiveEncryptedMessage,
} from '../services/e2eeExample';
import { AuthContext } from './AuthContext';

export const ChatContext = createContext();

export function ChatProvider({ children }) {
  const { user } = useContext(AuthContext);
  const router = useRouter();

  // State
  const [chats, setChats] = useState([]);
  const [primaryChats, setPrimaryChats] = useState([]);
  const [secondaryChats, setSecondaryChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  // Temp session state
  const [activeTempSession, setActiveTempSession] = useState(null); // { sessionId, code, alias }
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pushToken, setPushToken] = useState(null);
  const [mutedChats, setMutedChats] = useState(new Set()); // Track muted chat IDs

  // E2EE is ALWAYS enabled - no toggle
  const e2eeEnabled = true;
  const [e2eeInitialized, setE2eeInitialized] = useState(false);

  // Ref to store current activeChat to avoid stale closures
  const activeChatRef = useRef(null); // Update ref whenever activeChat changes
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  /**
   * Initialize E2EE - Always enabled, auto-init on login
   */
  useEffect(() => {
    const initE2EE = async () => {
      try {
        // E2EE is ALWAYS enabled - initialize for all users
        if (user && !e2eeInitialized) {
          console.log('🔐 Auto-initializing E2EE for user:', user._id);
          await initializeE2EE();
          setE2eeInitialized(true);
          console.log('✅ E2EE initialized successfully - encryption ALWAYS ON');
        }
      } catch (error) {
        console.error('❌ E2EE initialization failed:', error);
        // Retry initialization after 5 seconds
        setTimeout(() => {
          if (user && !e2eeInitialized) {
            initE2EE();
          }
        }, 5000);
      }
    };

    if (user) {
      initE2EE();
    }
  }, [user, e2eeInitialized]);

  /**
   * Load all chats
   */
  const loadChats = useCallback(async () => {
    try {
      setLoading(true);
      console.log('📥 Loading chats from API...');
      const data = await chatService.getChats();

      console.log('📊 Raw API response:', {
        primaryCount: data.primaryChat?.length || 0,
        secondaryCount: data.secondaryChat?.length || 0,
      });

      setPrimaryChats(data.primaryChat || []);
      setSecondaryChats(data.secondaryChat || []);

      // Extract muted chat IDs for quick lookup
      const mutedIds = new Set();
      (data.primaryChat || []).forEach((chat) => {
        if (chat.isMuted) mutedIds.add(chat._id);
      });
      (data.secondaryChat || []).forEach((chat) => {
        if (chat.user?.isMuted) mutedIds.add(chat.user._id);
      });
      setMutedChats(mutedIds);

      // Combine all chats for easier access
      const allChats = [...(data.primaryChat || []), ...(data.secondaryChat || [])];
      setChats(allChats);

      console.log('✅ Chats loaded:', {
        total: allChats.length,
        primary: data.primaryChat?.length || 0,
        secondary: data.secondaryChat?.length || 0,
      });

      if (data.secondaryChat && data.secondaryChat.length > 0) {
        console.log(
          '📋 Secondary chats:',
          data.secondaryChat.map((c) => ({
            userId: c.user?._id,
            userName: c.user?.U_Id,
          })),
        );
      }
    } catch (error) {
      console.error('❌ Failed to load chats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load messages for a specific chat
   */
  const loadMessages = useCallback(
    async (userId) => {
      try {
        setLoading(true);
        const data = await chatService.getMessages(userId);
        setMessages(data.messages || []);

        console.log('✅ Messages loaded:', data.messages?.length || 0);

        // Mark unread messages as read
        if (data.messages && socketService.isSocketConnected()) {
          data.messages.forEach((msg) => {
            const senderId = msg.senderId?._id || msg.senderId;
            if (senderId !== user?._id && !msg.read) {
              socketService.markMessageAsRead(msg._id, senderId);
            }
          });
        }

        return data.messages || [];
      } catch (error) {
        console.error('❌ Failed to load messages:', error);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  /**
   * Load messages for a room
   */
  const loadRoomMessages = useCallback(async (roomId) => {
    try {
      setLoading(true);
      const data = await chatService.getRoomMessages(roomId);
      setMessages(data.messages || []);

      console.log('✅ Room messages loaded:', data.messages?.length || 0);

      return data.messages || [];
    } catch (error) {
      console.error('❌ Failed to load room messages:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Open a chat with a user
   */
  const openChat = useCallback(
    async (userId, userName) => {
      console.log('📱 Opening chat with:', userName);

      setActiveChat({
        _id: userId,
        U_Id: userName,
        isRoom: false,
      });

      // Load messages for this chat
      await loadMessages(userId);
    },
    [loadMessages],
  );

  /**
   * Open a room chat
   */
  const openRoom = useCallback(
    async (roomId, roomName) => {
      console.log('📱 Opening room:', roomName, '(', roomId, ')');

      setActiveChat({
        _id: roomId,
        U_Id: roomName,
        isRoom: true,
        roomId: roomId,
      });

      // Join the room via socket
      if (socketService.isSocketConnected()) {
        socketService.joinRoom(roomId);
      }

      // Load messages for this room
      await loadRoomMessages(roomId);
    },
    [loadRoomMessages],
  );

  /**
   * Open temp session (treated as 1-to-1 E2EE chat, not room)
   */
  const openTempSession = useCallback(async (session) => {
    if (!session) return;
    console.log('🚧 Opening temp session:', session);
    setActiveTempSession(session);

    // ✅ NEW: Use 1-to-1 mode for E2EE (not room mode)
    // If there's another participant, use their ID as chat partner
    const otherParticipantId = session.otherParticipantId;

    if (otherParticipantId) {
      // Another user joined - establish E2EE session
      setActiveChat({
        _id: otherParticipantId, // Chat with other participant
        U_Id: session.alias,
        isRoom: false, // ✅ 1-to-1 mode (enables E2EE)
        tempSessionId: session.sessionId,
        isTemp: true,
      });

      // ✅ FIX: Initialize E2EE session for temp chat
      try {
        console.log('🔐 Initializing E2EE session for temp chat with:', otherParticipantId);
        const signalProtocol = (await import('../services/signalProtocol')).default;
        await signalProtocol.initSession(otherParticipantId);
        console.log('✅ E2EE session initialized for temp chat');
      } catch (error) {
        console.warn('⚠️ E2EE session may already exist or failed to initialize:', error.message);
        // Continue anyway - session might already exist
      }

      // Load messages for this temp session
      try {
        const data = await chatService.getTempSessionMessages(session.sessionId);
        setMessages(data.messages || []);
      } catch (e) {
        console.warn('Failed loading temp session messages', e);
      }
    } else {
      // Waiting for other participant - show waiting room
      setActiveChat({
        _id: `temp_waiting_${session.sessionId}`,
        U_Id: session.alias,
        isRoom: false,
        tempSessionId: session.sessionId,
        isTemp: true,
        waiting: true, // Flag to show "waiting for participant" UI
      });
    }
  }, []);

  /**
   * End temp session
   */
  const endTempSession = useCallback(async () => {
    if (!activeTempSession) return;
    try {
      await chatService.endTempSession(activeTempSession.sessionId);
    } catch (e) {
      console.warn('Failed ending temp session', e);
    }
    setActiveTempSession(null);
    setActiveChat(null);
    setMessages([]);
  }, [activeTempSession]);

  /**
   * Send a message
   */
  const sendMessage = useCallback(
    async (text, selfDestruct = null) => {
      if (!activeChat) {
        console.warn('⚠️ Cannot send message: No active chat');
        return;
      }

      if (!text.trim()) {
        console.warn('⚠️ Cannot send message: Empty text');
        return;
      }

      if (!socketService.isSocketConnected()) {
        console.warn('⚠️ Cannot send message: Socket not connected');
        console.log('🔍 Socket status:', {
          isConnected,
          hasSocket: !!socketService.socket,
          socketConnected: socketService.socket?.connected,
        });
        return;
      }

      try {
        // E2EE is ALWAYS enabled for direct messages
        if (!activeChat.isRoom && e2eeInitialized) {
          console.log('🔐 Encrypting message with E2EE (always-on)...');
          await sendEncryptedMessage(activeChat._id, text.trim(), socketService);
          console.log('✅ Encrypted message sent');
        } else if (!activeChat.isRoom && !e2eeInitialized) {
          // E2EE not ready yet - queue or show error
          console.warn('⚠️ E2EE not initialized yet, retrying...');
          Alert.alert('Please wait', 'Encryption is still initializing. Try again in a moment.');
          return;
        } else {
          // Send plaintext message
          if (activeChat.isRoom) {
            console.log('📤 Sending room message to:', activeChat.roomId, 'Text:', text.trim());
            socketService.sendMessage(null, text.trim(), 'text', activeChat.roomId, selfDestruct);
          } else {
            console.log('📤 Sending message to:', activeChat._id, 'Text:', text.trim());
            socketService.sendMessage(activeChat._id, text.trim(), 'text', null, selfDestruct);
          }
          console.log('✅ Message sent via socket');
        }
      } catch (error) {
        console.error('❌ Failed to send message:', error);
        Alert.alert('Error', 'Failed to send message');
      }
    },
    [activeChat, isConnected, e2eeInitialized],
  );

  /**
   * Delete message for self
   */
  const deleteMessageForMe = useCallback(async (messageId) => {
    try {
      await chatService.deleteMessageForMe(messageId);

      // Remove from local state
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));

      Alert.alert('Success', 'Message deleted');
    } catch (_error) {
      Alert.alert('Error', 'Failed to delete message');
    }
  }, []);

  /**
   * Delete message for everyone
   */
  const deleteMessageForEveryone = useCallback(async (messageId) => {
    try {
      await chatService.deleteMessageForEveryone(messageId);

      // Update local state
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, deleted: true, text: 'This message was deleted' } : msg,
        ),
      );

      Alert.alert('Success', 'Message deleted for everyone');
    } catch (_error) {
      Alert.alert('Error', 'Failed to delete message');
    }
  }, []);

  /**
   * React to a message
   */
  const reactToMessage = useCallback((messageId, emoji) => {
    if (!socketService.isSocketConnected()) return;

    socketService.reactToMessage(messageId, emoji);
  }, []);

  /**
   * Check if a user is online
   */
  const isUserOnline = useCallback(
    (userId) => {
      return onlineUsers.includes(userId);
    },
    [onlineUsers],
  );

  /**
   * Start typing indicator
   */
  const startTyping = useCallback(() => {
    if (!activeChat || !socketService.isSocketConnected()) return;

    socketService.startTyping(activeChat._id);
  }, [activeChat]);

  /**
   * Stop typing indicator
   */
  const stopTyping = useCallback(() => {
    if (!activeChat || !socketService.isSocketConnected()) return;

    socketService.stopTyping(activeChat._id);
  }, [activeChat]);

  /**
   * Close active chat
   */
  const closeChat = useCallback(() => {
    setActiveChat(null);
    setMessages([]);
    if (activeTempSession) {
      endTempSession();
    }
  }, [activeTempSession, endTempSession]);

  /**
   * Setup socket event listeners
   */
  useEffect(() => {
    if (!user) return;

    const setupSocketListeners = () => {
      // Connection status
      socketService.on('connection_status', ({ connected }) => {
        console.log('🔌 Connection status changed:', connected);
        setIsConnected(connected);
        if (connected) {
          console.log('✅ Socket connected, loading chats...');
          loadChats();
        }
      });

      // New chat created (when user sends first message)
      socketService.on('chat:created', ({ user, isInSecondary }) => {
        console.log('🆕 New chat created:', user?.U_Id || user);
        console.log('📋 Chat details:', { userId: user?._id, isInSecondary });
        // Reload chats to include the new conversation
        console.log('🔄 Reloading chats...');
        loadChats();
      });

      // Chat request received (someone sent you first message)
      socketService.on('chat:request', ({ sender }) => {
        console.log('📬 Chat request from:', sender?.U_Id || sender);
        console.log('📋 Sender details:', { userId: sender?._id });
        // Reload chats to show the new request in secondary
        console.log('🔄 Reloading chats...');
        loadChats();
      });

      // Message received
      socketService.on('message:receive', async (message) => {
        console.log('📨 Message received:', message);

        const senderId = message.senderId?._id || message.senderId;
        const senderName = message.senderId?.U_Id || message.senderId?.phoneNumber || 'Someone';
        const currentActiveChat = activeChatRef.current;

        // Decrypt message if encrypted (E2EE is always-on)
        let decryptedMessage = message;
        if (message.encryptedText && message.ratchetHeader) {
          try {
            console.log('🔓 Decrypting E2EE message (always-on)...');
            const plaintext = await receiveEncryptedMessage(message);
            decryptedMessage = { ...message, text: plaintext, encryptedText: undefined };
            console.log('✅ Message decrypted successfully');
          } catch (error) {
            console.error('❌ Failed to decrypt message:', error);
            decryptedMessage = {
              ...message,
              text: '[Unable to decrypt message]',
              decryptionError: true,
            };
          }
        }

        // Check if message belongs to current active chat/room (including temp)
        let isForActiveChat = false;
        if (currentActiveChat) {
          if (
            decryptedMessage.roomId &&
            currentActiveChat.isRoom &&
            decryptedMessage.roomId === currentActiveChat.roomId
          ) {
            // Room message for current room
            isForActiveChat = true;
          } else if (
            !decryptedMessage.roomId &&
            !currentActiveChat.isRoom &&
            senderId === currentActiveChat._id
          ) {
            // Direct message for current chat
            isForActiveChat = true;
          }
        }

        // If it's for the active chat, add to messages (prevent duplicates)
        if (isForActiveChat) {
          setMessages((prev) => {
            // Check if message already exists
            const messageExists = prev.some((msg) => msg._id === decryptedMessage._id);
            if (messageExists) {
              return prev;
            }
            return [...prev, decryptedMessage];
          });

          // Mark as read (only for direct messages, not room messages)
          if (!message.roomId) {
            socketService.markMessageAsRead(message._id, senderId);
          }
        } else {
          // Check if chat is muted before showing notification
          const isChatMuted = mutedChats.has(senderId);

          if (!isChatMuted) {
            // Show notification if not viewing this chat and not muted
            console.log('📲 Showing notification for message from:', senderName);
            notificationService.scheduleLocalNotification(
              `New message from ${senderName}`,
              message.text || 'Sent you a message',
              { senderId, senderName },
            );
          } else {
            console.log('🔕 Notification muted for:', senderName);
          }
        }

        // Update chat list last message WITHOUT full reload
        setChats((prev) =>
          prev.map((chat) => {
            if (chat._id === senderId || chat.userId === senderId) {
              return {
                ...chat,
                lastMessage: message.text,
                lastMessageTime: message.createdAt,
                unreadCount:
                  currentActiveChat && senderId === currentActiveChat._id
                    ? 0
                    : (chat.unreadCount || 0) + 1,
              };
            }
            return chat;
          }),
        );
      });

      // Message sent confirmation
      socketService.on('message:sent', (message) => {
        console.log('✅ Message sent confirmation:', message);

        const currentActiveChat = activeChatRef.current;

        // Check if message belongs to current active chat/room
        let isForActiveChat = false;
        if (currentActiveChat) {
          if (
            message.roomId &&
            currentActiveChat.isRoom &&
            message.roomId === currentActiveChat.roomId
          ) {
            // Room message for current room
            isForActiveChat = true;
          } else if (!message.roomId && !currentActiveChat.isRoom) {
            const receiverId = message.receiverId?._id || message.receiverId;
            if (receiverId === currentActiveChat._id) {
              // Direct message for current chat
              isForActiveChat = true;
            }
          }
        }

        // Add to messages if in active chat (prevent duplicates)
        if (isForActiveChat) {
          setMessages((prev) => {
            // Check if message already exists
            const messageExists = prev.some((msg) => msg._id === message._id);
            if (messageExists) {
              return prev;
            }
            return [...prev, message];
          });
        }

        // Update chat list last message WITHOUT full reload for direct messages
        if (!message.roomId) {
          const receiverId = message.receiverId?._id || message.receiverId;
          setChats((prev) =>
            prev.map((chat) => {
              if (chat._id === receiverId || chat.userId === receiverId) {
                return {
                  ...chat,
                  lastMessage: message.text,
                  lastMessageTime: message.createdAt,
                };
              }
              return chat;
            }),
          );
        }
      });

      // Message read receipt
      socketService.on('message:read:receipt', ({ messageId }) => {
        console.log('✅ Message read:', messageId);

        setMessages((prev) =>
          prev.map((msg) => (msg._id === messageId ? { ...msg, read: true } : msg)),
        );
      });

      // Message deleted
      socketService.on('message:deleted', ({ messageId }) => {
        console.log('🗑️ Message deleted:', messageId);

        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === messageId
              ? { ...msg, deleted: true, text: 'This message was deleted' }
              : msg,
          ),
        );
      });

      // Typing indicators
      socketService.on('typing:start', ({ userId }) => {
        const currentActiveChat = activeChatRef.current;
        console.log('⌨️ User typing:', userId, 'Active chat:', currentActiveChat?._id);
        if (currentActiveChat && userId === currentActiveChat._id) {
          setTypingUsers((prev) => new Set(prev).add(userId));
        }
      });

      socketService.on('typing:stop', ({ userId }) => {
        console.log('⌨️ User stopped typing:', userId);
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      });

      // Message reactions
      socketService.on('message:reaction', ({ messageId, userId, emoji }) => {
        console.log('❤️ Reaction:', emoji);

        setMessages((prev) =>
          prev.map((msg) => {
            if (msg._id === messageId) {
              const reactions = msg.reactions || [];
              return {
                ...msg,
                reactions: [...reactions, { userId, emoji }],
              };
            }
            return msg;
          }),
        );
      });

      // Self-destruct messages
      socketService.on('message:self-destruct', ({ messageId }) => {
        console.log('🗑️ Message self-destructed:', messageId);

        setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
      });

      // Temp session ended broadcast
      socketService.on('temp:session:ended', ({ sessionId }) => {
        console.log('🛑 Temp session ended remotely:', sessionId);
        if (activeTempSession && activeTempSession.sessionId === sessionId) {
          setActiveTempSession(null);
          setActiveChat(null);
          setMessages([]);
          Alert.alert('Session Ended', 'The temporary session has been destroyed.');
          try {
            router.replace('/(tabs)/chat');
          } catch (e) {
            console.warn('Navigation failure after temp end', e);
          }
        }
      });

      // Online users
      socketService.on('online-users', (users) => {
        console.log('👥 Online users:', users.length);
        setOnlineUsers(users);
      });

      socketService.on('user:online', ({ userId }) => {
        setOnlineUsers((prev) => {
          if (!prev.includes(userId)) {
            return [...prev, userId];
          }
          return prev;
        });
      });

      socketService.on('user:offline', ({ userId }) => {
        setOnlineUsers((prev) => prev.filter((id) => id !== userId));
      });
    };

    // Connect socket and setup listeners
    const initSocket = async () => {
      try {
        console.log('🔌 Initializing socket connection...');
        await socketService.connect();
        console.log('✅ Socket connected, setting up listeners...');
        setupSocketListeners();
      } catch (error) {
        console.error('❌ Socket connection failed:', error);
      }
    };

    // Initialize push notifications
    const initPushNotifications = async () => {
      try {
        console.log('📱 Initializing push notifications...');
        const token = await notificationService.registerForPushNotifications();

        if (token) {
          setPushToken(token);
          console.log('✅ Push token registered:', token);

          // Send token to backend to associate with user
          try {
            await userService.registerPushToken(token);
            console.log('✅ Push token sent to backend');
          } catch (error) {
            console.error('❌ Failed to send push token to backend:', error.message || error);
            console.log('ℹ️ Push token saved locally - will retry on next app launch');
            // Don't throw - app should continue working even if backend fails
          }
        } else {
          console.log('ℹ️ Push token not available - local notifications will still work');
        }

        // Setup notification handlers
        notificationService.setupNotificationListeners(
          (notification) => {
            // Handle notification received in foreground
            console.log('📨 Foreground notification:', notification);
            // DON'T schedule another notification here - it's already shown!
            // The socket handler (line 264) already triggers notifications
            // This listener is just for logging and potential UI updates
          },
          (response) => {
            // Handle notification tap - navigate to chat
            console.log('👆 Notification tapped:', response);
            const { senderId, senderName } = response.notification.request.content.data;
            if (senderId && senderName) {
              router.push({
                pathname: '/chat-conversation',
                params: { userId: senderId, userName: senderName },
              });
            }
          },
        );
      } catch (error) {
        console.error('❌ Failed to initialize push notifications:', error);
      }
    };

    initSocket();
    initPushNotifications();

    // Cleanup
    return () => {
      socketService.off('connection_status');
      socketService.off('message:receive');
      socketService.off('message:sent');
      socketService.off('message:read:receipt');
      socketService.off('message:deleted');
      socketService.off('message:self-destruct');
      socketService.off('temp:session:ended');
      socketService.off('typing:start');
      socketService.off('typing:stop');
      socketService.off('message:reaction');
      socketService.off('online-users');
      socketService.off('user:online');
      socketService.off('user:offline');
      notificationService.removeNotificationListeners();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Only reconnect if user changes, not activeChat!

  /**
   * Move chat to primary section
   */
  const moveToPrimary = useCallback(
    async (userId) => {
      try {
        await chatService.moveToPrimary(userId);
        await loadChats();
        console.log('✅ Chat moved to primary');
      } catch (error) {
        console.error('❌ Failed to move to primary:', error);
        throw error;
      }
    },
    [loadChats],
  );

  /**
   * Move chat to secondary section
   */
  const moveToSecondary = useCallback(
    async (userId) => {
      try {
        await chatService.moveToSecondary(userId);
        await loadChats();
        console.log('✅ Chat moved to secondary');
      } catch (error) {
        console.error('❌ Failed to move to secondary:', error);
        throw error;
      }
    },
    [loadChats],
  );

  /**
   * Delete entire chat
   */
  const deleteChat = useCallback(
    async (userId) => {
      try {
        await chatService.deleteChat(userId);
        await loadChats();
        console.log('✅ Chat deleted');
      } catch (error) {
        console.error('❌ Failed to delete chat:', error);
        throw error;
      }
    },
    [loadChats],
  );

  /**
   * Clear all messages in chat
   */
  const clearChat = useCallback(
    async (userId) => {
      try {
        await chatService.clearChat(userId);
        await loadChats();
        console.log('✅ Chat cleared');
      } catch (error) {
        console.error('❌ Failed to clear chat:', error);
        throw error;
      }
    },
    [loadChats],
  );

  /**
   * Toggle mute status for chat
   */
  const muteChat = useCallback(
    async (userId) => {
      try {
        await chatService.muteChat(userId);
        await loadChats();
        console.log('✅ Chat mute status toggled');
      } catch (error) {
        console.error('❌ Failed to toggle mute:', error);
        throw error;
      }
    },
    [loadChats],
  );

  const value = {
    // State
    chats,
    primaryChats,
    secondaryChats,
    activeChat,
    messages,
    onlineUsers,
    typingUsers,
    isConnected,
    loading,
    pushToken,
    activeTempSession,
    e2eeEnabled,
    e2eeInitialized,

    // Actions
    loadChats,
    loadMessages,
    loadRoomMessages,
    openChat,
    openRoom,
    openTempSession,
    closeChat,
    sendMessage,
    endTempSession,
    deleteMessageForMe,
    deleteMessageForEveryone,
    reactToMessage,
    isUserOnline,
    startTyping,
    stopTyping,
    moveToPrimary,
    moveToSecondary,
    deleteChat,
    clearChat,
    muteChat,
    // New file upload action with E2EE encryption
    uploadFileMessage: async (fileInfo) => {
      if (!activeChat) {
        console.warn('No active chat for file upload');
        return null;
      }
      try {
        const isRoom = !!activeChat.isRoom;

        // Import mediaEncryption dynamically
        const mediaEncryption = (await import('../services/mediaEncryption')).default;
        const signalProtocol = (await import('../services/signalProtocol')).default;

        // Encrypt file for E2EE transfers (not for rooms/temp sessions)
        let encryptedData = null;
        if (!isRoom && e2eeInitialized) {
          console.log('🔐 Encrypting file before upload...', fileInfo.name);
          try {
            // Get session ID for this chat
            const sessionId = activeChat._id;

            // Encrypt the file
            encryptedData = await mediaEncryption.encryptFile(fileInfo.uri, sessionId);
            console.log('✅ File encrypted successfully');
          } catch (error) {
            console.error('❌ File encryption failed:', error);
            throw new Error('File encryption failed: ' + error.message);
          }
        } else if (isRoom) {
          console.log('ℹ️ Room/temp chat - file upload disabled for E2EE compliance');
          throw new Error('File uploads disabled in rooms for E2EE compliance');
        }

        // Upload encrypted file to server
        const message = await chatService.uploadFileMessage({
          fileUri: fileInfo.uri,
          fileName: fileInfo.name,
          mimeType: fileInfo.mimeType,
          receiverId: !isRoom ? activeChat._id : undefined,
          roomId: isRoom ? activeChat.roomId : undefined,
          hideInTemp: !!activeChat.isTemp,
          // E2EE encryption data
          encryptedData: encryptedData, // Will be null for rooms
        });

        if (message && !message.hidden) {
          setMessages((prev) => [...prev, message]);
        }
        return message;
      } catch (e) {
        console.error('File upload failed', e);
        Alert.alert('Upload Failed', e.message || 'Could not upload file');
        return null;
      }
    },
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
