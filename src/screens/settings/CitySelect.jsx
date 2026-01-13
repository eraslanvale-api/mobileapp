import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { s, vs, fs, ms } from '../../utils/scale';
import { Colors } from '../../constants/Colors';
import cities from '../../constants/cities.json';

export default function CitySelect() {
  const navigation = useNavigation();
  const route = useRoute();
  const onSelect = route.params?.onSelect;
  const [q, setQ] = useState('');

  const data = useMemo(() => {
    const list = Array.isArray(cities) ? cities : [];
    if (!q) return list;
    const t = q.toLowerCase();
    return list.filter((c) => String(c.name).toLowerCase().includes(t));
  }, [q]);

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.itemRow} onPress={() => { onSelect?.(item); navigation.goBack(); }}>
      <View style={styles.itemLeft}>
        <View style={styles.pinCircle}><Ionicons name="location-outline" size={18} color={Colors.primary} /></View>
        <View style={{ marginLeft: s(10), flex: 1 }}>
          <Text style={styles.itemTitle}>{item.name}</Text>
          <Text style={styles.itemSubtitle}>Şehir</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.white }}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: s(6) }}>
          <Ionicons name="arrow-back" size={22} color={Colors.darkGray} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>İl seç</Text>
      </View>
      <View style={{ paddingHorizontal: s(16) }}>
        <TextInput value={q} onChangeText={setQ} style={styles.search} placeholder="Şehir ara" placeholderTextColor={Colors.gray} />
      </View>
      <FlatList
        data={data}
        keyExtractor={(x) => String(x.id)}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: vs(8) }} />}
        contentContainerStyle={{ paddingHorizontal: s(16), paddingVertical: vs(12), paddingBottom: vs(24) }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingTop: vs(10), paddingHorizontal: s(16), paddingBottom: vs(8) },
  headerTitle: { marginLeft: s(8), fontSize: fs(18), fontWeight: '700', color: Colors.darkGray },
  search: { borderWidth: 1, borderColor: Colors.lightGray, borderRadius: ms(12), paddingVertical: vs(10), paddingHorizontal: s(12), fontSize: fs(14), color: Colors.darkGray, marginTop: vs(8) },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: vs(12), paddingHorizontal: s(12), backgroundColor: Colors.white, borderRadius: ms(12), borderWidth: 1, borderColor: Colors.lightGray },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  pinCircle: { width: s(28), height: s(28), borderRadius: s(14), backgroundColor: '#fff6e0', alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: fs(15), fontWeight: '800', color: Colors.secondary },
  itemSubtitle: { fontSize: fs(12), color: Colors.gray, marginTop: vs(2) },
});

