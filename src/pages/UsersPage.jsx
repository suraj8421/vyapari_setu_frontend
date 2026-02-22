import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { userAPI, storeAPI } from '../services/api';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { HiOutlinePlus, HiOutlinePencilSquare, HiOutlineTrash } from 'react-icons/hi2';

export default function UsersPage() {
    const { t } = useTranslation();
    const [users, setUsers] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [stores, setStores] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [saving, setSaving] = useState(false);
    const emptyForm = { firstName: '', lastName: '', email: '', password: '', role: 'STORE_USER', storeId: '' };
    const [form, setForm] = useState(emptyForm);

    useEffect(() => { fetchData(); fetchStores(); }, [page]);

    const fetchData = async () => {
        setLoading(true);
        try { const { data } = await userAPI.getAll({ page, limit: 15 }); setUsers(data.data || []); setPagination(data.pagination); }
        catch (err) { console.error(err); } finally { setLoading(false); }
    };
    const fetchStores = async () => { try { const { data } = await storeAPI.getAll({ limit: 100 }); setStores(data.data || []); } catch (_) { } };

    const handleSubmit = async (e) => {
        e.preventDefault(); setSaving(true);
        try {
            const payload = { ...form };
            if (editItem && !payload.password) delete payload.password;
            if (editItem) await userAPI.update(editItem.id, payload); else await userAPI.create(payload);
            setModalOpen(false); fetchData();
        } catch (err) { alert(err.response?.data?.message || 'Error'); } finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete?')) return;
        try { await userAPI.delete(id); fetchData(); } catch (err) { alert(err.response?.data?.message || 'Error'); }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-surface-100">{t('users.title')}</h1>
                <button onClick={() => { setEditItem(null); setForm(emptyForm); setModalOpen(true); }} className="btn-primary"><HiOutlinePlus className="w-5 h-5" /> {t('users.addUser')}</button>
            </div>
            <div className="glass-card overflow-hidden">
                {loading ? <LoadingSpinner /> : users.length === 0 ? <div className="text-center py-16 text-surface-500">{t('common.noData')}</div> : (
                    <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>{t('common.name')}</th><th>{t('common.email')}</th><th>{t('users.role')}</th><th>{t('nav.stores')}</th><th>{t('common.status')}</th><th>{t('common.actions')}</th></tr></thead>
                        <tbody>{users.map(u => (
                            <tr key={u.id}>
                                <td className="font-medium text-surface-100">{u.firstName} {u.lastName}</td>
                                <td className="text-xs">{u.email}</td>
                                <td><span className={`badge ${u.role === 'ADMIN' ? 'badge-info' : 'badge-neutral'}`}>{u.role === 'ADMIN' ? t('users.admin') : t('users.storeUser')}</span></td>
                                <td className="text-xs">{u.store?.name || '-'}</td>
                                <td><span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>{u.isActive ? t('common.active') : t('common.inactive')}</span></td>
                                <td><div className="flex gap-2">
                                    <button onClick={() => { setEditItem(u); setForm({ firstName: u.firstName, lastName: u.lastName, email: u.email, password: '', role: u.role, storeId: u.storeId || '' }); setModalOpen(true); }} className="btn-ghost btn-sm text-primary-400"><HiOutlinePencilSquare className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(u.id)} className="btn-ghost btn-sm text-red-400"><HiOutlineTrash className="w-4 h-4" /></button>
                                </div></td>
                            </tr>))}</tbody></table></div>
                )}
                <div className="px-4 pb-4"><Pagination pagination={pagination} onPageChange={setPage} /></div>
            </div>
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? t('users.editUser') : t('users.addUser')}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="input-label">{t('auth.firstName')} *</label><input className="input-field" value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} required /></div>
                        <div><label className="input-label">{t('auth.lastName')} *</label><input className="input-field" value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} required /></div>
                    </div>
                    <div><label className="input-label">{t('common.email')} *</label><input type="email" className="input-field" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
                    <div><label className="input-label">{t('auth.password')} {editItem ? '(leave blank to keep)' : '*'}</label><input type="password" className="input-field" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} {...(!editItem ? { required: true } : {})} /></div>
                    <div><label className="input-label">{t('users.role')}</label><select className="select-field" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="ADMIN">{t('users.admin')}</option><option value="STORE_USER">{t('users.storeUser')}</option></select></div>
                    <div><label className="input-label">{t('users.assignStore')}</label><select className="select-field" value={form.storeId} onChange={e => setForm({ ...form, storeId: e.target.value })}><option value="">None</option>{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-surface-700/50">
                        <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">{t('common.cancel')}</button>
                        <button type="submit" disabled={saving} className="btn-primary">{saving ? '...' : t('common.save')}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
