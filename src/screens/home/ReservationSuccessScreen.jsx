import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, BackHandler } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { s, vs, fs, ms } from '../../utils/scale';
import { Colors } from '../../constants/Colors';
import { useJourney } from '../../context/JourneyContext';

export default function ReservationSuccessScreen() {
  const navigation = useNavigation();
  const { resetJourneyPlanning } = useJourney();

  useEffect(() => {
    resetJourneyPlanning();

    // Disable back button to prevent going back to the reservation flow
    const backAction = () => {
      handleHome();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, []);

  const handleHome = () => {
    // Reset navigation to HomeTab to clear the stack
    navigation.reset({
      index: 0,
      routes: [{ name: 'HomeTab' }],
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="checkmark-circle" size={ms(120)} color={Colors.primary} />

        <Text style={styles.title}>Rezervasyon Başarılı!</Text>

        <Text style={styles.subtitle}>
          Rezervasyonunuz başarıyla oluşturuldu.{'\n'}
          Hizmetimiz en kısa sürede size ulaşacaktır.
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleHome}>
          <Text style={styles.buttonText}>Anasayfaya Dön</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: s(24),
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: fs(24),
    fontWeight: 'bold',
    color: Colors.white,
    marginTop: vs(24),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fs(16),
    color: Colors.gray,
    textAlign: 'center',
    marginTop: vs(12),
    lineHeight: vs(24),
    marginBottom: vs(48),
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: vs(16),
    paddingHorizontal: s(32),
    borderRadius: ms(12),
    width: '100%',
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
  buttonText: {
    color: Colors.black,
    fontSize: fs(16),
    fontWeight: '600',
  },
});
