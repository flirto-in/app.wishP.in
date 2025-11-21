import { useRouter } from 'expo-router';
import { useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  TextInput,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const [query, setQuery] = useState('');

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

  const filteredChats = useMemo(() => {
    const list = (activeTab === 'primary' ? primaryChats : secondaryChats) || [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((c) => {
      const userObj = c.user || c;
      return (userObj.U_Id || '').toLowerCase().includes(q);
    });
  }, [activeTab, primaryChats, secondaryChats, query]);

  // Relative time formatter for last message timestamp
  const formatRelativeTime = (iso) => {
    if (!iso) return '';
    const date = new Date(iso);
    const now = Date.now();
    const diff = now - date.getTime();

    const sec = Math.floor(diff / 1000);
    if (sec < 60) return 'Just now';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h`;
    const day = Math.floor(hr / 24);
    if (day === 1) return 'Yesterday';
    if (day < 7) return `${day}d`;
    const week = Math.floor(day / 7);
    if (week < 5) return `${week}w`;
    const month = Math.floor(day / 30);
    if (month < 12) return `${month}mo`;
    const year = Math.floor(day / 365);
    return `${year}y`;
  };

  // Avatar color selection (simple hash -> palette index)
  const avatarPalette = [
    ['#3B82F6', '#6366F1'], // blue → indigo
    ['#8B5CF6', '#D946EF'], // violet → fuchsia
    ['#F59E0B', '#EF4444'], // amber → red
    ['#10B981', '#059669'], // emerald duo
    ['#06B6D4', '#0EA5E9'], // cyan → sky
  ];

  const getAvatarColors = (id) => {
    if (!id) return avatarPalette[0];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % avatarPalette.length;
    return avatarPalette[idx];
  };

  const renderChatItem = ({ item }) => {
    // Handle different structures: primary has direct user, secondary has nested user
    const userObj = item.user || item; // secondary has item.user, primary is item itself
    const userId = userObj._id;
    const userName = userObj.U_Id || 'User';
    const isOnline = userId && onlineUsers.includes(userId);
    const isMuted = userObj.isMuted || false;
    const unread = item.unreadCount > 0;
    const lastTime = formatRelativeTime(item.lastMessageTime);
    const lastMessageRaw = item.lastMessage || 'No messages yet';
    const lastMessage = lastMessageRaw.length > 80 ? `${lastMessageRaw.slice(0, 77)}…` : lastMessageRaw;
    const [startColor, endColor] = getAvatarColors(userId);

    return (
      <TouchableOpacity
        onPress={() => handleChatPress(item)}
        onLongPress={() => handleLongPress(item)}
        className={`flex-row items-center rounded-3xl mb-3 px-4 py-3 border active:opacity-75 ${
          unread ? 'bg-dark-card/90 border-blue-600/40' : 'bg-dark-surface/90 border-dark-border'
        }`}
        style={{
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 6,
          elevation: 3,
        }}
      >
        {/* Avatar */}
        <View className="relative mr-4">
          <View
            className={`w-14 h-14 rounded-full justify-center items-center shadow-md overflow-hidden`}
            style={{
              backgroundColor: startColor,
            }}
          >
            <View
              style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: endColor,
                opacity: 0.35,
              }}
            />
            <Text className="text-xl text-white font-bold">
              {userName?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          {isOnline && (
            <View className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-dark-surface" />
          )}
          {unread && item.unreadCount > 0 && (
            <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-5 h-5 px-1 justify-center items-center border-2 border-dark-surface">
              <Text className="text-white text-[10px] font-bold">
                {item.unreadCount > 9 ? '9+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>

        {/* Middle content */}
        <View className="flex-1 mr-3">
          <View className="flex-row items-center mb-1">
            <Text
              className={`text-base font-semibold ${unread ? 'text-white' : 'text-dark-text-primary'}`}
              numberOfLines={1}
            >
              {userName}
            </Text>
            {isMuted && (
              <Ionicons name="notifications-off" size={14} color="#9CA3AF" style={{ marginLeft: 6 }} />
            )}
          </View>
          <View className="flex-row items-center">
            <Text
              className={`text-sm flex-1 ${unread ? 'text-blue-100 font-medium' : 'text-dark-text-muted'}`}
              numberOfLines={1}
            >
              {lastMessage}
            </Text>
            {!unread && lastTime && (
              <Text className="text-[11px] text-dark-text-muted ml-2" numberOfLines={1}>
                {lastTime}
              </Text>
            )}
          </View>
        </View>

        {/* Meta column */}
        <View className="items-end justify-between h-14 py-1">
          <Text className={`text-[11px] ${unread ? 'text-blue-300' : 'text-transparent'}`}>{lastTime}</Text>
          <View className="mt-auto flex-row items-center">
            {unread && (
              <View className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
            )}
            <Ionicons name="chevron-forward" size={18} color="#6B7280" />
          </View>
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
      {/* Header with search and tabs */}
      <View className="px-5 pt-5 pb-0">
        <View className="flex-row items-end justify-between mb-3">
          <Text className="text-2xl font-bold text-dark-text-primary">Chats</Text>
          <Text className="text-xs text-dark-text-muted">
            {primaryChats.length + secondaryChats.length} total
          </Text>
        </View>

        {/* Search */}
        <View className="flex-row items-center bg-dark-surface rounded-2xl px-3 py-2 border border-dark-border mb-3">
          <Ionicons name="search" size={18} color="#6B7280" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            placeholderTextColor="#6B7280"
            className="flex-1 ml-2 text-dark-text-primary"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Selector */}
        <View className="flex-row bg-dark-surface rounded-2xl p-1 mb-3 border border-dark-border">
          <TouchableOpacity
            onPress={() => setActiveTab('primary')}
            className={`flex-1 py-3 rounded-xl ${
              activeTab === 'primary' ? 'bg-dark-accent-blue' : 'bg-transparent'
            }`}
          >
            <View className="flex-row justify-center items-center">
              <Ionicons
                name="star"
                size={16}
                color={activeTab === 'primary' ? '#fff' : '#9CA3AF'}
              />
              <Text
                className={`ml-2 font-semibold ${
                  activeTab === 'primary' ? 'text-white' : 'text-dark-text-muted'
                }`}
              >
                Primary
              </Text>
              {primaryChats.length > 0 && (
                <View
                  className={`ml-2 px-2 py-0.5 rounded-full ${activeTab === 'primary' ? 'bg-white/20' : 'bg-dark-border'}`}
                >
                  <Text
                    className={`${activeTab === 'primary' ? 'text-white' : 'text-dark-text-muted'} text-xs`}
                  >
                    {primaryChats.length}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('secondary')}
            className={`flex-1 py-3 rounded-xl ${
              activeTab === 'secondary' ? 'bg-dark-accent-blue' : 'bg-transparent'
            }`}
          >
            <View className="flex-row justify-center items-center">
              <Ionicons
                name="chatbubbles"
                size={16}
                color={activeTab === 'secondary' ? '#fff' : '#9CA3AF'}
              />
              <Text
                className={`ml-2 font-semibold ${
                  activeTab === 'secondary' ? 'text-white' : 'text-dark-text-muted'
                }`}
              >
                Secondary
              </Text>
              {secondaryChats.length > 0 && (
                <View
                  className={`ml-2 px-2 py-0.5 rounded-full ${activeTab === 'secondary' ? 'bg-white/20' : 'bg-dark-border'}`}
                >
                  <Text
                    className={`${activeTab === 'secondary' ? 'text-white' : 'text-dark-text-muted'} text-xs`}
                  >
                    {secondaryChats.length}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat List */}
      <FlatList
        data={filteredChats}
        keyExtractor={(item, index) => item._id || item.id || index.toString()}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
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
            <Ionicons
              name={activeTab === 'primary' ? 'star' : 'chatbubbles'}
              size={64}
              color="#6B7280"
            />
            <Text className="text-dark-text-primary text-lg font-semibold mb-2 mt-4">
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

      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={() => router.push('/explore')}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 justify-center items-center shadow-2xl"
        activeOpacity={0.85}
      >
        <Ionicons name="person-add" size={24} color="#fff" />
      </TouchableOpacity>

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
                  <Ionicons name="star" size={24} color="#3B82F6" />
                  <Text className="text-base text-dark-text-primary font-medium ml-4">
                    Move to Primary
                  </Text>
                </TouchableOpacity>
              )}

              {activeTab === 'primary' && (
                <TouchableOpacity
                  onPress={() => handleContextMenuAction('moveToSecondary')}
                  className="flex-row items-center px-6 py-4 active:bg-dark-border"
                >
                  <Ionicons name="archive" size={24} color="#3B82F6" />
                  <Text className="text-base text-dark-text-primary font-medium ml-4">
                    Move to Secondary
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => handleContextMenuAction('mute')}
                className="flex-row items-center px-6 py-4 active:bg-dark-border"
              >
                <Ionicons
                  name={
                    (selectedChat?.user || selectedChat)?.isMuted
                      ? 'notifications'
                      : 'notifications-off'
                  }
                  size={24}
                  color="#3B82F6"
                />
                <Text className="text-base text-dark-text-primary font-medium ml-4">
                  {(selectedChat?.user || selectedChat)?.isMuted ? 'Unmute' : 'Mute'} Notifications
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleContextMenuAction('clear')}
                className="flex-row items-center px-6 py-4 active:bg-dark-border"
              >
                <Ionicons name="trash-outline" size={24} color="#3B82F6" />
                <Text className="text-base text-dark-text-primary font-medium ml-4">
                  Clear Chat
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleContextMenuAction('delete')}
                className="flex-row items-center px-6 py-4 active:bg-dark-border"
              >
                <Ionicons name="close-circle" size={24} color="#EF4444" />
                <Text className="text-base text-red-500 font-medium ml-4">Delete Chat</Text>
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
