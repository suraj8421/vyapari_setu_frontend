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
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import {
    HiOutlinePlus, HiOutlinePencilSquare, HiOutlineMagnifyingGlass,
    HiOutlineBanknotes, HiOutlineDocumentText, HiOutlineArrowUp, HiOutlineArrowDown,
    HiOutlineDocumentArrowDown, HiOutlineSparkles,
    HiOutlineShieldCheck
} from 'react-icons/hi2';
import CreditScoreGauge from '../components/common/CreditScoreGauge';
import SmartScanModal from '../components/common/SmartScanModal';
import { toast } from 'react-hot-toast';
import { getOrFetch } from '../utils/dataCache';

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
    const [khataRange, setKhataRange] = useState(searchParams.get('range') || 'all');
    const [statusFilter, setStatusFilter] = useState(searchParams.get('filter') || '');

    // Modals
    const [custModalOpen, setCustModalOpen] = useState(false);
    const [payModalOpen, setPayModalOpen] = useState(false);
    const [khataOpen, setKhataOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [ledgerEntries, setLedgerEntries] = useState([]);
    const [ledgerPag, setLedgerPag] = useState(null);
    const [saving, setSaving] = useState(false);
    const [khataStartDate, setKhataStartDate] = useState('');
    const [khataEndDate, setKhataEndDate] = useState('');
    const [scoreModalOpen, setScoreModalOpen] = useState(false);
    const [scoreData, setScoreData] = useState(null);

    const emptyForm = { name: '', phone: '', email: '', address: '', creditLimit: 0, storeId: user?.storeId || '' };
    const [form, setForm] = useState(emptyForm);
    const [payForm, setPayForm] = useState({ customerId: '', amount: '', paymentMethod: 'CASH', description: '', reference: '' });

    // ─── Customer Data (Paged/Filtered) ───────────────────
    useEffect(() => {
        // Update URL
        const params = {};
        if (page > 1) params.page = page;
        if (search) params.search = search;
        if (statusFilter) params.filter = statusFilter;
        const ledgerId = searchParams.get('ledger');
        if (ledgerId) params.ledger = ledgerId;
        if (khataRange) params.range = khataRange;
        setSearchParams(params, { replace: true });

        fetchCustomers();
    }, [page, search, statusFilter]);

    // ─── Static/Reference Data (Cached) ─────────────────────
    useEffect(() => {
        if (isAdmin) fetchStores();
    }, [isAdmin]);

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
            const params = { page, limit: 15, search };
            // PERF: Deduplicate list fetch
            const key = `customers_list_${JSON.stringify(params)}`;
            const data = await getOrFetch(key, () => customerAPI.getAll(params).then(r => r.data), 10000);

            setCustomers(data.data || []);
            setPagination(data.pagination);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchStores = async () => {
        try {
            const data = await getOrFetch('stores', () => storeAPI.getAll({ limit: 100 }).then(r => r.data.data || []));
            setStores(data || []);
        } catch (_) { }
    };

    const openKhata = async (customer) => {
        setSelectedCustomer(customer);
        setKhataOpen(true);
        try {
            const rangeData = resolveDateRange(khataRange) || {};
            const { data } = await customerAPI.getLedger(customer.id, {
                limit: 50,
                ...(rangeData.startDate ? { startDate: rangeData.startDate } : {}),
                ...(rangeData.endDate ? { endDate: rangeData.endDate } : {})
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

    const handleDownloadKhataPDF = () => {
        if (!selectedCustomer) return;

        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.text('Customer Account Statement', 14, 22);

        doc.setFontSize(12);
        doc.text(`Customer: ${selectedCustomer.name}`, 14, 32);
        doc.text(`Phone: ${selectedCustomer.phone || 'N/A'}`, 14, 38);

        // Fetch period text
        const periodText = khataRange === 'today' ? 'Today' :
            khataRange === 'yesterday' ? 'Yesterday' :
                khataRange === '7d' ? 'Last 7 Days' :
                    khataRange === '30d' ? 'Last 30 Days' :
                        khataRange === 'month' ? 'This Month' :
                            khataRange === 'all' ? 'All Time' : 'Custom';

        doc.text(`Period: ${periodText}`, 140, 32);

        // Current balance
        const balanceNum = Number(selectedCustomer.balance) || 0;
        doc.text(`Current Balance: ${formatCurrency(balanceNum)}`, 140, 38);

        const tableColumn = ["Date", "Description", "Type", "Amount", "Balance After"];
        const tableRows = [];

        [...ledgerEntries].reverse().forEach(entry => {
            const dateStr = new Date(entry.createdAt).toLocaleDateString('en-IN') + ' ' +
                new Date(entry.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            const typeStr = entry.type === 'CREDIT' ? 'Credit (Borrowed)' : 'Debit (Paid)';
            const amountStr = formatCurrency(entry.amount);
            const balanceStr = formatCurrency(entry.balanceAfter);

            tableRows.push([
                dateStr,
                entry.description || '-',
                typeStr,
                amountStr,
                balanceStr
            ]);
        });

        doc.autoTable({
            startY: 45,
            head: [tableColumn],
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] }, // Blue-500
            styles: { fontSize: 10 },
            columnStyles: {
                3: { halign: 'right' },
                4: { halign: 'right' }
            }
        });

        // Footer
        const finalY = doc.lastAutoTable.finalY || 45;
        doc.setFontSize(10);
        doc.text(`Generated on ${new Date().toLocaleString('en-IN')}`, 14, finalY + 10);

        // Download
        doc.save(`${selectedCustomer.name.replace(/\s+/g, '_')}_Statement.pdf`);
    };

    const formatCurrency = (val) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val || 0);

    const handleExportCSV = () => {
        if (!customers || customers.length === 0) return;

        let csv = 'Name,Phone,Email,Balance,Credit Limit,Total Sales\n';

        customers.forEach(c => {
            const name = (c.name || '').replace(/"/g, '""');
            const phone = c.phone || '';
            const email = c.email || '';
            const balance = c.balance || 0;
            const creditLimit = c.creditLimit || 0;
            const salesCount = c._count?.sales || 0;

            csv += `"${name}","${phone}","${email}",${balance},${creditLimit},${salesCount}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `VyapariSetu_Customers_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-surface-900">{t('customers.title')} / {t('nav.khata')}</h1>

                    <p className="text-surface-500 text-sm">{pagination?.total || 0} {t('common.results')}</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleExportCSV}
                        disabled={loading || customers.length === 0}
                        className="btn-secondary flex items-center gap-2"
                        title="Export Customers to CSV"
                    >
                        <HiOutlineDocumentArrowDown className="w-5 h-5" />
                        <span className="hidden sm:inline">Export CSV</span>
                    </button>
                    <button
                        onClick={() => setIsScannerOpen(true)}
                        className="btn-ghost text-primary-400 border border-primary-400/30 flex items-center gap-2"
                    >
                        <HiOutlineSparkles className="w-5 h-5" />
                        Smart Scan
                    </button>
                    <button onClick={() => { setSelectedCustomer(null); setForm({ ...emptyForm }); setCustModalOpen(true); }} className="btn-primary" id="add-customer-btn">
                        <HiOutlinePlus className="w-5 h-5" />
                        {t('customers.addCustomer')}
                    </button>
                </div>
            </div>

            {/* Search + Active Filter */}
            <div className="glass-card p-4 flex flex-wrap items-center gap-4">
                <div className="relative max-w-md flex-1">
                    <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                    <input type="text" className="input-field pl-10 py-2.5" placeholder={t('common.search')}
                        value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                </div>
                {statusFilter && (
                    <div className="flex items-center gap-2 bg-primary-400/10 text-primary-400 px-3 py-2 rounded-xl border border-primary-400/20 animate-fade-in">
                        <span className="text-xs font-bold uppercase tracking-wider">
                            Filter: {statusFilter === 'pending' ? 'Outstanding Balance' : statusFilter}
                        </span>
                        <button 
                            onClick={() => setStatusFilter('')}
                            className="p-1 hover:bg-primary-400/20 rounded-full transition-colors"
                        >
                            <HiOutlinePlus className="w-3.5 h-3.5 rotate-45" />
                        </button>
                    </div>
                )}
            </div>

            {/* Customer Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? <div className="col-span-full"><LoadingSpinner /></div> :
                    customers.filter(c => statusFilter === 'pending' ? (Number(c.balance) > 0) : true).length === 0 ? (
                        <div className="col-span-full text-center py-16 text-surface-500">
                            {statusFilter === 'pending' ? t('customers.noOutstanding') : t('common.noData')}
                        </div>
                    ) : (
                        customers
                            .filter(c => statusFilter === 'pending' ? (Number(c.balance) > 0) : true)
                            .map((cust) => (
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
                                    <button
                                        onClick={() => {
                                            setScoreData({ name: cust.name, score: cust.creditScore });
                                            setScoreModalOpen(true);
                                        }}
                                        className="btn-ghost btn-sm text-primary-400 bg-primary-400/5 hover:bg-primary-400/10 flex items-center gap-1.5 px-3"
                                        title="View Credit Insights"
                                    >
                                        <HiOutlineShieldCheck className="w-4 h-4" />
                                        Score
                                    </button>
                                    <button onClick={() => openKhata(cust)} className="btn-secondary btn-sm flex-1">
                                        <HiOutlineDocumentText className="w-4 h-4" />
                                        {t('customers.viewKhata')}
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
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
                )
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

            {/* Credit Score Gauge Modal */}
            <Modal
                isOpen={scoreModalOpen}
                onClose={() => setScoreModalOpen(false)}
                title={`Credit Intelligence — ${scoreData?.name}`}
                size="md"
                bodyClassName="p-0 bg-slate-950 shadow-inner"
                headerClassName="bg-slate-950 border-slate-800"
                titleClassName="text-slate-300 font-bold tracking-tight"
            >
                <div className="flex flex-col min-h-[500px]">
                    <div className="flex-1">
                        <CreditScoreGauge score={scoreData?.score || 100} name={scoreData?.name} />
                    </div>
                    
                    <div className="p-8 pt-0 bg-slate-950">
                        <button 
                            onClick={() => setScoreModalOpen(false)}
                            className="w-full py-4 rounded-xl bg-slate-900/50 hover:bg-slate-800 text-slate-300 font-black border border-slate-700/50 backdrop-blur-md transition-all uppercase tracking-[0.3em] text-[10px] shadow-lg active:scale-[0.98]"
                        >
                            Close Analysis Terminal
                        </button>
                    </div>
                </div>
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
                title={`${t('customers.khataTitle')} — ${selectedCustomer?.name}`}
                size="lg"
            >
                <div className="flex flex-col gap-4 mb-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 p-4 rounded-xl bg-surface-800/30 flex items-center justify-between">
                            <span className="text-surface-700 font-medium">{t('customers.balance')}</span>
                            <span className={`text-xl font-bold ${Number(selectedCustomer?.balance) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {formatCurrency(selectedCustomer?.balance)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleDownloadKhataPDF}
                                disabled={ledgerEntries.length === 0}
                                className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-4 rounded-xl flex items-center gap-2 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                                title="Download Statement PDF"
                            >
                                <HiOutlineDocumentArrowDown className="w-5 h-5" />
                                PDF
                            </button>
                            <select
                                className="select-field w-36 py-3"
                                value={khataRange}
                                onChange={(e) => setKhataRange(e.target.value)}
                            >
                                <option value="all">{t('common.allTime')}</option>
                                <option value="today">{t('common.today')}</option>
                                <option value="yesterday">{t('common.yesterday')}</option>
                                <option value="7d">{t('common.last7Days')}</option>
                                <option value="30d">{t('common.last30Days')}</option>
                                <option value="month">{t('common.thisMonth')}</option>
                                <option value="custom">{t('common.custom')}</option>
                            </select>
                        </div>
                    </div>

                    {/* Custom Date Picker */}
                    {khataRange === 'custom' && (
                        <div className="flex items-center gap-3 p-3 bg-surface-800/20 rounded-xl animate-fade-in">
                            <div className="flex-1">
                                <label className="text-[10px] uppercase tracking-wider text-surface-500 font-bold ml-1 mb-1 block">Start Date</label>
                                <input 
                                    type="date" 
                                    className="input-field py-2 text-sm" 
                                    value={khataStartDate}
                                    onChange={(e) => setKhataStartDate(e.target.value)}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] uppercase tracking-wider text-surface-500 font-bold ml-1 mb-1 block">End Date</label>
                                <input 
                                    type="date" 
                                    className="input-field py-2 text-sm" 
                                    value={khataEndDate}
                                    onChange={(e) => setKhataEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {ledgerEntries.length === 0 ? (
                        <p className="text-center text-surface-500 py-8">No transactions found for this period</p>
                    ) : (
                        ledgerEntries.map((entry) => (
                            <div key={entry.id} className={`flex items-center justify-between p-3 rounded-xl border
                ${entry.type === 'CREDIT' ? 'bg-red-500/5 border-red-500/10' : 'bg-emerald-500/5 border-emerald-500/10'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${entry.type === 'CREDIT' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                        {entry.type === 'CREDIT' ? <HiOutlineArrowUp className="w-4 h-4" /> : <HiOutlineArrowDown className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-surface-900">
                                            {entry.type === 'CREDIT' ? t('customers.creditEntry') : t('customers.debitEntry')}
                                        </p>
                                        <p className="text-xs text-surface-700 font-medium">{entry.description || '-'}</p>
                                        <p className="text-xs text-surface-500">{new Date(entry.createdAt).toLocaleString('en-IN')}</p>
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

            <SmartScanModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                contextType="ledger"
                onScanComplete={(data) => {
                    // Search for existing customer
                    const found = customers.find(c => c.phone === data.phone || c.name === data.name);
                    if (found) {
                        openKhata(found);
                        toast.success(`Found Customer: ${found.name}`);
                    } else {
                        setForm(prev => ({
                            ...prev,
                            name: data.name || prev.name,
                            phone: data.phone || prev.phone,
                            email: data.email || prev.email,
                            address: data.address || prev.address
                        }));
                        setCustModalOpen(true);
                        toast.success("New Customer details captured!");
                    }
                    setIsScannerOpen(false);
                }}
            />
        </div>
    );
}
