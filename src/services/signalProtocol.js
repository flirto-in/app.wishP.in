/**
 * Signal Protocol Implementation (X3DH + Double Ratchet)
 * Provides forward secrecy and deniable authentication
 *
 * Key Concepts:
 * - X3DH: Extended Triple Diffie-Hellman for initial key agreement
 * - Double Ratchet: Continuous key evolution for forward secrecy
 * - Chain Keys: Derive message keys, never reused
 * - Ratchet Keys: Ephemeral DH keys, rotated on each message exchange
 *
 * Security Properties:
 * ✅ Forward Secrecy: Past messages secure even if current keys compromised
 * ✅ Future Secrecy: Self-healing after key compromise
 * ✅ Replay Protection: Message counters prevent duplicate delivery
 * ✅ Out-of-Order Delivery: Skipped message keys stored temporarily
 */

import e2eeService from './e2eeService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BufferPolyfill } from '../utils/bufferPolyfill';

// Use BufferPolyfill as Buffer for React Native compatibility
const Buffer = BufferPolyfill;

class SignalProtocol {
  constructor() {
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    await e2eeService.init();
    this.initialized = true;
  }

  // ============= KEY BUNDLE MANAGEMENT =============

  /**
   * Generate prekey bundle for uploading to server
   * Bundle contains:
   * - Identity public key (Ed25519)
   * - Signed prekey (X25519) + signature
   * - Array of one-time prekeys (X25519)
   */
  async generatePrekeyBundle(count = 100) {
    await this.init();

    // Get or generate identity keypair
    let identityPrivateKey = await e2eeService.getPrivateKey('identity_private');
    let identityPublicKey = await AsyncStorage.getItem('identity_public');

    if (!identityPrivateKey) {
      const identityKeyPair = await e2eeService.generateIdentityKeyPair();
      identityPrivateKey = identityKeyPair.privateKey;
      identityPublicKey = identityKeyPair.publicKey;
      await e2eeService.storePrivateKey('identity_private', identityPrivateKey);
      await AsyncStorage.setItem('identity_public', identityPublicKey);
      console.log('✅ Generated new identity keypair');
    }

    // Generate signed prekey
    const signedPrekeyPair = await e2eeService.generateX25519KeyPair();
    const signedPrekeyId = Date.now();

    // Sign the public key with identity key
    const signature = await e2eeService.sign(signedPrekeyPair.publicKey, identityPrivateKey);

    // Store signed prekey privately
    await e2eeService.storePrivateKey(
      `signed_prekey_${signedPrekeyId}`,
      signedPrekeyPair.privateKey,
    );
    await AsyncStorage.setItem('current_signed_prekey_id', signedPrekeyId.toString());

    // Generate one-time prekeys
    const oneTimePrekeys = [];
    for (let i = 0; i < count; i++) {
      const prekeyPair = await e2eeService.generateX25519KeyPair();
      const prekeyId = `${Date.now()}_${i}`;

      // Store private key
      await e2eeService.storePrivateKey(`otp_${prekeyId}`, prekeyPair.privateKey);

      oneTimePrekeys.push({
        id: prekeyId,
        publicKey: prekeyPair.publicKey,
      });
    }

    console.log(`✅ Generated prekey bundle: 1 signed + ${count} one-time prekeys`);

    return {
      identityKey: identityPublicKey,
      signedPrekey: {
        id: signedPrekeyId,
        publicKey: signedPrekeyPair.publicKey,
        signature,
      },
      oneTimePrekeys,
    };
  }

  /**
   * Verify received prekey bundle signature
   */
  async verifyPrekeyBundle(bundle) {
    await this.init();

    const isValid = await e2eeService.verify(
      bundle.signedPrekey.publicKey,
      bundle.signedPrekey.signature,
      bundle.identityKey,
    );

    if (!isValid) {
      throw new Error('Invalid prekey signature - possible MITM attack');
    }

    return true;
  }

  // ============= X3DH KEY AGREEMENT (INITIATOR) =============

