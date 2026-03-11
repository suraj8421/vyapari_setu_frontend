import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PlusIcon,
    TrashIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    CalendarIcon,
    UserGroupIcon,
    TagIcon,
    CubeIcon,
    CreditCardIcon,
    DocumentTextIcon,
    ClockIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { generateInvoicePDF } from '../utils/pdfGenerator';

// FIX: Use the centralised api.js service (which has the JWT auth interceptor)
// instead of raw axios. Using raw axios meant no Authorization header was sent
// and ALL requests from this page failed with 401 Unauthorized.
import api from '../services/api';

// Helper for date formatting
const today = new Date().toISOString().split('T')[0];

const UnifiedEntryPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // FIX: Destructure `id` from URL params — it was used in the old code but
    // useParams() was imported but never destructured, causing a ReferenceError.
    const { id } = useParams();

    // ─── State ──────────────────────────────────────────────
    const [type, setType] = useState('SALE'); // SALE, PURCHASE, EXPENSE, PAYMENT, MISC
    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);

    // FIX: `history` state was used in JSX but never declared with useState.
    // This caused a ReferenceError crash on every page load.
    const [history, setHistory] = useState([]);

    // Form data
    const [formData, setFormData] = useState({
        date: today,
        partyId: '',
        mobile: '',
        deliveryDate: '',
        category: '',
        subCategory: '',
        paymentMethod: 'CASH',
        paidAmount: 0,
        notes: '',
        items: [{ productId: '', quantity: 1, unitPrice: 0, unit: 'pcs', discount: 0, gstRate: 0, total: 0 }],
        options: {
            updateStock: true,
            updateLoan: true,
            generateInvoice: true,
            sendToCustomer: false
        }
    });

    // ─── Effects ────────────────────────────────────────────
    useEffect(() => {
        fetchData();
        // FIX: `id` is now properly declared above via useParams()
        if (id) {
            fetchEntryAndHistory();
        }
    }, [id]);

    const fetchEntryAndHistory = async () => {
        try {
            // FIX: Use `api` (with auth interceptor) instead of raw `axios`
            const histRes = await api.get(`/transactions/${type}/${id}/history`);
            // FIX: `setHistory` was called before but history state didn't exist.
            // Now it's properly declared and this works.
            setHistory(histRes.data.data || []);
        } catch (err) {
            console.error('History fetch failed:', err.message);
        }
    };

    const fetchData = async () => {
        try {
            // FIX: Use `api` (with auth interceptor) instead of raw `axios`
            const [custRes, suppRes, prodRes] = await Promise.all([
                api.get('/customers'),
                api.get('/suppliers'),
                api.get('/products')
            ]);

            // FIX: The old code read custRes.data.customers which was always undefined.
            // The backend returns paginated data at custRes.data.data (the array is nested).
            // This caused ALL dropdowns (customer, supplier, product) to always be empty.
            setCustomers(custRes.data.data || []);
            setSuppliers(suppRes.data.data || []);
            setProducts(prodRes.data.data || []);
        } catch (err) {
            toast.error('Failed to load form data. Please refresh the page.');
            console.error('fetchData error:', err);
        }
    };

    // ─── Handlers ───────────────────────────────────────────
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleOptionChange = (name) => {
        setFormData(prev => ({
            ...prev,
            options: { ...prev.options, [name]: !prev.options[name] }
        }));
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { productId: '', quantity: 1, unitPrice: 0, unit: 'pcs', discount: 0, gstRate: 0, total: 0 }]
        }));
    };

    const removeItem = (index) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;

        // Auto-fill price and total if product is selected
        if (field === 'productId') {
            const product = products.find(p => p.id === value);
            if (product) {
                // For SALE use sellingPrice; for PURCHASE use costPrice
                newItems[index].unitPrice = type === 'SALE'
                    ? Number(product.sellingPrice)
                    : Number(product.costPrice);
                newItems[index].unit = product.unit;
                newItems[index].gstRate = Number(product.gstRate);
                // Store name so the PDF can display it
                newItems[index].productName = product.name;
            }
        }

        // Calculate line total
        const sub = newItems[index].quantity * newItems[index].unitPrice;
        const disc = Number(newItems[index].discount || 0);
        const tax = (sub - disc) * (Number(newItems[index].gstRate || 0) / 100);
        newItems[index].total = sub - disc + tax;

        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const calculateTotals = () => {
        const subtotal = formData.items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0);
        const discount = formData.items.reduce((acc, item) => acc + Number(item.discount || 0), 0);
        const tax = formData.items.reduce((acc, item) => {
            const sub = Number(item.quantity) * Number(item.unitPrice) - Number(item.discount || 0);
            return acc + (sub * (Number(item.gstRate || 0) / 100));
        }, 0);
        return { subtotal, discount, tax, total: subtotal - discount + tax };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const totals = calculateTotals();
            const payload = {
                ...formData,
                type,
                totalAmount: totals.total,
                customerId: (type === 'SALE' || type === 'PAYMENT') ? formData.partyId : null,
                supplierId: type === 'PURCHASE' ? formData.partyId : null,
                // Attach storeId from the user's context via the server (auth middleware handles this)
            };

            // FIX: Use `api` (with auth interceptor) instead of raw `axios`
            const res = await api.post('/transactions', payload);

            // Generate PDF invoice if option is checked
            if (formData.options.generateInvoice && (type === 'SALE' || type === 'PURCHASE')) {
                const party = (type === 'SALE' ? customers : suppliers).find(p => p.id === formData.partyId);
                // FIX: Pass the products list as productMap so PDF can resolve product names
                generateInvoicePDF(
                    {
                        ...payload,
                        ...totals,
                        partyName: party?.name,
                        invoiceNumber: res.data.data?.invoiceNumber
                    },
                    type,
                    products // productMap: array of {id, name, ...}
                );
            }

            toast.success(`${type} Recorded Successfully!`);
            navigate('/dashboard');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error saving entry');
        } finally {
            setLoading(false);
        }
    };

    // ─── Render ─────────────────────────────────────────────
    const entryTypes = [
        { id: 'SALE', label: t('sales.title'), icon: <TagIcon className="w-5 h-5" />, color: 'bg-primary-600' },
        { id: 'PURCHASE', label: t('purchases.title'), icon: <CubeIcon className="w-5 h-5" />, color: 'bg-orange-500' },
        { id: 'EXPENSE', label: 'Expense', icon: <ArrowPathIcon className="w-5 h-5" />, color: 'bg-red-500' },
        { id: 'PAYMENT', label: 'Payment', icon: <CreditCardIcon className="w-5 h-5" />, color: 'bg-emerald-500' },
        // FIX: MISC type is now actually handled by the backend (mapped to an expense with category 'MISC')
        { id: 'MISC', label: 'Misc', icon: <DocumentTextIcon className="w-5 h-5" />, color: 'bg-gray-600' },
    ];

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-surface-900 tracking-tight">Unified Entry Console</h1>
                    <p className="text-surface-500">Record any business transaction from a single screen</p>
                </div>

                {/* Type Selector */}
                <div className="flex flex-wrap gap-2 p-1.5 bg-gray-100 rounded-2xl shadow-inner">
                    {entryTypes.map((et) => (
                        <button
                            key={et.id}
                            type="button"
                            onClick={() => setType(et.id)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 ${type === et.id
                                ? `${et.color} text-white shadow-lg scale-105`
                                : 'text-surface-600 hover:bg-white hover:text-surface-900'
                                }`}
                        >
                            {et.icon}
                            {et.label}
                        </button>
                    ))}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* ─── Part 1: Primary Details ────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className="card p-6 grid grid-cols-1 md:grid-cols-4 gap-6"
                >
                    <div className="form-group">
                        <label className="label">{t('common.date')}</label>
                        <div className="relative">
                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="date" name="date" value={formData.date} onChange={handleInputChange}
                                className="input pl-10 h-12 rounded-xl" required
                            />
                        </div>
                    </div>

                    <div className="form-group md:col-span-2">
                        <label className="label">
                            {type === 'SALE' || type === 'PAYMENT' ? t('sales.customer') : t('purchases.supplier')}
                        </label>
                        <div className="relative">
                            <UserGroupIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <select
                                name="partyId" value={formData.partyId} onChange={handleInputChange}
                                className="input pl-10 h-12 rounded-xl"
                            >
                                <option value="">Select Party</option>
                                {/* FIX: Dropdowns now show data because fetchData correctly reads
                                    from custRes.data.data instead of custRes.data.customers */}
                                {(type === 'SALE' || type === 'PAYMENT' ? customers : suppliers).map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="label">Expected Delivery</label>
                        <div className="relative">
                            <ClockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="date" name="deliveryDate" value={formData.deliveryDate} onChange={handleInputChange}
                                className="input pl-10 h-12 rounded-xl"
                            />
                        </div>
                    </div>
                </motion.div>

                {/* ─── Part 2: Dynamic Items Section ──────────── */}
                <AnimatePresence mode='wait'>
                    {(type === 'SALE' || type === 'PURCHASE') && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                            className="card p-6 overflow-x-auto"
                        >
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <CubeIcon className="w-5 h-5 text-primary-600" />
                                {t('sales.items')}
                            </h3>
                            <table className="w-full text-left border-separate border-spacing-y-2">
                                <thead>
                                    <tr className="text-surface-500 text-sm font-medium">
                                        <th className="pb-2 pl-2">Product</th>
                                        <th className="pb-2">Qty / Units</th>
                                        <th className="pb-2">Rate</th>
                                        <th className="pb-2">Tax %</th>
                                        <th className="pb-2">Total</th>
                                        <th className="pb-2"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.items.map((item, idx) => (
                                        <tr key={idx} className="group transition-all">
                                            <td className="w-1/3">
                                                <select
                                                    value={item.productId}
                                                    onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                                                    className="input w-full rounded-xl bg-gray-50 border-transparent focus:bg-white"
                                                >
                                                    <option value="">Select Item</option>
                                                    {/* FIX: Products list now populated correctly */}
                                                    {products.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="w-24">
                                                <div className="flex items-center">
                                                    <input
                                                        type="number" value={item.quantity}
                                                        onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                                                        className="input rounded-l-xl w-16" min="1"
                                                    />
                                                    <span className="bg-gray-100 px-2 py-2 rounded-r-xl border border-l-0 border-gray-200 text-xs font-bold">{item.unit}</span>
                                                </div>
                                            </td>
                                            <td className="w-32">
                                                <input
                                                    type="number" value={item.unitPrice}
                                                    onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                                                    className="input rounded-xl"
                                                />
                                            </td>
                                            <td className="w-20">
                                                <input
                                                    type="number" value={item.gstRate}
                                                    onChange={(e) => handleItemChange(idx, 'gstRate', Number(e.target.value))}
                                                    className="input rounded-xl"
                                                />
                                            </td>
                                            <td className="font-bold text-surface-900 w-32 pl-4">
                                                ₹ {Number(item.total || 0).toFixed(2)}
                                            </td>
                                            <td className="w-10">
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(idx)}
                                                    className="p-2 text-red-400 hover:text-red-600 transition-colors"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <button
                                type="button" onClick={addItem}
                                className="mt-4 flex items-center gap-2 text-primary-600 font-bold hover:text-primary-700 transition-colors"
                            >
                                <PlusIcon className="w-5 h-5" /> {t('sales.addItem')}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ─── Part 3: Expenses / Payments / MISC ─────── */}
                {(type === 'EXPENSE' || type === 'PAYMENT' || type === 'MISC') && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                        className="card p-6 grid grid-cols-1 md:grid-cols-2 gap-6"
                    >
                        <div className="form-group">
                            <label className="label">Entry Amount</label>
                            <input
                                type="number" name="paidAmount" value={formData.paidAmount} onChange={handleInputChange}
                                className="input h-14 text-2xl font-bold rounded-2xl" placeholder="0.00"
                            />
                        </div>
                        <div className="form-group">
                            <label className="label">Entry Category / Purpose</label>
                            <input
                                type="text" name="category" value={formData.category} onChange={handleInputChange}
                                className="input h-14 rounded-2xl"
                                placeholder={type === 'MISC' ? 'e.g. Miscellaneous expense' : 'e.g. Electricity Bill, Shop Maintenance'}
                            />
                        </div>
                    </motion.div>
                )}

                {/* ─── Part 4: Auto-Actions & Summary ─────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="card p-6">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                                Interactive Auto-Actions
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { id: 'updateStock', label: 'Update Stock Level Automatically', desc: 'Deduct or add inventory counts based on type' },
                                    { id: 'updateLoan', label: 'Update Party Loan (Khata)', desc: 'Record credit/debit in customer/supplier ledger' },
                                    { id: 'generateInvoice', label: 'Generate PDF Invoice', desc: 'Create a professional document for printing' },
                                    { id: 'shareWithAdmins', label: 'Broadcast to Admins', desc: 'Send real-time alert to all administrators' },
                                ].map(opt => (
                                    <div
                                        key={opt.id}
                                        onClick={() => handleOptionChange(opt.id)}
                                        className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${formData.options[opt.id]
                                            ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                                            : 'border-gray-100 hover:border-gray-200'
                                            }`}
                                    >
                                        <div className={`mt-1 w-6 h-6 rounded-md flex items-center justify-center transition-colors ${formData.options[opt.id] ? 'bg-emerald-500 text-white' : 'bg-gray-200'
                                            }`}>
                                            {formData.options[opt.id] && <CheckCircleIcon className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-surface-900 leading-tight">{opt.label}</p>
                                            <p className="text-xs text-surface-500 mt-1">{opt.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="card p-6">
                            <label className="label flex items-center gap-2">
                                <DocumentTextIcon className="w-5 h-5" /> {t('common.description')} / Notes
                            </label>
                            <textarea
                                name="notes" value={formData.notes} onChange={handleInputChange}
                                className="input min-h-[100px] rounded-2xl p-4"
                                placeholder="Add internal notes or special requests for this transaction..."
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="card p-6 bg-surface-900 text-white overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500 opacity-20 blur-3xl -mr-16 -mt-16 rounded-full" />
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
                                <CreditCardIcon className="w-6 h-6" /> Summary
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between text-surface-300">
                                    <span>{t('sales.subtotal')}</span>
                                    <span>₹ {calculateTotals().subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-surface-300">
                                    <span>{t('sales.tax')}</span>
                                    <span>₹ {calculateTotals().tax.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-surface-300">
                                    <span>{t('sales.discount')}</span>
                                    <span>- ₹ {formData.items.reduce((a, c) => a + Number(c.discount || 0), 0).toFixed(2)}</span>
                                </div>
                                <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                                    <div>
                                        <p className="text-xs text-surface-400 uppercase tracking-wider font-bold">Total To Record</p>
                                        <p className="text-4xl font-extrabold text-primary-400">₹ {calculateTotals().total.toFixed(2)}</p>
                                    </div>
                                </div>

                                <div className="pt-6 space-y-4">
                                    <div className="form-group">
                                        <label className="text-xs font-bold text-surface-400 uppercase">{t('sales.paymentMethod')}</label>
                                        <select
                                            name="paymentMethod" value={formData.paymentMethod} onChange={handleInputChange}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none focus:ring-2 focus:ring-primary-500"
                                        >
                                            <option value="CASH">Cash</option>
                                            <option value="UPI">UPI / Digital</option>
                                            <option value="CREDIT">Credit / No Payment</option>
                                            <option value="BANK_TRANSFER">Bank Transfer</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="text-xs font-bold text-surface-400 uppercase">Amount Paid Now</label>
                                        <input
                                            type="number" name="paidAmount" value={formData.paidAmount} onChange={handleInputChange}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 mt-1 outline-none focus:ring-2 focus:ring-primary-500 text-xl font-bold"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit" disabled={loading}
                                className="w-full mt-8 py-4 bg-primary-500 hover:bg-primary-600 rounded-2xl font-black text-lg transition-all shadow-xl shadow-primary-500/20 disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {loading ? (
                                    <ArrowPathIcon className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircleIcon className="w-6 h-6" /> Record Transaction
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Approval Alert for non-admins */}
                        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                            <ExclamationTriangleIcon className="w-6 h-6 text-amber-500 shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-amber-900">Security Checkpoint</p>
                                <p className="text-xs text-amber-700 mt-1">
                                    Entries made by staff are logged and might require administrator confirmation for final approval.
                                </p>
                            </div>
                        </div>

                        {/* Audit History Log — FIX: `history` state now exists and populates correctly */}
                        {history.length > 0 && (
                            <div className="card p-6 mt-6 border-2 border-primary-100 bg-primary-50/30">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <ClockIcon className="w-5 h-5 text-primary-600" />
                                    Permanent Audit Trail
                                </h3>
                                <div className="space-y-4">
                                    {history.map((log) => (
                                        <div key={log.id} className="flex gap-4 p-3 rounded-xl bg-white shadow-sm border border-primary-50">
                                            <div className="w-1 bg-primary-500 rounded-full" />
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <p className="text-sm font-bold text-surface-900">
                                                        {log.action} by {log.changedBy?.firstName}
                                                    </p>
                                                    <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${log.status === 'APPROVED'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : log.status === 'REJECTED'
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                        {log.status}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-surface-500 mt-0.5">
                                                    {new Date(log.createdAt).toLocaleString()}
                                                </p>
                                                {log.notes && <p className="text-[11px] bg-gray-50 p-2 mt-2 rounded-lg italic">"{log.notes}"</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
};

export default UnifiedEntryPage;
