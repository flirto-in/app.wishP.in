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

// Predefined Avatars (Ionicons names)
const AVATARS = [
  { id: 1, icon: 'person' },
  { id: 2, icon: 'happy' },
  { id: 3, icon: 'skull' },
  { id: 4, icon: 'rocket' },
  { id: 5, icon: 'planet' },
  { id: 6, icon: 'leaf' },
  { id: 7, icon: 'paw' },
  { id: 8, icon: 'game-controller' },
  { id: 9, icon: 'musical-notes' },
  { id: 10, icon: 'glasses' },
];

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
  const [inputHeight, setInputHeight] = useState(40);
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const sendButtonScale = useRef(new Animated.Value(0.8)).current;

  // Cache for decrypted media (messageId -> local URI)
  const [decryptedMedia, setDecryptedMedia] = useState({});
  const [decryptingMedia, setDecryptingMedia] = useState({}); // Track decryption in progress

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
      // ✅ ENABLED: Media uploads now allowed in temp chats (E2EE encrypted)
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

  /**
   * Decrypt and display encrypted media
   */
  const handleDecryptMedia = async (message) => {
    try {
      // Check if already decrypted
      if (decryptedMedia[message._id]) {
        console.log('✅ Already decrypted, using cached version');
        return;
      }

      // Check if decryption in progress
      if (decryptingMedia[message._id]) {
        console.log('⏳ Decryption already in progress');
        return;
      }

      setDecryptingMedia((prev) => ({ ...prev, [message._id]: true }));

      console.log('🔓 Decrypting media...', message.originalFileName);

      // Import mediaEncryption and signalProtocol
      const mediaEncryption = (await import('../src/services/mediaEncryption')).default;

      // Download encrypted blob from Cloudinary
      console.log('📥 Downloading encrypted blob from:', message.mediaUrl);
      const response = await fetch(message.mediaUrl);
      const encryptedBlobArrayBuffer = await response.arrayBuffer();

      // Convert ArrayBuffer to base64
      const uint8Array = new Uint8Array(encryptedBlobArrayBuffer);
      let binaryString = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
      }
      const encryptedBlobBase64 = btoa(binaryString);

      // Get sender ID for session
      const senderId = message.senderId?._id || message.senderId;

      // Parse encryptedFileKey if it's a string
      let encryptedFileKey = message.encryptedFileKey;
      if (typeof encryptedFileKey === 'string') {
        try {
          encryptedFileKey = JSON.parse(encryptedFileKey);
        } catch (_e) {
          // Already an object
        }
      }

      console.log('🔑 Decrypting file key...');
      // Decrypt the file
      const decryptedBytes = await mediaEncryption.decryptFile(
        encryptedBlobBase64,
        encryptedFileKey,
        message.fileNonce,
        senderId,
      );

      console.log('💾 Saving decrypted file...');
      // Save to local filesystem
      const localUri = await mediaEncryption.saveDecryptedFile(
        decryptedBytes,
        message.originalFileName || 'decrypted_file',
      );

      console.log('✅ File decrypted and saved:', localUri);

      // Cache the decrypted URI
      setDecryptedMedia((prev) => ({ ...prev, [message._id]: localUri }));
      setDecryptingMedia((prev) => {
        const newState = { ...prev };
        delete newState[message._id];
        return newState;
      });

      Alert.alert('Success', 'Media decrypted successfully');
    } catch (error) {
      console.error('❌ Decryption failed:', error);
      setDecryptingMedia((prev) => {
        const newState = { ...prev };
        delete newState[message._id];
        return newState;
      });
      Alert.alert(
        'Decryption Failed',
        error.message || 'Could not decrypt media. Keys may be missing.',
      );
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

          {/* Encrypted Image Display */}
          {message.messageType === 'image' && message.mediaUrl && message.encryptedFileKey && (
            <View>
              {decryptedMedia[message._id] ? (
                // Show decrypted image
                <Image
                  source={{ uri: decryptedMedia[message._id] }}
                  style={{ width: 180, height: 180, borderRadius: 12, marginBottom: 4 }}
                  resizeMode="cover"
                />
              ) : (
                // Show encrypted placeholder with decrypt button
                <TouchableOpacity
                  onPress={() => handleDecryptMedia(message)}
                  disabled={decryptingMedia[message._id]}
                  style={{
                    width: 180,
                    height: 180,
                    borderRadius: 12,
                    marginBottom: 4,
                    backgroundColor: isMyMessage ? '#1E3A8A' : '#1F2937',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: isMyMessage ? '#60A5FA' : '#374151',
                  }}
                >
                  {decryptingMedia[message._id] ? (
                    <View className="items-center">
                      <ActivityIndicator size="large" color="#60A5FA" />
                      <Text className="text-blue-300 text-xs mt-2">Decrypting...</Text>
                    </View>
                  ) : (
                    <View className="items-center">
                      <Ionicons name="lock-closed" size={32} color="#60A5FA" />
                      <Text className="text-blue-300 text-xs mt-2 font-semibold">
                        Encrypted Image
                      </Text>
                      <Text className="text-blue-400 text-xs mt-1">Tap to decrypt</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Legacy Plaintext Image Display */}
          {message.messageType === 'image' && message.mediaUrl && !message.encryptedFileKey && (
            <Image
              source={{ uri: message.mediaUrl }}
              style={{ width: 180, height: 180, borderRadius: 12, marginBottom: 4 }}
              resizeMode="cover"
            />
          )}

          {/* File Display (encrypted or plaintext) */}
          {message.messageType === 'file' && message.mediaUrl && (
            <View className="mb-2">
              <View className="flex-row items-center mb-1">
                <Ionicons
                  name={message.encryptedFileKey ? 'lock-closed' : 'document-text-outline'}
                  size={18}
                  color={isMyMessage ? '#fff' : '#3B82F6'}
                />
                <Text
                  numberOfLines={1}
                  className={`ml-2 flex-1 text-xs ${isMyMessage ? 'text-blue-100' : 'text-dark-text-primary'}`}
                >
                  {message.originalFileName ||
                    message.mediaUrl.split('/').pop()?.split('?')[0] ||
                    'file'}
                </Text>
              </View>
              {message.encryptedFileKey && (
                <Text className={`text-xs mb-1 ${isMyMessage ? 'text-blue-200' : 'text-gray-400'}`}>
                  🔐 Encrypted
                </Text>
              )}
              <TouchableOpacity
                onPress={() =>
                  message.encryptedFileKey ? handleDecryptMedia(message) : handleDownload(message)
                }
                disabled={decryptingMedia[message._id]}
                className={`px-3 py-1 rounded-lg ${isMyMessage ? 'bg-blue-700' : 'bg-dark-border'}`}
              >
                <Text
                  className={`text-xs ${isMyMessage ? 'text-white' : 'text-dark-text-primary'}`}
                >
                  {decryptingMedia[message._id]
                    ? 'Decrypting...'
                    : message.encryptedFileKey
                      ? 'Decrypt & Save'
                      : 'Download'}
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
                {message.status === 'pending' ? (
                  <Ionicons name="time-outline" size={16} color="#9CA3AF" /> // ⏱ Pending (Gray)
                ) : message.read ? (
                  <Ionicons name="checkmark-done" size={16} color="#3B82F6" /> // ✓✓ Read (Blue)
                ) : message.deliveryStatus === 'delivered' ? (
                  <Ionicons name="checkmark-done" size={16} color="#9CA3AF" /> // ✓✓ Delivered (Gray)
                ) : (
                  <Ionicons name="checkmark" size={16} color="#9CA3AF" /> // ✓ Sent (Gray)
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

            <View className="w-10 h-10 rounded-full bg-dark-surface border border-dark-border justify-center items-center mr-3">
              {isRoomMode ? (
                <Ionicons name="people" size={20} color="#fff" />
              ) : (
                <Ionicons
                  name={AVATARS.find((a) => a.id === activeChat?.avatarId)?.icon || 'person'}
                  size={20}
                  color="#fff"
                />
              )}
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

      {/* Modern Input Bar (dynamic bottom offset) */}
      <View
        style={{
          paddingBottom: keyboardHeight > 0 ? 0 : insets.bottom || 8,
          marginBottom: keyboardHeight > 0 ? keyboardHeight : 0,
        }}
      >
        <View className="mx-3 bg-dark-surface/95 rounded-3xl px-4 pt-3 pb-3 shadow-lg border border-dark-border">
          <View className="flex-row items-end">
            {/* Leading actions (enabled for all chats now) */}
            <TouchableOpacity className="mr-3" onPress={handlePickFile} activeOpacity={0.7}>
              <Ionicons name="add-circle-outline" size={26} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity className="mr-3" onPress={() => {}} activeOpacity={0.7}>
              <Ionicons name="happy-outline" size={26} color="#3B82F6" />
            </TouchableOpacity>

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
