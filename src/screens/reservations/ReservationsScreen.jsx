import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView, RefreshControl, ActivityIndicator, Dimensions, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { s, vs, fs, ms } from '../../utils/scale';
import { listActiveReservations, listReservationHistory, cancelReservation } from '../../api/endpoints';
import TopMenu from '../../components/TopMenu'

const { width } = Dimensions.get('window');

export default function ReservationsScreen() {
  const navigation = useNavigation();
  const [active, setActive] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [aRes, hRes] = await Promise.all([
        listActiveReservations(),
        listReservationHistory(),
      ]);
      const a = Array.isArray(aRes?.data) ? aRes.data : [];
      const h = Array.isArray(hRes?.data) ? hRes.data : [];
      setActive(a);
      setHistory(h);
    } catch (_) {
      setActive([]);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleCancelReservation = (item) => {
    const rawDate = item?.pickupTime || item?.pickupAt || item?.pickup_at || item?.date || item?.created_at;
    const dateObj = rawDate ? new Date(rawDate) : null;

    if (dateObj) {
      const now = new Date();
      const diffMs = dateObj - now;
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours <= 1) {
        Alert.alert(
          'İptal Edilemez',
          'Rezervasyona 1 saat kala iptal edilemez. Lütfen çağrı merkezi ile iletişime geçin.',
          [{ text: 'Tamam', style: 'default' }]
        );
        return;
      }
    }

    Alert.alert(
      'Rezervasyonu İptal Et',
      'Bu rezervasyonu iptal etmek istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, İptal Et',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await cancelReservation(item.id);
              Alert.alert('Başarılı', 'Rezervasyonunuz iptal edildi.');
              fetchData(); // Listeyi yenile
            } catch (error) {
              console.log('Cancel error:', error);
              Alert.alert('Hata', 'İptal işlemi sırasında bir hata oluştu.');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const onCreateReservation = () => {
    navigation.navigate('Home', { openServices: true });
  };

  const onViewDetails = (item) => {
    navigation.navigate('ReservationDetail', { reservation: item });
  };

  const renderReservationItem = ({ item, isHistory }) => {
    const serviceName = item?.serviceName || item?.service?.name || item?.service_name || 'Rezervasyon';
    const status = item?.status || item?.state || '';
    const from = item?.pickup || item?.pickup?.address || item?.start_address || item?.from || '';
    const to = item?.dropoff || item?.dropoff?.address || item?.end_address || item?.to || '';
    const price = item?.price ?? item?.total ?? item?.amount ?? null;
    const stops = Array.isArray(item?.stops) ? item.stops : [];

    // Date formatting
    const rawDate = item?.pickupTime || item?.pickupAt || item?.pickup_at || item?.date || item?.created_at;
    const dateObj = rawDate ? new Date(rawDate) : null;

    const dateStr = dateObj && !isNaN(dateObj)
      ? dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : item?.dateLabel
        ? `${item.dateLabel}${item?.time ? ' • ' + item.time : ''}`
        : '';

    const getStatusLabel = (s) => {
      const lower = String(s).toLowerCase();
      const map = {
          'pending': 'Bekliyor',
          'searching': 'Sürücü Aranıyor',
          'scheduled': 'Planlandı',
          'active': 'Aktif',
          'accepted': 'Kabul Edildi',
          'assigned': 'Atandı',
          'on_way': 'Yolda',
          'in_progress': 'Sürüşte',
          'completed': 'Tamamlandı',
          'cancelled': 'İptal Edildi'
      };
      return map[lower] || s;
    };

    const statusLabel = item.statusLabel || getStatusLabel(status);

    const getStatusColor = (s) => {
      const lower = String(s).toLowerCase();
      if (['active', 'confirmed', 'pending', 'searching', 'scheduled', 'assigned', 'on_way', 'on-way', 'in_progress'].includes(lower)) return '#f4a119';
      if (lower === 'completed') return '#10b981';
      if (lower === 'cancelled' || lower === 'iptal edildi') return '#ef4444';
      return '#888';
    };

    const statusColor = getStatusColor(status);

    return (
      <TouchableOpacity
        style={[styles.card, isHistory && styles.cardHistory]}
        onPress={() => onViewDetails(item)}
        activeOpacity={0.9}
      >
        {/* Header: Service & Status */}
        <View style={styles.cardHeader}>
          <View style={styles.serviceRow}>
            <View style={[styles.serviceIcon, { backgroundColor: isHistory ? '#f5f5f5' : '#fff9f0' }]}>
              <Ionicons name="car-sport" size={18} color={isHistory ? '#888' : '#f4a119'} />
            </View>
            <Text style={[styles.cardTitle, isHistory && styles.textHistory]} numberOfLines={1}>{serviceName}</Text>
          </View>
          {!!status && (
            <View style={[styles.statusChip, { borderColor: statusColor, backgroundColor: isHistory ? '#fff' : statusColor + '15' }]}>
              <Text style={[styles.statusChipText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          )}
        </View>

        {/* Route Line */}
        <View style={styles.routeContainer}>
          <View style={styles.routeLeft}>
            <View style={[styles.dot, { borderColor: '#10b981', backgroundColor: '#10b981' }]} />
            <View style={styles.line} />
            {stops.map((_, i) => (
              <React.Fragment key={`dot-${i}`}>
                <View style={[styles.dot, { borderColor: '#f4a119', backgroundColor: '#f4a119' }]} />
                <View style={styles.line} />
              </React.Fragment>
            ))}
            <View style={[styles.dot, { borderColor: '#ef4444', backgroundColor: '#ef4444' }]} />
          </View>
          <View style={styles.routeRight}>
            <View style={styles.addressRow}>
              <Text style={[styles.addrLabel, isHistory && styles.textMuted]}>Başlangıç Noktası</Text>
              <Text style={[styles.addrText, isHistory && styles.textHistory]} numberOfLines={1}>{from || '—'}</Text>
            </View>
            {stops.map((stop, i) => (
              <View key={`stop-${i}`} style={[styles.addressRow, { marginTop: vs(12) }]}>
                <Text style={[styles.addrLabel, isHistory && styles.textMuted]}>{i + 1}. Durak</Text>
                <Text style={[styles.addrText, isHistory && styles.textHistory]} numberOfLines={1}>{stop.address || '—'}</Text>
              </View>
            ))}
            <View style={[styles.addressRow, { marginTop: vs(12) }]}>
              <Text style={[styles.addrLabel, isHistory && styles.textMuted]}>Varış Noktası</Text>
              <Text style={[styles.addrText, isHistory && styles.textHistory]} numberOfLines={1}>{to || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Footer: Date & Price */}
        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Ionicons name="calendar-outline" size={14} color="#888" />
            <Text style={styles.footerText} numberOfLines={1}>{dateStr || '—'}</Text>
          </View>
          {price != null && (
            <View style={styles.priceContainer}>
              <Text style={[styles.priceText, isHistory && styles.textHistory]}>{Number(price).toFixed(0)} ₺</Text>
            </View>
          )}
          
          <View style={[styles.detailBtn, { marginLeft: 'auto' }]}>
            <Text style={styles.detailBtnText}>Detay</Text>
            <Ionicons name="chevron-forward" size={14} color="#fff" />
          </View>
        </View>
      </TouchableOpacity>
    );

  };

  const EmptyActive = () => (
    <View style={styles.emptyBox}>
      <View style={styles.emptyIconBg}>
        <Ionicons name="calendar-clear-outline" size={32} color="#f4a119" />
      </View>
      <Text style={styles.emptyTitle}>Aktif Rezervasyon Yok</Text>
      <Text style={styles.emptyText}>Şu anda bekleyen veya aktif bir yolculuğunuz bulunmuyor.</Text>
      <TouchableOpacity style={styles.createBtn} onPress={onCreateReservation}>
        <Text style={styles.createBtnText}>Yeni Rezervasyon Oluştur</Text>
        <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: s(4) }} />
      </TouchableOpacity>
    </View>
  );

  const EmptyHistory = () => (
    <View style={styles.emptyHistoryBox}>
      <Ionicons name="time-outline" size={24} color="#ccc" />
      <Text style={styles.emptyHistoryText}>Geçmiş rezervasyon bulunamadı</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <TopMenu />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#f4a119"
            colors={['#f4a119']}
          />
        }
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Aktif Rezervasyonlar</Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}><ActivityIndicator size="large" color="#f4a119" /></View>
        ) : active.length === 0 ? (
          <EmptyActive />
        ) : (
          <FlatList
            data={active}
            keyExtractor={(item, index) => String(item?.id ?? index)}
            renderItem={(props) => renderReservationItem({ ...props, isHistory: false })}
            scrollEnabled={false}
          />
        )}

        <View style={[styles.sectionHeader, { marginTop: vs(32) }]}>
          <Text style={styles.sectionTitle}>Geçmiş Rezervasyonlar</Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}><ActivityIndicator color="#f4a119" /></View>
        ) : history.length === 0 ? (
          <EmptyHistory />
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item, index) => String(item?.id ?? index)}
            renderItem={(props) => renderReservationItem({ ...props, isHistory: true })}
            scrollEnabled={false}
          />
        )}
      </ScrollView>



      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={onCreateReservation}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  content: {
    flex: 1,
    paddingTop: s(80)
  },
  scrollContent: {
    paddingTop: vs(12),
    paddingHorizontal: s(20),
    paddingBottom: vs(100),
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: s(20), paddingVertical: vs(12), borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff' },
  backBtn: { width: s(40), height: s(40), borderRadius: s(20), backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fs(18), fontWeight: '800', color: '#1a1a1a' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: vs(12),
  },
  sectionTitle: {
    fontSize: fs(18),
    fontWeight: '800',
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  badge: {
    backgroundColor: '#f4a119',
    paddingHorizontal: s(8),
    paddingVertical: vs(2),
    borderRadius: ms(12),
    marginLeft: s(8),
  },
  badgeText: {
    color: '#fff',
    fontSize: fs(12),
    fontWeight: '700',
  },
  loadingWrap: {
    paddingVertical: vs(20),
    alignItems: 'center',
    justifyContent: 'center'
  },

  // Card Styles
  card: {
    backgroundColor: '#fff',
    borderRadius: ms(20),
    padding: s(16),
    marginBottom: vs(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: ms(12),
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  cardHistory: {
    backgroundColor: '#fff',
    shadowOpacity: 0.03,
    elevation: 1,
    borderColor: '#f0f0f0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: vs(16),
    paddingBottom: vs(12),
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serviceIcon: {
    width: s(32),
    height: s(32),
    borderRadius: ms(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: s(10),
  },
  cardTitle: {
    fontSize: fs(16),
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    marginRight: s(8)
  },
  textHistory: {
    color: '#666',
  },
  statusChip: {
    borderWidth: 1,
    borderRadius: ms(8),
    paddingVertical: vs(4),
    paddingHorizontal: s(10)
  },
  statusChipText: {
    fontSize: fs(11),
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  // Route Styles
  routeContainer: {
    flexDirection: 'row',
    marginBottom: vs(16),
  },
  routeLeft: {
    alignItems: 'center',
    marginRight: s(12),
    paddingTop: vs(4),
  },
  dot: {
    width: s(8),
    height: s(8),
    borderRadius: s(4),
    borderWidth: 0,
  },
  stopDot: {
    width: s(6),
    height: s(6),
    borderRadius: s(3),
    borderWidth: 0,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: vs(2),
  },
  routeRight: {
    flex: 1,
  },
  addressRow: {
    flex: 1,
    justifyContent: 'center',
  },
  addrLabel: {
    fontSize: fs(11),
    color: '#999',
    marginBottom: vs(2),
    fontWeight: '600',
  },
  addrText: {
    fontSize: fs(14),
    color: '#333',
    fontWeight: '500'
  },
  textMuted: {
    color: '#bbb',
  },

  // Footer Styles
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    marginHorizontal: -s(16),
    marginBottom: -s(16),
    paddingHorizontal: s(16),
    paddingVertical: vs(12),
    borderBottomLeftRadius: ms(20),
    borderBottomRightRadius: ms(20),
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  footerText: {
    marginLeft: s(6),
    fontSize: fs(13),
    color: '#666',
    fontWeight: '500',
  },
  priceContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: s(10),
    paddingVertical: vs(4),
    borderRadius: ms(8),
    borderWidth: 1,
    borderColor: '#eee',
  },
  priceText: {
    fontSize: fs(14),
    fontWeight: '800',
    color: '#1a1a1a'
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4a119',
    paddingVertical: vs(6),
    paddingHorizontal: s(12),
    borderRadius: ms(8),
    marginLeft: s(10),
  },
  detailBtnText: {
    fontSize: fs(12),
    fontWeight: '700',
    color: '#fff',
    marginRight: s(2),
  },

  // Empty State Styles
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vs(32),
    paddingHorizontal: s(24),
    backgroundColor: '#fff',
    borderRadius: ms(24),
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: ms(16),
  },
  emptyIconBg: {
    width: s(64),
    height: s(64),
    borderRadius: s(32),
    backgroundColor: '#fff9f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(16),
  },
  emptyTitle: {
    fontSize: fs(16),
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: vs(8),
  },
  emptyText: {
    fontSize: fs(14),
    color: '#7a7a7a',
    textAlign: 'center',
    marginBottom: vs(24),
    lineHeight: fs(20),
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: ms(16),
    paddingVertical: vs(12),
    paddingHorizontal: s(24),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: ms(8),
    elevation: 4,
  },
  createBtnText: {
    fontSize: fs(14),
    fontWeight: '700',
    color: '#fff'
  },
  emptyHistoryBox: {
    paddingVertical: vs(32),
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  emptyHistoryText: {
    fontSize: fs(14),
    color: '#7a7a7a',
    marginTop: vs(8),
    fontWeight: '500',
  },

  // FAB Styles
  fab: {
    position: 'absolute',
    bottom: vs(32),
    right: s(20),
    width: s(56),
    height: s(56),
    borderRadius: s(28),
    backgroundColor: '#f4a119',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f4a119',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: ms(8),
    elevation: 8,
    zIndex: 100,
  },
});
