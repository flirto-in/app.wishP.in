/**
 * E2EE Integration Example
 * Complete flow: Setup → Send Encrypted Message → Receive & Decrypt
 *
 * This file demonstrates how to integrate Signal Protocol E2EE into WhispChat.
 * Run these functions in sequence to test the full E2EE flow.
 */

import e2eeService from '../services/e2eeService';
import signalProtocol from '../services/signalProtocol';
import mediaEncryption from '../services/mediaEncryption';
import api from '../services/api';

// ============= SETUP: GENERATE AND UPLOAD PREKEYS =============

/**
 * Initialize E2EE for current user
 * Call this once on app start or when E2EE is enabled
 */
export async function initializeE2EE() {
  try {
    console.log('🔐 Initializing E2EE...');

    // Generate prekey bundle
    const bundle = await signalProtocol.generatePrekeyBundle(100);

    // Upload to server
    const response = await api.post('/keys/prekeys', bundle);

    console.log('✅ E2EE initialized:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ E2EE initialization failed:', error);
    throw error;
  }
}

/**
 * Refresh one-time prekeys when running low
 * Call periodically or when oneTimePrekeyCount < 20
 */
export async function refreshOneTimePrekeys() {
  try {
    // Generate new batch
    const newPrekeys = [];
    for (let i = 0; i < 50; i++) {
      const prekeyPair = await e2eeService.generateX25519KeyPair();
      const prekeyId = `${Date.now()}_${i}`;
      await e2eeService.storePrivateKey(`otp_${prekeyId}`, prekeyPair.privateKey);
      newPrekeys.push({ id: prekeyId, publicKey: prekeyPair.publicKey });
    }

    // Upload to server
    const response = await api.post('/keys/refresh', { oneTimePrekeys: newPrekeys });

    console.log('✅ One-time prekeys refreshed:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Prekey refresh failed:', error);
    throw error;
  }
}

// ============= SEND ENCRYPTED TEXT MESSAGE =============

/**
 * Send encrypted text message to peer
 *
 * @param {string} peerUserId - Recipient's user ID
 * @param {string} plaintext - Message text
 * @param {object} socketService - Socket.io service instance
 */
export async function sendEncryptedMessage(peerUserId, plaintext, socketService) {
  try {
    // Check if session exists
    // ✅ FIXED: Use full peerUserId as session ID
    const sessionId = peerUserId;
    let session = await signalProtocol.getSessionState(sessionId);

    // If no session, initiate X3DH
    if (!session) {
      console.log('🔑 No session found, initiating X3DH...');

      // Fetch peer's prekey bundle
      // ✅ FIXED: Correct API endpoint
      const bundleResponse = await api.get(`/keys/prekeys/${peerUserId}`);
      const peerBundle = bundleResponse.data.data;

      // Perform X3DH key agreement
      // ✅ FIXED: Pass peerUserId to use as session ID
      const { sessionId: newSessionId, initialHeader } = await signalProtocol.initiateSession(
        peerBundle,
        peerUserId,
      );

      console.log('✅ X3DH session initiated:', newSessionId);

      // Send initial header via socket (unencrypted, but authenticated)
      socketService.emit('e2ee:init-session', {
        receiverId: peerUserId,
        header: initialHeader,
      });
    }

    // Encrypt message with Double Ratchet
    const encrypted = await signalProtocol.ratchetEncrypt(sessionId, plaintext);

    // Send encrypted message via socket
    socketService.emit('message:send', {
      receiverId: peerUserId,
      encryptedText: encrypted.ciphertext,
      ratchetHeader: encrypted.header,
      nonce: encrypted.nonce,
      messageType: 'text',
    });

    console.log('✅ Encrypted message sent');

    return encrypted;
  } catch (error) {
    console.error('❌ Send encrypted message failed:', error);
    throw error;
  }
}

// ============= RECEIVE ENCRYPTED TEXT MESSAGE =============

/**
 * Decrypt received encrypted message
 * Call this in socket 'message:receive' handler
 *
 * @param {object} encryptedMessage - Received encrypted message
 * @returns {string} Decrypted plaintext
 */
export async function receiveEncryptedMessage(encryptedMessage) {
  try {
    const { senderId, encryptedText, ratchetHeader, nonce } = encryptedMessage;

    // Derive session ID from sender
    // ✅ FIXED: Use full senderId as session ID
    const sessionId = senderId;

    // Check if we have a session
    let session = await signalProtocol.getSessionState(sessionId);

    // If no session, this might be the first message (need to accept X3DH)
    if (!session && encryptedMessage.initialHeader) {
      console.log('🔑 Accepting X3DH session from', senderId);
      // ✅ FIXED: Pass senderId as session ID
      await signalProtocol.acceptSession(encryptedMessage.initialHeader, senderId);

      // Re-check session after acceptance
      session = await signalProtocol.getSessionState(sessionId);
    }

    // Decrypt message
    const plaintext = await signalProtocol.ratchetDecrypt(sessionId, {
      ciphertext: encryptedText,
      header: ratchetHeader,
      nonce,
    });

    console.log('✅ Message decrypted:', plaintext);

    return plaintext;
  } catch (error) {
    console.error('❌ Decrypt message failed:', error);
    throw error;
  }
}

