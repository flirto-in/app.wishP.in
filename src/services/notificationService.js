import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // iOS only - still supported
    shouldShowBanner: true, // New - replaces shouldShowAlert on Android
    shouldShowList: true, // New - show in notification list
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.notificationListener = null;
    this.responseListener = null;
    this.expoPushToken = null;
  }

  // Request notification permissions
  async registerForPushNotifications() {
    try {
      console.log('📱 Registering for push notifications...');

      if (!Device.isDevice) {
        console.log('⚠️ Must use physical device for Push Notifications');
        return null;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Permission not granted for notifications');
        return null;
      }

      // Get the Expo push token
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

      console.log('📱 Project ID:', projectId);

      // Configure Android channel (needed for local notifications)
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3B82F6',
        });
      }

      if (!projectId) {
        console.warn('⚠️ No project ID found - push notifications require EAS project ID');
        console.log('💡 For testing, you can use Expo Go without projectId');
        console.log('💡 Local notifications will still work!');
        // Return null but continue - local notifications will still work
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      this.expoPushToken = token.data;
      console.log('✅ Push token obtained:', this.expoPushToken);

      // Store token locally
      await SecureStore.setItemAsync('pushToken', this.expoPushToken);

      return this.expoPushToken;
    } catch (error) {
      console.error('❌ Error registering for push notifications:', error);
      return null;
    }
  }

  // Get stored push token
  async getStoredPushToken() {
    try {
      return await SecureStore.getItemAsync('pushToken');
    } catch (error) {
      console.error('❌ Error getting stored push token:', error);
      return null;
    }
  }

  // Setup notification listeners
  setupNotificationListeners(onNotificationReceived, onNotificationTapped) {
    // Listener for notifications received while app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('📨 Notification received in foreground:', notification);
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    });

    // Listener for when user taps on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('👆 Notification tapped:', response);
      if (onNotificationTapped) {
        onNotificationTapped(response);
      }
    });
  }

  // Remove notification listeners
  removeNotificationListeners() {
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }
  }

  // Schedule a local notification
  async scheduleLocalNotification(title, body, data = {}) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: null, // null means show immediately
      });
      console.log('✅ Local notification scheduled');
    } catch (error) {
      console.error('❌ Error scheduling local notification:', error);
    }
  }

  // Cancel all scheduled notifications
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Set badge count
  async setBadgeCount(count) {
    if (Platform.OS === 'ios') {
      await Notifications.setBadgeCountAsync(count);
    }
  }

  // Get badge count
  async getBadgeCount() {
    if (Platform.OS === 'ios') {
      return await Notifications.getBadgeCountAsync();
    }
    return 0;
  }
}

export default new NotificationService();
