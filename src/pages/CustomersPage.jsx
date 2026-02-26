// ============================================
// Customers / Khata Page
// ============================================

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { customerAPI, storeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { resolveDateRange } from '../utils/dateUtils';
import {
    HiOutlinePlus, HiOutlinePencilSquare, HiOutlineMagnifyingGlass,
    HiOutlineBanknotes, HiOutlineDocumentText, HiOutlineArrowUp, HiOutlineArrowDown,
} from 'react-icons/hi2';

export default function CustomersPage() {
    const { t } = useTranslation();
    const { isAdmin, user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [customers, setCustomers] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
    const [stores, setStores] = useState([]);
    const [khataRange, setKhataRange] = useState(searchParams.get('range') || '30d');

    // Modals
    const [custModalOpen, setCustModalOpen] = useState(false);
    const [payModalOpen, setPayModalOpen] = useState(false);
    const [khataOpen, setKhataOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [ledgerEntries, setLedgerEntries] = useState([]);
    const [ledgerPag, setLedgerPag] = useState(null);
    const [saving, setSaving] = useState(false);

    const emptyForm = { name: '', phone: '', email: '', address: '', creditLimit: 0, storeId: user?.storeId || '' };
    const [form, setForm] = useState(emptyForm);
    const [payForm, setPayForm] = useState({ customerId: '', amount: '', paymentMethod: 'CASH', description: '', reference: '' });

    useEffect(() => {
        // Update URL
        const params = {};
        if (page > 1) params.page = page;
        if (search) params.search = search;
        const ledgerId = searchParams.get('ledger');
        if (ledgerId) params.ledger = ledgerId;
        if (khataRange) params.range = khataRange;
        setSearchParams(params, { replace: true });

        fetchCustomers();
        if (isAdmin) fetchStores();
    }, [page, search]);

    // Handle deep link for ledger
    useEffect(() => {
        const ledgerId = searchParams.get('ledger');
        if (ledgerId && customers.length > 0) {
            const cust = customers.find(c => c.id === ledgerId);
            if (cust) {
                openKhata(cust);
            }
        }
    }, [searchParams, customers]);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const { data } = await customerAPI.getAll({ page, limit: 15, search });
            setCustomers(data.data || []);
            setPagination(data.pagination);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchStores = async () => {
        try { const { data } = await storeAPI.getAll({ limit: 100 }); setStores(data.data || []); } catch (_) { }
    };

    const openKhata = async (customer) => {
        setSelectedCustomer(customer);
        setKhataOpen(true);
        try {
            const { startDate, endDate } = resolveDateRange(khataRange);
            const { data } = await customerAPI.getLedger(customer.id, {
                limit: 50,
                startDate,
                endDate
            });
            setLedgerEntries(data.data || []);
            setLedgerPag(data.pagination);
        } catch (err) { console.error(err); }
    };

    // Re-fetch ledger when range changes
    useEffect(() => {
        if (khataOpen && selectedCustomer) {
            openKhata(selectedCustomer);
            // Sync range to URL
            const params = Object.fromEntries(searchParams);
            params.range = khataRange;
            setSearchParams(params, { replace: true });
        }
    }, [khataRange]);

    const openPayment = (customer) => {
        setPayForm({ customerId: customer.id, amount: '', paymentMethod: 'CASH', description: '', reference: '' });
        setSelectedCustomer(customer);
        setPayModalOpen(true);
    };

    const handleSubmitCustomer = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { ...form, creditLimit: Number(form.creditLimit) || 0 };
            if (selectedCustomer?.id) {
                await customerAPI.update(selectedCustomer.id, payload);
            } else {
                await customerAPI.create(payload);
            }
            setCustModalOpen(false);
            fetchCustomers();
        } catch (err) { alert(err.response?.data?.message || 'Error'); }
        finally { setSaving(false); }
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await customerAPI.recordPayment({
                ...payForm,
                type: 'DEBIT',
                amount: Number(payForm.amount),
            });
            setPayModalOpen(false);
            fetchCustomers();
            alert(t('customers.paymentRecorded'));
        } catch (err) { alert(err.response?.data?.message || 'Error'); }
        finally { setSaving(false); }
    };

    const formatCurrency = (val) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-surface-100">{t('customers.title')} / {t('nav.khata')}</h1>
                    <p className="text-surface-500 text-sm">{pagination?.total || 0} {t('common.results')}</p>
                </div>
                <button onClick={() => { setSelectedCustomer(null); setForm({ ...emptyForm }); setCustModalOpen(true); }} className="btn-primary" id="add-customer-btn">
                    <HiOutlinePlus className="w-5 h-5" />
                    {t('customers.addCustomer')}
                </button>
            </div>

            {/* Search */}
            <div className="glass-card p-4">
                <div className="relative max-w-md">
                    <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                    <input type="text" className="input-field pl-10 py-2.5" placeholder={t('common.search')}
                        value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                </div>
            </div>

            {/* Customer Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? <div className="col-span-full"><LoadingSpinner /></div> :
                    customers.length === 0 ? <div className="col-span-full text-center py-16 text-surface-500">{t('common.noData')}</div> :
                        customers.map((cust) => (
                            <div key={cust.id} className="glass-card-hover p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="font-semibold text-surface-100">{cust.name}</h3>
                                        <p className="text-xs text-surface-500">{cust.phone || '-'}</p>
                                    </div>
                                    <span className={`text-lg font-bold ${Number(cust.balance) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {formatCurrency(cust.balance)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-surface-500 mb-4">
                                    <span>{t('customers.creditLimit')}: {formatCurrency(cust.creditLimit)}</span>
                                    <span>•</span>
                                    <span>{cust._count?.sales || 0} {t('nav.sales')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => openKhata(cust)} className="btn-secondary btn-sm flex-1">
                                        <HiOutlineDocumentText className="w-4 h-4" />
                                        {t('customers.viewKhata')}
                                    </button>
                                    <button onClick={() => openPayment(cust)} className="btn-primary btn-sm flex-1">
                                        <HiOutlineBanknotes className="w-4 h-4" />
                                        {t('customers.recordPayment')}
                                    </button>
                                    <button onClick={() => {
                                        setSelectedCustomer(cust); setForm({
                                            name: cust.name, phone: cust.phone || '', email: cust.email || '',
                                            address: cust.address || '', creditLimit: Number(cust.creditLimit), storeId: cust.storeId,
                                        }); setCustModalOpen(true);
                                    }} className="btn-ghost btn-sm">
                                        <HiOutlinePencilSquare className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                }
            </div>
            <Pagination pagination={pagination} onPageChange={setPage} />

            {/* Customer Form Modal */}
            <Modal isOpen={custModalOpen} onClose={() => setCustModalOpen(false)}
                title={selectedCustomer ? t('customers.editCustomer') : t('customers.addCustomer')}>
                <form onSubmit={handleSubmitCustomer} className="space-y-4">
                    <div>
                        <label className="input-label">{t('customers.customerName')} *</label>
                        <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="input-label">{t('common.phone')}</label>
                            <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                        </div>
                        <div>
                            <label className="input-label">{t('common.email')}</label>
                            <input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="input-label">{t('common.address')}</label>
                        <input className="input-field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    </div>
                    <div>
                        <label className="input-label">{t('customers.creditLimit')}</label>
                        <input type="number" className="input-field" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} />
                    </div>
                    {isAdmin && stores.length > 0 && (
                        <div>
                            <label className="input-label">{t('nav.stores')}</label>
                            <select className="select-field" value={form.storeId} onChange={(e) => setForm({ ...form, storeId: e.target.value })} required>
                                <option value="">Select</option>
                                {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="flex justify-end gap-3 pt-4 border-t border-surface-700/50">
                        <button type="button" onClick={() => setCustModalOpen(false)} className="btn-secondary">{t('common.cancel')}</button>
                        <button type="submit" disabled={saving} className="btn-primary">{saving ? t('common.loading') : t('common.save')}</button>
                    </div>
                </form>
            </Modal>

            {/* Payment Modal */}
            <Modal isOpen={payModalOpen} onClose={() => setPayModalOpen(false)} title={`${t('customers.recordPayment')} - ${selectedCustomer?.name}`}>
                <form onSubmit={handlePayment} className="space-y-4">
                    <div className="p-4 rounded-xl bg-surface-800/30 text-center">
                        <p className="text-sm text-surface-400">{t('customers.outstandingAmount')}</p>
                        <p className="text-2xl font-bold text-red-400">{formatCurrency(selectedCustomer?.balance)}</p>
                    </div>
                    <div>
                        <label className="input-label">{t('common.amount')} *</label>
                        <input type="number" step="0.01" className="input-field" value={payForm.amount}
                            onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} required />
                    </div>
                    <div>
                        <label className="input-label">{t('sales.paymentMethod')}</label>
                        <select className="select-field" value={payForm.paymentMethod}
                            onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}>
                            <option value="CASH">{t('sales.cash')}</option>
                            <option value="UPI">{t('sales.upi')}</option>
                            <option value="CARD">{t('sales.card')}</option>
                            <option value="BANK_TRANSFER">{t('sales.bankTransfer')}</option>
                        </select>
                    </div>
                    <div>
                        <label className="input-label">{t('customers.reference')}</label>
                        <input className="input-field" value={payForm.reference}
                            onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} placeholder="UPI Ref / Cheque #" />
                    </div>
                    <div>
                        <label className="input-label">{t('common.description')}</label>
                        <input className="input-field" value={payForm.description}
                            onChange={(e) => setPayForm({ ...payForm, description: e.target.value })} />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-surface-700/50">
                        <button type="button" onClick={() => setPayModalOpen(false)} className="btn-secondary">{t('common.cancel')}</button>
                        <button type="submit" disabled={saving} className="btn-primary">{saving ? t('common.loading') : t('customers.recordPayment')}</button>
                    </div>
                </form>
            </Modal>

            {/* Khata (Ledger) Modal */}
            <Modal
                isOpen={khataOpen}
                onClose={() => {
                    setKhataOpen(false);
                    // Clear ledger from URL
                    const params = Object.fromEntries(searchParams);
                    delete params.ledger;
                    delete params.range;
                    setSearchParams(params, { replace: true });
                }}
                title={`${t('customers.khataTitle')} - ${selectedCustomer?.name}`}
                size="lg"
            >
                <div className="flex items-center justify-between mb-4 gap-4">
                    <div className="flex-1 p-4 rounded-xl bg-surface-800/30 flex items-center justify-between">
                        <span className="text-surface-400">{t('customers.balance')}</span>
                        <span className={`text-xl font-bold ${Number(selectedCustomer?.balance) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {formatCurrency(selectedCustomer?.balance)}
                        </span>
                    </div>
                    <select
                        className="select-field w-40 py-4"
                        value={khataRange}
                        onChange={(e) => setKhataRange(e.target.value)}
                    >
                        <option value="today">Today</option>
                        <option value="yesterday">Yesterday</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="month">This Month</option>
                    </select>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {ledgerEntries.length === 0 ? (
                        <p className="text-center text-surface-500 py-8">{t('common.noData')}</p>
                    ) : (
                        ledgerEntries.map((entry) => (
                            <div key={entry.id} className={`flex items-center justify-between p-3 rounded-xl border
                ${entry.type === 'CREDIT' ? 'bg-red-500/5 border-red-500/10' : 'bg-emerald-500/5 border-emerald-500/10'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${entry.type === 'CREDIT' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                        {entry.type === 'CREDIT' ? <HiOutlineArrowUp className="w-4 h-4" /> : <HiOutlineArrowDown className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-surface-200">
                                            {entry.type === 'CREDIT' ? t('customers.creditEntry') : t('customers.debitEntry')}
                                        </p>
                                        <p className="text-xs text-surface-500">{entry.description || '-'}</p>
                                        <p className="text-xs text-surface-600">{new Date(entry.createdAt).toLocaleString('en-IN')}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-semibold ${entry.type === 'CREDIT' ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {entry.type === 'CREDIT' ? '+' : '-'}{formatCurrency(entry.amount)}
                                    </p>
                                    <p className="text-xs text-surface-500">{t('customers.balanceAfter')}: {formatCurrency(entry.balanceAfter)}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Modal>
        </div>
    );
}