  /**
   * Perform X3DH as initiator (Alice sending first message to Bob)
   *
   * Steps:
   * 1. Generate ephemeral key pair
   * 2. Perform 3 or 4 DH operations with Bob's keys
   * 3. Derive root key and initial chain key using HKDF
   * 4. Initialize sender ratchet state
   *
   * @param {object} bobBundle - Bob's prekey bundle from server
   * @returns {object} Session state + initial message header
   */
  async initiateSession(bobBundle) {
    await this.init();

    // Verify Bob's prekey signature
    await this.verifyPrekeyBundle(bobBundle);

    // Get Alice's identity key
    const aliceIdentityPrivate = await e2eeService.getPrivateKey('identity_private');
    const aliceIdentityPublic = await AsyncStorage.getItem('identity_public');

    // Generate ephemeral key pair for this session
    const aliceEphemeralPair = await e2eeService.generateX25519KeyPair();

    // X3DH: Perform 4 DH operations
    // DH1: Alice_identity × Bob_signed_prekey
    const dh1 = await e2eeService.performDH(aliceIdentityPrivate, bobBundle.signedPrekey.publicKey);

    // DH2: Alice_ephemeral × Bob_identity (reverse for initiator)
    const dh2 = await e2eeService.performDH(aliceEphemeralPair.privateKey, bobBundle.identityKey);

    // DH3: Alice_ephemeral × Bob_signed_prekey
    const dh3 = await e2eeService.performDH(
      aliceEphemeralPair.privateKey,
      bobBundle.signedPrekey.publicKey,
    );

    // DH4: Alice_ephemeral × Bob_one_time_prekey (if available)
    let dh4 = null;
    let usedOneTimePrekey = null;
    if (bobBundle.oneTimePrekeys && bobBundle.oneTimePrekeys.length > 0) {
      const bobOneTimePrekey = bobBundle.oneTimePrekeys[0]; // Server should pop one
      dh4 = await e2eeService.performDH(aliceEphemeralPair.privateKey, bobOneTimePrekey.publicKey);
      usedOneTimePrekey = bobOneTimePrekey.id;
    }

    // Derive root key and initial chain key
    const { rootKey } = await e2eeService.deriveInitialKeys(dh1, dh2, dh3, dh4);

    // Initialize sender ratchet
    const senderRatchetPair = await e2eeService.generateX25519KeyPair();

    // Perform DH with Bob's signed prekey to derive next root key
    const dhOut = await e2eeService.performDH(
      senderRatchetPair.privateKey,
      bobBundle.signedPrekey.publicKey,
    );

    const ratchetKeys = await e2eeService.hkdf(
      Buffer.concat([rootKey, dhOut]),
      'WhispChat-Ratchet',
      'ChainKey',
      64,
    );

    const newRootKey = ratchetKeys.slice(0, 32);
    const sendingChainKey = ratchetKeys.slice(32, 64);

    // Store session state
    const sessionId = `${bobBundle.identityKey.slice(0, 16)}`; // Use peer identity as session ID
    const sessionState = {
      sessionId,
      peerIdentityKey: bobBundle.identityKey,
      rootKey: e2eeService.toBase64(newRootKey),
      sendingChainKey: e2eeService.toBase64(sendingChainKey),
      sendingChainLength: 0,
      receivingChainKey: null, // Will be set when Bob replies
      receivingChainLength: 0,
      senderRatchetPrivate: senderRatchetPair.privateKey,
      senderRatchetPublic: senderRatchetPair.publicKey,
      receiverRatchetPublic: bobBundle.signedPrekey.publicKey,
      previousSendingChainLength: 0,
      skippedMessageKeys: {}, // Store temporarily for out-of-order messages
    };

    await this.saveSessionState(sessionId, sessionState);

    console.log(`✅ X3DH session initiated with ${sessionId}`);

    return {
      sessionId,
      initialHeader: {
        identityKey: aliceIdentityPublic,
        ephemeralKey: aliceEphemeralPair.publicKey,
        usedOneTimePrekey,
        senderRatchetKey: senderRatchetPair.publicKey,
      },
    };
  }

