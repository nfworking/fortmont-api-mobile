import { Platform, PermissionsAndroid } from 'react-native';
import messaging from '@react-native-firebase/messaging';

export async function setupPushNotifications() {
  try {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        return { success: false, reason: 'permission_denied' };
      }
    }

    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();

      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        return { success: false, reason: 'permission_denied' };
      }
    }

    const token = await messaging().getToken();

    return { success: true, token };
  } catch (error) {
    return { success: false, error };
  }
}