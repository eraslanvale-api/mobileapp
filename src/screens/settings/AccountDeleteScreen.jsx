import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { s, vs, fs, ms } from '../../utils/scale';
import { deleteAccount } from '../../api/endpoints';
import { Colors } from '../../constants/Colors';

export default function AccountDeleteScreen() {
  const nav = useNavigation();
  const { clearToken, user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [agree, setAgree] = useState(false);

  const performDelete = async () => {
    try {
      setLoading(true);
      if (!user?.id) throw new Error("Kullanıcı ID bulunamadı.");

      // console.log("Silinecek Kullanıcı ID:", user?.id);
      const payload = { KullaniciID: user.id };
      // console.log("Delete Payload:", JSON.stringify(payload));

      const response = await deleteAccount(payload);
      // console.log("Delete Response:", JSON.stringify(response.data));

      await clearToken();
      showToast("Hesabınız başarıyla silindi.", "success");
      nav.reset({ index: 0, routes: [{ name: 'HomeTab' }] });
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || "Bir hata oluştu.";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={ms(22)} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Üyelik iptali</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.iconCircle}><Ionicons name="person-remove" size={ms(48)} color={Colors.primary} /></View>
          <Text style={styles.title}>Üyelik iptali</Text>
          <Text style={styles.desc}>Hesabınızı silmek istediğinize gerçekten emin misiniz? Bu işlem geri alınamaz ve tüm verileriniz kalıcı olarak silinecektir.</Text>
        </View>
      </ScrollView>

      <View style={styles.bottomGlow}>
        <View style={styles.glowLayer1} />
        <View style={styles.glowLayer2} />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => nav.goBack()}>
          <Text style={styles.cancelText}>İptal et</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => { setAgree(false); setConfirmOpen(true); }} disabled={loading}>
          <Text style={styles.deleteText}>{loading ? 'Siliniyor...' : 'Hesabımı sil'}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Onay gerekiyor</Text>
            <Text style={styles.modalDesc}>Bu işlem geri alınamaz. Verileriniz kalıcı olarak silinecek.</Text>
            <TouchableOpacity style={[styles.checkRow, agree && styles.checkRowActive]} onPress={() => setAgree(!agree)}>
              <View style={[styles.checkBox, agree && styles.checkBoxChecked]} />
              <Text style={styles.checkLabel}>Anladım ve onaylıyorum</Text>
            </TouchableOpacity>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmOpen(false)}>
                <Text style={styles.cancelText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.deleteBtn, !agree && { opacity: 0.5 }]} onPress={() => { if (agree) { setConfirmOpen(false); performDelete(); } }} disabled={!agree || loading}>
                <Text style={styles.deleteText}>Sil</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: s(16), borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.secondary },
  backButton: { width: s(36), height: vs(36), borderRadius: s(18), borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginRight: s(8), backgroundColor: Colors.secondary },
  headerTitle: { fontSize: fs(18), fontWeight: '800', color: Colors.white },
  scrollContent: { flexGrow: 1, paddingHorizontal: s(24), paddingVertical: vs(12) },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: s(72), height: vs(72), borderRadius: ms(36), backgroundColor: 'rgba(212,175,55,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: vs(16) },
  title: { fontSize: fs(24), fontWeight: '800', color: Colors.white, marginBottom: vs(8) },
  desc: { textAlign: 'center', color: Colors.gray, lineHeight: fs(20) },
  bottomGlow: { position: 'absolute', bottom: 0, left: 0, right: 0, height: vs(200), backgroundColor: 'transparent', overflow: 'visible', alignItems: 'center' },
  glowLayer1: { position: 'absolute', bottom: -vs(60), width: s(480), height: vs(480), borderRadius: ms(240), backgroundColor: Colors.primary, opacity: 0.12 },
  glowLayer2: { position: 'absolute', bottom: -vs(30), width: s(420), height: vs(420), borderRadius: ms(210), backgroundColor: Colors.primary, opacity: 0.08 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: s(16), backgroundColor: Colors.background },
  cancelBtn: { flex: 1, height: vs(52), borderRadius: ms(12), backgroundColor: Colors.secondary, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginRight: s(8) },
  cancelText: { color: Colors.white, fontWeight: '700' },
  deleteBtn: { flex: 1, height: vs(52), borderRadius: ms(12), backgroundColor: Colors.red, alignItems: 'center', justifyContent: 'center', marginLeft: s(8) },
  deleteText: { color: Colors.white, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '88%', borderRadius: ms(16), backgroundColor: Colors.secondary, padding: s(16) },
  modalTitle: { fontSize: fs(18), fontWeight: '800', color: Colors.white, marginBottom: vs(8) },
  modalDesc: { color: Colors.gray, marginBottom: vs(12) },
  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: vs(8) },
  checkRowActive: {},
  checkBox: { width: s(18), height: vs(18), borderRadius: ms(4), borderWidth: 1, borderColor: Colors.border, marginRight: s(8), backgroundColor: Colors.background },
  checkBoxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkLabel: { color: Colors.white, fontWeight: '600' },
  modalFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: vs(12) }
});