  /**
   * High-level session initialization (fetches bundle and initiates session)
   * This is the wrapper that ChatContext should call
   * 
   * @param {string} peerUserId - MongoDB user ID of the peer
   * @returns {string} Session ID (same as peerUserId for easy lookup)
   */
  async initSession(peerUserId) {
    await this.init();

    console.log(`🔑 No session found, initiating X3DH...`);

    // Import API dynamically to avoid circular dependency
    const api = (await import('./api')).default;

    try {
      // Fetch peer's prekey bundle from server
      const response = await api.get(`/e2ee/prekey-bundle/${peerUserId}`);
      const bundle = response.data?.data?.bundle;

      if (!bundle) {
        throw new Error('No prekey bundle available for user');
      }

      // Initiate X3DH session
      const { sessionId: tempSessionId, initialHeader } = await this.initiateSession(bundle);

      // ✅ FIX: Store session with MongoDB user ID (not identity key)
      // This allows lookup by `activeChat._id`
      const actualSessionId = peerUserId;
      const tempState = await this.getSessionState(tempSessionId);

      if (tempState) {
        // Re-save with the correct session ID (MongoDB user ID)
        await this.saveSessionState(actualSessionId, tempState);
        // Delete the temp session
        await this.deleteSession(tempSessionId);
      }

      console.log(`✅ X3DH session initiated: ${actualSessionId}`);

      return actualSessionId;
    } catch (error) {
      console.error(`❌ Failed to init session with ${peerUserId}:`, error.message);
      throw error;
    }
  }

  // ============= X3DH KEY AGREEMENT (RESPONDER) =============

  /**
   * Accept X3DH session as responder (Bob receiving first message from Alice)
   */
  async acceptSession(aliceHeader) {
    await this.init();

    const bobIdentityPrivate = await e2eeService.getPrivateKey('identity_private');

    // Get signed prekey that Alice used
    const signedPrekeyId = await AsyncStorage.getItem('current_signed_prekey_id');
    const bobSignedPrekeyPrivate = await e2eeService.getPrivateKey(
      `signed_prekey_${signedPrekeyId}`,
    );

    if (!bobSignedPrekeyPrivate) {
      throw new Error('Signed prekey not found - may have been rotated');
    }

    // Get one-time prekey if Alice used one
    let bobOneTimePrekeyPrivate = null;
    if (aliceHeader.usedOneTimePrekey) {
      bobOneTimePrekeyPrivate = await e2eeService.getPrivateKey(
        `otp_${aliceHeader.usedOneTimePrekey}`,
      );
      // Delete one-time prekey after use (hence "one-time")
      if (bobOneTimePrekeyPrivate) {
        await e2eeService.deletePrivateKey(`otp_${aliceHeader.usedOneTimePrekey}`);
      }
    }

    // X3DH: Perform same 4 DH operations (Bob's perspective)
    const dh1 = await e2eeService.performDH(bobSignedPrekeyPrivate, aliceHeader.identityKey);

    const dh2 = await e2eeService.performDH(bobIdentityPrivate, aliceHeader.ephemeralKey);

    const dh3 = await e2eeService.performDH(bobSignedPrekeyPrivate, aliceHeader.ephemeralKey);

    let dh4 = null;
    if (bobOneTimePrekeyPrivate) {
      dh4 = await e2eeService.performDH(bobOneTimePrekeyPrivate, aliceHeader.ephemeralKey);
    }

    // Derive same root key and chain key as Alice
    const { rootKey } = await e2eeService.deriveInitialKeys(dh1, dh2, dh3, dh4);

    // Perform DH with Alice's sender ratchet key
    const dhOut = await e2eeService.performDH(bobSignedPrekeyPrivate, aliceHeader.senderRatchetKey);

    const ratchetKeys = await e2eeService.hkdf(
      Buffer.concat([rootKey, dhOut]),
      'WhispChat-Ratchet',
      'ChainKey',
      64,
    );

    const newRootKey = ratchetKeys.slice(0, 32);
    const receivingChainKey = ratchetKeys.slice(32, 64);

    // Initialize receiver ratchet (will generate sender ratchet on first reply)
    const sessionId = `${aliceHeader.identityKey.slice(0, 16)}`;
    const sessionState = {
      sessionId,
      peerIdentityKey: aliceHeader.identityKey,
      rootKey: e2eeService.toBase64(newRootKey),
      sendingChainKey: null, // Will generate on first send
      sendingChainLength: 0,
      receivingChainKey: e2eeService.toBase64(receivingChainKey),
      receivingChainLength: 0,
      senderRatchetPrivate: null,
      senderRatchetPublic: null,
      receiverRatchetPublic: aliceHeader.senderRatchetKey,
      previousSendingChainLength: 0,
      skippedMessageKeys: {},
    };

    await this.saveSessionState(sessionId, sessionState);

    console.log(`✅ X3DH session accepted from ${sessionId}`);

    return { sessionId };
  }

