// ============================================
// Customers / Khata Page
// ============================================

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { customerAPI, storeAPI, paymentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { resolveDateRange } from '../utils/dateUtils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    HiOutlinePlus, HiOutlinePencilSquare, HiOutlineMagnifyingGlass,
    HiOutlineBanknotes, HiOutlineDocumentText, HiOutlineArrowUp, HiOutlineArrowDown,
    HiOutlineDocumentArrowDown, HiOutlineSparkles,
    HiOutlineShieldCheck, HiOutlineShare, HiOutlineCreditCard
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
        
        if (payForm.paymentMethod === 'ONLINE') {
            return initiateRazorpay();
        }

        setSaving(true);
        try {
            await customerAPI.recordPayment({
                ...payForm,
                type: 'DEBIT',
                amount: Number(payForm.amount),
            });
            setPayModalOpen(false);
            fetchCustomers();
            toast.success(t('customers.paymentRecorded'));
        } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
        finally { setSaving(false); }
    };

    const initiateRazorpay = async () => {
        try {
            setSaving(true);
            const { data } = await paymentAPI.createOrder({
                customerId: selectedCustomer.id,
                amount: Number(payForm.amount)
            });

            const options = {
                key: data.data.key,
                amount: data.data.totalAmount * 100,
                currency: "INR",
                name: "VyapariSetu",
                description: `Payment for ${selectedCustomer.name}`,
                order_id: data.data.orderId,
                handler: async (response) => {
                    try {
                        const verified = await paymentAPI.verifyPayment({
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature
                        });
                        if (verified.data.success) {
                            toast.success("Payment Successful!");
                            setPayModalOpen(false);
                            fetchCustomers();
                        }
                    } catch (err) {
                        toast.error("Cloud verification failed. It will be auto-processed via webhook.");
                        setPayModalOpen(false);
                    }
                },
                prefill: {
                    name: selectedCustomer.name,
                    contact: selectedCustomer.phone
                },
                theme: { color: "#3B82F6" }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            toast.error("Failed to start Razorpay. Using mock/manual mode.");
        } finally {
            setSaving(false);
        }
    };

    const handleSendPaymentLink = (cust) => {
        const bal = Math.abs(Number(cust.balance));
        if (bal <= 0) return toast.info("No balance to collect");

        const paymentUrl = `${window.location.origin}/pay/${cust.id}`;
        const msg = encodeURIComponent(`Hi ${cust.name}, your pending amount on VyapariSetu is ₹${bal}. Please pay at your convenience.\n\nPayment Link:\n${paymentUrl}`);
        window.open(`https://wa.me/91${cust.phone}?text=${msg}`, '_blank');
        toast.success("Message sent to WhatsApp!");
    };

    const handleCopyAndOpenLink = (cust) => {
        const url = `${window.location.origin}/pay/${cust.id}`;
        navigator.clipboard.writeText(url);
        window.open(url, '_blank');
        toast.success("Link copied and opened!");
    };

    const handleDownloadKhataPDF = () => {
        if (!selectedCustomer) return;

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const blue = [37, 99, 235];
        const green = [16, 185, 129];
        const red = [220, 38, 38];
        const lightBg = [248, 250, 252];
        const dark = [15, 23, 42];

        // jsPDF cannot render the Rs symbol correctly, use 'Rs.' instead
        const fmt = (val) => `Rs. ${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        // ── Blue Header Banner ──────────────────────────────────────
        doc.setFillColor(...blue);
        doc.rect(0, 0, pageW, 38, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Customer Account Statement', 14, 16);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text('VyapariSetu - Khata / Ledger Report', 14, 23);
        doc.setFontSize(8);
        const genDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const genTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        doc.text(`Generated: ${genDate}, ${genTime}`, pageW - 14, 23, { align: 'right' });

        // ── Customer Info Row ───────────────────────────────────────
        doc.setFillColor(...lightBg);
        doc.rect(0, 38, pageW, 26, 'F');
        doc.setDrawColor(210, 220, 235);
        doc.line(0, 64, pageW, 64);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...dark);
        doc.text(selectedCustomer.name, 14, 50);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Phone: ${selectedCustomer.phone || 'N/A'}`, 14, 57);
        if (selectedCustomer.email) doc.text(`Email: ${selectedCustomer.email}`, 14, 62);

        // Period
        const periodText = { today: 'Today', yesterday: 'Yesterday', '7d': 'Last 7 Days', '30d': 'Last 30 Days', month: 'This Month', all: 'All Time' }[khataRange] || 'Custom Range';
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Period:', pageW / 2, 47, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...blue);
        doc.text(periodText, pageW / 2, 55, { align: 'center' });

        // Balance box (top-right)
        const balanceNum = Number(selectedCustomer.balance) || 0;
        const isOwed = balanceNum > 0;
        const boxColor = isOwed ? red : green;
        doc.setFillColor(...boxColor);
        doc.roundedRect(pageW - 58, 40, 48, 22, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.text(isOwed ? 'OUTSTANDING' : 'SETTLED / ADVANCE', pageW - 34, 48, { align: 'center' });
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(fmt(Math.abs(balanceNum)), pageW - 34, 57, { align: 'center' });

        // ── Ledger Table ────────────────────────────────────────────
        const entries = [...ledgerEntries].reverse();
        const tableRows = entries.map(entry => {
            const d = new Date(entry.createdAt);
            const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
            const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            return [
                `${dateStr}\n${timeStr}`,
                entry.description || '-',
                entry.type === 'CREDIT' ? 'Credit' : 'Debit',
                fmt(entry.amount),
                fmt(entry.balanceAfter),
            ];
        });

        autoTable(doc, {
            startY: 68,
            head: [['Date', 'Description', 'Type', 'Amount (Rs.)', 'Balance (Rs.)']],
            body: tableRows,
            theme: 'grid',
            headStyles: {
                fillColor: blue,
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 8.5,
                cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
            },
            styles: {
                fontSize: 8,
                cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
                textColor: dark,
                lineColor: [220, 228, 240],
                lineWidth: 0.2,
                overflow: 'linebreak',
            },
            alternateRowStyles: { fillColor: [245, 248, 255] },
            columnStyles: {
                0: { cellWidth: 26, halign: 'center', valign: 'middle', fontSize: 7.5 },
                1: { halign: 'left' },
                2: { cellWidth: 20, halign: 'center', valign: 'middle', fontStyle: 'bold' },
                3: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
                4: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
            },
            didParseCell(data) {
                if (data.section === 'body' && data.column.index === 2) {
                    data.cell.styles.textColor = data.cell.raw === 'Credit' ? red : green;
                }
            },
            margin: { left: 10, right: 10 },
        });

        // ── Summary Strip ───────────────────────────────────────────
        const finalY = doc.lastAutoTable.finalY + 6;
        const totalCredits = entries.filter(e => e.type === 'CREDIT').reduce((s, e) => s + Number(e.amount || 0), 0);
        const totalDebits = entries.filter(e => e.type === 'DEBIT').reduce((s, e) => s + Number(e.amount || 0), 0);

        doc.setFillColor(...lightBg);
        doc.roundedRect(10, finalY, pageW - 20, 22, 2, 2, 'F');
        doc.setDrawColor(...blue);
        doc.setLineWidth(0.4);
        doc.line(10, finalY, 10, finalY + 22);

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text('STATEMENT SUMMARY', 16, finalY + 7);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...red);
        doc.text(`Total Borrowed (Credit):  ${fmt(totalCredits)}`, 16, finalY + 14);
        doc.setTextColor(...green);
        doc.text(`Total Paid / Returned (Debit):  ${fmt(totalDebits)}`, 16, finalY + 19);

        doc.setTextColor(...dark);
        doc.setFont('helvetica', 'bold');
        doc.text(`Net Closing Balance: ${fmt(balanceNum)}`, pageW - 14, finalY + 14, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(`${entries.length} transaction(s) shown`, pageW - 14, finalY + 19, { align: 'right' });

        // ── Page Footer ─────────────────────────────────────────────
        doc.setDrawColor(200, 210, 225);
        doc.setLineWidth(0.3);
        doc.line(10, 283, pageW - 10, 283);
        doc.setFontSize(7);
        doc.setTextColor(160, 170, 185);
        doc.text('This is a computer-generated statement. No signature required.', pageW / 2, 288, { align: 'center' });
        doc.text('Powered by VyapariSetu - Business Management System', pageW / 2, 292, { align: 'center' });

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
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-surface-900">{cust.name}</h3>
                                        </div>
                                        <p className="text-xs text-surface-600 font-medium">{cust.phone || '-'}</p>
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
                                    <button onClick={() => handleSendPaymentLink(cust)} className="btn-ghost btn-sm text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10" title="Send to WhatsApp">
                                        <HiOutlineShare className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleCopyAndOpenLink(cust)} className="btn-ghost btn-sm text-blue-500 bg-blue-500/5 hover:bg-blue-500/10" title="Open & Copy Payment Link">
                                        <HiOutlinePlus className="w-4 h-4" /> 
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
                            <option value="ONLINE">Razorpay (Online Payment)</option>
                            <option value="UPI">{t('sales.upi')} (Manual)</option>
                            <option value="CARD">{t('sales.card')}</option>
                            <option value="BANK_TRANSFER">{t('sales.bankTransfer')}</option>
                        </select>
                    </div>
                    {payForm.paymentMethod === 'ONLINE' && (
                        <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl flex items-center gap-3">
                            <HiOutlineCreditCard className="w-6 h-6 text-blue-400" />
                            <div className="flex-1">
                                <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Digital Processing</p>
                                <p className="text-sm text-surface-600">A 2% gateway fee may apply based on your global settings.</p>
                            </div>
                        </div>
                    )}
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
