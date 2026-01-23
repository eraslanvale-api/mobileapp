import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, FlatList, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { s, vs, fs, ms } from '../utils/scale';
import Constants from 'expo-constants';
import { useConfig } from '../context/ConfigContext';
import { getPlacePredictions, getPlaceDetails } from '../api/googleMaps';
import { Colors } from '../constants/Colors';

// Fallback if env is not working immediately (though it should)

export default function AddressAutocomplete({ placeholder, value, onSelect, onMapSelect, onClear, enableCurrent = false }) {
    const { config } = useConfig();
    const API_KEY = config?.googleMapsApiKey || (Platform.OS === 'ios'
        ? Constants.expoConfig?.extra?.googleMapsApiKeyIos
        : Constants.expoConfig?.extra?.googleMapsApiKeyAndroid);
    const [query, setQuery] = useState(value?.address || '');
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const next = value?.address || '';
        if (next !== query) {
            setQuery(next);
            setPredictions([]);
        }
    }, [value?.address]);

    const searchPlaces = async (text) => {
        setQuery(text);

        if (text.length < 2) {
            setPredictions([]);
            return;
        }

        setLoading(true);
        try {
            const predictions = await getPlacePredictions(text, API_KEY);
            setPredictions(predictions);
        } catch (error) {
            // console.error('Autocomplete error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = async (placeId, description) => {
        setLoading(true);

        // MOCK DETAILS FALLBACK
        if (!API_KEY || API_KEY === 'YOUR_GOOGLE_API_KEY_HERE') {
            setTimeout(() => {
                // Return a fake location (randomized for demo)
                const location = { lat: 39.9334 + (Math.random() * 2), lng: 32.8597 + (Math.random() * 2) };
                onSelect({ address: description, location });
                setPredictions([]);
                setLoading(false);
            }, 500);
            return;
        }

        try {
            const result = await getPlaceDetails(placeId, API_KEY);
            const location = result.geometry.location;
            onSelect({ address: description, location });
            setPredictions([]);
        } catch (error) {
            // console.error('Place details error:', error);
        } finally {
            setLoading(false);
        }
    };

    const useCurrentLocation = async () => {
        try {
            setLoading(true);
            const { status } = await Location.requestForegroundPermissionsAsync();
            const granted = status === 'granted';
            if (!granted) { setLoading(false); return; }
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const r = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            let address = 'Mevcut Konum';
            try {
                const res = await Location.reverseGeocodeAsync({ latitude: r.latitude, longitude: r.longitude });
                if (res && res[0]) {
                    const a = res[0];
                    const parts = [a.street, a.district, a.city].filter(Boolean);
                    if (parts.length > 0) address = parts.join(', ');
                }
            } catch (_) { }
            const payload = { address, location: { lat: r.latitude, lng: r.longitude } };
            onSelect?.(payload);
            setQuery(address);
            setPredictions([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.inputContainer}>
                <Ionicons name="search" size={s(18)} color={Colors.gray} style={styles.searchIcon} />
                <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    value={query}
                    onChangeText={searchPlaces}
                    placeholderTextColor={Colors.gray}
                />
                {query.length > 0 ? (
                    <TouchableOpacity onPress={() => { setQuery(''); setPredictions([]); onClear?.(); }}>
                        <Ionicons name="close-circle" size={s(18)} color={Colors.gray} />
                    </TouchableOpacity>
                ) : (
                    enableCurrent && (
                        <TouchableOpacity onPress={useCurrentLocation}>
                            <Ionicons name="locate" size={s(18)} color={Colors.primary} />
                        </TouchableOpacity>
                    )
                )}
            </View>

            {loading && <ActivityIndicator style={{ marginTop: 10 }} />}

            {predictions.length > 0 && (
                <View style={styles.listContainer}>
                    <FlatList
                        data={predictions}
                        keyExtractor={(item) => item.place_id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.item}
                                onPress={() => handleSelect(item.place_id, item.description)}
                            >
                                <Ionicons name="location" size={s(16)} color="#ccc" style={{ marginRight: s(8) }} />
                                <Text style={styles.itemText}>{item.description}</Text>
                            </TouchableOpacity>
                        )}
                        keyboardShouldPersistTaps="always"
                        nestedScrollEnabled={true}
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { zIndex: 10 },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.secondary,
        borderRadius: ms(10),
        paddingHorizontal: s(10),
        height: vs(42),
        borderWidth: 1,
        borderColor: Colors.border,
    },
    searchIcon: { marginRight: s(8) },
    input: { flex: 1, fontSize: fs(14), color: Colors.white },
    listContainer: {
        backgroundColor: Colors.secondary,
        borderRadius: ms(10),
        marginTop: vs(6),
        maxHeight: vs(180),
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: ms(4),
        shadowOffset: { width: 0, height: 2 },
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden'
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: vs(10),
        paddingHorizontal: s(12),
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        backgroundColor: Colors.secondary
    },
    itemText: { fontSize: fs(13), color: Colors.white },

});