  // ============= DOUBLE RATCHET: SEND =============

  /**
   * Encrypt message using Double Ratchet
   *
   * Steps:
   * 1. Derive message key from sending chain key
   * 2. Advance chain key (KDF_CK)
   * 3. Encrypt with AEAD
   * 4. Return ciphertext + header (ratchet public key, counter)
   */
  async ratchetEncrypt(sessionId, plaintext) {
    await this.init();

    const state = await this.getSessionState(sessionId);
    if (!state) {
      throw new Error(`No session found for ${sessionId}`);
    }

    // Generate sender ratchet if first message
    if (!state.senderRatchetPrivate) {
      const senderRatchetPair = await e2eeService.generateX25519KeyPair();
      state.senderRatchetPrivate = senderRatchetPair.privateKey;
      state.senderRatchetPublic = senderRatchetPair.publicKey;

      // Perform DH ratchet step
      const dhOut = await e2eeService.performDH(
        state.senderRatchetPrivate,
        state.receiverRatchetPublic,
      );

      const ratchetKeys = await e2eeService.hkdf(
        Buffer.concat([e2eeService.fromBase64(state.rootKey), dhOut]),
        'WhispChat-Ratchet',
        'ChainKey',
        64,
      );

      state.rootKey = e2eeService.toBase64(ratchetKeys.slice(0, 32));
      state.sendingChainKey = e2eeService.toBase64(ratchetKeys.slice(32, 64));
      state.sendingChainLength = 0;
    }

    // Derive message key from chain key
    const chainKey = e2eeService.fromBase64(state.sendingChainKey);
    const messageKey = await e2eeService.hkdf(
      chainKey,
      'MessageKey',
      `${state.sendingChainLength}`,
      32,
    );

    // Advance chain key: CK_new = HMAC(CK, 0x02)
    const newChainKey = await e2eeService.hkdf(chainKey, 'ChainKey', 'Advance', 32);
    state.sendingChainKey = e2eeService.toBase64(newChainKey);

    // Generate nonce
    const nonce = await e2eeService.generateNonce();

    // Associated data: session ID + counter (prevents reordering attacks)
    const associatedData = Buffer.from(`${sessionId}:${state.sendingChainLength}`);

    // Encrypt with AEAD
    const ciphertext = await e2eeService.encryptAEAD(plaintext, messageKey, nonce, associatedData);

    // Increment counter
    const messageCounter = state.sendingChainLength;
    state.sendingChainLength += 1;

    // Save updated state
    await this.saveSessionState(sessionId, state);

    return {
      ciphertext: e2eeService.toBase64(ciphertext),
      header: {
        senderRatchetKey: state.senderRatchetPublic,
        messageCounter,
        previousChainLength: state.previousSendingChainLength,
      },
      nonce: e2eeService.toBase64(nonce),
    };
  }

  // ============= DOUBLE RATCHET: RECEIVE =============

