import { useRouter } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChatContext } from '../../src/context/ChatContext';

export default function ChatScreen() {
  const router = useRouter();
  const {
    primaryChats,
    secondaryChats,
    onlineUsers,
    loading,
    loadChats,
    moveToPrimary,
    moveToSecondary,
    deleteChat,
    clearChat,
    muteChat,
  } = useContext(ChatContext);

  const [activeTab, setActiveTab] = useState('primary'); // 'primary' or 'secondary'
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadChats();
    setRefreshing(false);
  };

  const handleChatPress = (chat) => {
    // Handle different structures: primary has direct user, secondary has nested user
    const userObj = chat.user || chat;
    const userId = userObj._id;
    const userName = userObj.U_Id || 'User';

    router.push({
      pathname: '/chat-conversation',
      params: { userId, userName },
    });
  };

  const handleLongPress = (chat) => {
    setSelectedChat(chat);
    setContextMenuVisible(true);
  };

  const handleContextMenuAction = async (action) => {
    if (!selectedChat) return;

    // Handle different structures: primary has direct user, secondary has nested user
    const userObj = selectedChat.user || selectedChat;
    const userId = userObj._id;

    try {
      switch (action) {
        case 'moveToPrimary':
          await moveToPrimary?.(userId);
          break;
        case 'moveToSecondary':
          await moveToSecondary?.(userId);
          break;
        case 'delete':
          await deleteChat?.(userId);
          break;
        case 'clear':
          await clearChat?.(userId);
          break;
        case 'mute':
          await muteChat?.(userId);
          break;
      }
      await loadChats();
    } catch (error) {
      console.error('Context menu action error:', error);
    } finally {
      setContextMenuVisible(false);
      setSelectedChat(null);
    }
  };

  const getDisplayChats = () => {
    return activeTab === 'primary' ? primaryChats : secondaryChats;
  };

  const renderChatItem = ({ item }) => {
    // Handle different structures: primary has direct user, secondary has nested user
    const userObj = item.user || item; // secondary has item.user, primary is item itself
    const userId = userObj._id;
    const userName = userObj.U_Id || 'User';
    const isOnline = userId && onlineUsers.includes(userId);
    const isMuted = userObj.isMuted || false;

    return (
      <TouchableOpacity
        onPress={() => handleChatPress(item)}
        onLongPress={() => handleLongPress(item)}
        className="flex-row items-center bg-dark-surface rounded-2xl p-4 mb-3 active:bg-dark-border"
      >
        {/* Avatar with online indicator */}
        <View className="relative mr-4">
          <View className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 justify-center items-center shadow-lg">
            <Text className="text-xl text-white font-bold">
              {userName?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          {isOnline && (
            <View className="absolute bottom-0 right-0 w-4 h-4 bg-green-400 rounded-full border-2 border-dark-surface shadow-md" />
          )}
          {item.unreadCount > 0 && (
            <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 justify-center items-center border-2 border-dark-surface">
              <Text className="text-white text-xs font-bold">
                {item.unreadCount > 9 ? '9+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>

        {/* Chat Info */}
        <View className="flex-1">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-base font-semibold text-dark-text-primary">{userName}</Text>
            {item.lastMessageTime && (
              <Text className="text-xs text-dark-text-muted">
                {new Date(item.lastMessageTime).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            )}
          </View>

          <View className="flex-row items-center">
            <Text className="text-sm text-dark-text-muted flex-1" numberOfLines={1}>
              {item.lastMessage || 'No messages yet'}
            </Text>
            {isMuted && (
              <View className="ml-2">
                <Text className="text-dark-text-muted">🔕</Text>
              </View>
            )}
          </View>
        </View>

        {/* Chevron indicator */}
        <View className="ml-2">
          <Text className="text-dark-text-muted text-lg">›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-dark-bg">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-dark-bg">
      {/* Header with Tabs */}
      <View className="px-5 pt-5 pb-0">
        <Text className="text-2xl font-bold text-dark-text-primary mb-4">Chats</Text>

        {/* Tab Selector */}
        <View className="flex-row bg-dark-surface rounded-2xl p-1 mb-3">
          <TouchableOpacity
            onPress={() => setActiveTab('primary')}
            className={`flex-1 py-3 rounded-xl ${
              activeTab === 'primary' ? 'bg-dark-accent-blue' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-center font-semibold ${
                activeTab === 'primary' ? 'text-white' : 'text-dark-text-muted'
              }`}
            >
              Primary {primaryChats.length > 0 && `(${primaryChats.length})`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('secondary')}
            className={`flex-1 py-3 rounded-xl ${
              activeTab === 'secondary' ? 'bg-dark-accent-blue' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-center font-semibold ${
                activeTab === 'secondary' ? 'text-white' : 'text-dark-text-muted'
              }`}
            >
              Secondary {secondaryChats.length > 0 && `(${secondaryChats.length})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat List */}
      <FlatList
        data={getDisplayChats()}
        keyExtractor={(item, index) => item._id || item.id || index.toString()}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#3B82F6"
            colors={['#3B82F6']}
          />
        }
        renderItem={renderChatItem}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Text className="text-6xl mb-4">{activeTab === 'primary' ? '⭐' : '💬'}</Text>
            <Text className="text-dark-text-primary text-lg font-semibold mb-2">
              {activeTab === 'primary' ? 'No primary chats' : 'No secondary chats'}
            </Text>
            <Text className="text-dark-text-muted text-center px-10">
              {activeTab === 'primary'
                ? 'Long press on any chat in Secondary to add here'
                : 'All your chats will appear here'}
            </Text>
          </View>
        }
      />

      {/* Context Menu Modal */}
      <Modal
        visible={contextMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setContextMenuVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setContextMenuVisible(false)}
          className="flex-1 bg-black/50 justify-center items-center"
        >
          <View className="bg-dark-surface rounded-3xl w-72 overflow-hidden shadow-2xl">
            {/* Header */}
            <View className="px-6 py-4 bg-dark-card border-b border-dark-border">
              <Text className="text-lg font-semibold text-dark-text-primary">
                {(selectedChat?.user || selectedChat)?.U_Id || 'Chat Options'}
              </Text>
            </View>

            {/* Menu Options */}
            <View className="py-2">
              {activeTab === 'secondary' && (
                <TouchableOpacity
                  onPress={() => handleContextMenuAction('moveToPrimary')}
                  className="flex-row items-center px-6 py-4 active:bg-dark-border"
                >
                  <Text className="text-2xl mr-4">⭐</Text>
                  <Text className="text-base text-dark-text-primary font-medium">
                    Move to Primary
                  </Text>
                </TouchableOpacity>
              )}

              {activeTab === 'primary' && (
                <TouchableOpacity
                  onPress={() => handleContextMenuAction('moveToSecondary')}
                  className="flex-row items-center px-6 py-4 active:bg-dark-border"
                >
                  <Text className="text-2xl mr-4">📥</Text>
                  <Text className="text-base text-dark-text-primary font-medium">
                    Move to Secondary
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => handleContextMenuAction('mute')}
                className="flex-row items-center px-6 py-4 active:bg-dark-border"
              >
                <Text className="text-2xl mr-4">
                  {(selectedChat?.user || selectedChat)?.isMuted ? '🔔' : '🔕'}
                </Text>
                <Text className="text-base text-dark-text-primary font-medium">
                  {(selectedChat?.user || selectedChat)?.isMuted ? 'Unmute' : 'Mute'} Notifications
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleContextMenuAction('clear')}
                className="flex-row items-center px-6 py-4 active:bg-dark-border"
              >
                <Text className="text-2xl mr-4">🗑️</Text>
                <Text className="text-base text-dark-text-primary font-medium">Clear Chat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleContextMenuAction('delete')}
                className="flex-row items-center px-6 py-4 active:bg-dark-border"
              >
                <Text className="text-2xl mr-4">❌</Text>
                <Text className="text-base text-red-500 font-medium">Delete Chat</Text>
              </TouchableOpacity>
            </View>

            {/* Cancel Button */}
            <View className="border-t border-dark-border">
              <TouchableOpacity
                onPress={() => setContextMenuVisible(false)}
                className="px-6 py-4 active:bg-dark-border"
              >
                <Text className="text-base text-dark-accent-blue font-semibold text-center">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
