// ============================================
// Sales Page
// ============================================

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { saleAPI, productAPI, customerAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineMagnifyingGlass } from 'react-icons/hi2';

export default function SalesPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [sales, setSales] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // For new sale
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [saleItems, setSaleItems] = useState([{ productId: '', quantity: 1, unitPrice: 0, discount: 0 }]);
    const [saleForm, setSaleForm] = useState({
        storeId: user?.storeId || '',
        customerId: '',
        paymentMethod: 'CASH',
        paidAmount: 0,
        discount: 0,
        notes: '',
    });

    useEffect(() => { fetchSales(); }, [page, search]);

    const fetchSales = async () => {
        setLoading(true);
        try {
            const { data } = await saleAPI.getAll({ page, limit: 15, search });
            setSales(data.data || []);
            setPagination(data.pagination);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openNewSale = async () => {
        try {
            const [prodRes, custRes] = await Promise.all([
                productAPI.getAll({ limit: 200 }),
                customerAPI.getAll({ limit: 200 }),
            ]);
            setProducts(prodRes.data.data || []);
            setCustomers(custRes.data.data || []);
            setSaleItems([{ productId: '', quantity: 1, unitPrice: 0, discount: 0 }]);
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

    const addItem = () => {
        setSaleItems([...saleItems, { productId: '', quantity: 1, unitPrice: 0, discount: 0 }]);
    };

    const removeItem = (idx) => {
        if (saleItems.length <= 1) return;
        setSaleItems(saleItems.filter((_, i) => i !== idx));
    };

    const updateItem = (idx, field, value) => {
        const updated = [...saleItems];
        updated[idx] = { ...updated[idx], [field]: value };

        // Auto-fill price when product selected
        if (field === 'productId') {
            const product = products.find((p) => p.id === value);
            if (product) {
                updated[idx].unitPrice = Number(product.sellingPrice);
            }
        }
        setSaleItems(updated);
    };

    const calcTotal = () => {
        return saleItems.reduce((sum, item) => {
            return sum + (item.unitPrice * item.quantity - item.discount);
        }, 0) - (saleForm.discount || 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...saleForm,
                paidAmount: Number(saleForm.paidAmount) || calcTotal(),
                discount: Number(saleForm.discount) || 0,
                items: saleItems.filter((i) => i.productId).map((i) => ({
                    productId: i.productId,
                    quantity: Number(i.quantity),
                    unitPrice: Number(i.unitPrice),
                    discount: Number(i.discount) || 0,
                })),
            };
            if (!payload.customerId) delete payload.customerId;

            await saleAPI.create(payload);
            setModalOpen(false);
            fetchSales();
            alert(t('sales.saleCompleted'));
        } catch (err) {
            alert(err.response?.data?.message || 'Error creating sale');
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (val) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-surface-100">{t('sales.title')}</h1>
                    <p className="text-surface-500 text-sm">{pagination?.total || 0} {t('common.results')}</p>
                </div>
                <button onClick={openNewSale} className="btn-primary" id="new-sale-btn">
                    <HiOutlinePlus className="w-5 h-5" />
                    {t('sales.newSale')}
                </button>
            </div>

            {/* Search */}
            <div className="glass-card p-4">
                <div className="relative max-w-md">
                    <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                    <input
                        type="text" className="input-field pl-10 py-2.5"
                        placeholder={`${t('common.search')} (${t('sales.invoiceNumber')})`}
                        value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
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
                                    <th>{t('sales.soldBy')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.map((sale) => (
                                    <tr key={sale.id}>
                                        <td><span className="badge-info">{sale.invoiceNumber}</span></td>
                                        <td className="text-xs">{new Date(sale.createdAt).toLocaleDateString('en-IN')}</td>
                                        <td>{sale.customer?.name || '-'}</td>
                                        <td>{sale.items?.length || 0}</td>
                                        <td className="font-semibold text-emerald-400">{formatCurrency(sale.totalAmount)}</td>
                                        <td>{formatCurrency(sale.paidAmount)}</td>
                                        <td><span className="badge-neutral">{sale.paymentMethod}</span></td>
                                        <td className="text-xs">{sale.soldBy?.firstName} {sale.soldBy?.lastName}</td>
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

            {/* New Sale Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={t('sales.newSale')} size="xl">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="input-label">{t('sales.customer')} (Optional)</label>
                            <select className="select-field" value={saleForm.customerId} onChange={(e) => setSaleForm({ ...saleForm, customerId: e.target.value })}>
                                <option value="">Walk-in Customer</option>
                                {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="input-label">{t('sales.paymentMethod')}</label>
                            <select className="select-field" value={saleForm.paymentMethod} onChange={(e) => setSaleForm({ ...saleForm, paymentMethod: e.target.value })}>
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
                        <div className="space-y-3">
                            {saleItems.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 rounded-xl bg-surface-800/30">
                                    <div className="col-span-5">
                                        <label className="text-xs text-surface-500">{t('sales.selectProduct')}</label>
                                        <select className="select-field py-2" value={item.productId} onChange={(e) => updateItem(idx, 'productId', e.target.value)} required>
                                            <option value="">--</option>
                                            {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs text-surface-500">{t('common.quantity')}</label>
                                        <input type="number" min="1" className="input-field py-2" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs text-surface-500">{t('common.price')}</label>
                                        <input type="number" step="0.01" className="input-field py-2" value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs text-surface-500">{t('sales.discount')}</label>
                                        <input type="number" className="input-field py-2" value={item.discount} onChange={(e) => updateItem(idx, 'discount', e.target.value)} />
                                    </div>
                                    <div className="col-span-1">
                                        <button type="button" onClick={() => removeItem(idx)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg">
                                            <HiOutlineTrash className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="flex flex-col items-end p-4 rounded-xl bg-surface-800/30 space-y-2">
                        <div className="flex gap-4">
                            <span className="text-surface-400">{t('sales.discount')}:</span>
                            <input type="number" className="input-field py-1 w-32 text-right" value={saleForm.discount}
                                onChange={(e) => setSaleForm({ ...saleForm, discount: e.target.value })} />
                        </div>
                        <div className="flex gap-4">
                            <span className="text-surface-400">{t('sales.totalAmount')}:</span>
                            <span className="text-xl font-bold text-emerald-400">{formatCurrency(calcTotal())}</span>
                        </div>
                        <div className="flex gap-4">
                            <span className="text-surface-400">{t('sales.paidAmount')}:</span>
                            <input type="number" step="0.01" className="input-field py-1 w-32 text-right" value={saleForm.paidAmount}
                                onChange={(e) => setSaleForm({ ...saleForm, paidAmount: e.target.value })}
                                placeholder={String(calcTotal())} />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-surface-700/50">
                        <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">{t('common.cancel')}</button>
                        <button type="submit" disabled={saving} className="btn-primary">
                            {saving ? t('common.loading') : t('sales.completeSale')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
