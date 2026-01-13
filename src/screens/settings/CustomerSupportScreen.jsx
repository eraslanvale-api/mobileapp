import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { s, vs, fs, ms } from '../../utils/scale';
import { useConfig } from '../../context/ConfigContext';
import { useToast } from '../../context/ToastContext';
import { Colors } from '../../constants/Colors';

export default function CustomerSupport() {
  const navigation = useNavigation();
  const { config } = useConfig();
  const { showToast } = useToast();

  const phone = config?.customerServicePhone || '+90 850 000 0000';
  const whatsapp = config?.customerServiceWhatsapp || '+90 530 000 0000';

  const normalizeDigits = (str) => (str || '').replace(/[^0-9]/g, '');

  const onPressCall = async () => {
    try {
      await Linking.openURL(`tel:${phone}`);
    } catch (e) {
      showToast('Arama başlatılamadı', 'error');
    }
  };

  const onPressWhatsApp = async () => {
    try {
      const p = normalizeDigits(whatsapp);
      const url = `whatsapp://send?phone=${p}&text=${encodeURIComponent('Merhaba, destek almak istiyorum.')}`;
      await Linking.openURL(url);
    } catch (e) {
      showToast('WhatsApp açılamadı', 'error');
    }
  };

  const SupportCard = ({ title, subtitle, icon, color, onPress }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}> 
        <Ionicons name={icon} size={28} color={color} />
      </View>
      
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>

      <View style={styles.arrowContainer}>
         <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Müşteri Hizmetleri</Text>
        <View style={styles.backBtnPlaceholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.hero}>
          <View style={styles.heroImageContainer}>
            <Ionicons name="headset" size={64} color={Colors.primary} />
          </View>
          <Text style={styles.heroTitle}>Size Nasıl Yardımcı Olabiliriz?</Text>
          <Text style={styles.heroDescription}>
            Görüşleriniz bizim için değerli. Sorularınız veya önerileriniz için dilediğiniz kanaldan bize ulaşabilirsiniz.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>İletişim Kanalları</Text>

        <SupportCard 
          title="Çağrı Merkezi"
          subtitle={phone}
          icon="call"
          color={Colors.primary}
          onPress={onPressCall}
        />

        <SupportCard 
          title="WhatsApp Destek Hattı"
          subtitle={whatsapp}
          icon="logo-whatsapp"
          color="#25D366"
          onPress={onPressWhatsApp}
        />


      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: s(16), 
    paddingVertical: vs(12), 
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: { 
    width: s(40), 
    height: s(40), 
    borderRadius: s(20), 
    backgroundColor: '#f5f5f5', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  backBtnPlaceholder: {
    width: s(40)
  },
  headerTitle: { 
    fontSize: fs(17), 
    fontWeight: '700', 
    color: '#1a1a1a' 
  },
  content: { 
    flex: 1 
  },
  scrollContent: {
    padding: s(20),
    paddingBottom: vs(40)
  },
  hero: {
    alignItems: 'center',
    marginBottom: vs(32),
    marginTop: vs(10)
  },
  heroImageContainer: {
    width: s(100),
    height: s(100),
    borderRadius: s(50),
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  heroTitle: {
    fontSize: fs(20),
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: vs(8),
    textAlign: 'center'
  },
  heroDescription: {
    fontSize: fs(14),
    color: '#666',
    textAlign: 'center',
    lineHeight: fs(20),
    maxWidth: '90%'
  },
  sectionTitle: {
    fontSize: fs(14),
    fontWeight: '600',
    color: '#8f8f8f',
    marginBottom: vs(12),
    marginLeft: s(4),
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: ms(16),
    padding: s(16),
    marginBottom: vs(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0'
  },
  iconContainer: {
    width: s(52),
    height: s(52),
    borderRadius: s(26),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: s(16)
  },
  cardContent: {
    flex: 1
  },
  cardTitle: {
    fontSize: fs(16),
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: vs(4)
  },
  cardSubtitle: {
    fontSize: fs(14),
    color: '#666',
    fontWeight: '500'
  },
  arrowContainer: {
    paddingLeft: s(8)
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: vs(20),
    opacity: 0.7
  },
  footerText: {
    fontSize: fs(13),
    color: '#8f8f8f',
    fontWeight: '500'
  }
});
