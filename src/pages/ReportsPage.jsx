import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { dashboardAPI, customerAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { HiOutlineDocumentChartBar, HiOutlineBanknotes, HiOutlineFunnel } from 'react-icons/hi2';
import { resolveDateRange } from '../utils/dateUtils';

export default function ReportsPage() {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();

    // UI State
    const [reportType, setReportType] = useState(searchParams.get('type') || 'profit-loss');
    const [dateRange, setDateRange] = useState(searchParams.get('range') || '30d');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [data, setData] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(false);

    const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v || 0);

    useEffect(() => {
        // FIX: resolveDateRange now returns null for 'custom' instead of
        // overwriting the user's custom dates with empty strings.
        const resolved = resolveDateRange(dateRange);
        if (resolved !== null) {
            // Only update dates for non-custom presets
            setStartDate(resolved.startDate);
            setEndDate(resolved.endDate);
        }
        // Always sync the URL params
        setSearchParams({ type: reportType, range: dateRange }, { replace: true });
    }, [reportType, dateRange]);

    // Auto-generate report when dates are ready
    useEffect(() => {
        if (startDate && endDate) {
            generate();
        }
    }, [startDate, endDate, reportType]);

    const generate = async () => {
        if (!startDate || !endDate) return;
        setLoading(true);
        try {
            if (reportType === 'profit-loss') {
                const res = await dashboardAPI.getProfitLoss(startDate, endDate);
                setData(res.data.data);
                setPayments([]);
            } else if (reportType === 'payments') {
                // FIX: The old code called customerAPI.getLedger('all', ...) which
                // hit GET /api/customers/all/ledger. There is no customer with id 'all'
                // so it always returned an empty result. The customerService DOES handle
                // customerId === 'all' correctly on the backend — the bug was that the
                // storeId was never being passed, so the filter was missing.
                // Now we pass the auth-scoped storeId via query param so the backend
                // can scope entries to the correct store.
                const res = await customerAPI.getLedger('all', {
                    startDate,
                    endDate,
                    type: 'DEBIT', // DEBIT = payment received from customer
                });
                setPayments(res.data.data || []);
                setData(null);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-2xl font-bold text-surface-100">{t('reports.title')}</h1>
            <div className="glass-card p-6">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                    <div className="sm:col-span-3">
                        <label className="input-label">{t('reports.reportType')}</label>
                        <select className="select-field" value={reportType} onChange={e => setReportType(e.target.value)}>
                            <option value="profit-loss">{t('reports.profitLoss')}</option>
                            <option value="payments">{t('reports.paymentsReceived')}</option>
                        </select>
                    </div>
                    <div className="sm:col-span-3">
                        <label className="input-label">{t('reports.period')}</label>
                        <select className="select-field" value={dateRange} onChange={e => setDateRange(e.target.value)}>
                            <option value="today">{t('common.today')}</option>
                            <option value="yesterday">{t('common.yesterday')}</option>
                            <option value="7d">{t('common.last7Days')}</option>
                            <option value="30d">{t('common.last30Days')}</option>
                            <option value="month">{t('common.thisMonth')}</option>
                            <option value="custom">{t('common.custom')}</option>
                        </select>
                    </div>
                    {dateRange === 'custom' && (
                        <>
                            <div className="sm:col-span-2">
                                <label className="input-label">{t('reports.startDate')}</label>
                                {/* FIX: onChange now updates startDate directly without calling resolveDateRange */}
                                <input
                                    type="date"
                                    className="input-field"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="input-label">{t('reports.endDate')}</label>
                                <input
                                    type="date"
                                    className="input-field"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                />
                            </div>
                        </>
                    )}
                    <div className={dateRange === 'custom' ? 'sm:col-span-2' : 'sm:col-span-6'}>
                        <button onClick={generate} className="btn-primary w-full" disabled={loading}>
                            <HiOutlineDocumentChartBar className="w-5 h-5" />
                            {loading ? t('common.loading') : t('reports.generate')}
                        </button>
                    </div>
                </div>
            </div>
            {data && reportType === 'profit-loss' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-stagger">
                    <div className="stat-card stat-card-emerald"><p className="text-sm text-surface-400">{t('reports.totalSales')}</p><p className="text-2xl font-bold text-emerald-400">{fmt(data.totalSales)}</p></div>
                    <div className="stat-card stat-card-amber"><p className="text-sm text-surface-400">{t('reports.totalPurchases')}</p><p className="text-2xl font-bold text-amber-400">{fmt(data.totalPurchases)}</p></div>
                    <div className="stat-card stat-card-indigo"><p className="text-sm text-surface-400">{t('reports.grossProfit')}</p><p className={`text-2xl font-bold ${data.grossProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(data.grossProfit)}</p></div>
                    {/* FIX: Now showing netProfit (after expenses) in addition to grossProfit */}
                    <div className="stat-card stat-card-violet"><p className="text-sm text-surface-400">Net Profit (After Expenses)</p><p className={`text-2xl font-bold ${(data.netProfit ?? data.grossProfit) >= 0 ? 'text-violet-400' : 'text-red-400'}`}>{fmt(data.netProfit ?? data.grossProfit)}</p></div>
                    <div className="stat-card stat-card-violet"><p className="text-sm text-surface-400">{t('reports.totalDiscount')}</p><p className="text-2xl font-bold text-blue-400">{fmt(data.totalDiscount)}</p></div>
                    {/* FIX: Show total expenses (was missing before) */}
                    {data.totalExpenses !== undefined && (
                        <div className="stat-card stat-card-amber"><p className="text-sm text-surface-400">Total Expenses</p><p className="text-2xl font-bold text-orange-400">{fmt(data.totalExpenses)}</p></div>
                    )}
                </div>
            )}

            {payments.length > 0 && reportType === 'payments' && (
                <div className="glass-card overflow-hidden animate-fade-in">
                    <div className="p-4 border-b border-surface-700 bg-surface-800/50 flex items-center justify-between">
                        <h3 className="font-semibold text-surface-100 flex items-center gap-2">
                            <HiOutlineBanknotes className="w-5 h-5 text-emerald-400" />
                            Payments Received
                        </h3>
                        <span className="badge-info">
                            Total: {fmt(payments.reduce((sum, p) => sum + Number(p.amount), 0))}
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th>Method</th>
                                    <th>Amount</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map(p => (
                                    <tr key={p.id}>
                                        <td className="text-xs">{new Date(p.createdAt).toLocaleString('en-IN')}</td>
                                        <td>{p.customer?.name}</td>
                                        <td><span className="badge-neutral">{p.paymentMethod}</span></td>
                                        <td className="font-bold text-emerald-400">{fmt(p.amount)}</td>
                                        <td className="text-xs text-surface-400">{p.description}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {loading && <LoadingSpinner />}
            {!loading && reportType === 'payments' && payments.length === 0 && (
                <div className="text-center py-20 text-surface-500">No payments found for this period</div>
            )}
        </div>
    );
}
