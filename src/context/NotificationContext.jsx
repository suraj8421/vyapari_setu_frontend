// ============================================
// Notification Context — Unified System
// ============================================
// Single source of truth for notification state.
// Fetches from /approvals (ApprovalNotification table) and polls for count.

import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { approvalAPI } from '../services/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const NotificationContext = createContext(null);

const POLL_INTERVAL = 60_000; // 60 seconds

export function NotificationProvider({ children }) {
    const { isAuthenticated } = useAuth();
    const { socket } = useSocket?.() || {};
    const [unreadCount, setUnreadCount] = useState(0);
    const timerRef = useRef(null);

    const fetchUnreadCount = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const { data } = await approvalAPI.getUnreadCount();
            if (data.success) setUnreadCount(data.data.count);
        } catch (_) {
            // silently fail — badge is non-critical
        }
    }, [isAuthenticated]);

    // Poll for unread count
    useEffect(() => {
        if (!isAuthenticated) {
            clearInterval(timerRef.current);
            setUnreadCount(0);
            return;
        }
        fetchUnreadCount();
        timerRef.current = setInterval(fetchUnreadCount, POLL_INTERVAL);
        return () => clearInterval(timerRef.current);
    }, [isAuthenticated, fetchUnreadCount]);

    // Listen to socket for real-time notification_created events
    useEffect(() => {
        if (!socket) return;
        const handleNew = () => {
            setUnreadCount(c => c + 1);
        };
        socket.on('notification_created', handleNew);
        return () => socket.off('notification_created', handleNew);
    }, [socket]);

    const resetUnread = useCallback(() => setUnreadCount(0), []);

    // Helper: manually force refetch (e.g. from bulk actions)
    const forceRefetch = useCallback(() => {
        if (isAuthenticated) fetchUnreadCount();
    }, [isAuthenticated, fetchUnreadCount]);

    // Handle Socket Disconnection (Offline Fallback)
    useEffect(() => {
        if (!socket) return;
        
        let offlinePollTimer = null;

        const handleDisconnect = () => {
            console.log('Socket disconnected, enabling local polling for notifications');
            offlinePollTimer = setInterval(fetchUnreadCount, 30_000);
        };

        const handleReconnect = () => {
            console.log('Socket reconnected, disabling local polling');
            if (offlinePollTimer) clearInterval(offlinePollTimer);
            fetchUnreadCount(); // Fetch immediately on reconnect
        };

        socket.on('disconnect', handleDisconnect);
        socket.on('connect', handleReconnect);
        
        // Listen to bulk actions to force refresh
        socket.on('bulk_action_completed', forceRefetch);

        return () => {
            socket.off('disconnect', handleDisconnect);
            socket.off('connect', handleReconnect);
            socket.off('bulk_action_completed', forceRefetch);
            if (offlinePollTimer) clearInterval(offlinePollTimer);
        };
    }, [socket, fetchUnreadCount, forceRefetch]);

    const value = useMemo(() => ({
        unreadCount,
        fetchUnreadCount,
        resetUnread,
        forceRefetch
    }), [unreadCount, fetchUnreadCount, resetUnread, forceRefetch]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
    return ctx;
}
