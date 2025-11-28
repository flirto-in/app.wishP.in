/**
 * E2EE Service - Core Cryptographic Operations
 * Uses react-native-libsodium (native bindings) for Signal Protocol primitives (X25519, Ed25519, ChaCha20-Poly1305)
 *
 * Security Notes:
 * - All keys stored in expo-secure-store (iOS Keychain / Android Keystore)
 * - Nonces generated with OS secure random (expo-crypto)
 * - HKDF used for all key derivation (never use raw DH output)
 * - AEAD tags verified before decryption (ChaCha20-Poly1305)
 */

import { Sodium } from 'react-native-libsodium';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

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
    console.log('✅ E2EE Service initialized (react-native-libsodium ready)');
  }

  // ============= KEY GENERATION =============

  /**
   * Generate Ed25519 identity keypair (long-term signing key)
   * Used for: Signing prekeys, authenticating identity
   * Storage: Secure store (never leaves device unencrypted)
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
   * Generate X25519 keypair for ECDH (ephemeral or semi-ephemeral)
   * Used for: Signed prekeys, one-time prekeys, ratchet keys
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
   * Used for: Signing prekey bundles
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
   * Returns shared secret (32 bytes)
   * IMPORTANT: Never use raw DH output directly - always pass through HKDF
   */
  async performDH(ourPrivateKeyB64, theirPublicKeyB64) {
    await this.init();
    const ourPrivateKey = this.sodium.from_base64(ourPrivateKeyB64);
    const theirPublicKey = this.sodium.from_base64(theirPublicKeyB64);

    // X25519 scalar multiplication
    const sharedSecret = this.sodium.crypto_scalarmult(ourPrivateKey, theirPublicKey);
    return sharedSecret; // Raw bytes (DO NOT use directly - pass to HKDF)
  }

  /**
   * HKDF key derivation (using BLAKE2b as PRF, standard for libsodium)
   * Derives multiple keys from input key material
   *
   * @param {Uint8Array} inputKeyMaterial - Shared secret from DH
   * @param {string} salt - Context-specific salt (e.g., "WhispChat-RootKey")
   * @param {string} info - Additional context info
   * @param {number} outputLength - Bytes to derive (default 32)
   */
  async hkdf(inputKeyMaterial, salt, info, outputLength = 32) {
    await this.init();

    // HKDF using BLAKE2b (libsodium standard)
    // Step 1: Extract (PRK = HMAC(salt, IKM))
    const saltBytes = typeof salt === 'string' ? this.sodium.from_string(salt) : salt;
    const prk = this.sodium.crypto_generichash(32, inputKeyMaterial, saltBytes);

    // Step 2: Expand (OKM = PRK + info)
    const infoBytes = typeof info === 'string' ? this.sodium.from_string(info) : info;
    const combined = new Uint8Array(prk.length + infoBytes.length);
    combined.set(prk);
    combined.set(infoBytes, prk.length);
    const okm = this.sodium.crypto_generichash(outputLength, combined);

    return okm;
  }

  /**
   * Derive root key and chain key from X3DH shared secrets
   * Signal Protocol: SK = KDF(DH1 || DH2 || DH3 || DH4)
   */
  async deriveInitialKeys(dh1, dh2, dh3, dh4 = null) {
    await this.init();

    // Concatenate DH outputs
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

    // Derive 64 bytes: 32 for root key, 32 for initial chain key
    const derivedKeys = await this.hkdf(combinedSecret, 'WhispChat-X3DH-V1', 'RootChainKeys', 64);

    return {
      rootKey: derivedKeys.slice(0, 32),
      chainKey: derivedKeys.slice(32, 64),
    };
  }

  // ============= AEAD ENCRYPTION (ChaCha20-Poly1305) =============

  /**
   * Generate secure random nonce (24 bytes for XChaCha20-Poly1305)
   * Uses OS-level secure random from expo-crypto
   */
  async generateNonce() {
    const nonceBytes = await Crypto.getRandomBytesAsync(24); // XChaCha20 nonce size
    return new Uint8Array(nonceBytes);
  }

  /**
   * Encrypt with ChaCha20-Poly1305 AEAD
   *
   * @param {string|Uint8Array} plaintext - Data to encrypt
   * @param {Uint8Array} key - 256-bit symmetric key
   * @param {Uint8Array} nonce - 192-bit nonce (XChaCha20)
   * @param {Uint8Array} associatedData - Additional authenticated data (e.g., message counter)
   * @returns {Uint8Array} Ciphertext with authentication tag appended
   */
  async encryptAEAD(plaintext, key, nonce, associatedData = null) {
    await this.init();

    const plaintextBytes =
      typeof plaintext === 'string' ? this.sodium.from_string(plaintext) : plaintext;

    // XChaCha20-Poly1305 (192-bit nonce, resistant to nonce reuse)
    const ciphertext = this.sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      plaintextBytes,
      associatedData, // Can be null
      null, // No secret nonce
      nonce,
      key,
    );

    return ciphertext; // Includes 16-byte Poly1305 tag
  }

  /**
   * Decrypt with ChaCha20-Poly1305 AEAD
   * Throws error if authentication tag verification fails
   */
  async decryptAEAD(ciphertext, key, nonce, associatedData = null) {
    await this.init();

    try {
      const plaintext = this.sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
        null, // No secret nonce
        ciphertext,
        associatedData,
        nonce,
        key,
      );
      return plaintext;
    } catch (_err) {
      throw new Error('AEAD decryption failed: Invalid tag or corrupted ciphertext');
    }
  }

  // ============= SECURE STORAGE =============

  /**
   * Store private key in secure storage (iOS Keychain / Android Keystore)
   */
  async storePrivateKey(keyId, privateKeyB64) {
    await SecureStore.setItemAsync(keyId, privateKeyB64);
  }

  /**
   * Retrieve private key from secure storage
   */
  async getPrivateKey(keyId) {
    return await SecureStore.getItemAsync(keyId);
  }

  /**
   * Delete key from secure storage (use on key rotation)
   */
  async deletePrivateKey(keyId) {
    await SecureStore.deleteItemAsync(keyId);
  }

  // ============= UTILITY =============

  /**
   * Generate cryptographically secure random bytes
   */
  async randomBytes(length) {
    const bytes = await Crypto.getRandomBytesAsync(length);
    return new Uint8Array(bytes);
  }

  /**
   * Encode bytes to base64 (for transmission)
   */
  toBase64(bytes) {
    return this.sodium.to_base64(bytes);
  }

  /**
   * Decode base64 to bytes
   */
  fromBase64(base64String) {
    return this.sodium.from_base64(base64String);
  }
}

export default new E2EEService();
