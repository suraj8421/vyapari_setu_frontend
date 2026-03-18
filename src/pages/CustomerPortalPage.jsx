// ============================================
// CustomerPortalPage — Standalone Customer Portal
// ============================================
// A completely separate experience from the business dashboard.
// Customers can register, log in, view purchase notifications,
// and accept or reject transactions recorded for them.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import { customerPortalAPI } from '../services/api';

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────
const fmt = (v) => `₹ ${Number(v || 0).toFixed(2)}`;
const fmtDate = (iso) =>
    new Date(iso).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

const STATUS_STYLES = {
    PENDING: 'bg-amber-100 text-amber-700 border border-amber-200',
    ACCEPTED: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    REJECTED: 'bg-red-100 text-red-700 border border-red-200',
};

// ────────────────────────────────────────────
// Reject Modal
// ────────────────────────────────────────────
function RejectModal({ onConfirm, onCancel, loading }) {
    const [reason, setReason] = useState('');
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-xl">❌</div>
                    <div>
                        <h3 className="font-bold text-gray-900">Reject Transaction</h3>
                        <p className="text-xs text-gray-500">Optionally explain why you're rejecting</p>
                    </div>
                </div>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                    placeholder="Reason for rejection (e.g. incorrect amount, wrong items...)"
                />
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-2xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(reason)}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Rejecting…' : 'Confirm Reject'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ────────────────────────────────────────────
// Notification Card
// ────────────────────────────────────────────
function NotificationCard({ notification, onAccept, onReject, actionLoading }) {
    const [expanded, setExpanded] = useState(false);
    const { sale, status, rejectionReason, createdAt, id } = notification;
    const isLoading = actionLoading === id;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
        >
            <div className="p-5">
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-blue-600">🧾 {sale.invoiceNumber}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_STYLES[status]}`}>
                                {status}
                            </span>
                        </div>
                        <p className="text-xs text-gray-400">{sale.store?.name} · {fmtDate(createdAt)}</p>
                        <p className="text-lg font-black text-gray-900 mt-1">{fmt(sale.totalAmount)}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => setExpanded((v) => !v)}
                            className="px-3 py-1.5 rounded-xl text-xs text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                            {expanded ? 'Hide' : 'View Items'}
                        </button>

                        {status === 'PENDING' && (
                            <>
                                <button
                                    onClick={() => onReject(id)}
                                    disabled={isLoading}
                                    className="px-4 py-2 rounded-2xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-40"
                                >
                                    ✕ Reject
                                </button>
                                <button
                                    onClick={() => onAccept(id)}
                                    disabled={isLoading}
                                    className="px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold shadow-sm shadow-emerald-200 transition-colors disabled:opacity-40"
                                >
                                    {isLoading ? '…' : '✓ Accept'}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Rejection reason if rejected */}
                {status === 'REJECTED' && rejectionReason && (
                    <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">
                        Your reason: "{rejectionReason}"
                    </p>
                )}
            </div>

            {/* Expanded items table */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-gray-100"
                    >
                        <div className="px-5 py-4 bg-gray-50 space-y-2">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Items</p>
                            {sale.items?.map((item, i) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                    <span className="text-gray-700 font-medium">
                                        {item.product?.name || 'Product'}
                                    </span>
                                    <span className="text-gray-500">
                                        {item.quantity} {item.product?.unit || 'pcs'} × {fmt(item.unitPrice)} = <strong>{fmt(item.total)}</strong>
                                    </span>
                                </div>
                            ))}
                            <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-sm text-gray-900">
                                <span>Total</span>
                                <span>{fmt(sale.totalAmount)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Paid</span>
                                <span className="text-emerald-600 font-semibold">{fmt(sale.paidAmount)}</span>
                            </div>
                            {Number(sale.totalAmount) - Number(sale.paidAmount) > 0 && (
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Balance Due</span>
                                    <span className="text-red-600 font-bold">{fmt(Number(sale.totalAmount) - Number(sale.paidAmount))}</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ────────────────────────────────────────────
// Auth Form (Login + Register Tabs)
// ────────────────────────────────────────────
function AuthForm({ onSuccess }) {
    const [tab, setTab] = useState('login');
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ email: '', password: '', phone: '' });

    const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let res;
            if (tab === 'login') {
                res = await customerPortalAPI.login({ email: form.email, password: form.password });
            } else {
                res = await customerPortalAPI.register({ email: form.email, password: form.password, phone: form.phone });
            }
            const { account, accessToken, refreshToken } = res.data.data;
            localStorage.setItem('customerAccessToken', accessToken);
            localStorage.setItem('customerRefreshToken', refreshToken);
            localStorage.setItem('customerUser', JSON.stringify(account));
            toast.success(tab === 'login' ? 'Welcome back!' : 'Account created!');
            onSuccess(account);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 p-4">
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                {/* Logo / Branding */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-white/10 backdrop-blur text-3xl mb-4">🛍️</div>
                    <h1 className="text-3xl font-black text-white">Customer Portal</h1>
                    <p className="text-blue-200 text-sm mt-1">View and confirm your purchases</p>
                </div>

                {/* Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-6 shadow-2xl">
                    {/* Tabs */}
                    <div className="flex bg-white/10 rounded-2xl p-1 mb-6">
                        {['login', 'register'].map((t) => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`flex-1 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
                                    tab === t ? 'bg-white text-blue-900 shadow-sm' : 'text-white/70 hover:text-white'
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {tab === 'register' && (
                            <div>
                                <label className="block text-white/70 text-xs font-semibold mb-1.5">Phone Number (as registered by business)</label>
                                <input
                                    name="phone"
                                    type="tel"
                                    value={form.phone}
                                    onChange={handleChange}
                                    required
                                    placeholder="9876543210"
                                    className="w-full rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-white/70 text-xs font-semibold mb-1.5">Email Address</label>
                            <input
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={handleChange}
                                required
                                placeholder="you@example.com"
                                className="w-full rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                        </div>
                        <div>
                            <label className="block text-white/70 text-xs font-semibold mb-1.5">Password</label>
                            <input
                                name="password"
                                type="password"
                                value={form.password}
                                onChange={handleChange}
                                required
                                placeholder="••••••"
                                className="w-full rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/40 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white font-black text-sm transition-colors disabled:opacity-50 shadow-lg shadow-blue-500/30 mt-2"
                        >
                            {loading ? 'Please wait…' : tab === 'login' ? 'Sign In' : 'Create Account'}
                        </button>
                    </form>

                    {tab === 'register' && (
                        <p className="text-xs text-white/50 text-center mt-4">
                            Your business must have registered you as a customer first using your phone number.
                        </p>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

// ────────────────────────────────────────────
// Main Portal Dashboard
// ────────────────────────────────────────────
function PortalDashboard({ account, onLogout }) {
    const [activeTab, setActiveTab] = useState('notifications');
    const [notifications, setNotifications] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectModalLoading, setRejectModalLoading] = useState(false);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await customerPortalAPI.getNotifications({ status: 'PENDING' });
            setNotifications(res.data.data || []);
        } catch (err) {
            toast.error('Failed to load notifications');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const res = await customerPortalAPI.getPurchases();
            setHistory(res.data.data?.notifications || []);
        } catch (err) {
            toast.error('Failed to load history');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'notifications') fetchNotifications();
        else fetchHistory();
    }, [activeTab, fetchNotifications, fetchHistory]);

    const handleAccept = useCallback(async (id) => {
        setActionLoading(id);
        try {
            await customerPortalAPI.acceptNotification(id);
            setNotifications((prev) => prev.filter((n) => n.id !== id));
            toast.success('✅ Transaction accepted!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to accept');
        } finally {
            setActionLoading(null);
        }
    }, []);

    const handleRejectClick = useCallback((id) => setRejectTarget(id), []);

    const handleRejectConfirm = async (reason) => {
        setRejectModalLoading(true);
        try {
            await customerPortalAPI.rejectNotification(rejectTarget, reason);
            setNotifications((prev) => prev.filter((n) => n.id !== rejectTarget));
            setRejectTarget(null);
            toast.success('❌ Transaction rejected. The business has been notified.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to reject');
        } finally {
            setRejectModalLoading(false);
        }
    };

    const pendingCount = notifications.length;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top Bar */}
            <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white px-4 py-4">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-xl">🛍️</div>
                        <div>
                            <p className="font-black text-sm">{account?.customer?.name || 'Customer'}</p>
                            <p className="text-blue-300 text-xs">{account?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors border border-white/20"
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="max-w-2xl mx-auto px-4">
                <div className="flex gap-1 bg-white border-b border-gray-200 sticky top-0 z-10">
                    {[
                        { key: 'notifications', label: 'Notifications', badge: pendingCount },
                        { key: 'history', label: 'History' },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 transition-colors ${
                                activeTab === tab.key
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {tab.label}
                            {tab.badge > 0 && (
                                <span className="bg-amber-500 text-white text-xs font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="py-6 space-y-4">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white rounded-3xl border border-gray-100 p-5 animate-pulse">
                                    <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
                                    <div className="h-3 bg-gray-100 rounded w-1/4 mb-4" />
                                    <div className="h-6 bg-gray-100 rounded w-1/5" />
                                </div>
                            ))}
                        </div>
                    ) : activeTab === 'notifications' ? (
                        notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="text-5xl mb-4">✅</div>
                                <h3 className="font-bold text-gray-800">All caught up!</h3>
                                <p className="text-gray-500 text-sm mt-1">No pending transactions to review.</p>
                            </div>
                        ) : (
                            <AnimatePresence mode="popLayout">
                                {notifications.map((n) => (
                                    <NotificationCard
                                        key={n.id}
                                        notification={n}
                                        onAccept={handleAccept}
                                        onReject={handleRejectClick}
                                        actionLoading={actionLoading}
                                    />
                                ))}
                            </AnimatePresence>
                        )
                    ) : (
                        // History Tab
                        history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="text-5xl mb-4">🧾</div>
                                <h3 className="font-bold text-gray-800">No history yet</h3>
                                <p className="text-gray-500 text-sm mt-1">Transactions will appear here once recorded.</p>
                            </div>
                        ) : (
                            <AnimatePresence>
                                {history.map((n) => (
                                    <NotificationCard
                                        key={n.id}
                                        notification={n}
                                        onAccept={() => {}}
                                        onReject={() => {}}
                                        actionLoading={null}
                                    />
                                ))}
                            </AnimatePresence>
                        )
                    )}
                </div>
            </div>

            {/* Reject Modal */}
            <AnimatePresence>
                {rejectTarget && (
                    <RejectModal
                        onConfirm={handleRejectConfirm}
                        onCancel={() => setRejectTarget(null)}
                        loading={rejectModalLoading}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ────────────────────────────────────────────
// Root Page Component (auth gate)
// ────────────────────────────────────────────
export default function CustomerPortalPage() {
    const [account, setAccount] = useState(() => {
        const stored = localStorage.getItem('customerUser');
        return stored ? JSON.parse(stored) : null;
    });

    const handleLogout = useCallback(async () => {
        try {
            await customerPortalAPI.logout();
        } catch (_) { /* ignore */ }
        localStorage.removeItem('customerAccessToken');
        localStorage.removeItem('customerRefreshToken');
        localStorage.removeItem('customerUser');
        setAccount(null);
    }, []);

    return (
        <>
            <Toaster position="top-center" />
            {account ? (
                <PortalDashboard account={account} onLogout={handleLogout} />
            ) : (
                <AuthForm onSuccess={setAccount} />
            )}
        </>
    );
}
