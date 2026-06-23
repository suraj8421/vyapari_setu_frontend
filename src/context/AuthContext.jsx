// ============================================
// Auth Context (Global Authentication State)
// ============================================

import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { authAPI } from '../services/api';
import { clearCache, getOrFetch } from '../utils/dataCache';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const isAuthenticated = !!user;
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
    const isSuperAdmin = user?.role === 'SUPERADMIN';

    const login = useCallback(async (email, password) => {
        setLoading(true);
        setError(null);
        try {
            // Super Admin Mock Bypass
            if (email === 'super@vyaparisetu.com' && password === 'admin123') {
                const superAdminUser = {
                    id: 'super-admin-001',
                    firstName: 'System',
                    lastName: 'Admin',
                    email: 'super@vyaparisetu.com',
                    role: 'SUPERADMIN',
                };
                localStorage.setItem('accessToken', 'mock-super-token');
                localStorage.setItem('refreshToken', 'mock-super-refresh');
                localStorage.setItem('user', JSON.stringify(superAdminUser));
                setUser(superAdminUser);
                setLoading(false);
                return superAdminUser;
            }

            const { data } = await authAPI.login({ email, password });
            if (data.success) {
                const { user: userData, accessToken, refreshToken } = data.data;
                clearCache();
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
            // Clear dropdown cache so next login gets fresh data
            clearCache();
            setUser(null);
        }
    }, []);

    const refreshProfile = useCallback(async () => {
        try {
            // PERF: Deduplicate profile check (handles StrictMode double mount)
            const data = await getOrFetch('profile', () => authAPI.getProfile().then(r => r.data.data), 30000);
            localStorage.setItem('user', JSON.stringify(data));
            setUser(data);
        } catch (_) {
            // Token is invalid — force logout to sync state
            logout();
        }
    }, [logout]);

    // Check token validity on mount
    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (token && user) {
            refreshProfile();
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Memoize the context value so consumers only re-render when user/loading/error
    // actually changes — not on every AuthProvider render cycle.
    const value = useMemo(() => ({
        user,
        loading,
        error,
        isAuthenticated,
        isAdmin,
        isSuperAdmin,
        login,
        register,
        logout,
        refreshProfile,
        setError,
    }), [user, loading, error, isAuthenticated, isAdmin, isSuperAdmin, login, register, logout, refreshProfile, setError]);

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
