import React, { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, AppState } from 'react-native';
import { registerPushToken, registerExpoPushToken } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
      enableLights: true,
    });
  } catch (_) { }
}

async function requestPermissions() {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current?.status === 'granted') return true;
    const asked = await Notifications.requestPermissionsAsync();
    return asked?.status === 'granted';
  } catch (_) {
    return false;
  }
}

async function getExpoPushToken() {
  try {
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId ?? "15bd197c-2515-4b53-ad04-d9e4e99ee963";
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    return tokenData?.data ?? (typeof tokenData === 'string' ? tokenData : null);
  } catch (error) {
    return null;
  }
}

async function getDevicePushToken() {
  try {
    const deviceToken = await Notifications.getDevicePushTokenAsync();
    const token = deviceToken?.data ?? null;
    const type = deviceToken?.type ?? null;
    return { token, type };
  } catch (_) {
    return { token: null, type: null };
  }
}

export default function PushTokenManager() {
  const { isAuthenticated, user } = useAuth();
  const receivedSubRef = useRef(null);
  const responseSubRef = useRef(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    let cancelled = false;

    const syncTokens = async () => {
      if (!isAuthenticated) return;

      await ensureAndroidChannel();
      const granted = await requestPermissions();
      if (!granted) return;

      const expoToken = await getExpoPushToken();
      const { token: deviceToken } = await getDevicePushToken();

      // Expo Push Token Kayıt/Güncelleme (Her açılışta kontrol et)
      if (expoToken) {
        try {
          // Backend'e gönder (Backend: varsa güncelle, yoksa oluştur)
          await registerExpoPushToken({ token: expoToken });
          await AsyncStorage.setItem('@push_expo_token', expoToken);
        } catch (error) { }
      }

      // Device Push Token Kayıt/Güncelleme
      if (deviceToken) {
        try {
          await registerPushToken({ token: deviceToken, platform: Platform.OS });
          await AsyncStorage.setItem('@push_device_token', deviceToken);
        } catch (error) { }
      } else {
        // Retry logic for Device Token if it's null initially
        setTimeout(async () => {
          try {
            const { token: retryToken } = await getDevicePushToken();
            if (retryToken) {
              await registerPushToken({ token: retryToken, platform: Platform.OS });
              await AsyncStorage.setItem('@push_device_token', retryToken);
            }
          } catch (retryError) { }
        }, 3000);
      }

      await AsyncStorage.setItem('@push_user_id', user.id);
    };

    // İlk açılışta çalıştır
    syncTokens();

    // AppState listener (Arka plandan öne gelince çalıştır)
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        syncTokens();
      }
      appState.current = nextAppState;
    });

    receivedSubRef.current = Notifications.addNotificationReceivedListener(async (notification) => {
      try {
        const raw = await AsyncStorage.getItem('@notif_unread');
        const curr = Number(raw ?? '0');
        const next = isNaN(curr) ? 1 : curr + 1;
        await AsyncStorage.setItem('@notif_unread', String(next));
      } catch (_) { }
    });

    responseSubRef.current = Notifications.addNotificationResponseReceivedListener(async (response) => {
      // Future: navigate based on response.notification.request.content.data
    });

    return () => {
      cancelled = true;
      subscription.remove();
      try { receivedSubRef.current && Notifications.removeNotificationSubscription(receivedSubRef.current); } catch (_) { }
      try { responseSubRef.current && Notifications.removeNotificationSubscription(responseSubRef.current); } catch (_) { }
    };
  }, [isAuthenticated]);

  return null;
}
