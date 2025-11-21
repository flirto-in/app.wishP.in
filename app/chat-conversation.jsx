import { useLocalSearchParams, useRouter } from 'expo-router';
import { useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChatContext } from '../src/context/ChatContext';

export default function ChatConversationScreen() {
  const router = useRouter();
  const { userId, userName, roomId, isPublicRoom } = useLocalSearchParams();

  const {
    activeChat,
    messages,
    typingUsers,
    isConnected,
    loading,
    openChat,
    openRoom,
    closeChat,
    sendMessage,
    deleteMessageForMe,
    deleteMessageForEveryone,
    reactToMessage,
    isUserOnline,
    startTyping,
    stopTyping,
  } = useContext(ChatContext);

  const [messageText, setMessageText] = useState('');
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [selfDestructSeconds, setSelfDestructSeconds] = useState(0);
  const [inputHeight, setInputHeight] = useState(40);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const sendButtonScale = useRef(new Animated.Value(0.8)).current;

  const isRoomMode = isPublicRoom === 'true' || !!roomId;

  // Animate send button when text changes
  useEffect(() => {
    Animated.spring(sendButtonScale, {
      toValue: messageText.trim() ? 1 : 0.8,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start();
  }, [messageText, sendButtonScale]);

  // Open chat when component mounts
  useEffect(() => {
    if (isRoomMode && roomId && userName) {
      openRoom(roomId, userName);
    } else if (userId && userName) {
      openChat(userId, userName);
    }

    return () => {
      closeChat();
    };
  }, [userId, userName, roomId, isRoomMode, openChat, openRoom, closeChat]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      // Delayed scroll for smooth animation
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  // Auto scroll when keyboard appears (new message being typed)
  useEffect(() => {
    if (messageText.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [inputHeight, messageText.length]);

  const handleTyping = () => {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    startTyping();

    const timeout = setTimeout(() => {
      stopTyping();
    }, 2000);

    setTypingTimeout(timeout);
  };

  const handleSendMessage = () => {
    if (!messageText.trim()) {
      console.log('❌ Empty message, not sending');
      return;
    }

    console.log('🚀 handleSendMessage called');
    console.log('📝 Message text:', messageText);
    console.log('🔌 Socket connected:', isConnected);
    console.log('👤 Active chat:', activeChat);

    // Animate send button press
    Animated.sequence([
      Animated.spring(sendButtonScale, {
        toValue: 0.7,
        useNativeDriver: true,
        speed: 30,
      }),
      Animated.spring(sendButtonScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 30,
      }),
    ]).start();

    // Prepare self-destruct settings
    let selfDestruct = null;
    if (selfDestructSeconds > 0) {
      selfDestruct = {
        enabled: true,
        ttlSeconds: selfDestructSeconds,
      };
    }

    // Try to send the message
    sendMessage(messageText, selfDestruct);

    // Clear input only if message was sent or attempted
    setMessageText('');
    setSelfDestructSeconds(0);
    setInputHeight(40); // Reset input height
    stopTyping();

    // Auto scroll after sending
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
  };

  const handleDeleteMessage = (messageId, isMyMessage) => {
    Alert.alert(
      'Delete Message',
      'Choose delete option:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete for me',
          onPress: () => deleteMessageForMe(messageId),
        },
        isMyMessage && {
          text: 'Delete for everyone',
          onPress: () => deleteMessageForEveryone(messageId),
          style: 'destructive',
        },
      ].filter(Boolean),
    );
  };

  const handleReactToMessage = (messageId) => {
    Alert.alert('React to Message', 'Choose a reaction:', [
      { text: 'Cancel', style: 'cancel' },
      { text: '👍 Like', onPress: () => reactToMessage(messageId, '👍') },
      { text: '❤️ Love', onPress: () => reactToMessage(messageId, '❤️') },
      { text: '😂 Haha', onPress: () => reactToMessage(messageId, '😂') },
      { text: '🔥 Fire', onPress: () => reactToMessage(messageId, '🔥') },
    ]);
  };

  const renderMessage = ({ item: message }) => {
    const senderId = message.senderId?._id || message.senderId;
    const isMyMessage = senderId === activeChat?._id ? false : true;
    const isDeleted = message.deleted || message.text === 'This message was deleted';

    return (
      <TouchableOpacity
        onLongPress={() => {
          if (!isDeleted) {
            Alert.alert('Message Options', 'Choose an action:', [
              { text: 'Cancel', style: 'cancel' },
              { text: '❤️ React', onPress: () => handleReactToMessage(message._id) },
              {
                text: '🗑️ Delete',
                onPress: () => handleDeleteMessage(message._id, isMyMessage),
                style: 'destructive',
              },
            ]);
          }
        }}
        className={`mb-3 px-4 ${isMyMessage ? 'items-end' : 'items-start'}`}
      >
        <View
          className={`max-w-[75%] rounded-2xl p-3 ${
            isMyMessage ? 'bg-blue-500' : 'bg-dark-surface border border-dark-border'
          }`}
        >
          <Text
            className={`text-base ${
              isMyMessage ? 'text-white' : 'text-dark-text-primary'
            } ${isDeleted ? 'italic opacity-60' : ''}`}
          >
            {isDeleted ? 'This message was deleted' : message.text || message.encryptedText}
          </Text>

          <View className="flex-row items-center justify-between mt-1">
            <Text className={`text-xs ${isMyMessage ? 'text-blue-100' : 'text-dark-text-muted'}`}>
              {new Date(message.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>

            {isMyMessage && !isDeleted && (
              <Text className="text-xs text-blue-100 ml-2">
                {message.read ? '✓✓' : message.deliveryStatus === 'delivered' ? '✓✓' : '✓'}
              </Text>
            )}
          </View>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <View className="flex-row flex-wrap mt-1">
              {message.reactions.map((reaction, index) => (
                <Text key={index} className="text-xs mr-1">
                  {reaction.emoji}
                </Text>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const userOnline = activeChat && isUserOnline(activeChat._id);
  const userTyping = activeChat && typingUsers.has(activeChat._id);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-dark-bg"
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View className="bg-dark-surface border-b border-dark-border px-4 py-3 pt-12">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <Text className="text-dark-accent-blue text-lg">←</Text>
            </TouchableOpacity>

            <View className="w-10 h-10 rounded-full bg-blue-500 justify-center items-center mr-3">
              <Text className="text-white font-bold text-lg">
                {isRoomMode ? '🏠' : userName?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>

            <View className="flex-1">
              <Text className="text-dark-text-primary font-semibold text-base">
                {userName || 'User'}
              </Text>
              <View className="flex-row items-center">
                <View
                  className={`w-2 h-2 rounded-full mr-1 ${
                    isRoomMode ? 'bg-green-500' : userOnline ? 'bg-green-500' : 'bg-gray-500'
                  }`}
                />
                <Text className="text-dark-text-muted text-xs">
                  {isRoomMode ? 'Public Room' : userOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>
          </View>

          {!isConnected && (
            <View className="bg-red-500 rounded-full px-3 py-1">
              <Text className="text-white text-xs font-semibold">Offline</Text>
            </View>
          )}
        </View>
      </View>

      {/* Messages */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item, index) =>
              item._id ? `${item._id}-${index}` : `msg-${index}-${item.createdAt || Date.now()}`
            }
            contentContainerClassName="py-4"
            ListEmptyComponent={
              <View className="flex-1 justify-center items-center py-20">
                <Text className="text-6xl mb-4">💬</Text>
                <Text className="text-dark-text-primary text-lg font-semibold mb-2">
                  No messages yet
                </Text>
                <Text className="text-dark-text-muted text-center px-10">
                  Start the conversation by sending a message
                </Text>
              </View>
            }
          />

          {/* Typing Indicator */}
          {userTyping && (
            <View className="px-4 py-2">
              <Text className="text-dark-text-muted text-sm italic">{userName} is typing...</Text>
            </View>
          )}
        </>
      )}

      {/* Message Input */}
      <View className="bg-dark-surface border-t border-dark-border p-3">
        {/* Self-destruct timer */}
        {selfDestructSeconds > 0 && (
          <View className="mb-2 px-3 py-1 bg-red-100 rounded-full">
            <Text className="text-red-800 text-xs text-center">
              🔥 Self-destruct in {selfDestructSeconds}s
            </Text>
          </View>
        )}

        {/* Timer buttons */}
        <View className="flex-row justify-center mb-2 space-x-2">
          {[10, 30, 60].map((seconds) => (
            <TouchableOpacity
              key={seconds}
              onPress={() => setSelfDestructSeconds(seconds)}
              className={`px-3 py-1 rounded-full ${
                selfDestructSeconds === seconds ? 'bg-red-500' : 'bg-gray-600'
              }`}
            >
              <Text
                className={`text-xs ${
                  selfDestructSeconds === seconds ? 'text-white' : 'text-gray-300'
                }`}
              >
                {seconds}s
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => setSelfDestructSeconds(0)}
            className={`px-3 py-1 rounded-full ${
              selfDestructSeconds === 0 ? 'bg-green-500' : 'bg-gray-600'
            }`}
          >
            <Text
              className={`text-xs ${selfDestructSeconds === 0 ? 'text-white' : 'text-gray-300'}`}
            >
              ∞
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row items-end">
          {/* Emoji Shortcuts */}
          <View className="flex-row mb-2 mr-2">
            {['😊', '👍', '❤️'].map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => setMessageText((prev) => prev + emoji)}
                className="p-1 mr-1"
              >
                <Text className="text-lg">{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View className="flex-1 bg-dark-card rounded-2xl px-4 py-2 border border-dark-border mr-2">
            <TextInput
              ref={inputRef}
              value={messageText}
              onChangeText={(text) => {
                setMessageText(text);
                handleTyping();
              }}
              onContentSizeChange={(event) => {
                const newHeight = Math.max(40, Math.min(120, event.nativeEvent.contentSize.height));
                setInputHeight(newHeight);
              }}
              placeholder="Type a message..."
              placeholderTextColor="#666666"
              className="text-dark-text-primary text-base"
              style={{ height: inputHeight, textAlignVertical: 'top' }}
              multiline
              maxLength={1000}
              blurOnSubmit={false}
              onSubmitEditing={handleSendMessage}
              returnKeyType="send"
            />
          </View>

          <Animated.View style={{ transform: [{ scale: sendButtonScale }] }}>
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={!messageText.trim()}
              className={`rounded-full w-12 h-12 justify-center items-center ${
                messageText.trim() ? 'bg-blue-500' : 'bg-dark-border'
              }`}
              activeOpacity={0.7}
            >
              <Text className="text-white font-bold text-lg">➤</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
