import React, { useState } from "react";
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
    ActivityIndicator, Keyboard
} from "react-native";
import { s, vs, fs, ms } from "../../utils/scale";
import { Colors } from "../../constants/Colors";
import { passwordChangeRequest, passwordChangeConfirm } from "../../api/endpoints";
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../../context/ToastContext';
import { useNavigation } from '@react-navigation/native';

export default function PasswordChangeScreen() {
    const navigation = useNavigation();
    const { showToast } = useToast();

    // Step 1: Request code, Step 2: Enter code and new password
    const [step, setStep] = useState(1);

    // Step 1 fields
    const [currentPassword, setCurrentPassword] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);

    // Step 2 fields
    const [code, setCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const validateStep1 = () => {
        const e = {};
        if (!currentPassword) e.currentPassword = "Mevcut şifrenizi girin";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const validateStep2 = () => {
        const e = {};
        if (!code || code.length !== 4) e.code = "4 haneli doğrulama kodunu girin";
        if (!newPassword) e.newPassword = "Yeni şifrenizi girin";
        else if (newPassword.length < 6) e.newPassword = "En az 6 karakter olmalı";
        if (newPassword !== confirmPassword) e.confirmPassword = "Şifreler eşleşmiyor";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleRequestCode = async () => {
        Keyboard.dismiss();
        if (!validateStep1()) return;

        setLoading(true);
        try {
            await passwordChangeRequest({ current_password: currentPassword });
            showToast("Doğrulama kodu telefonunuza gönderildi.", "success");
            setStep(2);
        } catch (err) {
            const data = err?.response?.data;
            if (data?.current_password) {
                setErrors({ currentPassword: Array.isArray(data.current_password) ? data.current_password[0] : data.current_password });
            } else {
                showToast(data?.detail || "Bir hata oluştu", "error");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmChange = async () => {
        Keyboard.dismiss();
        if (!validateStep2()) return;

        setLoading(true);
        try {
            await passwordChangeConfirm({ code, new_password: newPassword });
            showToast("Şifreniz başarıyla değiştirildi!", "success");
            navigation.goBack();
        } catch (err) {
            const data = err?.response?.data;
            if (data?.code) {
                setErrors({ code: Array.isArray(data.code) ? data.code[0] : data.code });
            } else if (data?.new_password) {
                setErrors({ newPassword: Array.isArray(data.new_password) ? data.new_password[0] : data.new_password });
            } else {
                showToast(data?.detail || "Bir hata oluştu", "error");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <View style={styles.headerRow}>
                    <TouchableOpacity style={styles.navBack} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={20} color={Colors.black} />
                    </TouchableOpacity>
                </View>

                <Text style={styles.title}>Şifre Değiştir</Text>
                <Text style={styles.subtitle}>
                    {step === 1
                        ? "Mevcut şifrenizi girerek doğrulama kodu alın."
                        : "SMS ile gelen kodu ve yeni şifrenizi girin."}
                </Text>

                {step === 1 ? (
                    <>
                        <View style={styles.field}>
                            <Text style={styles.label}>Mevcut Şifre</Text>
                            <View style={[styles.inputWrapper, errors.currentPassword && styles.inputError]}>
                                <TextInput
                                    style={styles.input}
                                    secureTextEntry={!showCurrentPassword}
                                    value={currentPassword}
                                    onChangeText={setCurrentPassword}
                                    placeholder="Mevcut şifrenizi girin"
                                    placeholderTextColor={Colors.gray}
                                />
                                <TouchableOpacity style={styles.secureToggle} onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                                    <Ionicons name={showCurrentPassword ? 'eye' : 'eye-off'} size={18} color={Colors.darkGray} />
                                </TouchableOpacity>
                            </View>
                            {errors.currentPassword ? <Text style={styles.errorText}>{errors.currentPassword}</Text> : null}
                        </View>

                        <TouchableOpacity style={styles.submitBtn} onPress={handleRequestCode} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Kod Gönder</Text>}
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <View style={styles.field}>
                            <Text style={styles.label}>Doğrulama Kodu</Text>
                            <View style={[styles.inputWrapper, errors.code && styles.inputError]}>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="number-pad"
                                    value={code}
                                    onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 4))}
                                    placeholder="4 haneli kod"
                                    placeholderTextColor={Colors.gray}
                                    maxLength={4}
                                />
                            </View>
                            {errors.code ? <Text style={styles.errorText}>{errors.code}</Text> : null}
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Yeni Şifre</Text>
                            <View style={[styles.inputWrapper, errors.newPassword && styles.inputError]}>
                                <TextInput
                                    style={styles.input}
                                    secureTextEntry={!showNewPassword}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    placeholder="Yeni şifrenizi girin"
                                    placeholderTextColor={Colors.gray}
                                />
                                <TouchableOpacity style={styles.secureToggle} onPress={() => setShowNewPassword(!showNewPassword)}>
                                    <Ionicons name={showNewPassword ? 'eye' : 'eye-off'} size={18} color={Colors.darkGray} />
                                </TouchableOpacity>
                            </View>
                            {errors.newPassword ? <Text style={styles.errorText}>{errors.newPassword}</Text> : null}
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Yeni Şifre (Tekrar)</Text>
                            <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputError]}>
                                <TextInput
                                    style={styles.input}
                                    secureTextEntry={!showConfirmPassword}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="Yeni şifrenizi tekrarlayın"
                                    placeholderTextColor={Colors.gray}
                                />
                                <TouchableOpacity style={styles.secureToggle} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                    <Ionicons name={showConfirmPassword ? 'eye' : 'eye-off'} size={18} color={Colors.darkGray} />
                                </TouchableOpacity>
                            </View>
                            {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
                        </View>

                        <TouchableOpacity style={styles.submitBtn} onPress={handleConfirmChange} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Şifreyi Değiştir</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.resendBtn} onPress={() => { setStep(1); setCode(""); setNewPassword(""); setConfirmPassword(""); setErrors({}); }}>
                            <Text style={styles.resendBtnText}>Tekrar Kod Gönder</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: "#fff",
        paddingHorizontal: s(16),
        paddingTop: vs(24),
        paddingBottom: vs(40),
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: vs(10),
    },
    navBack: {
        width: s(36),
        height: s(36),
        borderRadius: s(18),
        borderWidth: 1,
        borderColor: Colors.lightGray,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff",
    },
    title: {
        fontSize: fs(24),
        fontWeight: "700",
        color: Colors.black,
        marginBottom: vs(8),
    },
    subtitle: {
        fontSize: fs(14),
        color: Colors.darkGray,
        marginBottom: vs(24),
        lineHeight: vs(20),
    },
    field: {
        marginBottom: vs(16),
    },
    label: {
        fontSize: fs(14),
        fontWeight: "600",
        color: Colors.black,
        marginBottom: vs(6),
    },
    inputWrapper: {
        borderWidth: 1,
        borderColor: Colors.lightGray,
        borderRadius: ms(8),
        paddingHorizontal: s(12),
        paddingVertical: vs(4),
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        paddingVertical: vs(10),
        fontSize: fs(14),
        color: Colors.black,
    },
    inputError: {
        borderColor: Colors.red,
    },
    secureToggle: {
        padding: s(4),
    },
    errorText: {
        color: Colors.red,
        fontSize: fs(12),
        marginTop: vs(4),
    },
    submitBtn: {
        height: vs(52),
        backgroundColor: Colors.secondary,
        borderRadius: ms(8),
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: vs(16),
    },
    submitBtnText: {
        color: '#fff',
        fontSize: fs(16),
        fontWeight: '700',
    },
    resendBtn: {
        marginTop: vs(16),
        alignItems: 'center',
    },
    resendBtnText: {
        color: Colors.primary,
        fontSize: fs(14),
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
});
