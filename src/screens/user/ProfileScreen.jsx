import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { s, vs, fs, ms } from '../../utils/scale';
import {useAuth} from '../../context/AuthContext'

export default function ProfileScreen() {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const {user,setUser} = useAuth()

        const openEdit = () => {
        navigation.navigate('EditProfile', { initial: user, onSaved: (p) => setUser(p) });
    };

    const formatPhoneDisplay = (val) => {
        const raw = String(val || '').replace(/\D/g, '');
        let after = raw;
        if (raw.startsWith('90')) after = raw.slice(2);
        else if (raw.startsWith('0')) after = raw.slice(1);
        const d = after.slice(0, 10);
        const p1 = d.slice(0,3), p2 = d.slice(3,6), p3 = d.slice(6,8), p4 = d.slice(8,10);
        let out = '+90';
        if (p1) out += ` ${p1}`;
        if (p2) out += ` ${p2}`;
        if (p3) out += ` ${p3}`;
        if (p4) out += ` ${p4}`;
        return d.length ? out : '';
    };

    const ItemRow = ({ title, value, onPress }) => (
        <TouchableOpacity style={styles.itemRow} onPress={onPress} activeOpacity={0.8}>
            <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{title}</Text>
                <Text style={styles.itemValue}>{value}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#bbb" />
        </TouchableOpacity>
    );

    const displayName = user?.full_name 
        ? user.full_name 
        : (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : (user?.email || ''));

    const displayPhone = user?.phone_number || user?.Telefon || user?.phoneNumber || '';

return(
         <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: s(6) }}>
                    <Ionicons name="arrow-back" size={22} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Kişisel Bilgiler</Text>
            </View>

            <ScrollView style={{ marginTop: vs(20) }} contentContainerStyle={{ paddingBottom: vs(20) }}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>
                    <View style={styles.avatarCircle}>
                        <Ionicons name="person-outline" size={ms(42)} color="#f4a119" />
                    </View>
                </View>

                <View style={styles.listSection}>
                    <ItemRow title="Ad Soyad" value={displayName} onPress={openEdit} />
                    <ItemRow title="Telefon Numarası" value={formatPhoneDisplay(displayPhone)} onPress={openEdit} />
                    <ItemRow title="E-posta" value={user?.email || user?.Email || ''} onPress={openEdit} />
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingTop: vs(10), paddingHorizontal: s(16), paddingBottom: vs(8) },
    headerTitle: { marginLeft: s(8), fontSize: fs(20), fontWeight: '800', color: '#333' },
    section: { paddingHorizontal: s(16), paddingTop: vs(12) },
    sectionTitle: { fontSize: fs(18),fontWeight: '800', textAlign:'center',color: '#1a1a1a', marginBottom: vs(14) },
    avatarCircle: { width: s(80), height: s(80), borderRadius: s(40), borderWidth: 2, borderColor: '#f4a119', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: vs(16) },
    listSection: { paddingHorizontal: s(16) },
    itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: vs(14), borderBottomWidth: 1, borderBottomColor: '#f1f1f1' },
    itemTitle: { fontSize: fs(16), fontWeight: '700', color: '#333' },
    itemValue: { fontSize: fs(15), color: '#666', marginTop: vs(4) },
});

