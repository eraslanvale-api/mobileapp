import React, { useState,useEffect } from 'react';
import { View, Text, StyleSheet, Image, Dimensions, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS, interpolate, Extrapolation } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { s, vs, fs, ms } from '../../utils/scale';
import { sendEmergencyAlert, getOrder } from '../../api/endpoints';
import api from '../../api/axios';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');
const SLIDER_WIDTH = width - s(48);
const SLIDER_HEIGHT = vs(60);
const BUTTON_WIDTH = s(50);
const SWIPE_LIMIT = SLIDER_WIDTH - BUTTON_WIDTH - s(10);

export default function EmergencySOSScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { reservationId, reservation } = route.params || {};
    const [loading, setLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Check if previously submitted (mock logic or based on reservation prop)
    // If backend provides this info, we can initialize isSubmitted accordingly.
    useEffect(() => {
        let isMounted = true;

        const checkStatus = async () => {
            if (reservation?.has_active_emergency) {
                setIsSubmitted(true);
                return;
            }
            
            if (reservationId) {
                try {
                    const response = await getOrder(reservationId);
                    if (isMounted && response.data?.has_active_emergency) {
                        setIsSubmitted(true);
                    }
                } catch (error) {
                    console.log('Error fetching order status:', error);
                }
            }
        };

        checkStatus();

        return () => { isMounted = false; };
    }, [reservation, reservationId]);

    const translateX = useSharedValue(0);

    const handleEmergency = async () => {
        setLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Hata', 'Konum izni verilmedi. Acil durum bildirimi için konum izni gereklidir.');
                setLoading(false);
                translateX.value = withSpring(0, { damping: 15, stiffness: 120 });
                return;
            }

            const location = await Location.getCurrentPositionAsync({});
            
            await sendEmergencyAlert({
                order: reservationId,
                lat: location.coords.latitude,
                lng: location.coords.longitude
            });

            // WhatsApp entegrasyonu
            if (reservation?.emergency_contact_phone) {
                const phone = reservation.emergency_contact_phone.replace(/[^0-9+]/g, '');
                const message = `ACİL DURUM! Taksideyim ve kendimi güvende hissetmiyorum. Konumum: https://www.google.com/maps/search/?api=1&query=${location.coords.latitude},${location.coords.longitude}`;
                const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
                
                const supported = await Linking.canOpenURL(url);
                if (supported) {
                    await Linking.openURL(url);
                }
            }

            setIsSubmitted(true);
        } catch (error) {
            console.error('Emergency alert error:', error);
            Alert.alert('Hata', 'Acil durum bildirimi gönderilemedi. Lütfen tekrar deneyin.');
            translateX.value = withSpring(0, { damping: 15, stiffness: 120 });
        } finally {
            setLoading(false);
        }
    };

    const pan = Gesture.Pan()
        .onUpdate((event) => {
            translateX.value = Math.max(0, Math.min(event.translationX, SWIPE_LIMIT));
        })
        .onEnd(() => {
            if (translateX.value > SWIPE_LIMIT * 0.7) {
                translateX.value = withSpring(SWIPE_LIMIT, { damping: 15, stiffness: 120 });
                runOnJS(handleEmergency)();
            } else {
                translateX.value = withSpring(0, { damping: 15, stiffness: 120 });
            }
        });

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }],
        };
    });

    const textOpacityStyle = useAnimatedStyle(() => {
        return {
            opacity: interpolate(translateX.value, [0, SWIPE_LIMIT / 2], [1, 0], Extrapolation.CLAMP),
        };
    });

    if (isSubmitted) {
        return (
            <View style={styles.container}>
                <View style={styles.mapBackground}>
                     <Image 
                        source={{ uri: 'https://maps.googleapis.com/maps/api/staticmap?center=41.0082,28.9784&zoom=13&size=600x900&maptype=roadmap&key=YOUR_API_KEY_HERE' }} 
                        style={styles.mapImage}
                     />
                     <View style={styles.overlay} />
                </View>

                <View style={styles.card}>
                    <View style={styles.iconContainer}>
                         <Ionicons name="medkit" size={s(80)} color="#ef4444" />
                    </View>

                    <Text style={styles.title}>Yardım Talebiniz Alındı</Text>
                    <Text style={styles.description}>
                        En kısa sürede size ulaşacağız.
                    </Text>

                    <View style={styles.bottomActions}>
                         <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
                            <Text style={styles.cancelButtonText}>Kapat</Text>
                         </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={styles.container}>
            {/* Background Map Placeholder or Image */}
            <View style={styles.mapBackground}>
                 {/* Gerçek harita yerine görseldeki gibi blur bir görüntü de olabilir. 
                     Şimdilik basit bir gri arka plan veya harita görseli koyabiliriz. */}
                 <Image 
                    source={{ uri: 'https://maps.googleapis.com/maps/api/staticmap?center=41.0082,28.9784&zoom=13&size=600x900&maptype=roadmap&key=YOUR_API_KEY_HERE' }} 
                    style={styles.mapImage}
                 />
                 <View style={styles.overlay} />
            </View>

            <View style={styles.card}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#ef4444" />
                        <Text style={styles.loadingText}>Yardım talebiniz iletiliyor...</Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.iconContainer}>
                            <Ionicons name="medkit" size={s(80)} color="#ef4444" />
                        </View>

                        <Text style={styles.title}>Yardım mı lazım?</Text>
                        <Text style={styles.description}>
                            Yardım gelmesi için sağa kaydırdıktan sonraki en kısa sürede bulunduğun konuma yardım gelecektir.
                        </Text>

                        <View style={styles.sliderContainer}>
                            <View style={styles.sliderTrack}>
                                <Animated.Text style={[styles.sliderText, textOpacityStyle]}>
                                    Yardım için kaydır {">>>"}
                                </Animated.Text>
                                
                                <GestureDetector gesture={pan}>
                                    <Animated.View style={[styles.sliderButton, animatedStyle]}>
                                        <Ionicons name="chevron-forward" size={s(24)} color="#fff" />
                                    </Animated.View>
                                </GestureDetector>
                            </View>
                        </View>

                        <View style={styles.bottomActions}>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
                                <Text style={styles.cancelButtonText}>Vazgeç</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    mapBackground: {
        ...StyleSheet.absoluteFillObject,
    },
    mapImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    card: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: ms(30),
        borderTopRightRadius: ms(30),
        paddingHorizontal: s(24),
        paddingTop: vs(40),
        paddingBottom: vs(30),
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -5,
        },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
    },
    iconContainer: {
        marginBottom: vs(20),
    },
    ambulanceIcon: {
        width: s(120),
        height: s(80),
        resizeMode: 'contain',
    },
    title: {
        fontSize: fs(22),
        fontWeight: 'bold',
        color: '#1e3a8a', // Dark blueish
        marginBottom: vs(12),
    },
    description: {
        fontSize: fs(14),
        color: '#666',
        textAlign: 'center',
        marginBottom: vs(30),
        lineHeight: fs(20),
        paddingHorizontal: s(10),
    },
    sliderContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: vs(30),
    },
    sliderTrack: {
        width: SLIDER_WIDTH,
        height: SLIDER_HEIGHT,
        backgroundColor: '#f0f0f0',
        borderRadius: SLIDER_HEIGHT / 2,
        justifyContent: 'center',
        paddingHorizontal: s(5),
        position: 'relative',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    sliderText: {
        position: 'absolute',
        width: '100%',
        textAlign: 'center',
        color: '#999',
        fontSize: fs(14),
        fontWeight: '600',
        zIndex: -1,
    },
    sliderButton: {
        width: BUTTON_WIDTH,
        height: BUTTON_WIDTH,
        borderRadius: BUTTON_WIDTH / 2,
        backgroundColor: '#ef4444', // Red color for emergency
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
    },
    bottomActions: {
        width: '100%',
    },
    cancelButton: {
        width: '100%',
        backgroundColor: '#000',
        paddingVertical: vs(15),
        borderRadius: 0,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#fff',
        fontSize: fs(16),
        fontWeight: 'bold',
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: vs(40),
    },
    loadingText: {
        marginTop: vs(20),
        fontSize: fs(16),
        color: '#666',
        fontWeight: '500',
    },
});