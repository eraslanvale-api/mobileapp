import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Linking, Platform, Dimensions, StatusBar, ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useJobs } from '../../context/JobContext';
import { useAuth } from '../../context/AuthContext';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { s, vs, ms, fs } from '../../utils/scale';
import { useToast } from '../../context/ToastContext';
import { useConfig } from '../../context/ConfigContext';
import polyline from '@mapbox/polyline';
import Constants from 'expo-constants';
import BottomSheet, { BottomSheetScrollView, BottomSheetFooter } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');

export default function DriverJobDetailScreen({ route, navigation }) {
    const { jobId } = route.params;
    const { getJobById, acceptJob, startJourney, startJob, completeJob } = useJobs();
    const { user } = useAuth();
    const { showToast } = useToast();
    const { config } = useConfig();
    const mapRef = useRef(null);
    const fitTimerRef = useRef(null);

    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState(null); // 'ACCEPT', 'ON_WAY', 'START_JOB', 'COMPLETE'
    const [routeCoordinates, setRouteCoordinates] = useState([]);
    const [loadingRoute, setLoadingRoute] = useState(false);
    const [loadingAction, setLoadingAction] = useState(false);

    const job = getJobById(jobId);

    // Helper to parse coordinates
    const getCoords = (locObj, latField, lngField) => {
        if (locObj && locObj.lat && locObj.lng) return { latitude: parseFloat(locObj.lat), longitude: parseFloat(locObj.lng) };
        if (locObj && locObj.latitude && locObj.longitude) return { latitude: parseFloat(locObj.latitude), longitude: parseFloat(locObj.longitude) };
        if (latField && lngField) return { latitude: parseFloat(latField), longitude: parseFloat(lngField) };
        return null;
    };

    const pickupCoords = job ? (getCoords(job.pickupLoc || job.pickupLocation, job.lat, job.lng) || { latitude: 41.0082, longitude: 28.9784 }) : { latitude: 41.0082, longitude: 28.9784 };
    const dropoffCoords = job ? getCoords(job.dropoffLoc || job.dropoffLocation, null, null) : null;
    const stops = job && Array.isArray(job.stops) ? job.stops : [];

    // Fetch route from Google Directions API
    const fetchDirections = async (signal) => {
        if (!pickupCoords || !dropoffCoords) return;

        setLoadingRoute(true);
        try {
            const apiKey = Platform.OS === 'ios'
                ? config?.googleMapsApiKeyIos || Constants.expoConfig?.extra?.googleMapsApiKeyIos
                : config?.googleMapsApiKeyAndroid || Constants.expoConfig?.extra?.googleMapsApiKeyAndroid;

            if (!apiKey) {
                console.warn('API Key is missing for platform:', Platform.OS);
                // Fallback to straight line
                if (!signal?.aborted) {
                    setRouteCoordinates([pickupCoords, dropoffCoords]);
                    setLoadingRoute(false);
                }
                return;
            }

            // Build waypoints for Routes API
            const intermediates = stops.map(stop => ({
                location: {
                    latLng: {
                        latitude: parseFloat(stop.lat || stop.latitude),
                        longitude: parseFloat(stop.lng || stop.longitude)
                    }
                }
            }));

            const body = {
                origin: {
                    location: {
                        latLng: {
                            latitude: pickupCoords.latitude,
                            longitude: pickupCoords.longitude
                        }
                    }
                },
                destination: {
                    location: {
                        latLng: {
                            latitude: dropoffCoords.latitude,
                            longitude: dropoffCoords.longitude
                        }
                    }
                },
                intermediates: intermediates,
                travelMode: 'DRIVE',
                routingPreference: 'TRAFFIC_AWARE',
                computeAlternativeRoutes: false,
                languageCode: 'tr-TR',
                units: 'METRIC'
            };

            const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask': 'routes.polyline.encodedPolyline'
                },
                body: JSON.stringify(body),
                signal: signal
            });

            if (signal?.aborted) return;

            const data = await response.json();

            if (data.error) {
                console.error('Routes API Error:', data.error);
                
                // Show user-friendly error for invalid coordinates
                if (data.error.code === 400 && data.error.status === 'INVALID_ARGUMENT') {
                    showToast('Rota hesaplanamadı: Konum koordinatları geçersiz.', 'error');
                }

                // Fallback
                if (!signal?.aborted) {
                    setRouteCoordinates([pickupCoords, dropoffCoords]);
                }
            } else if (data.routes && data.routes.length > 0) {
                const encodedPolyline = data.routes[0].polyline.encodedPolyline;
                const points = polyline.decode(encodedPolyline);
                const coords = points.map(point => ({
                    latitude: point[0],
                    longitude: point[1]
                }));
                if (!signal?.aborted) {
                    setRouteCoordinates(coords);
                }
            } else {
                if (!signal?.aborted) {
                    setRouteCoordinates([pickupCoords, dropoffCoords]);
                }
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error('Directions API error:', error);
            if (!signal?.aborted) {
                setRouteCoordinates([pickupCoords, dropoffCoords]);
            }
        } finally {
            if (!signal?.aborted) {
                setLoadingRoute(false);
            }
        }
    };

    // Fetch directions on mount
    useEffect(() => {
        if (job) {
            const controller = new AbortController();
            fetchDirections(controller.signal);
            return () => controller.abort();
        }
    }, [pickupCoords.latitude, pickupCoords.longitude, dropoffCoords?.latitude, dropoffCoords?.longitude, JSON.stringify(stops)]);

    // Fit map to markers/route
    useEffect(() => {
        if (mapRef.current) {
            const coordsToFit = routeCoordinates.length > 0 ? routeCoordinates : [pickupCoords, dropoffCoords].filter(Boolean);

            if (coordsToFit.length > 0) {
                if (fitTimerRef.current) clearTimeout(fitTimerRef.current);

                fitTimerRef.current = setTimeout(() => {
                    if (mapRef.current) {
                        try {
                            mapRef.current.fitToCoordinates(coordsToFit, {
                                edgePadding: { top: ms(60), right: ms(40), bottom: ms(40), left: ms(40) },
                                animated: true,
                            });
                        } catch (e) {
                            console.warn('fitToCoordinates error:', e);
                        }
                    }
                }, 500);
            }
        }
        return () => {
            if (fitTimerRef.current) clearTimeout(fitTimerRef.current);
        };
    }, [routeCoordinates]);

    const getStatusLabel = (s) => {
        if (!s) return '';
        const lower = String(s).toLowerCase();
        const map = {
            'pending': 'Bekliyor',
            'searching': 'Sürücü Aranıyor',
            'scheduled': 'Planlandı',
            'active': 'Aktif',
            'accepted': 'Kabul Edildi',
            'assigned': 'Atandı',
            'on_way': 'Yolda',
            'in_progress': 'Sürüşte',
            'completed': 'Tamamlandı',
            'cancelled': 'İptal Edildi'
        };
        return map[lower] || s;
    };

    const getStatusColor = (s) => {
        const lower = String(s || '').toLowerCase();
        if (['active', 'confirmed', 'pending', 'searching', 'scheduled', 'assigned', 'on_way', 'on-way', 'in_progress'].includes(lower)) return '#f4a119';
        if (lower === 'completed') return '#10b981';
        if (lower === 'cancelled' || lower === 'iptal edildi') return '#ef4444';
        return '#888';
    };

    // Backend status values are typically lowercase
    const status = job?.status;
    const statusColor = getStatusColor(status);
    const isPending = ['pending', 'searching', 'scheduled', 'assigned'].includes(status);
    const isAccepted = status === 'accepted';
    const isOnWay = status === 'on_way';
    const isInProgress = status === 'in_progress';
    const isCompleted = status === 'completed';
    const isCancelled = status === 'cancelled';

    const pickupAddress = job?.pickup || job?.pickupLocation?.address || 'Başlangıç noktası';
    const dropoffAddress = job?.dropoff || job?.dropoffLocation?.address || 'Varış noktası';

    const openModal = (type) => {
        setModalType(type);
        setModalVisible(true);
    };

    const handleAction = async () => {
        if (!job) return;
        
        setLoadingAction(true);
        try {
            if (modalType === 'ACCEPT') {
                const success = await acceptJob(job.id);
                if (success) {
                    showToast('İş başarıyla kabul edildi', 'success');
                    // navigation.goBack(); // Kalabiliriz, durumu değişecek
                } else {
                    showToast('İş kabul edilirken hata oluştu', 'error');
                }
            } else if (modalType === 'ON_WAY') {
                const success = await startJourney(job.id);
                if (success) {
                    showToast('Müşteriye doğru yola çıktınız', 'success');
                } else {
                    showToast('İşlem sırasında hata oluştu', 'error');
                }
            } else if (modalType === 'START_JOB') {
                const success = await startJob(job.id);
                if (success) {
                    showToast('Sürüş başladı', 'success');
                } else {
                    showToast('Sürüş başlatılırken hata oluştu', 'error');
                }
            } else if (modalType === 'COMPLETE') {
                const success = await completeJob(job.id);
                if (success) {
                    showToast('Görev tamamlandı', 'success');
                    if (navigation.canGoBack()) {
                        navigation.goBack();
                    } else {
                        navigation.navigate('HomeTab');
                    }
                } else {
                    showToast('Görev tamamlanırken hata oluştu', 'error');
                }
            }
        } catch (error) {
            console.error('Action error:', error);
            showToast('Bir hata oluştu', 'error');
        } finally {
            setLoadingAction(false);
            setModalVisible(false);
        }
    };

    const openNavigation = () => {
        const label = pickupAddress;
        const lat = pickupCoords.latitude;
        const lng = pickupCoords.longitude;
        const url = Platform.select({
            ios: `maps:0,0?q=${label}@${lat},${lng}`,
            android: `geo:0,0?q=${lat},${lng}(${label})`
        });
        Linking.openURL(url);
    };

    // Format Date & Time
    const jobDate = job?.created_at || job?.createdAt || job?.pickupTime || job?.date;
    const dateObj = jobDate ? new Date(jobDate) : new Date();
    const timeStr = job?.time || dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    // Distance & Duration (Mock or Real)
    const distanceVal = job?.distanceKm || job?.distance || '--';
    const durationVal = job?.duration || '-- dk';

    // Bottom Sheet Config
    const bottomSheetRef = useRef(null);
    const snapPoints = useMemo(() => ['55%', '90%'], []);

    const renderFooter = useCallback(
        (props) => (
            <BottomSheetFooter {...props} bottomInset={0}>
                <View style={styles.footer}>

                    {/* İlk Durum: İş henüz alınmadıysa "Yola Çıktım" butonu göster */}
                    {(isPending || isAccepted) && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#FF9800' }]}
                            onPress={() => openModal('ACCEPT')}
                        >
                            <Text style={styles.actionBtnText}>Yola Çıktım</Text>
                            <Ionicons name="navigate-outline" size={ms(20)} color="#FFF" style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                    )}

                    {/* İkinci Durum: Yoldaysa -> Sürüşü Başlat */}
                    {isOnWay && (
                        <View style={{ width: '100%', alignItems: 'center' }}>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: Colors.primary, marginTop: 0, width: '100%' }]}
                                onPress={() => openModal('START_JOB')}
                            >
                                <Text style={styles.actionBtnText}>Sürüşü Başlat</Text>
                                <Ionicons name="car-sport-outline" size={ms(20)} color="#FFF" style={{ marginLeft: 8 }} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Üçüncü Durum: Sürüşteyse -> Tamamla */}
                    {isInProgress && (
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.completeBtn]}
                            onPress={() => openModal('COMPLETE')}
                        >
                            <Text style={styles.actionBtnText}>Tamamla</Text>
                            <Ionicons name="flag-outline" size={ms(20)} color="#FFF" style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                    )}
                </View>
            </BottomSheetFooter>
        ),
        [isPending, isAccepted, isOnWay, isInProgress]
    );

    if (!job) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: 'black' }}>İş detayları bulunamadı.</Text>
                <TouchableOpacity 
                    onPress={() => {
                        if (navigation.canGoBack()) {
                            navigation.goBack();
                        } else {
                            navigation.navigate('HomeTab');
                        }
                    }}
                    style={{ marginTop: 20, padding: 10, backgroundColor: 'white', borderRadius: 8 }}
                >
                    <Text>Geri Dön</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

                {/* Header */}
                <View style={[styles.header]}>
                    <TouchableOpacity 
                        onPress={() => {
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            } else {
                                navigation.navigate('HomeTab');
                            }
                        }}
                        style={styles.headerBackBtn}
                    >
                        <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Sürücü Görev Detayı</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Map Header */}
                <View style={styles.mapContainer}>
                    <MapView
                        ref={mapRef}
                        provider={PROVIDER_GOOGLE}
                        style={styles.map}
                        initialRegion={{
                            latitude: pickupCoords.latitude,
                            longitude: pickupCoords.longitude,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                        }}
                    >
                        {/* Pickup Marker */}
                        <Marker
                            coordinate={pickupCoords}
                            pinColor="#10b981"
                            title="Alış Noktası"
                            description={pickupAddress}
                        />

                        {/* Stop Markers */}
                        {stops.map((stop, index) => {
                            const lat = parseFloat(stop.lat || stop.latitude);
                            const lng = parseFloat(stop.lng || stop.longitude);
                            if (!lat || !lng) return null;

                            return (
                                <Marker
                                    key={`stop-${index}`}
                                    coordinate={{ latitude: lat, longitude: lng }}
                                    pinColor="#f4a119"
                                    title={`${index + 1}. Durak`}
                                    description={stop.address}
                                />
                            );
                        })}

                        {/* Dropoff Marker */}
                        {dropoffCoords && (
                            <Marker
                                coordinate={dropoffCoords}
                                pinColor="#ef4444"
                                title="Varış Noktası"
                                description={dropoffAddress}
                            />
                        )}

                        {/* Route Line */}
                        {!loadingRoute && dropoffCoords && (
                            <Polyline
                                coordinates={routeCoordinates.length > 0 ? routeCoordinates : [pickupCoords, dropoffCoords]}
                                strokeColor="#f4a119"
                                strokeWidth={5}
                            />
                        )}
                    </MapView>

                    {/* Loading Indicator */}
                    {loadingRoute && (
                        <View style={[styles.loadingOverlay, { flexDirection: 'row', alignItems: 'center' }]}>
                            <ActivityIndicator size="small" color={Colors.primary} />
                            <Text style={{ marginLeft: 8, fontSize: 12, color: '#333' }}>Rota Hesaplanıyor...</Text>
                        </View>
                    )}
                </View>

                {/* Bottom Sheet */}
                <BottomSheet
                    ref={bottomSheetRef}
                    index={0}
                    snapPoints={snapPoints}
                    footerComponent={renderFooter}
                >
                    <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
                        <View style={[styles.headerRow, { alignItems: 'center' }]}>
                            <Text style={[styles.customerName, { marginBottom: 0, flex: 1 }]}>{job.customerName || 'Müşteri İsmi Yok'}</Text>
                            <View style={[styles.statusChip, { borderColor: statusColor, backgroundColor: statusColor + '15', marginTop: 0, marginLeft: 10 }]}>
                                <Text style={[styles.statusChipText, { color: statusColor }]}>
                                    {job.statusLabel || getStatusLabel(job.status)}
                                </Text>
                            </View>
                        </View>

                        {/* ACCEPTED Banner */}
                        {isAccepted && (
                            <View style={{
                                marginTop: 16,
                                backgroundColor: '#E8F5E9',
                                padding: 12,
                                borderRadius: 8,
                                borderLeftWidth: 4,
                                borderLeftColor: '#4CAF50',
                                flexDirection: 'row',
                                alignItems: 'center'
                            }}>
                                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                                <View style={{ marginLeft: 10 }}>
                                    <Text style={{ fontWeight: 'bold', color: '#2E7D32', fontSize: 15 }}>Görev Kabul Edildi</Text>
                                    <Text style={{ color: '#43A047', fontSize: 12 }}>Şimdi müşteriye doğru yola çıkabilirsiniz.</Text>
                                </View>
                            </View>
                        )}

                        <View style={styles.divider} />

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>ROTA BİLGİSİ</Text>

                            <View style={styles.routeInfo}>
                                <View style={styles.routeItem}>
                                    <View style={[styles.routeDot, { borderColor: '#10b981', backgroundColor: '#10b981' }]} />
                                    <View style={styles.routeTextContainer}>
                                        <Text style={styles.addrLabel}>Alış Noktası</Text>
                                        <Text style={styles.addressText}>{pickupAddress}</Text>
                                    </View>
                                </View>

                                {stops.map((stop, index) => (
                                    <View key={`stop-detail-${index}`} style={styles.routeItem}>
                                        <View style={styles.routeLine} />
                                        <View style={[styles.routeDot, { borderColor: '#f4a119', backgroundColor: '#f4a119' }]} />
                                        <View style={styles.routeTextContainer}>
                                            <Text style={styles.addrLabel}>{index + 1}. Durak</Text>
                                            <Text style={styles.addressText}>{stop.address || '—'}</Text>
                                        </View>
                                    </View>
                                ))}

                                <View style={styles.routeItem}>
                                    <View style={styles.routeLine} />
                                    <View style={[styles.routeDot, { borderColor: '#ef4444', backgroundColor: '#ef4444' }]} />
                                    <View style={styles.routeTextContainer}>
                                        <Text style={styles.addrLabel}>Varış Noktası</Text>
                                        <Text style={styles.addressText}>{dropoffAddress || '—'}</Text>
                                    </View>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.navButton}
                                onPress={openNavigation}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="map-outline" size={ms(18)} color={Colors.primary} />
                                <Text style={styles.navButtonText}>Navigasyonu Başlat</Text>
                            </TouchableOpacity>

                            {/* Araç Teslim Formu Linki */}
                            {job && !isCancelled && (
                                <TouchableOpacity
                                    onPress={() => navigation.navigate('VehicleHandover', { jobId: job.id, isReadOnly: isCompleted })}
                                    style={styles.handoverButton}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="camera-outline" size={ms(18)} color={Colors.primary} />
                                    <Text style={styles.handoverButtonText}>
                                        {isCompleted ? 'Araç Teslim Fotoğrafları' : 'Araç Teslim Formu'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>DETAYLAR</Text>
                            <View style={styles.detailRow}>
                                <View style={styles.detailItem}>
                                    <Ionicons name="calendar-outline" size={ms(20)} color="#666" />
                                    <Text style={styles.detailLabel}>Tarih</Text>
                                    <Text style={styles.detailValue}>
                                        {dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                    </Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Ionicons name="time-outline" size={ms(20)} color="#666" />
                                    <Text style={styles.detailLabel}>Saat</Text>
                                    <Text style={styles.detailValue}>
                                        {timeStr}
                                    </Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Ionicons name="car-sport-outline" size={ms(20)} color="#666" />
                                    <Text style={styles.detailLabel}>Mesafe</Text>
                                    <Text style={styles.detailValue}>{distanceVal} km</Text>
                                </View>
                            </View>
                        </View>
                    </BottomSheetScrollView>
                </BottomSheet>

                {/* Custom Modal */}
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={[styles.modalIcon, { backgroundColor: modalType === 'ACCEPT' ? '#E3F2FD' : '#E8F5E9' }]}>
                                <Ionicons
                                    name={modalType === 'ACCEPT' ? "briefcase" : "checkmark-done"}
                                    size={ms(32)}
                                    color={modalType === 'ACCEPT' ? Colors.primary : '#4CAF50'}
                                />
                            </View>

                            <Text style={styles.modalTitle}>
                                {modalType === 'ACCEPT' ? 'Kabul Et' : 'Tamamla'}
                            </Text>

                            <Text style={styles.modalText}>
                                {modalType === 'ACCEPT'
                                    ? 'Müşteriye doğru yola çıkmak üzeresiniz. Onaylıyor musunuz?'
                                    : 'Hizmeti başarıyla tamamladığınızı onaylıyor musunuz?'}
                            </Text>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.cancelBtn]}
                                    onPress={() => setModalVisible(false)}
                                    disabled={loadingAction}
                                >
                                    <Text style={styles.cancelBtnText}>Vazgeç</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.modalBtn,
                                        modalType === 'ACCEPT' ? styles.acceptBtn : styles.completeBtn,
                                        loadingAction && styles.disabledBtn
                                    ]}
                                    onPress={handleAction}
                                    disabled={loadingAction}
                                >
                                    {loadingAction ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Text style={styles.confirmBtnText}>
                                            {modalType === 'ACCEPT' ? 'Yola Çıktım' : 'Tamamla'}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
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
        zIndex: 10,
    },
    headerBackBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a1a1a',
        fontFamily: 'PlusJakartaSans-Bold',
    },
    mapContainer: {
        height: height * 0.45,
        width: '100%',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    // Removed mapOverlay
    loadingOverlay: {
        position: 'absolute',
        top: ms(20),
        alignSelf: 'center',
        backgroundColor: 'white',
        paddingHorizontal: ms(16),
        paddingVertical: ms(10),
        borderRadius: ms(20),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
        zIndex: 20,
    },
    // Removed backBtn
    markerContainer: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    scrollContent: {
        paddingBottom: ms(100),
        paddingHorizontal: ms(24),
        paddingTop: ms(12),
    },
    disabledBtn: {
        opacity: 0.7,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    customerName: {
        fontSize: fs(22),
        fontFamily: 'PlusJakartaSans-Bold',
        color: '#1A1A1A',
        marginBottom: ms(4),
    },
    statusChip: {
        borderWidth: 1,
        borderRadius: ms(8),
        paddingVertical: vs(4),
        paddingHorizontal: s(10),
        alignSelf: 'flex-start',
        marginTop: ms(4),
    },
    statusChipText: {
        fontSize: fs(11),
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginVertical: ms(20),
    },
    section: {
        marginBottom: ms(5),
    },
    sectionTitle: {
        fontSize: fs(12),
        fontFamily: 'PlusJakartaSans-Bold',
        color: '#999',
        letterSpacing: 1,
        marginBottom: ms(12),
    },
    routeInfo: {
        marginBottom: vs(10),
    },
    routeItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: vs(16),
        position: 'relative',
    },
    routeDot: {
        width: s(12),
        height: s(12),
        borderRadius: s(6),
        marginTop: vs(4),
        zIndex: 2,
    },
    routeLine: {
        position: 'absolute',
        left: s(5),
        top: -vs(16),
        width: 2,
        height: vs(20),
        backgroundColor: '#e0e0e0',
        zIndex: 1,
    },
    routeTextContainer: {
        marginLeft: s(12),
        flex: 1,
    },
    addressText: {
        fontSize: fs(14),
        fontFamily: 'PlusJakartaSans-Medium',
        color: '#333',
        lineHeight: ms(20),
    },
    navButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: Colors.primary,
        paddingVertical: ms(10),
        borderRadius: ms(12),
    },
    navButtonText: {
        marginLeft: ms(8),
        color: Colors.primary,
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: fs(14),
    },
    handoverButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: Colors.primary,
        borderStyle: 'dashed',
        paddingVertical: ms(10),
        borderRadius: ms(12),
        marginTop: ms(12),
    },
    handoverButtonText: {
        marginLeft: ms(8),
        color: Colors.primary,
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: fs(14),
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#F9FAFB',
        padding: ms(16),
        borderRadius: ms(16),
    },
    detailItem: {
        alignItems: 'center',
        flex: 1,
    },
    detailLabel: {
        marginTop: ms(8),
        fontSize: fs(12),
        color: '#888',
        fontFamily: 'PlusJakartaSans-Medium',
    },
    detailValue: {
        marginTop: ms(4),
        fontSize: fs(14),
        color: '#333',
        fontFamily: 'PlusJakartaSans-Bold',
    },
    footer: {
        backgroundColor: '#FFF',
        paddingHorizontal: ms(24),
        paddingVertical: ms(20),
        borderTopWidth: 1,
        borderTopColor: '#F5F5F5',
    },
    actionBtn: {
        flexDirection: 'row',
        height: ms(54),
        borderRadius: ms(16),
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    acceptBtn: {
        backgroundColor: Colors.primary,
    },
    completeBtn: {
        backgroundColor: '#4CAF50',
    },
    actionBtnText: {
        fontSize: fs(16),
        fontFamily: 'PlusJakartaSans-Bold',
        color: '#FFF',
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: ms(24),
    },
    modalContent: {
        width: '100%',
        backgroundColor: '#FFF',
        borderRadius: ms(24),
        padding: ms(24),
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    modalIcon: {
        width: ms(60),
        height: ms(60),
        borderRadius: ms(30),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: ms(16),
    },
    modalTitle: {
        fontSize: fs(20),
        fontFamily: 'PlusJakartaSans-Bold',
        color: '#1A1A1A',
        marginBottom: ms(8),
        textAlign: 'center',
    },
    modalText: {
        fontSize: fs(14),
        fontFamily: 'PlusJakartaSans-Regular',
        color: '#666',
        textAlign: 'center',
        marginBottom: ms(24),
        lineHeight: ms(20),
    },
    modalButtons: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
    },
    modalBtn: {
        flex: 1,
        height: ms(48),
        borderRadius: ms(14),
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelBtn: {
        backgroundColor: '#F5F5F5',
        marginRight: ms(12),
    },
    cancelBtnText: {
        fontSize: fs(14),
        fontFamily: 'PlusJakartaSans-Bold',
        color: '#666',
    },
    confirmBtnText: {
        fontSize: fs(14),
        fontFamily: 'PlusJakartaSans-Bold',
        color: '#FFF',
    },
});
