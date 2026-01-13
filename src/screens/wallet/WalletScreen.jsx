import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const CARDS_KEY = "wallet_cards";

const WalletScreen = () => {
  const navigation = useNavigation();
  const [cards, setCards] = useState([]);
  const [selected, setSelected] = useState(null);
  const [activeCard, setActiveCard] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const mockCards = [
    { id: 'mock_1', brand: 'Visa', last4: '4242', expiry: '1228' },
    { id: 'mock_2', brand: 'Mastercard', last4: '5100', expiry: '1127' },
  ];

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", async () => {
      try {
        const raw = await AsyncStorage.getItem(CARDS_KEY);
        const list = JSON.parse(raw || '[]');
        if (Array.isArray(list) && list.length > 0) {
          setCards(list);
          setActiveCard(list[0]);
        } else {
          setCards(mockCards);
          setActiveCard(mockCards[0]);
        }
      } catch {
        setCards(mockCards);
        setActiveCard(mockCards[0]);
      }
    });
    return unsubscribe;
  }, [navigation]);

  const openDetails = (card) => {
    setSelected(card);
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!selected) return;
    Alert.alert(
      "Kart silinsin mi?",
      `${selected.brand} •••• ${selected.last4} kaldırılacak`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              const raw = await AsyncStorage.getItem(CARDS_KEY);
              const list = JSON.parse(raw || '[]');
              const base = Array.isArray(list) && list.length > 0 ? list : cards;
              const filtered = base.filter((c) => c.id !== selected.id);
              await AsyncStorage.setItem(CARDS_KEY, JSON.stringify(filtered));
              const newCards = filtered.length > 0 ? filtered : mockCards;
              setCards(newCards);
              if (selected.id === activeCard?.id) {
                setActiveCard(newCards[0]);
              }
              setShowModal(false);
              setSelected(null);
            } catch (e) {
              Alert.alert("Hata", "Kart silinemedi. Lütfen tekrar deneyin.");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cüzdan</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Active Card Display */}
      <TouchableOpacity
        style={styles.card}
        activeOpacity={activeCard ? 0.9 : 1}
        onPress={() => activeCard && openDetails(activeCard)}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={styles.cardTitle}>CÜZDAN</Text>
          {activeCard && <MaterialIcons name="nfc" size={24} color="rgba(255,255,255,0.6)" />}
        </View>
        
        {activeCard ? (
          <View style={{ marginTop: 24, gap: 20 }}>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 2 }}>
              •••• •••• •••• {activeCard.last4}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '600' }}>SKT</Text>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
                  {String(activeCard.expiry).slice(0, 2)}/{String(activeCard.expiry).slice(2)}
                </Text>
              </View>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18, fontStyle: 'italic' }}>
                {activeCard.brand}
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ height: 60 }} />
        )}
      </TouchableOpacity>

      {cards.length === 0 ? (
        <View style={styles.emptyWrap}>
          <MaterialIcons name="credit-card" size={56} color="#D0D0D0" />
          <Text style={styles.emptyText}>Ödeme yöntemi bulunmamaktadır.</Text>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 80, gap: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              activeOpacity={0.8} 
              onPress={() => setActiveCard(item)} 
              style={[
                styles.cardItem,
                activeCard?.id === item.id && { borderColor: "#F2A900", borderWidth: 2 }
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <MaterialIcons name="credit-card" size={20} color="#111" />
                <Text style={styles.cardItemTitle}>{item.brand} •••• {item.last4}</Text>
              </View>
              <Text style={styles.cardItemSub}>SKT {String(item.expiry).slice(0,2)}/{String(item.expiry).slice(2)}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity
        style={styles.addBtn}
        activeOpacity={0.9}
        onPress={() => navigation.navigate("PaymentMethodAdd")}
      >
        <MaterialIcons name="add" size={18} color="#111" />
        <Text style={styles.addText}>Ödeme yöntemi ekle</Text>
      </TouchableOpacity>
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={{ flex:1, backgroundColor:"rgba(0,0,0,0.35)", justifyContent:"flex-end" }}>
          <View style={{ backgroundColor:"#fff", borderTopLeftRadius:16, borderTopRightRadius:16, paddingBottom: 8 }}>
            <View style={{ alignItems:"center", paddingTop:8 }}>
              <View style={{ width:40, height:4, borderRadius:2, backgroundColor:'#E5E7EB' }} />
            </View>
            <View style={{ paddingHorizontal:16, paddingTop:12, paddingBottom:8, flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
              <Text style={{ fontWeight:'800', color:'#111', fontSize:16 }}>Kart detayları</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={{ padding:6 }}>
                <MaterialIcons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {selected && (
              <View style={{ paddingHorizontal:16, gap:8, paddingBottom:12 }}>
                <View style={{ padding:14, borderRadius:12, borderWidth:StyleSheet.hairlineWidth, borderColor:'#E5E7EB', backgroundColor:'#fff', gap:6 }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:10 }}>
                    <View style={{ width:36, height:36, borderRadius:8, backgroundColor:'#F3F4F6', alignItems:'center', justifyContent:'center' }}>
                      <MaterialIcons name="credit-card" size={20} color="#111" />
                    </View>
                    <View style={{ flex:1 }}>
                      <Text style={{ color:'#111', fontWeight:'800' }}>{selected.brand} •••• {selected.last4}</Text>
                      <Text style={{ color:'#6B7280', marginTop:2, fontSize:12 }}>SKT {String(selected.expiry).slice(0,2)}/{String(selected.expiry).slice(2)}</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={{ padding:14, borderRadius:12, borderWidth:StyleSheet.hairlineWidth, borderColor:'#FCA5A5', backgroundColor:'#FEF2F2', flexDirection:'row', alignItems:'center', gap:12 }}
                  onPress={handleDelete}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="delete" size={20} color="#DC2626" />
                  <Text style={{ color:'#DC2626', fontWeight:'800' }}>Kartı sil</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};
export default WalletScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
    header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: {
    flex: 1,
    textAlign: "left",
    fontWeight: "800",
    color: "#111",
    fontSize: 18,
    marginLeft: 8,
  },

  headerRight: { width: 36 },

  card: {
    margin: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#F2A900",
    gap: 10,
  },
  cardTitle: { color: "#fff", fontWeight: "900", letterSpacing: 0.5 },
  
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyText: { color: "#8A8A8A" },

  addBtn: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    height: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E5E5",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#fff",
  },
  addText: { fontWeight: "800", color: "#111" },
  cardItem: { padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: "#E5E5E5", backgroundColor: "#fff" },
  cardItemTitle: { color: "#111", fontWeight: "800" },
  cardItemSub: { color: "#8A8A8A", marginTop: 4 },
});
