// ============================================
// Sales Page — with Sale Returns UI
// ============================================
// ADDED: Sale return functionality was 0% on the frontend.
// The backend had PATCH /api/sales/:id/status with RETURNED/PARTIAL_RETURN
// support and stock restoration, but there were no UI buttons to trigger it.
//
// Changes made in this file:
//   1. Added Status column to the sales table with colour-coded badges
//   2. Added "Return" action button per row (hidden for already-returned sales)
//   3. Added ReturnModal component — lets admin choose full or partial return
//      and enter a reason/notes for the audit trail
//   4. Added handleReturn() function calling saleAPI.updateStatus
//   5. Replaced alert() with toast() for consistent UX

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { saleAPI, productAPI, customerAPI } from '../services/api';
import { getOrFetch, invalidateMany } from '../utils/dataCache';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import {
    HiOutlinePlus,
    HiOutlineTrash,
    HiOutlineMagnifyingGlass,
    HiOutlineFunnel,
    HiOutlineArrowUturnLeft,
    HiOutlineExclamationTriangle,
    HiOutlineCheckCircle,
    HiOutlineArrowPath,
    HiOutlineDocumentArrowDown,
    HiOutlineDocumentText,
    HiOutlineXMark,
} from 'react-icons/hi2';
import { resolveDateRange } from '../utils/dateUtils';

import InvoiceViewModal from '../components/common/InvoiceViewModal';// ── Sale Status Badge ──────────────────────────────────────────────
// Status-to-CSS mapping. Only values defined in the `SaleStatus` Prisma enum
// are listed here. PENDING and CANCELLED are intentionally omitted — they do
// not exist in the schema and can never be stored in the database.
const STATUS_STYLES = {
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    RETURNED: 'bg-red-100     text-red-700',
    PARTIAL_RETURN: 'bg-orange-100  text-orange-700',
};

