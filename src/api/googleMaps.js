import axios from 'axios';

const ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';


const PLACES_AUTOCOMPLETE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const PLACES_DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';
const GEOCODE_API_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

/**
 * Compute routes using Google Routes API v2
 * @param {Object} params
 * @param {string} params.origin - "lat,lng"
 * @param {string} params.destination - "lat,lng"
 * @param {Array<string>} [params.waypoints] - ["lat,lng", ...]
 * @param {string} params.apiKey
 * @returns {Promise<Object>}
 */
export const computeRoutes = async ({ origin, destination, waypoints = [], apiKey }) => {
    if (!apiKey) throw new Error('API Key is required');

    const body = {
        origin: {
            location: {
                latLng: {
                    latitude: parseFloat(origin.split(',')[0]),
                    longitude: parseFloat(origin.split(',')[1])
                }
            }
        },
        destination: {
            location: {
                latLng: {
                    latitude: parseFloat(destination.split(',')[0]),
                    longitude: parseFloat(destination.split(',')[1])
                }
            }
        },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        computeAlternativeRoutes: false,
        languageCode: 'tr-TR',
        units: 'METRIC'
    };

    if (waypoints.length > 0) {
        body.intermediates = waypoints.map(wp => {
            const [lat, lng] = wp.split(',');
            return {
                location: {
                    latLng: {
                        latitude: parseFloat(lat),
                        longitude: parseFloat(lng)
                    }
                }
            };
        });
    }

    try {
        const response = await axios.post(ROUTES_API_URL, body, {
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline'
            }
        });
        return response.data;
    } catch (error) {
        // console.error('Google Routes API Error:', error);
        throw error;
    }
};

/**
 * Reverse Geocode using Google Maps Geocoding API
 * @param {number} lat
 * @param {number} lng
 * @param {string} apiKey
 * @returns {Promise<string|null>}
 */
export const reverseGeocode = async (lat, lng, apiKey) => {
    if (!apiKey) throw new Error('API Key is required');
    try {
        const response = await axios.get(GEOCODE_API_URL, {
            params: {
                latlng: `${lat},${lng}`,
                key: apiKey,
                language: 'tr'
            }
        });
        return response.data.results?.[0]?.formatted_address || null;
    } catch (error) {
        // console.error('Reverse Geocode Error:', error);
        return null;
    }
};

/**
 * Get place predictions using Google Places Autocomplete API
 * @param {string} text
 * @param {string} apiKey
 * @returns {Promise<Array>}
 */
export const getPlacePredictions = async (text, apiKey) => {
    if (!apiKey) throw new Error('API Key is required');
    if (text.length < 2) return [];

    try {
        const response = await axios.get(PLACES_AUTOCOMPLETE_URL, {
            params: {
                input: text,
                key: apiKey,
                language: 'tr',
                components: 'country:tr', // Limit to Turkey
            }
        });
        return response.data.predictions || [];
    } catch (error) {
        // console.error('Google Places Autocomplete Error:', error);
        throw error;
    }
};

/**
 * Get place details using Google Places Details API
 * @param {string} placeId
 * @param {string} apiKey
 * @returns {Promise<Object>}
 */
export const getPlaceDetails = async (placeId, apiKey) => {
    if (!apiKey) throw new Error('API Key is required');

    try {
        const response = await axios.get(PLACES_DETAILS_URL, {
            params: {
                place_id: placeId,
                fields: 'geometry',
                key: apiKey,
            }
        });
        return response.data.result;
    } catch (error) {
        // console.error('Google Places Details Error:', error);
        throw error;
    }
};
