import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TopMenu from '../../components/TopMenu';
import { s, vs, fs, ms } from '../../utils/scale';
import { useConfig } from '../../context/ConfigContext';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { logout } from '../../api/endpoints';
import * as Updates from 'expo-updates';

const Section = ({ title, children }) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {children}
    </View>
);

const Item = ({ icon, label, onPress }) => (
    <TouchableOpacity style={styles.item} onPress={onPress}>
        <Ionicons name={icon} size={24} color="#333" style={styles.itemIcon} />
        <Text style={styles.itemLabel}>{label}</Text>
    </TouchableOpacity>
);

export default function SettingsScreen() {
    const navigation = useNavigation();
    const { config } = useConfig();
    const { isAuthenticated, clearToken } = useAuth();
    const { showToast } = useToast();
    const [webOpen, setWebOpen] = useState(false);
    const [webUrl, setWebUrl] = useState(null);
    const [webTitle, setWebTitle] = useState('');
    const [checkingUpdate, setCheckingUpdate] = useState(false);

    const openWeb = (title, url) => { if (!url) return; setWebTitle(title); setWebUrl(url); setWebOpen(true); };

    const handleLogout = async () => {
        try {
            await logout();
        } catch (_) { }
        await clearToken();
        showToast("Başarıyla çıkış yapıldı.", "success");
        navigation.navigate('Login');
    };

    const checkForUpdates = async () => {
        if (__DEV__) {
            Alert.alert('Geliştirici Modu', 'Geliştirme modunda güncellemeler kontrol edilemez.');
            return;
        }

        try {
            setCheckingUpdate(true);
            const update = await Updates.checkForUpdateAsync();

            if (update.isAvailable) {
                Alert.alert(
                    'Güncelleme Mevcut',
                    'Yeni bir güncelleme bulundu. İndirip uygulamayı yeniden başlatmak ister misiniz?',
                    [
                        { text: 'İptal', style: 'cancel' },
                        {
                            text: 'Evet, Güncelle',
                            onPress: async () => {
                                try {
                                    showToast("Güncelleme indiriliyor...", "info");
                                    await Updates.fetchUpdateAsync();
                                    await Updates.reloadAsync();
                                } catch (e) {
                                    Alert.alert('Hata', 'Güncelleme indirilirken bir hata oluştu.');
                                }
                            }
                        }
                    ]
                );
            } else {
                Alert.alert('Güncel', 'Uygulamanız şu an en güncel sürümde.');
            }
        } catch (error) {
            Alert.alert('Hata', 'Güncellemeler kontrol edilirken bir hata oluştu: ' + error.message);
        } finally {
            setCheckingUpdate(false);
        }
    };

    return (
        <View style={styles.container}>

            <TopMenu />

            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: vs(20) }}>
                {isAuthenticated ? (
                    <Section title="HESAP">
                        <Item icon="person-outline" label="Hesabım" onPress={() => navigation.navigate('Profile')} />
                        <Item icon="key-outline" label="Şifre Değiştir" onPress={() => navigation.navigate('PasswordChange')} />
                        <Item icon="bookmark-outline" label="Adreslerim" onPress={() => navigation.navigate('Addresses')} />
                        <Item icon="people-outline" label="Acil Durum Kişileri" onPress={() => navigation.navigate('EmergencyContacts')} />
                        <Item icon="receipt-outline" label="Fatura bilgilerim" onPress={() => navigation.navigate('Invoice')} />
                        <Item icon="alert-circle-outline" label="Hesap iptali" onPress={() => navigation.navigate('AccountDelete')} />
                        <Item icon="log-out-outline" label="Çıkış Yap" onPress={handleLogout} />
                    </Section>
                ) : (
                    <Section title="HESAP">
                        <Item icon="log-in-outline" label="Giriş Yap" onPress={() => navigation.navigate('Login')} />
                        <Item icon="person-add-outline" label="Kayıt Ol" onPress={() => navigation.navigate('Register')} />
                    </Section>
                )}

                <Section title="DİĞER BİLGİLER">
                    <Item icon="information-circle-outline" label="Uygulama Tanıtımı" onPress={() => navigation.navigate('Onboarding', { fromSettings: true })} />
                    <Item icon="call-outline" label="Müşteri Hizmetleri" onPress={() => navigation.navigate('CustomerSupport')} />
                    <Item icon="document-text-outline" label="İptal ve İade Koşulları" onPress={() => openWeb('İptal ve İade Koşulları', String(config?.termsUrl))} />
                    <Item icon="book-outline" label="Gizlilik politikası" onPress={() => openWeb('Gizlilik politikası', String(config?.privacyUrl))} />
                    <Item icon="cloud-download-outline" label={checkingUpdate ? "Kontrol ediliyor..." : "Güncellemeleri Kontrol Et"} onPress={checkingUpdate ? null : checkForUpdates} />
                </Section>

            </ScrollView>
            <Modal visible={webOpen} animationType="slide" onRequestClose={() => setWebOpen(false)}>
                <View style={{ flex: 1, backgroundColor: '#fff' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: s(16), paddingVertical: vs(12), borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
                        <TouchableOpacity onPress={() => setWebOpen(false)} style={{ padding: s(6), marginRight: s(6) }}>
                            <Ionicons name="arrow-back" size={ms(22)} color="#333" />
                        </TouchableOpacity>
                        <Text style={{ flex: 1, fontSize: fs(18), fontWeight: '800', color: '#333' }} numberOfLines={1}>{webTitle}</Text>
                    </View>
                    {webUrl ? (
                        <WebView
                            source={{ uri: webUrl }}
                            startInLoadingState
                            renderLoading={() => (
                                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                    <ActivityIndicator size="small" color="#f4a119" />
                                    <Text style={{ marginTop: vs(8), color: '#666' }}>Yükleniyor...</Text>
                                </View>
                            )}
                        />
                    ) : (
                        <View style={{ flex: 1 }} />
                    )}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    logoIcon: { width: 28, height: 28, backgroundColor: '#F5A623', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    logoText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#4b2c14', flex: 1 },
    notificationButton: { padding: 4 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, paddingHorizontal: 12, height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
    searchText: { marginLeft: 8, color: '#999', fontSize: 15 },
    content: { flex: 1, marginTop: vs(80) },
    section: { marginBottom: 24 },
    sectionTitle: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f9f9f9', color: '#666', fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
    item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    itemIcon: { marginRight: 16, width: 24 },
    itemLabel: { fontSize: 16, color: '#333' },
});