function StatusBadge({ status }) {
    const { t } = useTranslation();
    // Fallback to a neutral gray style for any unrecognised status value
    const style = STATUS_STYLES[status] || 'bg-gray-100 text-gray-500';
    return (
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${style}`}>
            {t(`sales.status.${status}`) || status}
        </span>
    );
}

// ── Return Confirmation Modal ──────────────────────────────────────
// Replaced full/partial radio buttons with a per-item checklist.
// Selecting all items automatically becomes a RETURNED (full), otherwise PARTIAL_RETURN.
function ReturnModal({ sale, onConfirm, onClose, loading }) {
    const { t } = useTranslation();
    const [notes, setNotes] = useState('');
    const [selectedItems, setSelectedItems] = useState(
        () => (sale?.items || []).map(item => item.id)
    );

    if (!sale) return null;

    const allSelected = selectedItems.length === (sale.items || []).length;

    const toggleAll = () => {
        if (allSelected) {
            setSelectedItems([]);
        } else {
            setSelectedItems((sale.items || []).map(item => item.id));
        }
    };

    const toggleItem = (id) => {
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleConfirm = () => {
        if (selectedItems.length === 0) return;
        const status = allSelected ? 'RETURNED' : 'PARTIAL_RETURN';
        onConfirm(status, notes, selectedItems);
    };

    const formatCurrency = val =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
            >
                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                        <HiOutlineArrowUturnLeft className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-surface-900 text-lg">{t('sales.processReturn')}</h3>
                        <p className="text-xs text-surface-500">
                            {t('sales.invoice')}: <span className="font-semibold text-primary-600">{sale.invoiceNumber}</span>
                            <span className="mx-1.5">·</span>
                            {sale.customer?.name || t('common.walkInCustomer')}
                        </p>
                    </div>
                </div>

                {/* Stock restore notice */}
                <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100 mb-4 text-xs text-blue-700">
                    <HiOutlineCheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
                    <span>Stock will be automatically restored for selected items once the return is confirmed.</span>
                </div>

                {/* Select All Row */}
                <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-sm font-semibold text-surface-700">Select Items to Return</span>
                    <button
                        type="button"
                        onClick={toggleAll}
                        className="text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors"
                    >
                        {allSelected ? 'Deselect All' : 'Select All'}
                    </button>
                </div>

                {/* Item Checklist */}
                <div className="space-y-2 mb-4 max-h-52 overflow-y-auto pr-1">
                    {(sale.items || []).map((item) => {
                        const checked = selectedItems.includes(item.id);
                        const productName = item.product?.name || item.productName || `Item #${item.id?.slice(-4)}`;
                        return (
                            <label
                                key={item.id}
                                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                                    ${checked ? 'border-orange-400 bg-orange-50' : 'border-gray-100 hover:border-gray-200'}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleItem(item.id)}
                                    className="w-4 h-4 accent-orange-500 rounded shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-surface-900 truncate">{productName}</p>
                                    <p className="text-xs text-surface-500">
                                        Qty: {item.quantity} · {formatCurrency(item.unitPrice)} each
                                    </p>
                                </div>
                                <span className="text-sm font-bold text-surface-800">
                                    {formatCurrency(item.total || item.quantity * item.unitPrice)}
                                </span>
                            </label>
                        );
                    })}
                </div>

                {/* Auto-detected return type badge */}
                {selectedItems.length > 0 && (
                    <div className={`text-xs font-bold px-3 py-2 rounded-lg mb-4 ${
                        allSelected ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-orange-50 text-orange-600 border border-orange-100'
                    }`}>
                        {allSelected
                            ? '↩ Full Return — all items will be returned'
                            : `↵ Partial Return — ${selectedItems.length} of ${sale.items?.length} item(s) selected`
                        }
                    </div>
                )}

                {/* Reason / notes */}
                <div className="mb-4">
                    <label className="text-sm font-semibold text-surface-700 block mb-2">
                        {t('sales.returnReason')} <span className="text-surface-400 font-normal">(Optional)</span>
                    </label>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                                   outline-none focus:ring-2 focus:ring-orange-300 min-h-[60px]
                                   resize-none"
                        placeholder="e.g. Damaged goods, customer changed mind"
                    />
                </div>

                {/* Warning */}
                <div className="flex items-center gap-2 mb-5 p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700">
                    <HiOutlineExclamationTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                    This action cannot be undone. The sale status will be permanently changed.
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 font-semibold
                                   text-surface-600 hover:bg-gray-50 transition-colors text-sm"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading || selectedItems.length === 0}
                        className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600
                                   text-white font-bold text-sm transition-colors
                                   disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading
                            ? <HiOutlineArrowPath className="w-4 h-4 animate-spin" />
                            : <HiOutlineArrowUturnLeft className="w-4 h-4" />
                        }
                        {t('sales.confirm')} ({selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''})
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────
export default function SalesPage() {
    const { t } = useTranslation();
    const { user, isAdmin } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    // Filters from URL
    const initialRange = searchParams.get('range') || (searchParams.get('filter') === 'today' ? 'today' : '');
    const initialPaymentMethod = searchParams.get('paymentMethod') || (searchParams.get('type') === 'credit' ? 'CREDIT' : '');

    const [sales, setSales] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [dateRange, setDateRange] = useState(initialRange);
    const [paymentMethod, setPaymentMethod] = useState(initialPaymentMethod);

    // New-sale modal
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // NEW: Return modal state
    const [returnTarget, setReturnTarget] = useState(null);
    const [returnLoading, setReturnLoading] = useState(false);

    // Invoice view modal state
    const [invoiceTarget, setInvoiceTarget] = useState(null);

    // Form data for new sale
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [saleItems, setSaleItems] = useState([
        { productId: '', quantity: 1, unitPrice: 0, discount: 0, gstRate: 0 },
    ]);
    const [saleForm, setSaleForm] = useState({
        storeId: user?.storeId || '',
        customerId: '',
        paymentMethod: 'CASH',
        paidAmount: 0,
        discount: 0,
        notes: '',
    });

    // ── Data Fetching ─────────────────────────────────────────────
    const fetchSales = useCallback(async () => {
        setLoading(true);
        try {
            const resolved = resolveDateRange(dateRange) || {};
            const params = {
                page,
                limit: 15,
                search,
                startDate: resolved.startDate,
                endDate: resolved.endDate,
                paymentMethod: paymentMethod || undefined,
            };

            // PERF: Deduplicate list fetch
            const key = `sales_list_${JSON.stringify(params)}`;
            const data = await getOrFetch(key, () => saleAPI.getAll(params).then(r => r.data), 10000);

            setSales(data.data || []);
            setPagination(data.pagination);
        } catch (err) {
            console.error('[SalesPage] fetchSales:', err);
            toast.error('Failed to load sales');
        } finally {
            setLoading(false);
        }
    }, [page, search, dateRange, paymentMethod]);

    useEffect(() => {
        // Sync URL params
        const params = {};
        if (page > 1) params.page = page;
        if (search) params.search = search;
        if (dateRange) params.range = dateRange;
        if (paymentMethod) params.paymentMethod = paymentMethod;
        setSearchParams(params, { replace: true });

        fetchSales();
    }, [fetchSales]);

    // ── New Sale Form ─────────────────────────────────────────────
    const openNewSale = async () => {
        try {
            // PERF: Use shared dataCache — avoids redundant fetches when the
            // user opens /entry and then comes to SalesPage. Both share the same
            // 5-minute cache keyed by 'products' and 'customers'.
            const [prods, custs] = await Promise.all([
                getOrFetch('products',  () => productAPI.getAll({ limit: 200 }).then(r => r.data.data || [])),
                getOrFetch('customers', () => customerAPI.getAll({ limit: 200 }).then(r => r.data.data || [])),
            ]);
            setProducts(prods);
            setCustomers(custs);
            setSaleItems([{ productId: '', quantity: 1, unitPrice: 0, discount: 0, gstRate: 0 }]);
            setSaleForm({
                storeId: user?.storeId || '',
                customerId: '',
                paymentMethod: 'CASH',
                paidAmount: 0,
                discount: 0,
                notes: '',
            });
            setModalOpen(true);
        } catch (err) {
            console.error(err);
        }
    };

    const addItem = () => setSaleItems([...saleItems, { productId: '', quantity: 1, unitPrice: 0, discount: 0, gstRate: 0 }]);
    const removeItem = idx => { if (saleItems.length <= 1) return; setSaleItems(saleItems.filter((_, i) => i !== idx)); };

    const updateItem = (idx, field, value) => {
        const updated = [...saleItems];
        updated[idx] = { ...updated[idx], [field]: value };
        if (field === 'productId') {
            const product = products.find(p => p.id === value);
            if (product) {
                updated[idx].unitPrice = Number(product.sellingPrice);
                updated[idx].gstRate = Number(product.gstRate);
            }
        }
        setSaleItems(updated);
    };

    const calcTotal = () =>
        saleItems.reduce((sum, item) => {
            const sub = item.unitPrice * item.quantity - item.discount;
            return sum + sub + (sub * (Number(item.gstRate) || 0)) / 100;
        }, 0) - (saleForm.discount || 0);

    const handleSubmit = async e => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...saleForm,
                paidAmount: Number(saleForm.paidAmount) || calcTotal(),
                discount: Number(saleForm.discount) || 0,
                items: saleItems
                    .filter(i => i.productId)
                    .map(i => ({
                        productId: i.productId,
                        quantity: Number(i.quantity),
                        unitPrice: Number(i.unitPrice),
                        discount: Number(i.discount) || 0,
                        gstRate: Number(i.gstRate) || 0,
                    })),
            };
            if (!payload.customerId) delete payload.customerId;

            await saleAPI.create(payload);
            setModalOpen(false);
            fetchSales();
            // Invalidate dropdown cache — a new sale may affect customer balances
            // so we want fresh customer data next time /entry is opened.
            invalidateMany(['products']);
            toast.success(t('sales.saleCompleted'));
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error creating sale');
        } finally {
            setSaving(false);
        }
    };

    // ── Return Handler ────────────────────────────────────────────
    // Called when admin confirms the return in ReturnModal.
    // Now receives selectedItems (array of item IDs) to support item-level partial returns.
    const handleReturnConfirm = async (status, notes, selectedItemIds) => {
        if (!returnTarget) return;
        setReturnLoading(true);
        try {
            await saleAPI.updateStatus(returnTarget.id, { status, notes, returnedItemIds: selectedItemIds });
            setSales(prev =>
                prev.map(s => s.id === returnTarget.id ? { ...s, status } : s)
            );
            toast.success(
                status === 'RETURNED'
                    ? `↩ Sale ${returnTarget.invoiceNumber} fully returned. Stock restored.`
                    : `↵ Sale ${returnTarget.invoiceNumber} — partial return processed.`
            );
            setReturnTarget(null);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Return failed. Please try again.');
        } finally {
            setReturnLoading(false);
        }
    };

    const formatCurrency = val =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

    const handleExportCSV = () => {
        if (!sales || sales.length === 0) return;

        let csv = 'Invoice Number,Date,Customer,Status,Payment Method,Total Amount,Paid Amount\n';

        sales.forEach(sale => {
            const invoice = sale.invoiceNumber || '';
            const dateStr = new Date(sale.createdAt).toLocaleString('en-IN').replace(/,/g, '');
            const customer = (sale.customer?.name || 'Walk-in Customer').replace(/"/g, '""');
            const status = sale.status || 'PENDING';
            const method = sale.paymentMethod || '';
            
            const returnedAmount = (sale.items || [])
                .filter(item => item.returned === true)
                .reduce((sum, item) => sum + Number(item.total || 0), 0);
            const netTotal = Number(sale.totalAmount || 0) - returnedAmount;
            
            const paid = sale.paidAmount || 0;

            csv += `"${invoice}","${dateStr}","${customer}","${status}","${method}",${netTotal},${paid}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `VyapariSetu_Sales_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // ── Render ─────────────────────────────────────────────────────
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-surface-900">{t('sales.title')}</h1>
                    <p className="text-surface-500 text-sm">{pagination?.total || 0} {t('common.results')}</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleExportCSV}
                        disabled={loading || sales.length === 0}
                        className="btn-secondary flex items-center gap-2"
                        title="Export Sales to CSV"
                    >
                        <HiOutlineDocumentArrowDown className="w-5 h-5" />
                        <span className="hidden sm:inline">Export CSV</span>
                    </button>
                    <button onClick={openNewSale} className="btn-primary" id="new-sale-btn">
                        <HiOutlinePlus className="w-5 h-5" />
                        {t('sales.newSale')}
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="glass-card p-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[240px]">
                        <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                        <input
                            type="text" className="input-field pl-10 py-2.5"
                            placeholder={`${t('common.search')} (${t('sales.invoiceNumber')})`}
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <HiOutlineFunnel className="w-5 h-5 text-surface-400" />
                        <select
                            className="select-field py-2.5 w-40"
                            value={dateRange}
                            onChange={e => { setDateRange(e.target.value); setPage(1); }}
                        >
                            <option value="">{t('common.allTime') || 'All Time'}</option>
                            <option value="today">{t('common.today') || 'Today'}</option>
                            <option value="yesterday">{t('common.yesterday') || 'Yesterday'}</option>
                            <option value="7d">{t('common.last7Days') || 'Last 7 Days'}</option>
                            <option value="30d">{t('common.last30Days') || 'Last 30 Days'}</option>
                        </select>
                        <select
                            className="select-field py-2.5 w-44"
                            value={paymentMethod}
                            onChange={e => { setPaymentMethod(e.target.value); setPage(1); }}
                        >
                            <option value="">{t('sales.allPayments') || 'All Payment Methods'}</option>
                            <option value="CASH">{t('sales.cash')}</option>
                            <option value="UPI">{t('sales.upi')}</option>
                            <option value="CREDIT">{t('sales.credit')}</option>
                            <option value="CARD">{t('sales.card')}</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Sales Table */}
            <div className="glass-card overflow-hidden">
                {loading ? <LoadingSpinner /> : sales.length === 0 ? (
                    <div className="text-center py-16 text-surface-500">{t('common.noData')}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>{t('sales.invoiceNumber')}</th>
                                    <th>{t('common.date')}</th>
                                    <th>{t('sales.customer')}</th>
                                    <th>{t('sales.items')}</th>
                                    <th>{t('sales.totalAmount')}</th>
                                    <th>{t('sales.paidAmount')}</th>
                                    <th>{t('sales.paymentMethod')}</th>
                                    {/* NEW: Status column — was missing; staff couldn't see return state */}
                                    <th>{t('common.status')}</th>
                                    <th>{t('sales.soldBy')}</th>
                                    {/* NEW: Actions column — return button lives here */}
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.map(sale => {
                                    // A sale can only be returned if it's COMPLETED or PARTIAL_RETURN
                                    const canReturn = sale.status === 'COMPLETED' || sale.status === 'PARTIAL_RETURN';

                                    const returnedAmount = (sale.items || [])
                                        .filter(item => item.returned === true)
                                        .reduce((sum, item) => sum + Number(item.total || 0), 0);
                                    const netTotal = Number(sale.totalAmount || 0) - returnedAmount;

                                    return (
                                        <tr key={sale.id}>
                                            <td>
                                                <button
                                                    onClick={() => setInvoiceTarget(sale)}
                                                    className="badge-info hover:bg-primary-200 transition-colors cursor-pointer text-left"
                                                    title="Click to view invoice"
                                                >
                                                    {sale.invoiceNumber}
                                                </button>
                                            </td>
                                            <td className="text-xs">
                                                {new Date(sale.createdAt).toLocaleDateString('en-IN')}
                                            </td>
                                            <td>{sale.customer?.name || '-'}</td>
                                            <td>{sale.items?.length || 0}</td>
                                            <td className="font-semibold text-emerald-400">
                                                {returnedAmount > 0 ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-gray-400 line-through">{formatCurrency(sale.totalAmount)}</span>
                                                        <span>{formatCurrency(netTotal)}</span>
                                                    </div>
                                                ) : (
                                                    formatCurrency(sale.totalAmount)
                                                )}
                                            </td>
                                            <td>{formatCurrency(sale.paidAmount)}</td>
                                            <td>
                                                <span className="badge-neutral">{sale.paymentMethod}</span>
                                            </td>

                                            {/* NEW: Status badge */}
                                            <td>
                                                <StatusBadge status={sale.status || 'COMPLETED'} />
                                            </td>

                                            <td className="text-xs">
                                                {sale.soldBy?.firstName} {sale.soldBy?.lastName}
                                            </td>

                                            {/* NEW: Return button
                                                - Shown only for COMPLETED or PARTIAL_RETURN sales
                                                - Greyed out tooltip shown for already-returned sales
                                                - Only admins see the button to prevent accidental returns */}
                                            <td>
                                                {canReturn ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setReturnTarget(sale)}
                                                        title={`Process return for ${sale.invoiceNumber}`}
                                                        className="flex items-center gap-1.5 px-3 py-1.5
                                                                   rounded-lg border border-orange-200
                                                                   text-orange-600 hover:bg-orange-50
                                                                   font-semibold text-xs transition-colors"
                                                    >
                                                        <HiOutlineArrowUturnLeft className="w-3.5 h-3.5" />
                                                        {t('sales.return')}
                                                    </button>
                                                ) : (
                                                    // Show a faded label so admin can confirm it's already returned
                                                    <span className="text-xs text-surface-400">
                                                        {sale.status === 'RETURNED' ? t('sales.status.RETURNED') :
                                                            sale.status === 'CANCELLED' ? t('sales.status.CANCELLED') : '—'}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="px-4 pb-4">
                    <Pagination pagination={pagination} onPageChange={setPage} />
                </div>
            </div>

            {/* ── New Sale Modal (unchanged) ──────────────────────── */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={t('sales.newSale')} size="xl">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="input-label">{t('sales.customer')} (Optional)</label>
                            <select className="select-field" value={saleForm.customerId}
                                onChange={e => setSaleForm({ ...saleForm, customerId: e.target.value })}>
                                <option value="">Walk-in Customer</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="input-label">{t('sales.paymentMethod')}</label>
                            <select className="select-field" value={saleForm.paymentMethod}
                                onChange={e => setSaleForm({ ...saleForm, paymentMethod: e.target.value })}>
                                <option value="CASH">{t('sales.cash')}</option>
                                <option value="UPI">{t('sales.upi')}</option>
                                <option value="CARD">{t('sales.card')}</option>
                                <option value="CREDIT">{t('sales.credit')}</option>
                                <option value="BANK_TRANSFER">{t('sales.bankTransfer')}</option>
                            </select>
                        </div>
                    </div>

                    {/* Sale Items */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="input-label mb-0">{t('sales.items')}</label>
                            <button type="button" onClick={addItem} className="btn-ghost btn-sm text-primary-400">
                                <HiOutlinePlus className="w-4 h-4" /> {t('sales.addItem')}
                            </button>
                        </div>
                        <div className="space-y-4">
                            {saleItems.map((item, idx) => (
                                <div key={idx} className="p-4 rounded-2xl bg-surface-50 border border-gray-100 shadow-sm space-y-3 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-3 sm:items-end">
                                    <div className="sm:col-span-4">
                                        <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest block mb-1">{t('sales.selectProduct')}</label>
                                        <select className="select-field py-2.5" value={item.productId}
                                            onChange={e => updateItem(idx, 'productId', e.target.value)} required>
                                            <option value="">-- {t('sales.selectProduct')} --</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 sm:contents gap-3">
                                        <div className="sm:col-span-2">
                                            <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest block mb-1">{t('common.quantity')}</label>
                                            <input type="number" min="1" className="input-field py-2.5" value={item.quantity}
                                                onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest block mb-1">{t('common.price')}</label>
                                            <input type="number" step="0.01" className="input-field py-2.5" value={item.unitPrice}
                                                onChange={e => updateItem(idx, 'unitPrice', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 sm:contents gap-3">
                                        <div className="sm:col-span-2">
                                            <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest block mb-1">{t('sales.discount')}</label>
                                            <input type="number" className="input-field py-2.5" value={item.discount}
                                                onChange={e => updateItem(idx, 'discount', e.target.value)} />
                                        </div>
                                        <div className="sm:col-span-1">
                                            <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest block mb-1">{t('products.gstRate')}</label>
                                            <select className="select-field py-2.5 px-2" value={item.gstRate}
                                                onChange={e => updateItem(idx, 'gstRate', e.target.value)}>
                                                <option value="0">0%</option>
                                                <option value="5">5%</option>
                                                <option value="12">12%</option>
                                                <option value="18">18%</option>
                                                <option value="28">28%</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="sm:col-span-1 flex justify-end">
                                        <button type="button" onClick={() => removeItem(idx)}
                                            className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100">
                                            <HiOutlineTrash className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-100 shadow-inner space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-4 flex-1">
                                <div className="flex items-center justify-between sm:justify-start gap-4">
                                    <span className="text-xs font-black text-surface-400 uppercase tracking-widest">{t('sales.discount')}:</span>
                                    <input type="number" className="input-field py-2 w-32 text-right font-bold"
                                        value={saleForm.discount}
                                        onChange={e => setSaleForm({ ...saleForm, discount: e.target.value })} />
                                </div>
                                <div className="flex items-center justify-between sm:justify-start gap-4">
                                    <span className="text-xs font-black text-surface-400 uppercase tracking-widest">{t('sales.paidAmount')}:</span>
                                    <input type="number" step="0.01" className="input-field py-2 w-32 text-right font-bold text-emerald-600"
                                        value={saleForm.paidAmount}
                                        onChange={e => setSaleForm({ ...saleForm, paidAmount: e.target.value })}
                                        placeholder={String(calcTotal())} />
                                </div>
                            </div>
                            <div className="pt-4 sm:pt-0 sm:border-l sm:pl-8 border-gray-100 flex flex-col items-center sm:items-end">
                                <span className="text-xs font-black text-surface-400 uppercase tracking-widest mb-1">{t('sales.totalAmount')}</span>
                                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">{formatCurrency(calcTotal())}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-surface-700/50">
                        <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
                            {t('common.cancel')}
                        </button>
                        <button type="submit" disabled={saving} className="btn-primary">
                            {saving ? t('common.loading') : t('sales.completeSale')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ── Invoice View Modal ───────────────────────────────── */}
            <AnimatePresence>
                {invoiceTarget && (
                    <InvoiceViewModal
                        sale={invoiceTarget}
                        onClose={() => setInvoiceTarget(null)}
                    />
                )}
            </AnimatePresence>

            {/* ── Return Confirmation Modal ─────────────────── */}
            {/* AnimatePresence ensures the modal animates in/out cleanly */}
            <AnimatePresence>
                {returnTarget && (
                    <ReturnModal
                        sale={returnTarget}
                        onConfirm={handleReturnConfirm}
                        onClose={() => setReturnTarget(null)}
                        loading={returnLoading}
                    />
                )}
            </AnimatePresence>
        </div >
    );
}
