import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Keyboard, BackHandler, Image, TextInput, Linking, Modal, ScrollView, ActivityIndicator, Switch, Dimensions, Platform, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import BottomSheet, { BottomSheetView, BottomSheetScrollView, BottomSheetFlatList, useBottomSheetSpringConfigs } from '@gorhom/bottom-sheet';
import axios from 'axios';
import polyline from '@mapbox/polyline';
import { useConfig } from '../../context/ConfigContext';
import AppIcon from '../../../assets/icon.png';
import { s, vs, fs, ms } from "../../utils/scale";
import { Colors } from "../../constants/Colors";
import { useServices } from '../../context/ServiceContext';
import { getDefaultInvoice, createReservation, listEmergencyContacts } from '../../api/endpoints';
import { useJourney } from '../../context/JourneyContext';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import AddressAutocomplete from '../../components/AddressAutocomplete'

const BottomSheetMenu = ({ initialIndex = 1 }) => {
    const navigation = useNavigation();
    const [mode, setMode] = useState('services');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [emergencyContactEnabled, setEmergencyContactEnabled] = useState(false);
    const [emergencyContactName, setEmergencyContactName] = useState('');
    const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
    const [emergencyContactRelation, setEmergencyContactRelation] = useState('');
    const [emergencyModalVisible, setEmergencyModalVisible] = useState(false);
    const [savedContacts, setSavedContacts] = useState([]);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [showContactForm, setShowContactForm] = useState(false);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('Rota hesaplanıyor...');

    const snapPoints = useMemo(() => {
        if (mode === 'services') {
            return ['5%', '50%'];
        }
        return ['5%', '80%'];
    }, [mode]);

    const { config } = useConfig();
    const sheetRef = useRef(null);
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [webModalVisible, setWebModalVisible] = useState(false);
    const [webUrl, setWebUrl] = useState(null);
    const [webTitle, setWebTitle] = useState('');

    const { isAuthenticated } = useAuth();

    // Autocomplete Refs
    const pickupRef = useRef(null);
    const dropoffRef = useRef(null);
    const stopRefs = useRef([]);

    const API_KEY = config?.googleMapsApiKey ?? null;
    const { services, selected, selectService } = useServices();
    const visibleServices = Array.isArray(services) ? services.filter((svc) => !!svc?.active) : [];
    const {
        pickup, setPickup,
        dropoff, setDropoff,
        stops, addStop, removeStop, updateStop,
        pickupTime, setPickupTime,
        pickupAt,
        route, setRouteDetails,
        isSelectingLocation, setIsSelectingLocation,
        setSheetIndex,
        navLock,
        setSheetSnapFn,
        sheetMode, setSheetMode,
        paymentMethod, setPaymentMethod,
        invoice, setInvoice,
        openPaymentOnFocus, setOpenPaymentOnFocus,
        resetJourneyPlanning
    } = useJourney();
    const animationConfigs = useBottomSheetSpringConfigs({
        damping: 60,
        overshootClamping: true,
        restDisplacementThreshold: 0.1,
        restSpeedThreshold: 0.1,
        stiffness: 500,
    });
    const handleSheetChanges = useCallback((index) => {
        if (index === 0) Keyboard.dismiss();
        setSheetIndex(index);
    }, [setSheetIndex]);
    useEffect(() => {
        if (sheetMode) {
            setMode(sheetMode);
            setSheetMode(null);
        }
    }, [sheetMode, setSheetMode]);
    const isFocused = useIsFocused();
    useEffect(() => {
        if (!isFocused) return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            if (navLock) return false;
            if (isSelectingLocation) {
                setIsSelectingLocation(false);
                return true;
            }
            if (mode === 'route') {
                setMode('planning');
                return true;
            }
            if (mode === 'planning') {
                setMode('services');
                return true;
            }
            return false;
        });
        return () => sub.remove();
    }, [isFocused, mode, isSelectingLocation, navLock]);

    useEffect(() => {
        setSheetSnapFn(() => (i) => sheetRef.current?.snapToIndex(i));
    }, [setSheetSnapFn]);

    

    useEffect(() => {
        const unsub = navigation.addListener('focus', async () => {
            try {
                const inv = await getDefaultInvoice();
                setInvoice(inv || null);
            } catch (_) {
                setInvoice(null);
            }
            if (openPaymentOnFocus) {
                setPaymentModalVisible(true);
                setOpenPaymentOnFocus(false);
            }
        });
        return unsub;
    }, [navigation, setInvoice, openPaymentOnFocus, setOpenPaymentOnFocus]);


    const [emergencyError, setEmergencyError] = useState(false);

    // Otomatik acil durum kişisi seçimi
    useEffect(() => {
        if (isAuthenticated && mode === 'route' && isFocused) {
            loadContacts(true);
        }
    }, [isAuthenticated, mode, isFocused]);

    const loadContacts = async (autoSelect = false) => {
        setLoadingContacts(true);
        try {
            const resp = await listEmergencyContacts();
            const arr = Array.isArray(resp) ? resp : (resp?.data ?? resp?.results ?? []);
            setSavedContacts(arr);
            
            // Auto select first contact if available and not already selected
            if (autoSelect && arr.length > 0 && !emergencyContactName) {
                const first = arr[0];
                setEmergencyContactName(first.name);
                setEmergencyContactPhone(first.phone_number);
                setEmergencyContactRelation(first.relationship || '');
                setEmergencyContactEnabled(true);
            }

            // Always show list view initially
            setShowContactForm(false);
        } catch (error) {
            console.log('Error loading contacts:', error);
            setSavedContacts([]);
            setShowContactForm(false);
        } finally {
            setLoadingContacts(false);
        }
    };

    const selectContact = (contact) => {
        setEmergencyContactName(contact.name);
        setEmergencyContactPhone(contact.phone_number);
        setEmergencyContactRelation(contact.relationship || '');
        setEmergencyContactEnabled(true);
        setEmergencyModalVisible(false);
        setEmergencyError(false); // Clear error on selection
    };

    const handlePhoneChange = (text) => {
        // Remove non-numeric characters
        const cleaned = text.replace(/[^0-9]/g, '');
        
        // Format as 5XX XXX XX XX
        let formatted = cleaned;
        if (formatted.length > 0) {
            // Limit to 10 digits (without leading 0)
            if (formatted.startsWith('0')) formatted = formatted.substring(1);
            if (formatted.length > 10) formatted = formatted.substring(0, 10);
            
            // Add spaces
            if (formatted.length > 3) formatted = formatted.substring(0, 3) + ' ' + formatted.substring(3);
            if (formatted.length > 7) formatted = formatted.substring(0, 7) + ' ' + formatted.substring(7);
            if (formatted.length > 10) formatted = formatted.substring(0, 10) + ' ' + formatted.substring(10);
        }
        
        setEmergencyContactPhone(formatted);
    };

    const isEmergencyFormValid = useMemo(() => {
        const phoneDigits = emergencyContactPhone.replace(/\s/g, '');
        return emergencyContactName.trim().length > 2 && phoneDigits.length === 10 && emergencyContactRelation.trim().length > 0;
    }, [emergencyContactName, emergencyContactPhone, emergencyContactRelation]);

    const handleConfirmRoute = async () => {
        if (!isAuthenticated) {
            alert('Yolculuk planlamak için lütfen giriş yapınız.');
            navigation.navigate('Login');
            return;
        }

        if (!pickup?.location || !dropoff?.location) {
            alert('Lütfen başlangıç ve varış noktalarını seçin.');
            return;
        }

        setLoadingText('Rota hesaplanıyor...');
        setConfirmLoading(true);
        const validStops = stops.filter(s => s.location);
        const waypoints = validStops.map(s => `${s.location.lat},${s.location.lng}`).join('|');


        try {
            const params = {
                origin: `${pickup.location.lat},${pickup.location.lng}`,
                destination: `${dropoff.location.lat},${dropoff.location.lng}`,
                key: API_KEY,
                mode: 'driving'
            };

            if (waypoints) {
                params.waypoints = waypoints;
            }

            const resp = await axios.get(`https://maps.googleapis.com/maps/api/directions/json`, { params });

            if (resp.data.routes.length > 0) {
                const r = resp.data.routes[0];
                const points = polyline.decode(r.overview_polyline.points).map(p => ({ latitude: p[0], longitude: p[1] }));

                let totalDist = 0;
                let totalDur = 0;
                r.legs.forEach(leg => {
                    totalDist += leg.distance.value;
                    totalDur += leg.duration.value;
                });

                const distanceKm = totalDist / 1000;
                const durationMins = Math.ceil(totalDur / 60);

                setRouteDetails({
                    polyline: points,
                    distanceKm,
                    durationMins,
                    summary: r.summary
                });
                setMode('route');
            } else {
                alert('Rota bulunamadı.');
            }
        } catch (error) {
            console.error('Directions error:', error);
            alert('Rota hesaplanırken bir hata oluştu.');
        } finally {
            setConfirmLoading(false);
        }
    };

    const renderInitialContent = () => (
        <BottomSheetScrollView
            style={styles.scroll}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
            stickyHeaderIndices={[0]}
        >
            <View style={styles.headerContainer} />

            <View style={styles.sectionContainer}>
                <View style={styles.servicesRow}>
                    {visibleServices.map((svc) => {
                        const isSelected = selected?.id === svc.id;
                        const imgSource = typeof svc?.image === 'string' && svc.image.length > 0 ? { uri: svc.image } : AppIcon;
                        return (
                            <TouchableOpacity
                                key={svc.id}
                                style={[styles.serviceCard, isSelected && styles.serviceCardActive]}
                                onPress={() => {
                                    const changing = selected?.id !== svc.id;
                                    selectService(svc);
                                    if (changing) {
                                        resetJourneyPlanning?.();
                                        pickupRef.current?.setAddressText?.('');
                                        dropoffRef.current?.setAddressText?.('');
                                        stopRefs.current?.forEach?.((r) => r?.setAddressText?.(''));
                                    }
                                    setMode('planning');
                                }}
                            >
                                <View style={[styles.cardIcon, isSelected && styles.cardIconActive]}>
                                    <Image source={imgSource} style={styles.cardImage} />
                                </View>
                                <View style={{ flex: 1, marginLeft: s(8) }}>
                                    <Text style={styles.cardTitle} numberOfLines={1}>{svc.title}</Text>
                                    <Text style={styles.cardSubtitle} numberOfLines={1}>{svc.description || 'Hizmet'}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </BottomSheetScrollView>
    );

    const renderPlanningContent = () => {
        const handleGlobalMapSelect = () => {
            const firstEmptyStop = Array.isArray(stops) ? stops.find((s) => !s?.location) : null;
            let targetType = 'dropoff';
            let targetId = null;
            if (!pickup?.location) {
                targetType = 'pickup';
            } else if (firstEmptyStop) {
                targetType = 'stop';
                targetId = firstEmptyStop.id;
            } else if (!dropoff?.location) {
                targetType = 'dropoff';
            }

            navigation.navigate('LocationPicker', {
                target: (targetType === 'stop' && targetId) ? `stop_${targetId}` : targetType,
                onSelect: ({ coordinate, address }) => {
                    const loc = { address, location: { lat: coordinate.latitude, lng: coordinate.longitude } };
                    if (targetType === 'pickup') {
                        setPickup(loc);
                    } else if (targetType === 'stop' && targetId) {
                        updateStop(targetId, loc);
                    } else {
                        setDropoff(loc);
                    }
                }
            });
        };

        const handleGlobalAddressSelect = () => {
            const target = !pickup?.location ? 'pickup' : 'dropoff';
            navigation.navigate('Addresses', { selectFor: target });
        };


        return (
            <View style={{ paddingHorizontal: 20, paddingBottom: 40 }}>
                <View style={[styles.headerContainer, { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }]}>
                    <TouchableOpacity onPress={() => setMode('services')} style={{ marginRight: 10, padding: 5 }}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Yolculuğu planla</Text>
                </View>

                {/* Selected Service Summary */}
                {selected && (
                    <View style={{ marginBottom: 15, padding: 10, backgroundColor: '#f8f9fa', borderRadius: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#eee' }}>
                        <Image 
                            source={selected?.image && typeof selected.image === 'string' ? { uri: selected.image } : AppIcon} 
                            style={{ width: 40, height: 40, marginRight: 12, borderRadius: 8, resizeMode: 'contain' }} 
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1a1a1a' }}>{selected?.title || selected?.name || 'Hizmet Seçilmedi'}</Text>
                            {selected?.description ? (
                                <Text style={{ fontSize: 12, color: '#666' }} numberOfLines={1}>{selected.description}</Text>
                            ) : null}
                        </View>
                        <TouchableOpacity onPress={() => setMode('services')}>
                            <Text style={{ color: '#f4a119', fontSize: 13, fontWeight: '600' }}>Değiştir</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Pickup Section */}
                <View style={styles.timelineRow}>
                    <View style={styles.timelineCol}>
                        {/* Start Point - Green */}
                        <View style={[styles.timelineDot, { backgroundColor: '#4CAF50' }]} />
                        <View style={styles.timelineLine} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>Başlangıç noktası</Text>
                        <AddressAutocomplete
                            placeholder="Başlangıç Noktası"
                            value={pickup}
                            onSelect={setPickup}
                            onMapSelect={() => { navigation.navigate('LocationPicker', { target: 'pickup', onSelect: ({ coordinate, address }) => setPickup({ address, location: { lat: coordinate.latitude, lng: coordinate.longitude } }) }); }}
                            onClear={() => setPickup(null)}
                            API_KEY={API_KEY}
                            enableCurrent={true}
                        />

                    </View>
                </View>

                {/* Stops Section */}
                {stops.map((stop, index) => (
                    <View key={stop.id} style={styles.timelineRow}>
                        <View style={styles.timelineCol}>
                            {/* Stop Point - Yellow/Amber */}
                            <View style={[styles.timelineDot, { backgroundColor: Colors.primary }]} />
                            <View style={styles.timelineLine} />
                        </View>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start' }}>
                            <View style={{ flex: 1 }}>
                                <AddressAutocomplete
                                    placeholder={`${index + 1}. Durak`}
                                    value={stop}
                                    onSelect={(val) => updateStop(stop.id, val)}
                                    onMapSelect={() => { navigation.navigate('LocationPicker', { target: `stop_${stop.id}`, onSelect: ({ coordinate, address }) => updateStop(stop.id, { address, location: { lat: coordinate.latitude, lng: coordinate.longitude } }) }); }}
                                    onClear={() => updateStop(stop.id, { address: '', location: null })}
                                    API_KEY={API_KEY}
                                />

                            </View>
                            <TouchableOpacity onPress={() => removeStop(stop.id)} style={{ padding: 10, marginLeft: 5 }}>
                                <Ionicons name="trash-outline" size={20} color="#ff4444" />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}

                <TouchableOpacity style={[styles.addStopButton, { marginLeft: 30, marginBottom: 15, paddingLeft: 0 }]} onPress={addStop}>
                    <Ionicons name="add" size={20} color={Colors.primary} />
                    <Text style={{ color: Colors.primary, fontSize: 14, marginLeft: 5 }}>Durak ekle</Text>
                </TouchableOpacity>

                {/* Dropoff Section */}
                <View style={styles.timelineRow}>
                    <View style={styles.timelineCol}>
                        {/* Destination Point - Red */}
                        <View style={[styles.timelineDot, { backgroundColor: '#F44336' }]} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>Varış noktası</Text>
                        <AddressAutocomplete
                            placeholder="Varış Noktası"
                            value={dropoff}
                            onSelect={setDropoff}
                            onMapSelect={() => { navigation.navigate('LocationPicker', { target: 'dropoff', onSelect: ({ coordinate, address }) => setDropoff({ address, location: { lat: coordinate.latitude, lng: coordinate.longitude } }) }); }}
                            onClear={() => setDropoff(null)}
                            API_KEY={API_KEY}
                        />
                    </View>
                </View>

                <View style={{ marginTop: vs(12) }}>
                    <TouchableOpacity style={styles.actionRow} onPress={handleGlobalMapSelect}>
                        <View style={styles.actionRowLeft}>
                            <Ionicons name="location-outline" size={18} color="#f4a119" />
                            <Text style={styles.actionRowTextLarge}>Haritadan seç</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#999" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionRow} onPress={handleGlobalAddressSelect}>
                        <View style={styles.actionRowLeft}>
                            <Ionicons name="bookmark-outline" size={18} color="#f4a119" />
                            <Text style={styles.actionRowTextLarge}>Kayıtlı adresler</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#999" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('ReservationTime')}>
                        <View style={styles.actionRowLeft}>
                            <Ionicons name="time" size={18} color="#f4a119" />
                            <Text style={styles.actionRowTextLarge}>Hareket saati</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.actionRowValue}>{pickupAt ? `${String(new Date(pickupAt).getDate()).padStart(2,'0')}/${String(new Date(pickupAt).getMonth()+1).padStart(2,'0')}/${new Date(pickupAt).getFullYear()} ${String(new Date(pickupAt).getHours()).padStart(2,'0')}:${String(new Date(pickupAt).getMinutes()).padStart(2,'0')}` : pickupTime}</Text>
                            <Ionicons name="chevron-forward" size={16} color="#999" />
                        </View>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={[styles.confirmButton, ((!pickup?.location || !dropoff?.location) || confirmLoading) && styles.confirmButtonDisabled]} onPress={handleConfirmRoute} disabled={!pickup?.location || !dropoff?.location || confirmLoading}>
                    {confirmLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>Onayla</Text>}
                </TouchableOpacity>
                {confirmLoading ? (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#f4a119" />
                        <Text style={styles.loadingOverlayText}>{loadingText}</Text>
                    </View>
                ) : null}
            </View>
        );
    };

    const handlePaymentAndConfirm = async () => {
        if (!isAuthenticated) {
            alert('Lütfen giriş yapınız.');
            navigation.navigate('Login');
            return;
        }

        if (!selected) {
            alert('Lütfen bir hizmet seçin.');
            return;
        }

        // Acil durum kişisi kontrolü - Zorunlu
        if (!emergencyContactEnabled || !emergencyContactName || !emergencyContactPhone || !emergencyContactRelation) {
            setEmergencyError(true);
            return;
        }

        if (!termsAccepted) {
            alert('Lütfen şartları kabul edin.');
            return;
        }

        setLoadingText('İşleminiz gerçekleştiriliyor...');
        setConfirmLoading(true);

        try {
            const stopsData = stops.filter(s => s.location).map(s => ({
                address: s.address,
                lat: s.location.lat,
                lng: s.location.lng
            }));
            
            let finalPickupTime = pickupAt;
            if (!finalPickupTime) {
                finalPickupTime = new Date().toISOString();
            } else {
                finalPickupTime = new Date(pickupAt).toISOString();
            }

            // Backend'e gönderilecek veriyi hazırla
            // Fiyat hesaplama
            let finalPrice = route?.price || 0;
            const pricing = selected?.pricing || selected?.original?.pricing;
            
            if (!finalPrice && pricing && route?.distanceKm) {
                 const { base_fee, per_km, free_distance } = pricing;
                 const dist = parseFloat(route.distanceKm);
                 const extraKm = Math.max(0, dist - (parseFloat(free_distance) || 0));
                 finalPrice = parseFloat(base_fee) + (extraKm * parseFloat(per_km));
            }

            const payload = {
                pickup: pickup.address,
                pickupLat: pickup.location.lat,
                pickupLng: pickup.location.lng,
                
                dropoff: dropoff.address,
                dropoffLat: dropoff.location.lat,
                dropoffLng: dropoff.location.lng,
                
                stops: stopsData,
                pickupTime: finalPickupTime,
                
                serviceId: selected?.original?.slug || selected?.slug,
                paymentMethod,
                invoiceId: invoice?.id,
                
                price: finalPrice ? Number(finalPrice).toFixed(2) : "0.00",
                distanceKm: route?.distanceKm || 0,
                durationMin: route?.durationMins || 0,

                emergencyContactName: emergencyContactEnabled ? emergencyContactName : null,
                emergencyContactPhone: emergencyContactEnabled && emergencyContactPhone ? `+90${emergencyContactPhone.replace(/[^0-9]/g, '')}` : null,
                emergencyContactRelationship: emergencyContactEnabled ? emergencyContactRelation : null
            };

            const response = await createReservation(payload);
            
            // Başarılı ise:
            navigation.navigate('ReservationSuccess');

        } catch (error) {
            // console.error('Rezervasyon hatası:', error);
            if (error.response) {
                // console.error('Error data:', error.response.data);
                // Kullanıcıya daha anlamlı bir hata mesajı gösterilebilir
                // alert(`Hata: ${JSON.stringify(error.response.data)}`);
                if (error.response.status === 401) {
                    alert('Oturum süreniz doldu. Lütfen tekrar giriş yapın.');
                    navigation.navigate('Login');
                } else {
                    alert('Rezervasyon oluşturulamadı. Lütfen bilgilerinizi kontrol edin.');
                }
            } else {
                alert('İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.');
            }
        } finally {
            setConfirmLoading(false);
        }
    };

    const renderRouteContent = () => {
        const formatPickupAt = () => {
            if (!pickupAt) return pickupTime;
            const d = new Date(pickupAt);
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            const hh = String(d.getHours()).padStart(2, '0');
            const ii = String(d.getMinutes()).padStart(2, '0');
            return `${dd}/${mm}/${yyyy} ${hh}:${ii}`;
        };
        return (
        <View style={styles.routeContainer}>
        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: s(16), paddingBottom: vs(120) }}>
            <View style={[styles.headerContainer, { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }]}>
                <TouchableOpacity onPress={() => setMode('planning')} style={{ marginRight: 10, padding: 5 }}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Özet ve Onay</Text>
            </View>
            
            <View style={styles.summaryCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: vs(6) }}>
                    <Text style={styles.summaryLabel}>Seçilen Hizmet</Text>
                    <Text style={styles.summaryValue}>{selected?.title || selected?.name || 'Hizmet Seçilmedi'}</Text>

                    
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: vs(6) }}>
                    <Text style={styles.summaryLabel}>Mesafe</Text>
                    <Text style={styles.summaryValue}>{route?.distanceKm?.toFixed(1)} km</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.summaryLabel}>Planlanan Zaman</Text>
                    <Text style={styles.summaryValue}>{formatPickupAt()}</Text>
                </View>
            </View>

            <View style={styles.sectionCard}>
                <View style={{ flexDirection: 'row' }}>
                    <View style={{ alignItems: 'center', marginRight: s(10) }}>
                        <View style={[styles.timelineDot, { backgroundColor: '#4CAF50'}]} />
                        <View style={styles.timelineLine} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>Başlangıç noktası</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#333', flex: 1 }} numberOfLines={1}>{pickup?.address}</Text>
                            <TouchableOpacity onPress={() => setMode('planning')}><Text style={styles.changeMuted}>Değiştir</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>

                {stops.filter((s) => !!s.location).map((stop) => (
                    <View key={stop.id} style={{ flexDirection: 'row', marginTop: vs(8) }}>
                        <View style={{ alignItems: 'center', marginRight: s(10) }}>
                            <View style={[styles.timelineDot, { backgroundColor: Colors.primary }]} />
                            <View style={styles.timelineLine} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>Durak</Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#333', flex: 1 }} numberOfLines={1}>{stop?.address}</Text>
                                <TouchableOpacity onPress={() => setMode('planning')}><Text style={styles.changeMuted}>Değiştir</Text></TouchableOpacity>
                            </View>
                        </View>
                    </View>
                ))}

                <View style={{ flexDirection: 'row', marginTop: vs(8) }}>
                    <View style={{ alignItems: 'center', marginRight: s(10) }}>
                        <View style={[styles.timelineDot, { backgroundColor: '#F44336' }]} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>Varış noktası</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#333', flex: 1 }} numberOfLines={1}>{dropoff?.address}</Text>
                            <TouchableOpacity onPress={() => setMode('planning')}><Text style={styles.changeMuted}>Değiştir</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>

            <TouchableOpacity 
                style={[styles.optionRow, emergencyError && { borderColor: 'red', borderWidth: 1, borderRadius: ms(8), backgroundColor: '#fff0f0' }]} 
                onPress={() => { setEmergencyModalVisible(true); setEmergencyError(false); }}
            >
                <View style={{ flex: 1, marginLeft: s(12) }}>
                     <Text style={{ fontSize: fs(16), color: emergencyError ? 'red' : '#333' }}>
                        {emergencyContactName ? 'Acil Durum Kişisi: ' + emergencyContactName : 'Acil Durum Kişisi Seç (Zorunlu)'}
                     </Text>
                </View>
                {(!emergencyContactName || !emergencyContactEnabled) && (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: 'red', marginRight: 10 }} />
                )}
                <Ionicons name="chevron-forward" size={18} color="#bbb" />
            </TouchableOpacity>
            {emergencyError && (
                <Text style={{ color: 'red', fontSize: fs(12), marginLeft: s(16), marginTop: vs(4), marginBottom: vs(8) }}>
                    * Lütfen bir acil durum kişisi seçiniz.
                </Text>
            )}

            <TouchableOpacity style={styles.optionRow} onPress={() => { setPaymentModalVisible(true); }}>
                <Text style={styles.optionText}>Nakit Ödeme</Text>
                <Ionicons name="chevron-forward" size={18} color="#bbb" />
            </TouchableOpacity>

            

            <View style={styles.termsRow}>
                <TouchableOpacity 
                    style={{ padding: 5, marginRight: 5 }}
                    onPress={() => setTermsAccepted(!termsAccepted)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <View style={[styles.checkbox, !termsAccepted && { backgroundColor: '#fff', borderWidth: 2, borderColor: '#ddd' }]}>
                        {termsAccepted && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                     <Text style={{ color: '#666', fontSize: 13, lineHeight: 20 }}>
                        <Text style={styles.linkText} onPress={() => { setWebTitle('Ön Bilgilendirme Formu'); setWebUrl(config?.preliminaryInfoUrl || 'https://google.com'); setWebModalVisible(true); }}>Ön Bilgilendirme Formu</Text>
                        <Text>'nu ve </Text>
                        <Text style={styles.linkText} onPress={() => { setWebTitle('Mesafeli Satış Sözleşmesi'); setWebUrl(config?.distanceSalesAgreementUrl || 'https://google.com'); setWebModalVisible(true); }}>Mesafeli Satış Sözleşmesi</Text>
                        <Text onPress={() => setTermsAccepted(!termsAccepted)}>'ni okudum, kabul ediyorum.</Text>
                     </Text>
                </View>
            </View>

        </BottomSheetScrollView>
        <View style={[styles.bottomBar, styles.bottomBarFixed]}>
            <View>
                <Text style={styles.bottomPrice}>₺{Number(route?.price || 0).toFixed(2)}</Text>
            </View>
             <TouchableOpacity style={[styles.bottomCta, !termsAccepted && { opacity: 0.4 }]} onPress={handlePaymentAndConfirm} disabled={!termsAccepted}>
              <Text style={styles.bottomCtaText}>Onayla</Text>
            </TouchableOpacity>
        </View>
        </View>
        );
    };


    return (
        <>
        <BottomSheet
            ref={sheetRef}
            index={initialIndex}
            snapPoints={snapPoints}
            enableDynamicSizing={true}
            enablePanDownToClose={false}
            enableContentPanningGesture={true}
            backgroundStyle={styles.sheetBg}
            handleIndicatorStyle={styles.handle}
            animationConfigs={animationConfigs}
            onChange={handleSheetChanges}
            keyboardBehavior="interactive"
            android_keyboardInputMode="adjustResize"
        >
            {mode === 'planning' ? (
                <BottomSheetFlatList
                    data={[{ key: 'planning' }]}
                    renderItem={() => renderPlanningContent()}
                    keyExtractor={(item) => item.key}
                    contentContainerStyle={styles.contentContainer}
                    keyboardShouldPersistTaps="always"
                />
            ) : (
                <BottomSheetView style={[styles.contentContainer, mode === 'route' && { flex: 1 }]}>
                    {mode === 'services' && renderInitialContent()}
                    {mode === 'route' && renderRouteContent()}
                </BottomSheetView>
            )}
        </BottomSheet>

        {/* Payment Modal */}
        <Modal visible={paymentModalVisible} animationType="slide" transparent onRequestClose={() => setPaymentModalVisible(false)}>
            <View style={styles.modalBackdrop}>
                <View style={styles.modalCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: vs(8) }}>
                        <Text style={styles.headerTitle}>Ödeme yöntemi seçin</Text>
                        <TouchableOpacity onPress={() => setPaymentModalVisible(false)}>
                            <Ionicons name="close" size={22} color="#333" />
                        </TouchableOpacity>
                    </View>
                    
                    <TouchableOpacity style={styles.paymentItem} onPress={() => { setPaymentMethod('cash'); setPaymentModalVisible(false); }}>
                        <Ionicons name={paymentMethod === 'cash' ? 'radio-button-on' : 'radio-button-off'} size={20} color="#333" />
                        <View style={{ marginLeft: s(10), flex: 1 }}>
                            <Text style={{ fontSize: fs(14), fontWeight: '700', color: '#333' }}>Nakit Ödeme</Text>
                        </View>
                        <Ionicons name="cash-outline" size={20} color="#666" />
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
        {/* Emergency Contact Modal */}
        <Modal visible={emergencyModalVisible} animationType="slide" transparent onRequestClose={() => setEmergencyModalVisible(false)}>
            <View style={styles.modalBackdrop}>
                <View style={[styles.modalCard, { paddingBottom: vs(32) }]}>
                    {/* Bottom Sheet Handle */}
                    <View style={{ width: s(40), height: vs(4), backgroundColor: Colors.primary, borderRadius: ms(2), alignSelf: 'center', marginBottom: vs(20) }} />
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: vs(24), position: 'relative' }}>
                        <Text style={[styles.headerTitle, { fontSize: fs(20), color: Colors.primary, textAlign: 'center' }]}>Acil Durum Kişisi</Text>
                        <TouchableOpacity onPress={() => setEmergencyModalVisible(false)} style={{ position: 'absolute', right: 0, padding: 4 }}>
                            <Ionicons name="close" size={24} color="#1a1a1a" />
                        </TouchableOpacity>
                    </View>

                    <View style={{ marginBottom: vs(16) }}>
                        {loadingContacts ? (
                            <ActivityIndicator size="small" color={Colors.primary} />
                        ) : !showContactForm ? (
                            <View>
                                {savedContacts.length > 0 ? (
                                    <>
                                        <Text style={{ fontSize: fs(14), color: '#666', marginBottom: vs(12) }}>
                                            Kayıtlı kişilerinizden seçin veya yeni kişi ekleyin.
                                        </Text>
                                        {savedContacts.map((contact) => (
                                            <TouchableOpacity 
                                                key={contact.id} 
                                                style={styles.contactItem}
                                                onPress={() => selectContact(contact)}
                                            >
                                                <View style={styles.contactIcon}>
                                                    <Ionicons name="person" size={20} color={Colors.primary} />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.contactName}>{contact.name}</Text>
                                                    <Text style={styles.contactPhone}>{contact.phone_number}</Text>
                                                </View>
                                                <Ionicons name="chevron-forward" size={20} color="#ccc" />
                                            </TouchableOpacity>
                                        ))}
                                    </>
                                ) : (
                                    <View style={{ alignItems: 'center', paddingVertical: vs(20) }}>
                                        <Text style={{ fontSize: fs(14), color: '#666', textAlign: 'center', marginBottom: vs(12) }}>
                                            Kayıtlı acil durum kişiniz bulunmamaktadır.
                                        </Text>
                                    </View>
                                )}

                                <TouchableOpacity 
                                    style={styles.addNewContactBtn}
                                    onPress={() => navigation.navigate('EmergencyContacts')}
                                >
                                    <Ionicons name="add" size={20} color={Colors.primary} />
                                    <Text style={styles.addNewContactText}>Yeni Kişi Ekle</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View>
                                {savedContacts.length > 0 && (
                                    <TouchableOpacity 
                                        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: vs(16) }}
                                        onPress={() => setShowContactForm(false)}
                                    >
                                        <Ionicons name="arrow-back" size={20} color="#333" />
                                        <Text style={{ marginLeft: s(8), fontSize: fs(14), color: '#333' }}>Listeye Dön</Text>
                                    </TouchableOpacity>
                                )}
                                <Text style={{ fontSize: fs(14), color: '#666', marginBottom: vs(24), lineHeight: 20 }}>
                                    Acil durumlarda ulaşabileceğimiz bir yakınınızın bilgilerini giriniz.
                                </Text>
                                
                                <View style={{ marginBottom: vs(16) }}>
                                    <Text style={{ fontSize: fs(13), fontWeight: '600', color: '#1a1a1a', marginBottom: vs(8), marginLeft: s(4) }}>Ad Soyad</Text>
                                    <TextInput
                                        style={styles.modernInput}
                                        value={emergencyContactName}
                                        onChangeText={setEmergencyContactName}
                                        placeholder="Ad Soyad"
                                        placeholderTextColor="#bbb"
                                    />
                                </View>

                                <View style={{ marginBottom: vs(16) }}>
                                    <Text style={{ fontSize: fs(13), fontWeight: '600', color: '#1a1a1a', marginBottom: vs(8), marginLeft: s(4) }}>Yakınlık Derecesi</Text>
                                    <TextInput
                                        style={styles.modernInput}
                                        value={emergencyContactRelation}
                                        onChangeText={setEmergencyContactRelation}
                                        placeholder="Örn: Anne, Baba, Kardeş"
                                        placeholderTextColor="#bbb"
                                    />
                                </View>
                                
                                <View style={{ marginBottom: vs(32) }}>
                                    <Text style={{ fontSize: fs(13), fontWeight: '600', color: '#1a1a1a', marginBottom: vs(8), marginLeft: s(4) }}>Telefon Numarası</Text>
                                    <View style={styles.phoneInputContainer}>
                                        <View style={styles.phonePrefix}>
                                            <Text style={styles.phonePrefixText}>+90</Text>
                                        </View>
                                        <TextInput
                                            style={styles.phoneInput}
                                            value={emergencyContactPhone}
                                            onChangeText={handlePhoneChange}
                                            placeholder="5XX XXX XX XX"
                                            placeholderTextColor="#bbb"
                                            keyboardType="number-pad"
                                            maxLength={13} // 10 digits + 3 spaces
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity 
                                    style={[
                                        styles.blackButton, 
                                        !isEmergencyFormValid && styles.disabledButton
                                    ]} 
                                    onPress={() => {
                                        if (isEmergencyFormValid) {
                                            setEmergencyContactEnabled(true);
                                            setEmergencyModalVisible(false);
                                        }
                                    }}
                                    disabled={!isEmergencyFormValid}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.blackButtonText}>Kaydet</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </Modal>

        {/* WebView Modal - full screen with loader and back */}
        <Modal visible={webModalVisible} animationType="slide" onRequestClose={() => setWebModalVisible(false)}>
            <View style={styles.webContainer}>
                <View style={styles.webHeader}>
                    <TouchableOpacity style={styles.webBack} onPress={() => setWebModalVisible(false)}>
                        <Ionicons name="arrow-back" size={22} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.webTitle} numberOfLines={1}>{webTitle}</Text>
                </View>
                {webUrl ? (
                    <WebView
                        source={{ uri: webUrl }}
                        startInLoadingState
                        renderLoading={() => (
                            <View style={styles.webLoading}>
                                <ActivityIndicator size="small" color="#f4a119" />
                                <Text style={styles.webLoadingText}>Yükleniyor...</Text>
                            </View>
                        )}
                    />
                ) : (
                    <View style={{ flex: 1 }} />
                )}
            </View>
        </Modal>
        </>
    );

}
const styles = StyleSheet.create({
    sheetBg: {
        backgroundColor: '#fff',
        borderTopLeftRadius: ms(32),
        borderTopRightRadius: ms(32),
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -vs(4) },
        shadowOpacity: 0.15,
        shadowRadius: ms(12),
        elevation: 20,
    },
    handle: { backgroundColor: Colors.primary, width: s(48), height: vs(5), borderRadius: ms(3) },
    contentContainer: { paddingBottom: vs(8) },
    routeContainer: { position: 'relative', flex: 1 },
    headerContainer: { alignItems: 'center', paddingVertical: vs(8), marginBottom: vs(8) },
    handleBar: { width: s(48), height: vs(5), borderRadius: ms(3), backgroundColor: '#e0e0e0', marginBottom: vs(8) },
    headerTitle: { fontSize: fs(18), fontWeight: '700', color: '#333' },
    sectionContainer: { paddingHorizontal: s(24), marginBottom: vs(16) },
    locationRow: { flexDirection: 'row', alignItems: 'center' },
    iconWrapper: { width: s(40), height: s(40), borderRadius: ms(12), backgroundColor: '#fff6e0', alignItems: 'center', justifyContent: 'center', marginRight: s(16) },
    locationInfo: { flex: 1 },
    label: { fontSize: fs(12), color: '#999', fontWeight: '600', marginBottom: vs(2), textTransform: 'uppercase', letterSpacing: 0.5 },
    addressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    addressText: { fontSize: fs(14), fontWeight: '700', color: '#1a1a1a', flex: 1, marginRight: s(12) },
    changeBtn: { fontSize: fs(14), color: '#bbb', fontWeight: '600' },
    changeMuted: { color: '#999', fontWeight: '600' },
    divider: { height: vs(1), backgroundColor: '#f0f0f0', marginHorizontal: s(24), marginBottom: vs(16) },
    searchButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', height: vs(56), borderRadius: ms(16), paddingHorizontal: s(16), borderWidth: 1, borderColor: '#eeeeee' },
    placeholderText: { fontSize: fs(16), color: '#666', marginLeft: s(12), fontWeight: '500' },
    quickActionsRow: { flexDirection: 'row', paddingHorizontal: s(24), marginBottom: vs(12), gap: s(8) },
    actionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: vs(6), paddingHorizontal: s(10), borderRadius: ms(14), borderWidth: 1, borderColor: '#eee', minWidth: 0 },
    actionIcon: { width: s(24), height: s(24), borderRadius: s(12), alignItems: 'center', justifyContent: 'center', marginRight: s(6) },
    actionText: { fontSize: fs(12), fontWeight: '600', color: '#333', flexShrink: 1, minWidth: 0 },
    actionsRow: { flexDirection: 'row', gap: s(8), marginTop: vs(6), flexWrap: 'wrap' },
    actionButtonMini: { flexBasis: '31%', flexGrow: 1 },
    scroll: {},

    servicesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: s(8), marginTop: vs(8) },
    serviceChip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#eee', backgroundColor: '#f9f9f9', paddingVertical: vs(8), paddingHorizontal: s(12), borderRadius: ms(20) },
    serviceChipActive: { backgroundColor: '#f4a119', borderColor: '#f4a119' },
    serviceChipText: { marginLeft: s(6), fontSize: fs(13), color: '#333', fontWeight: '600' },
    serviceChipTextActive: { color: '#fff' },
    bannerRow: { marginHorizontal: s(24), marginBottom: vs(8), backgroundColor: '#e9f5ff', borderRadius: ms(16), paddingVertical: vs(10), paddingHorizontal: s(12), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    bannerText: { color: '#1a1a1a', fontWeight: '600', fontSize: fs(14) },
    bannerBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', paddingVertical: vs(6), paddingHorizontal: s(12), borderRadius: ms(16) },
    bannerBtnText: { color: '#1a1a1a', fontWeight: '600' },
    serviceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: ms(16), borderWidth: 1, borderColor: '#eee', padding: s(16), width: '100%', minHeight: vs(72), marginBottom: vs(10) },
    serviceCardActive: { borderColor: '#f4a119', backgroundColor: '#fff9f0' },
    cardImage: { width: s(70), height: s(50) },
    cardIconActive: { backgroundColor: '#f4a119' },
    cardTitle: { fontSize: fs(16), fontWeight: '700', color: '#1a1a1a' },
    cardSubtitle: { fontSize: fs(13), color: '#666' },

    // Planning Mode Styles
    actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: vs(12), paddingHorizontal: vs(16), borderBottomWidth: 1, borderBottomColor: '#eee' },
    actionRowLeft: { flexDirection: 'row', alignItems: 'center' },
    actionRowText: { fontSize: fs(13), fontWeight: '700', color: '#333', marginLeft: s(10) },
    actionRowTextLarge: { fontSize: fs(16), fontWeight: '700', color: '#333', marginLeft: s(10) },
    actionRowValue: { fontSize: fs(14), fontWeight: '700', color: '#333', marginRight: s(8) },
    confirmButton: { backgroundColor: '#222', paddingVertical: vs(10), 
        height:ms(50),  alignItems: 'center', marginBottom: vs(10),marginTop:vs(50),justifyContent:'center' },
    confirmButtonDisabled: { opacity: 0.5 },
    confirmButtonText: { color: '#fff', fontSize: fs(15), fontWeight: '700' },
    loadingOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center' },
    loadingOverlayText: { marginTop: vs(8), color: '#333', fontSize: fs(14), fontWeight: '700' },
    timeValuePill: { flexDirection: 'row', alignItems: 'center' },
    input: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: ms(12),
        paddingHorizontal: s(12),
        paddingVertical: vs(10),
        fontSize: fs(14),
        color: '#333',
    },
    modernInput: {
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 0, // Köşeli
        paddingHorizontal: s(16),
        paddingVertical: vs(14),
        fontSize: fs(15),
        color: '#111',
        fontWeight: '500',
    },
    phoneInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        backgroundColor: '#f9fafb',
        borderRadius: 0, // Köşeli
    },
    phonePrefix: {
        paddingHorizontal: s(16),
        paddingVertical: vs(14),
        borderRightWidth: 1,
        borderRightColor: '#e5e7eb',
        backgroundColor: '#f3f4f6',
    },
    phonePrefixText: {
        fontSize: fs(15),
        color: '#374151',
        fontWeight: '600',
    },
    phoneInput: {
        flex: 1,
        paddingHorizontal: s(16),
        paddingVertical: vs(14),
        fontSize: fs(15),
        color: '#111',
        fontWeight: '500',
    },
    blackButton: {
        backgroundColor: '#000',
        paddingVertical: vs(16),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 0, // Köşeli
    },
    disabledButton: {
        backgroundColor: '#e5e5e5',
    },
    blackButtonText: {
        color: '#fff',
        fontSize: fs(16),
        fontWeight: '700',
    },
    timeValuePillText: { fontSize: fs(13), fontWeight: '700', color: '#333', marginRight: s(6) },


    timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: vs(8) },
    timelineCol: { width: s(20), alignItems: 'center' },
    timelineDot: { width: s(8), height: s(8), borderRadius: s(4), backgroundColor: '#999', marginTop: vs(16) },
    timelineLine: { width: 0, flex: 1, borderLeftWidth: 1, borderColor: '#ddd', borderStyle: 'dashed', marginTop: vs(4), alignSelf: 'stretch' },

    // Review Mode Styles
    addStopButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: vs(8), paddingHorizontal: s(4), marginBottom: vs(12) },
    addStopText: { color: '#f4a119', fontWeight: '600', marginLeft: s(6), fontSize: fs(14) },
    optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: vs(12), borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    paymentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: vs(12), borderBottomWidth: 1, borderBottomColor: '#eee' },
    optionText: { flex: 1, fontSize: fs(16), color: '#333', marginLeft: s(12) },
    termsRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: vs(12) },
    checkbox: { width: s(20), height: s(20), borderRadius: s(4), backgroundColor: '#f4a119', marginRight: s(12), alignItems: 'center', justifyContent: 'center' },
    termsText: { flex: 1, color: '#333' },
    bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: vs(12) },
    bottomBarFixed: { position: 'absolute', left: s(16), right: s(16), bottom: vs(10), backgroundColor: '#fff' },
    bottomPrice: { fontSize: fs(18), fontWeight: '800', color: '#333' },
    bottomCta: { backgroundColor: '#555', paddingVertical: vs(14), paddingHorizontal: s(24), borderRadius: ms(12) },
    bottomCtaText: { color: '#fff', fontWeight: '700' }
    ,
    modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: '#fff', borderTopLeftRadius: ms(24), borderTopRightRadius: ms(24), padding: s(16), maxHeight: '75%' }
    ,
    linkText: { color: '#f4a119', textDecorationLine: 'underline', fontWeight: '700', fontSize: fs(13) }
    ,
    webContainer: { flex: 1, backgroundColor: '#fff' },
    webHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: s(16), paddingVertical: vs(12), borderBottomWidth: 1, borderBottomColor: '#eee' },
    webBack: { paddingRight: s(12), paddingVertical: vs(4) },
    webTitle: { fontSize: fs(16), fontWeight: '700', color: '#333', flex: 1 },
    webLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
    webLoadingText: { marginTop: vs(8), color: '#666', fontSize: fs(13) },
    summaryCard: { backgroundColor: '#fff', borderRadius: ms(16), padding: s(16), borderWidth: 1, borderColor: '#eee', marginBottom: vs(12), shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: ms(6), shadowOffset: { width: 0, height: 3 }, elevation: 3 },
    sectionCard: { backgroundColor: '#fff', borderRadius: ms(16), padding: s(16), borderWidth: 1, borderColor: '#eee', marginBottom: vs(12) },
    summaryLabel: { fontSize: fs(13), color: '#666', fontWeight: '600' },
    summaryValue: { fontSize: fs(14), color: '#111', fontWeight: '800' },
    summaryService: { fontSize: fs(12), color: '#666', fontWeight: '700' },
    summaryPricing: { fontSize: fs(12), color: '#333', fontWeight: '700' },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: vs(12),
        paddingHorizontal: s(12),
        backgroundColor: '#f9fafb',
        borderWidth: 1,
        borderColor: '#eee',
        marginBottom: vs(8),
        borderRadius: ms(12)
    },
    contactIcon: {
        width: s(40),
        height: s(40),
        borderRadius: s(20),
        backgroundColor: '#fff6e0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: s(12)
    },
    contactName: { fontSize: fs(14), fontWeight: '700', color: '#333' },
    contactPhone: { fontSize: fs(12), color: '#666', marginTop: vs(2) },
    addNewContactBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: vs(14),
        borderWidth: 1,
        borderColor: Colors.primary,
        borderRadius: ms(12),
        marginTop: vs(16),
        marginBottom: vs(24),
        borderStyle: 'dashed'
    },
    addNewContactText: { fontSize: fs(14), fontWeight: '600', color: Colors.primary, marginLeft: s(8) }
});

export default BottomSheetMenu