// ============= SEND ENCRYPTED IMAGE/FILE =============

/**
 * Send encrypted image/file to peer
 *
 * @param {string} peerUserId - Recipient's user ID
 * @param {string} fileUri - Local file URI
 * @param {object} socketService - Socket.io service instance
 */
export async function sendEncryptedFile(peerUserId, fileUri, socketService) {
  try {
    const sessionId = `${peerUserId}`.slice(0, 16);

    // Ensure session exists (same as text message flow)
    let session = await signalProtocol.getSessionState(sessionId);
    if (!session) {
      console.log('🔑 Initiating session for file transfer...');
      const bundleResponse = await api.get(`/keys/prekeys/${peerUserId}`);
      const { initialHeader } = await signalProtocol.initiateSession(bundleResponse.data.data);
      socketService.emit('e2ee:init-session', {
        receiverId: peerUserId,
        header: initialHeader,
      });
    }

    // Encrypt file
    const { encryptedBlob, encryptedFileKey, fileNonce, originalName, mimeType } =
      await mediaEncryption.encryptFile(fileUri, sessionId);

    // Upload encrypted blob to server (server stores ciphertext only)
    const formData = new FormData();
    formData.append('file', {
      uri: `data:${mimeType};base64,${encryptedBlob}`,
      name: originalName,
      type: mimeType,
    });
    formData.append('receiverId', peerUserId);

    const uploadResponse = await api.post('/messages/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const encryptedBlobUrl = uploadResponse.data.data.message.mediaUrl;

    // Send encrypted file key via E2EE message channel
    socketService.emit('message:send', {
      receiverId: peerUserId,
      encryptedText: JSON.stringify({
        type: 'file',
        encryptedFileKey,
        fileNonce,
        encryptedBlobUrl,
        originalName,
        mimeType,
      }),
      messageType: 'file',
    });

    console.log('✅ Encrypted file sent');

    return { encryptedBlobUrl, originalName };
  } catch (error) {
    console.error('❌ Send encrypted file failed:', error);
    throw error;
  }
}

// ============= RECEIVE ENCRYPTED IMAGE/FILE =============

/**
 * Decrypt and save received encrypted file
 *
 * @param {object} fileMessage - Received file message
 * @returns {string} Local file URI
 */
export async function receiveEncryptedFile(fileMessage) {
  try {
    const { senderId, encryptedText } = fileMessage;
    const sessionId = `${senderId}`.slice(0, 16);

    // Parse file metadata
    const fileData = JSON.parse(encryptedText);
    const { encryptedFileKey, fileNonce, encryptedBlobUrl, originalName } = fileData;

    // Download encrypted blob from server
    const blobResponse = await fetch(encryptedBlobUrl);
    const blobArrayBuffer = await blobResponse.arrayBuffer();
    const encryptedBlob = e2eeService.toBase64(new Uint8Array(blobArrayBuffer));

    // Decrypt file
    const decryptedBytes = await mediaEncryption.decryptFile(
      encryptedBlob,
      encryptedFileKey,
      fileNonce,
      sessionId,
    );

    // Save to local filesystem
    const localUri = await mediaEncryption.saveDecryptedFile(decryptedBytes, originalName);

    console.log('✅ Encrypted file received and decrypted:', localUri);

    return localUri;
  } catch (error) {
    console.error('❌ Receive encrypted file failed:', error);
    throw error;
  }
}

// ============= USAGE IN ChatContext.js =============

/**
 * Integration Example:
 *
 * // In ChatContext.js
 * import { sendEncryptedMessage, receiveEncryptedMessage } from './services/e2eeExample';
 *
 * // When sending message:
 * const sendMessage = useCallback((text) => {
 *   if (e2eeEnabled) {
 *     await sendEncryptedMessage(activeChat._id, text, socketService);
 *   } else {
 *     // Fallback to plaintext
 *     socketService.sendMessage(activeChat._id, text);
 *   }
 * }, [activeChat, e2eeEnabled]);
 *
 * // When receiving message:
 * socketService.on('message:receive', async (message) => {
 *   if (message.encryptedText && message.ratchetHeader) {
 *     const plaintext = await receiveEncryptedMessage(message);
 *     // Display plaintext
 *   } else {
 *     // Handle plaintext message
 *   }
 * });
 */

export default {
  initializeE2EE,
  refreshOneTimePrekeys,
  sendEncryptedMessage,
  receiveEncryptedMessage,
  sendEncryptedFile,
  receiveEncryptedFile,
};
