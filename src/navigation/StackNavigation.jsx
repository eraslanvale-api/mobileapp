import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';
import BottomNavigation from "./BottomNavigation";
import LoginScreen from '../screens/auth/LoginScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';

import RegisterScreen from "../screens/auth/RegisterScreen";
import PasswordForgotScreen from "../screens/auth/PasswordForgotScreen";
import PasswordResetCodeScreen from "../screens/auth/PasswordResetCodeScreen";
import PasswordResetScreen from "../screens/auth/PasswordResetScreen";
import VerifyScreen from "../screens/auth/VerifyScreen";

import ProfileScreen from '../screens/user/ProfileScreen'
import EditProfileScreen from '../screens/user/EditProfileScreen'
import AddressListScreen from '../screens/address/AddressListScreen'
import AddressCreateScreen from '../screens/address/AddressCreateScreen'
import AddressUpdateScreen from '../screens/address/AddressUpdateScreen'
import LocationPicker from '../screens/home/LocationPicker'
import WalletScreen from "../screens/wallet/WalletScreen";
import ReservationDetailScreen from "../screens/reservations/ReservationDetailScreen";
import CustomerSupportScreen from '../screens/settings/CustomerSupportScreen'
import LanguageScreen from '../screens/settings/LanguageScreen'
import InvoiceScreen from '../screens/invoice/InvoiceScreen'
import InvoiceAddScreen from '../screens/invoice/InvoiceAddScreen'
import InvoiceUpdateScreen from '../screens/invoice/InvoiceUpdateScreen'
import AccountDeleteScreen from '../screens/settings/AccountDeleteScreen'
import CitySelect from '../screens/settings/CitySelect'
import DistrictSelect from '../screens/settings/DistrictSelect'
import PaymentMethodAddScreen from '../screens/wallet/PaymentMethodAddScreen'
import ReservationTime from '../screens/home/ReservationTime'
import ReservationSuccessScreen from '../screens/home/ReservationSuccessScreen'
import EmergencySOSScreen from '../screens/reservations/EmergencySOSScreen'
import EmergencyContactsScreen from '../screens/settings/EmergencyContactsScreen'
import AddEditEmergencyContactScreen from '../screens/settings/AddEditEmergencyContactScreen'
import OnboardingScreen from '../screens/onboarding/OnboardingScreen'
import DriverHomeScreen from '../screens/driver/DriverHomeScreen';
import DriverJobDetailScreen from '../screens/driver/DriverJobDetailScreen';
import VehicleHandoverScreen from '../screens/driver/VehicleHandoverScreen';
import PasswordChangeScreen from '../screens/settings/PasswordChangeScreen';
import { useAuth } from '../context/AuthContext';

const Stack = createNativeStackNavigator();

export default function RootStackNavigation() {
    const [initialRoute, setInitialRoute] = useState(null);

    useEffect(() => {
        const checkOnboarding = async () => {
            try {
                const hasSeen = await AsyncStorage.getItem('hasSeenOnboarding');
                setInitialRoute(hasSeen === 'true' ? 'HomeTab' : 'Onboarding');
            } catch (e) {
                setInitialRoute('HomeTab'); // Fallback
            }
        };
        checkOnboarding();
    }, []);

    if (initialRoute === null) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
                <ActivityIndicator size="large" color="#f4a119" />
            </View>
        );
    }

    return (
        <Stack.Navigator initialRouteName={initialRoute}>
            <Stack.Screen
                name="HomeTab"
                component={BottomNavigation}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="DriverJobDetail"
                component={DriverJobDetailScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="VehicleHandover"
                component={VehicleHandoverScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="EmergencySOS"
                component={EmergencySOSScreen}
                options={{ headerShown: false, presentation: 'modal' }}
            />
            <Stack.Screen
                name="Login"
                component={LoginScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="PasswordForgot"
                component={PasswordForgotScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="PasswordResetCode"
                component={PasswordResetCodeScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="PasswordReset"
                component={PasswordResetScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Register"
                component={RegisterScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Verify"
                component={VerifyScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="EditProfile"
                component={EditProfileScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Addresses"
                component={AddressListScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="AddressCreate"
                component={AddressCreateScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="AddressUpdate"
                component={AddressUpdateScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="LocationPicker"
                component={LocationPicker}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Wallet"
                component={WalletScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="ReservationDetail"
                component={ReservationDetailScreen}
                options={{ headerShown: false }}
            />

            <Stack.Screen
                name="CustomerSupport"
                component={CustomerSupportScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Language"
                component={LanguageScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Invoice"
                component={InvoiceScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="InvoiceAdd"
                component={InvoiceAddScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="InvoiceUpdate"
                component={InvoiceUpdateScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="AccountDelete"
                component={AccountDeleteScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="CitySelect"
                component={CitySelect}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="DistrictSelect"
                component={DistrictSelect}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="PaymentMethodAdd"
                component={PaymentMethodAddScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="ReservationTime"
                component={ReservationTime}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="ReservationSuccess"
                component={ReservationSuccessScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="EmergencyContacts"
                component={EmergencyContactsScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="AddEditEmergencyContact"
                component={AddEditEmergencyContactScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Onboarding"
                component={OnboardingScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="PasswordChange"
                component={PasswordChangeScreen}
                options={{ headerShown: false }}
            />

        </Stack.Navigator>
    );
}
