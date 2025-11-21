import { useRouter } from 'expo-router';
import { useContext, useState } from 'react';
import {
  ActivityIndicator,
  Clipboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import api from '../src/services/api';
import { AuthContext } from '../src/context/AuthContext';

export default function TempSessionScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [peerId, setPeerId] = useState('');
  const [error, setError] = useState(null);
  const { getUser } = useContext(AuthContext);

  const startTempSession = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.post('/auth/temp-session');
      const { accessToken, user: createdUser } = res.data.data;

      // Save token for socket connection
      await SecureStore.setItemAsync('userToken', accessToken);

      // Let AuthContext refresh and set the user state
      try {
        await getUser();
      } catch (e) {
        console.warn('Failed to refresh AuthContext user after temp session', e);
      }

      setUser(createdUser);
    } catch (err) {
      console.error('Failed to create temp session', err);
      setError('Failed to start temporary session. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyInvite = async () => {
    if (!user) return;
    const inviteText = `Join my temp chat: userId=${user._id}`;
    Clipboard.setString(inviteText);
  };

  const openChatWithPeer = async () => {
    if (!peerId.trim()) {
      setError('Please enter a peer user id to chat with');
      return;
    }

    // Navigate to chat screen with params
    router.push({
      pathname: '/chat-conversation',
      params: { userId: peerId.trim(), userName: 'Guest' },
    });
  };

  const joinPublicRoom = () => {
    // Navigate to chat screen with room params
    router.push({
      pathname: '/chat-conversation',
      params: {
        roomId: 'public_temp',
        userName: 'Public Room',
        isPublicRoom: 'true',
      },
    });
  };

  return (
    <View className="flex-1 p-4 bg-dark-bg">
      <View className="my-6">
        <Text className="text-dark-text-primary text-xl font-semibold mb-2">
          Temporary Chat Session
        </Text>
        <Text className="text-dark-text-muted">
          Start a temporary guest session to chat without registering.
        </Text>
      </View>

      {!user ? (
        <View>
          <TouchableOpacity
            onPress={startTempSession}
            disabled={loading}
            className="bg-blue-500 rounded-lg py-3 items-center"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">Start Temporary Session</Text>
            )}
          </TouchableOpacity>

          {error && <Text className="text-red-400 mt-3">{error}</Text>}
        </View>
      ) : (
        <View>
          <View className="bg-dark-surface rounded-lg p-4 mb-4">
            <Text className="text-dark-text-primary">Your temporary user ID:</Text>
            <Text className="text-white font-mono mt-2">{user._id}</Text>
            <Text className="text-dark-text-muted mt-2">Display name: {user.U_Id}</Text>
          </View>

          <TouchableOpacity
            onPress={copyInvite}
            className="bg-gray-700 rounded-lg py-2 items-center mb-4"
          >
            <Text className="text-white">Copy Invite Link</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={joinPublicRoom}
            className="bg-green-600 rounded-lg py-3 items-center mb-4"
          >
            <Text className="text-white font-semibold">Join Public Room</Text>
          </TouchableOpacity>

          <Text className="text-dark-text-muted mb-2 mt-2">
            Or enter peer user ID to start private chat:
          </Text>
          <TextInput
            value={peerId}
            onChangeText={setPeerId}
            placeholder="Peer user id"
            placeholderTextColor="#999"
            className="bg-dark-card rounded-lg p-3 mb-3 text-dark-text-primary"
          />

          <TouchableOpacity
            onPress={openChatWithPeer}
            className="bg-blue-500 rounded-lg py-3 items-center"
          >
            <Text className="text-white font-semibold">Open Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              // Allow user to create another temp session
              setUser(null);
              setPeerId('');
            }}
            className="mt-3 items-center"
          >
            <Text className="text-dark-accent-blue">Start a new temp session</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
