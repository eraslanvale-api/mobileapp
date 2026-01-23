import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import StackNavigation from "./src/navigation/StackNavigation";
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { ServiceProvider } from './src/context/ServiceContext';
import { ConfigProvider } from './src/context/ConfigContext';
import { AuthProvider } from './src/context/AuthContext';
import { JourneyProvider } from './src/context/JourneyContext';
import { JobProvider } from './src/context/JobContext';
import CustomSplashScreen from './src/screens/splash/SplashScreen';
import * as Updates from 'expo-updates';
import { ToastProvider } from './src/context/ToastContext';
import PushTokenManager from './src/screens/home/NotificationConfig';
import { Colors } from './src/constants/Colors';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [showCustomSplash, setShowCustomSplash] = useState(true);
  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, make any API calls you need to do here
        await Font.loadAsync({
          "Roboto-Regular": require("./assets/fonts/Roboto/Roboto-Regular.ttf"),
          "Roboto-Bold": require("./assets/fonts/Roboto/Roboto-Bold.ttf"),
          "Roboto-Medium": require("./assets/fonts/Roboto/Roboto-Medium.ttf"),
          "Roboto-Light": require("./assets/fonts/Roboto/Roboto-Light.ttf"),
        });

        if (!__DEV__) {
          try {
            const result = await Updates.checkForUpdateAsync();
            if (result?.isAvailable) {
              await Updates.fetchUpdateAsync();
              await Updates.reloadAsync();
              return;
            }
          } catch (e) {
            // console.log('Update check failed:', e);
          }
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);


  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      try {
        await SplashScreen.hideAsync();
      } catch (e) { }
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }
  if (showCustomSplash) {
    return (
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <StatusBar style="light" animated backgroundColor="#000" />
        <CustomSplashScreen onFinish={() => setShowCustomSplash(false)} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <ConfigProvider>
        <ServiceProvider>
          <ToastProvider>
            <JourneyProvider>
              <JobProvider>
                <AuthProvider>

                  <SafeAreaProvider>
                    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
                      <StatusBar style="light" animated backgroundColor={Colors.background} />
                      <NavigationContainer>
                        <StackNavigation />
                      </NavigationContainer>
                      <PushTokenManager />
                    </SafeAreaView>
                  </SafeAreaProvider>
                </AuthProvider>
              </JobProvider>
            </JourneyProvider>
          </ToastProvider>
        </ServiceProvider>
      </ConfigProvider>
    </GestureHandlerRootView >

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});