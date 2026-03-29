import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { storeAPI } from '../services/api';
import { getOrFetch } from '../utils/dataCache';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { HiOutlinePlus, HiOutlinePencilSquare, HiOutlineTrash } from 'react-icons/hi2';

export default function StoresPage() {
    const { t } = useTranslation();
    const [stores, setStores] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [saving, setSaving] = useState(false);
    const emptyForm = { name: '', address: '', city: '', state: '', pincode: '', phone: '', gstNumber: '' };
    const [form, setForm] = useState(emptyForm);

    useEffect(() => { fetchData(); }, [page]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = { page, limit: 15 };
            // PERF: Deduplicate list fetch
            const key = `stores_list_${JSON.stringify(params)}`;
            const data = await getOrFetch(key, () => storeAPI.getAll(params).then(r => r.data), 10000);

            setStores(data.data || []);
            setPagination(data.pagination);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); setSaving(true);
        try {
            if (editItem) await storeAPI.update(editItem.id, form); else await storeAPI.create(form);
            setModalOpen(false); fetchData();
        } catch (err) { alert(err.response?.data?.message || 'Error'); } finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete?')) return;
        try { await storeAPI.delete(id); fetchData(); } catch (err) { alert(err.response?.data?.message || 'Error'); }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-surface-900">{t('stores.title')}</h1>
                <button onClick={() => { setEditItem(null); setForm(emptyForm); setModalOpen(true); }} className="btn-primary"><HiOutlinePlus className="w-5 h-5" /> {t('stores.addStore')}</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? <div className="col-span-full"><LoadingSpinner /></div> : stores.length === 0 ? <div className="col-span-full text-center py-16 text-surface-500">{t('common.noData')}</div> :
                    stores.map(s => (
                        <div key={s.id} className="glass-card-hover p-5">
                            <h3 className="font-semibold text-surface-900 text-lg mb-2">{s.name}</h3>
                            <div className="space-y-1 text-sm text-surface-400 mb-4">
                                <p>{s.address}, {s.city}</p>
                                <p>{s.state} - {s.pincode}</p>
                                {s.phone && <p>📞 {s.phone}</p>}
                                {s.gstNumber && <p>GST: {s.gstNumber}</p>}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setEditItem(s); setForm({ name: s.name, address: s.address || '', city: s.city || '', state: s.state || '', pincode: s.pincode || '', phone: s.phone || '', gstNumber: s.gstNumber || '' }); setModalOpen(true); }} className="btn-secondary btn-sm flex-1"><HiOutlinePencilSquare className="w-4 h-4" /> {t('common.edit')}</button>
                                <button onClick={() => handleDelete(s.id)} className="btn-ghost btn-sm text-red-400"><HiOutlineTrash className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))
                }
            </div>
            <Pagination pagination={pagination} onPageChange={setPage} />
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? t('stores.editStore') : t('stores.addStore')}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className="input-label">{t('stores.storeName')} *</label><input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                    <div><label className="input-label">{t('common.address')}</label><input className="input-field" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="input-label">{t('stores.city')}</label><input className="input-field" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
                        <div><label className="input-label">{t('stores.state')}</label><input className="input-field" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="input-label">{t('stores.pincode')}</label><input className="input-field" value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} /></div>
                        <div><label className="input-label">{t('common.phone')}</label><input className="input-field" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                    </div>
                    <div><label className="input-label">{t('stores.gstNumber')}</label><input className="input-field" value={form.gstNumber} onChange={e => setForm({ ...form, gstNumber: e.target.value })} /></div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-surface-700/50">
                        <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">{t('common.cancel')}</button>
                        <button type="submit" disabled={saving} className="btn-primary">{saving ? '...' : t('common.save')}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
