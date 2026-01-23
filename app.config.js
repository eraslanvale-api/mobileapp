import 'dotenv/config';

export default {
  expo: {
    name: "Premium Vale",
    slug: "premiumVale",
    owner: "eraslan", // Expo dashboard'daki kullanıcı adınızla aynı olmalı
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    scheme: "premium-vale", // EKLEMENİZ ÖNERİLİR (Deep linking için)
    newArchEnabled: true,

    updates: {
      url: "https://u.expo.dev/15bd197c-2515-4b53-ad04-d9e4e99ee963",
      enabled: true,
      checkAutomatically: "ON_LOAD", // Uygulama açılırken kontrol et
      fallbackToCacheTimeout: 0      // Güncelleme için kullanıcıyı bekletme, arkada indir
    },

    runtimeVersion: {
      policy: "appVersion", // Native sürüm (1.0.0) ile eşleştir
    },


    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.premiumvale.app",
      buildNumber: "13", // Her yeni App Store gönderiminde artırın
      googleServicesFile: process.env.GOOGLE_SERVICES_IOS || "./GoogleService-Info.plist",
      infoPlist: {
        "ITSAppUsesNonExemptEncryption": false,
        "NSLocationWhenInUseUsageDescription": "Premium Vale, size en yakın vale hizmetini sunabilmek için konumunuza ihtiyaç duyar.",
        "NSUserNotificationUsageDescription": "Vale hizmetinizle ilgili durum güncellemeleri gönderebilmek için bildirim izni gereklidir.",
      },
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY_IOS
      }
    },

    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      package: "com.premiumvale.app",
      versionCode: 3, // Her yeni Play Store gönderiminde artırın
      googleServicesFile: process.env.GOOGLE_SERVICES_ANDROID || "./google-services.json",
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID
        }
      },
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
      ]
    },

    platforms: [
      "ios",
      "android"
    ],
    plugins: [
      "expo-font",
      "./plugins/withIosModularHeaders",
      "@react-native-firebase/app",
      [
        "expo-build-properties",
        {
          "ios": {
            "useFrameworks": "static"
          }
        }
      ],
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#000000",
          "resizeMode": "cover",
          "image": "./assets/splash-icon.png",
        },
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#000000"
        }
      ],
      [
        "expo-location",
        {
          "locationWhenInUsePermission": "Premium Vale, size en yakın vale hizmetini sunabilmek için konumunuza ihtiyaç duyar."
        }
      ]
    ],

    extra: {
      eas: {
        projectId: "15bd197c-2515-4b53-ad04-d9e4e99ee963"
      },
      googleMapsApiKeyAndroid: process.env.GOOGLE_MAPS_API_KEY_ANDROID,
      googleMapsApiKeyIos: process.env.GOOGLE_MAPS_API_KEY_IOS
    }
  }
};