import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supplierAPI, storeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { HiOutlinePlus, HiOutlinePencilSquare, HiOutlineTrash, HiOutlineMagnifyingGlass } from 'react-icons/hi2';

export default function SuppliersPage() {
    const { t } = useTranslation();
    const { isAdmin, user } = useAuth();
    const [suppliers, setSuppliers] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [saving, setSaving] = useState(false);
    const [stores, setStores] = useState([]);
    const emptyForm = { name: '', phone: '', email: '', gstNumber: '', address: '', storeId: user?.storeId || '' };
    const [form, setForm] = useState(emptyForm);

    useEffect(() => { fetchData(); if (isAdmin) fetchStores(); }, [page, search]);

    const fetchData = async () => {
        setLoading(true);
        try { const { data } = await supplierAPI.getAll({ page, limit: 15, search }); setSuppliers(data.data || []); setPagination(data.pagination); }
        catch (err) { console.error(err); } finally { setLoading(false); }
    };
    const fetchStores = async () => { try { const { data } = await storeAPI.getAll({ limit: 100 }); setStores(data.data || []); } catch (_) { } };

    const handleSubmit = async (e) => {
        e.preventDefault(); setSaving(true);
        try {
            if (editItem) await supplierAPI.update(editItem.id, form);
            else await supplierAPI.create(form);
            setModalOpen(false); fetchData();
        } catch (err) { alert(err.response?.data?.message || 'Error'); } finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete?')) return;
        try { await supplierAPI.delete(id); fetchData(); } catch (err) { alert(err.response?.data?.message || 'Error'); }
    };

    const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v || 0);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-surface-100">{t('suppliers.title')}</h1>
                {isAdmin && <button onClick={() => { setEditItem(null); setForm(emptyForm); setModalOpen(true); }} className="btn-primary"><HiOutlinePlus className="w-5 h-5" /> {t('suppliers.addSupplier')}</button>}
            </div>
            <div className="glass-card p-4"><div className="relative max-w-md"><HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" /><input type="text" className="input-field pl-10 py-2.5" placeholder={t('common.search')} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></div></div>
            <div className="glass-card overflow-hidden">
                {loading ? <LoadingSpinner /> : suppliers.length === 0 ? <div className="text-center py-16 text-surface-500">{t('common.noData')}</div> : (
                    <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>{t('suppliers.supplierName')}</th><th>{t('common.phone')}</th><th>{t('suppliers.gstNumber')}</th><th>{t('common.address')}</th>{isAdmin && <th>{t('common.actions')}</th>}</tr></thead>
                        <tbody>{suppliers.map(s => (
                            <tr key={s.id}><td className="font-medium text-surface-100">{s.name}</td><td>{s.phone || '-'}</td><td>{s.gstNumber || '-'}</td><td className="text-xs">{s.address || '-'}</td>
                                {isAdmin && <td><div className="flex gap-2"><button onClick={() => { setEditItem(s); setForm({ name: s.name, phone: s.phone || '', email: s.email || '', gstNumber: s.gstNumber || '', address: s.address || '', storeId: s.storeId }); setModalOpen(true); }} className="btn-ghost btn-sm text-primary-400"><HiOutlinePencilSquare className="w-4 h-4" /></button><button onClick={() => handleDelete(s.id)} className="btn-ghost btn-sm text-red-400"><HiOutlineTrash className="w-4 h-4" /></button></div></td>}
                            </tr>))}</tbody></table></div>
                )}
                <div className="px-4 pb-4"><Pagination pagination={pagination} onPageChange={setPage} /></div>
            </div>
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? t('suppliers.editSupplier') : t('suppliers.addSupplier')}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className="input-label">{t('suppliers.supplierName')} *</label><input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="input-label">{t('common.phone')}</label><input className="input-field" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                        <div><label className="input-label">{t('common.email')}</label><input className="input-field" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                    </div>
                    <div><label className="input-label">{t('suppliers.gstNumber')}</label><input className="input-field" value={form.gstNumber} onChange={e => setForm({ ...form, gstNumber: e.target.value })} /></div>
                    <div><label className="input-label">{t('common.address')}</label><input className="input-field" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                    {isAdmin && stores.length > 0 && <div><label className="input-label">{t('nav.stores')}</label><select className="select-field" value={form.storeId} onChange={e => setForm({ ...form, storeId: e.target.value })} required><option value="">Select</option>{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>}
                    <div className="flex justify-end gap-3 pt-4 border-t border-surface-700/50">
                        <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">{t('common.cancel')}</button>
                        <button type="submit" disabled={saving} className="btn-primary">{saving ? '...' : t('common.save')}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
