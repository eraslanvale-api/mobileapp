import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { me } from '../api/endpoints';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const TOKEN_KEY = '@auth_token';
    const ROLE_KEY = '@user_role';
    const USER_DATA_KEY = '@user_data';

    const customSetUser = async (data) => {
        if (typeof data === 'function') {
            setUser(prev => {
                const newState = data(prev);
                AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(newState)).catch(() => {});
                return newState;
            });
        } else {
            setUser(data);
            if (data) {
                await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(data));
            } else {
                await AsyncStorage.removeItem(USER_DATA_KEY);
            }
        }
    };

    const saveToken = async (newToken, role = null) => {
        if (!newToken) return;
        await AsyncStorage.setItem(TOKEN_KEY, newToken);
        if (role) await AsyncStorage.setItem(ROLE_KEY, role);
        setToken(newToken);
        setIsAuthenticated(true);
    };

    const clearToken = async () => {
        await AsyncStorage.removeItem(TOKEN_KEY);
        await AsyncStorage.removeItem(ROLE_KEY);
        await AsyncStorage.removeItem(USER_DATA_KEY);
        setToken(null);
        setIsAuthenticated(false);
        setUser(null);
    };
  
    const checkAuth = async () => {
        try {
            const stored = await AsyncStorage.getItem(TOKEN_KEY);
            const storedRole = await AsyncStorage.getItem(ROLE_KEY);
            const storedUser = await AsyncStorage.getItem(USER_DATA_KEY);

            if (stored) {
                setToken(stored);
                setIsAuthenticated(true);
                
                // Token varsa, sunucudan güncel kullanıcı bilgilerini çek
                try {
                    const response = await me();
                    const userData = response.data;
                    // alert(JSON.stringify(userData));
                    await customSetUser(userData);
                } catch (e) {
                    // console.log('Me endpoint error:', e);
                    
                    if (e?.response?.status === 401) {
                        await clearToken();
                        return false;
                    }

                    // Sunucudan çekemezsek ve lokalde varsa, lokaldekini kullan
                    if (storedUser) {
                        try {
                            const parsedUser = JSON.parse(storedUser);
                            setUser(parsedUser);
                        } catch (e) {
                             if (storedRole) {
                                setUser(prev => ({ ...(prev || {}), id: stored, role: storedRole }));
                            } else {
                                 setUser(prev => ({ ...(prev || {}), id: stored }));
                            }
                        }
                    } else {
                        // Stored user yoksa, token ve role ile oluştur
                        if (storedRole) {
                            setUser(prev => ({ ...(prev || {}), id: stored, role: storedRole }));
                        } else {
                             setUser(prev => ({ ...(prev || {}), id: stored }));
                        }
                    }
                }
                return true;
            }
            setIsAuthenticated(false);
            setUser(null);
            return false;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const value = useMemo(() => ({
        user,
        token,
        loading,
        isAuthenticated,
        checkAuth,
        saveToken,
        clearToken,
        setUser: customSetUser
    }), [user, token, loading, isAuthenticated]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
