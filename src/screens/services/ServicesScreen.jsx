import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useServices } from '../../context/ServiceContext';
import { useJourney } from '../../context/JourneyContext';
import { s, vs, fs, ms } from '../../utils/scale';
import AppIcon from '../../../assets/icon.png';
import TopMenu from '../../components/TopMenu';

export default function ServicesScreen() {
  const navigation = useNavigation();
  const { services, selectService } = useServices();
  const { setSheetMode } = useJourney();
  const [q, setQ] = useState('');

  const visible = useMemo(() => (Array.isArray(services) ? services.filter((x) => x?.active) : []), [services]);
  const filtered = useMemo(() => visible.filter((x) => (x?.name || '').toLowerCase().includes(q.trim().toLowerCase())), [visible, q]);

  const onPressItem = (svc) => {
    selectService(svc);
    setSheetMode('services');
    navigation.navigate('Home', { openServices: true });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <TopMenu />


      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: vs(20) }}>
        {filtered.map((svc) => {
          const imgSource = typeof svc?.image === 'string' && svc.image.length > 0 ? { uri: svc.image } : AppIcon;
          return (
            <TouchableOpacity key={svc.id} style={styles.serviceCard} onPress={() => onPressItem(svc)}>
              <View style={styles.cardIcon}>
                <Image source={imgSource} style={styles.cardImage} />
              </View>
              <View style={{ flex: 1, marginLeft: s(8) }}>
                <Text style={styles.cardTitle} numberOfLines={1}>{svc.title}</Text>
                <Text style={styles.cardSubtitle} numberOfLines={1}>{svc.description || 'Hizmet'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#bbb" />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: s(16), paddingTop: vs(10), paddingBottom: vs(8) },
  logoIcon: { width: s(28), height: s(28), borderRadius: ms(8), backgroundColor: '#f4a119', alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#111', fontWeight: '800' },
  headerTitle: { fontSize: fs(18), fontWeight: '800', color: '#333' },
  searchBox: { marginHorizontal: s(16), marginBottom: vs(8), borderWidth: 1, borderColor: '#eee', borderRadius: ms(14), paddingVertical: vs(8), paddingHorizontal: s(12), flexDirection: 'row', alignItems: 'center' },
  searchInput: { marginLeft: s(8), fontSize: fs(14), color: '#333', flex: 1 },
  serviceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: ms(16), borderWidth: 1, borderColor: '#eee', padding: s(16), width: '100%', minHeight: vs(72), marginBottom: vs(10) },
  content: { flex: 1, marginTop: vs(80) },
  cardIcon: { width: s(56), height: s(56), borderRadius: ms(14), backgroundColor: '#f7f7f7', alignItems: 'center', justifyContent: 'center' },
  cardImage: { width: s(48), height: s(36) },
  cardTitle: { fontSize: fs(16), fontWeight: '700', color: '#1a1a1a' },
  cardSubtitle: { fontSize: fs(13), color: '#666' },
});
