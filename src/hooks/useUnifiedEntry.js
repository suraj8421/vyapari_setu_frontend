// ============================================
// useUnifiedEntry — Custom hook
// ============================================
// REFACTOR: All state, data-fetching, and event handler logic that previously
// lived directly inside UnifiedEntryPage (making it 580+ lines) has been
// moved here. The page component now only handles rendering.
// This separation follows the "Container vs Presentational" pattern and makes
// each piece independently testable.

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { getOrFetch } from '../utils/dataCache';
import { useAuth } from '../context/AuthContext';

// Default blank item added when user clicks "+ Add Item"
const BLANK_ITEM = {
    productId: '',
    quantity: 1,
    unitPrice: 0,
    unit: 'PCS',
    boxes: 0,
    discount: 0,
    gstRate: 18,
    total: 0,
    productName: '',
    qtyMode: 'equal',
    bags: 0,
    weightPerBag: 0,
    qtyList: [],
};

// Initial form state — centralised here so it's easy to reset
const INITIAL_FORM = {
    date: new Date().toISOString().split('T')[0],
    partyId: '',
    mobile: '',
    deliveryDate: '',
    category: '',
    subCategory: '',
    invoiceType: 'GST',
    paymentMethod: 'CASH', // Default for single pay
    payments: [{ method: 'CASH', amount: 0 }], // For split payments
    paidAmount: 0,
    notes: '',
    items: [{ ...BLANK_ITEM }],
    options: {
        updateStock: true,
        updateLoan: true,
        generateInvoice: true,
        sendToCustomer: false,
    },
};

