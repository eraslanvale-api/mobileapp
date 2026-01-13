import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { s, vs, fs, ms } from "../../utils/scale";
import { Colors } from "../../constants/Colors";
import { Ionicons } from '@expo/vector-icons';
import ErrorBanner from '../../components/ErrorBanner';
import { useToast } from '../../context/ToastContext';
import { passwordForgot, passwordResetCode } from "../../api/endpoints";

export default function PasswordResetCodeScreen({ navigation, route }) {
  const phoneParam = route?.params?.phone ?? "";
  const [phone] = useState(String(phoneParam));
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(300);
  const refs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const { showToast } = useToast();

  useEffect(() => {
    const id = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  const validate = () => {
    const e = {};
    const cd = String(code).trim();
    if (cd.length !== 4) e.code = "4 haneli kod";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const resend = async () => {
    if (!phone) return;
    setSending(true);
    try {
      await passwordForgot({ phone_number: phone });
      setErrors({});
      showToast('Kod gönderildi', 'success');
    } catch (e) {
      // console.log('Resend Error:', e);
      const d = e?.response?.data;
      let msg = "Kod gönderilemedi";

      if (d) {
        if (d.non_field_errors) {
          msg = Array.isArray(d.non_field_errors) ? d.non_field_errors[0] : String(d.non_field_errors);
        } else if (d.detail) {
          msg = d.detail;
        }
      }
      setErrors({ general: msg });
    } finally {
      setSending(false);
    }
  };

  const onSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await passwordResetCode({ phone_number: phone, code });
      setErrors({});
      showToast('Doğrulama başarılı', 'success');
      navigation.navigate('PasswordReset', { phone, code });
    } catch (e) {
      // console.log('Verify Error:', e);
      const d = e?.response?.data;
      let msg = "Doğrulama başarısız";
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
              if (msg === "Doğrulama başarısız") msg = "Lütfen kodu kontrol edin.";
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

  const onDigitChange = (index, text) => {
    const val = text.replace(/[^0-9]/g, "").slice(0, 1);
    const next = [...digits];
    next[index] = val;
    setDigits(next);
    const joined = next.join("");
    setCode(joined);
    if (val && index < 3) refs[index + 1].current?.focus();
  };

  const onDigitKeyPress = (index, e) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      refs[index - 1].current?.focus();
    }
  };

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.navBack} onPress={() => navigation.goBack?.()}>
            <Ionicons name="arrow-back" size={20} color={Colors.black} />
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Doğrulama kodunu girin</Text>
        <ErrorBanner message={errors.general} messages={errors.details} onClose={() => setErrors((p) => ({ ...p, general: null, details: [] }))} />
        <Text style={styles.infoText}>{phone ? `${phone} numarasına gönderilen doğrulama kodunu giriniz.` : 'Telefon numaranıza gönderilen doğrulama kodunu giriniz.'}</Text>
        <View style={styles.codeRow}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={refs[i]}
              style={[styles.digitBox, errors.code && styles.inputError]}
              keyboardType="number-pad"
              maxLength={1}
              value={digits[i]}
              onChangeText={(t) => onDigitChange(i, t)}
              onKeyPress={(e) => onDigitKeyPress(i, e)}
            />
          ))}
        </View>
        {errors.code ? <Text style={styles.errorText}>{errors.code}</Text> : null}
        <View style={styles.resendWrap}>
          <Text style={styles.resendHint}>Henüz bir kod almadınız mı?</Text>
          {cooldown > 0 ? (
            <Text style={styles.cooldownText}><Text style={{ fontWeight: '700' }}>{fmt(cooldown)}</Text> sonra yeni kod isteyebilirsiniz.</Text>
          ) : (
            <Pressable onPress={() => { resend(); setCooldown(300); }} disabled={sending}>
              <Text style={styles.resendText}>{sending ? 'Gönderiliyor...' : 'Kodu tekrar gönder'}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerBtn} activeOpacity={0.85} onPress={onSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.footerBtnText}>Kodu onayla</Text>}
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
  inputError: {
    borderColor: Colors.red,
  },
  errorText: {
    color: Colors.red,
    fontSize: fs(12),
    marginTop: vs(6),
  },
  infoText: {
    fontSize: fs(13),
    color: Colors.darkGray,
    marginBottom: vs(12),
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: vs(6),
  },
  digitBox: {
    width: s(60),
    height: vs(60),
    borderWidth: 1,
    borderColor: Colors.lightGray,
    backgroundColor: '#fff',
    borderRadius: ms(16),
    textAlign: 'center',
    fontSize: fs(24),
    color: Colors.black,
  },
  resendWrap: {
    marginTop: vs(16),
    alignItems: 'center',
  },
  resendHint: {
    fontSize: fs(13),
    color: Colors.darkGray,
    marginBottom: vs(6),
  },
  cooldownText: {
    fontSize: fs(13),
    color: Colors.darkGray,
  },
  resendText: {
    fontSize: fs(13),
    color: Colors.black,
    fontWeight: '700',
    textDecorationLine: 'underline',
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
