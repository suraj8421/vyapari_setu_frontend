import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { purchaseAPI, productAPI, supplierAPI } from '../services/api';
import { getOrFetch, invalidate } from '../utils/dataCache';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2';

export default function PurchasesPage() {
    const { t } = useTranslation();
    const { user } = useAuth();

    // ─── Purchases list state ───────────────────────────────────────────────
    const [purchases, setPurchases]   = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading]       = useState(true);
    const [page, setPage]             = useState(1);

    // ─── New purchase form state ────────────────────────────────────────────
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving]       = useState(false);
    const [products, setProducts]   = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [items, setItems]         = useState([{ productId: '', quantity: 1, unitPrice: 0, gstRate: 0 }]);
    const [form, setForm]           = useState({
        storeId: user?.storeId || '',
        supplierId: '',
        invoiceNumber: '',
        date: '',
        gstin: '',
        overallGst: '',
        notes: '',
    });



    useEffect(() => { fetchPurchases(); }, [page]);

    // ─── Data fetching ──────────────────────────────────────────────────────
    const fetchPurchases = async () => {
        setLoading(true);
        try {
            const params = { page, limit: 15 };
            const key    = `purchases_list_${JSON.stringify(params)}`;
            const data   = await getOrFetch(key, () => purchaseAPI.getAll(params).then(r => r.data), 10000);
            setPurchases(data.data || []);
            setPagination(data.pagination);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // ─── Open new purchase form ─────────────────────────────────────────────
    const openNew = async () => {
        try {
            const [p, s] = await Promise.all([
                getOrFetch('products',   () => productAPI.getAll({ limit: 200 }).then(r => r.data.data || [])),
                getOrFetch('suppliers',  () => supplierAPI.getAll({ limit: 100 }).then(r => r.data.data || [])),
            ]);
            setProducts(p || []);
            setSuppliers(s || []);
            setItems([{ productId: '', productName: '', quantity: 1, unitPrice: 0, gstRate: 0 }]);
            setForm({ storeId: user?.storeId || '', supplierId: '', invoiceNumber: '', date: '', gstin: '', overallGst: '', notes: '' });
            setModalOpen(true);
        } catch (err) {
            console.error(err);
        }
    };

    // ─── Item update ────────────────────────────────────────────────────────
    const updateItem = (idx, field, value) => {
        const u = [...items];
        u[idx] = { ...u[idx], [field]: value };
        if (field === 'productId') {
            const pr = products.find(p => p.id === value);
            if (pr) {
                u[idx].unitPrice = Number(pr.costPrice);
                u[idx].gstRate   = Number(pr.gstRate);
            }
        }
        setItems(u);
    };

    // ─── Totals ─────────────────────────────────────────────────────────────
    const calcTotal = () => items.reduce((s, i) => {
        const sub = i.unitPrice * i.quantity;
        const tax = (sub * (Number(i.gstRate) || 0)) / 100;
        return s + sub + tax;
    }, 0);

    const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v || 0);

    // ─── Submit purchase ────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const finalNotes = [
                form.date ? `Date: ${form.date}` : '',
                form.gstin ? `GSTIN: ${form.gstin}` : '',
                form.overallGst ? `Tax: ${form.overallGst}` : '',
                form.notes
            ].filter(Boolean).join(' | ');

            // Create any new products first
            const finalItems = [];
            for (const item of items) {
                if (!item.productId && (!item.productName || item.productName.trim() === '')) continue;

                let productId = item.productId;
                if (productId === 'NEW' || !productId || productId.trim() === '') {
                    // Check if it matches an existing product from list case-insensitively
                    const existing = products.find(p => p.name.toLowerCase() === item.productName.trim().toLowerCase());
                    if (existing) {
                        productId = existing.id;
                    } else {
                        // Create the product on the fly
                        const newProdRes = await productAPI.create({
                            name: item.productName.trim(),
                            unit: 'PCS',
                            costPrice: Number(item.unitPrice) || 0,
                            sellingPrice: Number(item.unitPrice) || 0,
                            gstRate: Number(item.gstRate) || 0,
                            storeId: form.storeId || user?.storeId
                        });
                        const newProd = newProdRes.data.data;
                        productId = newProd.id;
                    }
                }
                finalItems.push({
                    productId,
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice) || 0,
                    gstRate: Number(item.gstRate) || 0,
                });
            }

            if (finalItems.length === 0) {
                alert('Please add at least one valid product.');
                setSaving(false);
                return;
            }

            await purchaseAPI.create({
                ...form,
                supplierId: form.supplierId || null,
                notes: finalNotes,
                paidAmount: calcTotal(),
                items: finalItems,
            });

            // Invalidate the cache to ensure newly created products are fetched
            invalidate('products');

            setModalOpen(false);
            fetchPurchases();
        } catch (err) {
            alert(err.response?.data?.message || 'Error saving purchase');
        } finally {
            setSaving(false);
        }
    };

    // ─── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 animate-fade-in">

            {/* Page header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-surface-900">{t('purchases.title')}</h1>
                <div className="flex items-center gap-3">
                    <button
                        id="new-purchase-btn"
                        onClick={openNew}
                        className="btn-primary"
                    >
                        <HiOutlinePlus className="w-5 h-5" />
                        {t('purchases.newPurchase')}
                    </button>
                </div>
            </div>

            {/* Purchases table */}
            <div className="glass-card overflow-hidden">
                {loading ? (
                    <LoadingSpinner />
                ) : purchases.length === 0 ? (
                    <div className="text-center py-16 text-surface-500">
                        {t('common.noData')}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Invoice</th>
                                    <th>{t('common.date')}</th>
                                    <th>{t('purchases.supplier')}</th>
                                    <th>{t('sales.totalAmount')}</th>
                                    <th>{t('common.status')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchases.map(p => (
                                    <tr key={p.id}>
                                        <td><span className="badge-info">{p.invoiceNumber || '-'}</span></td>
                                        <td className="text-xs">{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                                        <td>{p.supplier?.name || '-'}</td>
                                        <td className="font-semibold">{fmt(p.totalAmount)}</td>
                                        <td>
                                            <span className={`badge ${p.status === 'RECEIVED' ? 'badge-success' : 'badge-warning'}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="px-4 pb-4">
                    <Pagination pagination={pagination} onPageChange={setPage} />
                </div>
            </div>

            {/* ─── New Purchase Form Modal ──────────────────────────────────── */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={t('purchases.newPurchase')}
                size="xl"
            >
                <form onSubmit={handleSubmit} className="space-y-4">

<<<<<<< HEAD
                    {/* Vendor hint from SmartScan */}
                    {vendorHint && (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm shadow-lg shadow-amber-500/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-amber-500/20 text-amber-400 shrink-0">
                                    <HiOutlineSparkles className="w-5 h-5 animate-pulse" />
                                </div>
                                <div>
                                    <p className="font-semibold text-amber-200 uppercase text-[10px] tracking-wider mb-0.5">New Supplier Detected</p>
                                    <p className="text-xs">Add <strong>{vendorHint}</strong> to your records?</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={addSupplierOnFly}
                                className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-amber-500 text-surface-900 text-xs font-bold hover:bg-amber-400 transition-colors"
                            >
                                + Add Supplier
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
=======
                    <div className="grid grid-cols-2 gap-4">
>>>>>>> origin/main
                        <div>
                            <label className="input-label">{t('purchases.supplier')} {t('common.optional')}</label>
                            <select
                                className="select-field"
                                value={form.supplierId}
                                onChange={e => setForm({ ...form, supplierId: e.target.value })}
                            >
                                <option value="">{t('purchases.selectSupplier')}</option>
                                {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="input-label">Invoice #</label>
                            <input
                                className="input-field"
                                value={form.invoiceNumber}
                                onChange={e => setForm({ ...form, invoiceNumber: e.target.value })}
                                placeholder="Invoice Number"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        <div>
                            <label className="input-label">Date</label>
                            <input
                                className="input-field"
                                value={form.date}
                                onChange={e => setForm({ ...form, date: e.target.value })}
                                placeholder="DD-MM-YYYY"
                            />
                        </div>
                        <div>
                            <label className="input-label">Supplier GSTIN</label>
                            <input
                                className="input-field uppercase"
                                value={form.gstin}
                                onChange={e => setForm({ ...form, gstin: e.target.value })}
                                placeholder="GSTIN"
                            />
                        </div>
                        <div>
                            <label className="input-label">Tax Rate</label>
                            <input
                                className="input-field"
                                value={form.overallGst}
                                onChange={e => setForm({ ...form, overallGst: e.target.value })}
                                placeholder="Overall GST"
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    {form.notes && (
                        <div>
                            <label className="input-label">Notes</label>
                            <input
                                className="input-field"
                                value={form.notes}
                                onChange={e => setForm({ ...form, notes: e.target.value })}
                            />
                        </div>
                    )}

                    {/* Line items */}
<<<<<<< HEAD
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 mb-2">
                        <label className="input-label mb-0 text-base sm:text-lg font-bold text-surface-200">Line Items</label>
                        {items.some(i => !i._exists && i._extractedName) && (
                            <button
                                type="button"
                                onClick={addAllNewItems}
                                className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 uppercase tracking-wider px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 shadow-lg shadow-amber-500/5 transition-all"
                            >
                                <HiOutlinePlus className="w-3 h-3" /> Add All New Items
                            </button>
                        )}
=======
                    <div className="flex items-center justify-between mb-4">
                        <label className="input-label mb-0 text-lg font-bold text-surface-200">Line Items</label>
>>>>>>> origin/main
                    </div>

                    {/* Table Header (Desktop Only) */}
                    <div className="hidden md:grid md:grid-cols-12 gap-2 px-3 py-2 text-[10px] font-bold text-surface-500 uppercase tracking-widest border-b border-surface-800/50 mb-2">
                        <div className="col-span-3">Item / Product</div>
                        <div className="col-span-2 text-center">HSN</div>
                        <div className="col-span-1 text-center">Qty</div>
                        <div className="col-span-2 text-center">Rate (₹)</div>
                        <div className="col-span-2 text-center">GST %</div>
                        <div className="col-span-1 text-right">Total</div>
                        <div className="col-span-1"></div>
                    </div>

                    <div className="space-y-3">
                        {items.map((item, idx) => {
                            const lineSubtotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                            const lineTotal = lineSubtotal * (1 + (Number(item.gstRate) || 0) / 100);

                            return (
                                <div key={idx} className="space-y-1">
<<<<<<< HEAD
                                    {/* AI-extracted name hint */}
                                    {item._extractedName && (
                                        <div className="flex items-center justify-between px-1">
                                            <p className={`text-[10px] font-medium flex items-center gap-1 ${item._exists ? 'text-violet-400' : 'text-amber-400'}`}>
                                                <HiOutlineSparkles className="w-3 h-3" />
                                                Extracted: &quot;{item._extractedName}&quot;
                                                {item._hsnExists === false && <span className="ml-2 text-red-400 font-bold uppercase">HSN Missing!</span>}
                                            </p>
                                            {!item._exists && (
                                                <button
                                                    type="button"
                                                    onClick={() => addProductOnFly(idx)}
                                                    className="text-[9px] font-bold text-amber-500 hover:underline px-1 py-0.5"
                                                >
                                                    + ADD PRODUCT
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Line Item Container: Card on mobile, Grid on md+ */}
                                    <div className={`p-3.5 sm:p-4 rounded-xl border transition-all ${item._exists ? 'bg-surface-800/30 border-surface-700/40' : 'bg-amber-500/5 border-amber-500/20'}`}>
                                        {/* Mobile Layout (< md) */}
                                        <div className="md:hidden space-y-3">
                                            <div>
                                                <label className="text-[10px] font-bold uppercase text-surface-400 tracking-wider mb-1 block">Product / Item *</label>
                                                <select
                                                    className="select-field py-2 text-xs w-full"
                                                    value={item.productId}
                                                    onChange={e => updateItem(idx, 'productId', e.target.value)}
                                                    required
                                                >
                                                    <option value="">-- Select Product --</option>
                                                    {products.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2.5">
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase text-surface-400 tracking-wider mb-1 block">HSN</label>
                                                    <input
                                                        className="input-field py-2 text-xs"
                                                        value={item.hsnCode || ''}
                                                        onChange={e => updateItem(idx, 'hsnCode', e.target.value)}
                                                        placeholder="HSN Code"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase text-surface-400 tracking-wider mb-1 block">Quantity</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        className="input-field py-2 text-xs text-center font-bold"
                                                        value={item.quantity}
                                                        onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2.5">
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase text-surface-400 tracking-wider mb-1 block">Rate (₹)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="input-field py-2 text-xs font-bold"
                                                        value={item.unitPrice}
                                                        onChange={e => updateItem(idx, 'unitPrice', e.target.value)}
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase text-surface-400 tracking-wider mb-1 block">GST Rate</label>
                                                    <select
                                                        className="select-field py-2 text-xs"
                                                        value={item.gstRate}
                                                        onChange={e => updateItem(idx, 'gstRate', e.target.value)}
                                                    >
                                                        <option value="0">0%</option>
                                                        <option value="5">5%</option>
                                                        <option value="12">12%</option>
                                                        <option value="18">18%</option>
                                                        <option value="28">28%</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-surface-700/30">
                                                <div>
                                                    <span className="text-[10px] font-bold uppercase text-surface-400 mr-2">Item Total:</span>
                                                    <span className="text-sm font-bold text-emerald-400">
                                                        ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                    </span>
                                                </div>
                                                {items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setItems(items.filter((_, i) => i !== idx))}
                                                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                                                    >
                                                        <HiOutlineTrash className="w-4 h-4" /> Remove
                                                    </button>
                                                )}
                                            </div>
=======
                                    <div className="grid grid-cols-12 gap-2 p-3 rounded-xl bg-surface-800/30 transition-all items-center">
                                        <div className="col-span-3">
                                            <input
                                                list={`products-list-${idx}`}
                                                className="input-field py-1.5 text-xs animate-fade-in"
                                                value={item.productName || ''}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    const pr = products.find(p => p.name.toLowerCase() === val.toLowerCase());
                                                    if (pr) {
                                                        const u = [...items];
                                                        u[idx] = {
                                                            ...u[idx],
                                                            productId: pr.id,
                                                            productName: pr.name,
                                                            unitPrice: Number(pr.costPrice),
                                                            gstRate: Number(pr.gstRate)
                                                        };
                                                        setItems(u);
                                                    } else {
                                                        const u = [...items];
                                                        u[idx] = {
                                                            ...u[idx],
                                                            productId: 'NEW',
                                                            productName: val
                                                        };
                                                        setItems(u);
                                                    }
                                                }}
                                                placeholder="Type or select product..."
                                                required
                                            />
                                            <datalist id={`products-list-${idx}`}>
                                                {products.map(p => (
                                                    <option key={p.id} value={p.name} />
                                                ))}
                                            </datalist>
>>>>>>> origin/main
                                        </div>

                                        {/* Desktop Layout (md+) */}
                                        <div className="hidden md:grid md:grid-cols-12 md:gap-2 md:items-center">
                                            <div className="col-span-3">
                                                <select
                                                    className="select-field py-1.5 text-xs"
                                                    value={item.productId}
                                                    onChange={e => updateItem(idx, 'productId', e.target.value)}
                                                    required
                                                >
                                                    <option value="">-- Select</option>
                                                    {products.map(p => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <input
                                                    className="input-field py-1.5 text-xs text-center"
                                                    value={item.hsnCode || ''}
                                                    onChange={e => updateItem(idx, 'hsnCode', e.target.value)}
                                                    placeholder="HSN"
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="input-field py-1.5 text-xs text-center font-bold"
                                                    value={item.quantity}
                                                    onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="input-field py-1.5 text-xs text-center"
                                                    value={item.unitPrice}
                                                    onChange={e => updateItem(idx, 'unitPrice', e.target.value)}
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <select
                                                    className="select-field py-1.5 text-xs"
                                                    value={item.gstRate}
                                                    onChange={e => updateItem(idx, 'gstRate', e.target.value)}
                                                >
                                                    <option value="0">0%</option>
                                                    <option value="5">5%</option>
                                                    <option value="12">12%</option>
                                                    <option value="18">18%</option>
                                                    <option value="28">28%</option>
                                                </select>
                                            </div>
                                            <div className="col-span-1 text-right">
                                                <span className="text-xs font-bold text-surface-200">
                                                    {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                                </span>
                                            </div>
                                            <div className="col-span-1 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => items.length > 1 && setItems(items.filter((_, i) => i !== idx))}
                                                    className="p-1.5 text-surface-600 hover:text-red-400 transition-colors"
                                                    title="Delete item"
                                                >
                                                    <HiOutlineTrash className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <button
                        type="button"
<<<<<<< HEAD
                        onClick={() => setItems([...items, { productId: '', quantity: 1, unitPrice: 0, gstRate: 0, hsnCode: '' }])}
                        className="btn-ghost btn-sm text-primary-400 mt-2 flex items-center gap-1"
=======
                        onClick={() => setItems([...items, { productId: '', productName: '', quantity: 1, unitPrice: 0, gstRate: 0, hsnCode: '' }])}
                        className="btn-ghost btn-sm text-primary-400 mt-2"
>>>>>>> origin/main
                    >
                        <HiOutlinePlus className="w-4 h-4" /> {t('sales.addItem')}
                    </button>

                    {/* Total */}
                    <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-surface-800/30 border border-surface-700/30">
                        <span className="text-sm text-surface-400">{t('common.total')}:</span>
                        <span className="text-lg sm:text-xl font-bold text-emerald-400">{fmt(calcTotal())}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3 pt-4 border-t border-surface-700/50">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            className="btn-secondary w-full sm:w-auto"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-primary w-full sm:w-auto"
                        >
                            {saving ? '...' : t('common.save')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
