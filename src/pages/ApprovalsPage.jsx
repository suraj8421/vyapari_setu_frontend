// ============================================
// ApprovalsPage — Unified Approval & Notification Hub
// ============================================
// Central place for ALL approval actions:
//  - B2B Invoice Confirmations (creates Sale + Purchase + dual ledger)
//  - Store Connection Requests
//  - System Alerts
//  - Staff Edit Requests (via transactionAPI / AuditLog)
//
// Filters:  All | B2B Invoices | Invoices | Connections | Orders | System
// Tabs:     Pending | Approved | Rejected

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineClipboardDocumentCheck,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineClock,
    HiOutlineArrowPath,
    HiOutlineInformationCircle,
    HiOutlineUserGroup,
    HiOutlineDocumentText,
    HiOutlineBell,
    HiOutlineShieldCheck,
    HiOutlineChevronDown,
    HiOutlineChevronUp,
    HiOutlineFunnel,
    HiOutlineCreditCard,
    HiOutlineCurrencyRupee,
} from 'react-icons/hi2';
import { approvalAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

// ─── Helpers ─────────────────────────────────────────────────────
const fmtDate = (iso) =>
    new Date(iso).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

// ─── Type config ─────────────────────────────────────────────────
const TYPE_CONFIG = {
    B2B_INVOICE_REQUEST: {
        label: 'B2B Invoice',
        color: 'bg-indigo-100 text-indigo-700',
        icon: HiOutlineDocumentText,
        referenceType: 'invoice',
    },
    PAYMENT: {
        label: 'Payment Request',
        color: 'bg-purple-100 text-purple-700',
        icon: HiOutlineCurrencyRupee,
        referenceType: 'payment',
    },
    B2B_INVOICE_CORRECTION: {
        label: 'Correction Request',
        color: 'bg-amber-100 text-amber-700',
        icon: HiOutlineDocumentText,
        referenceType: 'invoice',
    },
    STORE_CONNECTION_REQUEST: {
        label: 'Connection Request',
        color: 'bg-blue-100 text-blue-700',
        icon: HiOutlineUserGroup,
        referenceType: 'connection',
    },
    SYSTEM_ALERT: {
        label: 'System Alert',
        color: 'bg-red-100 text-red-700',
        icon: HiOutlineBell,
        referenceType: 'system',
    },
    PURCHASE_APPROVAL: {
        label: 'Purchase Approval',
        color: 'bg-orange-100 text-orange-700',
        icon: HiOutlineShieldCheck,
        referenceType: 'order',
    },
};

// ─── Filter Configuration ─────────────────────────────────────────
const FILTERS = [
    { key: 'all',        label: 'All' },
    { key: 'b2b',        label: 'B2B Invoices', types: ['B2B_INVOICE_REQUEST', 'B2B_INVOICE_CORRECTION', 'PAYMENT'] },
    { key: 'invoice',    label: 'Invoices',     referenceType: 'invoice' },
    { key: 'connection', label: 'Connections',  referenceType: 'connection' },
    { key: 'order',      label: 'Orders',       referenceType: 'order' },
    { key: 'system',     label: 'System',       type: 'SYSTEM_ALERT' },
];

// ─── Status tabs ──────────────────────────────────────────────────
const TABS = [
    { key: 'PENDING',  label: 'Pending',  color: 'text-amber-600' },
    { key: 'APPROVED', label: 'Approved', color: 'text-emerald-600' },
    { key: 'REJECTED', label: 'Rejected', color: 'text-red-600' },
];

// ─── Reject Modal ─────────────────────────────────────────────────
function RejectModal({ onConfirm, onCancel, loading, title = 'Rejection Reason' }) {
    const [reason, setReason] = useState('');
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <HiOutlineXCircle className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-surface-900">{title}</h3>
                        <p className="text-xs text-surface-500">This message will be sent to the requester.</p>
                    </div>
                </div>
                <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-3 min-h-[80px] text-sm mt-1 mb-4 focus:outline-none focus:ring-2 focus:ring-primary-300"
                    placeholder="Optional: add a reason..."
                />
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 font-semibold text-surface-600 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(reason)}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading && <HiOutlineArrowPath className="w-4 h-4 animate-spin" />}
                        Confirm Reject
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Single Approval Card ──────────────────────────────────────────
function ApprovalCard({ notif, onConfirm, onReject, actionLoading, isSelected, onToggleSelect }) {
    const cfg = TYPE_CONFIG[notif.type] || {
        label: notif.type,
        color: 'bg-gray-100 text-gray-700',
        icon: HiOutlineClipboardDocumentCheck,
    };
    const Icon = cfg.icon;
    const isLoading = actionLoading === notif.id;
    const isPending = notif.status === 'PENDING';
    const [expanded, setExpanded] = useState(false);
    const [lockData, setLockData] = useState(null);
    const [history, setHistory] = useState([]);

    const { user } = useAuth();
    const isInvoice = notif.referenceType === 'invoice';
    const isConnection = notif.referenceType === 'connection';

    // Parse generic action data
    let actionData = null;
    try { if (notif.actionData) actionData = JSON.parse(notif.actionData); } catch (_) {}

    // Grouping
    if (notif.isGroup) {
        return (
            <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-5 flex flex-col sm:flex-row justify-between items-center gap-4"
            >
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${cfg.color.replace('text-', 'bg-').split(' ')[0]} bg-opacity-30`}>
                        <Icon className={`w-6 h-6 ${cfg.color.split(' ')[1]}`} />
                    </div>
                    <div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.color.replace('text-', 'bg-').split(' ')[0]} bg-opacity-20 text-${cfg.color.split(' ')[1].split('-')[1]}-700 border border-${cfg.color.split(' ')[1].split('-')[1]}-200 mb-1 inline-block uppercase tracking-wider`}>
                            GROUPED
                        </span>
                        <p className="text-base font-bold text-surface-900">{notif.title}</p>
                        <p className="text-sm text-surface-500 mt-0.5">{notif.message}</p>
                    </div>
                </div>
            </motion.div>
        );
    }

    // Ping lock status when expanding
    useEffect(() => {
        if (!expanded || !isPending) return;
        let active = true;

        const pingLock = async () => {
            try {
                // To safely implement 'get lock', a real endpoint would be needed or we just try lock.
                // Assuming we have lock API (we added it):
                const { data } = await approvalAPI.lock(notif.id);
                // If it fails, that means it's locked. To handle 409 we must use catch
            } catch (err) {
                if (active && err.response?.status === 409) {
                    setLockData({ lockedBy: 'Another User' });
                }
            }
        };

        pingLock();

        // Unlock on unmount or collapse
        return () => {
            active = false;
            if (!lockData) {
                approvalAPI.unlock(notif.id).catch(() => {});
            }
        };
    }, [expanded, isPending, notif.id, lockData]);

    const isLocked = lockData !== null;

    // Badges based on PRIORITY
    const getPriorityBadge = (p) => {
        if (p === 'HIGH') return <span className="px-2 py-0.5 rounded flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 uppercase tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> High</span>;
        if (p === 'MEDIUM') return <span className="px-2 py-0.5 flex items-center gap-1 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 uppercase tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Medium</span>;
        return <span className="px-2 flex items-center gap-1 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200 uppercase tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span> Low</span>;
    };


    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${!notif.isRead && isPending ? 'border-indigo-200 shadow-indigo-100' : 'border-gray-100'} ${isSelected ? 'ring-2 ring-primary-500 border-transparent shadow-md' : ''}`}
        >
            <div className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                {/* Left */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Checkbox for Bulk */}
                    {isPending && (isInvoice || isConnection) && !isLocked && (
                        <div className="pt-2 shrink-0">
                            <input
                                type="checkbox"
                                checked={isSelected || false}
                                onChange={() => onToggleSelect && onToggleSelect(notif.id)}
                                className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500 border-gray-300 transition-all cursor-pointer"
                            />
                        </div>
                    )}
                    
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${cfg.color.replace('text-', 'bg-').split(' ')[0]} bg-opacity-20`}>
                        <Icon className={`w-5 h-5 ${cfg.color.split(' ')[1]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${cfg.color}`}>
                                {cfg.label}
                            </span>
                            {getPriorityBadge(notif.priority)}
                            {!notif.isRead && isPending && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white shadow-sm shadow-red-200">NEW</span>
                            )}
                        </div>
                        <p className="text-sm font-bold text-surface-900 pr-2">{notif.title}</p>
                        <p className="text-sm text-surface-600 mt-0.5 leading-snug pr-2">{notif.message}</p>
                        <p className="text-xs text-surface-400 mt-1.5 flex items-center gap-1">
                            <HiOutlineClock className="w-3.5 h-3.5" />
                            {fmtDate(notif.createdAt)}
                        </p>
                    </div>
                </div>

                {/* Right — Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto mt-2 sm:mt-0">
                    {/* Expand details */}
                    {isPending && isLocked && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 text-xs font-bold mr-2">
                           <HiOutlineShieldCheck className="w-4 h-4" /> Locked by {lockData.lockedBy}
                        </span>
                    )}

                    {(actionData || isPending) && (
                        <button
                            onClick={() => setExpanded(v => !v)}
                            className={`flex items-center gap-1 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors
                                ${expanded ? 'bg-gray-100 border-gray-200 text-surface-800' : 'border-gray-200 text-surface-600 hover:bg-gray-50'}`}
                        >
                            {expanded ? 'Hide Details' : 'View Details'}
                            {expanded ? <HiOutlineChevronUp className="w-4 h-4" /> : <HiOutlineChevronDown className="w-4 h-4" />}
                        </button>
                    )}

                    {isPending && (isInvoice || isConnection) && !isLocked && (
                        <>
                            <button
                                disabled={isLoading}
                                onClick={() => onReject(notif)}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-semibold text-sm transition-colors disabled:opacity-40"
                            >
                                <HiOutlineXCircle className="w-4 h-4" />
                                Reject
                            </button>
                            <button
                                disabled={isLoading}
                                onClick={() => onConfirm(notif)}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition-colors disabled:opacity-40 shadow-sm shadow-emerald-200"
                            >
                                {isLoading
                                    ? <HiOutlineArrowPath className="w-4 h-4 animate-spin" />
                                    : <HiOutlineCheckCircle className="w-4 h-4" />}
                                {isInvoice ? 'Confirm' : 'Accept'}
                            </button>
                        </>
                    )}

                    {!isPending && (
                        <span className={`px-3 py-1.5 rounded-xl text-sm font-bold border ${notif.status === 'APPROVED' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                            {notif.status === 'APPROVED' ? '✓ Approved' : '✗ Rejected'}
                        </span>
                    )}
                </div>
            </div>

            {/* Expanded details panel */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-gray-100 bg-gray-50/50"
                    >
                        <div className="p-5 flex flex-col md:flex-row gap-6">
                            
                            {/* Left: General Meta */}
                            <div className="flex-1 grid grid-cols-2 gap-4 text-sm bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                {actionData?.sellerName && (
                                    <div>
                                        <p className="text-[11px] text-surface-400 font-bold uppercase tracking-wide">Seller</p>
                                        <p className="font-bold text-surface-800 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{actionData.sellerName}</p>
                                    </div>
                                )}
                                {actionData?.totalAmount !== undefined && (
                                    <div>
                                        <p className="text-[11px] text-surface-400 font-bold uppercase tracking-wide">Amount</p>
                                        <p className="font-bold text-emerald-600 mt-0.5 text-base shadow-emerald-100 drop-shadow-sm">₹{Number(actionData.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                )}
                                {actionData?.itemCount !== undefined && (
                                    <div>
                                        <p className="text-[11px] text-surface-400 font-bold uppercase tracking-wide">Items</p>
                                        <p className="font-bold text-surface-800 mt-0.5 bg-gray-100 px-2 py-0.5 rounded inline-block">{actionData.itemCount} item{actionData.itemCount !== 1 ? 's' : ''}</p>
                                    </div>
                                )}
                                <div className="col-span-full mt-2 pt-3 border-t border-gray-100">
                                    <p className="text-[11px] text-surface-400 font-bold uppercase tracking-wide">Reference ID</p>
                                    <p className="font-mono text-[11px] font-medium text-surface-500 mt-1 bg-gray-50 p-2 rounded border border-gray-200 break-all select-all flex items-center justify-between">
                                        {notif.referenceId}
                                        <HiOutlineDocumentText className="w-4 h-4 text-gray-400" />
                                    </p>
                                </div>
                            </div>

                            {/* Right: History Timeline */}
                            <div className="w-full md:w-64 shrink-0 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <h4 className="text-xs font-bold text-surface-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                   <HiOutlineClock className="w-4 h-4 text-primary-500" /> Audit Timeline
                                </h4>
                                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                                
                                     {/* Fake timeline items for demo (since history is fetched separately usually, we assume typical flow) */}
                                     {notif.status === 'APPROVED' && (
                                        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                            <div className="flex items-center justify-center w-6 h-6 rounded-full border border-white bg-emerald-100 text-emerald-600 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                                                <HiOutlineCheckCircle className="w-3.5 h-3.5" />
                                            </div>
                                            <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] ml-3 md:ml-0 md:group-odd:text-right md:group-odd:pr-4 md:group-even:pl-4">
                                                <div className="text-xs font-bold text-surface-900">Confirmed</div>
                                            </div>
                                        </div>
                                     )}

                                     {notif.status === 'REJECTED' && (
                                        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                            <div className="flex items-center justify-center w-6 h-6 rounded-full border border-white bg-red-100 text-red-600 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                                                <HiOutlineXCircle className="w-3.5 h-3.5" />
                                            </div>
                                            <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] ml-3 md:ml-0 md:group-odd:text-right md:group-odd:pr-4 md:group-even:pl-4">
                                                <div className="text-xs font-bold text-surface-900">Rejected</div>
                                            </div>
                                        </div>
                                     )}

                                     {expanded && (
                                        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                            <div className="flex items-center justify-center w-6 h-6 rounded-full border border-white bg-blue-100 text-blue-600 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                                                <HiOutlineUserGroup className="w-3.5 h-3.5" />
                                            </div>
                                            <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] ml-3 md:ml-0 md:group-odd:text-right md:group-odd:pr-4 md:group-even:pl-4">
                                                <div className="text-xs font-bold text-surface-900">Viewed</div>
                                            </div>
                                        </div>
                                     )}

                                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mt-4">
                                        <div className="flex items-center justify-center w-6 h-6 rounded-full border border-white bg-gray-100 text-gray-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                                            <HiOutlineDocumentText className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] ml-3 md:ml-0 md:group-odd:text-right md:group-odd:pr-4 md:group-even:pl-4">
                                            <div className="text-xs font-bold text-surface-900">Created</div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ─── Empty State ──────────────────────────────────────────────────
function EmptyState({ tab }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <HiOutlineCheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-surface-900">
                {tab === 'PENDING' ? 'All caught up!' : `No ${tab.toLowerCase()} items`}
            </h3>
            <p className="text-surface-500 text-sm mt-1 max-w-xs">
                {tab === 'PENDING'
                    ? 'No pending approvals at the moment.'
                    : `Nothing has been ${tab.toLowerCase()} yet.`}
            </p>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────
export default function ApprovalsPage() {
    const { isAdmin } = useAuth();
    const { fetchUnreadCount, resetUnread } = useNotification();

    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('PENDING');
    const [activeFilter, setActiveFilter] = useState('all');
    const [actionLoading, setActionLoading] = useState(null);

    // Bulk selection state
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);

    // Reject modal state
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectLoading, setRejectLoading] = useState(false);

    // Read query params for smart routing
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const refId = params.get('referenceId');
        const refType = params.get('referenceType');
        if (refId && refType && notifications.length > 0) {
            const target = notifications.find(n => n.referenceId === refId && n.referenceType === refType);
            if (target && target.status === 'PENDING') {
                // Future expansion: auto-open if found
            }
        }
    }, [notifications]);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await approvalAPI.getAll({ status: activeTab });
            if (data.success) {
                // Note: The backend `getAll` route now intelligently groups notifications via service
                setNotifications(data.data || []);
                setSelectedIds(new Set()); // Reset selections on fetch
                // Sync badge — when visiting this page clear unread for PENDING tab
                if (activeTab === 'PENDING') {
                    approvalAPI.markAllRead().catch(() => {});
                    resetUnread();
                }
            }
        } catch (err) {
            toast.error('Failed to load approvals');
        } finally {
            setLoading(false);
        }
    }, [activeTab, resetUnread]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // ── Filtering (client-side) ────────────────────────────────
    const filteredNotifications = notifications.filter(n => {
        if (activeFilter === 'all') return true;
        const fCfg = FILTERS.find(f => f.key === activeFilter);
        if (!fCfg) return true;
        // Multi-type filter (e.g. B2B Invoices = B2B_INVOICE_REQUEST + B2B_INVOICE_CORRECTION)
        if (fCfg.types) return fCfg.types.includes(n.type);
        if (fCfg.referenceType) return n.referenceType === fCfg.referenceType;
        if (fCfg.type) return n.type === fCfg.type;
        return true;
    });

    // ── Bulk Handlers ──────────────────────────────────────────
    const toggleSelectAll = (filtered) => {
        if (selectedIds.size === filtered.length) {
            setSelectedIds(new Set());
        } else {
            // Only select pending items that actually can be actioned
            const permissible = filtered.filter(n => n.status === 'PENDING' && !n.isGroup && (n.referenceType === 'invoice' || n.referenceType === 'connection'));
            setSelectedIds(new Set(permissible.map(n => n.id)));
        }
    };

    const toggleSelect = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleBulkAction = async (action) => {
        if (selectedIds.size === 0) return;
        setBulkLoading(true);
        try {
            const arr = Array.from(selectedIds);
            const { data } = await approvalAPI.bulkAction(arr, action);
            toast.success(`Successfully processed ${data.count} items.`);
            if (data.errors && data.errors.length) toast.error(`${data.errors.length} items failed.`);
            fetchNotifications();
            fetchUnreadCount();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Bulk action failed');
        } finally {
            setBulkLoading(false);
            setSelectedIds(new Set());
        }
    };

    // ── Confirm handler ────────────────────────────────────────
    const handleConfirm = async (notif) => {
        setActionLoading(notif.id);
        try {
            if (notif.referenceType === 'invoice') {
                await approvalAPI.confirmInvoice(notif.id);
                toast.success('✅ Invoice confirmed! Ledgers updated for both stores.');
            } else if (notif.referenceType === 'connection') {
                await approvalAPI.acceptConnection(notif.id);
                toast.success('✅ Connection accepted!');
            }
            setNotifications(prev => prev.filter(n => n.id !== notif.id));
            fetchUnreadCount();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed');
        } finally {
            setActionLoading(null);
        }
    };

    // ── Reject handler ─────────────────────────────────────────
    const handleRejectClick = (notif) => setRejectTarget(notif);

    const handleRejectConfirm = async (reason) => {
        setRejectLoading(true);
        try {
            if (rejectTarget.referenceType === 'invoice') {
                await approvalAPI.rejectInvoice(rejectTarget.id, reason);
                toast.success('Invoice rejected.');
            } else if (rejectTarget.referenceType === 'connection') {
                // FIX: use rejectConnection which properly sets connection status to BLOCKED
                await approvalAPI.rejectConnection(rejectTarget.id, reason);
                toast.success('Connection request rejected.');
            } else {
                // Generic fallback — just mark it as read/done
                await approvalAPI.markRead(rejectTarget.id);
                toast.success('Request rejected.');
            }
            setNotifications(prev => prev.filter(n => n.id !== rejectTarget.id));
            fetchUnreadCount();
            setRejectTarget(null);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Rejection failed');
        } finally {
            setRejectLoading(false);
        }
    };

    const pendingCount = notifications.filter(n => n.status === 'PENDING' && !n.isRead).length;

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-3">
                        <HiOutlineClipboardDocumentCheck className="w-8 h-8 text-primary-600" />
                        Approvals &amp; Notifications
                        {pendingCount > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full bg-red-500 text-white text-sm font-black animate-pulse">
                                {pendingCount}
                            </span>
                        )}
                    </h1>
                    <p className="text-surface-500 text-sm mt-1">
                        Review and action all requests — B2B invoices, store connections, and system alerts.
                    </p>
                </div>
                <button
                    onClick={fetchNotifications}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-surface-600 hover:bg-gray-50 font-semibold text-sm transition-colors disabled:opacity-50"
                >
                    <HiOutlineArrowPath className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Status Tabs */}
            <div className="flex border-b border-gray-200 gap-1">
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => { setActiveTab(tab.key); setActiveFilter('all'); }}
                        className={`px-5 py-2.5 text-sm font-bold rounded-t-xl transition-all ${activeTab === tab.key
                            ? `border-b-2 border-primary-600 ${tab.color} bg-primary-50/40`
                            : 'text-surface-500 hover:text-surface-800 hover:bg-gray-50'}`}
                    >
                        {tab.label}
                        {tab.key === 'PENDING' && notifications.filter(n => n.status === 'PENDING').length > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
                                {notifications.filter(n => n.status === 'PENDING').length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2 items-center">
                <span className="flex items-center gap-1 text-xs text-surface-400 font-semibold uppercase tracking-wide">
                    <HiOutlineFunnel className="w-3.5 h-3.5" />
                    Filter:
                </span>
                {FILTERS.map(f => (
                    <button
                        key={f.key}
                        onClick={() => setActiveFilter(f.key)}
                        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${activeFilter === f.key
                            ? 'bg-primary-600 text-white shadow-md shadow-primary-200'
                            : 'bg-gray-100 text-surface-600 hover:bg-gray-200'}`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Bulk Actions Header */}
            {activeTab === 'PENDING' && filteredNotifications.some(n => !n.isGroup && (n.referenceType === 'invoice' || n.referenceType === 'connection')) && (
                <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <input 
                            type="checkbox" 
                            checked={selectedIds.size > 0 && selectedIds.size === filteredNotifications.filter(n => !n.isGroup && (n.referenceType === 'invoice' || n.referenceType === 'connection')).length}
                            onChange={() => toggleSelectAll(filteredNotifications)}
                            className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500 border-gray-300 cursor-pointer"
                        />
                        <span className="text-sm font-bold text-surface-700">Select All</span>
                        {selectedIds.size > 0 && (
                            <span className="text-xs px-2 py-0.5 bg-primary-50 text-primary-700 rounded-full font-bold">
                                {selectedIds.size} selected
                            </span>
                        )}
                    </div>
                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleBulkAction('reject')}
                                disabled={bulkLoading}
                                className="px-4 py-1.5 text-xs font-bold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                                <HiOutlineXCircle className="w-4 h-4" /> Reject Selected
                            </button>
                            <button
                                onClick={() => handleBulkAction('approve')}
                                disabled={bulkLoading}
                                className="px-4 py-1.5 text-xs font-bold bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 shadow-sm shadow-emerald-200 transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                                {bulkLoading ? <HiOutlineArrowPath className="w-4 h-4 animate-spin" /> : <HiOutlineCheckCircle className="w-4 h-4" />}
                                Approve Selected
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 bg-gray-100 rounded-full shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-100 rounded w-1/3" />
                                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredNotifications.length === 0 ? (
                <EmptyState tab={activeTab} />
            ) : (
                <AnimatePresence mode="popLayout">
                    <div className="space-y-4">
                        {filteredNotifications.map(notif => (
                            <ApprovalCard
                                key={notif.id || `group-${notif.type}`}
                                notif={notif}
                                onConfirm={handleConfirm}
                                onReject={handleRejectClick}
                                actionLoading={actionLoading}
                                isSelected={selectedIds.has(notif.id)}
                                onToggleSelect={toggleSelect}
                            />
                        ))}
                    </div>
                </AnimatePresence>
            )}

            {/* Reject Modal */}
            <AnimatePresence>
                {rejectTarget && (
                    <RejectModal
                        title={rejectTarget.referenceType === 'connection' ? 'Reject Connection Request' : 'Rejection Reason'}
                        onConfirm={handleRejectConfirm}
                        onCancel={() => setRejectTarget(null)}
                        loading={rejectLoading}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
