// ============================================
// InventoryPage — Stock Level Management
// ============================================
// NEW PAGE: Previously there was no dedicated inventory view.
// ProductsPage handled product metadata (prices, GST, SKU) but had no
// focused view for stock management — the most operationally critical screen
// for a shop owner.
//
// This page provides:
//  1. At-a-glance summary: total products, low stock count, out-of-stock count
//  2. Filterable inventory table with stock-level progress bars
//  3. Low-stock alert panel (filtered to items below minimum threshold)
//  4. Inline min-stock editor (update thresholds without leaving the page)
//  5. Quick link to ProductsPage for adding stock via a new purchase

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
    HiOutlineCubeTransparent,
    HiOutlineExclamationTriangle,
    HiOutlineXCircle,
    HiOutlineCheckCircle,
    HiOutlineArrowPath,
    HiOutlineMagnifyingGlass,
    HiOutlineFunnel,
    HiOutlinePencilSquare,
    HiOutlineCheck,
    HiOutlineXMark,
    HiOutlinePlusCircle,
    HiOutlineArrowDownTray,
    HiOutlineClock,
    HiOutlineArrowRight,
} from 'react-icons/hi2';
import Modal from '../components/common/Modal';
import { productAPI } from '../services/api';
import { getOrFetch, invalidate } from '../utils/dataCache';

// ── Helpers ─────────────────────────────────────────────────────────
const fmt = (val, locale = 'en-IN') =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'INR' }).format(val || 0);

// Determine stock health: OUT_OF_STOCK, LOW, OK
const getStockStatus = (qty, minLevel) => {
    if (qty === 0) return 'OUT_OF_STOCK';
    if (qty <= minLevel) return 'LOW';
    return 'OK';
};

const STATUS_CONFIG = {
    OK: {
        badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
        bar: 'bg-emerald-400',
        icon: HiOutlineCheckCircle,
        labelKey: 'inventory.inStock',
        iconCls: 'text-emerald-500',
    },
    LOW: {
        badge: 'bg-amber-100 text-amber-700 border border-amber-200',
        bar: 'bg-amber-400',
        icon: HiOutlineExclamationTriangle,
        labelKey: 'products.lowStock',
        iconCls: 'text-amber-500',
    },
    OUT_OF_STOCK: {
        badge: 'bg-red-100 text-red-700 border border-red-200',
        bar: 'bg-red-400',
        icon: HiOutlineXCircle,
        labelKey: 'products.outOfStock',
        iconCls: 'text-red-500',
    },
};

