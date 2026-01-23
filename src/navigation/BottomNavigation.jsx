import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/home/HomeScreen';
import ServicesScreen from '../screens/services/ServicesScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import ReservationsScreen from '../screens/reservations/ReservationsScreen';
import DriverHomeScreen from '../screens/driver/DriverHomeScreen';
import { useAuth } from '../context/AuthContext';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { s, vs, ms, fs } from '../utils/scale';
import { Colors } from '../constants/Colors';

import { View, ActivityIndicator } from 'react-native';

const Tab = createBottomTabNavigator();

export default function BottomTabNavigation() {
  const insets = useSafeAreaInsets();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
  return (
    <Tab.Navigator
      initialRouteName={(user?.role === 'driver' || user?.role === 'Şoför' || user?.role === 'sofor') ? "DriverPanel" : "Home"}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          height: ms(60),
          paddingBottom: ms(10),
          backgroundColor: Colors.secondary,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray,
        tabBarHideOnKeyboard: true,

        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Services') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'Reservations') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else if (route.name === 'Pages') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'DriverPanel') {
            iconName = focused ? 'car' : 'car-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      {!(user?.role === 'driver' || user?.role === 'Şoför' || user?.role === 'sofor') && (
        <>
          <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Ana Sayfa' }} />
          <Tab.Screen name="Services" component={ServicesScreen} options={{ title: 'Hizmetler' }} />
          <Tab.Screen name="Reservations" component={ReservationsScreen} options={{ title: 'Rezervasyon' }} />
        </>
      )}
      {(user?.role === 'driver' || user?.role === 'Şoför' || user?.role === 'sofor') && (
        <Tab.Screen name="DriverPanel" component={DriverHomeScreen} options={{ title: 'Sürücü' }} />
      )}
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Ayarlar' }} />
    </Tab.Navigator>
  );
}
