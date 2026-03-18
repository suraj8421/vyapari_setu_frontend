// ============================================
// Dashboard Page
// ============================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { dashboardAPI, productAPI, customerAPI } from '../services/api';
import { getOrFetch } from '../utils/dataCache';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
    HiOutlineShoppingCart,
    HiOutlineCurrencyRupee,
    HiOutlineCube,
    HiOutlineExclamationTriangle,
    HiOutlineUsers,
    HiOutlineTruck,
    HiOutlineArrowTrendingUp,
    HiOutlineArrowTrendingDown,
} from 'react-icons/hi2';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';

const CHART_COLORS = ['#f59e0b', '#f97316', '#fbbf24', '#ea580c', '#c2410c', '#84cc16', '#10b981', '#d97706'];

export default function DashboardPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [overview, setOverview] = useState(null);
    const [salesChart, setSalesChart] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [lowStock, setLowStock] = useState([]);
    const [outstanding, setOutstanding] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            // PERF: Deduplicate dashboard fetches using short-lived cache (30s)
            // This handles StrictMode doubling and near-simultaneous mounts.
            // DASHBOARD_TTL = 30000ms
            const ttl = 30000;
            const [overviewRes, chartRes, topRes, lowRes, outRes] = await Promise.all([
                getOrFetch('dashboard_overview', () => dashboardAPI.getOverview().then(r => r.data.data), ttl),
                getOrFetch('dashboard_chart', () => dashboardAPI.getSalesChart(30).then(r => r.data.data), ttl),
                getOrFetch('dashboard_top', () => dashboardAPI.getTopProducts(8).then(r => r.data.data), ttl),
                getOrFetch('low_stock', () => productAPI.getLowStock().then(r => r.data.data), ttl),
                getOrFetch('outstanding', () => customerAPI.getOutstanding().then(r => r.data.data), ttl),
            ]);

            setOverview(overviewRes);
            setSalesChart(chartRes || []);
            setTopProducts(topRes || []);
            setLowStock(lowRes || []);
            setOutstanding(outRes || []);
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat(t('common.locale') || 'en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(val || 0);
    };

    if (loading) return <LoadingSpinner size="lg" text={t('common.loading')} />;

    const statCards = [
        {
            label: t('dashboard.todaySales'),
            value: formatCurrency(overview?.todaySales?.amount),
            sub: `${overview?.todaySales?.count || 0} ${t('dashboard.transactions')}`,
            icon: HiOutlineShoppingCart,
            color: 'stat-card-emerald',
            iconColor: 'text-emerald-500',
            valueColor: 'text-emerald-600',
            path: '/sales?range=today'
        },
        {
            label: t('dashboard.todayPayments'),
            value: formatCurrency(overview?.todayPayments?.amount),
            sub: `${overview?.todayPayments?.count || 0} ${t('dashboard.paymentsCollected')}`,
            icon: HiOutlineCurrencyRupee,
            color: 'stat-card-emerald',
            iconColor: 'text-emerald-500',
            valueColor: 'text-emerald-600',
            path: '/reports/payments?range=today'
        },
        {
            label: t('dashboard.creditGivenToday'),
            value: formatCurrency(overview?.todaySales?.amount - overview?.todayPayments?.amount),
            sub: t('dashboard.outstandingFromToday'),
            icon: HiOutlineArrowTrendingUp,
            color: 'stat-card-rose',
            iconColor: 'text-red-500',
            valueColor: 'text-red-400',
            path: '/sales?range=today&paymentMethod=CREDIT'
        },
        {
            label: t('dashboard.pendingLoan'),
            value: formatCurrency(overview?.outstandingCredit?.amount),
            sub: `${overview?.outstandingCredit?.count || 0} ${t('dashboard.totalCustomers')}`,
            icon: HiOutlineExclamationTriangle,
            color: 'stat-card-rose',
            iconColor: 'text-red-500',
            valueColor: 'text-red-600',
            path: '/customers?filter=due'
        },
        {
            label: t('dashboard.lowStockItems'),
            value: overview?.lowStockCount || 0,
            sub: t('dashboard.itemsNeedingReorder'),
            icon: HiOutlineCube,
            color: 'stat-card-amber',
            iconColor: 'text-amber-500',
            valueColor: 'text-amber-600',
            path: '/products?filter=low-stock'
        },
        {
            label: t('dashboard.totalCustomers'),
            value: overview?.totalCustomers || 0,
            sub: `${overview?.totalSuppliers || 0} ${t('nav.suppliers')}`,
            icon: HiOutlineUsers,
            color: 'stat-card-amber',
            iconColor: 'text-amber-400',
            valueColor: 'text-amber-600',
            path: '/customers'
        },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Title */}
            <div>
                <h1 className="text-2xl font-bold text-surface-900">{t('dashboard.title')}</h1>
                <p className="text-surface-500 text-sm mt-1">
                    {new Date().toLocaleDateString(t('common.locale') || 'en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-stagger">
                {statCards.map((stat, idx) => (
                    <div
                        key={idx}
                        className={`stat-card ${stat.color} group cursor-pointer hover:shadow-lg active:scale-[0.98] transition-all duration-200 border border-transparent hover:border-surface-600 focus:ring-2 focus:ring-primary-500 outline-none`}
                        onClick={() => navigate(stat.path)}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && navigate(stat.path)}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-surface-500 mb-1">{stat.label}</p>
                                <p className={`text-2xl font-bold ${stat.valueColor}`}>{stat.value}</p>
                                <p className="text-xs text-surface-500 mt-1">{stat.sub}</p>
                            </div>
                            <div className={`p-3 rounded-xl bg-gray-100 ${stat.iconColor} 
                              group-hover:scale-110 transition-transform duration-300`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sales Trend */}
                <div className="lg:col-span-2 glass-card p-6">
                    <h3 className="text-lg font-semibold text-surface-700 mb-4">{t('dashboard.salesChart')}</h3>
                    <div className="h-72">
                        {salesChart.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={salesChart}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#ffffff',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '12px',
                                            color: '#1e293b',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="totalSales"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        fill="url(#colorSales)"
                                        name={t('dashboard.revenue')}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-surface-500">
                                {t('common.noData')}
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Products */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-surface-700 mb-4">{t('dashboard.topProducts')}</h3>
                    <div className="space-y-3">
                        {topProducts.length > 0 ? (
                            topProducts.slice(0, 6).map((product, idx) => (
                                <div key={product.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-surface-700">
                                            {idx + 1}
                                        </span>
                                        <div>
                                            <p className="text-sm font-medium text-surface-900 truncate max-w-[140px]">{product.name}</p>
                                            <p className="text-xs text-surface-500">{product.totalQuantity} {t('common.sold') || 'sold'}</p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-semibold text-emerald-600">
                                        {formatCurrency(product.totalRevenue)}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-surface-500 text-sm text-center py-8">{t('common.noData')}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Row: Low Stock + Outstanding */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Low Stock Alerts */}
                <div className="glass-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <HiOutlineExclamationTriangle className="w-5 h-5 text-amber-500" />
                        <h3 className="text-lg font-semibold text-surface-700">{t('dashboard.lowStockAlerts')}</h3>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {lowStock.length > 0 ? (
                            lowStock.slice(0, 10).map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => navigate('/products')}>
                                    <div>
                                        <p className="text-sm font-medium text-surface-900">{item.product?.name}</p>
                                        <p className="text-xs text-surface-500">SKU: {item.product?.sku}</p>
                                        {/* Display 'Order X more' if a reorder suggestion is available from the backend */}
                                        {item.reorderSuggestion > 0 && (
                                            <p className="text-xs font-semibold text-primary-600 mt-1">
                                                💡 {t('products.reorderSuggestion', { count: item.reorderSuggestion })} {item.product?.unit}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <span className={`badge ${item.quantity === 0 ? 'badge-danger' : 'badge-warning'}`}>
                                            {item.quantity} {item.quantity === 0 ? t('products.outOfStock') : t('products.lowStock')}
                                        </span>
                                        <p className="text-xs text-surface-500 mt-1">Min: {item.minStockLevel}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-surface-500 text-sm text-center py-8">✅ {t('dashboard.allStocked')}</p>
                        )}
                    </div>
                </div>

                {/* Outstanding Credits */}
                <div className="glass-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <HiOutlineCurrencyRupee className="w-5 h-5 text-red-500" />
                        <h3 className="text-lg font-semibold text-surface-700">{t('dashboard.outstandingCredits')}</h3>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {outstanding.length > 0 ? (
                            outstanding.slice(0, 10).map((cust) => (
                                <div
                                    key={cust.id}
                                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-surface-800/40 dark:hover:bg-surface-800 transition-colors cursor-pointer group"
                                    onClick={() => navigate(`/customers?ledger=${cust.id}&range=30d`)}
                                >
                                    <div>
                                        <p className="text-sm font-medium text-surface-900">{cust.name}</p>
                                        <p className="text-xs text-surface-500">{cust.phone}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-red-600">{formatCurrency(cust.balance)}</p>
                                        <p className="text-xs text-surface-500">
                                            Limit: {formatCurrency(cust.creditLimit)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-surface-500 text-sm text-center py-8">{t('customers.noOutstanding')}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
