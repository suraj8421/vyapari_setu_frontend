// ============================================
// Notification Context
// ============================================
// Provides a global in-app notification system.
// Polls the backend for low-stock items and pending approvals.
// Also supports Browser Push Notifications.

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { productAPI, transactionAPI } from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

const POLL_INTERVAL = 60_000; // poll every 60 seconds

export function NotificationProvider({ children }) {
    const { isAuthenticated, isAdmin } = useAuth();
    const [notifications, setNotifications] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('vyapari_notifications') || '[]');
        } catch { return []; }
    });
    const [unreadCount, setUnreadCount] = useState(0);
    const [pushEnabled, setPushEnabled] = useState(false);
    const timerRef = useRef(null);

    // Persist notifications to localStorage
    useEffect(() => {
        localStorage.setItem('vyapari_notifications', JSON.stringify(notifications.slice(0, 50)));
        setUnreadCount(notifications.filter(n => !n.read).length);
    }, [notifications]);

    const addNotification = useCallback((notification) => {
        const newNotif = {
            id: `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            timestamp: new Date().toISOString(),
            read: false,
            ...notification,
        };
        setNotifications(prev => {
            // Deduplicate by key if provided
            if (notification.key) {
                const exists = prev.find(n => n.key === notification.key && !n.read);
                if (exists) return prev;
            }
            return [newNotif, ...prev].slice(0, 50);
        });

        // Trigger browser push if enabled
        if (pushEnabled && Notification.permission === 'granted') {
            new Notification(`VyapariSetu: ${notification.title}`, {
                body: notification.message,
                icon: '/favicon.ico',
                tag: notification.key || newNotif.id,
            });
        }
    }, [pushEnabled]);

    const markRead = useCallback((id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }, []);

    const markAllRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    const deleteNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    // Request push notification permission
    const requestPushPermission = useCallback(async () => {
        if (!('Notification' in window)) return false;
        const permission = await Notification.requestPermission();
        const granted = permission === 'granted';
        setPushEnabled(granted);
        return granted;
    }, []);

    // Check push permission on mount
    useEffect(() => {
        if ('Notification' in window) {
            setPushEnabled(Notification.permission === 'granted');
        }
    }, []);

    // ── Background Polling ────────────────────────────────────────
    const poll = useCallback(async () => {
        if (!isAuthenticated) return;

        try {
            // Check low stock
            const { data } = await productAPI.getAll({ page: 1, limit: 100 });
            const products = data?.data || [];
            const lowStockItems = products.filter(p => {
                const qty = p.inventory?.reduce((s, i) => s + i.quantity, 0) || 0;
                const min = p.inventory?.[0]?.minStockLevel || 10;
                return qty <= min && qty > 0;
            });
            const outOfStock = products.filter(p =>
                (p.inventory?.reduce((s, i) => s + i.quantity, 0) || 0) === 0
            );

            if (outOfStock.length > 0) {
                addNotification({
                    key: `out_of_stock_${new Date().toDateString()}`,
                    type: 'danger',
                    title: 'Out of Stock Alert',
                    message: `${outOfStock.length} product(s) are completely out of stock: ${outOfStock.slice(0, 3).map(p => p.name).join(', ')}${outOfStock.length > 3 ? '...' : ''}`,
                    icon: 'stock',
                    link: '/inventory',
                });
            } else if (lowStockItems.length > 0) {
                addNotification({
                    key: `low_stock_${new Date().toDateString()}`,
                    type: 'warning',
                    title: 'Low Stock Warning',
                    message: `${lowStockItems.length} item(s) are running low: ${lowStockItems.slice(0, 3).map(p => p.name).join(', ')}${lowStockItems.length > 3 ? '...' : ''}`,
                    icon: 'stock',
                    link: '/inventory',
                });
            }
        } catch (_) { /* silently ignore poll errors */ }

        // Check pending approvals (admin only)
        if (isAdmin) {
            try {
                const { data } = await transactionAPI.getPending();
                const pending = data?.data || [];
                if (pending.length > 0) {
                    addNotification({
                        key: `pending_approvals_${new Date().toDateString()}`,
                        type: 'info',
                        title: 'Pending Approvals',
                        message: `You have ${pending.length} pending edit request(s) awaiting your review.`,
                        icon: 'approval',
                        link: '/approvals',
                    });
                }
            } catch (_) { /* ignore */ }
        }
    }, [isAuthenticated, isAdmin, addNotification]);

    useEffect(() => {
        if (!isAuthenticated) {
            clearInterval(timerRef.current);
            return;
        }
        // Run immediately on login, then every POLL_INTERVAL
        poll();
        timerRef.current = setInterval(poll, POLL_INTERVAL);
        return () => clearInterval(timerRef.current);
    }, [isAuthenticated, poll]);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            addNotification,
            markRead,
            markAllRead,
            clearAll,
            deleteNotification,
            pushEnabled,
            requestPushPermission,
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
    return ctx;
}
