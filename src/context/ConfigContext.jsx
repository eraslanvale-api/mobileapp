import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { getConfig } from '../api/endpoints';

const ConfigContext = createContext(null);

export function ConfigProvider({ children }) {
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState({});
    const isMountedRef = useRef(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getConfig({});
            if (!isMountedRef.current) return;
            // console.log(res.data)
            let raw = res?.data || {};
            // Backend'den gelen veri doğrudan obje olabilir
            
            // Backend verilerini frontend formatına dönüştür
            const newConfig = {
                ...raw,
                customerServicePhone: raw.customerServicePhone || '',
                customerServiceWhatsapp: raw.customerServiceWhatsapp || '',
                preliminaryInfoUrl: raw.preliminaryInfoUrl || '',
                distanceSalesAgreementUrl: raw.distanceSalesAgreementUrl || '',
                topMenuEnabled: raw.topMenuEnabled ?? true,
                googleMapsApiKeyAndroid: raw.googleMapsApiKeyAndroid,
                googleMapsApiKeyIos: raw.googleMapsApiKeyIos,
                googleMapsApiKey: Platform.OS === 'ios' 
                    ? (raw.googleMapsApiKeyIos || raw.googleMapsApiKeyAndroid) 
                    : (raw.googleMapsApiKeyAndroid)
            };
            
            setConfig(newConfig);
        } catch (e) {
            if (!isMountedRef.current) return;
            // setConfig({}); // Hata durumunda mevcut config veya boş obje kalabilir
        } finally {
            if (!isMountedRef.current) return;
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        (async () => {
            await fetchData();
        })();
        return () => {
            isMountedRef.current = false;
        };
    }, [fetchData]);



    return (
        <ConfigContext.Provider value={{ config, loading, fetchData }}>
            {children}
        </ConfigContext.Provider>
    );
}

export function useConfig() {
    const ctx = useContext(ConfigContext);
    if (!ctx) throw new Error('useConfig must be used within ConfigProvider');
    return ctx;
}

