import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, Animated, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { s, vs } from '../utils/scale';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
    const [toast, setToast] = useState({
        visible: false,
        message: '',
        type: 'success', // 'success', 'error', 'info'
        duration: 3000
    });

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-50)).current;
    const timerRef = useRef(null);

    const showToast = useCallback((message, type = 'success', duration = 3000) => {
        if (timerRef.current) clearTimeout(timerRef.current);

        setToast({ visible: true, message, type, duration });

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true
            }),
            Animated.spring(translateY, {
                toValue: 0,
                friction: 5,
                useNativeDriver: true
            })
        ]).start();

        timerRef.current = setTimeout(() => {
            hideToast();
        }, duration);
    }, []);

    const hideToast = useCallback(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true
            }),
            Animated.timing(translateY, {
                toValue: -50,
                duration: 300,
                useNativeDriver: true
            })
        ]).start(() => {
            setToast(prev => ({ ...prev, visible: false }));
        });
    }, []);

    const getBackgroundColor = () => {
        switch (toast.type) {
            case 'success': return '#4CAF50';
            case 'error': return '#F44336';
            case 'info': return '#2196F3';
            default: return '#333';
        }
    };

    const getIconName = () => {
        switch (toast.type) {
            case 'success': return 'checkmark-circle';
            case 'error': return 'alert-circle';
            case 'info': return 'information-circle';
            default: return 'notifications';
        }
    };

    return (
        <ToastContext.Provider value={{ showToast, hideToast }}>
            {children}
            {toast.visible && (
                <SafeAreaInsetsContext.Consumer>
                    {(insets) => (
                        <Animated.View
                            style={[
                                styles.toastContainer,
                                {
                                    top: (insets?.top || 0) + vs(40),
                                    backgroundColor: getBackgroundColor(),
                                    opacity: fadeAnim,
                                    transform: [{ translateY }]
                                }
                            ]}
                        >
                            <Ionicons name={getIconName()} size={24} color="#fff" style={styles.icon} />
                            <Text style={styles.message}>{toast.message}</Text>
                            <TouchableOpacity onPress={hideToast} style={styles.closeBtn}>
                                <Ionicons name="close" size={20} color="rgba(255,255,255,0.8)" />
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                </SafeAreaInsetsContext.Consumer>
            )}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within a ToastProvider');
    return context;
};

const styles = StyleSheet.create({
    toastContainer: {
        position: 'absolute',
        left: 20,
        right: 20,
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 10,
        zIndex: 9999,
    },
    icon: {
        marginRight: 12,
    },
    message: {
        flex: 1,
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    closeBtn: {
        padding: 4,
        marginLeft: 8,
    }
});
