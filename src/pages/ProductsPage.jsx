// ============================================
// Products Page
// ============================================

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { productAPI, storeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
    HiOutlinePlus, HiOutlinePencilSquare, HiOutlineTrash,
    HiOutlineMagnifyingGlass,
} from 'react-icons/hi2';
import { getOrFetch } from '../utils/dataCache';

import Translate from '../components/common/Translate';

export default function ProductsPage() {
    const { t } = useTranslation();

    const { isAdmin, isSuperAdmin, user } = useAuth();
    const [products, setProducts] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [categories, setCategories] = useState([]);
    const [stores, setStores] = useState([]);
    const [page, setPage] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [editProduct, setEditProduct] = useState(null);
    const [saving, setSaving] = useState(false);

    const emptyForm = {
        name: '', sku: '', barcode: '', category: '', unit: 'PCS',
        costPrice: '', sellingPrice: '', gstRate: 0, hsnCode: '',
        unitsPerBox: 1, allowLooseSale: true,
        storeId: user?.storeId || '', initialStock: 0, minStockLevel: 10,
    };
    const [form, setForm] = useState(emptyForm);

    // ─── Products Fetch (Paged/Filtered) ───────────────────
    useEffect(() => {
        fetchProducts();
    }, [page, search, category]);

    // ─── Static/Reference Data (Cached) ─────────────────────
    useEffect(() => {
        fetchCategories();
        if (isSuperAdmin) fetchStores();
    }, [isSuperAdmin]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const params = { page, limit: 15, search, category };
            const key = `products_list_${JSON.stringify(params)}`;
            const data = await getOrFetch(key, () => productAPI.getAll(params).then(r => r.data), 10000);
            setProducts(data.data || []);
            setPagination(data.pagination);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const data = await getOrFetch('categories', () => productAPI.getCategories().then(r => r.data.data || []));
            setCategories(data || []);
        } catch (_) { }
    };

    const fetchStores = async () => {
        try {
            const data = await getOrFetch('stores', () => storeAPI.getAll({ limit: 100 }).then(r => r.data.data || []));
            setStores(data || []);
        } catch (_) { }
    };

    const openCreate = () => {
        setEditProduct(null);
        setForm({ ...emptyForm, storeId: user?.storeId || (isSuperAdmin ? stores[0]?.id : '') || '' });
        setModalOpen(true);
    };

    const openEdit = (product) => {
        setEditProduct(product);
        const currentStock = product.inventory?.reduce((s, i) => s + i.quantity, 0) || 0;
        setForm({
            name: product.name, sku: product.sku, barcode: product.barcode || '',
            category: product.category || '', unit: product.unit, costPrice: Number(product.costPrice),
            sellingPrice: Number(product.sellingPrice), gstRate: Number(product.gstRate),
            hsnCode: product.hsnCode || '', storeId: product.storeId,
            unitsPerBox: product.unitsPerBox || 1, allowLooseSale: product.allowLooseSale ?? true,
            initialStock: currentStock, minStockLevel: product.inventory?.[0]?.minStockLevel || 10,
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...form,
                sku: (form.sku || '').trim() === '' ? null : form.sku,
                costPrice: form.costPrice === '' || form.costPrice === null || form.costPrice === undefined ? null : Number(form.costPrice),
                sellingPrice: form.sellingPrice === '' || form.sellingPrice === null || form.sellingPrice === undefined ? null : Number(form.sellingPrice),
                gstRate: form.gstRate === '' || form.gstRate === null || form.gstRate === undefined ? 0 : Number(form.gstRate),
                unitsPerBox: form.unitsPerBox === '' || form.unitsPerBox === null || form.unitsPerBox === undefined || Number(form.unitsPerBox) <= 0 ? null : Number(form.unitsPerBox),
                initialStock: form.initialStock === '' || form.initialStock === null || form.initialStock === undefined ? 0 : Number(form.initialStock),
                minStockLevel: form.minStockLevel === '' || form.minStockLevel === null || form.minStockLevel === undefined ? 10 : Number(form.minStockLevel),
            };

            if (editProduct) {
                await productAPI.update(editProduct.id, payload);
            } else {
                await productAPI.create(payload);
            }
            setModalOpen(false);
            fetchProducts();
        } catch (err) {
            const validationErrors = err.response?.data?.errors;
            if (validationErrors && validationErrors.length > 0) {
                const msg = validationErrors.map(e => `${e.field}: ${e.message}`).join('\n');
                alert(`Validation failed:\n${msg}`);
            } else {
                alert(err.response?.data?.message || 'Error saving product');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure?')) return;
        try {
            await productAPI.delete(id);
            fetchProducts();
        } catch (err) {
            alert(err.response?.data?.message || 'Error');
        }
    };

    const formatCurrency = (val) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

    const getStockBadge = (product) => {
        const inventory = product.inventory?.[0];
        const totalStock = product.inventory?.reduce((s, i) => s + i.quantity, 0) || 0;
        const minLevel = inventory?.minStockLevel || 10;
        const maxLevel = inventory?.maxStockLevel;

        let suggestion = 0;
        if (totalStock <= minLevel) {
            if (maxLevel && maxLevel > totalStock) {
                suggestion = maxLevel - totalStock;
            } else {
                suggestion = Math.max(minLevel * 2 - totalStock, 10);
            }
        }

        if (totalStock === 0) return (
            <div className="flex flex-col gap-1">
                <span className="badge-danger">{t('products.outOfStock')}</span>
                <span className="text-[10px] font-bold text-primary-600">
                    💡 {t('products.reorderSuggestion', { count: suggestion })}
                </span>
            </div>
        );
        if (totalStock <= minLevel) return (
            <div className="flex flex-col gap-1">
                <span className="badge-warning">{t('products.lowStock')} ({totalStock})</span>
                <span className="text-[10px] font-bold text-primary-600">
                    💡 {t('products.reorderSuggestion', { count: suggestion })}
                </span>
            </div>
        );
        return <span className="badge-success">{t('products.inStock')} ({totalStock})</span>;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-surface-900">{t('products.title')}</h1>
                    <p className="text-surface-500 text-sm">{pagination?.total || 0} {t('common.results')}</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={openCreate} className="btn-primary" id="add-product-btn">
                        <HiOutlinePlus className="w-5 h-5" />
                        {t('products.addProduct')}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-card p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                        <input
                            type="text"
                            className="input-field pl-10 py-2.5"
                            placeholder={t('common.search')}
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            id="product-search"
                        />
                    </div>
                    <select
                        className="select-field w-full sm:w-48 py-2.5"
                        value={category}
                        onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                        id="product-category-filter"
                    >
                        <option value="">{t('common.all')} {t('products.categories')}</option>
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                {loading ? (
                    <LoadingSpinner />
                ) : products.length === 0 ? (
                    <div className="text-center py-16 text-surface-500">{t('common.noData')}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>{t('products.productName')}</th>
                                    <th>{t('products.sku')}</th>
                                    <th>{t('common.category')}</th>
                                    <th>{t('products.costPrice')}</th>
                                    <th>{t('products.sellingPrice')}</th>
                                    <th>{t('products.gstRate')}</th>
                                    <th>{t('products.stock')}</th>
                                    <th>{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product) => (
                                    <tr key={product.id}>
                                        <td>
                                            <div>
                                                <p className="font-medium text-surface-900"><Translate text={product.name} /></p>
                                                {product.barcode && <p className="text-xs text-surface-500">BC: {product.barcode}</p>}
                                            </div>
                                        </td>
                                        <td><span className="badge-info">{product.sku}</span></td>
                                        <td><Translate text={product.category} /></td>
                                        <td>{formatCurrency(product.costPrice)}</td>
                                        <td className="font-medium text-emerald-600">{formatCurrency(product.sellingPrice)}</td>
                                        <td>{Number(product.gstRate)}%</td>
                                        <td>{getStockBadge(product)}</td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => openEdit(product)} className="btn-ghost btn-sm text-primary-600">
                                                    <HiOutlinePencilSquare className="w-4 h-4" />
                                                </button>
                                                {isAdmin && (
                                                    <button onClick={() => handleDelete(product.id)} className="btn-ghost btn-sm text-red-600">
                                                        <HiOutlineTrash className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
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

            {/* Create/Edit Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editProduct ? t('products.editProduct') : t('products.addProduct')}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="input-label">{t('products.productName')} *</label>
                            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                        </div>
                        <div>
                            <label className="input-label">{t('products.sku')}</label>
                            <input className="input-field" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                        </div>
                        <div>
                            <label className="input-label">{t('products.barcode')}</label>
                            <input className="input-field" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
                        </div>
                        <div>
                            <label className="input-label">{t('common.category')}</label>
                            <input className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                        </div>
                        <div>
                            <label className="input-label">{t('products.costPrice')}</label>
                            <input type="number" step="0.01" className="input-field" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
                        </div>
                        <div>
                            <label className="input-label">{t('products.sellingPrice')}</label>
                            <input type="number" step="0.01" className="input-field" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
                        </div>
                        <div>
                            <label className="input-label">{t('products.gstRate')}</label>
                            <select className="select-field" value={form.gstRate} onChange={(e) => setForm({ ...form, gstRate: e.target.value })}>
                                <option value="0">0%</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="28">28%</option>
                            </select>
                        </div>
                        <div>
                            <label className="input-label">{t('products.hsnCode')}</label>
                            <input className="input-field" value={form.hsnCode} onChange={(e) => setForm({ ...form, hsnCode: e.target.value })} />
                        </div>
                        <div>
                            <label className="input-label">{t('products.unit')}</label>
                            <select className="select-field" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                                <option value="PCS">{t('inventory.units.pcs')}</option>
                                <option value="KG">{t('inventory.units.kg')}</option>
                                <option value="LTR">{t('inventory.units.ltr')}</option>
                                <option value="BOX">{t('inventory.units.box')}</option>
                                <option value="PACK">{t('inventory.units.pack')}</option>
                            </select>
                        </div>
                        <div>
                            <label className="input-label">
                                {t(`products.unitsPerBoxLabel.${form.unit}`, t('products.unitsPerBoxLabel.default'))}
                            </label>
                            <input type="number" className="input-field" value={form.unitsPerBox} onChange={(e) => setForm({ ...form, unitsPerBox: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                            <input
                                type="checkbox"
                                id="allowLooseSale"
                                checked={form.allowLooseSale}
                                onChange={(e) => setForm({ ...form, allowLooseSale: e.target.checked })}
                                className="w-4 h-4 text-primary-600 border-surface-300 rounded"
                            />
                            <label htmlFor="allowLooseSale" className="text-sm font-medium text-surface-700 cursor-pointer">
                                Allow Loose Sale (PCS / Loose KG)
                            </label>
                        </div>
                        {isSuperAdmin && stores.length > 0 && (
                            <div>
                                <label className="input-label">{t('nav.stores')} *</label>
                                <select className="select-field" value={form.storeId} onChange={(e) => setForm({ ...form, storeId: e.target.value })} required>
                                    <option value="">Select Store</option>
                                    {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="input-label">
                                {editProduct ? t('products.stock') : `${t('products.stock')} (Initial)`}
                            </label>
                            <input type="number" className="input-field" value={form.initialStock} onChange={(e) => setForm({ ...form, initialStock: e.target.value })} />
                        </div>
                        <div>
                            <label className="input-label">{t('products.minStock')}</label>
                            <input type="number" className="input-field" value={form.minStockLevel} onChange={(e) => setForm({ ...form, minStockLevel: e.target.value })} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-surface-700/50">
                        <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">{t('common.cancel')}</button>
                        <button type="submit" disabled={saving} className="btn-primary">
                            {saving ? t('common.loading') : t('common.save')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
