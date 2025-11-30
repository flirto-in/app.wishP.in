/**
 * E2EE Service - Core Cryptographic Operations
 * Uses react-native-libsodium (native bindings) for Signal Protocol primitives (X25519, Ed25519, ChaCha20-Poly1305)
 *
 * Security Notes:
 * - All keys stored in expo-secure-store (iOS Keychain / Android Keystore)
 * - Nonces generated with OS secure random (expo-crypto)
 * - HKDF used for all key derivation (never use raw DH output)
 * - AEAD tags verified before decryption (ChaCha20-Poly1305)
 *
 * STRICT MODE: Native build required. No Expo Go support.
 */

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

// Native Sodium Library - REQUIRED
let Sodium;
try {
  Sodium = require('react-native-libsodium').Sodium;
} catch (_e) {
  console.error('❌ FATAL: react-native-libsodium not found. E2EE requires a native build.');
  throw new Error('E2EE requires native build. Expo Go is not supported.');
}

class E2EEService {
  constructor() {
    this.ready = false;
    this.sodium = new Sodium();
  }

  /**
   * Initialize libsodium (native library)
   * MUST be called before any crypto operations
   */
  async init() {
    if (this.ready) return;

    await this.sodium.ready;
    this.ready = true;
    console.log('✅ E2EE Service initialized (Native Sodium Ready)');
  }

  // ============= KEY GENERATION =============

  /**
   * Generate Ed25519 identity keypair (long-term signing key)
   */
  async generateIdentityKeyPair() {
    await this.init();
    const keypair = this.sodium.crypto_sign_keypair();
    return {
      publicKey: this.sodium.to_base64(keypair.publicKey),
      privateKey: this.sodium.to_base64(keypair.privateKey),
      keyType: 'Ed25519-Identity',
    };
  }

  /**
   * Generate X25519 keypair for ECDH
   */
  async generateX25519KeyPair() {
    await this.init();
    const keypair = this.sodium.crypto_kx_keypair();
    return {
      publicKey: this.sodium.to_base64(keypair.publicKey),
      privateKey: this.sodium.to_base64(keypair.privateKey),
      keyType: 'X25519-ECDH',
    };
  }

  /**
   * Sign data with Ed25519 private key
   */
  async sign(data, privateKeyB64) {
    await this.init();
    const privateKey = this.sodium.from_base64(privateKeyB64);
    const dataBytes = typeof data === 'string' ? this.sodium.from_string(data) : data;
    const signature = this.sodium.crypto_sign_detached(dataBytes, privateKey);
    return this.sodium.to_base64(signature);
  }

  /**
   * Verify Ed25519 signature
   */
  async verify(data, signatureB64, publicKeyB64) {
    await this.init();
    const publicKey = this.sodium.from_base64(publicKeyB64);
    const signature = this.sodium.from_base64(signatureB64);
    const dataBytes = typeof data === 'string' ? this.sodium.from_string(data) : data;
    return this.sodium.crypto_sign_verify_detached(signature, dataBytes, publicKey);
  }

  // ============= KEY AGREEMENT (X3DH) =============

  /**
   * Perform X25519 ECDH key agreement
   */
  async performDH(ourPrivateKeyB64, theirPublicKeyB64) {
    await this.init();
    const ourPrivateKey = this.sodium.from_base64(ourPrivateKeyB64);
    const theirPublicKey = this.sodium.from_base64(theirPublicKeyB64);
    return this.sodium.crypto_scalarmult(ourPrivateKey, theirPublicKey);
  }

  /**
   * HKDF key derivation (using BLAKE2b)
   */
  async hkdf(inputKeyMaterial, salt, info, outputLength = 32) {
    await this.init();
    const saltBytes = typeof salt === 'string' ? this.sodium.from_string(salt) : salt;
    const prk = this.sodium.crypto_generichash(32, inputKeyMaterial, saltBytes);

    const infoBytes = typeof info === 'string' ? this.sodium.from_string(info) : info;
    const combined = new Uint8Array(prk.length + infoBytes.length);
    combined.set(prk);
    combined.set(infoBytes, prk.length);
    const okm = this.sodium.crypto_generichash(outputLength, combined);

    return okm;
  }

  /**
   * Derive root key and chain key from X3DH shared secrets
   */
  async deriveInitialKeys(dh1, dh2, dh3, dh4 = null) {
    await this.init();

    const combinedSecret = dh4
      ? (() => {
          const result = new Uint8Array(dh1.length + dh2.length + dh3.length + dh4.length);
          result.set(dh1, 0);
          result.set(dh2, dh1.length);
          result.set(dh3, dh1.length + dh2.length);
          result.set(dh4, dh1.length + dh2.length + dh3.length);
          return result;
        })()
      : (() => {
          const result = new Uint8Array(dh1.length + dh2.length + dh3.length);
          result.set(dh1, 0);
          result.set(dh2, dh1.length);
          result.set(dh3, dh1.length + dh2.length);
          return result;
        })();

    const derivedKeys = await this.hkdf(combinedSecret, 'WhispChat-X3DH-V1', 'RootChainKeys', 64);

    return {
      rootKey: derivedKeys.slice(0, 32),
      chainKey: derivedKeys.slice(32, 64),
    };
  }

  // ============= AEAD ENCRYPTION (ChaCha20-Poly1305) =============

  /**
   * Generate secure random nonce (24 bytes for XChaCha20)
   */
  async generateNonce() {
    const nonceBytes = await Crypto.getRandomBytesAsync(24);
    return new Uint8Array(nonceBytes);
  }

  /**
   * Encrypt with ChaCha20-Poly1305 AEAD
   */
  async encryptAEAD(plaintext, key, nonce, associatedData = null) {
    await this.init();
    const plaintextBytes =
      typeof plaintext === 'string' ? this.sodium.from_string(plaintext) : plaintext;

    return this.sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      plaintextBytes,
      associatedData,
      null,
      nonce,
      key,
    );
  }

  /**
   * Decrypt with ChaCha20-Poly1305 AEAD
   */
  async decryptAEAD(ciphertext, key, nonce, associatedData = null) {
    await this.init();
    return this.sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      ciphertext,
      associatedData,
      null,
      nonce,
      key,
    );
  }

  // ============= SECURE STORAGE =============

  async storePrivateKey(keyId, privateKeyB64) {
    await SecureStore.setItemAsync(keyId, privateKeyB64);
  }

  async getPrivateKey(keyId) {
    return await SecureStore.getItemAsync(keyId);
  }

  async deletePrivateKey(keyId) {
    await SecureStore.deleteItemAsync(keyId);
  }

  // ============= UTILITY =============

  async randomBytes(length) {
    const bytes = await Crypto.getRandomBytesAsync(length);
    return new Uint8Array(bytes);
  }

  toBase64(bytes) {
    return this.sodium.to_base64(bytes);
  }

  fromBase64(str) {
    return this.sodium.from_base64(str);
  }
}

export default new E2EEService();
