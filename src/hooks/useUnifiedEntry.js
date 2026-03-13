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

// Default blank item added when user clicks "+ Add Item"
const BLANK_ITEM = {
    productId: '',
    quantity: 1,
    unitPrice: 0,
    unit: 'pcs',
    discount: 0,
    gstRate: 0,
    total: 0,
    productName: '', // Stored for PDF generation (avoids UUID in invoice)
};

// Initial form state — centralised here so it's easy to reset
const INITIAL_FORM = {
    date: new Date().toISOString().split('T')[0],
    partyId: '',
    mobile: '',
    deliveryDate: '',
    category: '',
    subCategory: '',
    paymentMethod: 'CASH',
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
    const { id } = useParams();      // Present when editing an existing transaction
    const navigate = useNavigate();

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

    // Fetch customers, suppliers, and products for dropdowns.
    // REFACTOR: Previously used raw axios (no JWT). Now uses api.js
    // which attaches the Authorization: Bearer <token> header.
    // Also fixed the response shape: .data.data not .data.customers
    const fetchDropdownData = useCallback(async () => {
        setDataLoading(true);
        try {
            const [custRes, suppRes, prodRes] = await Promise.all([
                api.get('/customers'),
                api.get('/suppliers'),
                api.get('/products'),
            ]);
            // REFACTOR FIX: Backend returns paginated shape { data: [...], pagination: {...} }
            // The old code read custRes.data.customers which was always undefined,
            // making every dropdown permanently empty.
            setCustomers(custRes.data.data || []);
            setSuppliers(suppRes.data.data || []);
            // Sync both state (for rendering dropdowns) and ref (for item change handler)
            const prodList = prodRes.data.data || [];
            setProducts(prodList);
            productsRef.current = prodList; // Always up-to-date in closures
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

                const updated = { ...item, [field]: value };

                // Auto-fill from product data when product is selected.
                // REFACTOR: Using productsRef.current instead of products state
                // avoids a stale closure and removes products from the dependency
                // array (which would cause the handler to be recreated every render).
                if (field === 'productId') {
                    const product = productsRef.current.find(p => p.id === value);
                    if (product) {
                        // Use selling price for SALE, cost price for PURCHASE
                        updated.unitPrice = type === 'SALE'
                            ? Number(product.sellingPrice)
                            : Number(product.costPrice);
                        updated.unit = product.unit || 'pcs';
                        updated.gstRate = Number(product.gstRate);
                        // Store product name so PDF shows a label, not a UUID
                        updated.productName = product.name;
                    }
                }

                // Recalculate line total after every field change
                const sub = Number(updated.quantity) * Number(updated.unitPrice);
                const disc = Number(updated.discount || 0);
                const tax = (sub - disc) * (Number(updated.gstRate || 0) / 100);
                updated.total = sub - disc + tax;

                return updated;
            });

            return { ...prev, items: newItems };
        });
        // Only type matters here — productsRef is a ref (stable, no re-render needed)
    }, [type]);

    // Derive grand totals from items list (called on every render — cheap enough)
    const calculateTotals = useCallback(() => {
        const items = formData.items;
        const subtotal = items.reduce((acc, item) =>
            acc + Number(item.quantity) * Number(item.unitPrice), 0);
        const discount = items.reduce((acc, item) =>
            acc + Number(item.discount || 0), 0);
        const tax = items.reduce((acc, item) => {
            const sub = Number(item.quantity) * Number(item.unitPrice) - Number(item.discount || 0);
            return acc + sub * (Number(item.gstRate || 0) / 100);
        }, 0);
        return { subtotal, discount, tax, total: subtotal - discount + tax };
    }, [formData.items]);

    // ════════════════════════════════════════════════════════
    // Form Submission
    // ════════════════════════════════════════════════════════

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const totals = calculateTotals();

            // Build the unified payload.
            // customerId / supplierId are derived from partyId based on type —
            // the backend uses one or the other depending on the entry type.
            const payload = {
                ...formData,
                type,
                totalAmount: totals.total,
                customerId: (type === 'SALE' || type === 'PAYMENT') ? formData.partyId : null,
                supplierId: type === 'PURCHASE' ? formData.partyId : null,
                // storeId is derived server-side from the JWT — not sent from client
            };

            // REFACTOR FIX: Use api (with JWT interceptor) instead of raw axios
            const res = await api.post('/transactions', payload);

            // Generate and download PDF invoice if the option is toggled on
            if (formData.options.generateInvoice && (type === 'SALE' || type === 'PURCHASE')) {
                const partyList = type === 'SALE' ? customers : suppliers;
                const party = partyList.find(p => p.id === formData.partyId);

                // REFACTOR FIX: Pass products as productMap so PDF resolves
                // product UUIDs to human-readable product names
                generateInvoicePDF(
                    {
                        ...payload,
                        ...totals,
                        partyName: party?.name,
                        mobile: party?.phone,
                        invoiceNumber: res.data.data?.invoiceNumber,
                    },
                    type,
                    products, // productMap: array of { id, name, ... }
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
    }, [formData, type, customers, suppliers, products, calculateTotals, navigate]);

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
        handleSubmit,
    };
}
