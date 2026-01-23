import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, Platform, Linking, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import polyline from '@mapbox/polyline';
import { s, vs, fs, ms } from '../../utils/scale';
import { useConfig } from '../../context/ConfigContext';
import Constants from 'expo-constants';
import { computeRoutes } from '../../api/googleMaps';
import { cancelReservation, getReservation } from '../../api/endpoints';
import { Colors } from '../../constants/Colors';

const { width, height } = Dimensions.get('window');

export default function ReservationDetailScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const mapRef = useRef(null);
    const { config } = useConfig();
    const [reservation, setReservation] = useState(route.params?.reservation || {});
    const [routeCoordinates, setRouteCoordinates] = useState([]);
    const [loadingRoute, setLoadingRoute] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const loadDetails = async () => {
        if (!reservation?.id) return;
        try {
            setLoadingDetails(true);
            const res = await getReservation(reservation.id);
            if (res.data) {
                setReservation(res.data);
            }
        } catch (error) {
            console.log('Error fetching reservation details:', error);
        } finally {
            setLoadingDetails(false);
        }
    };

    useEffect(() => {
        loadDetails();
    }, []);

    const serviceName = reservation?.serviceName || reservation?.service?.name || 'Rezervasyon';
    const status = reservation?.status || reservation?.state || '';
    const from = reservation?.pickup || reservation?.pickup?.address || reservation?.start_address || reservation?.from || '';
    const to = reservation?.dropoff || reservation?.dropoff?.address || reservation?.end_address || reservation?.to || '';
    const price = reservation?.price ?? reservation?.total ?? reservation?.amount ?? null;
    const stops = Array.isArray(reservation?.stops) ? reservation.stops : [];
    const pickupLoc = reservation?.pickupLoc || { lat: 38.4329, lng: 27.1355 };
    const dropoffLoc = reservation?.dropoffLoc || { lat: 38.2902, lng: 27.1487 };
    const distanceKm = reservation?.distanceKm || '0';

    // Date formatting
    const rawDate = reservation?.pickupTime || reservation?.pickupAt || reservation?.pickup_at || reservation?.date || reservation?.created_at;
    const dateObj = rawDate ? new Date(rawDate) : null;

    const dateStr = dateObj && !isNaN(dateObj)
        ? dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : reservation?.dateLabel
            ? `${reservation.dateLabel}${reservation?.time ? ' • ' + reservation.time : ''}`
            : '';

    const getStatusLabel = (s) => {
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

    const statusLabel = reservation.statusLabel || getStatusLabel(status);

    const getStatusColor = (s) => {
        const lower = String(s).toLowerCase();
        if (['active', 'confirmed', 'pending', 'searching', 'scheduled', 'assigned', 'on_way', 'on-way', 'in_progress'].includes(lower)) return '#f4a119';
        if (lower === 'completed') return '#10b981';
        if (lower === 'cancelled' || lower === 'iptal edildi') return '#ef4444';
        return '#888';
    };

    const statusColor = getStatusColor(status);

    const getPaymentLabel = (method) => {
        if (!method) return null;
        const lower = String(method).toLowerCase();
        // Backend 'cash' veya 'nakit' dönerse 'Nakit' göster
        if (lower === 'cash' || lower === 'nakit') return 'Nakit';
        // Kredi kartı ise gösterme (kullanıcı isteği)
        if (lower.includes('credit') || lower.includes('card') || lower.includes('kredi') || lower.includes('kart')) return null;
        return method;
    };

    const paymentLabel = getPaymentLabel(reservation?.paymentMethod);

    // Fetch route from Google Directions API
    const fetchDirections = async () => {
        setLoadingRoute(true);
        try {
            const apiKey = Platform.OS === 'ios'
                ? config?.googleMapsApiKeyIos || Constants.expoConfig?.extra?.googleMapsApiKeyIos
                : config?.googleMapsApiKeyAndroid || Constants.expoConfig?.extra?.googleMapsApiKeyAndroid;

            if (!apiKey) {
                // console.error('API Key is missing for platform:', Platform.OS);
                setLoadingRoute(false);
                return;
            }

            // Build waypoints for Routes API
            const intermediates = stops.map(stop => `${stop.lat},${stop.lng}`);

            const data = await computeRoutes({
                origin: `${pickupLoc.lat},${pickupLoc.lng}`,
                destination: `${dropoffLoc.lat},${dropoffLoc.lng}`,
                waypoints: intermediates,
                apiKey
            });

            if (data.routes && data.routes.length > 0) {
                const encodedPolyline = data.routes[0].polyline.encodedPolyline;
                const points = polyline.decode(encodedPolyline);
                const coords = points.map(point => ({
                    latitude: point[0],
                    longitude: point[1]
                }));
                setRouteCoordinates(coords);
            } else {
                // Fallback to straight lines if API fails
                const fallbackCoords = [
                    { latitude: pickupLoc.lat, longitude: pickupLoc.lng },
                    ...stops.map(stop => ({ latitude: stop.lat, longitude: stop.lng })),
                    { latitude: dropoffLoc.lat, longitude: dropoffLoc.lng }
                ];
                setRouteCoordinates(fallbackCoords);
            }
        } catch (error) {
            // console.error('Directions API error:', error);
            // Fallback to straight lines
            const fallbackCoords = [
                { latitude: pickupLoc.lat, longitude: pickupLoc.lng },
                ...stops.map(stop => ({ latitude: stop.lat, longitude: stop.lng })),
                { latitude: dropoffLoc.lat, longitude: dropoffLoc.lng }
            ];
            setRouteCoordinates(fallbackCoords);
        } finally {
            setLoadingRoute(false);
        }
    };

    useEffect(() => {
        fetchDirections();
    }, []);

    useEffect(() => {
        // Fit map to show all markers
        if (mapRef.current && routeCoordinates.length > 0 && !loadingRoute) {
            setTimeout(() => {
                mapRef.current.fitToCoordinates(routeCoordinates, {
                    edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                    animated: true,
                });
            }, 500);
        }
    }, [routeCoordinates, loadingRoute]);

    const handleCancel = () => {
        // 1 saat kontrolü
        if (dateObj) {
            const now = new Date();
            const diffMs = dateObj - now;
            const diffHours = diffMs / (1000 * 60 * 60);

            if (diffHours <= 1) {
                Alert.alert(
                    'İptal Edilemez',
                    'Rezervasyona 1 saat kala iptal edilemez. Lütfen çağrı merkezi ile iletişime geçin.',
                    [{ text: 'Tamam', style: 'default' }]
                );
                return;
            }
        }

        Alert.alert(
            'Rezervasyonu İptal Et',
            'Bu rezervasyonu iptal etmek istediğinize emin misiniz?',
            [
                { text: 'Vazgeç', style: 'cancel' },
                {
                    text: 'Evet, İptal Et',
                    style: 'destructive',
                    onPress: async () => {
                        setCancelling(true);
                        try {
                            await cancelReservation(reservation.id);
                            Alert.alert('Başarılı', 'Rezervasyonunuz iptal edildi.');
                            navigation.goBack();
                        } catch (error) {
                            console.log('Cancel error:', error);
                            // Fallback to delete if cancel fails or returns 404 (optional, depending on API)
                            Alert.alert('Hata', 'İptal işlemi sırasında bir hata oluştu.');
                        } finally {
                            setCancelling(false);
                        }
                    }
                }
            ]
        );
    };

    const canCancel = ['pending', 'searching', 'scheduled', 'assigned', 'accepted', 'on_way', 'active', 'confirmed'].includes(String(status).toLowerCase());

    // Araç bilgilerini belirle
    const getVehicleInfo = () => {
        // 1. Siparişe özel atanmış araç bilgisi (vehicle_details)
        if (reservation?.vehicle_details) {
            const { plate, brand, model, color } = reservation.vehicle_details;
            return {
                plate: plate || 'Plaka Yok',
                desc: `${brand || ''} ${model || ''} ${color ? '(' + color + ')' : ''}`.trim() || 'Araç Bilgisi Yok'
            };
        }

        // 2. Sürücünün varsayılan aracı (driver objesi içinde)
        if (reservation?.driver) {
            const plate = reservation.driver.vehicle_plate || reservation.driver.plate;
            const model = reservation.driver.vehicle_model;
            return {
                plate: plate || 'Plaka Yok',
                desc: model || 'Araç Bilgisi Yok'
            };
        }

        return { plate: 'Plaka Yok', desc: 'Araç Bilgisi Yok' };
    };

    const vehicleInfo = getVehicleInfo();

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Rezervasyon Detayı</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={
                    <RefreshControl refreshing={loadingDetails} onRefresh={loadDetails} colors={['#f4a119']} />
                }
            >
                {/* Map */}
                <View style={styles.mapContainer}>
                    <MapView
                        ref={mapRef}
                        provider={PROVIDER_GOOGLE}
                        style={styles.map}
                        initialRegion={{
                            latitude: pickupLoc.lat,
                            longitude: pickupLoc.lng,
                            latitudeDelta: 0.1,
                            longitudeDelta: 0.1,
                        }}
                    >
                        {/* Pickup Marker */}
                        <Marker
                            coordinate={{ latitude: pickupLoc.lat, longitude: pickupLoc.lng }}
                            pinColor="#10b981"
                            title="Alış Noktası"
                            description={from}
                        />

                        {/* Stop Markers */}
                        {stops.map((stop, index) => (
                            <Marker
                                key={`stop-${index}`}
                                coordinate={{ latitude: stop.lat, longitude: stop.lng }}
                                pinColor="#f4a119"
                                title={`${index + 1}. Durak`}
                                description={stop.address}
                            />
                        ))}

                        {/* Dropoff Marker */}
                        <Marker
                            coordinate={{ latitude: dropoffLoc.lat, longitude: dropoffLoc.lng }}
                            pinColor="#ef4444"
                            title="Varış Noktası"
                            description={to}
                        />

                        {/* Route Polyline */}
                        {routeCoordinates.length > 0 && (
                            <Polyline
                                coordinates={routeCoordinates}
                                strokeColor="#f4a119"
                                strokeWidth={5}
                            />
                        )}
                    </MapView>
                    {loadingRoute && (
                        <View style={styles.mapLoading}>
                            <ActivityIndicator size="large" color="#f4a119" />
                        </View>
                    )}
                </View>

                {/* Driver Info Removed */}

                {/* Emergency Button Removed (Moved to Header) */}


                {/* Details Card */}
                <View style={styles.detailsCard}>
                    {/* Service & Status */}
                    <View style={styles.cardHeader}>
                        <View style={styles.serviceRow}>
                            <View style={styles.serviceIcon}>
                                <Ionicons name="car-sport" size={20} color="#f4a119" />
                            </View>
                            <Text style={styles.serviceName}>{serviceName}</Text>
                        </View>
                        {!!status && (
                            <View style={[styles.statusChip, { borderColor: statusColor, backgroundColor: statusColor + '15' }]}>
                                <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                            </View>
                        )}
                    </View>

                    {/* Driver Info */}
                    <View style={styles.driverSection}>
                        <Text style={styles.sectionTitle}>Sürücü Bilgileri</Text>
                        {reservation?.driver ? (
                            <View style={styles.driverCard}>
                                <View style={styles.driverInfo}>
                                    <Text style={styles.driverName}>
                                        {reservation.driver.full_name || `${reservation.driver.name || ''} ${reservation.driver.surname || ''}`}
                                    </Text>
                                    <Text style={styles.driverVehicle}>
                                        {vehicleInfo.desc}
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.noDriverCard}>
                                <View style={styles.noDriverIcon}>
                                    <Ionicons name={status === 'cancelled' ? "close-circle-outline" : "time-outline"} size={24} color={status === 'cancelled' ? "#ef4444" : "#f4a119"} />
                                </View>
                                <View style={styles.noDriverInfo}>
                                    <Text style={styles.noDriverTitle}>
                                        {status === 'cancelled' ? 'İptal Edildi' : 'Sürücü Atanmadı'}
                                    </Text>
                                    <Text style={styles.noDriverText}>
                                        {status === 'cancelled'
                                            ? 'Bu rezervasyon için sürücü ataması yapılmayacak.'
                                            : 'Sürücü ataması yapıldığında bilgiler burada görünecek.'}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Route Info */}
                    <View style={styles.routeInfo}>
                        <View style={styles.routeItem}>
                            <View style={styles.routeLine} />
                            <View style={[styles.routeDot, { borderColor: '#10b981', backgroundColor: '#10b981' }]} />
                            <View style={styles.routeTextContainer}>
                                <Text style={styles.routeLabel}>Başlangıç Noktası</Text>
                                <Text style={styles.routeAddress}>{from || '—'}</Text>
                            </View>
                        </View>

                        {stops.map((stop, index) => (
                            <View key={`stop-detail-${index}`} style={styles.routeItem}>
                                <View style={styles.routeLine} />
                                <View style={[styles.routeDot, { borderColor: '#f4a119', backgroundColor: '#f4a119' }]} />
                                <View style={styles.routeTextContainer}>
                                    <Text style={styles.routeLabel}>{index + 1}. Durak</Text>
                                    <Text style={styles.routeAddress}>{stop.address || '—'}</Text>
                                </View>
                            </View>
                        ))}

                        <View style={styles.routeItem}>
                            <View style={[styles.routeDot, { borderColor: '#ef4444', backgroundColor: '#ef4444' }]} />
                            <View style={styles.routeTextContainer}>
                                <Text style={styles.routeLabel}>Varış Noktası</Text>
                                <Text style={styles.routeAddress}>{to || '—'}</Text>
                            </View>
                        </View>

                        {/* Emergency Button (Inline) */}
                        <TouchableOpacity
                            style={styles.inlineEmergencyBtn}
                            onPress={() => navigation.navigate('EmergencySOS', { reservationId: reservation.id, reservation })}
                        >
                            <Ionicons name="warning" size={18} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.inlineEmergencyText}>Acil Yardım</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Info Grid */}
                    <View style={styles.infoGrid}>
                        <View style={styles.infoItem}>
                            <Ionicons name="calendar-outline" size={20} color="#888" />
                            <Text style={styles.infoLabel}>Tarih & Saat</Text>
                            <Text style={styles.infoValue}>{dateStr || '—'}</Text>
                        </View>

                        <View style={styles.infoItem}>
                            <Ionicons name="navigate-outline" size={20} color="#888" />
                            <Text style={styles.infoLabel}>Mesafe</Text>
                            <Text style={styles.infoValue}>{Number(distanceKm).toFixed(2)} km</Text>
                        </View>

                        {price != null && (
                            <View style={styles.infoItem}>
                                <Ionicons name="cash-outline" size={20} color="#888" />
                                <Text style={styles.infoLabel}>Ücret</Text>
                                <Text style={styles.infoValue}>{Number(price).toFixed(0)} ₺</Text>
                            </View>
                        )}

                        {paymentLabel && (
                            <View style={styles.infoItem}>
                                <Ionicons name="card-outline" size={20} color="#888" />
                                <Text style={styles.infoLabel}>Ödeme</Text>
                                <Text style={styles.infoValue}>{paymentLabel}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Cancel Button */}
                {canCancel && (
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity
                            style={[styles.cancelBtn, cancelling && styles.disabledBtn]}
                            onPress={handleCancel}
                            disabled={cancelling}
                        >
                            {cancelling ? (
                                <ActivityIndicator color="#ef4444" />
                            ) : (
                                <>
                                    <Ionicons name="close-circle-outline" size={20} color="#ef4444" style={{ marginRight: 8 }} />
                                    <Text style={styles.cancelBtnText}>Rezervasyonu İptal Et</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: s(16),
        paddingVertical: vs(12),
        backgroundColor: Colors.secondary,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backBtn: {
        padding: s(4),
    },
    headerTitle: {
        fontSize: fs(18),
        fontWeight: '700',
        color: Colors.white,
    },
    headerEmergencyBtn: {
        padding: s(8),
        backgroundColor: 'rgba(239,68,68,0.2)',
        borderRadius: s(20),
    },
    content: {
        flex: 1,
    },
    mapContainer: {
        height: vs(300),
        backgroundColor: Colors.secondary,
    },
    map: {
        flex: 1,
    },
    mapLoading: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    driverCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.secondary,
        marginHorizontal: s(16),
        marginTop: -vs(40),
        marginBottom: vs(16),
        padding: s(16),
        borderRadius: ms(16),
        borderWidth: 1,
        borderColor: Colors.border,
    },
    driverInfo: {
        flex: 1,
    },
    driverName: {
        fontSize: fs(16),
        fontWeight: '700',
        color: Colors.white,
        marginBottom: vs(4),
    },
    driverVehicle: {
        fontSize: fs(13),
        color: Colors.gray,
        fontWeight: '600',
    },
    callBtn: {
        width: s(44),
        height: s(44),
        borderRadius: s(22),
        backgroundColor: '#f4a119',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#f4a119",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    inlineEmergencyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ef4444',
        paddingVertical: vs(10),
        paddingHorizontal: s(16),
        borderRadius: ms(12),
        marginTop: vs(8),
        alignSelf: 'flex-start',
    },
    inlineEmergencyText: {
        fontSize: fs(14),
        fontWeight: '700',
        color: '#fff',
    },
    detailsCard: {
        backgroundColor: Colors.secondary,
        margin: s(16),
        borderRadius: ms(20),
        padding: s(20),
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: vs(20),
        paddingBottom: vs(16),
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    serviceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    serviceIcon: {
        width: s(40),
        height: s(40),
        borderRadius: ms(12),
        backgroundColor: 'rgba(212,175,55,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: s(12),
    },
    serviceName: {
        fontSize: fs(18),
        fontWeight: '700',
        color: Colors.white,
        flex: 1,
    },
    statusChip: {
        borderWidth: 1,
        borderRadius: ms(8),
        paddingVertical: vs(4),
        paddingHorizontal: s(10),
    },
    statusText: {
        fontSize: fs(11),
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    routeInfo: {
        marginBottom: vs(20),
    },
    routeItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: vs(16),
        position: 'relative',
    },
    routeLine: {
        position: 'absolute',
        left: s(7),
        top: vs(14),
        bottom: vs(-20),
        width: s(2),
        backgroundColor: Colors.border,
        zIndex: 0,
    },
    routeDot: {
        width: s(16),
        height: s(16),
        borderRadius: s(8),
        borderWidth: 4,
        marginRight: s(12),
        backgroundColor: Colors.secondary,
        zIndex: 1,
    },
    routeTextContainer: {
        flex: 1,
    },
    routeLabel: {
        fontSize: fs(12),
        color: Colors.gray,
        marginBottom: vs(4),
    },
    routeAddress: {
        fontSize: fs(14),
        color: Colors.white,
        lineHeight: fs(20),
    },
    driverSection: {
        marginBottom: vs(24),
    },
    sectionTitle: {
        fontSize: fs(14),
        fontWeight: '600',
        color: Colors.gray,
        marginBottom: vs(12),
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    driverCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.lightGray,
        padding: s(12),
        borderRadius: ms(12),
    },
    driverAvatar: {
        width: s(48),
        height: s(48),
        borderRadius: s(24),
        backgroundColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: s(12),
    },
    driverInfo: {
        flex: 1,
    },
    driverName: {
        fontSize: fs(16),
        fontWeight: '600',
        color: Colors.white,
        marginBottom: vs(2),
    },
    driverVehicle: {
        fontSize: fs(13),
        color: Colors.gray,
    },
    callDriverBtn: {
        width: s(40),
        height: s(40),
        borderRadius: s(20),
        backgroundColor: '#10b981',
        alignItems: 'center',
        justifyContent: 'center',
    },
    noDriverCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.lightGray,
        padding: s(16),
        borderRadius: ms(12),
        borderWidth: 1,
        borderColor: Colors.border,
    },
    noDriverIcon: {
        marginRight: s(12),
    },
    noDriverInfo: {
        flex: 1,
    },
    noDriverTitle: {
        fontSize: fs(15),
        fontWeight: '600',
        color: Colors.white,
        marginBottom: vs(2),
    },
    noDriverText: {
        fontSize: fs(13),
        color: Colors.gray,
        lineHeight: fs(18),
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: s(-8),
    },
    infoItem: {
        width: '50%',
        paddingHorizontal: s(8),
        marginBottom: vs(16),
    },
    infoLabel: {
        fontSize: fs(12),
        color: Colors.gray,
        marginTop: vs(4),
        marginBottom: vs(2),
    },
    infoValue: {
        fontSize: fs(14),
        fontWeight: '600',
        color: Colors.white,
    },
    actionsContainer: {
        paddingHorizontal: s(16),
        marginBottom: vs(20),
    },
    cancelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(239,68,68,0.2)',
        paddingVertical: vs(14),
        borderRadius: ms(12),
        borderWidth: 1,
        borderColor: '#ef4444',
    },
    disabledBtn: {
        opacity: 0.7,
    },
    cancelBtnText: {
        fontSize: fs(15),
        fontWeight: '600',
        color: '#ef4444',
    }
});
