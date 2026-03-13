// ============================================
// Offline Status Banner
// ============================================
// Shows a sticky banner when offline, and a sync status when rejoining.

import { motion, AnimatePresence } from 'framer-motion';
import { useOffline } from '../../context/OfflineContext';
import {
    HiOutlineWifi,
    HiOutlineArrowPath,
    HiOutlineCheckCircle,
    HiOutlineExclamationTriangle,
    HiOutlineExclamationCircle,
} from 'react-icons/hi2';

export default function OfflineBanner() {
    const { isOnline, pendingCount, syncing } = useOffline();

    const showBanner = !isOnline || syncing || pendingCount > 0;

    let bgClass = '';
    let Icon = HiOutlineExclamationCircle;
    let message = '';

    if (!isOnline) {
        bgClass = 'bg-red-500';
        Icon = HiOutlineExclamationCircle;
        message = pendingCount > 0
            ? `You're offline. ${pendingCount} action(s) queued — will sync when reconnected.`
            : "You're offline. Actions will be queued and synced when reconnected.";
    } else if (syncing) {
        bgClass = 'bg-amber-500';
        Icon = HiOutlineArrowPath;
        message = `Syncing ${pendingCount} offline action(s)...`;
    } else if (pendingCount > 0) {
        bgClass = 'bg-blue-500';
        Icon = HiOutlineExclamationTriangle;
        message = `${pendingCount} action(s) pending sync.`;
    }

    return (
        <AnimatePresence>
            {showBanner && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`${bgClass} text-white text-xs font-semibold overflow-hidden`}
                >
                    <div className="flex items-center justify-center gap-2 px-4 py-2">
                        <Icon className={`w-4 h-4 shrink-0 ${syncing ? 'animate-spin' : ''}`} />
                        <span>{message}</span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