export function useUnifiedEntry() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // ─── Transaction Type ────────────────────────────────────
    // REFACTOR: Type is top-level state, not buried inside formData,
    // so sub-components can receive it as a simple prop without
    // drilling through the whole form object.
    const [type, setType] = useState('SALE');

    // ─── UI State ────────────────────────────────────────────
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true); // True while fetching dropdown data

    // ─── Reference Data (Dropdowns) ─────────────────────────
    const [customers, setCustomers] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);

    // REFACTOR: useRef keeps a stable reference to products so handleItemChange
    // can always read the latest list without needing it in its dependency array,
    // which would cause infinite re-renders due to array reference changes.
    const productsRef = useRef([]);

    // ─── Audit History (Only populated when editing, id is in URL) ──
    // REFACTOR: history state was missing in the original page,
    // causing a ReferenceError crash on every load. Now properly declared.
    const [history, setHistory] = useState([]);

    // ─── Form Data ───────────────────────────────────────────
    const [formData, setFormData] = useState({ ...INITIAL_FORM });

    // ════════════════════════════════════════════════════════
    // Data Fetching
    // ════════════════════════════════════════════════════════

    /**
     * Fetch dropdown data (customers, suppliers, products).
     * Uses the shared dataCache so:
     *  - Data is fetched ONCE per session (5-min TTL)
     *  - Navigating away and back does NOT re-fetch
     *  - Two simultaneous callers share ONE in-flight request (dedup)
     */
    const fetchDropdownData = useCallback(async () => {
        setDataLoading(true);
        try {
            // Each key is cached independently — TTL 5 minutes
            const [customers, suppliers, products] = await Promise.all([
                getOrFetch('customers', () => api.get('/customers').then(r => r.data.data || [])),
                getOrFetch('suppliers', () => api.get('/suppliers').then(r => r.data.data || [])),
                getOrFetch('products',  () => api.get('/products').then(r => r.data.data || [])),
            ]);

            setCustomers(customers);
            setSuppliers(suppliers);
            setProducts(products);
            productsRef.current = products;
        } catch (err) {
            toast.error('Could not load dropdown data. Please refresh.');
            console.error('[useUnifiedEntry] fetchDropdownData error:', err);
        } finally {
            setDataLoading(false);
        }
    }, []);

    // Fetch audit history for the record being edited.
    // Only runs when `id` is present in the URL (edit mode).
    const fetchHistory = useCallback(async () => {
        if (!id || !type) return;
        try {
            const res = await api.get(`/transactions/${type}/${id}/history`);
            setHistory(res.data.data || []);
        } catch (err) {
            // Non-fatal — history is a "nice to have", not critical
            console.warn('[useUnifiedEntry] fetchHistory error:', err.message);
        }
    }, [id, type]);

    useEffect(() => {
        fetchDropdownData();
    }, [fetchDropdownData]);

    useEffect(() => {
        if (id) fetchHistory();
    }, [id, fetchHistory]);

    // ════════════════════════════════════════════════════════
    // Form Handlers
    // ════════════════════════════════════════════════════════

    // Generic handler for top-level form fields (date, partyId, notes, etc.)
    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    // Toggle a boolean option (updateStock, updateLoan, etc.)
    const handleOptionChange = useCallback((optionName) => {
        setFormData(prev => ({
            ...prev,
            options: { ...prev.options, [optionName]: !prev.options[optionName] },
        }));
    }, []);

    // Add a blank row to the items list
    const addItem = useCallback(() => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { ...BLANK_ITEM }],
        }));
    }, []);

    // Remove an item row by index
    const removeItem = useCallback((index) => {
        setFormData(prev => ({
            ...prev,
            // Always keep at least one row so the form is never empty
            items: prev.items.length > 1
                ? prev.items.filter((_, i) => i !== index)
                : prev.items,
        }));
    }, []);

    // Handle any change to an item row field.
    // Auto-fills price, unit, and GST when a product is selected.
    // Recalculates the line total after every field change.
    const handleItemChange = useCallback((index, field, value) => {
        setFormData(prev => {
            const newItems = prev.items.map((item, i) => {
                if (i !== index) return item;

                let updated = { ...item, [field]: value };

                if (field === 'FULL_PRODUCT_SELECTION') {
                    const product = value;
                    if (product) {
                        updated.productId = product.id;
                        updated.productName = product.name;
                        updated.unitPrice = type === 'SALE'
                            ? Number(product.sellingPrice)
                            : Number(product.costPrice);
                        updated.unit = product.unit || 'PCS';
                        updated.gstRate = Number(product.gstRate);
                        updated.unitsPerBox = product.unitsPerBox;
                    }
                }

                if (field === 'bags' || field === 'weightPerBag' || field === 'qtyMode' || field === 'qtyList' || field === 'qtyRaw') {
                    if (updated.qtyMode === 'equal') {
                        const b = Number(updated.bags || 0);
                        const w = Number(updated.weightPerBag || 0);
                        updated.quantity = b * w;
                    } else {
                        // Variable mode logic
                        if (field === 'qtyRaw' && value) {
                            let parsedQty = 0;
                            if (typeof value === 'string' && value.includes('+')) {
                                parsedQty = value.split('+').map(s => Number(s.trim())).filter(n => !isNaN(n)).reduce((a, b) => a + b, 0);
                            } else {
                                parsedQty = Number(value);
                            }
                            if (!isNaN(parsedQty)) updated.quantity = parsedQty;
                        } else {
                            const list = updated.qtyList || [];
                            const sum = list.reduce((a, b) => a + Number(b || 0), 0);
                            updated.quantity = sum;
                            
                            if (sum === 0 && updated.qtyRaw && field !== 'qtyList') {
                                let parsedQty = 0;
                                const qr = updated.qtyRaw;
                                if (qr.includes('+')) {
                                    parsedQty = qr.split('+').map(s => Number(s.trim())).filter(n => !isNaN(n)).reduce((a, b) => a + b, 0);
                                } else {
                                    parsedQty = Number(qr);
                                }
                                if (!isNaN(parsedQty)) updated.quantity = parsedQty;
                            }
                        }
                    }
                }

                if (field === 'productId') {
                    const product = productsRef.current.find(p => p.id === value);
                    if (product) {
                        updated.unitPrice = type === 'SALE' ? Number(product.sellingPrice) : Number(product.costPrice);
                        updated.unit = product.unit || 'PCS';
                        updated.gstRate = Number(product.gstRate);
                        updated.productName = product.name;
                        updated.unitsPerBox = product.unitsPerBox;
                    }
                }

                // Units conversion logic (BOX -> Qty)
                let quantity = Number(updated.quantity || 0);
                if (updated.unit === 'BOX' && updated.unitsPerBox) {
                    quantity = Number(updated.boxes || 0) * updated.unitsPerBox;
                    updated.quantity = quantity;
                }

                // Line item total calculation
                const price = Number(updated.unitPrice || 0);
                const disc = Number(updated.discount || 0);
                const gstRate = prev.invoiceType === 'GST' ? Number(updated.gstRate || 0) : 0;
                
                const lineNet = (quantity * price) - (quantity * disc);
                const lineTax = (lineNet * gstRate) / 100;
                updated.total = lineNet + lineTax;

                return updated;
            });
            return { ...prev, items: newItems };
        });
    }, [type]);

    // Derive grand totals from items list (called on every render — cheap enough)
    const calculateTotals = useCallback(() => {
        const items = formData.items;
        const isGST = formData.invoiceType === 'GST';
        
        let subtotal = 0;
        let discount = 0;
        let tax = 0;
        let cgst = 0;
        let sgst = 0;
        let igst = 0;

        items.forEach(item => {
            const qty = Number(item.quantity || 0);
            const price = Number(item.unitPrice || 0);
            const itemDisc = Number(item.discount || 0);
            const gstRate = isGST ? Number(item.gstRate || 0) : 0;

            const lineGross = qty * price;
            const lineDisc = qty * itemDisc;
            const lineNet = lineGross - lineDisc;
            const lineGst = (lineNet * gstRate) / 100;

            subtotal += lineGross;
            discount += lineDisc;
            tax += lineGst;

            if (isGST) {
                // Simplified split for demonstration
                cgst += lineGst / 2;
                sgst += lineGst / 2;
            }
        });

        const overallDiscount = Number(formData.discount || 0);
        const totalDiscount = discount + overallDiscount;
        const grandTotal = subtotal - totalDiscount + tax;
        const paidAmount = formData.payments.reduce((acc, p) => acc + Number(p.amount), 0);
        const totalQuantity = items.reduce((acc, item) => acc + Number(item.quantity || 0), 0);
        
        return { 
            subtotal, 
            discount: totalDiscount, 
            tax, 
            cgst, 
            sgst, 
            igst, 
            total: grandTotal,
            paidAmount,
            totalQuantity
        };
    }, [formData.items, formData.invoiceType, formData.payments, formData.discount]);

    // ─── Payment Splitter Handlers ───
    const addPayment = useCallback(() => {
        setFormData(prev => ({
            ...prev,
            payments: [...prev.payments, { method: 'CASH', amount: 0 }]
        }));
    }, []);

    const removePayment = useCallback((index) => {
        setFormData(prev => ({
            ...prev,
            payments: prev.payments.length > 1 
                ? prev.payments.filter((_, i) => i !== index)
                : prev.payments
        }));
    }, []);

    const handlePaymentChange = useCallback((index, field, value) => {
        setFormData(prev => {
            const newPayments = prev.payments.map((p, i) => {
                if (i !== index) return p;
                return { ...p, [field]: value };
            });
            // Also update paidAmount for backward compat with backend service
            const totalPaid = newPayments.reduce((acc, cur) => acc + Number(cur.amount), 0);
            return { ...prev, payments: newPayments, paidAmount: totalPaid };
        });
    }, []);

    // ════════════════════════════════════════════════════════
    // Form Submission
    // ════════════════════════════════════════════════════════

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const totals = calculateTotals();

            const payload = {
                ...formData,
                type,
                totalAmount: totals.total,
                paidAmount: totals.paidAmount,
                customerId: (type === 'SALE' || type === 'PAYMENT') ? formData.partyId : null,
                supplierId: type === 'PURCHASE' ? formData.partyId : null,
            };

            const res = await api.post('/transactions', payload);

            if (formData.options.generateInvoice && (type === 'SALE' || type === 'PURCHASE')) {
                const partyList = type === 'SALE' ? customers : suppliers;
                const party = partyList.find(p => p.id === formData.partyId);

                generateInvoicePDF(
                    {
                        ...payload,
                        ...totals,
                        partyName: party?.name,
                        mobile: party?.phone,
                        invoiceNumber: res.data.data?.invoiceNumber,
                        store: user?.store, // Pass full store details
                    },
                    type,
                    products,
                );
            }

            toast.success(`✅ ${type} recorded successfully!`);
            navigate('/dashboard');
        } catch (err) {
            const msg = err.response?.data?.message || 'Error saving entry. Please try again.';
            toast.error(msg);
            console.error('[useUnifiedEntry] handleSubmit error:', err);
        } finally {
            setLoading(false);
        }
    }, [formData, type, customers, suppliers, products, calculateTotals, navigate, user?.store]);

    // ════════════════════════════════════════════════════════
    // Public API (what the page component gets)
    // ════════════════════════════════════════════════════════
    return {
        // State
        type, setType,
        formData,
        loading, dataLoading,
        customers, suppliers, products,
        history,

        // Derived
        totals: calculateTotals(),
        isEditMode: !!id,

        // Handlers
        handleInputChange,
        handleOptionChange,
        addItem,
        removeItem,
        handleItemChange,
        addPayment,
        removePayment,
        handlePaymentChange,
        handleSubmit,
    };
}
