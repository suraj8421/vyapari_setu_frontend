// ============================================
// Auth Context (Global Authentication State)
// ============================================

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const isAuthenticated = !!user;
    const isAdmin = user?.role === 'ADMIN';

    const login = useCallback(async (email, password) => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await authAPI.login({ email, password });
            if (data.success) {
                const { user: userData, accessToken, refreshToken } = data.data;
                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', refreshToken);
                localStorage.setItem('user', JSON.stringify(userData));
                setUser(userData);
                return userData;
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Login failed';
            setError(msg);
            throw new Error(msg);
        } finally {
            setLoading(false);
        }
    }, []);

    const register = useCallback(async (formData) => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await authAPI.register(formData);
            if (data.success) {
                const { user: userData, accessToken, refreshToken } = data.data;
                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', refreshToken);
                localStorage.setItem('user', JSON.stringify(userData));
                setUser(userData);
                return userData;
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Registration failed';
            setError(msg);
            throw new Error(msg);
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            await authAPI.logout();
        } catch (_) {
            // Ignore logout API errors
        } finally {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            setUser(null);
        }
    }, []);

    const refreshProfile = useCallback(async () => {
        try {
            const { data } = await authAPI.getProfile();
            if (data.success) {
                localStorage.setItem('user', JSON.stringify(data.data));
                setUser(data.data);
            }
        } catch (_) {
            // Token might be invalid
        }
    }, []);

    // Check token validity on mount
    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (token && user) {
            refreshProfile();
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const value = {
        user,
        loading,
        error,
        isAuthenticated,
        isAdmin,
        login,
        register,
        logout,
        refreshProfile,
        setError,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
