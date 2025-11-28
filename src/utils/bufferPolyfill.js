/**
 * Buffer Polyfill for React Native
 * Provides Buffer-like functionality using Uint8Array
 */

export const BufferPolyfill = {
  /**
   * Concatenate multiple Uint8Arrays
   * @param {Uint8Array[]} arrays
   * @returns {Uint8Array}
   */
  concat(arrays) {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }
    return result;
  },

  /**
   * Create Uint8Array from string
   * @param {string} str
   * @param {string} encoding - 'utf-8' or 'base64'
   * @returns {Uint8Array}
   */
  from(str, encoding = 'utf-8') {
    if (encoding === 'utf-8') {
      return new TextEncoder().encode(str);
    } else if (encoding === 'base64') {
      // Decode base64 string
      const binaryString = atob(str);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    }
    throw new Error(`Unsupported encoding: ${encoding}`);
  },

  /**
   * Convert Uint8Array to string
   * @param {Uint8Array} bytes
   * @param {string} encoding
   * @returns {string}
   */
  toString(bytes, encoding = 'utf-8') {
    if (encoding === 'utf-8') {
      return new TextDecoder().decode(bytes);
    } else if (encoding === 'base64') {
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }
    throw new Error(`Unsupported encoding: ${encoding}`);
  },
};

export default BufferPolyfill;
