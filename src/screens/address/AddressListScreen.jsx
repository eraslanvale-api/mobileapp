import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { s, vs, fs, ms } from '../../utils/scale';
import { useJourney } from '../../context/JourneyContext';
import { useConfig } from '../../context/ConfigContext';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import { listAddresses, createAddress, deleteAddress } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { Colors } from '../../constants/Colors';

export default function AddressListScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const { setPickup, setDropoff, updateStop } = useJourney();
  const { showToast } = useToast();
  const selectFor = route?.params?.selectFor ?? null;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const load = async () => {
    setLoading(true);
    try {
      const resp = await listAddresses();
      const arr = Array.isArray(resp) ? resp : (resp?.data ?? resp?.results ?? []);
      const normalized = arr.map((x) => ({
        id: x?.id ?? String(Math.random()),
        title: x?.title ?? x?.name ?? 'Adres',
        address: x?.description ?? x?.address ?? x?.detail ?? '',
        isDefault: x?.is_default ?? false,
        lat: x?.lat ?? x?.location?.lat ?? null,
        lng: x?.lng ?? x?.location?.lng ?? null,
        location: { lat: x?.lat ?? x?.location?.lat, lng: x?.lng ?? x?.location?.lng },
      }));
      setItems(normalized);
    } catch (error) {
      // console.log('Adres listesi hatası:', error);
      // Hata durumunda boş liste göster veya kullanıcıya bildir
      setItems([]); 
      showToast('Adresler yüklenemedi', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      load();
    }
  }, [isFocused]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onSelect = (item) => {
    const data = { address: item.address, location: { lat: item.lat ?? item.location?.lat, lng: item.lng ?? item.location?.lng } };
    if (!data.location?.lat || !data.location?.lng) return;
    if (selectFor === 'pickup') setPickup(data);
    else if (selectFor === 'dropoff') setDropoff(data);
    else if (typeof selectFor === 'string' && selectFor.startsWith('stop_')) {
      const id = selectFor.replace('stop_', '');
      updateStop(id, data);
    }
    
    navigation.goBack();
  };

  const onAdd = async ({ coordinate, address }) => {
    try {
      const payload = { title: 'Yeni Adres', description: address, lat: coordinate.latitude, lng: coordinate.longitude };
      await createAddress(payload);
      showToast('Adres eklendi', 'success');
      await load();
    } catch (error) {
      // console.log('Adres ekleme hatası:', error);
      showToast('Adres eklenemedi', 'error');
    }
  };

  const onDelete = async (id) => {
    try {
      await deleteAddress(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      showToast('Adres silindi', 'success');
    } catch (_) {}
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.itemRow}
      onPress={() => {
        if (selectFor) { onSelect(item); return; }
        navigation.navigate('AddressUpdate', { id: item.id, initial: item });
      }}
      activeOpacity={0.85}
    >
      <View style={{ flex: 1}}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          {item.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Varsayılan</Text>
            </View>
          )}
        </View>
        <Text style={styles.itemValue} numberOfLines={1}>{item.address}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#bbb" />
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: s(6) }}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Adreslerim</Text>
      </View>

      {loading ? (
        <View style={{ paddingTop: vs(20),flex:1,justifyContent:'center' ,alignItems: 'center' }}>
          <ActivityIndicator color="#f4a119" />
        </View>
      ) : items.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: s(16) }}>
          <Ionicons name="bookmark-outline" size={ms(64)} color="#bdbdbd" />
          <Text style={{ marginTop: vs(14), fontSize: fs(20), fontWeight: '800', color: Colors.black }}>Kayıtlı adres oluştur</Text>
          <Text style={{ marginTop: vs(6), fontSize: fs(13), color: Colors.darkGray, textAlign: 'center' }}>Henüz bir kayıtlı adresiniz bulunmamaktadır. İlk kayıtlı adresinizi oluşturun.</Text>
          <TouchableOpacity style={styles.emptyAddBtn} onPress={() => navigation.navigate('AddressCreate')}>
            <Ionicons name="add" size={18} color={Colors.black} />
            <Text style={styles.emptyAddText}>Yeni adres ekle</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: s(16), paddingBottom: vs(20) }}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />
      )}
      {(!loading && items.length > 0) ? (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.footerBtn} onPress={() => navigation.navigate('AddressCreate')} activeOpacity={0.85}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.footerBtnText}>Yeni adres ekle</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingTop: vs(10), paddingHorizontal: s(16), paddingBottom: vs(8),marginBottom:30,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        marginBottom:s(10)


  },
  headerTitle: { marginLeft: s(8), fontSize: fs(20), fontWeight: '800', color: '#333', flex: 1 },
  addBtn: { width: s(32), height: s(32), borderRadius: s(16), backgroundColor: '#f4a119', alignItems: 'center', justifyContent: 'center' },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: vs(14), borderBottomWidth: 1, borderBottomColor: '#f1f1f1'},
  itemTitle: { fontSize: fs(16), fontWeight: '700', color: '#333' },
  defaultBadge: { marginLeft: s(8), backgroundColor: '#e3f2fd', paddingHorizontal: s(6), paddingVertical: vs(2), borderRadius: ms(4) },
  defaultBadgeText: { fontSize: fs(10), color: Colors.primary, fontWeight: '600' },
  itemValue: { fontSize: fs(13), color: '#666', marginTop: vs(4) },
  deleteBtn: { marginRight: s(6), padding: s(4) },
  emptyAddBtn: { marginTop: vs(18), paddingVertical: vs(12), paddingHorizontal: s(14), borderWidth: 1, borderColor: '#e0e0e0', borderRadius: ms(12), flexDirection: 'row', alignItems: 'center' },
  emptyAddText: { marginLeft: s(8), fontSize: fs(15), color: Colors.black, fontWeight: '700' },
    footer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 16,
        backgroundColor: '#fff',
        paddingHorizontal: s(16),
        borderTopWidth: 0,
    },
    footerBtn: {
        height: vs(52),
        backgroundColor: Colors.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection:'row'
    },
    footerBtnText: {
        color: '#fff',
        fontSize: fs(16),
        fontWeight: '700',
    },});
