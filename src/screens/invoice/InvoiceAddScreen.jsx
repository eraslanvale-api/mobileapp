import React, { useReducer, useState, useCallback } from 'react';
import { StyleSheet, Text, TextInput, View, TouchableOpacity, Switch, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useNavigation } from '@react-navigation/native';
import { s, vs, fs, ms } from '../../utils/scale';
import { useToast } from '../../context/ToastContext';
import { createInvoice } from '../../api/endpoints';

const initialForm = {
    fullName: '',
    companyName: '',
    email: '',
    phone: '',
    address: '',
    tckn: '',
    vkn: '',
    taxOffice: '',
    postalCode: '',
    city: '',
    district: ''
};

function formReducer(state, action) {
    switch (action.type) {
        case 'SET_FIELD':
            return { ...state, [action.key]: action.value };
        case 'RESET':
            return initialForm;
        default:
            return state;
    }
}

// Memoized generic input
const InputItem = React.memo(({ icon, placeholder, value, keyboardType, maxLength, autoCapitalize, fieldKey, onFieldChange, errorText }) => {
    const handleChange = useCallback((v) => onFieldChange(fieldKey, v), [onFieldChange, fieldKey]);

    return (
        <View style={styles.fieldContainer}>
            <View style={[styles.inputRow, errorText && styles.inputError]}>
                <Ionicons name={icon} size={20} color={Colors.gray} style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor={Colors.gray}
                    value={value}
                    onChangeText={handleChange}
                    keyboardType={keyboardType}
                    maxLength={maxLength}
                    autoCapitalize={autoCapitalize}
                    blurOnSubmit={false}
                />
            </View>
            {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
        </View>
    );
});

// Memoized phone input (uses the same stable onFieldChange)
const PhoneInputItem = React.memo(({ value, onFieldChange, errorText }) => {
    const handleChange = useCallback((text) => {
        // keep only digits up to 10
        const raw = (text || '').replace(/\D/g, '').slice(0, 10);
        const p1 = raw.slice(0, 3);
        const p2 = raw.slice(3, 6);
        const p3 = raw.slice(6, 8);
        const p4 = raw.slice(8, 10);
        let out = '';
        if (p1) out += p1;
        if (p2) out += ' ' + p2;
        if (p3) out += ' ' + p3;
        if (p4) out += ' ' + p4;
        onFieldChange('phone', out.trim());
    }, [onFieldChange]);

    return (
        <View style={styles.fieldContainer}>
            <View style={styles.phoneRowContainer}>
                <View style={styles.flagBox}>
                    <Text style={{ fontSize: fs(20) }}>🇹🇷</Text>
                </View>

                <View style={[styles.inputRow, { flex: 1, marginLeft: s(12) }, errorText && styles.inputError]}>
                    <Text style={styles.prefix}>+90</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Telefon Numarası"
                        placeholderTextColor={Colors.gray}
                        value={value}
                        onChangeText={handleChange}
                        keyboardType="phone-pad"
                        maxLength={14}
                        blurOnSubmit={false}
                    />
                </View>
            </View>
            {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
        </View>
    );
});

export default function InvoiceAddScreen() {
    const navigation = useNavigation();
    const { showToast } = useToast();

    const [type, setType] = useState('personal'); // personal | corporate
    const [isDefault, setIsDefault] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, dispatch] = useReducer(formReducer, initialForm);
    const [cityId, setCityId] = useState('');
    const [errors, setErrors] = useState({});

    // stable callback used by all inputs
    const onFieldChange = useCallback((key, value) => {
        dispatch({ type: 'SET_FIELD', key, value });
        // clear specific error when user types
        setErrors(prev => (prev[key] ? { ...prev, [key]: null } : prev));
    }, []);

    const isValidTCKN = useCallback((v) => {
        const t = String(v || '').replace(/\D/g, '');
        if (t.length !== 11) return false;
        if (t[0] === '0') return false;
        const d = t.split('').map((x) => parseInt(x, 10));
        const odd = d[0] + d[2] + d[4] + d[6] + d[8];
        const even = d[1] + d[3] + d[5] + d[7];
        const d10 = ((odd * 7) - even) % 10;
        const d11 = (d[0] + d[1] + d[2] + d[3] + d[4] + d[5] + d[6] + d[7] + d[8] + d[9]) % 10;
        return d[9] === d10 && d[10] === d11;
    }, []);

    const validate = useCallback(() => {
        const newErrors = {};
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((form.email || '').trim());
        const phoneDigits = (form.phone || '').replace(/\D/g, '');

        if (type === 'personal') {
            if (!form.fullName.trim()) newErrors.fullName = 'Tam isim gerekli';
            if (!emailOk) newErrors.email = 'Geçerli bir e-posta girin';
            if (phoneDigits.length < 10) newErrors.phone = 'Telefon numarası eksik';
            if (!form.address.trim()) newErrors.address = 'Adres gerekli';
            if (!isValidTCKN(form.tckn)) newErrors.tckn = 'Geçerli bir T.C. Kimlik Numarası girin';
        } else {
            if (!form.companyName.trim()) newErrors.companyName = 'Şirket adı gerekli';
            if (!emailOk) newErrors.email = 'Geçerli bir e-posta girin';
            if (phoneDigits.length < 10) newErrors.phone = 'Telefon numarası eksik';
            if (!form.address.trim()) newErrors.address = 'Adres gerekli';
            if ((form.vkn || '').replace(/\D/g, '').length !== 10) newErrors.vkn = 'Vergi numarası 10 haneli olmalı';
            if (!form.taxOffice.trim()) newErrors.taxOffice = 'Vergi dairesi gerekli';
        }

        if (!form.city) newErrors.city = 'İl seçin';
        if (!form.district) newErrors.district = 'İlçe seçin';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [form, type, isValidTCKN]);

    const onSave = useCallback(async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            const payload = {
                invoice_type: type === 'personal' ? 'Bireysel' : 'Kurumsal',
                full_name: type === 'personal' ? form.fullName : '',
                company_name: type === 'corporate' ? form.companyName : '',
                tax_office: type === 'corporate' ? form.taxOffice : '',
                tax_number: type === 'corporate' ? form.vkn : '',
                citizen_id: type === 'personal' ? form.tckn : '',
                description: form.address,
                city: form.city,
                district: form.district,
                email: form.email,
                phone_number: '+90' + (form.phone || '').replace(/\D/g, ''),
                postal_code: form.postalCode,
                is_default: isDefault,
            };

            await createInvoice(payload);
            showToast('Fatura bilgisi başarıyla kaydedildi', 'success');
            navigation.goBack();
        } catch (error) {
            console.error(error);
            showToast('Kaydetme işlemi başarısız oldu', 'error');
        } finally {
            setLoading(false);
        }
    }, [form, type, isDefault, navigation, showToast, validate]);

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: s(6) }}>
                    <Ionicons name="arrow-back" size={22} color={Colors.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Fatura Bilgisi Ekle</Text>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">

                    <View style={styles.segmentContainer}>
                        <TouchableOpacity style={[styles.segment, type === 'personal' && styles.segmentActive]} onPress={() => { setType('personal'); setErrors({}); }}>
                            <Text style={[styles.segmentText, type === 'personal' && styles.segmentTextActive]}>Bireysel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.segment, type === 'corporate' && styles.segmentActive]} onPress={() => { setType('corporate'); setErrors({}); }}>
                            <Text style={[styles.segmentText, type === 'corporate' && styles.segmentTextActive]}>Kurumsal</Text>
                        </TouchableOpacity>
                    </View>

                    {type === 'personal' ? (
                        <>
                            <InputItem
                                icon="person-outline"
                                placeholder="Tam isminiz"
                                value={form.fullName}
                                fieldKey="fullName"
                                onFieldChange={onFieldChange}
                                errorText={errors.fullName}
                            />
                            <InputItem
                                icon="mail-outline"
                                placeholder="E-posta"
                                value={form.email}
                                fieldKey="email"
                                onFieldChange={onFieldChange}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                errorText={errors.email}
                            />

                            <PhoneInputItem
                                value={form.phone}
                                onFieldChange={onFieldChange}
                                errorText={errors.phone}
                            />

                            <InputItem
                                icon="location-outline"
                                placeholder="Adres"
                                value={form.address}
                                fieldKey="address"
                                onFieldChange={onFieldChange}
                                errorText={errors.address}
                            />
                            <InputItem
                                icon="id-card-outline"
                                placeholder="T.C. Kimlik Numarası"
                                value={form.tckn}
                                fieldKey="tckn"
                                onFieldChange={onFieldChange}
                                keyboardType="number-pad"
                                maxLength={11}
                                errorText={errors.tckn}
                            />
                            <InputItem
                                icon="barcode-outline"
                                placeholder="Posta Kodu"
                                value={form.postalCode}
                                fieldKey="postalCode"
                                onFieldChange={onFieldChange}
                                keyboardType="number-pad"
                                errorText={errors.postalCode}
                            />
                        </>
                    ) : (
                        <>
                            <InputItem
                                icon="business-outline"
                                placeholder="Şirket adı"
                                value={form.companyName}
                                fieldKey="companyName"
                                onFieldChange={onFieldChange}
                                errorText={errors.companyName}
                            />
                            <InputItem
                                icon="mail-outline"
                                placeholder="E-posta"
                                value={form.email}
                                fieldKey="email"
                                onFieldChange={onFieldChange}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                errorText={errors.email}
                            />

                            <PhoneInputItem
                                value={form.phone}
                                onFieldChange={onFieldChange}
                                errorText={errors.phone}
                            />

                            <InputItem
                                icon="location-outline"
                                placeholder="Adres"
                                value={form.address}
                                fieldKey="address"
                                onFieldChange={onFieldChange}
                                errorText={errors.address}
                            />
                            <InputItem
                                icon="receipt-outline"
                                placeholder="Vergi Numarası"
                                value={form.vkn}
                                fieldKey="vkn"
                                onFieldChange={onFieldChange}
                                keyboardType="number-pad"
                                maxLength={10}
                                errorText={errors.vkn}
                            />
                            <InputItem
                                icon="library-outline"
                                placeholder="Vergi Dairesi"
                                value={form.taxOffice}
                                fieldKey="taxOffice"
                                onFieldChange={onFieldChange}
                                errorText={errors.taxOffice}
                            />
                            <InputItem
                                icon="barcode-outline"
                                placeholder="Posta Kodu"
                                value={form.postalCode}
                                fieldKey="postalCode"
                                onFieldChange={onFieldChange}
                                keyboardType="number-pad"
                                errorText={errors.postalCode}
                            />
                        </>
                    )}

                    {/* City Select */}
                    <View style={styles.fieldContainer}>
                        <TouchableOpacity
                            style={[styles.selectRow, errors.city && styles.inputError]}
                            onPress={() => navigation.navigate('CitySelect', {
                                onSelect: (it) => {
                                    onFieldChange('city', it.name);
                                    setCityId(String(it.id));
                                    onFieldChange('district', '');
                                }
                            })}
                        >
                            <Text style={[styles.selectLabel, !form.city && { color: Colors.gray }]}>
                                {form.city || 'İl seç'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={Colors.white} />
                        </TouchableOpacity>
                        {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
                    </View>

                    {/* District Select */}
                    <View style={styles.fieldContainer}>
                        <TouchableOpacity
                            style={[styles.selectRow, !form.city && { opacity: 0.5 }, errors.district && styles.inputError]}
                            disabled={!form.city}
                            onPress={() => navigation.navigate('DistrictSelect', {
                                cityId: cityId,
                                onSelect: (it) => onFieldChange('district', it.ilce_adi)

                            })}
                        >
                            <Text style={[styles.selectLabel, !form.district && { color: Colors.gray }]}>
                                {form.district || 'İlçe seç'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={Colors.white} />
                        </TouchableOpacity>
                        {errors.district && <Text style={styles.errorText}>{errors.district}</Text>}
                    </View>

                    <TouchableOpacity
                        style={styles.defaultRow}
                        activeOpacity={0.8}
                        onPress={() => setIsDefault(!isDefault)}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={styles.defaultLabel}>Varsayılan olarak işaretle</Text>
                            <Text style={styles.defaultSub}>Bu fatura bilgilerini varsayılan olarak kullan</Text>
                        </View>
                        <Ionicons
                            name={isDefault ? "checkbox" : "square-outline"}
                            size={24}
                            color={isDefault ? Colors.primary : Colors.gray}
                        />
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.saveButton, loading && { opacity: 0.7 }]}
                            onPress={onSave}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.saveText}>Kaydet</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    headerRow: {
        flexDirection: 'row', alignItems: 'center', paddingTop: vs(10), paddingHorizontal: s(16), paddingBottom: vs(8),
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        marginBottom: s(10),
        backgroundColor: Colors.secondary
    },
    headerTitle: { marginLeft: s(8), fontSize: fs(20), fontWeight: '800', color: Colors.white },
    backButton: { padding: s(4) },
    segmentContainer: {
        flexDirection: 'row',
        margin: s(16),
        backgroundColor: Colors.secondary,
        borderRadius: ms(12),
        padding: 4,
        height: vs(48),
        borderWidth: 1,
        borderColor: Colors.border
    },
    segment: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: ms(10)
    },
    segmentActive: {
        backgroundColor: Colors.primary,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2
    },
    segmentText: { color: Colors.gray, fontWeight: '500', fontSize: fs(15) },
    segmentTextActive: { color: Colors.black, fontWeight: '600' },

    fieldContainer: {
        marginHorizontal: s(16),
        marginBottom: vs(16),
    },

    phoneRowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    flagBox: {
        width: s(56),
        height: vs(56),
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.secondary,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: ms(12),
    },

    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.secondary,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: ms(12),
        height: vs(56),
        paddingHorizontal: s(12)
    },
    inputError: {
        borderColor: Colors.red
    },
    inputIcon: { marginRight: s(12) },
    prefix: { marginRight: s(8), fontSize: fs(16), color: Colors.white, fontWeight: '500' },
    input: { flex: 1, color: Colors.white, fontSize: fs(16), height: '100%' },
    errorText: {
        color: '#ff4d4f',
        fontSize: fs(12),
        marginTop: vs(4),
        marginLeft: s(4)
    },

    selectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.secondary,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: ms(12),
        height: vs(56),
        paddingHorizontal: s(16)
    },
    selectLabel: { color: Colors.white, fontSize: fs(16) },

    defaultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: s(16),
        marginTop: vs(8)
    },
    defaultLabel: { color: Colors.white, fontSize: fs(16), fontWeight: '500' },
    defaultSub: { color: Colors.gray, fontSize: fs(13), marginTop: 2 },

    footer: { paddingHorizontal: s(16), paddingVertical: vs(24) },
    saveButton: {
        backgroundColor: Colors.primary,
        height: vs(56),
        borderRadius: ms(12),
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4
    },
    saveText: { color: Colors.black, fontSize: fs(16), fontWeight: '600' },
});
