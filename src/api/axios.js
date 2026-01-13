// src/api/axiosConfig.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: 'https://eraslan.pythonanywhere.com', // 🔹 Tüm isteklerin temeli
  timeout: 10000,                     // 🔹 Maksimum 10 saniye bekle
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// 🔁 Request interceptor (Token ekleme)
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      if (token) {
        config.headers.Authorization = `Token ${token}`;
      }
    } catch (error) {
      // console.error('Token okuma hatası:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 🔁 Response interceptor (hata yönetimi)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Hata detaylarını tek bir yerde normalize et
    const status = error?.response?.status ?? null;
    const data = error?.response?.data ?? null;
    const isTimeout = error?.code === 'ECONNABORTED';
    const isCanceled = axios.isCancel?.(error) === true;
    const isNetworkError = !error?.response && !isCanceled && !isTimeout;
    const isUnauthorized = status === 401;

    const serverMessage =
      (typeof data === 'string' && data) ||
      data?.detail ||
      data?.message ||
      data?.error ||
      data?.errors?.[0]?.message ||
      null;

    let message = serverMessage || error?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.';

    if (isTimeout) {
      message = 'İstek zaman aşımına uğradı. Lütfen bağlantınızı kontrol edin.';
    } else if (isCanceled) {
      message = 'İstek iptal edildi.';
    } else if (isNetworkError) {
      message = 'Sunucuya erişilemiyor. Lütfen internet bağlantınızı kontrol edin.';
    } else if (isUnauthorized) {
      message = 'Oturumunuzun süresi doldu veya yetkisiz erişim.';
    }

    const normalized = {
      status,
      code: error?.code ?? null,
      message,
      data,
      isTimeout,
      isCanceled,
      isNetworkError,
      isUnauthorized,
      url: error?.config?.url ?? null,
      method: error?.config?.method ?? null,
    };

    // Var olan davranışı bozmamak için original error'u reject ediyoruz
    // ama tüketiciler için normalize edilmiş objeyi de ekliyoruz.
    try {
      // Non-enumerable yaparak konsol çıktısını sade tutabiliriz
      Object.defineProperty(error, 'normalized', {
        value: normalized,
        writable: false,
        enumerable: false,
      });
    } catch (_) {
      // Fallback: doğrudan atama
      error.normalized = normalized;
    }

    if (status) {
      // console.log('API Hatası:', status, data);
    } else {
      // console.log('Sunucuya erişilemiyor:', error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
