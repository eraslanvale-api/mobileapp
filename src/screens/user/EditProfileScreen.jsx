import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Keyboard,Platform, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { s, vs, fs, ms } from '../../utils/scale';
import { Colors } from '../../constants/Colors';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ErrorBanner from '../../components/ErrorBanner';
import { updateProfile } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import {useAuth} from '../../context/AuthContext'

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { user, setUser } = useAuth();
  
  // Parametreden gelen initial değer veya mevcut user verisi
  const source = route?.params?.initial || user || {};
  const onSaved = route?.params?.onSaved;

  const getInitialName = () => {
    if (source?.full_name) return source.full_name;
    if (source?.fullName) return source.fullName;
    // Fallback for legacy data
    if (source?.first_name || source?.last_name) return `${source.first_name || ''} ${source.last_name || ''}`.trim();
    if (source?.firstName || source?.lastName) return `${source.firstName || ''} ${source.lastName || ''}`.trim();
    return '';
  };

  const [fullName, setFullName] = useState(getInitialName());
  const [phoneRaw, setPhoneRaw] = useState('');
  const [email, setEmail] = useState(String(source?.email || source?.Email || ''));
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Hem phoneNumber hem Telefon alanını kontrol et
    const rawInit = String(source?.phone_number || source?.phoneNumber || source?.Telefon || '').replace(/\D/g, '');
    let afterCc = rawInit;
    if (rawInit.startsWith('90')) {
      afterCc = rawInit.slice(2);
    } else if (rawInit.startsWith('0')) {
      afterCc = rawInit.slice(1);
    }
    setPhoneRaw(afterCc.slice(0, 10));
  }, [source]);

  const formatTrPhone = (digits) => {
    const d = String(digits || '').replace(/\D/g, '').slice(0, 10);
    const p1 = d.slice(0, 3);
    const p2 = d.slice(3, 6);
    const p3 = d.slice(6, 8);
    const p4 = d.slice(8, 10);
    let out = '';
    if (p1) out += `${p1}`;
    if (p2) out += ` ${p2}`;
    if (p3) out += ` ${p3}`;
    if (p4) out += ` ${p4}`;
    return out.trim();
  };

  const validate = () => {
    const e = {};
    const fn = String(fullName).trim();
    const em = String(email).trim();
    if (!fn) e.fullName = 'Ad Soyad gerekli';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) e.email = 'Geçerli e-posta girin';
    if (phoneRaw.length !== 10) e.phoneNumber = 'Telefon 10 hane olmalı';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

   

  const onSubmit = async () => {
    Keyboard.dismiss()
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = { 
        full_name: fullName, 
        email: email,
        phone_number: `+90${phoneRaw}`
      };
      const data = await updateProfile(payload);
      
      // API yanıt kontrolü
      const responseData = data?.data;
      
      // Başarılı durumda
      const updatedUser = responseData ? { ...user, ...responseData } : { ...user, ...payload }; 
      setErrors({});
      showToast('Profil güncellendi', 'success');
      setUser(updatedUser)
      if (onSaved) onSaved(updatedUser);
      navigation.goBack();
    } catch (e) {
      const d = e?.normalized?.data ?? e?.response?.data ?? null;
      const arr = Array.isArray(d?.errors) ? d.errors.map((x) => x?.message ?? String(x)) : [];
      const msg = e?.normalized?.message ?? e?.message ?? 'Güncelleme başarısız';
      setErrors({ general: msg, details: arr });
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: s(6) }}>
            <Ionicons name="arrow-back" size={22} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bilgileri Düzenle</Text>
        </View>

        <ScrollView style={{ flexGrow: 1 }} contentContainerStyle={{ paddingHorizontal: s(16), paddingTop: vs(24), paddingBottom: vs(140) }} keyboardShouldPersistTaps="handled">
          <ErrorBanner message={errors.general} messages={errors.details} onClose={() => setErrors((p) => ({ ...p, general: null, details: [] }))} />

          <View style={styles.field}>
            <Text style={styles.label}>Ad Soyad</Text>
            <View style={[styles.inputWrapper, errors.fullName && styles.inputError]}>
              <TextInput style={[styles.input, { paddingLeft: s(10) }]} value={fullName} onChangeText={setFullName} placeholder="Ad Soyad" placeholderTextColor={Colors.gray} />
            </View>
            {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Telefon</Text>
            <View style={[styles.inputWrapper, errors.phoneNumber && styles.inputError, { flexDirection: 'row', alignItems: 'center' }]}>
              <View style={styles.prefixBox}><Text style={styles.prefixText}>+90</Text></View>
              <TextInput
                style={[styles.input, { paddingLeft: s(10), flex: 1 }]}
                keyboardType="number-pad"
                value={formatTrPhone(phoneRaw)}
                onChangeText={(t) => setPhoneRaw(String(t).replace(/\D/g, '').slice(0, 10))}
                placeholder="5xx xxx xx xx"
                placeholderTextColor={Colors.gray}
              />
            </View>
            {errors.phoneNumber ? <Text style={styles.errorText}>{errors.phoneNumber}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>E-posta</Text>
            <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
              
              <TextInput style={[styles.input, { paddingLeft: s(10) }]} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} placeholder="E-posta" placeholderTextColor={Colors.gray} />
            </View>
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: vs(16) }]}>
          <TouchableOpacity style={styles.footerBtn} activeOpacity={0.85} onPress={onSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.footerBtnText}>Kaydet</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingTop: vs(10), paddingHorizontal: s(16), paddingBottom: vs(8) },
  headerTitle: { marginLeft: s(8), fontSize: fs(20), fontWeight: '800', color: '#333' },
  field: { marginTop: vs(12) },
  label: { fontSize: fs(14), color: Colors.darkGray, marginBottom: vs(8),fontWeight:'700' },
  inputWrapper: { borderWidth: 1, borderColor: Colors.lightGray, paddingHorizontal: s(12), paddingVertical: vs(10), backgroundColor: '#fff', borderRadius: ms(8) },
  input: { paddingVertical: vs(6), fontSize: fs(16), color: Colors.black },
  inputIcon: { position: 'absolute', left: s(8), top: vs(10) },
  inputError: { borderColor: Colors.red },
  errorText: { color: Colors.red, fontSize: fs(12), marginTop: vs(6) },
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
    },
    footerBtnText: {
        color: '#fff',
        fontSize: fs(16),
        fontWeight: '700',
    },
  prefixBox: { marginLeft: s(10), paddingHorizontal: s(10), paddingVertical: vs(4), borderRadius: ms(6), backgroundColor: '#f7f7f7', borderWidth: 1, borderColor: '#eee' },
  prefixText: { fontSize: fs(15), color: Colors.darkGray, fontWeight: '700' },
});

