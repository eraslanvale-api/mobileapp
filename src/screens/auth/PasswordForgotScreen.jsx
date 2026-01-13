import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Keyboard } from "react-native";
import { s, vs, fs, ms } from "../../utils/scale";
import { Colors } from "../../constants/Colors";
import { Ionicons } from '@expo/vector-icons';
import ErrorBanner from '../../components/ErrorBanner';
import { useToast } from '../../context/ToastContext';
import { passwordForgot } from "../../api/endpoints";

export default function PasswordForgotScreen({ navigation }) {
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const formatPhoneNumber = (text) => {
    const cleaned = text.replace(/\D/g, "").slice(0, 10);
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})$/);
    if (!match) return cleaned;
    let formatted = match[1];
    if (match[2]) formatted += " " + match[2];
    if (match[3]) formatted += " " + match[3];
    if (match[4]) formatted += " " + match[4];
    return formatted.trim();
  };

  const validate = () => {
    const e = {};
    const p = String(phone).replace(/\s/g, '');
    const phoneOk = /^5[0-9]{9}$/.test(p);
    if (!phoneOk) e.phone = "Geçerli bir telefon numarası girin (5XX XXX XX XX)";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async () => {
    Keyboard.dismiss();
    if (!validate()) return;
    setLoading(true);
    try {
      const fullPhone = "90" + phone.replace(/\s/g, '');
      await passwordForgot({ phone_number: fullPhone });
      setErrors({});
      showToast('Kod gönderildi', 'success');
      navigation.navigate('PasswordResetCode', { phone: fullPhone });
    } catch (e) {
      const d = e?.response?.data;
      let msg = "İstek başarısız";
      const newErrors = {};

      if (d) {
        if (typeof d === 'string') {
          msg = d;
        } else if (typeof d === 'object') {
          Object.keys(d).forEach(key => {
            const val = d[key];
            const errText = Array.isArray(val) ? val[0] : String(val);

            if (key === 'non_field_errors' || key === 'detail' || key === 'error') {
              msg = errText;
            } else {
              newErrors[key] = errText;
              // Eğer spesifik bir alan hatası varsa ve genel mesaj değişmediyse, "Lütfen formu kontrol edin" diyebiliriz.
              if (msg === "İstek başarısız") msg = "Lütfen bilgilerinizi kontrol edin.";
            }
          });
        }
      } else if (e?.message) {
        msg = e.message;
      }

      // Backend 'phone_number' dönerse biz 'phone' state'iyle eşleştirelim
      if (newErrors.phone_number) {
        newErrors.phone = newErrors.phone_number;
      }

      // Tek alanlı form olduğu için genel hatayı field error olarak göster
      if (!newErrors.phone && msg && msg !== "İstek başarısız") {
        newErrors.phone = true; // Sadece border kırmızı olsun, yazı yazmasın
        // msg = null; // ErrorBanner'da da görünmesi istendi
      }

      setErrors({ general: msg, ...newErrors });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.navBack} onPress={() => navigation.goBack?.()}>
            <Ionicons name="arrow-back" size={20} color={Colors.black} />
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Parolamı unuttum</Text>
        <ErrorBanner message={errors.general} messages={errors.details} onClose={() => setErrors((p) => ({ ...p, general: null, details: [] }))} />
        <View style={styles.field}>
          <View style={[styles.inputWrapper, errors.phone && styles.inputError]}>
            <View style={styles.prefixContainer}>
              <Text style={styles.prefixText}>+90</Text>
            </View>
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              autoCapitalize="none"
              value={phone}
              onChangeText={(text) => setPhone(formatPhoneNumber(text))}
              placeholder="5XX XXX XX XX"
              placeholderTextColor={Colors.gray}
              maxLength={13}
            />
          </View>
          {errors.phone && typeof errors.phone === 'string' ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerBtn} activeOpacity={0.85} onPress={onSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.footerBtnText}>Devam et</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#fff",
    paddingHorizontal: s(16),
    paddingTop: vs(24),
    paddingBottom: vs(120),
  },
  title: {
    fontSize: fs(24),
    fontWeight: "700",
    color: Colors.black,
    marginBottom: vs(16),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: vs(10),
  },
  navBack: {
    width: s(36),
    height: s(36),
    borderWidth: 1,
    borderColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: s(18),
  },
  field: {
    marginBottom: vs(14),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.lightGray,
    paddingHorizontal: s(12),
    paddingVertical: vs(6),
    backgroundColor: '#fff',
  },
  prefixContainer: {
    marginRight: s(10),
    borderRightWidth: 1,
    borderRightColor: Colors.lightGray,
    paddingRight: s(10),
  },
  prefixText: {
    fontSize: fs(14),
    color: Colors.black,
    fontWeight: '500',
  },
  input: {
    flex: 1,
    paddingVertical: vs(6),
    fontSize: fs(14),
    color: Colors.black,
  },
  inputError: {
    borderColor: Colors.red,
  },
  errorText: {
    color: Colors.red,
    fontSize: fs(12),
    marginTop: vs(6),
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 20,
    backgroundColor: '#fff',
    paddingHorizontal: s(16),
    paddingVertical: vs(20),
  },
  footerBtn: {
    height: vs(52),
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnText: {
    color: '#fff',
    fontSize: fs(16),
    fontWeight: '700',
  },
});
