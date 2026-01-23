import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { s, vs, fs, ms } from '../../utils/scale';
import { listEmergencyContacts, deleteEmergencyContact } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { Colors } from '../../constants/Colors';

export default function EmergencyContactsScreen() {
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const { showToast } = useToast();

    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const loadContacts = async () => {
        setLoading(true);
        try {
            const resp = await listEmergencyContacts();
            const data = Array.isArray(resp) ? resp : (resp?.data ?? resp?.results ?? []);
            setContacts(data);
        } catch (error) {
            showToast('Kişiler yüklenemedi', 'error');
            setContacts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isFocused) {
            loadContacts();
        }
    }, [isFocused]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadContacts();
        setRefreshing(false);
    };

    const handleAddEdit = (contact = null) => {
        navigation.navigate('AddEditEmergencyContact', { contact });
    };

    const handleDelete = (id) => {
        Alert.alert(
            'Sil',
            'Bu kişiyi silmek istediğinize emin misiniz?',
            [
                { text: 'Vazgeç', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteEmergencyContact(id);
                            showToast('Kişi silindi', 'success');
                            loadContacts();
                        } catch (error) {
                            showToast('Silme işlemi başarısız', 'error');
                        }
                    }
                }
            ]
        );
    };

    const formatDisplayPhone = (phone) => {
        if (!phone) return '';
        const raw = String(phone).replace(/\D/g, '');
        let clean = raw;
        if (raw.startsWith('90')) clean = raw.slice(2);
        else if (raw.startsWith('0')) clean = raw.slice(1);

        clean = clean.slice(0, 10);

        if (clean.length < 3) return phone;

        return `+90 ${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 8)} ${clean.slice(8, 10)}`;
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                </View>
                <Text style={styles.relationshipText}>{item.relationship}</Text>
                <Text style={styles.cardPhone}>{formatDisplayPhone(item.phone_number)}</Text>
            </View>
            <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => handleAddEdit(item)} style={styles.actionBtn}>
                    <Ionicons name="create-outline" size={20} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={[styles.actionBtn, { marginLeft: s(8) }]}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Acil Durum Kişileri</Text>
            </View>

            {/* Content */}
            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : contacts.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIcon}>
                        <Ionicons name="people-outline" size={48} color={Colors.gray} />
                    </View>
                    <Text style={styles.emptyTitle}>Henüz kişi eklenmemiş</Text>
                    <Text style={styles.emptyDesc}>Acil durumlarda ulaşılacak kişileri ekleyin.</Text>
                    <TouchableOpacity style={styles.addButton} onPress={() => handleAddEdit()}>
                        <Ionicons name="add" size={18} color={Colors.black} />
                        <Text style={styles.addButtonText}>Yeni Kişi Ekle</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    <FlatList
                        data={contacts}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                    <View style={styles.fabContainer}>
                        <TouchableOpacity style={styles.fabButton} onPress={() => handleAddEdit()}>
                            <Ionicons name="add" size={30} color={Colors.black} />
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: s(16),
        paddingVertical: vs(12),
        backgroundColor: Colors.secondary,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backBtn: {
        padding: s(8),
        marginRight: s(8),
    },
    headerTitle: {
        fontSize: fs(18),
        fontWeight: 'bold',
        color: Colors.white,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: s(16),
        paddingBottom: vs(100),
    },
    card: {
        backgroundColor: Colors.secondary,
        borderRadius: ms(12),
        padding: s(16),
        marginBottom: vs(12),
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cardContent: {
        flex: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: vs(4),
    },
    cardTitle: {
        fontSize: fs(16),
        fontWeight: '600',
        color: Colors.white,
        marginRight: s(8),
    },
    relationshipText: {
        fontSize: fs(14),
        color: Colors.gray,
        fontWeight: '400',
    },
    cardPhone: {
        fontSize: fs(14),
        color: Colors.gray,
    },
    cardActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionBtn: {
        padding: s(8),
        backgroundColor: Colors.lightGray,
        borderRadius: ms(8),
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: s(32),
    },
    emptyIcon: {
        width: s(80),
        height: s(80),
        borderRadius: s(40),
        backgroundColor: Colors.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: vs(16),
    },
    emptyTitle: {
        fontSize: fs(18),
        fontWeight: 'bold',
        color: Colors.white,
        marginBottom: vs(8),
    },
    emptyDesc: {
        fontSize: fs(14),
        color: Colors.gray,
        textAlign: 'center',
        marginBottom: vs(24),
    },
    addButton: {
        marginTop: vs(18),
        paddingVertical: vs(12),
        paddingHorizontal: s(14),
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: ms(12),
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
    },
    addButtonText: {
        marginLeft: s(8),
        fontSize: fs(15),
        color: Colors.black,
        fontWeight: '700',
    },
    fabContainer: {
        position: 'absolute',
        bottom: vs(24),
        right: s(24),
    },
    fabButton: {
        width: s(56),
        height: s(56),
        borderRadius: s(28),
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
});
