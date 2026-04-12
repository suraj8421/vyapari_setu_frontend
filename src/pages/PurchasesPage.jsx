import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { purchaseAPI, productAPI, supplierAPI } from '../services/api';
import { getOrFetch } from '../utils/dataCache';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineSparkles } from 'react-icons/hi2';
import SmartScanModal from '../components/common/SmartScanModal';
import { toast } from 'react-hot-toast';

export default function PurchasesPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [purchases, setPurchases] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [items, setItems] = useState([{ productId: '', quantity: 1, unitPrice: 0, gstRate: 0 }]);
    const [form, setForm] = useState({ storeId: user?.storeId || '', supplierId: '', invoiceNumber: '', notes: '' });

    useEffect(() => { fetchPurchases(); }, [page]);

    const fetchPurchases = async () => {
        setLoading(true);
        try {
            const params = { page, limit: 15 };
            // PERF: Deduplicate list fetch
            const key = `purchases_list_${JSON.stringify(params)}`;
            const data = await getOrFetch(key, () => purchaseAPI.getAll(params).then(r => r.data), 10000);

            setPurchases(data.data || []);
            setPagination(data.pagination);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const openNew = async () => {
        try {
            const [p, s] = await Promise.all([
                getOrFetch('products', () => productAPI.getAll({ limit: 200 }).then(r => r.data.data || [])),
                getOrFetch('suppliers', () => supplierAPI.getAll({ limit: 100 }).then(r => r.data.data || [])),
            ]);
            setProducts(p || []);
            setSuppliers(s || []);
            setItems([{ productId: '', quantity: 1, unitPrice: 0, gstRate: 0 }]);
            setForm({ storeId: user?.storeId || '', supplierId: '', invoiceNumber: '', notes: '' });
            setModalOpen(true);
        } catch (err) { console.error(err); }
    };

    const updateItem = (idx, field, value) => {
        const u = [...items]; u[idx] = { ...u[idx], [field]: value };
        if (field === 'productId') { const pr = products.find(p => p.id === value); if (pr) { u[idx].unitPrice = Number(pr.costPrice); u[idx].gstRate = Number(pr.gstRate); } }
        setItems(u);
    };

    const calcTotal = () => items.reduce((s, i) => {
        const sub = i.unitPrice * i.quantity;
        const tax = (sub * (Number(i.gstRate) || 0)) / 100;
        return s + sub + tax;
    }, 0);
    const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v || 0);

    const handleSubmit = async (e) => {
        e.preventDefault(); setSaving(true);
        try {
            await purchaseAPI.create({ ...form, paidAmount: calcTotal(), items: items.filter(i => i.productId).map(i => ({ productId: i.productId, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice), gstRate: Number(i.gstRate) || 0 })) });
            setModalOpen(false); fetchPurchases();
        } catch (err) { alert(err.response?.data?.message || 'Error'); } finally { setSaving(false); }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-surface-900">{t('purchases.title')}</h1>
                <button onClick={openNew} className="btn-primary"><HiOutlinePlus className="w-5 h-5" /> {t('purchases.newPurchase')}</button>
                <h1 className="text-2xl font-bold text-surface-900">{t('purchases.title')}</h1>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsScannerOpen(true)}
                        className="btn-ghost text-primary-400 border border-primary-400/30 flex items-center gap-2"
                    >
                        <HiOutlineSparkles className="w-5 h-5" />
                        Smart Scan
                    </button>
                    <button onClick={openNew} className="btn-primary"><HiOutlinePlus className="w-5 h-5" /> {t('purchases.newPurchase')}</button>
                </div>
            </div>
            <div className="glass-card overflow-hidden">
                {loading ? <LoadingSpinner /> : purchases.length === 0 ? <div className="text-center py-16 text-surface-500">{t('common.noData')}</div> : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead><tr><th>Invoice</th><th>{t('common.date')}</th><th>{t('purchases.supplier')}</th><th>{t('sales.totalAmount')}</th><th>{t('common.status')}</th></tr></thead>
                            <tbody>{purchases.map(p => (
                                <tr key={p.id}>
                                    <td><span className="badge-info">{p.invoiceNumber || '-'}</span></td>
                                    <td className="text-xs">{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                                    <td>{p.supplier?.name || '-'}</td>
                                    <td className="font-semibold">{fmt(p.totalAmount)}</td>
                                    <td><span className={`badge ${p.status === 'RECEIVED' ? 'badge-success' : 'badge-warning'}`}>{p.status}</span></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                )}
                <div className="px-4 pb-4"><Pagination pagination={pagination} onPageChange={setPage} /></div>
            </div>
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={t('purchases.newPurchase')} size="lg">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="input-label">{t('purchases.supplier')} *</label>
                            <select className="select-field" value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })} required>
                                <option value="">{t('purchases.selectSupplier')}</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select></div>
                        <div><label className="input-label">Invoice #</label><input className="input-field" value={form.invoiceNumber} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })} /></div>
                    </div>
                    {items.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 p-3 rounded-xl bg-surface-800/30">
                            <div className="col-span-4">
                                <select className="select-field py-2" value={item.productId} onChange={e => updateItem(idx, 'productId', e.target.value)} required>
                                    <option value="">{item._scannedName || '--'}</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                {/* Show scanned name hint when product isn't matched yet */}
                                {!item.productId && item._scannedName && (
                                    <p className="text-[10px] text-amber-500 mt-0.5 truncate">📄 {item._scannedName}</p>
                                )}
                            </div>
                            <div className="col-span-2"><input type="number" min="1" className="input-field py-2" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} /></div>
                            <div className="col-span-2"><input type="number" step="0.01" className="input-field py-2" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', e.target.value)} /></div>
                            <div className="col-span-3">
                                <select className="select-field py-2" value={item.gstRate} onChange={e => updateItem(idx, 'gstRate', e.target.value)}>
                                    <option value="0">0%</option>
                                    <option value="5">5%</option>
                                    <option value="12">12%</option>
                                    <option value="18">18%</option>
                                    <option value="28">28%</option>
                                </select>
                            </div>
                            <div className="col-span-1"><button type="button" onClick={() => items.length > 1 && setItems(items.filter((_, i) => i !== idx))} className="p-2 text-red-400"><HiOutlineTrash className="w-4 h-4" /></button></div>
                        </div>
                    ))}
                    <button type="button" onClick={() => setItems([...items, { productId: '', quantity: 1, unitPrice: 0, gstRate: 0 }])} className="btn-ghost btn-sm text-primary-400"><HiOutlinePlus className="w-4 h-4" /> {t('sales.addItem')}</button>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-surface-800/30">
                        <span className="text-surface-400">{t('common.total')}:</span>
                        <span className="text-xl font-bold">{fmt(calcTotal())}</span>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-surface-700/50">
                        <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">{t('common.cancel')}</button>
                        <button type="submit" disabled={saving} className="btn-primary">{saving ? '...' : t('common.save')}</button>
                    </div>
                </form>
            </Modal>

            <SmartScanModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                contextType="purchase"
                onScanComplete={async (actionOrData, itemsPayload, docMeta) => {
                    // ── Load fresh suppliers & products first ──────────────────────────────
                    let freshProducts = products;
                    let freshSuppliers = suppliers;
                    if (freshProducts.length === 0 || freshSuppliers.length === 0) {
                        try {
                            const [p, s] = await Promise.all([
                                getOrFetch('products', () => productAPI.getAll({ limit: 200 }).then(r => r.data.data || [])),
                                getOrFetch('suppliers', () => supplierAPI.getAll({ limit: 100 }).then(r => r.data.data || [])),
                            ]);
                            freshProducts = p || [];
                            freshSuppliers = s || [];
                            setProducts(freshProducts);
                            setSuppliers(freshSuppliers);
                        } catch (err) { console.error(err); }
                    }

                    // ── BULK_IMPORT from document scan ─────────────────────────────────────
                    if (actionOrData === 'BULK_IMPORT' && Array.isArray(itemsPayload)) {
                        toast.loading('Synchronizing product database...', { id: 'scan-process' });
                        
                        // 1. Resolve/Create Supplier (Sequential)
                        let resolvedSupplierId = form.supplierId;
                        const scannedSupplierName = docMeta?.supplierName;
                        if (scannedSupplierName) {
                            const existingSup = freshSuppliers.find(
                                s => s.name?.toLowerCase() === scannedSupplierName.toLowerCase()
                            );
                            if (existingSup) {
                                resolvedSupplierId = existingSup.id;
                            } else {
                                try {
                                    const newSup = await supplierAPI.create({
                                        name: scannedSupplierName,
                                        storeId: user?.storeId,
                                    });
                                    const created = newSup.data?.data || newSup.data;
                                    if (created?.id) {
                                        freshSuppliers = [...freshSuppliers, created];
                                        setSuppliers(freshSuppliers);
                                        resolvedSupplierId = created.id;
                                        toast.success(`Registered supplier: ${scannedSupplierName}`, { icon: '🏢' });
                                    }
                                } catch (err) { console.error('Supplier creation failed', err); }
                            }
                        }

                        // 2. Resolve/Create Products (Sequential)
                        const finalProcessedItems = [];
                        for (const item of itemsPayload) {
                            let matched = freshProducts.find(
                                p => (item.barcode && p.barcode === item.barcode) || 
                                     (item.name && p.name?.toLowerCase() === item.name?.toLowerCase())
                            );

                            // If not in local list, check backend via search before creating
                            if (!matched && item.name) {
                                try {
                                    const searchRes = await productAPI.getAll({ search: item.name, limit: 1 });
                                    const found = searchRes.data?.data?.[0] || searchRes.data?.[0];
                                    if (found) { 
                                        matched = found; 
                                        // CRITICAL: Add to local list so the dropdown has this option to display!
                                        if (!freshProducts.find(p => p.id === matched.id)) {
                                            freshProducts = [...freshProducts, matched];
                                        }
                                    }
                                } catch (e) { /* silent search fail */ }
                            }

                            // If still not found, create new
                            if (!matched && item.name) {
                                try {
                                    const res = await productAPI.create({
                                        name: item.name,
                                        sku: `SCAN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                                        costPrice: Math.max(0.01, Number(item.costPrice || item.unitPrice || 0.01)),
                                        sellingPrice: Math.max(0.01, Number(item.sellingPrice || item.unitPrice || item.costPrice || 0.01)),
                                        unit: (item.unit || 'PCS').toUpperCase(),
                                        category: item.category || 'General',
                                        gstRate: Math.min(100, Math.max(0, Number(item.gstRate || 0))),
                                        barcode: item.barcode || '',
                                        storeId: user?.storeId,
                                        initialStock: 0,
                                    });
                                    const created = res.data?.data || res.data;
                                    if (created?.id) {
                                        matched = created;
                                        if (!freshProducts.find(p => p.id === matched.id)) {
                                            freshProducts = [...freshProducts, matched];
                                        }
                                    }
                                } catch (err) {
                                    console.error('API Error Details:', err.response?.data);
                                    // If creation failed (maybe it exists but search missed it), try one last lookup by name
                                    try {
                                        const finalSearch = await productAPI.getAll({ limit: 100 });
                                        const fallback = (finalSearch.data?.data || finalSearch.data).find(p => p.name?.toLowerCase() === item.name?.toLowerCase());
                                        if (fallback) { matched = fallback; }
                                    } catch (e) {}
                                    console.warn('Auto-product creation failed for:', item.name, err);
                                }
                            }

                            finalProcessedItems.push({
                                productId: matched?.id || '',
                                quantity: Number(item.quantity) || 1,
                                unitPrice: matched ? Number(matched.costPrice) : Number(item.unitPrice || item.costPrice || 0),
                                gstRate: matched ? Number(matched.gstRate) : Number(item.gstRate || 0),
                                _scannedName: item.name || '',
                            });
                        }

                        // Final state sync
                        setProducts(freshProducts);
                        setItems(finalProcessedItems.length ? finalProcessedItems : [{ productId: '', quantity: 1, unitPrice: 0, gstRate: 0 }]);
                        setForm(prev => ({ ...prev, supplierId: resolvedSupplierId }));
                        
                        toast.dismiss('scan-process');
                        toast.success('Document sync complete!');
                        setIsScannerOpen(false);
                        setModalOpen(true);
                        return;
                    }

                    // ── Single barcode/camera scan ─────────────────────────────────────────
                    const existing = freshProducts.find(p => p.barcode === actionOrData?.barcode || p.name === actionOrData?.name);
                    if (existing) {
                        const updated = [...items];
                        if (updated[0].productId === '') {
                            updated[0] = { ...updated[0], productId: existing.id, unitPrice: Number(existing.costPrice), gstRate: Number(existing.gstRate) };
                            setItems(updated);
                        } else {
                            setItems([...updated, { productId: existing.id, quantity: actionOrData.quantity || 1, unitPrice: Number(existing.costPrice), gstRate: Number(existing.gstRate) }]);
                        }
                    } else {
                        toast.error('Product not found. Please select it manually.');
                    }
                    setIsScannerOpen(false);
                    setModalOpen(true);
                }}
            />
        </div>
    );
}
