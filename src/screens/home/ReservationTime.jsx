import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { s, vs, fs, ms } from '../../utils/scale';
import { Colors } from '../../constants/Colors';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useJourney } from '../../context/JourneyContext';

export default function ReservationTime() {
  const navigation = useNavigation();
  const { pickupTime, setPickupTime, pickupAt, setPickupAt, setNavLock } = useJourney();

  const [selected, setSelected] = useState('now');
  const [customDate, setCustomDate] = useState(pickupAt ? new Date(pickupAt) : new Date());
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  useEffect(() => {
    setNavLock(true);
    return () => setNavLock(false);
  }, [setNavLock]);

  useEffect(() => {
    if (pickupAt) setSelected('custom');
    else if (pickupTime && pickupTime.startsWith('Hemen')) setSelected('now');
  }, [pickupTime, pickupAt]);

  const plusHours = useMemo(() => {
    const now = new Date();
    return [2, 3, 4].map((h) => {
      const d = new Date(now.getTime() + h * 60 * 60 * 1000);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return { h, label: `${h} saat sonra`, time: `${hh}:${mm}`, date: d };
    });
  }, []);

  const fmtDate = (d) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };
  const fmtTime = (d) => {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const onSubmit = () => {
    if (selected === 'now') {
      setPickupTime('Hemen');
      setPickupAt(null);
    } else if (selected === 'custom') {
      setPickupTime('Özel rezervasyon');
      setPickupAt(customDate.toISOString());
    } else if (selected.startsWith('plus_')) {
      const h = Number(selected.split('_')[1]);
      const d = new Date(Date.now() + h * 60 * 60 * 1000);
      setPickupTime(`${h} saat sonra`);
      setPickupAt(d.toISOString());
    }
    navigation.goBack();
  };

  const onChangeDate = (event, date) => {
    if (Platform.OS === 'android') setShowDate(false);
    if (event.type === 'set' && date) {
      const nd = new Date(customDate);
      nd.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      setCustomDate(nd);
    }
  };

  const onChangeTime = (event, date) => {
    if (Platform.OS === 'android') setShowTime(false);
    if (event.type === 'set' && date) {
      const nd = new Date(customDate);
      nd.setHours(date.getHours(), date.getMinutes(), 0, 0);
      setCustomDate(nd);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rezervasyon Saati</Text>
      </View>

      <View style={styles.list}>
        <TouchableOpacity style={[styles.item, selected === 'now' && styles.itemSelected]} onPress={() => setSelected('now')}>
          <Ionicons name={selected === 'now' ? 'radio-button-on' : 'radio-button-off'} size={24} color={selected === 'now' ? Colors.primary : Colors.gray} />
          <Text style={[styles.itemLabel, selected === 'now' && styles.itemLabelSelected]}>Hemen</Text>
          <Text style={[styles.itemValue, selected === 'now' && styles.itemValueSelected]}>{fmtTime(new Date())}</Text>
        </TouchableOpacity>

        <View style={styles.separator} />

        <TouchableOpacity style={[styles.item, selected === 'custom' && styles.itemSelected]} onPress={() => setSelected('custom')}>
          <Ionicons name={selected === 'custom' ? 'radio-button-on' : 'radio-button-off'} size={24} color={selected === 'custom' ? Colors.primary : Colors.gray} />
          <Text style={[styles.itemLabel, selected === 'custom' && styles.itemLabelSelected]}>Özel rezervasyon</Text>
          <Text style={[styles.itemValue, selected === 'custom' && styles.itemValueSelected]}>{fmtDate(customDate)} {fmtTime(customDate)}</Text>
        </TouchableOpacity>

        {selected === 'custom' && (
          <View style={styles.pickers}>
            <View style={styles.pickerRow}>
              <TouchableOpacity style={styles.pickerPill} onPress={() => setShowDate(true)}>
                <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
                <Text style={styles.pickerPillText}>{fmtDate(customDate)}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pickerRow}>
              <TouchableOpacity style={styles.pickerPill} onPress={() => setShowTime(true)}>
                <Ionicons name="time-outline" size={20} color={Colors.primary} />
                <Text style={styles.pickerPillText}>{fmtTime(customDate)}</Text>
              </TouchableOpacity>
            </View>
            {showDate && (
              <DateTimePicker value={customDate} mode="date" display="default" onChange={onChangeDate} themeVariant="light" accentColor={Colors.primary} />
            )}
            {showTime && (
              <DateTimePicker value={customDate} mode="time" display="default" onChange={onChangeTime} themeVariant="light" accentColor={Colors.primary} />
            )}
          </View>
        )}

        <View style={styles.separator} />

        {plusHours.map(({ h, label, time }) => (
          <TouchableOpacity key={h} style={[styles.item, selected === `plus_${h}` && styles.itemSelected]} onPress={() => setSelected(`plus_${h}`)}>
            <Ionicons name={selected === `plus_${h}` ? 'radio-button-on' : 'radio-button-off'} size={24} color={selected === `plus_${h}` ? Colors.primary : Colors.gray} />
            <Text style={[styles.itemLabel, selected === `plus_${h}` && styles.itemLabelSelected]}>{label}</Text>
            <Text style={[styles.itemValue, selected === `plus_${h}` && styles.itemValueSelected]}>{time}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerBtn} onPress={onSubmit}>
          <Text style={styles.footerBtnText}>Onayla</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: vs(12),
    paddingHorizontal: s(16),
    paddingBottom: vs(12),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  backButton: {
    padding: s(6),
    marginRight: s(8),
  },
  headerTitle: {
    fontSize: fs(18),
    fontWeight: '800',
    color: Colors.white
  },
  list: {
    paddingHorizontal: s(16),
    paddingTop: vs(8)
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(16),
    paddingHorizontal: s(12),
    borderRadius: ms(12),
    marginVertical: vs(4)
  },
  itemSelected: {
    backgroundColor: Colors.secondary,
    borderWidth: 1,
    borderColor: Colors.primary
  },
  itemLabel: {
    marginLeft: s(12),
    fontSize: fs(16),
    fontWeight: '600',
    color: Colors.gray,
    flex: 1
  },
  itemLabelSelected: {
    color: Colors.white,
    fontWeight: '700'
  },
  itemValue: {
    fontSize: fs(14),
    color: Colors.gray,
    fontWeight: '500'
  },
  itemValueSelected: {
    color: Colors.primary,
    fontWeight: '700'
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: vs(4)
  },
  pickers: {
    paddingHorizontal: s(12),
    paddingBottom: vs(16),
    gap: vs(12)
  },
  pickerRow: {
    marginTop: vs(4)
  },
  pickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: ms(12),
    paddingVertical: vs(12),
    paddingHorizontal: s(16),
    backgroundColor: Colors.secondary
  },
  pickerPillText: {
    marginLeft: s(12),
    fontSize: fs(16),
    color: Colors.white,
    fontWeight: '600'
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: s(16),
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border
  },
  footerBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: vs(16),

    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  footerBtnText: {
    color: Colors.black,
    fontWeight: '800',
    fontSize: fs(16)
  },
});
