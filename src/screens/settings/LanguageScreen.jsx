import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { s, vs, fs, ms } from '../../utils/scale';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '../../context/ToastContext';

export default function LanguageScreen({navigation}) {
  const { showToast } = useToast();
  const [lang, setLang] = useState('tr');

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('@app_lang');
        if (raw) setLang(raw);
      } catch (_) {}
    })();
  }, []);

  const onSelect = async (code) => {
    try {
      await AsyncStorage.setItem('@app_lang', code);
      setLang(code);
      const msg = code === 'tr' ? 'Dil Türkçe olarak ayarlandı' : 'Language set to English';
      showToast(msg, 'success');
      navigation.goBack();
    } catch (_) {
      showToast('Dil ayarı kaydedilemedi', 'error');
    } finally {
    }
  };

  const isTrSelected = lang === 'tr';
  const isEnSelected = lang === 'en';

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: s(6) }}>
          <Ionicons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dil Ayarları</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: vs(24) }}>

        {/* Türkçe */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.langCard, isTrSelected && styles.langCardSelected]}
          onPress={() => onSelect('tr')}
        >
          <View style={styles.langLeft}>
            <View style={{ marginLeft: s(10) }}>
              <Text style={[styles.langTitle, isTrSelected && styles.langTitleSelected]}>Türkçe (TR)</Text>
            </View>
          </View>

          {isTrSelected ? (
            <View style={styles.checkWrapSelected}>
              <Ionicons name="checkmark" size={20} color="#fff" />
            </View>
          ) : (
            <View style={styles.checkWrap}>
              <Ionicons name="ellipse-outline" size={20} color="#bbb" />
            </View>
          )}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: s(16) },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingTop: vs(10), paddingHorizontal: s(16), paddingBottom: vs(8) },
  headerTitle: { marginLeft: s(8), fontSize: fs(20), fontWeight: '800', color: '#333', flex: 1 },
  hero: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#eee', backgroundColor: '#fff', borderRadius: ms(16), padding: s(12), marginBottom: vs(10) },
  heroIconWrap: { width: s(44), height: s(44), borderRadius: ms(14), backgroundColor: '#fff9f0', borderWidth: 1, borderColor: '#f4a119', alignItems: 'center', justifyContent: 'center' },
  heroIcon: { width: s(30), height: s(30) },
  heroTitle: { fontSize: fs(18), fontWeight: '800', color: '#1a1a1a' },
  heroSubtitle: { fontSize: fs(12), color: '#666', marginTop: vs(2) },
  langCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#eee', backgroundColor: '#fff', borderRadius: ms(16), padding: s(14), marginBottom: vs(10) },
  langCardSelected: { backgroundColor: '#f4a119', borderColor: '#f4a119' },
  langLeft: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: s(40), height: s(40), borderRadius: ms(12), alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  langTitle: { fontSize: fs(15), fontWeight: '700', color: '#1a1a1a' },
  langTitleSelected: { color: '#fff' },
  langDesc: { fontSize: fs(12), color: '#666', marginTop: vs(2) },
  pill: { flexDirection: 'row', alignItems: 'center', borderRadius: ms(16), paddingVertical: vs(6), paddingHorizontal: s(12), borderWidth: 1 },
  primaryPill: { backgroundColor: '#f5f5f5', borderColor: '#e5e5e5' },
  primaryFill: { backgroundColor: '#f4a119', borderColor: '#f4a119' },
  pillText: { marginLeft: s(6), fontSize: fs(13), fontWeight: '700', color: '#1a1a1a' },
  pillTextLight: { color: '#fff' },
  checkWrap: { width: s(32), height: s(32), borderRadius: s(16), borderWidth: 1, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  checkWrapSelected: { width: s(32), height: s(32), borderRadius: s(16), alignItems: 'center', justifyContent: 'center', backgroundColor: '#00000020' },
});
