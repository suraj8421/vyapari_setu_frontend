// ============================================
// Notification Center Panel
// ============================================
// Slide-out panel showing all notifications.
// Triggered from the bell icon in the Header.

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useNotification } from '../../context/NotificationContext';
import {
    HiOutlineBell,
    HiOutlineCheckCircle,
    HiOutlineExclamationTriangle,
    HiOutlineInformationCircle,
    HiOutlineXCircle,
    HiOutlineArrowPath,
    HiOutlineTrash,
    HiOutlineCheck,
    HiOutlineCube,
    HiOutlineClipboardDocumentCheck,
    HiOutlineWifi,
} from 'react-icons/hi2';

// ── Icon map by notification type ────────────────────────────
const ICONS = {
    success: { Icon: HiOutlineCheckCircle, cls: 'text-emerald-500 bg-emerald-50' },
    warning: { Icon: HiOutlineExclamationTriangle, cls: 'text-amber-500 bg-amber-50' },
    danger: { Icon: HiOutlineXCircle, cls: 'text-red-500 bg-red-50' },
    info: { Icon: HiOutlineInformationCircle, cls: 'text-blue-500 bg-blue-50' },
};

const ICON_BY_NAME = {
    stock: HiOutlineCube,
    approval: HiOutlineClipboardDocumentCheck,
    sync: HiOutlineWifi,
};

function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'Just now';
}

// ── Single Notification Row ───────────────────────────────────
function NotifRow({ notif, onMarkRead, onDelete, onNavigate }) {
    const cfg = ICONS[notif.type] || ICONS.info;
    const OverrideIcon = ICON_BY_NAME[notif.icon];
    const IconToUse = OverrideIcon || cfg.Icon;

    return (
        <div
            onClick={() => {
                onMarkRead(notif.id);
                if (notif.link) onNavigate(notif.link);
            }}
            className={`group flex gap-3 p-3 rounded-xl cursor-pointer transition-all
                ${notif.read ? 'opacity-60 hover:opacity-100' : 'bg-primary-50/30 hover:bg-primary-50/60'}
                hover:shadow-sm`}
        >
            {/* Icon */}
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${cfg.cls}`}>
                <IconToUse className="w-4.5 h-4.5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold text-surface-900 truncate ${!notif.read ? 'font-bold' : ''}`}>
                    {notif.title}
                </p>
                <p className="text-xs text-surface-500 mt-0.5 leading-snug line-clamp-2">
                    {notif.message}
                </p>
                <p className="text-[10px] text-surface-400 mt-1">{timeAgo(notif.timestamp)}</p>
            </div>

            {/* Actions */}
            <div className="shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!notif.read && (
                    <button
                        onClick={e => { e.stopPropagation(); onMarkRead(notif.id); }}
                        className="p-1 rounded text-emerald-500 hover:bg-emerald-100"
                        title="Mark read"
                    >
                        <HiOutlineCheck className="w-3.5 h-3.5" />
                    </button>
                )}
                <button
                    onClick={e => { e.stopPropagation(); onDelete(notif.id); }}
                    className="p-1 rounded text-red-400 hover:bg-red-50"
                    title="Delete"
                >
                    <HiOutlineTrash className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Unread dot */}
            {!notif.read && (
                <div className="w-2 h-2 bg-primary-500 rounded-full shrink-0 mt-1.5" />
            )}
        </div>
    );
}

// ── Main Notification Bell + Panel ───────────────────────────
export default function NotificationCenter() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const {
        notifications, unreadCount,
        markRead, markAllRead, clearAll, deleteNotification,
        pushEnabled, requestPushPermission,
    } = useNotification();

    const [open, setOpen] = useState(false);
    const panelRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleNavigate = (link) => {
        navigate(link);
        setOpen(false);
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Button */}
            <button
                onClick={() => setOpen(v => !v)}
                className="relative p-2 rounded-xl text-surface-500 hover:text-surface-900 hover:bg-gray-100 transition-colors"
                id="notifications-btn"
                aria-label="Notifications"
            >
                <HiOutlineBell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Panel */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.18 }}
                        className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                            <h3 className="font-bold text-surface-900 flex items-center gap-2">
                                <HiOutlineBell className="w-4 h-4 text-primary-500" />
                                Notifications
                                {unreadCount > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                        {unreadCount}
                                    </span>
                                )}
                            </h3>
                            <div className="flex gap-1">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllRead}
                                        className="text-xs text-primary-600 hover:text-primary-800 font-semibold px-2 py-1 rounded-lg hover:bg-primary-50"
                                    >
                                        Mark all read
                                    </button>
                                )}
                                {notifications.length > 0 && (
                                    <button
                                        onClick={clearAll}
                                        className="text-xs text-surface-400 hover:text-red-500 font-semibold px-2 py-1 rounded-lg hover:bg-red-50"
                                    >
                                        Clear all
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Notification List */}
                        <div className="max-h-[420px] overflow-y-auto p-2 space-y-1">
                            {notifications.length === 0 ? (
                                <div className="py-12 text-center text-surface-400">
                                    <HiOutlineBell className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                                    <p className="text-sm font-medium">All caught up!</p>
                                    <p className="text-xs mt-0.5">No new notifications</p>
                                </div>
                            ) : (
                                notifications.map(n => (
                                    <NotifRow
                                        key={n.id}
                                        notif={n}
                                        onMarkRead={markRead}
                                        onDelete={deleteNotification}
                                        onNavigate={handleNavigate}
                                    />
                                ))
                            )}
                        </div>

                        {/* Footer — Push Notification toggle */}
                        <div className="border-t border-gray-100 px-4 py-2.5 bg-gray-50">
                            {!pushEnabled ? (
                                <button
                                    onClick={requestPushPermission}
                                    className="w-full text-xs text-primary-600 font-semibold hover:text-primary-800 flex items-center justify-center gap-1.5 py-1"
                                >
                                    <HiOutlineBell className="w-3.5 h-3.5" />
                                    Enable Push Notifications
                                </button>
                            ) : (
                                <p className="text-xs text-center text-surface-400 flex items-center justify-center gap-1.5">
                                    <HiOutlineCheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                    Push notifications enabled
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
