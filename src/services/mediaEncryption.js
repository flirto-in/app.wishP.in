/**
 * Media File Encryption for E2EE
 * Per-file symmetric keys encrypted with session keys
 *
 * Flow:
 * 1. Generate random 256-bit file key
 * 2. Encrypt file locally with ChaCha20-Poly1305
 * 3. Encrypt file key using Double Ratchet session
 * 4. Upload encrypted blob (server stores ciphertext only)
 * 5. Send encrypted file key via E2EE message channel
 * 6. Receiver decrypts file key, downloads blob, decrypts locally
 */

import e2eeService from './e2eeService';
import signalProtocol from './signalProtocol';
// ✅ FIXED: Use legacy API to avoid deprecation warnings
import * as FileSystem from 'expo-file-system';
import logger from '../utils/logger';

class MediaEncryption {
  /**
   * Encrypt file for E2EE transfer
   *
   * @param {string} fileUri - Local file URI
   * @param {string} sessionId - E2EE session ID for encrypting file key
   * @returns {object} { encryptedBlob, encryptedFileKey, nonce, originalName, mimeType }
   */
  async encryptFile(fileUri, sessionId) {
    try {
      await e2eeService.init();

      // Validate inputs
      if (!fileUri) {
        throw new Error('File URI is required');
      }
      if (!sessionId) {
        throw new Error('Session ID is required');
      }

      logger.log(`📁 Reading file: ${fileUri}`);

      // Check if file exists
      let fileInfo;
      try {
        fileInfo = await FileSystem.getInfoAsync(fileUri);
      } catch (infoError) {
        logger.error('Failed to get file info:', infoError);
        throw new Error(`Cannot access file: ${infoError.message}`);
      }

      if (!fileInfo.exists) {
        throw new Error(`File does not exist: ${fileUri}`);
      }

      logger.log(`📊 File size: ${fileInfo.size} bytes`);

      // Read file as binary with error handling
      let fileBase64;
      try {
        fileBase64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } catch (readError) {
        logger.error('Failed to read file:', readError);
        throw new Error(`Failed to read file: ${readError.message}`);
      }

      // Validate file was read successfully
      if (!fileBase64 || typeof fileBase64 !== 'string') {
        throw new Error('File read returned invalid data');
      }

      logger.log(`✅ File read successfully (${fileBase64.length} base64 chars)`);

      // Convert from base64
      let fileBytes;
      try {
        fileBytes = e2eeService.fromBase64(fileBase64);
      } catch (decodeError) {
        logger.error('Failed to decode base64:', decodeError);
        throw new Error('Failed to decode file data');
      }

      if (!fileBytes || fileBytes.length === 0) {
        throw new Error('File is empty or could not be converted');
      }

      // Generate random 256-bit file key
      const fileKey = await e2eeService.randomBytes(32);

      // Generate nonce for file encryption
      const fileNonce = await e2eeService.generateNonce();

      // Encrypt file with ChaCha20-Poly1305
      const encryptedBlob = await e2eeService.encryptAEAD(
        fileBytes,
        fileKey,
        fileNonce,
        null, // No associated data for files
      );

      // Encrypt file key using Double Ratchet session
      const encryptedFileKeyEnvelope = await signalProtocol.ratchetEncrypt(
        sessionId,
        e2eeService.toBase64(fileKey),
      );

      // Extract filename and mime type
      const fileName = fileUri.split('/').pop();
      const mimeType = this.guessMimeType(fileName);

      logger.log(
        `✅ File encrypted: ${fileName} (${fileBytes.length} bytes → ${encryptedBlob.length} bytes)`,
      );

      return {
        encryptedBlob: e2eeService.toBase64(encryptedBlob),
        encryptedFileKey: encryptedFileKeyEnvelope, // Contains ciphertext, header, nonce
        fileNonce: e2eeService.toBase64(fileNonce),
        originalName: fileName,
        mimeType,
      };
    } catch (error) {
      logger.error('❌ File encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt received encrypted file
   *
   * @param {string} encryptedBlobB64 - Base64-encoded encrypted file
   * @param {object} encryptedFileKey - Encrypted file key envelope from E2EE channel
   * @param {string} fileNonceB64 - Base64-encoded file nonce
   * @param {string} sessionId - E2EE session ID
   * @returns {Uint8Array} Decrypted file bytes
   */
  async decryptFile(encryptedBlobB64, encryptedFileKey, fileNonceB64, sessionId) {
    await e2eeService.init();

    // Decrypt file key using Double Ratchet
    const fileKeyB64 = await signalProtocol.ratchetDecrypt(sessionId, encryptedFileKey);
    const fileKey = e2eeService.fromBase64(fileKeyB64);

    // Decrypt file
    const encryptedBlob = e2eeService.fromBase64(encryptedBlobB64);
    const fileNonce = e2eeService.fromBase64(fileNonceB64);

    const decryptedBytes = await e2eeService.decryptAEAD(encryptedBlob, fileKey, fileNonce, null);

    logger.log(`✅ File decrypted: ${decryptedBytes.length} bytes`);

    return decryptedBytes;
  }

  /**
   * Save decrypted file to local filesystem
   *
   * @param {Uint8Array} fileBytes - Decrypted file data
   * @param {string} fileName - Original filename
   * @returns {string} Local file URI
   */
  async saveDecryptedFile(fileBytes, fileName) {
    const destPath = `${FileSystem.documentDirectory}${fileName}`;
    const fileBase64 = e2eeService.toBase64(fileBytes);

    await FileSystem.writeAsStringAsync(destPath, fileBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    logger.log(`✅ Decrypted file saved: ${destPath}`);

    return destPath;
  }

  /**
   * Guess MIME type from file extension
   */
  guessMimeType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const mimeTypes = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      m4a: 'audio/mp4',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

export default new MediaEncryption();
