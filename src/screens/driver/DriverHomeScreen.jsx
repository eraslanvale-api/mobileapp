import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform, StatusBar, ScrollView, ActivityIndicator, Animated } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useJobs } from '../../context/JobContext';
import { s, vs, ms, fs } from '../../utils/scale';
import TopMenu from '../../components/TopMenu';
import { useFocusEffect } from '@react-navigation/native';

// Simple Pulse Animation Component
const LoadingPulse = () => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    return (
        <View style={{ padding: 20, alignItems: 'center' }}>
            <Animated.View
                style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: Colors.primary,
                    opacity: opacity,
                    marginBottom: 10
                }}
            />
            <Text style={{ color: Colors.gray, fontFamily: 'PlusJakartaSans-Medium' }}>Veriler Güncelleniyor...</Text>
        </View>
    );
};

export default function DriverHomeScreen({ navigation }) {
    const { user, clearToken } = useAuth();
    const { availableJobs, myJobs, fetchAvailableJobs, fetchMyJobs, loading } = useJobs();
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('active');

    // Ekran her odaklandığında verileri yenile
    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        await Promise.all([fetchAvailableJobs(), fetchMyJobs()]);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    // Aktif işi bul (accepted, in_progress, on_way)
    const activeJob = myJobs.find(j => ['accepted', 'in_progress', 'on_way'].includes(j.status));

    // Bekleyen/Atanmış İşler (henüz kabul edilmemiş veya başlamamış ama bana atanmış)
    const pendingJobs = myJobs.filter(j => ['scheduled', 'searching', 'assigned'].includes(j.status));

    // Geçmiş işler (completed, cancelled)
    const historyJobs = myJobs.filter(j => ['completed', 'cancelled'].includes(j.status));

    const renderJobCard = ({ item }) => {
        const isHistory = ['completed', 'cancelled'].includes(item.status);
        // Fallback for date
        const rawDate = item.created_at || item.pickupTime;
        const dateObj = rawDate ? new Date(rawDate) : null;
        const dateStr = dateObj
            ? dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
            : '';

        // Status Colors & Label
        const getStatusLabel = (s) => {
            if (!s) return '';
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

        const getStatusColor = (s) => {
            const lower = String(s).toLowerCase();
            if (['active', 'confirmed', 'accepted', 'in_progress', 'on_way', 'searching', 'scheduled'].includes(lower)) return '#f4a119';
            if (lower === 'completed') return '#10b981';
            if (lower === 'cancelled' || lower === 'iptal edildi') return '#ef4444';
            return '#888';
        };

        const statusLabel = item.statusLabel || getStatusLabel(item.status);
        const statusColor = getStatusColor(item.status);
        const stops = Array.isArray(item.stops) ? item.stops : [];

        return (
            <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.card, isHistory && styles.cardHistory]}
                onPress={() => navigation.navigate('DriverJobDetail', { jobId: item.id })}
            >
                {/* Header: Service & Status */}
                <View style={styles.cardHeader}>
                    <View style={styles.serviceRow}>
                        <View style={[styles.serviceIcon, { backgroundColor: isHistory ? Colors.background : Colors.background }]}>
                            <Ionicons name="car-sport" size={18} color={isHistory ? Colors.gray : Colors.primary} />
                        </View>
                        <Text style={[styles.cardTitle, isHistory && styles.textHistory]} numberOfLines={1}>
                            {item.customerName || 'Transfer Hizmeti'}
                        </Text>
                    </View>
                    {!!item.status && (
                        <View style={[styles.statusChip, { borderColor: statusColor, backgroundColor: isHistory ? Colors.secondary : statusColor + '15' }]}>
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
                            <Text style={[styles.addrText, isHistory && styles.textHistory]} numberOfLines={1}>{item.pickup || item.pickup_address || '—'}</Text>
                        </View>
                        {stops.map((stop, i) => (
                            <View key={`stop-${i}`} style={[styles.addressRow, { marginTop: vs(12) }]}>
                                <Text style={[styles.addrLabel, isHistory && styles.textMuted]}>{i + 1}. Durak</Text>
                                <Text style={[styles.addrText, isHistory && styles.textHistory]} numberOfLines={1}>{stop.address || '—'}</Text>
                            </View>
                        ))}
                        <View style={[styles.addressRow, { marginTop: vs(12) }]}>
                            <Text style={[styles.addrLabel, isHistory && styles.textMuted]}>Varış Noktası</Text>
                            <Text style={[styles.addrText, isHistory && styles.textHistory]} numberOfLines={1}>{item.dropoff || item.dropoff_address || '—'}</Text>
                        </View>
                    </View>
                </View>

                {/* Footer: Date & Distance */}
                <View style={styles.cardFooter}>
                    <View style={styles.footerItem}>
                        <Ionicons name="calendar-outline" size={14} color="#888" />
                        <Text style={styles.footerText} numberOfLines={1}>{dateStr || '—'}</Text>
                    </View>

                    <View style={styles.priceContainer}>
                        <Ionicons name="navigate-outline" size={14} color="#1a1a1a" style={{ marginRight: 4 }} />
                        <Text style={[styles.priceText, isHistory && styles.textHistory]}>
                            {item.distance_km || item.distance || item.distanceKm || 0} km
                        </Text>
                    </View>

                    <View style={styles.detailBtn}>
                        <Text style={styles.detailBtnText}>Detay</Text>
                        <Ionicons name="chevron-forward" size={14} color="#fff" />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmptyHistory = () => (
        <View style={styles.emptyHistoryBox}>
            <Ionicons name="time-outline" size={24} color="#ccc" />
            <Text style={styles.emptyHistoryText}>Geçmiş görev bulunamadı</Text>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
                <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
                <LoadingPulse />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

            {(loading || refreshing) && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            )}

            <View style={{ zIndex: 100 }}>
                <TopMenu />
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="transparent" // Varsayılan spinner'ı gizle
                        colors={['transparent']} // Android için
                        style={{ backgroundColor: 'transparent' }}
                    />
                }
            >
                {/* Driver Info Header */}
                <View style={styles.driverHeader}>
                    <View>
                        <Text style={styles.welcomeText}>Hoş Geldin,</Text>
                        <Text style={styles.headerName}>{user?.full_name || user?.email || 'Değerli Şoför'}</Text>
                    </View>
                </View>

                {/* Tabs */}
                <View style={styles.tabContainer}>
                    <View style={styles.tabs}>
                        <TouchableOpacity
                            onPress={() => setActiveTab('active')}
                            style={[styles.tab, activeTab === 'active' && styles.activeTab]}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>Görevlerim</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setActiveTab('history')}
                            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>Geçmiş Hareketler</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {activeTab === 'active' ? (
                    <>
                        {/* Aktif İş Varsa En Üstte Göster */}
                        {activeJob && (
                            <View style={{ marginBottom: vs(24) }}>
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionTitle}>Aktif Görev</Text>
                                </View>
                                {renderJobCard({ item: activeJob })}
                            </View>
                        )}

                        {/* Atanan İşler Listesi */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Bekleyen Görevler</Text>
                            {pendingJobs && pendingJobs.length > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{pendingJobs.length}</Text>
                                </View>
                            )}
                        </View>

                        {(!pendingJobs || pendingJobs.length === 0) && !activeJob ? (
                            <View style={styles.emptyBox}>
                                <View style={[styles.emptyIconBg, { backgroundColor: Colors.background }]}>
                                    <Ionicons name="file-tray-outline" size={32} color={Colors.gray} />
                                </View>
                                <Text style={styles.emptyText}>Şu anda size atanmış bekleyen bir görev bulunmuyor.</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={pendingJobs || []}
                                keyExtractor={item => item.id}
                                renderItem={renderJobCard}
                                scrollEnabled={false}
                                contentContainerStyle={{ paddingBottom: vs(16) }}
                            />
                        )}
                    </>
                ) : (
                    <>
                        {/* Geçmiş İşler Bölümü */}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Tamamlanan Görevler</Text>
                        </View>

                        {historyJobs.length === 0 ? (
                            renderEmptyHistory()
                        ) : (
                            <FlatList
                                data={historyJobs}
                                keyExtractor={item => item.id}
                                renderItem={renderJobCard}
                                scrollEnabled={false}
                            />
                        )}
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    driverHeader: {
        marginTop: ms(60),
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: ms(24),
        paddingVertical: ms(16),
        backgroundColor: Colors.background,
    },
    welcomeText: {
        fontSize: fs(13),
        color: Colors.gray,
        fontFamily: 'PlusJakartaSans-Medium',
        marginBottom: ms(2),
    },
    headerName: {
        fontSize: fs(22),
        fontFamily: 'PlusJakartaSans-ExtraBold',
        color: Colors.white,
    },
    logoutBtn: {
        width: ms(42),
        height: ms(42),
        borderRadius: ms(14),
        backgroundColor: '#ffebee',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ffcdd2',
    },
    activeJobContainer: {
        paddingHorizontal: ms(24),
        marginTop: ms(8),
        marginBottom: ms(8),
    },
    activeJobBanner: {
        backgroundColor: Colors.primary,
        borderRadius: ms(20),
        padding: ms(16),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 10,
    },
    activeJobContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pulseIcon: {
        width: ms(40),
        height: ms(40),
        borderRadius: ms(20),
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: ms(12),
    },
    activeJobInfo: {
        justifyContent: 'center',
    },
    activeJobLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: fs(10),
        fontFamily: 'PlusJakartaSans-Bold',
        letterSpacing: 0.5,
    },
    activeJobTitle: {
        color: '#FFF',
        fontSize: fs(16),
        fontFamily: 'PlusJakartaSans-Bold',
    },
    activeJobAction: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: ms(12),
        paddingVertical: ms(6),
        borderRadius: ms(20),
    },
    activeJobButtonText: {
        color: '#FFF',
        fontSize: fs(12),
        fontFamily: 'PlusJakartaSans-Medium',
        marginRight: ms(4),
    },
    tabContainer: {
        paddingHorizontal: ms(14),
        marginVertical: ms(16),
    },
    tabs: {
        flexDirection: 'row',
        backgroundColor: Colors.secondary,
        borderRadius: ms(12),
        padding: ms(4),
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    tab: {
        flex: 1,
        paddingVertical: ms(10),
        alignItems: 'center',
        borderRadius: ms(10),
    },
    activeTab: {
        backgroundColor: Colors.primary,
    },
    tabText: {
        fontFamily: 'PlusJakartaSans-Medium',
        color: Colors.gray,
        fontSize: fs(13),
    },
    activeTabText: {
        color: Colors.black,
        fontFamily: 'PlusJakartaSans-Bold',
    },
    scrollContent: {
        paddingBottom: ms(100),
    },
    // NEW CARD STYLES
    card: {
        backgroundColor: Colors.secondary,
        borderRadius: ms(20),
        padding: ms(16),
        marginBottom: ms(16),
        marginHorizontal: ms(10),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: ms(12),
        elevation: 3,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cardHistory: {
        backgroundColor: Colors.secondary,
        shadowOpacity: 0.03,
        elevation: 1,
        borderColor: Colors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: vs(16),
        paddingBottom: vs(12),
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    serviceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
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
        color: Colors.white,
        flex: 1,
        marginRight: s(8),
        fontFamily: 'PlusJakartaSans-Bold',
    },
    textHistory: {
        color: Colors.gray,
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
        fontFamily: 'PlusJakartaSans-Bold',
    },
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
        color: Colors.gray,
        marginBottom: vs(2),
        fontWeight: '600',
        fontFamily: 'PlusJakartaSans-SemiBold',
    },
    addrText: {
        fontSize: fs(14),
        color: Colors.white,
        fontWeight: '500',
        fontFamily: 'PlusJakartaSans-Medium',
    },
    textMuted: {
        color: Colors.gray,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.background,
        marginHorizontal: -ms(16),
        marginBottom: -ms(16),
        paddingHorizontal: ms(16),
        paddingVertical: vs(12),
        borderBottomLeftRadius: ms(20),
        borderBottomRightRadius: ms(20),
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    footerText: {
        marginLeft: s(6),
        fontSize: fs(13),
        color: Colors.gray,
        fontWeight: '500',
        fontFamily: 'PlusJakartaSans-Medium',
    },
    priceContainer: {
        backgroundColor: Colors.secondary,
        paddingHorizontal: s(10),
        paddingVertical: vs(4),
        borderRadius: ms(8),
        borderWidth: 1,
        borderColor: Colors.border,
        flexDirection: 'row',
        alignItems: 'center',
    },
    priceText: {
        fontSize: fs(14),
        fontWeight: '800',
        color: Colors.white,
        fontFamily: 'PlusJakartaSans-ExtraBold',
    },
    detailBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingVertical: vs(6),
        paddingHorizontal: s(12),
        borderRadius: ms(8),
        marginLeft: s(10),
    },
    detailBtnText: {
        fontSize: fs(12),
        fontWeight: '700',
        color: Colors.black,
        marginRight: s(2),
        fontFamily: 'PlusJakartaSans-Bold',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: ms(60),
    },
    emptyStateText: {
        marginTop: ms(16),
        fontSize: fs(14),
        color: Colors.gray,
        fontFamily: 'PlusJakartaSans-Medium',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: ms(24),
        marginBottom: ms(12),
        marginTop: ms(8),
    },
    sectionTitle: {
        fontSize: fs(16),
        fontFamily: 'PlusJakartaSans-Bold',
        color: Colors.white,
    },
    badge: {
        backgroundColor: '#ef4444',
        minWidth: ms(20),
        height: ms(20),
        borderRadius: ms(10),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: ms(4),
    },
    badgeText: {
        color: '#fff',
        fontSize: fs(11),
        fontFamily: 'PlusJakartaSans-Bold',
    },
    emptyBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: ms(40),
        marginHorizontal: ms(24),
        backgroundColor: Colors.secondary,
        borderRadius: ms(20),
        borderWidth: 1,
        borderColor: Colors.border,
        borderStyle: 'dashed',
    },
    emptyIconBg: {
        width: ms(60),
        height: ms(60),
        borderRadius: ms(30),
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: ms(16),
    },
    emptyTitle: {
        fontSize: fs(16),
        fontFamily: 'PlusJakartaSans-Bold',
        color: Colors.white,
        marginBottom: ms(8),
    },
    emptyText: {
        fontSize: fs(13),
        fontFamily: 'PlusJakartaSans-Medium',
        color: Colors.gray,
        textAlign: 'center',
        paddingHorizontal: ms(32),
    },
    emptyHistoryBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: ms(40),
    },
    emptyHistoryText: {
        marginTop: ms(12),
        fontSize: fs(14),
        color: Colors.gray,
        fontFamily: 'PlusJakartaSans-Medium',
    },
});
