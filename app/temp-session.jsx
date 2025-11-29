import { useRouter } from 'expo-router';
import { useContext, useState } from 'react';
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  Alert,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
// Removed unused imports SecureStore, api
import { chatService } from '../src/services/chatService';
import { ChatContext } from '../src/context/ChatContext';

// Optional barcode scanner import
let BarCodeScanner = null;
try {
  BarCodeScanner = require('expo-barcode-scanner').BarCodeScanner;
} catch (_e) {
  console.log('BarCodeScanner not available, QR scan disabled');
}

export default function TempSessionScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [peerCode, setPeerCode] = useState('');
  const [error, setError] = useState(null);
  // Removed unused getUser extraction
  const { openTempSession } = useContext(ChatContext);
  const [session, setSession] = useState(null);
  const [warningVisible, setWarningVisible] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [hasScannerPermission, setHasScannerPermission] = useState(null);

  const requestScannerPermission = async () => {
    if (!BarCodeScanner) {
      Alert.alert('QR Scanner Unavailable', 'Please rebuild the app with: npx expo run:android');
      return;
    }
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    setHasScannerPermission(status === 'granted');
    if (status === 'granted') setShowScanner(true);
  };

  const handleBarCodeScanned = async ({ data }) => {
    setShowScanner(false);
    setPeerCode(data);
    try {
      setLoading(true);
      const res = await chatService.joinTempSession(data.trim());
      setSession(res);
      openTempSession(res);
    } catch (_err) {
      setError('Invalid or inactive session code');
    } finally {
      setLoading(false);
    }
  };

  const startTempSession = async () => {
    setWarningVisible(false);
    try {
      setLoading(true);
      setError(null);
      const data = await chatService.createTempSession();
      setSession(data);
      openTempSession(data); // open as active chat room
    } catch (err) {
      console.error('Failed to create temp session', err);
      setError('Failed to start temp session.');
    } finally {
      setLoading(false);
    }
  };

  const copyInvite = async () => {
    if (!session) return;
    const inviteText = `Temp Chat Code: ${session.code}`;
    await Clipboard.setStringAsync(inviteText);
  };

  const joinByCode = async () => {
    if (!peerCode.trim()) {
      setError('Enter a session code');
      return;
    }
    try {
      setLoading(true);
      const data = await chatService.joinTempSession(peerCode.trim());
      setSession(data);
      openTempSession(data);
    } catch (_err) {
      console.error('Join failed', _err);
      setError('Failed to join session');
    } finally {
      setLoading(false);
    }
  };

  // Removed unused joinPublicRoom

  return (
    <View className="flex-1 bg-[#0f1115] px-5 pt-8">
      <Text className="text-3xl font-extrabold text-white mb-2">Temp Chat</Text>
      <Text className="text-sm text-gray-400 mb-6">
        🔐 Encrypted 1-to-1 ephemeral chats. Max 2 people. Messages auto-delete.
      </Text>

      {!session && (
        <View className="mb-8">
          <TouchableOpacity
            onPress={() => setWarningVisible(true)}
            disabled={loading}
            className="flex-row items-center justify-center bg-gradient-to-r from-pink-600 via-fuchsia-600 to-indigo-600 rounded-2xl py-4 shadow-lg"
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">Start New Temp Session</Text>
            )}
          </TouchableOpacity>
          <View className="mt-6 bg-gray-800/40 border border-gray-700 rounded-2xl p-4">
            <Text className="text-gray-300 text-sm mb-2 font-medium">Join with Code</Text>
            <View className="flex-row items-center bg-gray-900 rounded-xl px-3 py-3 mb-3">
              <Ionicons name="key" size={18} color="#64748B" />
              <TextInput
                value={peerCode}
                onChangeText={setPeerCode}
                placeholder="Enter session code"
                placeholderTextColor="#64748B"
                className="flex-1 ml-2 text-white"
                autoCapitalize="characters"
              />
              {peerCode.length > 0 && (
                <TouchableOpacity onPress={() => setPeerCode('')}>
                  <Ionicons name="close-circle" size={18} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              onPress={joinByCode}
              className="bg-indigo-600 rounded-xl py-3 items-center"
              disabled={loading}
            >
              <Text className="text-white font-semibold">Join Session</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                BarCodeScanner
                  ? hasScannerPermission
                    ? setShowScanner(true)
                    : requestScannerPermission()
                  : Alert.alert(
                      'QR Scanner Unavailable',
                      'Enter session code manually or rebuild app',
                    )
              }
              className="bg-pink-600 rounded-xl py-3 items-center mt-3"
              disabled={loading}
            >
              <Text className="text-white font-semibold">
                {!BarCodeScanner
                  ? 'QR Scan (Rebuild Required)'
                  : hasScannerPermission
                    ? 'Scan QR Code'
                    : 'Grant Camera & Scan'}
              </Text>
            </TouchableOpacity>
            {error && <Text className="text-red-400 mt-3 text-xs">{error}</Text>}
          </View>
        </View>
      )}

      {session && (
        <View className="flex-1">
          <View className="bg-gray-900 border border-indigo-700/40 rounded-2xl p-5 mb-5">
            <Text className="text-xs tracking-wider text-indigo-400 mb-2 font-semibold">
              ACTIVE SESSION
            </Text>
            <Text className="text-white text-xl font-bold mb-1">Code: {session.code}</Text>
            <Text className="text-gray-400 mb-4 text-sm">Alias: {session.alias}</Text>
            <View className="items-center justify-center mb-4">
              <View className="bg-white p-3 rounded-xl">
                <QRCode value={session.code} size={140} backgroundColor="#ffffff" color="#111827" />
              </View>
              <Text className="text-[10px] text-gray-500 mt-2">Scan to join session</Text>
            </View>
            <View className="flex-row">
              <TouchableOpacity
                onPress={copyInvite}
                className="flex-1 bg-gray-700 rounded-xl py-3 items-center mr-3"
              >
                <Text className="text-white text-sm">Copy Code</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/chat-conversation',
                    params: {
                      roomId: `temp_room_${session.code}`,
                      userName: session.alias,
                      isPublicRoom: 'false',
                      isTempSession: 'true',
                      tempSessionId: session.sessionId,
                    },
                  })
                }
                className="flex-1 bg-indigo-600 rounded-xl py-3 items-center"
              >
                <Text className="text-white font-semibold">Open Chat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Warning Modal */}
      <Modal
        visible={warningVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWarningVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setWarningVisible(false)}
          className="flex-1 bg-black/60 justify-center px-6"
        >
          <View className="bg-gray-900 rounded-2xl p-6 border border-gray-700">
            <Text className="text-red-400 font-bold text-lg mb-2">Ephemeral 1-to-1 Session</Text>
            <Text className="text-gray-300 text-sm mb-4">
              • End-to-end encrypted (like normal chats){'\n'}• Only 2 people can join{'\n'}• All
              messages permanently deleted when session ends{'\n'}• Media sharing disabled for
              privacy
            </Text>
            <View className="flex-row mt-2">
              <TouchableOpacity
                onPress={() => setWarningVisible(false)}
                className="flex-1 bg-gray-700 rounded-xl py-3 items-center mr-3"
              >
                <Text className="text-gray-200">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={startTempSession}
                className="flex-1 bg-pink-600 rounded-xl py-3 items-center"
              >
                <Text className="text-white font-semibold">Start</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* QR Scanner Modal */}
      {BarCodeScanner && (
        <Modal
          visible={showScanner}
          transparent
          animationType="slide"
          onRequestClose={() => setShowScanner(false)}
        >
          <View className="flex-1 bg-black/80 justify-center px-6">
            <View className="rounded-2xl overflow-hidden border border-pink-700/40">
              {hasScannerPermission === false ? (
                <View className="bg-gray-900 p-6">
                  <Text className="text-red-400 mb-3 font-semibold">Camera permission denied</Text>
                  <Text className="text-gray-300 text-sm mb-4">
                    Enable camera access in settings to scan QR codes.
                  </Text>
                  <TouchableOpacity
                    onPress={requestScannerPermission}
                    className="bg-pink-600 rounded-xl py-3 items-center"
                  >
                    <Text className="text-white font-semibold">Retry Permission</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <BarCodeScanner
                  onBarCodeScanned={handleBarCodeScanned}
                  style={{ width: '100%', height: 320 }}
                />
              )}
            </View>
            <TouchableOpacity
              onPress={() => setShowScanner(false)}
              className="mt-4 bg-gray-800 rounded-xl py-3 items-center border border-gray-700"
            >
              <Text className="text-gray-200 font-medium">Close Scanner</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </View>
  );
}