  /**
   * Decrypt message using Double Ratchet
   * Handles out-of-order delivery and ratchet advancement
   */
  async ratchetDecrypt(sessionId, encryptedMessage) {
    await this.init();

    const state = await this.getSessionState(sessionId);
    if (!state) {
      throw new Error(`No session found for ${sessionId}`);
    }

    const { ciphertext, header, nonce } = encryptedMessage;

    // Check if sender performed DH ratchet (new sender ratchet key)
    if (header.senderRatchetKey !== state.receiverRatchetPublic) {
      // Sender advanced ratchet - perform DH and derive new receiving chain
      await this.performDHRatchet(state, header.senderRatchetKey);
    }

    // Check for skipped messages (out-of-order delivery)
    if (header.messageCounter > state.receivingChainLength) {
      // Store skipped message keys
      for (let i = state.receivingChainLength; i < header.messageCounter; i++) {
        const skippedKey = await this.deriveMessageKey(state.receivingChainKey, i);
        state.skippedMessageKeys[`${header.senderRatchetKey}:${i}`] =
          e2eeService.toBase64(skippedKey);
      }
    }

    // Derive message key
    let messageKey;
    const skipKeyId = `${header.senderRatchetKey}:${header.messageCounter}`;

    if (state.skippedMessageKeys[skipKeyId]) {
      // Use stored skipped key
      messageKey = e2eeService.fromBase64(state.skippedMessageKeys[skipKeyId]);
      delete state.skippedMessageKeys[skipKeyId];
    } else {
      // Derive from current chain
      messageKey = await this.deriveMessageKey(state.receivingChainKey, header.messageCounter);

      // Advance receiving chain key
      const chainKey = e2eeService.fromBase64(state.receivingChainKey);
      const newChainKey = await e2eeService.hkdf(chainKey, 'ChainKey', 'Advance', 32);
      state.receivingChainKey = e2eeService.toBase64(newChainKey);
      state.receivingChainLength = header.messageCounter + 1;
    }

    // Decrypt with AEAD
    const associatedData = Buffer.from(`${sessionId}:${header.messageCounter}`);
    const plaintextBytes = await e2eeService.decryptAEAD(
      e2eeService.fromBase64(ciphertext),
      messageKey,
      e2eeService.fromBase64(nonce),
      associatedData,
    );

    // Save updated state
    await this.saveSessionState(sessionId, state);

    return Buffer.from(plaintextBytes).toString('utf-8');
  }

  /**
   * Perform DH ratchet step (sender advanced their ratchet key)
   */
  async performDHRatchet(state, newSenderRatchetKey) {
    // Update receiver ratchet public key
    state.previousSendingChainLength = state.sendingChainLength;
    state.receiverRatchetPublic = newSenderRatchetKey;

    // Generate new sender ratchet keypair
    const newRatchetPair = await e2eeService.generateX25519KeyPair();

    // Perform DH with new sender ratchet key
    const dhOut = await e2eeService.performDH(newRatchetPair.privateKey, newSenderRatchetKey);

    // Derive new root key and sending chain key
    const ratchetKeys = await e2eeService.hkdf(
      Buffer.concat([e2eeService.fromBase64(state.rootKey), dhOut]),
      'WhispChat-Ratchet',
      'ChainKey',
      64,
    );

    state.rootKey = e2eeService.toBase64(ratchetKeys.slice(0, 32));
    state.receivingChainKey = e2eeService.toBase64(ratchetKeys.slice(32, 64));
    state.receivingChainLength = 0;

    state.senderRatchetPrivate = newRatchetPair.privateKey;
    state.senderRatchetPublic = newRatchetPair.publicKey;
  }

  /**
   * Derive message key from chain key at specific index
   */
  async deriveMessageKey(chainKeyB64, index) {
    let chainKey = e2eeService.fromBase64(chainKeyB64);

    // Advance chain key to index
    for (let i = 0; i < index; i++) {
      chainKey = await e2eeService.hkdf(chainKey, 'ChainKey', 'Advance', 32);
    }

    // Derive message key
    return await e2eeService.hkdf(chainKey, 'MessageKey', `${index}`, 32);
  }

  // ============= SESSION STORAGE =============

  async saveSessionState(sessionId, state) {
    await AsyncStorage.setItem(`session_${sessionId}`, JSON.stringify(state));
  }

  async getSessionState(sessionId) {
    const stateJson = await AsyncStorage.getItem(`session_${sessionId}`);
    return stateJson ? JSON.parse(stateJson) : null;
  }

  async deleteSession(sessionId) {
    await AsyncStorage.removeItem(`session_${sessionId}`);
  }
}

export default new SignalProtocol();
