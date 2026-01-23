import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, RefreshControl, Keyboard, Modal
} from "react-native";
import { s, vs, fs, ms } from "../../utils/scale";
import { Colors } from "../../constants/Colors";
import { register, login } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from '@expo/vector-icons';
import ErrorBanner from '../../components/ErrorBanner';
import { useToast } from '../../context/ToastContext';
import { useConfig } from "../../context/ConfigContext";
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


export default function RegisterScreen({ navigation }) {
  const { saveToken, setUser } = useAuth();
  const { showToast } = useToast();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [term, setTerm] = useState(false);
  const [kvkk, setKvkk] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const { config } = useConfig();
  const [webOpen, setWebOpen] = useState(false);
  const [webUrl, setWebUrl] = useState(null);
  const [webTitle, setWebTitle] = useState('');
  const openWeb = (title, url) => { if (!url) return; setWebTitle(title); setWebUrl(url); setWebOpen(true); };
  const [secure, setSecure] = useState(true);

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
    const fn = String(fullName).trim();
    const ph = String(phone).replace(/\s/g, '');
    const pw = String(password);
    const em = String(email).trim();
    const phoneOk = /^5[0-9]{9}$/.test(ph);
    // Email opsiyonel, ama girildiyse valid olmalı
    const mailOk = em ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em) : true;

    // Apple Review: Ad Soyad ve Email zorunlu değil
    // if (!fn) e.fullName = "Ad Soyad zorunlu";

    if (!phoneOk) e.phone = "Geçerli bir telefon numarası girin (5XX XXX XXXX)";

    if (em && !mailOk) e.email = "Geçerli bir e-posta girin";

    if (!pw) e.password = "Parola zorunlu";
    else if (pw.length < 6) e.password = "En az 6 karakter";
    if (!term) e.term = "Kullanım şartları onaylanmalı";
    if (!kvkk) e.kvkk = "KVKK onayı gerekli";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async () => {
    Keyboard.dismiss();
    if (!validate()) return;
    setLoading(true);
    setSuccess("");

    try {
      const fullPhone = "90" + phone.trim().replace(/\s/g, '');
      const payload = {
        full_name: fullName.trim(),
        phone_number: fullPhone,
        password: password,
      };

      // Email varsa ekle
      if (email.trim()) {
        payload.email = email.trim();
      }

      const response = await register(payload);
      // console.log('Register Response:', JSON.stringify(response.data));

      const responseData = response?.data;

      // 1. Başarılı Kayıt Kontrolü (Standart DRF Create Yanıtı)
      if (responseData && (responseData.id || responseData.email || responseData.token)) {
        // Kayıt başarılı, doğrulama ekranına yönlendir
        showToast('Kayıt başarılı. Lütfen hesabınızı doğrulayın.', 'success');
        navigation.navigate('Verify', { phone: "90" + phone.trim().replace(/\s/g, '') });
        return;
      }

      // Fallback: Yine de başarılı kabul edelim
      showToast('Kayıt başarılı. Lütfen hesabınızı doğrulayın.', 'success');
      navigation.navigate('Verify', { phone: "90" + phone.trim().replace(/\s/g, '') });

    } catch (e) {
      // console.log('Register Error:', e);
      const d = e?.response?.data;
      let msg = "Kayıt başarısız";
      const newErrors = {};

      // DRF hata formatı: { email: ["Geçersiz"], password: ["Kısa"], non_field_errors: ["Hata"] }
      if (d) {
        if (typeof d === 'object') {
          Object.keys(d).forEach(key => {
            const val = d[key];
            const errText = Array.isArray(val) ? val[0] : String(val);

            if (key === 'non_field_errors' || key === 'detail') {
              msg = errText;
            } else {
              // Map backend field names to frontend state names if necessary
              let fieldKey = key;
              if (key === 'phone_number') fieldKey = 'phone';
              if (key === 'full_name') fieldKey = 'fullName';

              newErrors[fieldKey] = errText; // Field-specific hata
            }
          });
        }
      }

      // Eğer field hatası varsa (örneğin telefon numarası çakışması), 
      // hatayı sadece ilgili inputun altında göster, üstteki banner'ı açma.
      if (Object.keys(newErrors).length > 0) {
        msg = null;
      }

      setErrors({ ...newErrors, general: msg, details: [] });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setFullName("");
    setPhone("");
    setEmail("");
    setPassword("");
    setTerm(false);
    setKvkk(false);
    setMarketing(false);
    setErrors({});
    setSuccess("");
    setLoading(false);
    setSecure(true);
    setTimeout(() => setRefreshing(false), 400);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }}

      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
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
        <Text style={styles.title}>Hesap oluşturun</Text>
        <ErrorBanner message={errors.general} messages={errors.details} onClose={() => setErrors((p) => ({ ...p, general: null, details: [] }))} />
        {success ? <Text style={styles.successText}>{success}</Text> : null}

        <View style={styles.field}>
          <View style={[styles.inputWrapper, errors.fullName && styles.inputError]}>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Ad Soyad"
              placeholderTextColor={Colors.gray}
            />
          </View>
          {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
        </View>

        <View style={styles.field}>
          <View style={[styles.inputWrapper, errors.phone && styles.inputError, { flexDirection: 'row', alignItems: 'center' }]}>
            <Text style={{ fontSize: fs(14), color: Colors.white, fontWeight: '700', marginRight: s(4) }}>+90</Text>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(t) => setPhone(formatPhoneNumber(t))}
              placeholder="5XX XXX XXXX"
              placeholderTextColor={Colors.gray}
              maxLength={13}
            />
          </View>
          <Text style={{ fontSize: fs(11), color: Colors.gray, marginTop: 4, marginLeft: 4 }}>
            * Telefon numarası, hesabın SMS ile doğrulanması için gereklidir.
          </Text>
          {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
        </View>

        <View style={styles.field}>
          <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
            <TextInput
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              placeholder="E-posta"
              placeholderTextColor={Colors.gray}
            />
          </View>
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
              <Ionicons name={secure ? 'eye-off' : 'eye'} size={18} color={Colors.darkGray} />
            </Pressable>
          </View>
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
        </View>

        <View style={styles.checkRow}>
          <Pressable onPress={() => setTerm(!term)} style={[styles.checkBox, term && styles.checkBoxActive]} />
          <Text style={styles.checkLabel}>
            <Text style={styles.linkInlineUnderline} onPress={() => openWeb('Üyelik Sözleşmesi', String(config?.termsUrl))}>Üyelik Sözleşmesini</Text> kabul ediyorum.
          </Text>
        </View>
        {errors.term ? <Text style={styles.errorText}>{errors.term}</Text> : null}

        <View style={styles.checkRow}>
          <Pressable onPress={() => setKvkk(!kvkk)} style={[styles.checkBox, kvkk && styles.checkBoxActive]} />
          <Text style={styles.checkLabel}>
            <Text style={styles.linkInlineUnderline} onPress={() => openWeb('KVKK Sözleşmesi', String(config?.kvkkUrl))}>KVKK Sözleşmesini</Text> kabul ediyorum.
          </Text>
        </View>
        {errors.kvkk ? <Text style={styles.errorText}>{errors.kvkk}</Text> : null}

        <View style={styles.checkRow}>
          <Pressable onPress={() => setMarketing(!marketing)} style={[styles.checkBox, marketing && styles.checkBoxActive]} />
          <Text style={styles.checkLabel}>
            <Text style={styles.linkInlineUnderline} onPress={() => openWeb('Ticari Elektronik Bilgilendirme', String(config?.marketingInfoUrl))}>Ticari Elektronik</Text> iletiler hakkındaki bilgilendirme kapsamında tarafıma ticari elektronik ileti gönderilmesini onaylıyorum.
          </Text>
        </View>

        <View style={{ flex: 1 }} />

        <View style={styles.footer}>
          <TouchableOpacity style={styles.footerBtn} activeOpacity={0.85} onPress={onSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color={Colors.black} /> : <Text style={styles.footerBtnText}>Devam et</Text>}
          </TouchableOpacity>
          <View style={styles.authSwitchRow}>
            <Text style={styles.authSwitchText}>Hesabınız var mı? </Text>
            <Pressable onPress={() => navigation.navigate?.('Login')}>
              <Text style={styles.authSwitchLink}>Giriş yap</Text>
            </Pressable>
          </View>
        </View>
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
    </KeyboardAvoidingView>

  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: s(16),
    paddingTop: vs(60),
    paddingBottom: vs(20),
  },
  title: {
    fontSize: fs(24),
    fontWeight: "700",
    color: Colors.white,
    marginBottom: vs(16),
  },
  headerRow: {
    marginBottom: vs(20),
    alignItems: 'flex-start',
  },
  navBack: {
    width: s(36),
    height: s(36),
    borderRadius: s(18),
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.secondary,
    marginBottom: vs(12),
  },
  field: {
    marginBottom: vs(14),
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: Colors.border,

    paddingHorizontal: s(12),
    paddingVertical: vs(6),
    backgroundColor: Colors.secondary,
  },
  input: {
    paddingVertical: vs(6),
    fontSize: fs(14),
    color: Colors.white,
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
  successText: {
    color: '#2E7D32', // Daha koyu ve okunaklı bir yeşil
    fontSize: fs(14),
    fontWeight: 'bold',
    marginBottom: vs(8),
    textAlign: 'center',
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: vs(8),
  },
  checkBox: {
    width: s(18),
    height: s(18),
    borderRadius: ms(4),
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.secondary,
    marginRight: s(8),
  },
  checkBoxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkLabel: {
    fontSize: fs(14),
    color: Colors.gray,
  },
  linksRowCentered: {
    marginTop: vs(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  linkTextUnderline: {
    fontSize: fs(14),
    color: Colors.darkGray,
    fontWeight: "600",
    textDecorationLine: 'underline',
  },
  disclaimer: {
    marginTop: vs(16),
    fontSize: fs(12),
    color: Colors.darkGray,
    lineHeight: vs(18),
  },
  linkInlineUnderline: { color: Colors.primary, fontWeight: "700", textDecorationLine: 'underline' },
});
