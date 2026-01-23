import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { s, vs, fs, ms } from '../../utils/scale';
import { createEmergencyContact, updateEmergencyContact } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { Colors } from '../../constants/Colors';

export default function AddEditEmergencyContactScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { showToast } = useToast();
    const { contact } = route.params || {};
    const isEditing = !!contact;

    const [formName, setFormName] = useState('');
    const [formPhone, setFormPhone] = useState('');
    const [formRelation, setFormRelation] = useState('');
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isEditing && contact) {
            setFormName(contact.name);

            // Parse phone number
            const rawInit = String(contact.phone_number || '').replace(/\D/g, '');
            let afterCc = rawInit;
            if (rawInit.startsWith('90')) {
                afterCc = rawInit.slice(2);
            } else if (rawInit.startsWith('0')) {
                afterCc = rawInit.slice(1);
            }
            setFormPhone(afterCc.slice(0, 10));

            setFormRelation(contact.relationship || '');
        }
    }, [isEditing, contact]);

    const formatTrPhone = (digits) => {
        const d = String(digits || '').replace(/\D/g, '').slice(0, 10);
        const p1 = d.slice(0, 3);
        const p2 = d.slice(3, 6);
        const p3 = d.slice(6, 8);
        const p4 = d.slice(8, 10);
        let out = '';
        if (p1) out += `${p1}`;
        if (p2) out += ` ${p2}`;
        if (p3) out += ` ${p3}`;
        if (p4) out += ` ${p4}`;
        return out.trim();
    };

    const handleSave = async () => {
        // Validation
        const newErrors = {};
        if (!formName.trim()) newErrors.name = 'İsim alanı zorunludur';
        if (formPhone.length !== 10) newErrors.phone = 'Telefon numarası 10 haneli olmalıdır';
        if (!formRelation.trim()) newErrors.relation = 'Yakınlık derecesi zorunludur';

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name: formName,
                phone_number: `+90${formPhone}`,
                relationship: formRelation
            };

            if (isEditing && contact?.id) {
                await updateEmergencyContact({ ...payload, id: contact.id });
                showToast('Kişi güncellendi', 'success');
            } else {
                await createEmergencyContact(payload);
                showToast('Kişi eklendi', 'success');
            }
            navigation.goBack();
        } catch (error) {
            showToast('İşlem başarısız', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isEditing ? 'Kişiyi Düzenle' : 'Yeni Kişi Ekle'}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.form}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Ad Soyad</Text>
                    <View style={[styles.inputWrapper, errors.name && styles.inputError]}>
                        <TextInput
                            style={styles.input}
                            value={formName}
                            onChangeText={(text) => {
                                setFormName(text);
                                if (errors.name) setErrors({ ...errors, name: null });
                            }}
                            placeholder="Örn: Ahmet Yılmaz"
                            placeholderTextColor={Colors.gray}
                        />
                    </View>
                    {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Telefon Numarası</Text>
                    <View style={[styles.inputWrapper, { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 0 }, errors.phone && styles.inputError]}>
                        <View style={styles.prefixBox}>
                            <Text style={styles.prefixText}>+90</Text>
                        </View>
                        <TextInput
                            style={[styles.input, { flex: 1 }]}
                            value={formatTrPhone(formPhone)}
                            onChangeText={(t) => {
                                setFormPhone(String(t).replace(/\D/g, '').slice(0, 10));
                                if (errors.phone) setErrors({ ...errors, phone: null });
                            }}
                            placeholder="5xx xxx xx xx"
                            placeholderTextColor={Colors.gray}
                            keyboardType="number-pad"
                        />
                    </View>
                    {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Yakınlık Derecesi</Text>
                    <View style={[styles.inputWrapper, errors.relation && styles.inputError]}>
                        <TextInput
                            style={styles.input}
                            value={formRelation}
                            onChangeText={(text) => {
                                setFormRelation(text);
                                if (errors.relation) setErrors({ ...errors, relation: null });
                            }}
                            placeholder="Örn: Babam, Eşim"
                            placeholderTextColor={Colors.gray}
                        />
                    </View>
                    {errors.relation && <Text style={styles.errorText}>{errors.relation}</Text>}
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, saving && styles.disabledBtn]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color={Colors.black} />
                    ) : (
                        <Text style={styles.saveButtonText}>{isEditing ? 'Güncelle' : 'Kaydet'}</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
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
        paddingTop: Platform.OS === 'android' ? vs(30) : vs(12),
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
    form: {
        padding: s(24),
    },
    inputGroup: {
        marginBottom: vs(16),
    },
    label: {
        fontSize: fs(14),
        color: Colors.gray,
        marginBottom: vs(8),
        fontWeight: '700',
    },
    inputWrapper: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: ms(12),
        backgroundColor: Colors.secondary,
        overflow: 'hidden',
    },
    inputError: {
        borderColor: Colors.red,
    },
    errorText: {
        color: Colors.red,
        fontSize: fs(12),
        marginTop: vs(4),
        marginLeft: s(4),
    },
    input: {
        paddingHorizontal: s(16),
        paddingVertical: vs(12),
        fontSize: fs(16),
        color: Colors.white,
    },
    prefixBox: {
        paddingHorizontal: s(16),
        paddingVertical: vs(12),
        backgroundColor: Colors.lightGray,
        borderRightWidth: 1,
        borderRightColor: Colors.border,
        justifyContent: 'center',
    },
    prefixText: {
        fontSize: fs(16),
        color: Colors.white,
        fontWeight: '600',
    },
    saveButton: {
        backgroundColor: Colors.primary,
        borderRadius: ms(12),
        paddingVertical: vs(16),
        alignItems: 'center',
        marginTop: vs(8),
    },
    saveButtonText: {
        color: Colors.black,
        fontSize: fs(16),
        fontWeight: 'bold',
    },
    disabledBtn: {
        opacity: 0.7,
    },
});
