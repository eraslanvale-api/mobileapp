import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { listNotifications, markAllRead, deleteNotification } from '../../api/endpoints';
import { Colors } from '../../constants/Colors';
import { s, vs, fs, ms } from '../../utils/scale';
import { useToast } from '../../context/ToastContext';

export default function NotificationsScreen() {
    const navigation = useNavigation();
    const { showToast } = useToast();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const day = date.getDate();
        const monthNames = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
        const month = monthNames[date.getMonth()];
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${day} ${month} ${hours}:${minutes}`;
    };

    const fetchNotifications = async () => {
        try {
            const response = await listNotifications();
            if (response.data && Array.isArray(response.data)) {
                setNotifications(response.data);
                
                // Eğer okunmamış bildirim varsa sessizce okundu olarak işaretle
                const hasUnread = response.data.some(n => !n.is_read);
                if (hasUnread) {
                    markAllAsReadSilent();
                }
            } else {
                setNotifications([]);
            }
        } catch (error) {
            // console.log('Notification fetch error:', error);
            showToast('Bildirimler alınamadı', 'error');
            setNotifications([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const markAllAsReadSilent = async () => {
        try {
            await markAllRead();
            // Listeyi güncelle ki badge vs. düzelsin (client-side update)
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            // console.log('Silent mark read error:', error);
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchNotifications();
        });
        return unsubscribe;
    }, [navigation]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const handleMarkAllRead = async () => {
        if (notifications.length === 0) return;
        
        try {
            setActionLoading(true);
            await markAllRead();
            showToast('Tüm bildirimler okundu olarak işaretlendi', 'success');
            fetchNotifications(); // Refresh list to update UI
        } catch (error) {
            // console.log('Mark all read error:', error);
            showToast('İşlem başarısız oldu', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = (id) => {
        Alert.alert(
            "Bildirimi Sil",
            "Bu bildirimi silmek istediğinizden emin misiniz?",
            [
                { text: "Vazgeç", style: "cancel" },
                { 
                    text: "Sil", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            await deleteNotification(id);
                            showToast('Bildirim silindi', 'success');
                            setNotifications(prev => prev.filter(item => item.id !== id));
                        } catch (error) {
                            // console.log('Delete notification error:', error);
                            showToast('Bildirim silinemedi', 'error');
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }) => (
        <View style={[styles.itemContainer, !item.is_read && styles.unreadItem]}>
            <View style={styles.iconContainer}>
                <Ionicons 
                    name={item.is_read ? "notifications-outline" : "notifications"} 
                    size={ms(24)} 
                    color={item.is_read ? Colors.gray : Colors.primary} 
                />
            </View>
            <View style={styles.textContainer}>
                <View style={styles.itemHeader}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.itemDate}>{formatDate(item.created_at)}</Text>
                </View>
                <Text style={styles.itemMessage} numberOfLines={2}>{item.message}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
                <Ionicons name="trash-outline" size={ms(20)} color={Colors.red || '#ff4d4f'} />
            </TouchableOpacity>
        </View>
    );

    const EmptyState = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={ms(64)} color={Colors.lightGray} />
            <Text style={styles.emptyText}>Henüz bildiriminiz yok.</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={ms(24)} color={Colors.darkGray} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Bildirimler</Text>
                {notifications.length > 0 && (
                    <TouchableOpacity onPress={handleMarkAllRead} disabled={actionLoading}>
                         {actionLoading ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name="checkmark-done-outline" size={ms(24)} color={Colors.primary} />}
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
                    }
                    ListEmptyComponent={EmptyState}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: s(16),
        paddingVertical: vs(12),
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        backgroundColor: '#fff',
    },
    backButton: {
        padding: s(4),
        marginRight: s(8),
    },
    headerTitle: {
        fontSize: fs(18),
        fontWeight: '800',
        color: Colors.black,
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingVertical: vs(10),
    },
    itemContainer: {
        flexDirection: 'row',
        padding: s(16),
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    unreadItem: {
        backgroundColor: '#fffcf5', // Very light orange/yellow tint for unread
    },
    iconContainer: {
        width: s(40),
        height: s(40),
        borderRadius: s(20),
        backgroundColor: '#f9f9f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: s(12),
    },
    textContainer: {
        flex: 1,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: vs(4),
    },
    itemTitle: {
        fontSize: fs(15),
        fontWeight: '700',
        color: Colors.black,
        flex: 1,
        marginRight: s(8),
    },
    itemDate: {
        fontSize: fs(11),
        color: Colors.gray,
    },
    itemMessage: {
        fontSize: fs(13),
        color: Colors.darkGray,
        lineHeight: fs(18),
    },
    deleteButton: {
        padding: s(8),
        marginLeft: s(4),
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: vs(100),
        gap: vs(16),
    },
    emptyText: {
        fontSize: fs(16),
        color: Colors.gray,
        fontWeight: '500',
    },
});
