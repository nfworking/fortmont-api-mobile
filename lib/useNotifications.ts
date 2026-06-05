import {PermissionsAndroid  } from 'react-native';
import { useEffect } from 'react';
import messaging from '@react-native-firebase/messaging';


const requestUserPermission = async () => {
    const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
       console.log('Notification permission granted');
    }else {
        console.log('Notification permission denied');
    }
    };

const getToken = async () => { 
    try {
    const token = await messaging().getToken();
    console.log('Device FCM Token:', token);
    }catch (error) {
        console.log('Error getting token:', error);
    }
};

export const useNotifications = () => {
    useEffect(() => {
        requestUserPermission();
        getToken();
    }, []);
};