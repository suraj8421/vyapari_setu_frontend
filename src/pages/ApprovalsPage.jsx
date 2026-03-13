// ============================================
// ApprovalsPage — Admin Pending Approvals Dashboard
// ============================================
// NEW PAGE: Staff edits go into a PENDING queue instead of applying directly.
// Admins must come here to APPROVE or REJECT each pending change.
// This page was completely missing — the backend had the endpoints
// (GET /api/transactions/pending, POST /logs/:logId/approve|reject)
// but there was no UI to use them.

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineClipboardDocumentCheck,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineClock,
    HiOutlineUser,
    HiOutlineArrowPath,
    HiOutlineChevronDown,
    HiOutlineChevronUp,
    HiOutlineInformationCircle,
    HiOutlineExclamationTriangle,
} from 'react-icons/hi2';
import { transactionAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

// ── Helpers ──────────────────────────────────────────────────────
const fmt = v => `₹ ${Number(v || 0).toFixed(2)}`;

const fmtDate = iso =>
    new Date(iso).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

// Status badge styling
const STATUS_COLORS = {
    PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
    APPROVED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    REJECTED: 'bg-red-100 text-red-700 border-red-200',
};

// Type badge styling
const TYPE_COLORS = {
    SALE: 'bg-primary-100 text-primary-700',
    PURCHASE: 'bg-orange-100 text-orange-700',
    EXPENSE: 'bg-red-100 text-red-700',
    PAYMENT: 'bg-emerald-100 text-emerald-700',
    MISC: 'bg-gray-100 text-gray-600',
};

// ── Rejection Modal ───────────────────────────────────────────────
// Shown when admin clicks Reject — allows them to provide a reason
function RejectModal({ logId, onConfirm, onCancel, loading }) {
    const { t } = useTranslation();
    const [notes, setNotes] = useState('');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <HiOutlineXCircle className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-surface-900">{t('approvals.rejectTitle')}</h3>
                        <p className="text-xs text-surface-500">{t('approvals.rejectSubtitle')}</p>
                    </div>
                </div>

                <div className="mb-4">
                    <label className="label">{t('approvals.reasonLabel')}</label>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="input w-full min-h-[80px] rounded-xl p-3 mt-1"
                        placeholder={t('approvals.reasonPlaceholder')}
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 font-semibold
                                   text-surface-600 hover:bg-gray-50 transition-colors"
                        disabled={loading}
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={() => onConfirm(notes)}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white
                                   font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <HiOutlineArrowPath className="w-5 h-5 animate-spin" /> : null}
                        {t('approvals.confirmReject')}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ── Single Approval Card ──────────────────────────────────────────
function ApprovalCard({ log, onApprove, onReject, actionLoading }) {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);
    const isLoading = actionLoading === log.id;

    // Safely parse the change snapshot (old vs new values)
    let changes = null;
    try {
        changes = log.changes ? JSON.parse(log.changes) : null;
    } catch (_) { /* ignore malformed JSON */ }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
        >
            {/* Card Header */}
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Left — info */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Type badge */}
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${TYPE_COLORS[log.entryType] || TYPE_COLORS.MISC}`}>
                        {log.entryType}
                    </span>

                    <div className="flex-1 min-w-0">
                        {/* Transaction reference */}
                        <p className="text-sm font-bold text-surface-900 truncate">
                            {t('approvals.invoiceRef')}: <span className="text-primary-600">{log.invoiceNumber || log.referenceId || '—'}</span>
                        </p>

                        {/* Staff member who made the change */}
                        <p className="text-xs text-surface-500 flex items-center gap-1 mt-0.5">
                            <HiOutlineUser className="w-3.5 h-3.5" />
                            {log.changedBy?.firstName} {log.changedBy?.lastName}
                            <span className="mx-1">·</span>
                            <HiOutlineClock className="w-3.5 h-3.5" />
                            {fmtDate(log.createdAt)}
                        </p>

                        {/* Amount if available */}
                        {log.newData?.totalAmount && (
                            <p className="text-sm font-bold text-emerald-600 mt-1">
                                {fmt(log.newData.totalAmount)}
                            </p>
                        )}
                    </div>
                </div>

                {/* Right — action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Expand / collapse changes */}
                    <button
                        type="button"
                        onClick={() => setExpanded(v => !v)}
                        className="p-2 rounded-xl text-surface-500 hover:bg-gray-50 transition-colors"
                        title={expanded ? 'Hide details' : 'Show change details'}
                    >
                        {expanded
                            ? <HiOutlineChevronUp className="w-5 h-5" />
                            : <HiOutlineChevronDown className="w-5 h-5" />
                        }
                    </button>

                    {/* Reject */}
                    <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => onReject(log.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200
                                   text-red-600 hover:bg-red-50 font-semibold text-sm
                                   transition-colors disabled:opacity-40"
                    >
                        <HiOutlineXCircle className="w-4 h-4" />
                        {t('approvals.reject')}
                    </button>

                    {/* Approve */}
                    <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => onApprove(log.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl
                                   bg-emerald-500 hover:bg-emerald-600 text-white
                                   font-bold text-sm transition-colors disabled:opacity-40
                                   shadow-sm shadow-emerald-200"
                    >
                        {isLoading
                            ? <HiOutlineArrowPath className="w-4 h-4 animate-spin" />
                            : <HiOutlineCheckCircle className="w-4 h-4" />
                        }
                        {t('approvals.approve')}
                    </button>
                </div>
            </div>

            {/* Expanded change details */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-gray-100"
                    >
                        <div className="p-5 bg-gray-50">
                            {changes ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* OLD values */}
                                    <div>
                                        <p className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-2">
                                            {t('approvals.before')}
                                        </p>
                                        <div className="bg-red-50 rounded-xl p-3 text-xs font-mono text-red-700 whitespace-pre-wrap break-words">
                                            {JSON.stringify(changes.old, null, 2)}
                                        </div>
                                    </div>
                                    {/* NEW values being requested */}
                                    <div>
                                        <p className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-2">
                                            {t('approvals.after')}
                                        </p>
                                        <div className="bg-emerald-50 rounded-xl p-3 text-xs font-mono text-emerald-700 whitespace-pre-wrap break-words">
                                            {JSON.stringify(changes.new, null, 2)}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // If no structured diff, show raw newData
                                <div>
                                    <p className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-2">
                                        {t('approvals.proposed')}
                                    </p>
                                    <div className="bg-blue-50 rounded-xl p-3 text-xs font-mono text-blue-700 whitespace-pre-wrap break-words">
                                        {JSON.stringify(log.newData || {}, null, 2)}
                                    </div>
                                </div>
                            )}

                            {/* Staff notes if any */}
                            {log.notes && (
                                <div className="mt-3 flex items-start gap-2 text-xs text-surface-500">
                                    <HiOutlineInformationCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                    <span><strong>{t('approvals.staffNote')}:</strong> {log.notes}</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ── Empty State ───────────────────────────────────────────────────
function EmptyState() {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <HiOutlineCheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-surface-900">{t('approvals.allCaughtUp')}</h3>
            <p className="text-surface-500 text-sm mt-1 max-w-xs">
                {t('approvals.noPending')}
            </p>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function ApprovalsPage() {
    const { t } = useTranslation();
    const { isAdmin } = useAuth();
    const navigate = useNavigate();

    const [pendingLogs, setPendingLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null); // ID of log being approved/rejected

    // Reject modal state
    const [rejectTarget, setRejectTarget] = useState(null); // log ID to reject
    const [rejectLoading, setRejectLoading] = useState(false);

    // Redirect non-admins away
    useEffect(() => {
        if (!isAdmin) navigate('/dashboard', { replace: true });
    }, [isAdmin, navigate]);

    // Fetch all pending approvals from backend
    // Uses GET /api/transactions/pending — added in the backend fix session
    const fetchPending = useCallback(async () => {
        setLoading(true);
        try {
            const res = await transactionAPI.getPending();
            setPendingLogs(res.data.data || []);
        } catch (err) {
            toast.error(t('approvals.errorLoad'));
            console.error('[ApprovalsPage] fetchPending error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPending();
    }, [fetchPending]);

    // ── Approve handler ─────────────────────────────────────────
    const handleApprove = async (logId) => {
        setActionLoading(logId);
        try {
            await transactionAPI.approve(logId);
            // Remove from list immediately for instant feedback
            setPendingLogs(prev => prev.filter(l => l.id !== logId));
            toast.success(`✅ ${t('approvals.approveSuccess')}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Approval failed');
        } finally {
            setActionLoading(null);
        }
    };

    // ── Reject handler ──────────────────────────────────────────
    const handleRejectClick = (logId) => {
        // Open modal to collect rejection reason
        setRejectTarget(logId);
    };

    const handleRejectConfirm = async (notes) => {
        setRejectLoading(true);
        try {
            await transactionAPI.reject(rejectTarget, notes);
            setPendingLogs(prev => prev.filter(l => l.id !== rejectTarget));
            toast.success(`❌ ${t('approvals.rejectSuccess')}`);
            setRejectTarget(null);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Rejection failed');
        } finally {
            setRejectLoading(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────
    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-3">
                        <HiOutlineClipboardDocumentCheck className="w-8 h-8 text-primary-600" />
                        {t('nav.approvals')}
                        {/* Live count badge */}
                        {pendingLogs.length > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-sm font-black">
                                {pendingLogs.length}
                            </span>
                        )}
                    </h1>
                    <p className="text-surface-500 text-sm mt-1">
                        {t('approvals.subtitle') || 'Review and approve or reject edit requests made by staff members.'}
                    </p>
                </div>

                {/* Refresh button */}
                <button
                    onClick={fetchPending}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200
                               text-surface-600 hover:bg-gray-50 font-semibold text-sm transition-colors
                               disabled:opacity-50"
                >
                    <HiOutlineArrowPath className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {t('common.refresh')}
                </button>
            </div>

            {/* Info banner — explains what this page is for */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-100">
                <HiOutlineExclamationTriangle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                    <strong>{t('approvals.howItWorksTitle')}:</strong> {t('approvals.howItWorksDesc')}
                </p>
            </div>

            {/* Content */}
            {loading ? (
                // Loading skeleton
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                            <div className="flex gap-4">
                                <div className="h-6 w-20 bg-gray-100 rounded-lg" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-100 rounded w-1/2" />
                                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                                </div>
                                <div className="flex gap-2">
                                    <div className="h-8 w-20 bg-gray-100 rounded-xl" />
                                    <div className="h-8 w-24 bg-emerald-100 rounded-xl" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : pendingLogs.length === 0 ? (
                <EmptyState />
            ) : (
                <AnimatePresence mode="popLayout">
                    <div className="space-y-4">
                        {pendingLogs.map(log => (
                            <ApprovalCard
                                key={log.id}
                                log={log}
                                onApprove={handleApprove}
                                onReject={handleRejectClick}
                                actionLoading={actionLoading}
                            />
                        ))}
                    </div>
                </AnimatePresence>
            )}

            {/* Rejection reason modal */}
            <AnimatePresence>
                {rejectTarget && (
                    <RejectModal
                        logId={rejectTarget}
                        onConfirm={handleRejectConfirm}
                        onCancel={() => setRejectTarget(null)}
                        loading={rejectLoading}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
