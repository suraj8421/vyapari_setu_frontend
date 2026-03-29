// ============================================
// useUnifiedEntry — Custom hook (Updated with Stores state)
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
    storeId: '',
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
    const [stores, setStores] = useState([]);

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

        // NEW: If User is Super Admin (no fixed store), they need the store list
        // to define the context for entries / creations.
        if (user?.role === 'ADMIN' && !user?.storeId) {
            getOrFetch('stores', () => api.get('/stores').then(r => r.data.data || [])).then(storesList => {
                setStores(storesList);
                // AUTO-SELECT FIRST STORE for Admin consistency
                if (storesList.length > 0) {
                    setFormData(prev => ({ ...prev, storeId: storesList[0].id }));
                }
            }).catch(err => {
                console.warn('[useUnifiedEntry] fetchStores error:', err.message);
            });
        }
    }, [user?.role, user?.storeId]);

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

    // ─── Smart Reminder for High Risk Customers ─────────────
    useEffect(() => {
        if (type === 'SALE' && formData.partyId) {
            const customer = customers.find(c => c.id === formData.partyId);
            if (customer && customer.creditScore < 50) {
                toast.error(
                    `⚠️ High Risk: ${customer.name} (Score: ${customer.creditScore}). Expect payment delays!`,
                    { duration: 6000, icon: '🚨', id: 'risk-warning' }
                );
            }
        }
    }, [formData.partyId, type, customers]);

    // ════════════════════════════════════════════════════════
    // Form Handlers
    // ════════════════════════════════════════════════════════

    // Generic handler for top-level form fields (date, partyId, notes, etc.)
    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    /**
     * Handle Party (Customer/Supplier) Selection
     * NEW: Supports quick-creating a customer if it doesn't exist
     */
    const handlePartySelect = useCallback(async (item) => {
        if (!item) return;

        // "Add as New" Logic
        if (item.id === 'NEW') {
            const isSale = type === 'SALE' || type === 'PAYMENT';
            const endpoint = isSale ? '/customers' : '/suppliers';
            const label = isSale ? 'Customer' : 'Supplier';

            // SAFETY: Super Admin context (Auto-populated in fetchStores)
            const targetStoreId = user?.storeId || formData.storeId;

            if (!targetStoreId) {
                toast.error('❌ System Error: No target business context found. Please ensure you have at least one Store created.', { duration: 5000 });
                return;
            }

            console.log('[useUnifiedEntry] QuickCreate Payload:', { name: item.name, storeId: targetStoreId, endpoint });

            try {
                setLoading(true);
                const res = await api.post(endpoint, { 
                    name: item.name, 
                    storeId: targetStoreId 
                });
                
                const newEntity = res.data.data;
                
                setFormData(prev => ({
                    ...prev,
                    partyId: newEntity.id || '',
                    partyName: newEntity.name || '',
                    mobile: newEntity.phone || '',
                }));

                // Update local lists so the new entity appears in any subsequent filtered lists
                if (isSale) setCustomers(prev => [newEntity, ...prev]);
                else setSuppliers(prev => [newEntity, ...prev]);

                toast.success(`✅ Created new ${label}: ${newEntity.name}`);
            } catch (err) {
                const msg = err.response?.data?.message || "Could not save. Check console for details.";
                toast.error(msg);
                console.error('[useUnifiedEntry] QuickCreate error:', err.response?.data || err);
            } finally {
                setLoading(false);
            }
        } else {
            // Normal Selection
            setFormData(prev => ({
                ...prev,
                partyId: item.id || '',
                partyName: item.name || '',
                mobile: item.phone || '',
            }));
        }
    }, [type, user?.storeId, formData.storeId]);


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
                        updated.barcode = product.barcode;
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
                        updated.barcode = product.barcode;
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

    /**
     * Bulk Add Items (from Scanner)
     */
    const bulkAddItems = useCallback((newItemsData) => {
        setFormData(prev => {
            const currentItems = [...prev.items];
            // Remove the first empty row if it hasn't been used yet
            const filteredItems = currentItems.length === 1 && !currentItems[0].productId && !currentItems[0].productName 
                ? [] 
                : currentItems;

            const mapped = newItemsData.map(data => {
                const item = { ...BLANK_ITEM, ...data };
                // Ensure cost price is set if it's a purchase
                if (type === 'PURCHASE' && data.costPrice) item.unitPrice = Number(data.costPrice);
                if (type === 'SALE' && data.sellingPrice) item.unitPrice = Number(data.sellingPrice);
                
                // Recalculate total for the new item
                const qty = Number(item.quantity || 0);
                const price = Number(item.unitPrice || 0);
                const disc = Number(item.discount || 0);
                const gst = prev.invoiceType === 'GST' ? Number(item.gstRate || 0) : 0;
                const net = (qty * price) - (qty * disc);
                item.total = net + (net * gst / 100);
                
                return item;
            });

            return { ...prev, items: [...filteredItems, ...mapped] };
        });
    }, [type]);

    /**
     * Unified Handler for Scanner Actions
     */
    const handleScannerAction = useCallback((action, payload) => {
        // Support for SimpleEntryForm types (EXPENSE, PAYMENT, MISC)
        if (type === 'EXPENSE' || type === 'PAYMENT' || type === 'MISC') {
            setFormData(prev => ({
                ...prev,
                paidAmount: payload.price || prev.paidAmount,
                category: payload.name || prev.category,
                notes: payload.notes || prev.notes
            }));
            toast.success(`✅ Scanned data applied to ${type}`);
            return;
        }

        if (action === 'BULK_IMPORT') {
            bulkAddItems(payload);
        } else if (action === 'OPEN_CREATE_PREFILLED' || action === 'OPEN_EDIT') {
            // Overwrite the last empty item or add new
            setFormData(prev => {
                const items = [...prev.items];
                const lastIdx = items.length - 1;
                
                // If last item is blank, reuse it
                if (!items[lastIdx].productId && !items[lastIdx].productName) {
                    items[lastIdx] = { ...items[lastIdx], ...payload };
                    if (payload.costPrice && type === 'PURCHASE') items[lastIdx].unitPrice = Number(payload.costPrice);
                    if (payload.sellingPrice && type === 'SALE') items[lastIdx].unitPrice = Number(payload.sellingPrice);
                } else {
                    const newItem = { ...BLANK_ITEM, ...payload };
                    if (payload.costPrice && type === 'PURCHASE') newItem.unitPrice = Number(payload.costPrice);
                    if (payload.sellingPrice && type === 'SALE') newItem.unitPrice = Number(payload.sellingPrice);
                    items.push(newItem);
                }
                
                // Trigger line item recalc (simplified here, but handleItemChange logic should ideally be reusable)
                const finalItems = items.map(it => {
                    const qty = Number(it.quantity || 0);
                    const pr = Number(it.unitPrice || 0);
                    const net = (qty * pr); 
                    it.total = net + (net * (prev.invoiceType === 'GST' ? Number(it.gstRate) : 0) / 100);
                    return it;
                });

                return { ...prev, items: finalItems };
            });
        }
    }, [bulkAddItems, type]);

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
        
        const stockWarnings = items.some(item => {
            if (!item.productId) return false;
            const product = (products || []).find(p => p.id === item.productId);
            const available = product?.inventory?.reduce((acc, inv) => acc + inv.quantity, 0) || 0;
            return Number(item.quantity || 0) > available;
        });

        const selectedParty = type === 'SALE' 
            ? customers.find(c => c.id === formData.partyId) 
            : suppliers.find(s => s.id === formData.partyId);
            
        const creditLimitExceeded = type === 'SALE' && 
            selectedParty && 
            Number(selectedParty.creditLimit) > 0 && 
            (Number(selectedParty.balance) + grandTotal) > Number(selectedParty.creditLimit);

        return { 
            subtotal, 
            discount: totalDiscount, 
            tax, 
            cgst, 
            sgst, 
            igst, 
            total: grandTotal,
            paidAmount,
            totalQuantity,
            stockWarnings,
            creditLimitExceeded
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
        handlePartySelect,
        handleOptionChange,
        addItem,
        removeItem,
        handleItemChange,
        addPayment,
        removePayment,
        handlePaymentChange,
        handleSubmit,
        handleScannerAction,
        stores,
    };
}
