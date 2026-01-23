import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Pressable, RefreshControl, Modal } from "react-native";
import { s, vs, fs, ms } from "../../utils/scale";
import { Colors } from "../../constants/Colors";
import { login, passwordForgot } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from '@expo/vector-icons';
import { useConfig } from "../../context/ConfigContext";
import { WebView } from 'react-native-webview';
import { useToast } from '../../context/ToastContext';
import ErrorBanner from '../../components/ErrorBanner';


export default function LoginScreen({ navigation, route }) {
    const { saveToken, setUser } = useAuth();
    const { showToast } = useToast();
    const [email, setEmail] = useState(route?.params?.email ?? "");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [secure, setSecure] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { config } = useConfig();
    const [webOpen, setWebOpen] = useState(false);
    const [webUrl, setWebUrl] = useState(null);
    const [webTitle, setWebTitle] = useState('');
    const openWeb = (title, url) => { if (!url) return; setWebTitle(title); setWebUrl(url); setWebOpen(true); };

    const formatInput = (text) => {
        // Eğer harf veya @ varsa formatlama yapma (email girişine izin ver)
        if (/[a-zA-Z@]/.test(text)) {
            return text;
        }

        // Sadece rakamları al
        const cleaned = text.replace(/\D/g, "");

        // 1. Durum: 5 ile başlıyorsa (10 hane: 5XX XXX XX XX)
        if (cleaned.startsWith('5')) {
            const match = cleaned.slice(0, 10).match(/^(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})$/);
            if (match) {
                return `${match[1]} ${match[2]} ${match[3]} ${match[4]}`.trim().replace(/\s+/g, " ");
            }
        }
        // 2. Durum: 05 ile başlıyorsa (11 hane: 05XX XXX XX XX)
        else if (cleaned.startsWith('05')) {
            const match = cleaned.slice(0, 11).match(/^(\d{0,4})(\d{0,3})(\d{0,2})(\d{0,2})$/);
            if (match) {
                return `${match[1]} ${match[2]} ${match[3]} ${match[4]}`.trim().replace(/\s+/g, " ");
            }
        }
        // 3. Durum: 90 ile başlıyorsa (12 hane: 90 5XX XXX XX XX)
        else if (cleaned.startsWith('90')) {
            const match = cleaned.slice(0, 12).match(/^(\d{0,2})(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})$/);
            if (match) {
                return `${match[1]} ${match[2]} ${match[3]} ${match[4]} ${match[5]}`.trim().replace(/\s+/g, " ");
            }
        }

        return text;
    };

    const validate = () => {
        const e = {};
        const em = String(email).trim();
        const pw = String(password);

        if (!em) e.email = "E-posta veya Telefon giriniz";
        // Email formatı kontrolünü kaldırdık çünkü telefon da girilebilir

        if (pw.length < 6) e.password = "Parola en az 6 karakter olmalı";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const onSubmit = async () => {
        if (!validate()) return;
        setLoading(true);
        setErrors({}); // Önceki hataları temizle

        try {
            // Backend'e göndermeden önce telefon numarasını temizle
            let loginValue = email.trim();
            if (!loginValue.includes('@') && !/[a-zA-Z]/.test(loginValue)) {
                // Sadece rakam içeriyorsa telefon muamelesi yap
                let cleanPhone = loginValue.replace(/\D/g, "");
                // Başındaki 90 veya 0'ı kaldır, 10 haneli (5XX...) hale getir
                if (cleanPhone.startsWith('90')) cleanPhone = cleanPhone.substring(2);
                if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);

                // Eğer 10 haneli geçerli bir numara kaldıysa onu gönder
                if (cleanPhone.length === 10 && cleanPhone.startsWith('5')) {
                    loginValue = cleanPhone;
                }
            }

            const response = await login({ email: loginValue, password: password });

            // Standart DRF Yanıtı: { token: "...", user: {...} }
            const responseBody = response?.data;

            if (responseBody?.token) {
                try {
                    await saveToken(responseBody.token);
                    if (responseBody.user) {
                        setUser(responseBody.user);
                    }
                    showToast('Giriş başarılı', 'success');
                    setLoading(false); // Navigasyondan ÖNCE loading'i kapat
                    navigation.replace('HomeTab');
                    return;
                } catch (saveError) {
                    // Token kaydetme hatası
                    setErrors({ general: "Oturum kaydedilemedi. Lütfen tekrar deneyin." });
                    setLoading(false);
                    return;
                }
            } else {
                setErrors({ general: "Sunucudan geçersiz yanıt alındı." });
            }
        } catch (e) {
            const d = e?.response?.data;
            let msg = "Giriş başarısız. Lütfen bilgilerinizi kontrol edin.";
            const newErrors = {};

            // DRF hata formatı: { field: ["hata"], non_field_errors: ["hata"] }
            if (d) {
                if (typeof d === 'object') {
                    Object.keys(d).forEach(key => {
                        const val = d[key];
                        const errText = Array.isArray(val) ? val[0] : String(val);

                        if (key === 'non_field_errors' || key === 'detail') {
                            msg = errText;
                        } else {
                            newErrors[key] = errText;
                        }
                    });
                }
            }

            setErrors({ general: msg, ...newErrors });
        } finally {
            setLoading(false);
        }
    };



    // UseEffect to start with white bg for inputs but dark main bg
    // Actually better to style container with Colors.background

    const onRefresh = () => {
        setRefreshing(true);
        setEmail("");
        setPassword("");
        setErrors({});
        setLoading(false);
        setSecure(true);
        setTimeout(() => setRefreshing(false), 400);
    };

    return (
        <>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <ScrollView
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.darkGray} />}
                >
                    <View style={styles.headerRow}>
                        <TouchableOpacity style={styles.navBack} onPress={() => navigation.goBack?.()}>
                            <Ionicons name="arrow-back" size={20} color={Colors.white} />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.title}>Oturum açın</Text>
                    <ErrorBanner message={errors.general} messages={errors.details} onClose={() => setErrors((p) => ({ ...p, general: null, details: [] }))} />

                    <View style={styles.field}>
                        <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                            <TextInput
                                style={styles.input}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={(t) => setEmail(formatInput(t))}
                                placeholder="E-posta veya Telefon (5XX...)"
                                placeholderTextColor={Colors.gray}
                            />
                            {email.length > 0 && (
                                <Pressable onPress={() => setEmail("")} style={{ padding: 8 }}>
                                    <Ionicons name="close-circle" size={20} color={Colors.gray} />
                                </Pressable>
                            )}
                        </View>
                        <Text style={{ fontSize: fs(11), color: Colors.gray, marginTop: 4, marginLeft: 4 }}>
                            * E-posta adresinizle veya telefon numaranızla giriş yapabilirsiniz.
                        </Text>
                        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
                    </View>

                    <View style={styles.field}>
                        <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                            <TextInput
                                style={styles.input}
                                secureTextEntry={secure}
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Parolanız"
                                placeholderTextColor={Colors.gray}
                            />
                            <Pressable style={styles.secureToggle} onPress={() => setSecure((v) => !v)}>
                                <Ionicons name={secure ? "eye-off" : "eye"} size={20} color={Colors.gray} />
                            </Pressable>
                        </View>
                        {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
                    </View>

                    <TouchableOpacity onPress={() => navigation.navigate("PasswordForgot")}>
                        <Text style={styles.forgotPass}>Parolanızı mı unuttunuz?</Text>
                    </TouchableOpacity>

                    <View style={{ flex: 1 }} />

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.footerBtn} activeOpacity={0.85} onPress={onSubmit} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.footerBtnText}>Giriş Yap</Text>}
                        </TouchableOpacity>

                        <View style={styles.authSwitchRow}>
                            <Text style={styles.authSwitchText}>Hesabınız yok mu? </Text>
                            <Pressable onPress={() => navigation.navigate("Register")}>
                                <Text style={styles.authSwitchLink}>Kayıt Ol</Text>
                            </Pressable>
                        </View>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* Web Modal */}
            <Modal visible={webOpen} animationType="slide" presentationStyle="pageSheet">
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#f8f9fa', borderBottomWidth: 1, borderColor: '#eee' }}>
                        <TouchableOpacity onPress={() => setWebOpen(false)}>
                            <Text style={{ fontSize: 16, color: Colors.primary, fontWeight: '600' }}>Kapat</Text>
                        </TouchableOpacity>
                        <Text style={{ flex: 1, textAlign: 'center', fontWeight: 'bold' }}>{webTitle}</Text>
                        <View style={{ width: 40 }} />
                    </View>
                    {webUrl && <WebView source={{ uri: webUrl }} style={{ flex: 1 }} />}
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        paddingHorizontal: s(16),
        backgroundColor: Colors.background,
        paddingTop: vs(60),
        paddingBottom: vs(20),
    },
    headerRow: {
        marginBottom: vs(20),
        alignItems: 'flex-start'
    },
    navBack: {
        width: s(36),
        height: s(36),
        borderRadius: s(18),
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: vs(12),
    },
    title: {
        fontSize: fs(24),
        fontWeight: "700",
        color: Colors.white,
        marginBottom: vs(16),
    },
    field: {
        marginBottom: vs(16),
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.secondary,
        paddingHorizontal: s(12),
        height: vs(56),
    },
    inputError: {
        borderColor: Colors.red,
    },
    input: {
        flex: 1,
        height: "100%",
        fontSize: fs(16),
        color: Colors.white,
    },
    secureToggle: {
        padding: s(8),
    },
    errorText: {
        fontSize: fs(12),
        color: Colors.red,
        marginTop: vs(4),
        marginLeft: s(4),
    },
    forgotPass: {
        textAlign: "right",
        color: Colors.primary,
        fontSize: fs(14),
        fontWeight: "600",
        marginBottom: vs(32),
        marginTop: vs(8),
    },
    footer: {
        paddingVertical: vs(20),
        marginTop: 'auto',
    },
    footerBtn: {
        backgroundColor: Colors.primary,
        height: vs(56),

        alignItems: "center",
        justifyContent: "center",
        marginBottom: vs(24),
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    footerBtnText: {
        color: Colors.black,
        fontSize: fs(16),
        fontWeight: "600",
    },
    authSwitchRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
    },
    authSwitchText: {
        color: Colors.gray,
        fontSize: fs(14),
    },
    authSwitchLink: {
        color: Colors.primary,
        fontSize: fs(14),
        fontWeight: "700",
    },
});