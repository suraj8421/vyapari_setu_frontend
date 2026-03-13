// ============================================
// Offline Sync Context (IndexedDB + Queue)
// ============================================
// Intercepts failed API calls when offline, stores them in IndexedDB,
// and replays them automatically when connectivity is restored.

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { openDB } from 'idb';

const OfflineContext = createContext(null);

const DB_NAME = 'vyapari_offline';
const DB_VERSION = 1;
const STORE_NAME = 'sync_queue';

async function getDB() {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true,
                });
                store.createIndex('status', 'status');
                store.createIndex('createdAt', 'createdAt');
            }
        },
    });
}

export function OfflineProvider({ children }) {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingCount, setPendingCount] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const syncLockRef = useRef(false);

    // Online/Offline event listeners
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Count pending items
    const refreshPendingCount = useCallback(async () => {
        try {
            const db = await getDB();
            const all = await db.getAll(STORE_NAME);
            setPendingCount(all.filter(r => r.status === 'pending').length);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        refreshPendingCount();
    }, [refreshPendingCount]);

    // ── Enqueue a failed request ──────────────────────────────────
    const enqueue = useCallback(async (request) => {
        try {
            const db = await getDB();
            await db.add(STORE_NAME, {
                method: request.method,
                url: request.url,
                data: request.data,
                headers: request.headers || {},
                status: 'pending',
                retries: 0,
                createdAt: new Date().toISOString(),
                label: request.label || `${request.method} ${request.url}`,
            });
            refreshPendingCount();
        } catch (err) {
            console.error('[OfflineQueue] Failed to enqueue:', err);
        }
    }, [refreshPendingCount]);

    // ── Replay queued requests when back online ───────────────────
    const syncQueue = useCallback(async () => {
        if (!isOnline || syncLockRef.current) return;
        syncLockRef.current = true;
        setSyncing(true);

        try {
            const db = await getDB();
            const pending = await db.getAllFromIndex(STORE_NAME, 'status', 'pending');
            if (pending.length === 0) {
                setSyncing(false);
                syncLockRef.current = false;
                return;
            }

            let successCount = 0;
            for (const item of pending) {
                try {
                    const token = localStorage.getItem('accessToken');
                    const headers = {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        ...(item.headers || {}),
                    };

                    const res = await fetch(item.url.startsWith('/') ? item.url : `/api/${item.url}`, {
                        method: item.method,
                        headers,
                        body: item.data ? JSON.stringify(item.data) : undefined,
                    });

                    if (res.ok) {
                        await db.delete(STORE_NAME, item.id);
                        successCount++;
                    } else {
                        await db.put(STORE_NAME, { ...item, retries: item.retries + 1, status: item.retries >= 3 ? 'failed' : 'pending' });
                    }
                } catch (err) {
                    await db.put(STORE_NAME, { ...item, retries: item.retries + 1 });
                }
            }

            if (successCount > 0) {
                const { addNotification } = window.__notifCtx || {};
                if (addNotification) {
                    addNotification({
                        type: 'success',
                        title: 'Sync Complete',
                        message: `${successCount} offline action(s) have been synced successfully.`,
                        icon: 'sync',
                    });
                }
            }
        } finally {
            await refreshPendingCount();
            setSyncing(false);
            syncLockRef.current = false;
        }
    }, [isOnline, refreshPendingCount]);

    // Auto-sync when coming back online
    useEffect(() => {
        if (isOnline) {
            syncQueue();
        }
    }, [isOnline, syncQueue]);

    // ── Get all queued items (for UI display) ─────────────────────
    const getQueue = useCallback(async () => {
        const db = await getDB();
        return db.getAll(STORE_NAME);
    }, []);

    const clearFailed = useCallback(async () => {
        const db = await getDB();
        const all = await db.getAll(STORE_NAME);
        for (const item of all.filter(i => i.status === 'failed')) {
            await db.delete(STORE_NAME, item.id);
        }
        refreshPendingCount();
    }, [refreshPendingCount]);

    return (
        <OfflineContext.Provider value={{
            isOnline,
            pendingCount,
            syncing,
            enqueue,
            syncQueue,
            getQueue,
            clearFailed,
        }}>
            {children}
        </OfflineContext.Provider>
    );
}

export function useOffline() {
    const ctx = useContext(OfflineContext);
    if (!ctx) throw new Error('useOffline must be used within OfflineProvider');
    return ctx;
}
