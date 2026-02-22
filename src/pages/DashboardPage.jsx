// ============================================
// Dashboard Page
// ============================================

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { dashboardAPI, productAPI, customerAPI } from '../services/api';
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

const CHART_COLORS = ['#10b981', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e'];

export default function DashboardPage() {
    const { t } = useTranslation();
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
            const [overviewRes, chartRes, topRes, lowRes, outRes] = await Promise.all([
                dashboardAPI.getOverview(),
                dashboardAPI.getSalesChart(30),
                dashboardAPI.getTopProducts(8),
                productAPI.getLowStock(),
                customerAPI.getOutstanding(),
            ]);

            setOverview(overviewRes.data.data);
            setSalesChart(chartRes.data.data || []);
            setTopProducts(topRes.data.data || []);
            setLowStock(lowRes.data.data || []);
            setOutstanding(outRes.data.data || []);
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-IN', {
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
            valueColor: 'text-emerald-600', // Amount Received -> Green
        },
        {
            label: t('dashboard.monthSales'),
            value: formatCurrency(overview?.monthSales?.amount),
            sub: `${overview?.monthSales?.count || 0} ${t('dashboard.transactions')}`,
            icon: HiOutlineArrowTrendingUp,
            color: 'stat-card-emerald',
            iconColor: 'text-emerald-500',
            valueColor: 'text-emerald-600', // Amount Received -> Green
        },
        {
            label: t('dashboard.profitThisMonth'),
            value: formatCurrency(overview?.profitThisMonth),
            sub: overview?.profitThisMonth >= 0 ? '▲ Positive' : '▼ Loss',
            icon: HiOutlineCurrencyRupee,
            color: overview?.profitThisMonth >= 0 ? 'stat-card-emerald' : 'stat-card-rose',
            iconColor: overview?.profitThisMonth >= 0 ? 'text-emerald-500' : 'text-red-500',
            valueColor: overview?.profitThisMonth >= 0 ? 'text-emerald-600' : 'text-red-600',
        },
        {
            label: t('dashboard.totalProducts'),
            value: overview?.totalProducts || 0,
            sub: `${overview?.lowStockCount || 0} ${t('dashboard.lowStock')}`,
            icon: HiOutlineCube,
            color: 'stat-card-indigo',
            iconColor: 'text-blue-500',
            valueColor: 'text-blue-600', // Main Number -> Blue
        },
        {
            label: t('dashboard.outstandingCredit'),
            value: formatCurrency(overview?.outstandingCredit?.amount),
            sub: `${overview?.outstandingCredit?.count || 0} ${t('dashboard.totalCustomers')}`,
            icon: HiOutlineExclamationTriangle,
            color: 'stat-card-rose', // Amount Due -> Red card accent
            iconColor: 'text-red-500',
            valueColor: 'text-red-600', // Amount Due -> Red
        },
        {
            label: t('dashboard.totalCustomers'),
            value: overview?.totalCustomers || 0,
            sub: `${overview?.totalSuppliers || 0} ${t('nav.suppliers')}`,
            icon: HiOutlineUsers,
            color: 'stat-card-cyan',
            iconColor: 'text-blue-400',
            valueColor: 'text-blue-600', // Main Number -> Blue
        },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Title */}
            <div>
                <h1 className="text-2xl font-bold text-surface-900">{t('dashboard.title')}</h1>
                <p className="text-surface-500 text-sm mt-1">
                    {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-stagger">
                {statCards.map((stat, idx) => (
                    <div key={idx} className={`stat-card ${stat.color} group`}>
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
                                            <p className="text-xs text-surface-500">{product.totalQuantity} sold</p>
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
                                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                                    <div>
                                        <p className="text-sm font-medium text-surface-900">{item.product?.name}</p>
                                        <p className="text-xs text-surface-500">SKU: {item.product?.sku}</p>
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
                            <p className="text-surface-500 text-sm text-center py-8">✅ All items well stocked!</p>
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
                                <div key={cust.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
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
