import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View, Linking, Platform } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useConfig } from '../../context/ConfigContext';
import { useJourney } from '../../context/JourneyContext';
import { s, vs, fs, ms } from "../../utils/scale";
import { Colors } from "../../constants/Colors";
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Constants from 'expo-constants';

import { computeRoutes, reverseGeocode } from '../../api/googleMaps';
import polyline from '@mapbox/polyline';

const FALLBACK_REGION = {
  latitude: 41.015137,
  longitude: 28.97953,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const MapScreen = ({onUserLocationReady}) => {
  const mapRef = useRef(null);
  const [region, setRegion] = useState(FALLBACK_REGION);
  const regionRef = useRef(FALLBACK_REGION); // Track region without re-renders
  const { config } = useConfig();
  const { route, setRouteDetails, isSelectingLocation, dropoff, setPickup, setDropoff, setIsSelectingLocation, stops, updateStop,
    pickup, sheetIndex, permPromptVisible, setPermPromptVisible, sheetSnapFn } = useJourney();

  const loaderAnim = useRef(new Animated.Value(1)).current;
  const [hasPermission, setHasPermission] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [loading, setLoading] = useState(true);

  const [userCoord, setUserCoord] = useState(null);
  const userMovedRef = useRef(false);
  const isAutoFittingRef = useRef(false);
  const lastFitKeyRef = useRef(null);
  const directionsTimerRef = useRef(null);
  const directionsCacheRef = useRef(new Map());
  const lastRouteKeyRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);
      if (!granted) { setLoading(false); return; }

      const last = await Location.getLastKnownPositionAsync();
      if (last) {
        const r0 = { latitude: last.coords.latitude, longitude: last.coords.longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 };
        setRegion(r0);
        regionRef.current = r0;
        setUserCoord({ latitude: r0.latitude, longitude: r0.longitude });
        onUserLocationReady?.({ latitude: r0.latitude, longitude: r0.longitude });
        mapRef.current?.animateToRegion(r0, 300);
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const r = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 };
      setRegion(r);
      regionRef.current = r;
      setUserCoord({ latitude: r.latitude, longitude: r.longitude });
      onUserLocationReady?.({ latitude: r.latitude, longitude: r.longitude });
      mapRef.current?.animateToRegion(r, 300);

      // Auto-populate pickup if empty
      if (!pickup) {
        try {
          const res = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          if (res && res[0]) {
            const a = res[0];
            const parts = [a.street, a.district, a.city].filter(Boolean);
            const address = parts.length > 0 ? parts.join(', ') : 'Mevcut Konum';
            setPickup({ address, location: { lat: loc.coords.latitude, lng: loc.coords.longitude } });
            setUserAddress(address);
          }
        } catch (e) {
          // console.log('Auto-pickup error:', e);
        }
      }

      setLoading(false);
    })();
  }, []);



  // removed unused pulse animation
  

  useEffect(() => {
    Animated.timing(loaderAnim, { toValue: loading ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [loading]);

  // Fit to route when it changes
  useEffect(() => {
    if (!mapRef.current || !route?.polyline || route.polyline.length === 0) return;
    const first = route.polyline[0];
    const last = route.polyline[route.polyline.length - 1];
    const key = `${route.polyline.length}:${first?.latitude}:${first?.longitude}:${last?.latitude}:${last?.longitude}`;
    if (lastFitKeyRef.current === key) return;
    isAutoFittingRef.current = true;
    mapRef.current.fitToCoordinates(route.polyline, {
      edgePadding: { top: 220, right: 50, bottom: 350, left: 50 },
      animated: true,
    });
    lastFitKeyRef.current = key;
    setTimeout(() => { isAutoFittingRef.current = false; }, 600);
  }, [route]);

  useEffect(() => {
    const hasPickup = !!pickup?.location;
    const hasDropoff = !!dropoff?.location;
    const hasStopDest = Array.isArray(stops) ? stops.some((s) => !!s?.location) : false;
    if (!hasPickup || (!hasDropoff && !hasStopDest)) {
      setRouteDetails(null);
    }
  }, [pickup, dropoff, stops]);

  useEffect(() => {
    const hasPickup = !!pickup?.location;
    const hasDropoff = !!dropoff?.location;
    const stopList = Array.isArray(stops) ? stops.filter((s) => !!s?.location) : [];
    if (!hasPickup || (!hasDropoff && stopList.length === 0)) return;
    
    // Config'den gelen API anahtarını önceliklendir
    const API_KEY = config?.googleMapsApiKey || (Platform.OS === 'ios' 
      ? Constants.expoConfig?.extra?.googleMapsApiKeyIos
      : Constants.expoConfig?.extra?.googleMapsApiKeyAndroid);
      
    if (!API_KEY) return;

    const origin = `${pickup.location.lat},${pickup.location.lng}`;
    const destLat = hasDropoff ? dropoff.location.lat : stopList[stopList.length - 1].location.lat;
    const destLng = hasDropoff ? dropoff.location.lng : stopList[stopList.length - 1].location.lng;
    const destination = `${destLat},${destLng}`;
    const waypointsArr = stopList.map((s) => `${s.location.lat},${s.location.lng}`);
    if (!hasDropoff && waypointsArr.length > 0) waypointsArr.pop();
    const waypointsStr = waypointsArr.join('|');
    const routeKey = `${origin}|${destination}|${waypointsStr}`;

    const cached = directionsCacheRef.current.get(routeKey);
    const now = Date.now();
    if (cached && now - cached.ts < 10 * 60 * 1000) {
      lastRouteKeyRef.current = routeKey;
      setRouteDetails(cached.value);
      return;
    }

    if (directionsTimerRef.current) {
      clearTimeout(directionsTimerRef.current);
    }
    directionsTimerRef.current = setTimeout(async () => {
      try {
        const data = await computeRoutes({
            origin,
            destination,
            waypoints: waypointsArr,
            apiKey: API_KEY
        });

        if (data?.routes?.length > 0) {
          const r = data.routes[0];
          const encodedPolyline = r.polyline.encodedPolyline;
          const points = polyline.decode(encodedPolyline).map((p) => ({ latitude: p[0], longitude: p[1] }));
          
          const distanceKm = (r.distanceMeters || 0) / 1000;
          // duration is returned as string like "123s"
          const durationSeconds = r.duration ? parseInt(r.duration.replace('s', ''), 10) : 0;
          const durationMins = Math.ceil(durationSeconds / 60);

          const value = { polyline: points, distanceKm, durationMins };
          directionsCacheRef.current.set(routeKey, { ts: Date.now(), value });
          lastRouteKeyRef.current = routeKey;
          setRouteDetails(value);
        } else {
          setRouteDetails(null);
        }
      } catch (error) {
        // console.error('Routes API Error:', error?.response?.data || error.message);
        if (error.message === 'API Key is required') {
             alert('Google Maps API Key eksik.');
        }
        setRouteDetails(null);
      }
    }, 800);

    return () => {
      if (directionsTimerRef.current) {
        clearTimeout(directionsTimerRef.current);
      }
    };
  }, [pickup, dropoff, stops, config]);

  const locateMe = async () => {
    sheetSnapFn?.(0);
    if (!hasPermission) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);
      if (!granted) { setPermPromptVisible(true); sheetSnapFn?.(0); return; }
    }
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,     // çok hızlı
      maximumAge: 5000,                    // 5 saniyelik cache izin verir
      timeout: 4000,                       // en fazla 4 saniye bekle
    }); 
    const r = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 };
    setRegion(r);
    regionRef.current = r;
    mapRef.current?.animateToRegion(r, 300);
    try {
      const res = await Location.reverseGeocodeAsync({ latitude: r.latitude, longitude: r.longitude });
      if (res && res[0]) {
        const a = res[0];
        const parts = [a.street, a.district, a.city].filter(Boolean);
        const address = parts.length > 0 ? parts.join(', ') : 'Mevcut Konum';
        setUserAddress(address);
      } else {
        // Config'den gelen API anahtarını önceliklendir
        const API_KEY = config?.googleMapsApiKey || (Platform.OS === 'ios'
          ? Constants.expoConfig?.extra?.googleMapsApiKeyIos
          : Constants.expoConfig?.extra?.googleMapsApiKeyAndroid);
          
        if (API_KEY && API_KEY !== 'YOUR_GOOGLE_API_KEY_HERE') {
          const addr = await reverseGeocode(r.latitude, r.longitude, API_KEY);
          if (addr) setUserAddress(addr);
        }
      }
    } catch (_) {

    }
  };


  const onRegionChange = (r) => {
    regionRef.current = r;
  };

  const onRegionChangeComplete = (r) => {
    regionRef.current = r;
    setRegion(r);
    if (!isAutoFittingRef.current) {
      userMovedRef.current = true;
    }
  };

  // Fit map to markers/route when they change
  useEffect(() => {
    if (!mapRef.current) return;
    if (userMovedRef.current) return;

    const markers = [];
    if (pickup?.location) markers.push({ latitude: pickup.location.lat, longitude: pickup.location.lng });
    if (dropoff?.location) markers.push({ latitude: dropoff.location.lat, longitude: dropoff.location.lng });
    stops.forEach(stop => { if (stop.location) markers.push({ latitude: stop.location.lat, longitude: stop.location.lng }); });

    if (markers.length > 0) {
      isAutoFittingRef.current = true;
      mapRef.current.fitToCoordinates(markers, {
        edgePadding: { top: 220, right: 50, bottom: 350, left: 50 },
        animated: true,
      });
      setTimeout(() => { isAutoFittingRef.current = false; }, 600);
    } else if (route?.polyline) {
      isAutoFittingRef.current = true;
      mapRef.current.fitToCoordinates(route.polyline, {
        edgePadding: { top: 100, right: 50, bottom: 350, left: 50 },
        animated: true,
      });
      setTimeout(() => { isAutoFittingRef.current = false; }, 1000);
    }
  }, [pickup, dropoff, stops, route]);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        onRegionChange={onRegionChange}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation={true}
        provider={PROVIDER_GOOGLE}
      >
        {/* Pickup Marker - Green */}
        {pickup?.location && (
          <Marker
            coordinate={{ latitude: pickup.location.lat, longitude: pickup.location.lng }}
            title="Başlangıç"
            description={pickup.address}
            pinColor="#4CAF50"
          />
        )}

        {/* Stops Markers - Yellow/Amber */}
        {stops.map((stop, index) => (
          stop.location && (
            <Marker
              key={stop.id}
              coordinate={{ latitude: stop.location.lat, longitude: stop.location.lng }}
              title={`Durak ${index + 1}`}
              description={stop.address}
              pinColor="#FFC107"
            />
          )
        ))}

        {/* Dropoff Marker - Red */}
        {dropoff?.location && (
          <Marker
            coordinate={{ latitude: dropoff.location.lat, longitude: dropoff.location.lng }}
            title="Varış"
            description={dropoff.address}
            pinColor="#F44336"
          />
        )}

        {/* Route Polyline */}
        {route?.polyline && (
          <Polyline
            coordinates={route.polyline}
            strokeWidth={4}
            strokeColor="#0066CC"
          />
        )}
        
      </MapView>
      {route?.distanceKm != null && (
        <View style={styles.distanceBubble}>
          <Ionicons name="car-outline" size={16} color="#f4a119" />
          <Text style={styles.distanceText}>{route.distanceKm.toFixed(1)} km</Text>
        </View>
      )}
      {
        loading && (
          <Animated.View style={[styles.loaderBar, { opacity: loaderAnim, transform: [{ translateY: loaderAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }]}>
            <ActivityIndicator size="small" color="#f4a119" />
            <Text style={styles.loaderText}>Konum alınıyor...</Text>
          </Animated.View>

        )
      }

      {/* Locate Me FAB */}
      {!isSelectingLocation && (
        <View style={[styles.fab, { bottom: vs(60) }]}> 
          <TouchableOpacity style={styles.fabBtn} onPress={locateMe}>
            <Ionicons name="navigate-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
      {userAddress?.length > 0 && (
        <View style={styles.addressCard}>
          <Ionicons name="navigate" size={16} color="#f4a119" style={{ marginRight: s(8) }} />
          <Text style={styles.addressCardText} numberOfLines={1}>{userAddress}</Text>
        </View>
      )}


      {permPromptVisible && (
        <View style={styles.permPrompt}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: vs(10) }}>
            <Ionicons name="location-outline" size={20} color="#f4a119" style={{ marginRight: s(8) }} />
            <Text style={styles.permTitle}>Konum izni gerekli</Text>
          </View>
          <Text style={styles.permText}>Konumunuza erişim izni vermeniz gerekir. Ayarlardan izin verebilirsiniz.</Text>
          <View style={styles.permActions}>
            <TouchableOpacity style={styles.permPrimary} onPress={() => { Linking.openSettings?.(); }}>
              <Text style={styles.permPrimaryText}>Ayarları Aç</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.permClose} onPress={() => setPermPromptVisible(false)}>
              <Text style={styles.permCloseText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

    </View>

  )
}
const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loaderBar: { position: 'absolute', left: s(16), right: s(16), top: vs(90), backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: ms(12), paddingHorizontal: s(12), paddingVertical: vs(10), flexDirection: 'row', alignItems: 'center', elevation: 4 },
  loaderText: { marginLeft: s(8), color: '#333', fontSize: fs(14) },
  fab: {
    position: 'absolute',
    right: s(16),
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: ms(4),
    shadowOffset: { width: 0, height: 2 }
  },
  fabBtn: { backgroundColor: '#f4a119', width: s(52), height: s(52), borderRadius: s(26), alignItems: 'center', justifyContent: 'center' },
  addressCard: {
    position: 'absolute',
    top: vs(70),
    left: s(16),
    right: s(16),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: ms(12),
    paddingVertical: vs(10),
    paddingHorizontal: s(12),
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: ms(8),
    shadowOffset: { width: 0, height: 2 }
  },
  addressCardText: { flex: 1, color: '#333', fontSize: fs(14), fontWeight: '600' },
  addressCardBtn: { marginLeft: s(8) },
  distanceBubble: { position: 'absolute', top: vs(112), right: s(12), backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: ms(12), paddingVertical: vs(6), paddingHorizontal: s(10), flexDirection: 'row', alignItems: 'center', elevation: 4 },
  distanceText: { marginLeft: s(6), fontSize: fs(12), color: '#333', fontWeight: '700' },
  permPrompt: { position: 'absolute', bottom: vs(60), left: s(16), right: s(16), backgroundColor: '#fff', borderRadius: ms(16), padding: s(16), elevation: 10, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: ms(8) },
  permTitle: { fontSize: fs(16), fontWeight: '700', color: '#333' },
  permText: { fontSize: fs(13), color: '#666', marginBottom: vs(10) },
  permActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  permPrimary: { backgroundColor: '#f4a119', paddingVertical: vs(10), paddingHorizontal: s(16), borderRadius: ms(12) },
  permPrimaryText: { color: '#fff', fontWeight: '700' },
  permClose: { backgroundColor: '#f5f5f5', paddingVertical: vs(10), paddingHorizontal: s(16), borderRadius: ms(12), borderWidth: 1, borderColor: '#e0e0e0' },
  permCloseText: { color: '#333', fontWeight: '600' },

})
export default MapScreen;
