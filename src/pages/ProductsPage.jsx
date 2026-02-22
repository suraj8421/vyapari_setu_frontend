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
    HiOutlineMagnifyingGlass, HiOutlineFunnel,
} from 'react-icons/hi2';

import Translate from '../components/common/Translate';

export default function ProductsPage() {
    const { t } = useTranslation();

    const { isAdmin, user } = useAuth();
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
        name: '', sku: '', barcode: '', category: '', unit: 'pcs',
        costPrice: '', sellingPrice: '', gstRate: 0, hsnCode: '',
        storeId: user?.storeId || '', initialStock: 0, minStockLevel: 10,
    };
    const [form, setForm] = useState(emptyForm);

    useEffect(() => {
        fetchProducts();
        fetchCategories();
        if (isAdmin) fetchStores();
    }, [page, search, category]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const params = { page, limit: 15, search, category };
            const { data } = await productAPI.getAll(params);
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
            const { data } = await productAPI.getCategories();
            setCategories(data.data || []);
        } catch (_) { }
    };

    const fetchStores = async () => {
        try {
            const { data } = await storeAPI.getAll({ limit: 100 });
            setStores(data.data || []);
        } catch (_) { }
    };

    const openCreate = () => {
        setEditProduct(null);
        setForm({ ...emptyForm, storeId: user?.storeId || stores[0]?.id || '' });
        setModalOpen(true);
    };

    const openEdit = (product) => {
        setEditProduct(product);
        setForm({
            name: product.name, sku: product.sku, barcode: product.barcode || '',
            category: product.category || '', unit: product.unit, costPrice: Number(product.costPrice),
            sellingPrice: Number(product.sellingPrice), gstRate: Number(product.gstRate),
            hsnCode: product.hsnCode || '', storeId: product.storeId,
            initialStock: 0, minStockLevel: product.inventory?.[0]?.minStockLevel || 10,
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                ...form,
                costPrice: Number(form.costPrice),
                sellingPrice: Number(form.sellingPrice),
                gstRate: Number(form.gstRate),
                initialStock: Number(form.initialStock),
                minStockLevel: Number(form.minStockLevel),
            };

            if (editProduct) {
                await productAPI.update(editProduct.id, payload);
            } else {
                await productAPI.create(payload);
            }
            setModalOpen(false);
            fetchProducts();
        } catch (err) {
            alert(err.response?.data?.message || 'Error saving product');
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
        const totalStock = product.inventory?.reduce((s, i) => s + i.quantity, 0) || 0;
        const minLevel = product.inventory?.[0]?.minStockLevel || 10;
        if (totalStock === 0) return <span className="badge-danger">{t('products.outOfStock')}</span>;
        if (totalStock <= minLevel) return <span className="badge-warning">{t('products.lowStock')} ({totalStock})</span>;
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
                <button onClick={openCreate} className="btn-primary" id="add-product-btn">
                    <HiOutlinePlus className="w-5 h-5" />
                    {t('products.addProduct')}
                </button>
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
                            <label className="input-label">{t('products.sku')} *</label>
                            <input className="input-field" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
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
                            <label className="input-label">{t('products.costPrice')} *</label>
                            <input type="number" step="0.01" className="input-field" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} required />
                        </div>
                        <div>
                            <label className="input-label">{t('products.sellingPrice')} *</label>
                            <input type="number" step="0.01" className="input-field" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} required />
                        </div>
                        <div>
                            <label className="input-label">{t('products.gstRate')}</label>
                            <input type="number" step="0.01" className="input-field" value={form.gstRate} onChange={(e) => setForm({ ...form, gstRate: e.target.value })} />
                        </div>
                        <div>
                            <label className="input-label">{t('products.hsnCode')}</label>
                            <input className="input-field" value={form.hsnCode} onChange={(e) => setForm({ ...form, hsnCode: e.target.value })} />
                        </div>
                        <div>
                            <label className="input-label">{t('products.unit')}</label>
                            <select className="select-field" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                                <option value="pcs">Pieces</option>
                                <option value="kg">Kilograms</option>
                                <option value="ltr">Litres</option>
                                <option value="box">Box</option>
                                <option value="pack">Pack</option>
                            </select>
                        </div>
                        {isAdmin && stores.length > 0 && (
                            <div>
                                <label className="input-label">{t('nav.stores')} *</label>
                                <select className="select-field" value={form.storeId} onChange={(e) => setForm({ ...form, storeId: e.target.value })} required>
                                    <option value="">Select Store</option>
                                    {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        )}
                        {!editProduct && (
                            <>
                                <div>
                                    <label className="input-label">{t('products.stock')} (Initial)</label>
                                    <input type="number" className="input-field" value={form.initialStock} onChange={(e) => setForm({ ...form, initialStock: e.target.value })} />
                                </div>
                                <div>
                                    <label className="input-label">{t('products.minStock')}</label>
                                    <input type="number" className="input-field" value={form.minStockLevel} onChange={(e) => setForm({ ...form, minStockLevel: e.target.value })} />
                                </div>
                            </>
                        )}
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-surface-700/50">
                        <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">{t('common.cancel')}</button>
                        <button type="submit" disabled={saving} className="btn-primary">
                            {saving ? t('common.loading') : t('common.save')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div >
    );
}
