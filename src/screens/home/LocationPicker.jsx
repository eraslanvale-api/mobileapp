import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, BackHandler } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { s, vs, fs, ms } from '../../utils/scale';

const FALLBACK_REGION = {
  latitude: 41.015137,
  longitude: 28.97953,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function LocationPicker() {
  const navigation = useNavigation();
  const route = useRoute();
  const onSelect = route.params?.onSelect;
  const target = route.params?.target;

  const mapRef = useRef(null);
  const [region, setRegion] = useState(FALLBACK_REGION);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState('');
  const [hasPermission, setHasPermission] = useState(false);
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      if (mounted) setHasPermission(granted);
      if (!granted) { if (mounted) { setLoading(false); setResolving(false); } return; }

      const last = await Location.getLastKnownPositionAsync();
      const fallback = FALLBACK_REGION;
      const base = last ? {
        latitude: last.coords.latitude,
        longitude: last.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      } : fallback;
      if (mounted) {
        setRegion(base);
        mapRef.current?.animateToRegion(base, 300);
      }
      try {
        setResolving(true);
        const res = await Location.reverseGeocodeAsync({ latitude: base.latitude, longitude: base.longitude });
        const a = res && res[0];
        if (a) {
          const parts = [a.street, a.district, a.city].filter(Boolean);
          const addr = parts.length > 0 ? parts.join(', ') : 'Seçilen Konum';
          if (mounted) setAddress(addr);
        }
      } catch (_) {}
      if (mounted) { setLoading(false); setResolving(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const onRegionChangeComplete = async (r) => {
    setRegion(r);
    setResolving(true);
    try {
      const res = await Location.reverseGeocodeAsync({ latitude: r.latitude, longitude: r.longitude });
      const a = res && res[0];
      if (a) {
        const parts = [a.street, a.district, a.city].filter(Boolean);
        const addr = parts.length > 0 ? parts.join(', ') : 'Seçilen Konum';
        setAddress(addr);
      }
    } catch (_) {}
    setResolving(false);
  };

  const locateMe = async () => {
    if (!hasPermission) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);
      if (!granted) return;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const r = { latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    setRegion(r);
    mapRef.current?.animateToRegion(r, 300);
  };

  const confirm = () => {
    const coord = { latitude: region.latitude, longitude: region.longitude };
    onSelect?.({ coordinate: coord, address });
    navigation.goBack();
  };

  useFocusEffect(React.useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });
    return () => sub.remove();
  }, [navigation]));

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation={true}
        showsMyLocationButton={false}
        provider={PROVIDER_GOOGLE}
      />

      <View style={styles.centerPinContainer} pointerEvents="none">
        <Ionicons name="pin" size={s(36)} color="#f4a119" />
      </View>

      

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={s(20)} color="#333" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.locateFab} onPress={locateMe}>
        <Ionicons name="navigate-outline" size={s(22)} color="#fff" />
      </TouchableOpacity>

      <View style={styles.footer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: vs(10) }}>
          <Ionicons
            name={String(target || '').startsWith('stop_') ? 'bookmark-outline' : (target === 'dropoff' ? 'flag-outline' : 'navigate')}
            size={s(18)}
            color="#f4a119"
            style={{ marginRight: s(8) }}
          />
          <Text style={styles.headerText} numberOfLines={1}>
            {String(target || '').startsWith('stop_') ? 'Durak için konum seçiliyor' : (target === 'dropoff' ? 'Varış için konum seçiliyor' : (target === 'pickup' ? 'Başlangıç için konum seçiliyor' : 'Konum seç'))}
          </Text>
        </View>
        <View style={styles.addressChip}>
          <Text style={styles.addressChipText} numberOfLines={1}>{address || 'Konum belirleniyor...'}</Text>
        </View>
        <TouchableOpacity style={[styles.confirmBtn, (loading || resolving || !address) && styles.confirmBtnDisabled]} onPress={confirm} disabled={loading || resolving || !address}>
          {(loading || resolving || !address) ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmText}>Onayla</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerPinContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCard: {
    position: 'absolute',
    top: vs(60),
    left: s(16),
    right: s(16),
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: ms(12),
    paddingHorizontal: s(12),
    paddingVertical: vs(10),
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: ms(8),
    shadowOffset: { width: 0, height: 2 },
  },
  backBtn: { position: 'absolute', top: vs(20), left: s(16), backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: ms(20), padding: s(8), elevation: 6 },
  headerText: { flex: 1, color: '#333', fontSize: fs(14), fontWeight: '600' },
  headerAction: { marginLeft: s(8) },
  locateFab: { position: 'absolute', right: s(16), bottom: vs(220), width: s(52), height: s(52), borderRadius: s(26), backgroundColor: '#f4a119', alignItems: 'center', justifyContent: 'center', elevation: 6 },
  footer: {
    position: 'absolute',
    bottom: vs(40),
    left: s(16),
    right: s(16),
    backgroundColor: '#fff',
    borderRadius: ms(16),
    padding: s(16),
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: ms(10),
    shadowOffset: { width: 0, height: 3 },
    alignItems: 'center',
  },
  addressChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', borderRadius: ms(12), paddingVertical: vs(8), paddingHorizontal: s(12), marginBottom: vs(10), width: '100%' },
  addressChipText: { flex: 1, color: '#333', fontSize: fs(13), fontWeight: '600' },
  confirmBtn: { backgroundColor: '#000', borderRadius: ms(12), paddingVertical: vs(12), paddingHorizontal: s(16), alignItems: 'center', width: '100%' },
  confirmBtnDisabled: { opacity: 0.8 },
  confirmText: { color: '#fff', fontWeight: '700', fontSize: fs(16) },
});
