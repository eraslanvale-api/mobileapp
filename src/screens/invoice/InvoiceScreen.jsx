import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { s, vs, fs, ms } from '../../utils/scale';
import { listInvoices } from '../../api/endpoints';
import { Colors } from '../../constants/Colors';
import { useToast } from '../../context/ToastContext';

export default function InvoiceScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await listInvoices();
      const arr = Array.isArray(res?.data) ? res.data : [];
      setList(arr);
    } catch (_) {
      setList([]);
      showToast('Faturalar yüklenemedi', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchData();
    }
  }, [isFocused]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const onAddNew = () => {
    navigation.navigate('InvoiceAdd');
  };

  const onEdit = (it) => {
    if (!it) return;
    navigation.navigate('InvoiceUpdate', { item: it, id: it.id });
  };

  const renderItem = ({ item }) => {
    const isDefault = !!item?.is_default;
    const isCorporate = item?.invoice_type === 'Kurumsal' || item?.invoice_type === 'corporate';
    const title = isCorporate ? 'Kurumsal' : 'Bireysel';
    const name = isCorporate ? (item?.company_name || '') : (item?.full_name || '');
    const idNum = isCorporate ? (item?.tax_number || '') : (item?.citizen_id || '');
    const subtitle = [name, idNum].filter(Boolean).join(' - ');

    return (
      <TouchableOpacity
        style={styles.itemRow}
        onPress={() => onEdit(item)}
        activeOpacity={0.85}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.itemTitle}>{title}</Text>
            {isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Varsayılan</Text>
              </View>
            )}
          </View>
          <Text style={styles.itemValue} numberOfLines={1}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: s(6) }}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Faturalarım</Text>
      </View>

      {loading ? (
        <View style={{ paddingTop: vs(20), flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color="#f4a119" />
        </View>
      ) : list.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: s(16) }}>
          <Ionicons name="receipt-outline" size={ms(64)} color={Colors.gray} />
          <Text style={{ marginTop: vs(14), fontSize: fs(20), fontWeight: '800', color: Colors.white }}>Fatura bilgisi ekle</Text>
          <Text style={{ marginTop: vs(6), fontSize: fs(13), color: Colors.gray, textAlign: 'center' }}>Henüz kayıtlı bir fatura bilginiz bulunmamaktadır. İlk fatura bilginizi oluşturun.</Text>
          <TouchableOpacity style={styles.emptyAddBtn} onPress={onAddNew}>
            <Ionicons name="add" size={18} color={Colors.black} />
            <Text style={styles.emptyAddText}>Yeni fatura ekle</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: s(16), paddingBottom: vs(100) }}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />
      )}

      {(!loading && list.length > 0) ? (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.footerBtn} onPress={onAddNew} activeOpacity={0.85}>
            <Ionicons name="add" size={18} color={Colors.black} />
            <Text style={styles.footerBtnText}>Yeni fatura ekle</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: vs(10),
    paddingHorizontal: s(16),
    paddingBottom: vs(8),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: s(10),
    backgroundColor: Colors.secondary
  },
  headerTitle: { marginLeft: s(8), fontSize: fs(20), fontWeight: '800', color: Colors.white, flex: 1 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: vs(14),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.secondary,
    paddingHorizontal: s(12),
    borderRadius: 8,
    marginBottom: 8,
  },
  itemTitle: { fontSize: fs(16), fontWeight: '700', color: Colors.white },
  defaultBadge: { marginLeft: s(8), backgroundColor: Colors.background, paddingHorizontal: s(6), paddingVertical: vs(2), borderRadius: ms(4) },
  defaultBadgeText: { fontSize: fs(10), color: Colors.primary, fontWeight: '600' },
  itemValue: { fontSize: fs(13), color: Colors.gray, marginTop: vs(4) },
  emptyAddBtn: { marginTop: vs(18), paddingVertical: vs(12), paddingHorizontal: s(14), borderWidth: 1, borderColor: Colors.border, borderRadius: ms(12), flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary },
  emptyAddText: { marginLeft: s(8), fontSize: fs(15), color: Colors.black, fontWeight: '700' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    backgroundColor: Colors.background,
    paddingHorizontal: s(16),
    borderTopWidth: 0,
  },
  footerBtn: {
    height: vs(52),
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderRadius: 12
  },
  footerBtnText: {
    color: Colors.black,
    fontSize: fs(16),
    fontWeight: '700',
  },
});
