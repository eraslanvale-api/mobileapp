import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { s, vs, fs, ms } from '../utils/scale';

export default function ErrorBanner({ message, messages, onClose }) {
  const items = Array.isArray(messages) && messages.length > 0 ? messages : (message ? [String(message)] : []);
  if (items.length === 0) return null;
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Ionicons name="alert-circle" size={20} color="#fff" />
        <View style={styles.texts}>
          {items.map((m, idx) => (
            <Text key={idx} style={styles.text}>{m}</Text>
          ))}
        </View>
        {onClose ? (
          <TouchableOpacity style={styles.close} onPress={onClose}>
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: Colors.red, borderRadius: ms(12), paddingHorizontal: s(12), paddingVertical: vs(10), marginBottom: vs(12) },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  texts: { flex: 1, marginLeft: s(8) },
  text: { color: '#fff', fontSize: fs(12), marginBottom: vs(4) },
  close: { marginLeft: s(8), padding: s(4) },
});