// ── Summary Stat Card ────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, bg, onClick, active }) {
    return (
        <div 
            onClick={onClick}
            className={`bg-white rounded-2xl border transition-all duration-300 p-5 flex items-center gap-4 group
                       ${onClick ? 'cursor-pointer hover:shadow-xl active:scale-95' : ''}
                       ${active 
                         ? 'border-primary-500 ring-2 ring-primary-500/10 shadow-lg' 
                         : 'border-gray-100 shadow-sm hover:border-gray-200'}
                       `}
        >
            <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center shrink-0 transition-transform duration-300
                            ${onClick ? 'group-hover:scale-110 group-hover:rotate-6' : ''}`}>
                <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] text-surface-400 font-bold uppercase tracking-widest flex items-center gap-2">
                    {label}
                    {onClick && (
                        <HiOutlineArrowRight className={`w-3 h-3 transition-all duration-300 
                                                        ${active ? 'opacity-100 translate-x-1 text-primary-500' : 'opacity-0 group-hover:opacity-100 group-hover:translate-x-1'}`} />
                    )}
                </p>
                <div className="flex items-baseline gap-2">
                    <p className={`text-2xl font-black ${color} tracking-tight`}>{value}</p>
                    {active && <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />}
                </div>
                {sub && <p className="text-[11px] text-surface-500 mt-0.5 truncate">{sub}</p>}
            </div>
        </div>
    );
}

// ── Inline Min-Stock Editor ──────────────────────────────────────────
// Lets admin change the low-stock threshold directly in the table
// without opening a separate modal or navigating away.
function MinStockEditor({ productId, current, onSave }) {
    const { t } = useTranslation();
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(current);
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            await productAPI.update(productId, { minStockLevel: Number(value) });
            onSave(productId, Number(value));
            // Invalidate products cache so next load reflects new threshold
            invalidate('products');
            toast.success('Min stock level updated');
            setEditing(false);
        } catch (err) {
            toast.error('Failed to update');
        } finally {
            setSaving(false);
        }
    };

    const cancel = () => { setValue(current); setEditing(false); };

    if (!editing) {
        return (
            <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-surface-700">{current}</span>
                <button
                    onClick={() => setEditing(true)}
                    className="p-1 rounded text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                    title="Edit minimum stock level"
                >
                    <HiOutlinePencilSquare className="w-3.5 h-3.5" />
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1">
            <input
                type="number"
                value={value}
                onChange={e => setValue(e.target.value)}
                className="w-16 px-2 py-1 text-sm border border-primary-300 rounded-lg
                           outline-none focus:ring-2 focus:ring-primary-300"
                min="0"
                autoFocus
            />
            <button
                onClick={save}
                disabled={saving}
                className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                title="Save"
            >
                {saving
                    ? <HiOutlineArrowPath className="w-3.5 h-3.5 animate-spin" />
                    : <HiOutlineCheck className="w-3.5 h-3.5" />
                }
            </button>
            <button
                onClick={cancel}
                className="p-1.5 rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors"
                title={t('common.cancel')}
            >
                <HiOutlineXMark className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

// ── Stock Level Bar ──────────────────────────────────────────────────
function StockBar({ qty, minLevel, maxLevel = null }) {
    const status = getStockStatus(qty, minLevel);
    const cfg = STATUS_CONFIG[status];

    // Calculate % fill — use maxLevel if available, else 3× minLevel as upper bound
    const upperBound = maxLevel || Math.max(minLevel * 3, 30);
    const pct = Math.min((qty / upperBound) * 100, 100);

    return (
        <div className="flex items-center gap-2 min-w-[120px]">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className={`h-full rounded-full ${cfg.bar}`}
                />
            </div>
            <span className="text-xs font-bold text-surface-700 shrink-0 w-8 text-right">{qty}</span>
        </div>
    );
}

// ── Low Stock Alert Banner ───────────────────────────────────────────
// Shows the most critical items at the top as action cards.
function LowStockAlerts({ items, onNavigate }) {
    const { t } = useTranslation();
    if (!items.length) return null;

    return (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <h3 className="font-bold text-amber-900 flex items-center gap-2 mb-3">
                <HiOutlineExclamationTriangle className="w-5 h-5 text-amber-500" />
                Action Needed — {items.length} item{items.length !== 1 ? 's' : ''} need restocking
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.slice(0, 6).map(p => {
                    const inv = p.inventory?.[0];
                    const qty = p.inventory?.reduce((s, i) => s + i.quantity, 0) || 0;
                    const min = inv?.minStockLevel || 10;
                    const max = inv?.maxStockLevel;
                    // Suggest enough to reach max, or 2× min if no max defined
                    const suggest = max ? Math.max(max - qty, 0) : Math.max(min * 2 - qty, 10);

                    return (
                        <div key={p.id} className="bg-white rounded-xl border border-amber-100 p-3 flex justify-between items-center gap-3">
                            <div className="min-w-0">
                                <p className="font-bold text-sm text-surface-900 truncate">{p.name}</p>
                                <p className="text-xs text-surface-500">{p.sku}</p>
                                <p className={`text-xs font-semibold mt-0.5 ${qty === 0 ? 'text-red-500' : 'text-amber-600'}`}>
                                    {qty === 0 ? t('products.outOfStock') : `${qty} ${t('common.left') || 'left'}`} · {t('inventory.minStockLevel')}: {min}
                                </p>
                            </div>
                            <div className="shrink-0 text-right">
                                <p className="text-[10px] text-surface-400">{t('inventory.order') || 'Order ~'}</p>
                                <p className="text-lg font-extrabold text-primary-600">{suggest}</p>
                                <p className="text-[10px] text-surface-400">{p.unit}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
            {items.length > 6 && (
                <p className="text-xs text-amber-700 mt-3 text-center">
                    {t('inventory.moreItems', { count: items.length - 6 })}
                </p>
            )}
        </div>
    );
}

// ── Movement History Modal ───────────────────────────────────────────
function MovementHistoryModal({ product, isOpen, onClose }) {
    const { t } = useTranslation();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen || !product) return;
        setLoading(true);
        productAPI.getMovementHistory(product.id)
            .then(res => setHistory(res.data.data || []))
            .catch(err => toast.error('Failed to load history for ' + product.name))
            .finally(() => setLoading(false));
    }, [isOpen, product]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`${t('inventory.stockHistory')}: ${product?.name || ''}`} maxWidth="max-w-3xl">
            {loading ? (
                <div className="py-12 flex justify-center"><HiOutlineArrowPath className="w-8 h-8 text-primary-500 animate-spin" /></div>
            ) : history.length === 0 ? (
                <div className="py-12 text-center text-surface-500">{t('inventory.noMovement')}</div>
            ) : (
                <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                            <tr className="text-surface-500 uppercase tracking-wider text-[11px] font-bold">
                                <th className="px-4 py-3">{t('common.date')}</th>
                                <th className="px-4 py-3">{t('common.type') || t('inventory.type')}</th>
                                <th className="px-4 py-3">{t('inventory.reference')}</th>
                                <th className="px-4 py-3">{t('inventory.party')}</th>
                                <th className="px-4 py-3 text-right">{t('common.quantity')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {history.map(row => (
                                <tr key={row.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-surface-600">
                                        {new Date(row.date).toLocaleString(t('common.locale') || 'en-IN', {
                                            day: '2-digit', month: 'short', year: 'numeric',
                                            hour: 'numeric', minute: '2-digit'
                                        })}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.type.includes('IN') || row.type.includes('RESTORE')
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-orange-100 text-orange-700'
                                            }`}>
                                            {row.type === 'STOCK_IN' ? t('inventory.stockIn') :
                                                row.type === 'STOCK_OUT' ? t('inventory.stockOut') :
                                                    row.type === 'STOCK_RESTORE' ? t('inventory.stockRestore') : row.type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-surface-900">{row.reference}</td>
                                    <td className="px-4 py-3 text-surface-500">{row.party}</td>
                                    <td className={`px-4 py-3 text-right font-bold ${row.quantity > 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                                        {row.quantity > 0 ? '+' : ''}{row.quantity}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Modal>
    );
}

// ── Stock Adjustment Modal ──────────────────────────────────────────
function StockAdjustmentModal({ product, isOpen, onClose, onSuccess }) {
    const { t } = useTranslation();
    const [quantity, setQuantity] = useState(1);
    const [type, setType] = useState('ADD'); // 'ADD' | 'SUBTRACT'
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await productAPI.adjustStock(product.id, { quantity, type });
            toast.success(`Successfully ${type === 'ADD' ? 'added' : 'subtracted'} stock`);
            onSuccess();
            onClose();
        } catch (err) {
            toast.error('Adjustment failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Quick Adjust: ${product?.name}`} maxWidth="max-w-md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                    <button
                        type="button"
                        onClick={() => setType('ADD')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'ADD' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
                    >
                        Add Stock (+)
                    </button>
                    <button
                        type="button"
                        onClick={() => setType('SUBTRACT')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'SUBTRACT' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}
                    >
                        Reduce Stock (-)
                    </button>
                </div>
                <div>
                    <label className="input-label">Quantity ({product?.unit})</label>
                    <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={e => setQuantity(Number(e.target.value))}
                        className="input-field"
                        required
                    />
                </div>
                <div className="flex gap-3 pt-4">
                    <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                    <button type="submit" disabled={submitting} className={`btn-primary flex-1 ${type === 'SUBTRACT' ? '!bg-orange-600' : '!bg-emerald-600'}`}>
                        {submitting ? '...' : 'Update Stock'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// ── Main Page ────────────────────────────────────────────────────────
export default function InventoryPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // ── Filter & View State ────────────────────────────────────────
    const [searchParams, setSearchParams] = useSearchParams();
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [category, setCategory] = useState(searchParams.get('category') || '');
    const [statusFilter, setStatus] = useState(searchParams.get('filter') === 'low-stock' ? 'LOW' : (searchParams.get('status') || ''));  // 'LOW' | 'OUT_OF_STOCK' | ''
    const [categories, setCategories] = useState([]);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 20;

    // ── Data State ─────────────────────────────────────────────────
    const [products, setProducts] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [historyTarget, setHistoryTarget] = useState(null);
    const [adjustModalOpen, setAdjustModalOpen] = useState(false);
    const [adjustTarget, setAdjustTarget] = useState(null);
    // Computed derived data
    const [lowStockItems, setLowStockItems] = useState([]);
    const [outOfStockItems, setOutOfStockItems] = useState([]);

    // ── Fetch Products (paged) + Categories (cached) ───────────────
    // Products are paged + filtered — they MUST be fetched fresh on filter change.
    // Categories are static-ish — cached for 5 min to avoid redundant calls.
    const fetchInventory = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: PAGE_SIZE,
                search: search || undefined,
                category: category || undefined,
            };
            // Fetch paged products fresh (filters change) + categories from cache
            // PERF: Deduplicate inventory list fetch (shares key space if params match)
            const key = `inventory_list_${JSON.stringify(params)}`;
            const [data, cachedCategories] = await Promise.all([
                getOrFetch(key, () => productAPI.getAll(params).then(r => r.data), 10000),
                getOrFetch('categories', () => productAPI.getCategories().then(r => r.data.data || [])),
            ]);

            const prods = data.data || [];
            setProducts(prods);
            setTotalCount(data.pagination?.total || 0);
            setCategories(cachedCategories);

            // Derive low-stock and out-of-stock for stats
            setLowStockItems(prods.filter(p => {
                const qty = p.inventory?.reduce((s, i) => s + i.quantity, 0) || 0;
                const min = p.inventory?.[0]?.minStockLevel || 10;
                return qty > 0 && qty <= min;
            }));
            setOutOfStockItems(prods.filter(p =>
                (p.inventory?.reduce((s, i) => s + i.quantity, 0) || 0) === 0
            ));
        } catch (err) {
            toast.error('Could not load inventory data');
            console.error('[InventoryPage] fetchInventory:', err);
        } finally {
            setLoading(false);
        }
    }, [page, search, category]);

    useEffect(() => {
        // Sync URL params
        const params = {};
        if (page > 1) params.page = page;
        if (search) params.search = search;
        if (category) params.category = category;
        if (statusFilter === 'LOW') params.filter = 'low-stock';
        else if (statusFilter) params.status = statusFilter;
        setSearchParams(params, { replace: true });

        fetchInventory();
    }, [fetchInventory, search, category, statusFilter, page]);

    // ── Update local min-stock level after inline edit ─────────────
    // Called by MinStockEditor after a successful API call.
    // Updates the local products state so the table reflects the new
    // threshold immediately without a full refetch.
    const handleMinStockSaved = useCallback((productId, newMin) => {
        setProducts(prev =>
            prev.map(p =>
                p.id === productId
                    ? { ...p, inventory: p.inventory?.map(inv => ({ ...inv, minStockLevel: newMin })) }
                    : p
            )
        );
    }, []);

    // ── Client-side status filter ─────────────────────────────────
    // Applied after fetch since the backend doesn't have a status filter param yet.
    const visibleProducts = statusFilter
        ? products.filter(p => {
            const qty = p.inventory?.reduce((s, i) => s + i.quantity, 0) || 0;
            const min = p.inventory?.[0]?.minStockLevel || 10;
            return getStockStatus(qty, min) === statusFilter;
        })
        : products;

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    const handleExportCSV = () => {
        if (!visibleProducts || visibleProducts.length === 0) return;

        let csv = `${t('products.sku')},${t('common.name')},${t('common.category')},${t('common.status')},${t('inventory.inStock')},${t('inventory.minStockLevel') || 'Min Level'},${t('common.value') || 'Value'}\n`;

        visibleProducts.forEach(p => {
            const qty = p.inventory?.reduce((s, i) => s + i.quantity, 0) || 0;
            const min = p.inventory?.[0]?.minStockLevel || 10;
            const status = getStockStatus(qty, min);
            const value = (p.sellingPrice || 0) * qty;

            csv += `"${p.sku || ''}","${p.name.replace(/"/g, '""')}","${p.category?.name || 'Uncategorized'}","${status}",${qty},${min},${value}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `VyapariSetu_Inventory_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // ── Render ─────────────────────────────────────────────────────
    return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-3">
                        <HiOutlineCubeTransparent className="w-8 h-8 text-primary-600" />
                        {t('nav.inventory')}
                    </h1>
                    <p className="text-surface-500 text-sm mt-1">
                        {t('inventory.subtitle') || 'Track stock levels, set thresholds, and spot shortages at a glance.'}
                    </p>
                </div>
                <div className="flex gap-3">
                    {/* Refresh */}
                    <button
                        onClick={fetchInventory}
                        disabled={loading}
                        className="p-2.5 rounded-xl border border-gray-200 text-surface-500
                                   hover:bg-gray-50 transition-colors disabled:opacity-40"
                        title="Refresh inventory"
                    >
                        <HiOutlineArrowPath className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={handleExportCSV}
                        disabled={loading || visibleProducts.length === 0}
                        className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 text-surface-500
                                   hover:bg-gray-50 transition-colors disabled:opacity-40"
                        title="Export CSV"
                    >
                        <HiOutlineArrowDownTray className="w-5 h-5" />
                        <span className="hidden sm:inline">{t('common.export') || 'Export'}</span>
                    </button>
                    {/* Navigate to purchases to restock */}
                    <button
                        onClick={() => navigate('/purchases')}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                                   bg-primary-600 hover:bg-primary-700 text-white
                                   font-bold text-sm transition-colors"
                    >
                        <HiOutlinePlusCircle className="w-5 h-5" />
                        {t('inventory.restock')}
                    </button>
                </div>
            </div>

            {/* ── Summary Stats ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                    icon={HiOutlineCubeTransparent}
                    label={t('dashboard.totalProducts')}
                    value={totalCount}
                    sub={t('inventory.allCategoriesSub')}
                    color="text-primary-600"
                    bg="bg-primary-50"
                    onClick={() => { setStatus(''); setPage(1); }}
                    active={statusFilter === ''}
                />
                <StatCard
                    icon={HiOutlineExclamationTriangle}
                    label={t('dashboard.lowStock')}
                    value={lowStockItems.length}
                    sub={t('inventory.lowStockSub')}
                    color="text-amber-600"
                    bg="bg-amber-50"
                    onClick={() => { setStatus('LOW'); setPage(1); }}
                    active={statusFilter === 'LOW'}
                />
                <StatCard
                    icon={HiOutlineXCircle}
                    label={t('products.outOfStock')}
                    value={outOfStockItems.length}
                    sub={t('inventory.outOfStockSub')}
                    color="text-red-600"
                    bg="bg-red-50"
                    onClick={() => { setStatus('OUT_OF_STOCK'); setPage(1); }}
                    active={statusFilter === 'OUT_OF_STOCK'}
                />
            </div>

            {/* ── Low-Stock Alert Panel ─────────────────────────────── */}
            {/* Only shown when there are items needing attention */}
            {(lowStockItems.length > 0 || outOfStockItems.length > 0) && !loading && (
                <LowStockAlerts
                    items={[...outOfStockItems, ...lowStockItems]}
                    onNavigate={() => navigate('/purchases')}
                />
            )}

            {/* ── Filters ───────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4
                            flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                    <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        placeholder={t('common.searchPlaceholder')}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl
                                   outline-none focus:ring-2 focus:ring-primary-300"
                    />
                </div>

                {/* Category filter */}
                <div className="flex items-center gap-2">
                    <HiOutlineFunnel className="w-4 h-4 text-gray-400" />
                    <select
                        value={category}
                        onChange={e => { setCategory(e.target.value); setPage(1); }}
                        className="text-sm border border-gray-200 rounded-xl px-3 py-2
                                   outline-none focus:ring-2 focus:ring-primary-300 bg-white"
                    >
                        <option value="">{t('expenses.allCategories')}</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                {/* Stock status filter */}
                <select
                    value={statusFilter}
                    onChange={e => setStatus(e.target.value)}
                    className="text-sm border border-gray-200 rounded-xl px-3 py-2
                               outline-none focus:ring-2 focus:ring-primary-300 bg-white"
                >
                    <option value="">{t('inventory.allStockLevels')}</option>
                    <option value="OUT_OF_STOCK">{t('products.outOfStock')}</option>
                    <option value="LOW">{t('products.lowStock')}</option>
                    <option value="OK">{t('products.inStock')}</option>
                </select>

                {/* Clear filters shortcut */}
                {(search || category || statusFilter) && (
                    <button
                        onClick={() => { setSearch(''); setCategory(''); setStatus(''); setPage(1); }}
                        className="text-xs text-surface-500 hover:text-surface-700 underline"
                    >
                        {t('expenses.clearFilters')}
                    </button>
                )}

                <span className="ml-auto text-xs text-surface-400">
                    {visibleProducts.length} {t('common.of')} {totalCount} {t('common.results')}
                </span>
            </div>

            {/* ── Inventory Table ───────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    // Loading skeleton
                    <div className="p-6 space-y-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex gap-4 items-center animate-pulse">
                                <div className="w-8 h-8 bg-gray-100 rounded-lg shrink-0" />
                                <div className="flex-1 space-y-1.5">
                                    <div className="h-4 bg-gray-100 rounded w-1/3" />
                                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                                </div>
                                <div className="w-32 h-3 bg-gray-100 rounded" />
                                <div className="w-20 h-6 bg-gray-100 rounded-full" />
                                <div className="w-16 h-6 bg-gray-100 rounded" />
                            </div>
                        ))}
                    </div>
                ) : visibleProducts.length === 0 ? (
                    <div className="text-center py-24 text-surface-500">
                        <HiOutlineCubeTransparent className="w-12 h-12 mx-auto text-gray-200 mb-3" />
                        <p className="font-semibold">{t('common.noData')}</p>
                        <p className="text-sm mt-1">{t('common.searchPlaceholder')}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr className="text-xs text-surface-500 font-semibold uppercase tracking-wider">
                                    <th className="px-5 py-3">{t('products.productName')}</th>
                                    <th className="px-5 py-3">{t('products.sku')}</th>
                                    <th className="px-5 py-3">{t('common.category')}</th>
                                    {/* Stock bar column */}
                                    <th className="px-5 py-3 min-w-[160px]">{t('products.stock')}</th>
                                    {/* Status badge */}
                                    <th className="px-5 py-3">{t('common.status')}</th>
                                    {/* Editable min: inline editor */}
                                    <th className="px-5 py-3">{t('products.minStock')}</th>
                                    {/* Selling price for context */}
                                    <th className="px-5 py-3">{t('products.sellingPrice')}</th>
                                    {/* Reorder suggestion */}
                                    <th className="px-5 py-3">{t('inventory.reorderQty') || t('inventory.stockHistory')}</th>
                                    <th className="px-5 py-3 text-center">{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                <AnimatePresence mode="popLayout">
                                    {visibleProducts.map((product, i) => {
                                        const inv = product.inventory?.[0];
                                        const qty = product.inventory?.reduce((s, inv) => s + inv.quantity, 0) || 0;
                                        const minLevel = inv?.minStockLevel || 10;
                                        const maxLevel = inv?.maxStockLevel || null;
                                        const status = getStockStatus(qty, minLevel);
                                        const cfg = STATUS_CONFIG[status];

                                        // Reorder suggestion to reach max or 2× min
                                        const reorderQty = status !== 'OK'
                                            ? (maxLevel ? Math.max(maxLevel - qty, 0) : Math.max(minLevel * 2 - qty, 10))
                                            : 0;

                                        return (
                                            <motion.tr
                                                key={product.id}
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ delay: i * 0.02 }}
                                                className={`hover:bg-gray-50 transition-colors
                                                    ${status === 'OUT_OF_STOCK' ? 'bg-red-50/30' :
                                                        status === 'LOW' ? 'bg-amber-50/20' : ''}`}
                                            >
                                                {/* Product name + barcode */}
                                                <td className="px-5 py-3">
                                                    <p className="font-semibold text-sm text-surface-900">{product.name}</p>
                                                    {product.barcode && (
                                                        <p className="text-[11px] text-surface-400">
                                                            BC: {product.barcode}
                                                        </p>
                                                    )}
                                                </td>

                                                {/* SKU */}
                                                <td className="px-5 py-3">
                                                    <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                                        {product.sku}
                                                    </span>
                                                </td>

                                                {/* Category */}
                                                <td className="px-5 py-3 text-sm text-surface-600">
                                                    {product.category || '—'}
                                                </td>

                                                {/* Stock bar + qty */}
                                                <td className="px-5 py-3">
                                                    <StockBar qty={qty} minLevel={minLevel} maxLevel={maxLevel} />
                                                </td>

                                                {/* Status badge */}
                                                <td className="px-5 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${cfg.badge}`}>
                                                        {t(cfg.labelKey)}
                                                    </span>
                                                </td>

                                                {/* Inline min-stock editor */}
                                                <td className="px-5 py-3">
                                                    <MinStockEditor
                                                        productId={product.id}
                                                        current={minLevel}
                                                        onSave={handleMinStockSaved}
                                                    />
                                                </td>

                                                {/* Selling price */}
                                                <td className="px-5 py-3 text-sm font-semibold text-emerald-600">
                                                    {fmt(product.sellingPrice, t('common.locale'))}
                                                </td>

                                                {/* Reorder quantity suggestion */}
                                                <td className="px-5 py-3">
                                                    {reorderQty > 0 ? (
                                                        <span className="font-bold text-primary-600">
                                                            {reorderQty} {product.unit}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-surface-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => { setAdjustTarget(product); setAdjustModalOpen(true); }}
                                                            className="p-1.5 rounded-lg text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors tooltip"
                                                            title="Quick Adjust Stock"
                                                        >
                                                            <HiOutlinePlusCircle className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => { setHistoryTarget(product); setHistoryModalOpen(true); }}
                                                            className="p-1.5 rounded-lg text-primary-600 bg-primary-50 hover:bg-primary-100 transition-colors tooltip flex"
                                                            title="View Movement History"
                                                        >
                                                            <HiOutlineClock className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-5 py-4 flex items-center justify-between border-t border-gray-100">
                        <p className="text-sm text-surface-500">
                            Page {page} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium
                                           text-surface-600 hover:bg-gray-50 disabled:opacity-40"
                            >
                                ← Prev
                            </button>
                            <button
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium
                                           text-surface-600 hover:bg-gray-50 disabled:opacity-40"
                            >
                                Next →
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {/* Include Modals */}
            <MovementHistoryModal
                isOpen={historyModalOpen}
                onClose={() => setHistoryModalOpen(false)}
                product={historyTarget}
            />
            <StockAdjustmentModal
                isOpen={adjustModalOpen}
                onClose={() => setAdjustModalOpen(false)}
                product={adjustTarget}
                onSuccess={fetchInventory}
            />
        </div>
    );
}
