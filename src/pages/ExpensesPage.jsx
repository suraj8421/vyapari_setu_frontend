// ============================================
// ExpensesPage — Expense Listing & Management
// ============================================
// NEW PAGE: Expenses could only be CREATED via the Unified Entry console.
// There was no page to LIST, FILTER, or VIEW them. This page adds:
//   - Filterable expense list (by date range, category, store)
//   - Summary totals (total spend, average per day, category breakdown)
//   - Quick-create shortcut to Unified Entry with EXPENSE type pre-selected
//   - Category filter dropdown populated from real data (GET /api/expenses/categories)

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
    HiOutlineReceiptRefund,
    HiOutlinePlusCircle,
    HiOutlineArrowPath,
    HiOutlineFunnel,
    HiOutlineCalendarDays,
    HiOutlineTag,
    HiOutlineChevronDown,
    HiOutlineBanknotes,
    HiOutlineChartPie,
    HiOutlineNoSymbol,
    HiOutlineArrowTrendingDown,
} from 'react-icons/hi2';
import { toast } from 'react-hot-toast';
import { expenseAPI } from '../services/api';
import { resolveDateRange } from '../utils/dateUtils';

// ── Helpers ────────────────────────────────────────────────────────
const fmt = (v, t) => `${t('common.currencySymbol') || '₹'} ${Number(v || 0).toLocaleString(t('common.locale') || 'en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (iso, locale) => new Date(iso).toLocaleDateString(locale || 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// Maps categories to a colour class for the tag badge
const CATEGORY_COLORS = [
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-orange-100 text-orange-700',
    'bg-teal-100 text-teal-700',
    'bg-pink-100 text-pink-700',
    'bg-indigo-100 text-indigo-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
];
// Stable colour per category name (hash-based)
const categoryColor = name => {
    if (!name) return CATEGORY_COLORS[0];
    const hash = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
};

// ── Summary Stat Card ──────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = 'text-primary-600', bg = 'bg-primary-50' }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-surface-500 font-medium uppercase tracking-wider">{label}</p>
                <p className={`text-xl font-extrabold ${color} mt-0.5`}>{value}</p>
                {sub && <p className="text-xs text-surface-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

// ── Single Expense Row ──────────────────────────────────────────────
function ExpenseRow({ expense, index }) {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
        >
            {/* Main row */}
            <div
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4
                           cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(v => !v)}
            >
                {/* Left — date + category + description */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Date block */}
                    <div className="w-12 text-center shrink-0">
                        <p className="text-xs text-surface-400 leading-none">
                            {new Date(expense.date).toLocaleDateString(t('common.locale') || 'en-IN', { month: 'short' })}
                        </p>
                        <p className="text-2xl font-extrabold text-surface-900 leading-none">
                            {new Date(expense.date).getDate()}
                        </p>
                        <p className="text-[10px] text-surface-400 leading-none">
                            {new Date(expense.date).getFullYear()}
                        </p>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${categoryColor(expense.category)}`}>
                                {expense.category || t('expenses.uncategorized')}
                            </span>
                            {expense.store?.name && (
                                <span className="text-[10px] text-surface-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                    {expense.store.name}
                                </span>
                            )}
                        </div>
                        {expense.description && (
                            <p className="text-sm text-surface-600 mt-1 truncate">{expense.description}</p>
                        )}
                        <p className="text-xs text-surface-400 mt-0.5">
                            {t('expenses.recordedBy')} {expense.recordedBy?.firstName} {expense.recordedBy?.lastName}
                        </p>
                    </div>
                </div>

                {/* Right — amount + expand icon */}
                <div className="flex items-center gap-3 shrink-0">
                    <p className="text-lg font-extrabold text-red-500">{fmt(expense.amount, t)}</p>
                    <HiOutlineChevronDown
                        className={`w-4 h-4 text-surface-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                    />
                </div>
            </div>

            {/* Expanded details panel */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-gray-100"
                    >
                        <div className="p-4 bg-gray-50 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                            <div>
                                <p className="text-xs text-surface-400 uppercase font-semibold">{t('common.date')}</p>
                                <p className="font-medium text-surface-900 mt-0.5">{fmtDate(expense.date, t('common.locale'))}</p>
                            </div>
                            <div>
                                <p className="text-xs text-surface-400 uppercase font-semibold">{t('common.amount')}</p>
                                <p className="font-bold text-red-500 mt-0.5">{fmt(expense.amount, t)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-surface-400 uppercase font-semibold">{t('common.category')}</p>
                                <p className="font-medium text-surface-900 mt-0.5">{expense.category || '—'}</p>
                            </div>
                            {expense.description && (
                                <div className="sm:col-span-3">
                                    <p className="text-xs text-surface-400 uppercase font-semibold">{t('common.description')}</p>
                                    <p className="font-medium text-surface-900 mt-0.5">{expense.description}</p>
                                </div>
                            )}
                            {expense.paymentMethod && (
                                <div>
                                    <p className="text-xs text-surface-400 uppercase font-semibold">{t('reports.headers.method')}</p>
                                    <p className="font-medium text-surface-900 mt-0.5">{expense.paymentMethod}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ── Empty State ─────────────────────────────────────────────────────
function EmptyState({ hasFilters, onClearFilters, onAdd }) {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                {hasFilters
                    ? <HiOutlineNoSymbol className="w-10 h-10 text-gray-400" />
                    : <HiOutlineReceiptRefund className="w-10 h-10 text-gray-400" />
                }
            </div>
            <h3 className="text-lg font-bold text-surface-900">
                {hasFilters ? t('expenses.noExpensesFiltered') : t('expenses.noExpenses')}
            </h3>
            <p className="text-surface-500 text-sm mt-1 max-w-xs">
                {hasFilters
                    ? t('reports.noMatchHelp') || 'Try clearing the filters or changing the date range.'
                    : t('expenses.recordingTipDesc')}
            </p>
            <div className="flex gap-3 mt-5">
                {hasFilters && (
                    <button
                        onClick={onClearFilters}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-surface-600
                                   hover:bg-gray-50 font-semibold text-sm transition-colors"
                    >
                        {t('expenses.clearFilters')}
                    </button>
                )}
                <button
                    onClick={onAdd}
                    className="px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600
                               text-white font-bold text-sm transition-colors flex items-center gap-2"
                >
                    <HiOutlinePlusCircle className="w-4 h-4" />
                    {t('expenses.addExpense')}
                </button>
            </div>
        </div>
    );
}

// ── Category Breakdown Card ─────────────────────────────────────────
function CategoryBreakdown({ expenses }) {
    const { t } = useTranslation();
    if (!expenses.length) return null;

    // Aggregate totals per category
    const totals = expenses.reduce((acc, exp) => {
        const cat = exp.category || 'Uncategorized';
        acc[cat] = (acc[cat] || 0) + Number(exp.amount);
        return acc;
    }, {});

    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const grandTotal = sorted.reduce((s, [, v]) => s + v, 0);

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-surface-900 flex items-center gap-2 mb-4">
                <HiOutlineChartPie className="w-5 h-5 text-primary-500" />
                {t('expenses.spendByCategory')}
            </h3>
            <div className="space-y-3">
                {sorted.map(([cat, total]) => {
                    const pct = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
                    return (
                        <div key={cat}>
                            <div className="flex justify-between text-sm mb-1">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${categoryColor(cat)}`}>
                                    {cat || t('expenses.uncategorized')}
                                </span>
                                <span className="font-bold text-surface-900">{fmt(total, t)}</span>
                            </div>
                            {/* Progress bar */}
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.6, ease: 'easeOut' }}
                                    className="h-full bg-primary-400 rounded-full"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Main Page ───────────────────────────────────────────────────────
