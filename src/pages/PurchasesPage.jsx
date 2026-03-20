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
                            <div className="col-span-4"><select className="select-field py-2" value={item.productId} onChange={e => updateItem(idx, 'productId', e.target.value)} required><option value="">--</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
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
                onScanComplete={(data) => {
                    // Logic similar to sales but for purchases
                    const existing = products.find(p => p.barcode === data.barcode || p.name === data.name);
                    if (existing) {
                        const updated = [...items];
                        if (updated[0].productId === '') {
                            updated[0] = { ...updated[0], productId: existing.id, unitPrice: Number(existing.costPrice), gstRate: Number(existing.gstRate) };
                            setItems(updated);
                        } else {
                            setItems([...updated, { productId: existing.id, quantity: data.quantity || 1, unitPrice: Number(existing.costPrice), gstRate: Number(existing.gstRate) }]);
                        }
                    } else {
                        // Alert user or create placeholder
                        toast.error("Product not found. Please add it first.");
                    }
                    setIsScannerOpen(false);
                    setModalOpen(true);
                }}
            />
        </div>
    );
}
