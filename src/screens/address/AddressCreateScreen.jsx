import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Keyboard, Platform,  } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { s, vs, fs, ms } from '../../utils/scale';
import { Colors } from '../../constants/Colors';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import { createAddress } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';

export default function AddressCreateScreen() {
  const navigation = useNavigation();
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const valueObj = useMemo(() => ({ address }), [address]);

  const onAutoSelect = ({ address: addr, location: loc }) => {
    setAddress(addr || '');
    if (loc?.lat && loc?.lng) setLocation({ lat: loc.lat, lng: loc.lng });
  };

  const onMapSelect = ({ coordinate, address: addr }) => {
    setAddress(addr || '');
    setLocation({ lat: coordinate.latitude, lng: coordinate.longitude });
  };

  const validate = () => {
    const ok = title.trim().length >= 2 && address.trim().length > 0 && location?.lat && location?.lng;
    return ok;
  };

  const onSave = async () => {
    Keyboard.dismiss()
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = { title, description: address, lat: location.lat, lng: location.lng, is_default: isDefault };
      await createAddress(payload);
      showToast('Adres eklendi', 'success');
      navigation.goBack();
    } catch (_) {
      showToast('Adres eklenemedi', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: s(6) }}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yeni adres ekle</Text>
      </View>

      <View style={{ paddingHorizontal: s(16),marginTop:s(30)  }}>
        <Text style={styles.label}>Başlık</Text>
        <View style={styles.inputWrapper}>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Örn: Ev, İş" placeholderTextColor={Colors.gray} />
        </View>

        <Text style={[styles.label, { marginTop: vs(14) }]}>Adres</Text>
        <AddressAutocomplete
          placeholder="Adres arayın veya konum seçin"
          value={valueObj}
          onSelect={onAutoSelect}
          onClear={() => { setAddress(''); setLocation(null); }}
          enableCurrent={true}
        />
      </View>

      <View style={{ paddingHorizontal: s(16), marginTop: vs(10) }}>
        <TouchableOpacity style={styles.mapSelectBtn} onPress={() => navigation.navigate('LocationPicker', { target: 'address_create', onSelect: onMapSelect })}>
          <Ionicons name="map-outline" size={18} color="#fff" />
          <Text style={styles.mapSelectText}>Haritadan seç</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.checkboxRow} 
        onPress={() => setIsDefault(!isDefault)} 
        activeOpacity={0.8}
      >
        <Ionicons 
          name={isDefault ? "checkbox" : "square-outline"} 
          size={24} 
          color={isDefault ? Colors.primary : Colors.gray} 
        />
        <Text style={styles.checkboxLabel}>Varsayılan adres olarak ayarla</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerBtn, (!validate() || loading) && styles.footerBtnDisabled]}
          onPress={onSave}
          disabled={loading || !validate()}
          activeOpacity={(loading || !validate()) ? 1 : 0.85}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <Text style={[styles.footerBtnText, (!validate() || loading) && styles.footerBtnTextDisabled]}>Kaydet</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingTop: vs(10), paddingHorizontal: s(16), paddingBottom: vs(8),
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        marginBottom:s(10)

   },
  headerTitle: { marginLeft: s(8), fontSize: fs(20), fontWeight: '800', color: '#333' },
  label: { fontSize: fs(14), color: Colors.darkGray, fontWeight:'700', marginBottom: vs(6) },
  inputWrapper: { borderWidth: 1, borderColor: Colors.lightGray, paddingHorizontal: s(12), paddingVertical: vs(8), backgroundColor: '#fff' },
  input: { paddingVertical: vs(6), fontSize: fs(14), color: Colors.black },
  mapSelectBtn: { marginTop: vs(12), backgroundColor: Colors.secondary, paddingVertical: vs(12), alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  mapSelectText: { marginLeft: s(8), color: '#fff', fontSize: fs(14), fontWeight: '700' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: s(16), marginTop: vs(20) },
  checkboxLabel: { marginLeft: s(10), fontSize: fs(14), color: '#333', fontWeight: '600' },
  footer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: s(16),
        backgroundColor: '#fff',
        paddingHorizontal: s(16),
        paddingVertical:s(16),
        borderTopWidth: 0,
    },
    footerBtn: {
        height: vs(52),
        backgroundColor: Colors.secondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerBtnText: {
        color: '#fff',
        fontSize: fs(16),
        fontWeight: '700',
    },
    footerBtnDisabled: {
        backgroundColor: Colors.lightGray,
    },
    footerBtnTextDisabled: {
        opacity: 0.9,
    },
});