export default function ExpensesPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // ── Filter State ──────────────────────────────────────────────
    const [dateRange, setDateRange] = useState('30d');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [category, setCategory] = useState('');
    const [categories, setCategories] = useState([]); // loaded from GET /api/expenses/categories

    // ── Data State ────────────────────────────────────────────────
    const [expenses, setExpenses] = useState([]);
    const [totalAmount, setTotalAmount] = useState(0);
    const [pagination, setPagination] = useState({ page: 1, total: 0, limit: 20 });
    const [loading, setLoading] = useState(true);
    const [filtersOpen, setFiltersOpen] = useState(false);

    // Resolve preset date range to actual dates (uses the fixed dateUtils)
    useEffect(() => {
        // resolveDateRange returns null for 'custom' — don't overwrite manual input
        const resolved = resolveDateRange(dateRange);
        if (resolved !== null) {
            setStartDate(resolved.startDate);
            setEndDate(resolved.endDate);
        }
    }, [dateRange]);

    // Fetch categories for the filter dropdown
    // NEW: category list was completely unavailable before the expense API was added
    useEffect(() => {
        expenseAPI.getCategories()
            .then(res => setCategories(res.data.data || []))
            .catch(() => { /* non-critical */ });
    }, []);

    // Fetch expenses whenever filters change
    const fetchExpenses = useCallback(async () => {
        if (!startDate || !endDate) return;
        setLoading(true);
        try {
            const params = {
                startDate,
                endDate,
                limit: pagination.limit,
                page: pagination.page,
            };
            if (category) params.category = category;

            // NEW: Uses GET /api/expenses — this route didn't exist before we added it
            const res = await expenseAPI.getAll(params);
            setExpenses(res.data.data || []);
            setTotalAmount(res.data.totalAmount || 0);
            setPagination(prev => ({ ...prev, total: res.data.pagination?.total || 0 }));
        } catch (err) {
            toast.error('Could not load expenses.');
            console.error('[ExpensesPage] fetchExpenses error:', err);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, category, pagination.page, pagination.limit]);

    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    // ── Derived stats ──────────────────────────────────────────────
    const dayCount = startDate && endDate
        ? Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / 86_400_000) + 1)
        : 1;
    const avgPerDay = totalAmount / dayCount;

    const hasFilters = !!category;

    const clearFilters = () => {
        setCategory('');
        setDateRange('30d');
    };

    // Navigate to Unified Entry with EXPENSE type pre-selected (via state)
    const handleAddExpense = () => navigate('/entry');

    // ── Render ─────────────────────────────────────────────────────
    return (
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-3">
                        <HiOutlineReceiptRefund className="w-8 h-8 text-red-500" />
                        {t('expenses.title')}
                    </h1>
                    <p className="text-surface-500 text-sm mt-1">
                        {t('expenses.subtitle')}
                    </p>
                </div>

                <div className="flex gap-3">
                    {/* Refresh */}
                    <button
                        onClick={fetchExpenses}
                        disabled={loading}
                        className="p-2.5 rounded-xl border border-gray-200 text-surface-500
                                   hover:bg-gray-50 transition-colors disabled:opacity-40"
                        title="Refresh"
                    >
                        <HiOutlineArrowPath className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>

                    {/* Add expense shortcut */}
                    <button
                        onClick={handleAddExpense}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                                   bg-red-500 hover:bg-red-600 text-white font-bold
                                   text-sm transition-colors shadow-sm shadow-red-200"
                    >
                        <HiOutlinePlusCircle className="w-5 h-5" />
                        {t('expenses.addExpense')}
                    </button>
                </div>
            </div>

            {/* ── Filters Bar ──────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                {/* Always-visible filter row */}
                <div className="p-4 flex flex-wrap items-center gap-3">
                    {/* Date Range preset */}
                    <div className="flex items-center gap-2">
                        <HiOutlineCalendarDays className="w-4 h-4 text-surface-400" />
                        <select
                            value={dateRange}
                            onChange={e => setDateRange(e.target.value)}
                            className="text-sm border border-gray-200 rounded-xl px-3 py-2
                                       outline-none focus:ring-2 focus:ring-primary-300 bg-white"
                        >
                            <option value="today">{t('common.today')}</option>
                            <option value="yesterday">{t('common.yesterday')}</option>
                            <option value="7d">{t('common.last7Days')}</option>
                            <option value="30d">{t('common.last30Days')}</option>
                            <option value="month">{t('common.thisMonth')}</option>
                            <option value="custom">{t('common.custom')}</option>
                        </select>
                    </div>

                    {/* Custom date inputs — show only when 'custom' is selected */}
                    {dateRange === 'custom' && (
                        <>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="text-sm border border-gray-200 rounded-xl px-3 py-2
                                           outline-none focus:ring-2 focus:ring-primary-300"
                            />
                            <span className="text-surface-400 text-sm">to</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="text-sm border border-gray-200 rounded-xl px-3 py-2
                                           outline-none focus:ring-2 focus:ring-primary-300"
                            />
                        </>
                    )}

                    {/* Category filter */}
                    <div className="flex items-center gap-2">
                        <HiOutlineTag className="w-4 h-4 text-surface-400" />
                        <select
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="text-sm border border-gray-200 rounded-xl px-3 py-2
                                       outline-none focus:ring-2 focus:ring-primary-300 bg-white"
                        >
                            <option value="">{t('expenses.allCategories')}</option>
                            {/* Populated from GET /api/expenses/categories — new endpoint */}
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Clear filters */}
                    {hasFilters && (
                        <button
                            onClick={clearFilters}
                            className="text-xs text-surface-500 hover:text-surface-700
                                       underline transition-colors"
                        >
                            {t('expenses.clearFilters')}
                        </button>
                    )}

                    {/* Active filters tag */}
                    <div className="ml-auto flex items-center gap-2 text-xs text-surface-400">
                        <HiOutlineFunnel className="w-4 h-4" />
                        {pagination.total} record{pagination.total !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>

            {/* ── Summary Stats ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                    icon={HiOutlineBanknotes}
                    label={t('reports.metrics.totalExpenses')}
                    value={fmt(totalAmount, t)}
                    sub={`${startDate} → ${endDate}`}
                    color="text-red-600"
                    bg="bg-red-50"
                />
                <StatCard
                    icon={HiOutlineArrowTrendingDown}
                    label={t('expenses.dailyAverage')}
                    value={fmt(avgPerDay, t)}
                    sub={`Over ${dayCount} day${dayCount !== 1 ? 's' : ''}`}
                    color="text-orange-600"
                    bg="bg-orange-50"
                />
                <StatCard
                    icon={HiOutlineTag}
                    label={t('inventory.categories')}
                    value={new Set(expenses.map(e => e.category)).size}
                    sub="distinct expense types"
                    color="text-purple-600"
                    bg="bg-purple-50"
                />
            </div>

            {/* ── Main Content (list + sidebar) ─────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Expense list — takes 2/3 of width on large screens */}
                <div className="lg:col-span-2 space-y-3">
                    {loading ? (
                        // Loading skeletons
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
                                    <div className="flex gap-4">
                                        <div className="w-12 space-y-1">
                                            <div className="h-3 bg-gray-100 rounded" />
                                            <div className="h-6 bg-gray-100 rounded" />
                                            <div className="h-2 bg-gray-100 rounded" />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-gray-100 rounded w-1/3" />
                                            <div className="h-3 bg-gray-100 rounded w-2/3" />
                                            <div className="h-3 bg-gray-100 rounded w-1/4" />
                                        </div>
                                        <div className="h-5 w-20 bg-gray-100 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : expenses.length === 0 ? (
                        <EmptyState
                            hasFilters={hasFilters}
                            onClearFilters={clearFilters}
                            onAdd={handleAddExpense}
                        />
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {expenses.map((exp, i) => (
                                <ExpenseRow key={exp.id} expense={exp} index={i} />
                            ))}
                        </AnimatePresence>
                    )}

                    {/* Pagination (simple prev/next) */}
                    {pagination.total > pagination.limit && (
                        <div className="flex items-center justify-between pt-4">
                            <p className="text-sm text-surface-500">
                                {t('common.showing')} {pagination.page} {t('common.of')} {Math.ceil(pagination.total / pagination.limit)}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    disabled={pagination.page <= 1}
                                    onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium
                                               text-surface-600 hover:bg-gray-50 disabled:opacity-40"
                                >
                                    ← Prev
                                </button>
                                <button
                                    disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                                    onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium
                                               text-surface-600 hover:bg-gray-50 disabled:opacity-40"
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar — category breakdown chart */}
                <div className="space-y-4">
                    <CategoryBreakdown expenses={expenses} />

                    {/* Quick tip */}
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-700">
                        <p className="font-bold mb-1">{t('expenses.recordingTip')}</p>
                        <p className="text-xs leading-relaxed">
                            {t('expenses.recordingTipDesc')}
                        </p>
                        <button
                            onClick={handleAddExpense}
                            className="mt-3 text-xs font-bold text-blue-600 hover:text-blue-800 underline"
                        >
                            {t('expenses.goToUnified')} →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
