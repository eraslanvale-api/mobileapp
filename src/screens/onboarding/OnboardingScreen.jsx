import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, Dimensions, TouchableOpacity, Image, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        title: 'Premium Vale',
        description: 'Şehrin en prestijli ve güvenilir vale hizmeti artık cebinizde. Tek dokunuşla aracınızı teslim edin.',
        image: require('../../../assets/logo.png'),
        icon: 'car-sport'
    },
    {
        id: '2',
        title: 'Premium Transfer',
        description: 'Konforlu ve lüks araçlarımızla dilediğiniz yere güvenle ulaşın. Şehir içi ulaşımın keyfini çıkarın.',
        image: require('../../../assets/logo.png'),
        icon: 'navigate-circle'
    },
    {
        id: '3',
        title: 'Size Özel Hizmetler',
        description: 'Premium Vale ve Premium Transfer seçenekleriyle ihtiyacınıza en uygun hizmeti seçin, ayrıcalıklı hissedin.',
        image: require('../../../assets/logo.png'),
        icon: 'diamond'
    },
];

export default function OnboardingScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { fromSettings } = route.params || {};
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef(null);

    const handleNext = async () => {
        if (currentIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            await completeOnboarding();
        }
    };

    const handleSkip = async () => {
        await completeOnboarding();
    };

    const completeOnboarding = async () => {
        if (fromSettings) {
            navigation.goBack();
            return;
        }
        try {
            await AsyncStorage.setItem('hasSeenOnboarding', 'true');
            navigation.replace('HomeTab');
        } catch (error) {
            console.error('Error saving onboarding status:', error);
        }
    };

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const renderItem = ({ item }) => (
        <View style={styles.slide}>
            <Image source={item.image} style={styles.image} resizeMode="contain" />
            <View style={styles.overlay} />

            <View style={styles.contentContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <FlatList
                ref={flatListRef}
                data={SLIDES}
                renderItem={renderItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                keyExtractor={(item) => item.id}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
            />

            {/* Pagination Dots */}
            <View style={styles.pagination}>
                {SLIDES.map((_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.dot,
                            {
                                width: currentIndex === index ? 24 : 8,
                                backgroundColor: currentIndex === index ? Colors.primary : 'rgba(255,255,255,0.5)'
                            }
                        ]}
                    />
                ))}
            </View>

            {/* Footer Buttons */}
            <View style={styles.footer}>
                {currentIndex < SLIDES.length - 1 ? (
                    <>
                        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                            <Text style={styles.skipText}>Atla</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
                            <Text style={styles.nextText}>İleri</Text>
                            <Ionicons name="arrow-forward" size={20} color="#fff" />
                        </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity onPress={handleNext} style={styles.getStartedButton}>
                        <Text style={styles.getStartedText}>Başlayalım</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    slide: {
        width,
        height,
        justifyContent: 'flex-end',
        paddingBottom: 100,
    },
    image: {
        ...StyleSheet.absoluteFillObject,
        width,
        height: height * 0.5, // Logo üst kısımda görünsün
        marginTop: height * 0.1,
        alignSelf: 'center',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)', // Daha hafif bir karartma
    },
    contentContainer: {
        paddingHorizontal: 32,
        paddingBottom: 80,
        alignItems: 'center',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 16,
        letterSpacing: 0.5,
    },
    description: {
        fontSize: 16,
        color: '#ccc',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 10,
    },
    pagination: {
        position: 'absolute',
        bottom: 140,
        flexDirection: 'row',
        alignSelf: 'center',
    },
    dot: {
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    footer: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    skipButton: {
        padding: 12,
    },
    skipText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 30,
    },
    nextText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginRight: 8,
    },
    getStartedButton: {
        width: '100%',
        backgroundColor: Colors.primary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    getStartedText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
});
