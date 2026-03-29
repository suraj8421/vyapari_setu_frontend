import { useState, useEffect, useCallback } from 'react';
import { 
    HiOutlineUsers, 
    HiOutlineBriefcase, 
    HiOutlineDocumentText, 
    HiOutlineCurrencyRupee, 
    HiOutlineArrowPath, 
    HiOutlineUserGroup, 
    HiOutlineClock 
} from 'react-icons/hi2';
import { saDashboardAPI } from '../../services/api';
import { toast } from 'react-hot-toast';

export default function SADashboardPage() {
    const [stats, setStats] = useState(null);
    const [growth, setGrowth] = useState([]);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState('30d');

    const fetchData = useCallback(async (currentRange = range) => {
        setLoading(true);
        try {
            const [statsRes, growthRes] = await Promise.all([
                saDashboardAPI.getStats(currentRange),
                saDashboardAPI.getGrowth()
            ]);
            setStats(statsRes.data.data);
            setGrowth(growthRes.data.data);
        } catch (err) {
            console.error('Dashboard Error:', err);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    }, [range]);

    useEffect(() => {
        fetchData();
    }, [range]);

    const handleRangeChange = (e) => {
        const newRange = e.target.value;
        setRange(newRange);
    };

    const metrics = [
        { 
            label: 'Total Users (Clients)', 
            value: stats?.totalUsers?.value || 0, 
            trend: stats?.totalUsers?.trend || '+0%', 
            icon: HiOutlineUsers, 
            color: 'text-blue-600', bg: 'bg-blue-100', borderColor: 'border-blue-200' 
        },
        { 
            label: 'Total Employees (Agents)', 
            value: stats?.totalEmployees?.value || 0, 
            trend: stats?.totalEmployees?.trend || '+0%', 
            icon: HiOutlineBriefcase, 
            color: 'text-indigo-600', bg: 'bg-indigo-100', borderColor: 'border-indigo-200' 
        },
        { 
            label: 'Active Subscriptions', 
            value: stats?.activeSubscriptions?.value || 0, 
            trend: stats?.activeSubscriptions?.trend || '+0%', 
            icon: HiOutlineDocumentText, 
            color: 'text-emerald-600', bg: 'bg-emerald-100', borderColor: 'border-emerald-200' 
        },
        { 
            label: 'Monthly Revenue', 
            value: `₹${(stats?.monthlyRevenue?.value || 0).toLocaleString('en-IN')}`, 
            trend: stats?.monthlyRevenue?.trend || '+0%', 
            icon: HiOutlineCurrencyRupee, 
            color: 'text-amber-600', bg: 'bg-amber-100', borderColor: 'border-amber-200' 
        },
        { 
            label: 'Expired Subscriptions', 
            value: stats?.expiredSubscriptions?.value || 0, 
            trend: stats?.expiredSubscriptions?.trend || '0%', 
            icon: HiOutlineClock, 
            color: 'text-red-600', bg: 'bg-red-100', borderColor: 'border-red-200' 
        },
        { 
            label: 'Pending Manual Payments', 
            value: stats?.pendingManualPayments?.value || 0, 
            trend: stats?.pendingManualPayments?.trend || '+0%', 
            icon: HiOutlineUserGroup, 
            color: 'text-purple-600', bg: 'bg-purple-100', borderColor: 'border-purple-200' 
        },
        { 
            label: 'Total Leads', 
            value: stats?.totalLeads?.value || 0, 
            trend: stats?.totalLeads?.trend || '+0%', 
            icon: HiOutlineUsers, 
            color: 'text-teal-600', bg: 'bg-teal-100', borderColor: 'border-teal-200' 
        },
        { 
            label: 'Converted Leads', 
            value: stats?.convertedLeads?.value || 0, 
            trend: stats?.convertedLeads?.trend || '+0%', 
            icon: HiOutlineBriefcase, 
            color: 'text-cyan-600', bg: 'bg-cyan-100', borderColor: 'border-cyan-200' 
        },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-surface-900 tracking-tight">Dashboard Overview</h1>
                    <p className="text-sm text-surface-500 font-medium mt-1">Command center for system-wide performance and metrics tracking.</p>
                </div>
                <div className="flex items-center gap-3">
                    <select 
                        value={range}
                        onChange={handleRangeChange}
                        className="px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm font-semibold text-surface-700 outline-none focus:ring-2 focus:ring-red-500 transition-all"
                    >
                        <option value="30d">Last 30 Days</option>
                        <option value="3m">Last 3 Months</option>
                        <option value="1y">This Year</option>
                        <option value="all">All Time</option>
                    </select>
                    <button
                        className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 shadow-lg shadow-red-500/30 text-white px-5 py-2 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                        onClick={() => fetchData()}
                        disabled={loading}
                    >
                        <HiOutlineArrowPath className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? 'Refreshing...' : 'Refresh Data'}
                    </button>
                </div>
            </div>

            {/* Top-Level Metrics - 4 Cols */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((metric, i) => (
                    <div key={i} className={`bg-white p-6 rounded-3xl border ${metric.borderColor} shadow-sm hover:shadow-md transition-all relative overflow-hidden group`}>
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-white to-transparent opacity-50 rounded-full group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className={`p-3 rounded-2xl ${metric.bg} ${metric.color}`}>
                                <metric.icon className="w-7 h-7" />
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${metric.trend.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {metric.trend}
                            </span>
                        </div>
                        <h3 className="text-sm font-bold text-surface-500 mb-1 relative z-10">{metric.label}</h3>
                        <p className="text-3xl font-black text-surface-900 tracking-tight relative z-10">
                            {loading ? (
                                <span className="inline-block w-24 h-8 bg-gray-100 animate-pulse rounded-lg"></span>
                            ) : metric.value}
                        </p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Monthly Trends Table */}
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                        <h2 className="text-lg font-black text-surface-900">Recent Subscriptions Growth</h2>
                        <button className="text-sm font-bold text-red-600 hover:text-red-700">View Full Report</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-xs font-bold text-surface-400 uppercase tracking-wider bg-gray-50 rounded-lg">
                                    <th className="p-3 first:rounded-l-lg">Month</th>
                                    <th className="p-3 text-right">New Subscriptions</th>
                                    <th className="p-3 text-right">Renewals</th>
                                    <th className="p-3 text-right last:rounded-r-lg">Revenue (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {loading ? (
                                    [1, 2, 3, 4, 5].map(i => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="p-4"><div className="h-4 bg-gray-100 rounded w-24"></div></td>
                                            <td className="p-4 text-right"><div className="h-4 bg-gray-100 rounded w-12 ml-auto"></div></td>
                                            <td className="p-4 text-right"><div className="h-4 bg-gray-100 rounded w-12 ml-auto"></div></td>
                                            <td className="p-4 text-right"><div className="h-4 bg-gray-100 rounded w-20 ml-auto"></div></td>
                                        </tr>
                                    ))
                                ) : growth.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="p-8 text-center text-surface-500">No data available</td>
                                    </tr>
                                ) : (
                                    growth.map((row, i) => (
                                        <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4 font-bold text-surface-900">{row.month}</td>
                                            <td className="p-4 text-right font-medium text-surface-600">{row.new}</td>
                                            <td className="p-4 text-right font-medium text-surface-600">{row.renewals}</td>
                                            <td className="p-4 text-right font-black text-green-600">₹{row.rev}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Widgets Sidebar */}
                <div className="space-y-6">
                    {/* Widget 1 */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <h2 className="text-sm font-black text-surface-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-3">Actions</h2>
                        <div className="space-y-4">
                            <p className="text-xs text-surface-500 italic">Quick actions and notifications will appear here as the system grows.</p>
                            <button className="w-full py-2.5 rounded-xl font-bold text-sm text-surface-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors">View All Pending Approvals</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
