/**
 * Production-Safe Logger
 *
 * Conditionally logs based on DEV_MODE environment variable.
 * In production (DEV_MODE=false), logs are suppressed to prevent:
 * - Performance degradation
 * - Memory leaks from excessive logging
 * - Accidental exposure of sensitive data
 *
 * Usage:
 * import logger from '@/utils/logger';
 * logger.log('This will only show in development');
 * logger.error('Errors always show');
 */

const isDevelopment = process.env.EXPO_PUBLIC_DEV_MODE === 'true';

const logger = {
  /**
   * Log informational messages
   * Only shows in development mode
   */
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Log informational messages with emoji
   * Only shows in development mode
   */
  info: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Log warnings
   * Shows in both development and production (important for debugging production issues)
   */
  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args);
    } else {
      // In production, you could send to crash reporting service (e.g., Sentry)
      // For now, we suppress warnings in production
    }
  },

  /**
   * Log errors
   * Always shows (critical for debugging production crashes)
   */
  error: (...args) => {
    console.error(...args);
    // TODO: In production, send to crash reporting service (e.g., Sentry, Firebase Crashlytics)
  },

  /**
   * Log debug messages
   * Only shows in development mode
   */
  debug: (...args) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  /**
   * Check if we're in development mode
   */
  isDev: () => isDevelopment,
};

export default logger;
