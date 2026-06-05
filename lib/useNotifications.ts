import { useEffect, useState } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import messaging from '@react-native-firebase/messaging';

export async function setupPushNotifications() {
  // Android 13+ permission
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );

    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      return { success: false, reason: 'permission_denied' };
    }
  }

  try {
    const token = await messaging().getToken();
    return { success: true, token };
  } catch (error) {
    return { success: false, error };
  }
}