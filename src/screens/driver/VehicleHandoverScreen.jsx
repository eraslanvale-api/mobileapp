import React, { useState,useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, ScrollView, Platform, Modal, Dimensions, FlatList } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { s, vs, ms, fs } from '../../utils/scale';
import { uploadHandoverPhoto, getOrder } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Zoomable Image Component
const ZoomableImage = ({ uri }) => {
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);

    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = savedScale.value * e.scale;
        })
        .onEnd(() => {
            if (scale.value < 1) {
                scale.value = withTiming(1);
                savedScale.value = 1;
            } else {
                savedScale.value = scale.value;
            }
        });

    const doubleTapGesture = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            if (scale.value > 1.5) {
                scale.value = withTiming(1);
                savedScale.value = 1;
            } else {
                scale.value = withTiming(2); // Zoom 2x
                savedScale.value = 2;
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    // Compose gestures: double tap takes precedence if detected? 
    // Actually standard is Simultaneous or Race. Double tap needs to wait.
    // But for simplicity, we can just use Race or similar.
    // However, if we just want double tap to work, we can just use it.
    // Combining them:
    const composed = Gesture.Simultaneous(pinchGesture, doubleTapGesture);

    return (
        <GestureDetector gesture={composed}>
            <Animated.Image
                source={{ uri }}
                style={[styles.lightboxImage, animatedStyle]}
                resizeMode="contain"
            />
        </GestureDetector>
    );
};

