import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import UserProfileModal from '../../components/UserProfileModal';
import { userService } from '../../src/services/user.service';

export default function ExploreScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const result = await userService.getUserByUId(searchQuery.trim());
      setSearchResults(result);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = (user) => {
    setSelectedUser(user);
    setProfileModalVisible(true);
  };

  const handleStartChat = (user) => {
    const userId = user._id;
    const userName = user.U_Id;

    router.push({
      pathname: '/chat-conversation',
      params: { userId, userName },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
        <Text style={styles.headerSubtitle}>Find and connect with users</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <View style={styles.inputContainer}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by User ID..."
              placeholderTextColor="#666666"
              style={styles.input}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity
            onPress={handleSearch}
            disabled={loading || !searchQuery.trim()}
            style={[
              styles.searchButton,
              loading || !searchQuery.trim()
                ? styles.searchButtonDisabled
                : styles.searchButtonActive,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="search" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.resultsContainer}>
        {searchResults ? (
          <View style={styles.resultCard}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {searchResults.U_Id?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
              <View style={styles.onlineStatus}>
                <View
                  style={[
                    styles.onlineDot,
                    searchResults.online ? styles.onlineDotActive : styles.onlineDotInactive,
                  ]}
                />
                <Text style={styles.onlineText}>{searchResults.online ? 'Online' : 'Offline'}</Text>
              </View>
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.userName}>{searchResults.U_Id}</Text>
              <View style={styles.bioContainer}>
                <Text style={styles.bioText}>
                  {searchResults.description || 'No bio available'}
                </Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={() => handleViewProfile(searchResults)}
                style={styles.viewProfileButton}
              >
                <Text style={styles.viewProfileText}>View Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleStartChat(searchResults)}
                style={styles.startChatButton}
              >
                <Text style={styles.startChatText}>Start Chat</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={64} color="#6B7280" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyTitle}>Search for Users</Text>
            <Text style={styles.emptySubtitle}>
              Enter a User ID to find and connect with other users
            </Text>
          </View>
        )}
      </View>

      <UserProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        user={selectedUser}
        onStartChat={() => {
          setProfileModalVisible(false);
          if (selectedUser) {
            handleStartChat(selectedUser);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888888',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchRow: {
    flexDirection: 'row',
  },
  inputContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginRight: 8,
  },
  input: {
    color: '#ffffff',
    paddingVertical: 12,
  },
  searchButton: {
    paddingHorizontal: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: '#2a2a2a',
  },
  searchButtonActive: {
    backgroundColor: '#3B82F6',
  },
  searchButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  resultCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  onlineDotActive: {
    backgroundColor: '#22c55e',
  },
  onlineDotInactive: {
    backgroundColor: '#6b7280',
  },
  onlineText: {
    color: '#888888',
    fontSize: 12,
  },
  userInfo: {
    marginBottom: 16,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  bioContainer: {
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  bioText: {
    fontSize: 14,
    color: '#cccccc',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  viewProfileButton: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginRight: 8,
  },
  viewProfileText: {
    color: '#cccccc',
    fontWeight: '600',
  },
  startChatButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 4,
  },
  startChatText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#888888',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
