import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { s, vs, fs, ms } from "../../utils/scale";
import { Colors } from "../../constants/Colors";
import { Ionicons } from '@expo/vector-icons';
import ErrorBanner from '../../components/ErrorBanner';
import { useToast } from '../../context/ToastContext';
import { passwordReset } from "../../api/endpoints";

export default function PasswordResetScreen({ navigation, route }) {
  const phone = route?.params?.phone ?? "";
  const code = route?.params?.code ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [secure, setSecure] = useState(true);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const validate = () => {
    const e = {};
    const pw = String(password);
    const cf = String(confirm);
    if (!pw || pw.length < 6) e.password = "Parola 6 karakter olmalı";
    if (pw !== cf) e.confirm = "Parolalar eşleşmiyor";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      // code parametresi backend'de SetNewPasswordSerializer'da da gerekli olmalı (güvenlik için)
      // Şimdilik gönderiyoruz, backend tarafını da güncelleyeceğiz.
      await passwordReset({ phone_number: phone, code, new_password: password });
      setErrors({});
      showToast('Parola sıfırlandı', 'success');
      navigation.navigate('Login', { phone: phone });
    } catch (e) {
      // console.log('Reset Error:', e);
      const d = e?.response?.data;
      let msg = "Sıfırlama başarısız";
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
              if (msg === "Sıfırlama başarısız") msg = "Lütfen bilgilerinizi kontrol edin.";
            }
          });
        }
      } else if (e?.message) {
        msg = e.message;
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
        <Text style={styles.title}>Parola sıfırla</Text>
        <ErrorBanner message={errors.general} messages={errors.details} onClose={() => setErrors((p) => ({ ...p, general: null, details: [] }))} />

        <View style={styles.field}>
          <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
            <TextInput
              style={styles.input}
              secureTextEntry={secure}
              value={password}
              onChangeText={setPassword}
              placeholder="Yeni parola"
              placeholderTextColor={Colors.gray}
            />
            <Pressable style={styles.secureToggle} onPress={() => setSecure((v) => !v)}>
              <Ionicons name={secure ? 'eye-off' : 'eye'} size={18} color={Colors.darkGray} />
            </Pressable>
          </View>
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
        </View>

        <View style={styles.field}>
          <View style={[styles.inputWrapper, errors.confirm && styles.inputError]}>
            <TextInput
              style={styles.input}
              secureTextEntry={secure}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Parolayı tekrar"
              placeholderTextColor={Colors.gray}
            />
          </View>
          {errors.confirm ? <Text style={styles.errorText}>{errors.confirm}</Text> : null}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerBtn} activeOpacity={0.85} onPress={onSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.footerBtnText}>Sıfırla</Text>}
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
    borderWidth: 1,
    borderColor: Colors.lightGray,
    paddingHorizontal: s(12),
    paddingVertical: vs(6),
    backgroundColor: '#fff',
  },
  input: {
    paddingVertical: vs(6),
    fontSize: fs(14),
    color: Colors.black,
  },
  inputError: {
    borderColor: Colors.red,
  },
  secureToggle: {
    position: 'absolute',
    right: s(12),
    top: vs(10),
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
    bottom: 0,
    backgroundColor: '#fff',
    paddingHorizontal: s(16),
    paddingVertical: vs(20),
    borderTopWidth: 0,
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
