import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView, Modal, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { s, vs, fs, ms } from '../../utils/scale';
import { useConfig } from '../../context/ConfigContext';
import { useToast } from '../../context/ToastContext';
import { WebView } from 'react-native-webview';

import AsyncStorage from "@react-native-async-storage/async-storage";
const CARDS_KEY = "wallet_cards";

const detectBrand = (num) => {
  const n = (num || "").replace(/\D/g, "");
  if (/^4[0-9]{6,}$/.test(n)) return "Visa";
  if (/^5[1-5][0-9]{5,}$/.test(n) || /^2(2[2-9]|[3-6][0-9]|7[01])[0-9]{4,}$/.test(n)) return "Mastercard";
  if (/^3[47][0-9]{5,}$/.test(n)) return "Amex";
  return "Card";
};

const luhnCheck = (num) => {
  const s = (num || "").replace(/\D/g, "");
  let sum = 0;
  let dbl = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let d = Number(s[i]);
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
};

export default function AddPaymentMethodScreen({ navigation }) {
  const { config } = useConfig();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState({ name: false, number: false, expiry: false, cvc: false });
  const [term, setTerm] = useState(false);
  const [kvkk, setKvkk] = useState(false);
  const [webOpen, setWebOpen] = useState(false);
  const [webUrl, setWebUrl] = useState(null);
  const [webTitle, setWebTitle] = useState('');
  const openWeb = (title, url) => { if (!url) return; setWebTitle(title); setWebUrl(url); setWebOpen(true); };

  const canSave = useMemo(() => {
    const digits = number.replace(/\D/g, "");
    const exp = expiry.replace(/\D/g, "");
    const mm = Number(exp.slice(0, 2));
    const yy = Number(exp.slice(2, 4));
    const c = cvc.replace(/\D/g, "");
    if (!name.trim()) return false;
    if (digits.length !== 16) return false;
    if (!luhnCheck(digits)) return false;
    if (exp.length !== 4 || mm < 1 || mm > 12) return false;
    const now = new Date();
    const year = 2000 + yy;
    const monthIndex = mm - 1;
    const expDate = new Date(year, monthIndex + 1, 1);
    if (expDate <= new Date(now.getFullYear(), now.getMonth(), 1)) return false;
    if (c.length !== 3) return false;
    if (!term || !kvkk) return false;
    return true;
  }, [name, number, expiry, cvc, term, kvkk]);

  const errors = useMemo(() => {
    const out = { name: "", number: "", expiry: "", cvc: "" };
    const digits = number.replace(/\D/g, "");
    const exp = expiry.replace(/\D/g, "");
    const mm = Number(exp.slice(0, 2));
    const yy = Number(exp.slice(2, 4));
    const c = cvc.replace(/\D/g, "");
    if (!name.trim()) out.name = "İsim zorunludur";
    if (digits.length !== 16) out.number = "Kart numarası 16 haneli olmalıdır";
    else if (!luhnCheck(digits)) out.number = "Geçersiz kart numarası";
    if (exp.length !== 4 || mm < 1 || mm > 12) out.expiry = "Son kullanma AA/YY formatında olmalıdır";
    else {
      const now = new Date();
      const year = 2000 + yy;
      const monthIndex = mm - 1;
      const expDate = new Date(year, monthIndex + 1, 1);
      if (expDate <= new Date(now.getFullYear(), now.getMonth(), 1)) out.expiry = "Kartın son kullanma tarihi geçmiş";
    }
    if (c.length !== 3) out.cvc = "CVC 3 haneli olmalıdır";
    return out;
  }, [name, number, expiry, cvc]);

  const formatNumber = (t) => t.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const formatExpiry = (t) => {
    const d = t.replace(/\D/g, "").slice(0, 4);
    if (d.length <= 2) return d;
    return d.slice(0, 2) + "/" + d.slice(2);
  };

  const handleSave = async () => {
    if (!canSave) return;
    try {
      setSaving(true);
      const id = Date.now().toString();
      const digits = number.replace(/\D/g, "");
      const last4 = digits.slice(-4);
      const brand = detectBrand(digits);
      const expDigits = expiry.replace(/\D/g, "");
      const meta = { id, brand, last4, name: name.trim(), expiry: expDigits };
      const existing = await AsyncStorage.getItem(CARDS_KEY);
      const list = JSON.parse(existing || "[]");
      await AsyncStorage.setItem(`card_${id}`, JSON.stringify({ number: digits, cvc: cvc.replace(/\D/g, "") }));
      await AsyncStorage.setItem(CARDS_KEY, JSON.stringify([...list, meta]));
      showToast("Kart başarıyla eklendi", "success");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Hata", "Kart eklenemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={ms(24)} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ödeme yöntemi ekle</Text>
      </View>

      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 ,backgroundColor:'#fff', paddingBottom: vs(24) }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Card Preview */}
        <View style={styles.cardPreview}>
        <View style={styles.cardVisual}>
          <View style={styles.cardChip}>
            <View style={styles.chipInner} />
          </View>
          <View style={styles.cardNumberDisplay}>
            <Text style={styles.cardNumberText}>
              {number || "•••• •••• •••• ••••"}
            </Text>
          </View>
          <View style={styles.cardFooter}>
            <View style={styles.cardNameRow}>
              <Text style={styles.cardLabel}>KART SAHİBİ</Text>
              <Text style={styles.cardName} numberOfLines={1}>
                {name || "İSİM SOYİSİM"}
              </Text>
            </View>
            <View style={styles.cardExpiryRow}>
              <Text style={styles.cardLabel}>SKT</Text>
              <Text style={styles.cardExpiry}>{expiry || "AA/YY"}</Text>
            </View>
            <View style={styles.cardBrandBadge}>
              <Text style={styles.cardBrandText}>{number.replace(/\D/g, '').length === 16 ? detectBrand(number) : ''}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <View style={[styles.inputContainer, touched.name && errors.name && styles.inputError]}>
            <MaterialIcons name="person-outline" size={ms(20)} color="#6B7280" />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              placeholder="Kart üzerindeki isim"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>
          {touched.name && !!errors.name && (
            <View style={styles.errorRow}>
              <MaterialIcons name="error-outline" size={ms(14)} color="#DC2626" />
              <Text style={styles.errorText}>{errors.name}</Text>
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <View style={[styles.inputContainer, touched.number && errors.number && styles.inputError]}>
            <MaterialIcons name="credit-card" size={ms(20)} color="#6B7280" />
            <TextInput
              style={styles.input}
              value={number}
              onChangeText={(t) => setNumber(formatNumber(t))}
              onBlur={() => setTouched((t) => ({ ...t, number: true }))}
              placeholder="Kart numarası"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              returnKeyType="next"
            />
            {number.replace(/\D/g, '').length === 16 && (
              <View style={styles.brandPill}>
                <Text style={styles.brandText}>{detectBrand(number)}</Text>
              </View>
            )}
          </View>
          {touched.number && !!errors.number && (
            <View style={styles.errorRow}>
              <MaterialIcons name="error-outline" size={ms(14)} color="#DC2626" />
              <Text style={styles.errorText}>{errors.number}</Text>
            </View>
          )}
        </View>

        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <View style={[styles.inputContainer, touched.expiry && errors.expiry && styles.inputError]}>
            <MaterialIcons name="event" size={ms(20)} color="#6B7280" />
              <TextInput
                style={styles.input}
                value={expiry}
                onChangeText={(t) => setExpiry(formatExpiry(t))}
                onBlur={() => setTouched((t) => ({ ...t, expiry: true }))}
                placeholder="AA/YY"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                returnKeyType="next"
              />
            </View>
            {touched.expiry && !!errors.expiry && (
              <View style={styles.errorRow}>
              <MaterialIcons name="error-outline" size={ms(14)} color="#DC2626" />
                <Text style={styles.errorText}>{errors.expiry}</Text>
              </View>
            )}
          </View>
          <View style={styles.inputGroup}>
            <View style={[styles.inputContainer, touched.cvc && errors.cvc && styles.inputError]}>
            <MaterialIcons name="lock-outline" size={ms(20)} color="#6B7280" />
              <TextInput
                style={styles.input}
                value={cvc}
                onChangeText={(t) => setCvc(t.replace(/\D/g, "").slice(0, 3))}
                onBlur={() => setTouched((t) => ({ ...t, cvc: true }))}
                placeholder="CVC"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                secureTextEntry
                returnKeyType="done"
              />
            </View>
            {touched.cvc && !!errors.cvc && (
              <View style={styles.errorRow}>
              <MaterialIcons name="error-outline" size={ms(14)} color="#DC2626" />
                <Text style={styles.errorText}>{errors.cvc}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.securityNotice}>
          <MaterialIcons name="verified-user" size={ms(16)} color="#059669" />
          <Text style={styles.securityText}>Kart bilgileriniz güvenli şekilde saklanır</Text>
        </View>

        <View style={styles.checkRow}>
          <TouchableOpacity onPress={() => setTerm(!term)} style={[styles.checkBox, term && styles.checkBoxActive]}>
             {term && <MaterialIcons name="check" size={ms(16)} color="#f4a119" />}
          </TouchableOpacity>
          <Text style={styles.checkLabel}>
            <Text onPress={() => openWeb('Üyelik Sözleşmesi', String(config?.termsUrl ?? ''))} style={styles.linkInlineUnderline}>Üyelik Sözleşmesi</Text>’ni kabul ediyorum.
          </Text>
        </View>
        <View style={styles.checkRow}>
          <TouchableOpacity onPress={() => setKvkk(!kvkk)} style={[styles.checkBox, kvkk && styles.checkBoxActive]}>
             {kvkk && <MaterialIcons name="check" size={ms(16)} color="#f4a119" />}
          </TouchableOpacity>
          <Text style={styles.checkLabel}>
            <Text onPress={() => openWeb('KVKK Sözleşmesi', String(config?.kvkkUrl ?? ''))} style={styles.linkInlineUnderline}>KVKK Sözleşmesi</Text>’ni kabul ediyorum.
          </Text>
        </View>
      </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave || saving}
          activeOpacity={0.9}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Kartı Kaydet</Text>}
        </TouchableOpacity>
      </View>
    <Modal visible={webOpen} animationType="slide" onRequestClose={() => setWebOpen(false)}>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: s(16), paddingVertical: vs(12), borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
          <TouchableOpacity onPress={() => setWebOpen(false)} style={{ padding: s(6), marginRight: s(6) }}>
            <MaterialIcons name="arrow-back" size={ms(22)} color="#333" />
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
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    height: vs(56),
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: s(16),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerBtn: { width: s(40), height: s(40), alignItems: "center", justifyContent: "center" },
  headerTitle: {
    flex: 1,
    textAlign: "left",
    fontWeight: "800",
    color: "#111",
    fontSize: fs(18),
    marginLeft: s(8),
  },
  cardPreview: {
    padding: s(20),
    paddingTop: vs(24),
    paddingBottom: vs(16),
    
    
  },
  cardVisual: {
    height: vs(200),
    borderRadius: ms(16),
    padding: s(20),
    backgroundColor: '#f4a119',
    shadowColor: '#f4a119',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: ms(16),
    elevation: 10,
    justifyContent: 'space-between',
  },
  cardChip: {
    width: s(50),
    height: vs(40),
    borderRadius: ms(8),
    backgroundColor: 'rgba(255,255,255,0.3)',
    padding: s(4),
  },
  chipInner: {
    flex: 1,
    borderRadius: ms(4),
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  cardNumberDisplay: {
    marginTop: vs(20),
  },
  cardNumberText: {
    fontSize: fs(22),
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  cardNameRow: {
    flex: 1,
  },
  cardLabel: {
    fontSize: fs(9),
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
    marginBottom: vs(4),
  },
  cardName: {
    fontSize: fs(14),
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  cardExpiryRow: {
    alignItems: 'flex-end',
    marginRight: s(12),
  },
  cardExpiry: {
    fontSize: fs(14),
    fontWeight: '700',
    color: '#fff',
  },
  cardBrandBadge: {
    paddingHorizontal: s(10),
    paddingVertical: vs(6),
    borderRadius: ms(6),
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  cardBrandText: {
    fontSize: fs(11),
    fontWeight: '800',
    color: '#fff',
  },
  form: { paddingHorizontal: s(16), paddingTop: vs(8), gap: s(16) },
  inputGroup: { gap: s(8), flex: 1 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    paddingHorizontal: s(16),
    paddingVertical: vs(14),
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: ms(12),
  },
  inputError: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  input: {
    flex: 1,
    fontSize: fs(15),
    color: "#111",
    padding: 0,
    fontWeight: '500',
  },
  brandPill: {
    paddingHorizontal: s(10),
    paddingVertical: vs(6),
    borderRadius: ms(6),
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  brandText: {
    color: '#92400E',
    fontWeight: '800',
    fontSize: fs(11),
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(6),
    marginTop: vs(2),
  },
  errorText: {
    color: "#DC2626",
    fontSize: fs(12),
    fontWeight: '600',
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: s(12),
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    paddingHorizontal: s(16),
    paddingVertical: vs(12),
    backgroundColor: '#ECFDF5',
    borderRadius: ms(12),
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  securityText: {
    flex: 1,
    fontSize: fs(13),
    fontWeight: '600',
    color: '#065F46',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    marginTop: vs(12),
  },
  checkBox: {
    width: s(20),
    height: s(20),
    borderRadius: ms(4),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxActive: {
    borderColor: '#f4a119',
  },
  checkLabel: {
    flex: 1,
    color: '#374151',
    fontSize: fs(14),
    fontWeight: '600',
  },
  linkInlineUnderline: {
    color: '#111',
    textDecorationLine: 'underline',
    fontWeight: '700',
  },
  footer: {
    padding: s(16),
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  saveBtn: {
    height: vs(52),
    borderRadius: ms(16),
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: {
    backgroundColor: "#D1D5DB",
    opacity: 0.6,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: fs(15),
  },
});
