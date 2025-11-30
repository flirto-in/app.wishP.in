import signalProtocol from './signalProtocol';
import { socketService } from './socket'; // ✅ FIXED: Correct import path // ✅ FIXED: Correct import path

/**
 * Message Queue - Handles background E2EE encryption and sending
 * Like WhatsApp: messages queue and retry until successfully sent
 */
class MessageQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.listeners = new Map();
  }

  /**
   * Add message to queue (appears instantly in UI)
   */
  enqueue(message) {
    const queuedMessage = {
      ...message,
      status: 'pending',
      timestamp: Date.now(),
      retries: 0,
      id: message._id || `temp_${Date.now()}_${Math.random()}`,
    };

    this.queue.push(queuedMessage);
    console.log(`📥 Message queued: ${queuedMessage.id}`);

    // Start processing
    this.processQueue();

    return queuedMessage.id;
  }

  /**
   * Process message queue - sends messages immediately
   * No retries for encryption - if E2EE fails, send anyway
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const message = this.queue[0];

      try {
        console.log(`📤 Sending message ${message.id}...`);

        // ✅ FIXED: Send immediately - graceful E2EE degradation
        await this.sendMessage(message);

        // Success - remove from queue
        this.queue.shift();
        this.notifyListeners(message.id, 'sent');
        console.log(`✅ Message sent: ${message.id}`);
      } catch (error) {
        console.error(`❌ Send failed:`, error.message);

        // Retry on all errors (Network or Encryption)
        message.retries++;

        if (message.retries < 5) {
          const delay = 2000; // Fixed 2s retry
          console.log(`⏱ Error (attempt ${message.retries}), retrying in ${delay / 1000}s...`);
          await this.delay(delay);
        } else {
          console.error(`❌ Error persists after 5 attempts, removing from queue`);
          this.queue.shift();
          this.notifyListeners(message.id, 'failed');
        }
      }
    }

    this.processing = false;

    // Retry remaining messages if any
    if (this.queue.length > 0) {
      console.log(`📋 ${this.queue.length} messages still in queue, will retry in 2s...`);
      setTimeout(() => this.processQueue(), 2000);
    }
  }

  /**
   * Check if error is network-related (should retry)
   */
  isNetworkError(error) {
    const networkErrors = ['timeout', 'network', 'ECONNREFUSED', 'ETIMEDOUT', 'fetch'];
    return networkErrors.some((errType) =>
      error.message?.toLowerCase().includes(errType.toLowerCase()),
    );
  }

  /**
   * Send message with STRICT E2EE enforcement
   * User requirement: EVERYTHING must be encrypted
   */
  async sendMessage(message) {
    const { receiverId, text, tempSessionId, isTemp } = message;

    // Check if socket is connected first
    if (!socketService.isSocketConnected()) {
      throw new Error('Socket not connected');
    }

    // ✅ ENFORCE E2EE: Wait for session and encrypt
    console.log(`🔐 Enforcing E2EE for message to ${receiverId}...`);

    // 1. Ensure Session (waits for key exchange if needed)
    // This might take a moment if not pre-established, but ensures security
    await signalProtocol.ensureSession(receiverId);

    // 2. Encrypt
    const encrypted = await signalProtocol.ratchetEncrypt(receiverId, text);

    if (!encrypted) {
      throw new Error('Encryption failed - cannot send plaintext');
    }

    const messageData = {
      receiverId,
      encryptedText: encrypted.ciphertext,
      ratchetHeader: encrypted.header,
      nonce: encrypted.nonce,
      messageType: 'text',
      tempSessionId: isTemp ? tempSessionId : undefined,
      clientMessageId: message.id,
    };

    // Send via socket
    console.log(`📤 Sending encrypted message via socket...`);
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Send timeout'));
      }, 30000); // 30s timeout for sending

      socketService.socket.emit('message:send', messageData, (response) => {
        clearTimeout(timeout);
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Listen for message status updates
   */
  onStatusChange(messageId, callback) {
    this.listeners.set(messageId, callback);
  }

  /**
   * Notify listeners of status change
   */
  notifyListeners(messageId, status) {
    const callback = this.listeners.get(messageId);
    if (callback) {
      callback(status);
      this.listeners.delete(messageId);
    }
  }

  /**
   * Get pending messages count
   */
  getPendingCount() {
    return this.queue.length;
  }

  /**
   * Retry failed messages
   */
  retryAll() {
    console.log('🔄 Retrying all queued messages...');
    this.queue.forEach((msg) => (msg.retries = 0));
    this.processQueue();
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default new MessageQueue();
