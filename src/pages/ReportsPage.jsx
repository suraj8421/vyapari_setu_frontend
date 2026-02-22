import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dashboardAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { HiOutlineDocumentChartBar } from 'react-icons/hi2';

export default function ReportsPage() {
    const { t } = useTranslation();
    const [reportType, setReportType] = useState('profit-loss');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v || 0);

    const generate = async () => {
        if (!startDate || !endDate) return alert('Select dates');
        setLoading(true);
        try {
            const res = await dashboardAPI.getProfitLoss(startDate, endDate);
            setData(res.data.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-2xl font-bold text-surface-100">{t('reports.title')}</h1>
            <div className="glass-card p-6">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="input-label">{t('reports.startDate')}</label>
                        <input type="date" className="input-field" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div>
                        <label className="input-label">{t('reports.endDate')}</label>
                        <input type="date" className="input-field" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                    <div>
                        <label className="input-label">Type</label>
                        <select className="select-field" value={reportType} onChange={e => setReportType(e.target.value)}>
                            <option value="profit-loss">{t('reports.profitLoss')}</option>
                        </select>
                    </div>
                    <button onClick={generate} className="btn-primary" disabled={loading}>
                        <HiOutlineDocumentChartBar className="w-5 h-5" />
                        {loading ? t('common.loading') : t('reports.generate')}
                    </button>
                </div>
            </div>
            {data && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-stagger">
                    <div className="stat-card stat-card-emerald"><p className="text-sm text-surface-400">{t('reports.totalSales')}</p><p className="text-2xl font-bold text-emerald-400">{fmt(data.totalSales)}</p></div>
                    <div className="stat-card stat-card-amber"><p className="text-sm text-surface-400">{t('reports.totalPurchases')}</p><p className="text-2xl font-bold text-amber-400">{fmt(data.totalPurchases)}</p></div>
                    <div className="stat-card stat-card-indigo"><p className="text-sm text-surface-400">{t('reports.grossProfit')}</p><p className={`text-2xl font-bold ${data.grossProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(data.grossProfit)}</p></div>
                    <div className="stat-card stat-card-violet"><p className="text-sm text-surface-400">{t('reports.totalDiscount')}</p><p className="text-2xl font-bold text-violet-400">{fmt(data.totalDiscount)}</p></div>
                </div>
            )}
        </div>
    );
}
