import { useLocalSearchParams, useRouter } from 'expo-router';
import { useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Keyboard,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
// File & picker modules (ensure installed in package.json)
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ChatContext } from '../src/context/ChatContext';
import { AuthContext } from '../src/context/AuthContext';

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
    uploadFileMessage,
    isUserOnline,
    startTyping,
    stopTyping,
  } = useContext(ChatContext);

  const [messageText, setMessageText] = useState('');
  const [typingTimeout, setTypingTimeout] = useState(null);
  // Removed self-destruct feature for cleaner modern UI
  const [inputHeight, setInputHeight] = useState(40);
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
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

  // Keyboard height tracking (Android & iOS)
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates?.height || 0);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 60);
      },
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 30);
      },
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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

    // Send message without legacy self-destruct option
    sendMessage(messageText.trim());

    // Clear input
    setMessageText('');
    setInputHeight(40); // Reset input height
    stopTyping();

    // Keep keyboard open and scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

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

  const { user } = useContext(AuthContext);

  const handlePickFile = async () => {
    try {
      if (activeChat?.isTemp) {
        Alert.alert('Disabled', 'File uploads are hidden in temp sessions.');
        return;
      }
      const result = await DocumentPicker.getDocumentAsync({ multiple: false });
      if (result.canceled) return;
      const file = result.assets?.[0];
      if (!file) return;
      await uploadFileMessage({ uri: file.uri, name: file.name, mimeType: file.mimeType });
    } catch (e) {
      Alert.alert('Error', e.message || 'File selection failed');
    }
  };

  const handleDownload = async (message) => {
    try {
      if (!message.mediaUrl) return;
      const fileName = message.mediaUrl.split('/').pop()?.split('?')[0] || 'download';
      // documentDirectory may not be statically analyzable; fall back to cacheDirectory
      const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
      const dest = baseDir + fileName;
      const { uri } = await FileSystem.downloadAsync(message.mediaUrl, dest);
      Alert.alert('Downloaded', `Saved to: ${uri}`);
    } catch (e) {
      Alert.alert('Download Failed', e.message || 'Could not download');
    }
  };

  const renderMessage = ({ item: message }) => {
    const senderId = message.senderId?._id || message.senderId;
    const currentUserId = user?._id;
    const isMyMessage = senderId === currentUserId;
    const isDeleted = message.deleted || message.text === 'This message was deleted';
    if (message.hidden) return null; // Do not render hidden messages

    return (
      <TouchableOpacity
        onLongPress={() => {
          if (!isDeleted) {
            Alert.alert('Message Options', 'Choose an action:', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'React', onPress: () => handleReactToMessage(message._id) },
              {
                text: 'Delete',
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
            activeChat?.isTemp
              ? isMyMessage
                ? 'bg-pink-600'
                : 'bg-gray-800 border border-pink-700/40'
              : isMyMessage
                ? 'bg-blue-500'
                : 'bg-dark-surface border border-dark-border'
          }`}
        >
          {message.messageType === 'text' && (
            <Text
              className={`text-base ${
                isMyMessage
                  ? 'text-white'
                  : activeChat?.isTemp
                    ? 'text-gray-200'
                    : 'text-dark-text-primary'
              } ${isDeleted ? 'italic opacity-60' : ''}`}
            >
              {isDeleted ? 'This message was deleted' : message.text || message.encryptedText}
            </Text>
          )}
          {message.messageType === 'image' && message.mediaUrl && (
            <Image
              source={{ uri: message.mediaUrl }}
              style={{ width: 180, height: 180, borderRadius: 12, marginBottom: 4 }}
              resizeMode="cover"
            />
          )}
          {message.messageType === 'file' && message.mediaUrl && (
            <View className="mb-2">
              <View className="flex-row items-center mb-1">
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={isMyMessage ? '#fff' : '#3B82F6'}
                />
                <Text
                  numberOfLines={1}
                  className={`ml-2 flex-1 text-xs ${isMyMessage ? 'text-blue-100' : 'text-dark-text-primary'}`}
                >
                  {message.mediaUrl.split('/').pop()?.split('?')[0] || 'file'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDownload(message)}
                className={`px-3 py-1 rounded-lg ${isMyMessage ? 'bg-blue-700' : 'bg-dark-border'}`}
              >
                <Text
                  className={`text-xs ${isMyMessage ? 'text-white' : 'text-dark-text-primary'}`}
                >
                  Download
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View className="flex-row items-center justify-between mt-1">
            <Text className={`text-xs ${isMyMessage ? 'text-blue-100' : 'text-dark-text-muted'}`}>
              {new Date(message.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>

            {isMyMessage && !isDeleted && (
              <View className="ml-2">
                {message.read ? (
                  <Ionicons name="checkmark-done" size={14} color="#DBEAFE" />
                ) : message.deliveryStatus === 'delivered' ? (
                  <Ionicons name="checkmark-done" size={14} color="#DBEAFE" />
                ) : (
                  <Ionicons name="checkmark" size={14} color="#DBEAFE" />
                )}
              </View>
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
    <View className="flex-1 bg-dark-bg">
      {/* Header */}
      <View className="bg-dark-surface border-b border-dark-border px-4 py-3 pt-6">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <Ionicons name="chevron-back" size={24} color="#3B82F6" />
            </TouchableOpacity>

            <View className="w-10 h-10 rounded-full bg-blue-500 justify-center items-center mr-3">
              <Text className="text-white font-bold text-lg">
                {isRoomMode ? (
                  <Ionicons name="home" size={20} color="#fff" />
                ) : (
                  userName?.charAt(0)?.toUpperCase() || '?'
                )}
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
      <View style={{ flex: 1 }}>
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
              contentContainerStyle={{ paddingVertical: 16, paddingBottom: 96 }}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <View className="flex-1 justify-center items-center py-20">
                  <Ionicons
                    name="chatbubbles-outline"
                    size={64}
                    color="#6B7280"
                    style={{ marginBottom: 16 }}
                  />
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
      </View>

      {/* Temp session banner */}
      {activeChat?.isTemp && (
        <View className="mx-3 mt-2 mb-1 bg-pink-600/10 border border-pink-700/40 rounded-xl p-2">
          <Text className="text-pink-400 text-xs font-medium">
            Ephemeral session: media & attachments disabled.
          </Text>
        </View>
      )}

      {/* Modern Input Bar (dynamic bottom offset) */}
      <View
        style={{
          paddingBottom: keyboardHeight > 0 ? 0 : insets.bottom || 8,
          marginBottom: keyboardHeight > 0 ? keyboardHeight : 0,
        }}
      >
        <View className="mx-3 bg-dark-surface/95 rounded-3xl px-4 pt-3 pb-3 shadow-lg border border-dark-border">
          <View className="flex-row items-end">
            {/* Leading actions (hidden in temp session) */}
            {!activeChat?.isTemp && (
              <>
                <TouchableOpacity className="mr-3" onPress={handlePickFile} activeOpacity={0.7}>
                  <Ionicons name="add-circle-outline" size={26} color="#3B82F6" />
                </TouchableOpacity>
                <TouchableOpacity className="mr-3" onPress={() => {}} activeOpacity={0.7}>
                  <Ionicons name="happy-outline" size={26} color="#3B82F6" />
                </TouchableOpacity>
              </>
            )}
            {activeChat?.isTemp && (
              <View className="mr-3 px-2 py-1 rounded-lg bg-pink-600/20 border border-pink-700/40">
                <Text className="text-[10px] text-pink-300">No media</Text>
              </View>
            )}

            {/* Input */}
            <View className="flex-1 mr-3">
              <TextInput
                ref={inputRef}
                value={messageText}
                onChangeText={(text) => {
                  setMessageText(text);
                  handleTyping();
                }}
                onContentSizeChange={(event) => {
                  const newHeight = Math.max(
                    40,
                    Math.min(120, event.nativeEvent.contentSize.height),
                  );
                  setInputHeight(newHeight);
                }}
                placeholder="Message"
                placeholderTextColor="#6B7280"
                className="text-dark-text-primary text-base"
                style={{ height: inputHeight, textAlignVertical: 'top' }}
                multiline
                maxLength={1000}
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={() => messageText.trim() && handleSendMessage()}
              />
            </View>

            {/* Send button */}
            <Animated.View style={{ transform: [{ scale: sendButtonScale }] }}>
              <TouchableOpacity
                onPress={handleSendMessage}
                disabled={!messageText.trim()}
                className={`w-12 h-12 rounded-full justify-center items-center ${
                  messageText.trim() ? 'bg-blue-600' : 'bg-dark-border'
                }`}
                activeOpacity={0.85}
              >
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </View>
    </View>
  );
}