export default function VehicleHandoverScreen({ route, navigation }) {
    const { jobId, isReadOnly } = route.params;
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [photos, setPhotos] = useState({
        front: null,
        back: null,
        right: null,
        left: null,
    });
    const [uploading, setUploading] = useState(false);
    const [jobStatus, setJobStatus] = useState(null);
    
    // Image Viewer State
    const [isImageViewVisible, setIsImageViewVisible] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const galleryFlatListRef = useRef(null);

    useEffect(() => {
        fetchJobDetails();
    }, []);

    const fetchJobDetails = async () => {
        try {
            const res = await getOrder(jobId);
            if (res.data) {
                setJobStatus(res.data.status);
                
                if (res.data.handover_photos) {
                    const loadedPhotos = { ...photos };
                    res.data.handover_photos.forEach(item => {
                        if (item.photo_type && item.photo) {
                            loadedPhotos[item.photo_type] = { uri: item.photo };
                        }
                    });
                    setPhotos(loadedPhotos);
                }
            }
        } catch (error) {
            console.error("Job details error:", error);
            // showToast('Mevcut fotoğraflar yüklenemedi', 'error');
        } finally {
            setLoading(false);
        }
    };

    const isLocked = isReadOnly || jobStatus === 'completed' || jobStatus === 'cancelled';

    const getGalleryImages = () => {
        const types = ['front', 'back', 'right', 'left'];
        return types
            .map(type => photos[type] ? { uri: photos[type].uri } : null)
            .filter(Boolean);
    };

    const openViewer = (initialType) => {
        const types = ['front', 'back', 'right', 'left'];
        const validImages = [];
        let initialIndex = 0;
        let found = false;

        types.forEach((type) => {
            if (photos[type]) {
                if (type === initialType) {
                    initialIndex = validImages.length;
                    found = true;
                }
                validImages.push({ uri: photos[type].uri, type });
            }
        });

        if (found) {
            setCurrentImageIndex(initialIndex);
            setIsImageViewVisible(true);
            // Slight delay to ensure Modal is rendered before scrolling
            setTimeout(() => {
                if(galleryFlatListRef.current) {
                    galleryFlatListRef.current.scrollToIndex({ index: initialIndex, animated: false });
                }
            }, 100);
        }
    };

    const handleMomentumScrollEnd = (event) => {
        const newIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        setCurrentImageIndex(newIndex);
    };

    const openCamera = async (type) => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('İzin Gerekli', 'Kamera erişim izni vermeniz gerekiyor.');
                return;
            }

            let result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                aspect: [4, 3],
                quality: 0.5,
            });
            if (!result.canceled) {
                setPhotos(prev => ({ ...prev, [type]: result.assets[0] }));
            }
        } catch (error) {
            console.error("Camera error:", error);
            Alert.alert('Hata', 'Kamera açılırken bir sorun oluştu.');
        }
    };

    const openGallery = async (type) => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('İzin Gerekli', 'Galeri erişim izni vermeniz gerekiyor.');
                return;
            }

            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                aspect: [4, 3],
                quality: 0.5,
            });
            if (!result.canceled) {
                setPhotos(prev => ({ ...prev, [type]: result.assets[0] }));
            }
        } catch (error) {
            console.error("Gallery error:", error);
            Alert.alert('Hata', 'Galeri açılırken bir sorun oluştu.');
        }
    };

    // --- SEQUENTIAL & BATCH UPLOAD LOGIC ---

    const startCameraSequence = async (index = 0) => {
        const types = ['front', 'back', 'right', 'left'];
        const labels = { front: 'Ön', back: 'Arka', right: 'Sağ', left: 'Sol' };
        
        if (index >= types.length) {
            showToast('Tüm fotoğraflar çekildi', 'success');
            return;
        }

        const type = types[index];

        Alert.alert(
            `${index + 1}/4: ${labels[type]} Fotoğrafı`,
            `Lütfen aracın ${labels[type]} tarafını çekiniz.`,
            [
                {
                    text: 'Kamerayı Aç',
                    onPress: async () => {
                        try {
                            const { status } = await ImagePicker.requestCameraPermissionsAsync();
                            if (status !== 'granted') {
                                Alert.alert('İzin Gerekli', 'Kamera erişim izni vermeniz gerekiyor.');
                                return;
                            }
                
                            let result = await ImagePicker.launchCameraAsync({
                                mediaTypes: ['images'],
                                allowsEditing: false,
                                quality: 0.5,
                            });

                            if (!result.canceled) {
                                setPhotos(prev => ({ ...prev, [type]: result.assets[0] }));
                                // Wait a bit then ask for next
                                setTimeout(() => {
                                    startCameraSequence(index + 1);
                                }, 500);
                            } else {
                                // User cancelled
                                Alert.alert(
                                    'İptal Edildi',
                                    'Sıralı çekim durduruldu. Kaldığınız yerden devam etmek ister misiniz?',
                                    [
                                        { text: 'Evet, Devam Et', onPress: () => startCameraSequence(index) },
                                        { text: 'Hayır, Bitir', style: 'cancel' }
                                    ]
                                );
                            }
                        } catch (error) {
                            console.error("Camera sequence error:", error);
                            Alert.alert('Hata', 'Kamera açılırken bir sorun oluştu.');
                        }
                    }
                },
                { text: 'İptal', style: 'cancel' }
            ],
            { cancelable: false }
        );
    };

    const openMultiSelectGallery = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('İzin Gerekli', 'Galeri erişim izni vermeniz gerekiyor.');
                return;
            }

            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsMultipleSelection: true,
                selectionLimit: 4,
                quality: 0.5,
            });

            if (!result.canceled) {
                const types = ['front', 'back', 'right', 'left'];
                const newPhotos = { ...photos };
                
                // Map selected assets to types sequentially
                result.assets.slice(0, 4).forEach((asset, i) => {
                    newPhotos[types[i]] = asset;
                });
                
                setPhotos(newPhotos);
                showToast(`${result.assets.length} fotoğraf seçildi`, 'success');
            }
        } catch (error) {
            console.error("Multi-gallery error:", error);
            Alert.alert('Hata', 'Galeri açılırken bir sorun oluştu.');
        }
    };

    const handleBatchPick = () => {
        Alert.alert(
            'Hızlı Fotoğraf Yükleme',
            'Lütfen yöntemi seçiniz:',
            [
                { 
                    text: 'Kamera ile Sırayla Çek', 
                    onPress: () => startCameraSequence(0) 
                },
                { 
                    text: 'Galeriden Çoklu Seç', 
                    onPress: openMultiSelectGallery 
                },
                { text: 'İptal', style: 'cancel' }
            ]
        );
    };

    const pickImage = (type) => {
        Alert.alert('Fotoğraf Ekle', 'Lütfen bir kaynak seçin', [
            { text: 'Kamera', onPress: () => openCamera(type) },
            { text: 'Galeri', onPress: () => openGallery(type) },
            { text: 'İptal', style: 'cancel' }
        ]);
    };

    const handleUpload = async () => {
        // Validate
        if (!photos.front || !photos.back || !photos.right || !photos.left) {
            Alert.alert('Eksik Fotoğraf', 'Lütfen aracın 4 tarafından (Ön, Arka, Sağ, Sol) fotoğraf çekiniz.');
            return;
        }

        setUploading(true);
        try {
            // Upload sequentially or parallel
            const uploadPromises = Object.keys(photos).map(async (type) => {
                const photo = photos[type];
                
                // Skip if it's already a remote URL (starts with http or https)
                if (photo.uri && (photo.uri.startsWith('http') || photo.uri.startsWith('https'))) {
                    return Promise.resolve();
                }

                const formData = new FormData();
                formData.append('order', jobId);
                formData.append('photo_type', type);
                
                const filename = photo.uri.split('/').pop();
                const match = /\.(\w+)$/.exec(filename);
                const ext = match ? match[1] : 'jpg';
                const timestamp = Date.now();

                formData.append('photo', {
                    uri: Platform.OS === 'ios' ? photo.uri.replace('file://', '') : photo.uri,
                    name: `photo_${type}_${timestamp}.${ext}`,
                    type: `image/${ext}`
                });

                return uploadHandoverPhoto(formData);
            });

            await Promise.all(uploadPromises);
            
            showToast('Fotoğraflar güncellendi', 'success');
            // Navigate back or allow starting job
            if (navigation.canGoBack()) {
                navigation.goBack();
            } else {
                navigation.navigate('DriverJobDetail', { jobId });
            }
        } catch (error) {
            console.error("Upload error:", error);
            Alert.alert('Hata', 'Fotoğraflar yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            setUploading(false);
        }
    };

    const renderPhotoBox = (type, label) => (
        <TouchableOpacity 
            style={[styles.photoBox, isLocked && { borderStyle: 'solid' }]} 
            onPress={() => isLocked ? openViewer(type) : pickImage(type)}
            activeOpacity={0.7}
        >
            {photos[type] ? (
                <Image source={{ uri: photos[type].uri }} style={styles.photo} />
            ) : (
                <View style={styles.placeholder}>
                    <Ionicons name="camera-outline" size={32} color="#888" />
                    <Text style={styles.placeholderText}>{label}</Text>
                    {isLocked && <Text style={{fontSize:10, color:'#999', marginTop:4}}>(Yok)</Text>}
                </View>
            )}
            
            {/* Edit Badge - Only when unlocked */}
            {photos[type] && !isLocked && (
                <View style={styles.editBadge}>
                    <Ionicons name="pencil" size={14} color="#fff" />
                </View>
            )}

            {/* View Badge - Only when photo exists */}
            {photos[type] && (
                <TouchableOpacity 
                    style={styles.viewBadge}
                    onPress={() => openViewer(type)}
                >
                    <Ionicons name="expand-outline" size={16} color="#fff" />
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity 
                    onPress={() => {
                        if (navigation.canGoBack()) {
                            navigation.goBack();
                        } else {
                            navigation.navigate('DriverJobDetail', { jobId });
                        }
                    }} 
                    style={styles.backBtn}
                >
                    <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {isLocked ? 'Teslim Fotoğrafları' : 'Araç Teslim Formu'}
                </Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.instruction}>
                    {isLocked 
                        ? 'Bu görev tamamlandığı veya iptal edildiği için fotoğraflar sadece görüntülenebilir.' 
                        : 'Yolculuğa başlamadan önce lütfen aracın 4 farklı açıdan fotoğrafını çekiniz.'}
                </Text>

                {!isLocked && (
                    <TouchableOpacity 
                        style={styles.quickUploadBtn} 
                        onPress={handleBatchPick}
                    >
                        <Ionicons name="camera-outline" size={20} color="#fff" />
                        <Text style={styles.quickUploadBtnText}>Fotoğraf Yükle</Text>
                    </TouchableOpacity>
                )}

                <View style={styles.grid}>
                    {renderPhotoBox('front', 'Ön')}
                    {renderPhotoBox('back', 'Arka')}
                    {renderPhotoBox('right', 'Sağ')}
                    {renderPhotoBox('left', 'Sol')}
                </View>

                {!isLocked && (
                    <TouchableOpacity 
                        style={[styles.submitBtn, uploading && styles.disabledBtn]} 
                        onPress={handleUpload}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.submitBtnText}>Onayla</Text>
                                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginLeft: 8 }} />
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </ScrollView>

            {/* Custom Lightbox Modal */}
            <Modal
                visible={isImageViewVisible}
                transparent={true}
                onRequestClose={() => setIsImageViewVisible(false)}
                animationType="fade"
            >
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <View style={styles.lightboxOverlay}>
                        <TouchableOpacity 
                            style={styles.lightboxCloseBtn} 
                            onPress={() => setIsImageViewVisible(false)}
                            hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
                        >
                            <Ionicons name="close" size={32} color="#fff" />
                        </TouchableOpacity>

                        <FlatList
                            ref={galleryFlatListRef}
                            data={getGalleryImages()}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onMomentumScrollEnd={handleMomentumScrollEnd}
                            keyExtractor={(_, index) => index.toString()}
                            getItemLayout={(data, index) => (
                                {length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index}
                            )}
                            renderItem={({ item }) => (
                                <View style={styles.lightboxItemContainer}>
                                    <View style={styles.lightboxImageWrapper}>
                                        <ZoomableImage uri={item.uri} />
                                    </View>
                                </View>
                            )}
                        />

                        <View style={styles.lightboxFooter}>
                            <Text style={styles.lightboxCounter}>
                                {currentImageIndex + 1} / {getGalleryImages().length}
                            </Text>
                        </View>
                    </View>
                </GestureHandlerRootView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerTitle: {
        fontSize: fs(18),
        fontFamily: 'PlusJakartaSans-Bold',
        color: '#1a1a1a',
    },
    backBtn: {
        padding: 4,
    },
    content: {
        padding: ms(20),
    },
    instruction: {
        fontSize: fs(14),
        color: '#666',
        fontFamily: 'PlusJakartaSans-Regular',
        marginBottom: vs(24),
        textAlign: 'center',
    },
    quickUploadBtn: {
        backgroundColor: '#FF9800',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: vs(12),
        borderRadius: ms(12),
        marginBottom: vs(16),
        shadowColor: '#FF9800',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    quickUploadBtnText: {
        color: '#fff',
        fontSize: fs(15),
        fontFamily: 'PlusJakartaSans-Bold',
        marginLeft: ms(8),
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: ms(16),
    },
    photoBox: {
        width: '47%',
        aspectRatio: 1,
        backgroundColor: '#fff',
        borderRadius: ms(12),
        borderWidth: 1,
        borderColor: '#ddd',
        borderStyle: 'dashed',
        overflow: 'hidden',
        marginBottom: vs(16),
    },
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        marginTop: 8,
        color: '#888',
        fontSize: fs(14),
        fontFamily: 'PlusJakartaSans-Medium',
    },
    photo: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    editBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 6,
        borderRadius: 12,
    },
    viewBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 6,
        borderRadius: 12,
        zIndex: 10,
    },
    submitBtn: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: vs(16),
        borderRadius: ms(12),
        marginTop: vs(24),
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    disabledBtn: {
        opacity: 0.7,
    },
    submitBtnText: {
        color: '#fff',
        fontSize: fs(16),
        fontFamily: 'PlusJakartaSans-Bold',
    },
    lightboxOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)', // Slightly transparent background
        justifyContent: 'center',
        alignItems: 'center',
    },
    lightboxCloseBtn: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 30,
        right: 20,
        zIndex: 20,
        padding: 10,
    },
    lightboxItemContainer: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    lightboxImageWrapper: {
        width: '90%', // Makes image smaller (padding effect)
        height: '70%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    lightboxImage: {
        width: '100%',
        height: '100%',
    },
    lightboxFooter: {
        position: 'absolute',
        bottom: 50,
        width: '100%',
        alignItems: 'center',
    },
    lightboxCounter: {
        color: '#fff',
        fontSize: fs(16),
        fontFamily: 'PlusJakartaSans-Medium',
    }
});