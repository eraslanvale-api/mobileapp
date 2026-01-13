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

const Tab = createBottomTabNavigator();

export default function BottomTabNavigation() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          height: ms(60),
          paddingBottom: ms(10),
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarActiveTintColor: '#f4a119',
        tabBarInactiveTintColor: '#999',
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
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Ana Sayfa' }} />
      <Tab.Screen name="Services" component={ServicesScreen} options={{ title: 'Hizmetler' }} />
      {(user?.role === 'driver' || user?.role === 'Şoför' || user?.role === 'sofor') && (
          <Tab.Screen name="DriverPanel" component={DriverHomeScreen} options={{ title: 'Sürücü' }} />
      )}
      <Tab.Screen name="Reservations" component={ReservationsScreen} options={{ title: 'Rezervasyon' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Ayarlar' }} />
    </Tab.Navigator>
  );
}
