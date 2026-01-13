import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {getServices} from '../api/endpoints'

export const ServiceContext = createContext();

export const ServiceProvider = ({ children }) => {
  const [services, setServices] = useState([]);
  const [collapsed, setCollapsed] = useState(true);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);


  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getServices();
      const rawData = Array.isArray(res?.data) ? res.data : (res?.data?.results || []); // Django pagination support
      
      const mappedServices = rawData.map((item) => {
        const pricing = item.pricing || {};
        const price = pricing.base_fee ? parseFloat(pricing.base_fee) : 0;

        return {
            id: item.id || item.slug,
            title: item.name,
            description: item.description,
            price: price,
            image: item.image,
            active: item.active,
            original: item
        };
      });

      setServices(mappedServices);
      if (mappedServices.length > 0) {
        setSelected(mappedServices[0]);
      }
      
      setError(null);
    } catch (e) {
      if (!isMountedRef.current) return;
      setServices([]);
      setSelected(null);
      const msg = e?.normalized?.message ?? e?.message ?? 'Hizmetler yüklenemedi';
      setError(msg);
    } finally {
      if (!isMountedRef.current) return;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchServices();
    return () => { isMountedRef.current = false; };
  }, [fetchServices]);

  const toggleCollapsed = () => setCollapsed((s) => !s);
  const selectService = (svc) => setSelected(svc);
  const refresh = () => fetchServices();

  const value = useMemo(() => ({ services, collapsed, selected, loading, error, toggleCollapsed, selectService, refresh }), [services, collapsed, selected, loading, error]);

  return <ServiceContext.Provider value={value}>{children}</ServiceContext.Provider>;
};

export const useServices = () => {
  const ctx = useContext(ServiceContext);
  if (!ctx) throw new Error('useServices must be used within ServiceProvider');
  return ctx;
};
