import React, { createContext, useContext, useState, useEffect } from 'react';
import { useServices } from './ServiceContext';

export const JourneyContext = createContext();

export const JourneyProvider = ({ children }) => {
    const [pickup, setPickup] = useState(null); // { address, location: { lat, lng } }
    const [dropoff, setDropoff] = useState(null);
    const [stops, setStops] = useState([]); // Array of { id, address, location }
    const [pickupTime, setPickupTime] = useState('Hemen');
    const [pickupAt, setPickupAt] = useState(null);
    const [route, setRoute] = useState(null); // { polyline, distance, duration, price }
    const [isSelectingLocation, setIsSelectingLocation] = useState(false); // 'pickup' | 'dropoff' | 'stop_ID' | null
    const [sheetIndex, setSheetIndex] = useState(0);
    const [navLock, setNavLock] = useState(false);
    const [permPromptVisible, setPermPromptVisible] = useState(false);
    const [pendingSelectTarget, setPendingSelectTarget] = useState(null); // 'pickup' | 'dropoff' | stopId
    const [sheetSnapFn, setSheetSnapFn] = useState(() => () => {});
    const [sheetMode, setSheetMode] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [savedCards, setSavedCards] = useState([]);
    const [selectedCardId, setSelectedCardId] = useState(null);
    const [invoice, setInvoice] = useState(null);
    const [openPaymentOnFocus, setOpenPaymentOnFocus] = useState(false);

    const resetJourneyPlanning = () => {
        setPickup(null);
        setDropoff(null);
        setStops([]);
        setPickupTime('Hemen');
        setPickupAt(null);
        setRoute(null);
    };

    const { selected } = useServices();
    const calculatePrice = (distanceKm) => {
        const pricing = selected?.pricing ?? {};
        const base = Number(pricing.base_fee ?? 1150) || 0;
        const perKm = Number(pricing.per_km ?? 20) || 0;
        const free = Number(pricing.free_distance ?? 0) || 0;
        const billableKm = Math.max(0, Number(distanceKm ?? 0) - free);
        return base + (billableKm * perKm);
    };

    const setRouteDetails = (details) => {
        if (!details) {
            setRoute(null);
            return;
        }
        const price = calculatePrice(details.distanceKm);
        setRoute({ ...details, price });
    };

    const addStop = () => {
        const newStop = { id: Date.now().toString(), address: '', location: null };
        setStops([...stops, newStop]);
    };

    const removeStop = (id) => {
        setStops(stops.filter(s => s.id !== id));
    };

    const updateStop = (id, data) => {
        setStops(stops.map(s => s.id === id ? { ...s, ...data } : s));
    };

    const value = {
        pickup, setPickup,
        dropoff, setDropoff,
        stops, setStops, addStop, removeStop, updateStop,
        pickupTime, setPickupTime,
        pickupAt, setPickupAt,
        route, setRouteDetails,
        isSelectingLocation, setIsSelectingLocation,
        sheetIndex, setSheetIndex,
        navLock, setNavLock,
        permPromptVisible, setPermPromptVisible,
        pendingSelectTarget, setPendingSelectTarget,
        sheetSnapFn, setSheetSnapFn,
        sheetMode, setSheetMode,
        paymentMethod, setPaymentMethod,
        savedCards, setSavedCards,
        selectedCardId, setSelectedCardId,
        invoice, setInvoice,
        openPaymentOnFocus, setOpenPaymentOnFocus,
        resetJourneyPlanning,
    };

    useEffect(() => {
        if (route?.distanceKm != null) {
            const price = calculatePrice(route.distanceKm);
            setRoute({ ...route, price });
        }
    }, [selected]);

    return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
};

export const useJourney = () => {
    const ctx = useContext(JourneyContext);
    if (!ctx) throw new Error('useJourney must be used within JourneyProvider');
    return ctx;
};
