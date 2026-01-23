import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { s, vs, fs } from '../../utils/scale';

export default function SplashScreen({ onFinish }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const ring1Scale = useRef(new Animated.Value(0.9)).current;
    const ring1Opacity = useRef(new Animated.Value(0.2)).current;
    const ring2Scale = useRef(new Animated.Value(0.6)).current;
    const ring2Opacity = useRef(new Animated.Value(0.15)).current;
    const titleY = useRef(new Animated.Value(vs(20))).current;
    const subtitleOpacity = useRef(new Animated.Value(0)).current;
    const dotsAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
            Animated.timing(titleY, { toValue: 0, duration: 600, useNativeDriver: true }),
            Animated.sequence([
                Animated.timing(subtitleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
                Animated.timing(subtitleOpacity, { toValue: 0.6, duration: 700, useNativeDriver: true }),
            ]),
        ]).start();

        Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(ring1Scale, { toValue: 1.15, duration: 900, useNativeDriver: true }),
                    Animated.timing(ring1Opacity, { toValue: 0.05, duration: 900, useNativeDriver: true }),
                ]),
                Animated.parallel([
                    Animated.timing(ring1Scale, { toValue: 0.95, duration: 900, useNativeDriver: true }),
                    Animated.timing(ring1Opacity, { toValue: 0.2, duration: 900, useNativeDriver: true }),
                ]),
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(ring2Scale, { toValue: 1.1, duration: 1100, useNativeDriver: true }),
                    Animated.timing(ring2Opacity, { toValue: 0.03, duration: 1100, useNativeDriver: true }),
                ]),
                Animated.parallel([
                    Animated.timing(ring2Scale, { toValue: 0.7, duration: 1100, useNativeDriver: true }),
                    Animated.timing(ring2Opacity, { toValue: 0.15, duration: 1100, useNativeDriver: true }),
                ]),
            ])
        ).start();

        Animated.loop(Animated.timing(dotsAnim, { toValue: 1, duration: 1200, useNativeDriver: true })).start();

        const timer = setTimeout(() => {
            onFinish?.();
        }, 2400);

        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.glow, { transform: [{ scale: ring1Scale }], opacity: ring1Opacity }]} />
            <Animated.View style={[styles.glowAlt, { transform: [{ scale: ring2Scale }], opacity: ring2Opacity }]} />
            <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                <View style={styles.iconContainer}>
                    <Ionicons name="car-sport" size={s(64)} color={Colors.primary} />
                </View>
                <Animated.Text style={[styles.title, { transform: [{ translateY: titleY }] }]}>
                    Premium Vale
                </Animated.Text>
                <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>Premium Vale Hizmeti</Animated.Text>
                <View style={styles.dotsRow}>
                    <Animated.View style={[styles.dot, { opacity: dotsAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }), transform: [{ scale: dotsAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] }) }] }]} />
                    <Animated.View style={[styles.dot, { opacity: dotsAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }), transform: [{ scale: dotsAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]} />
                    <Animated.View style={[styles.dot, { opacity: dotsAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.9] }), transform: [{ scale: dotsAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0.95] }) }] }]} />
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    glow: {
        position: 'absolute',
        width: s(260),
        height: s(260),
        borderRadius: s(130),
        backgroundColor: 'rgba(244, 161, 25, 0.08)'
    },
    glowAlt: {
        position: 'absolute',
        width: s(320),
        height: s(320),
        borderRadius: s(160),
        backgroundColor: 'rgba(244, 161, 25, 0.06)'
    },
    content: {
        alignItems: 'center',
    },
    iconContainer: {
        width: s(120),
        height: s(120),
        borderRadius: s(60),
        backgroundColor: 'rgba(244, 161, 25, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: vs(24),
        borderWidth: 1,
        borderColor: 'rgba(244, 161, 25, 0.3)',
    },
    title: {
        fontSize: fs(48),
        fontWeight: '800',
        color: '#fff',
        letterSpacing: s(1),
    },
    subtitle: {
        fontSize: fs(16),
        color: '#999',
        marginTop: vs(8),
        letterSpacing: s(2),
        textTransform: 'uppercase',
    },
    dotsRow: {
        flexDirection: 'row',
        marginTop: vs(16),
        gap: s(8)
    },
    dot: {
        width: s(8),
        height: s(8),
        borderRadius: s(4),
        backgroundColor: Colors.primary
    }
});
