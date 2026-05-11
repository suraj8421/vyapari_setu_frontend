import { useState, useEffect } from 'react';
import { 
    HiOutlineUsers, HiOutlineCurrencyRupee, HiOutlineChartBar, 
    HiOutlineMagnifyingGlass, HiOutlineEye, HiOutlinePlus,
    HiOutlineDocumentArrowDown, HiOutlineClock, HiOutlineTrophy,
    HiOutlineBellAlert
} from 'react-icons/hi2';
import SAUserProfileModal from '../../components/superadmin/SAUserProfileModal';
import SAAddUserModal from '../../components/superadmin/SAAddUserModal';

import { API_BASE_URL } from '../../services/api';

export default function SAUsersPage() {
    const [users, setUsers] = useState([]);
    const [analytics, setAnalytics] = useState({});
    const [loading, setLoading] = useState(true);
    
    const [page, setPage] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    
    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Status');
    const [employeeFilter, setEmployeeFilter] = useState('');
    const [employees, setEmployees] = useState([]);
    
    // Modals
    const [selectedUser, setSelectedUser] = useState(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);

    useEffect(() => {
        fetchAnalytics();
        fetchEmployees();
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [page, search, statusFilter, employeeFilter]);

    const fetchAnalytics = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/sa-users/analytics`);
            const data = await res.json();
            if (data.success) setAnalytics(data.data);
        } catch (e) { console.error('Error fetching CRM analytics', e); }
    };

    const fetchEmployees = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/employees`);
            const data = await res.json();
            if (data.success) setEmployees(data.data);
        } catch (e) { console.error('Error fetching employees'); }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 12 });
            if (search) params.append('search', search);
            if (statusFilter !== 'All Status') params.append('status', statusFilter);
            if (employeeFilter) params.append('employeeId', employeeFilter);

            const res = await fetch(`${API_BASE_URL}/sa-users?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setUsers(data.data);
                setTotalUsers(data.pagination.total);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewProfile = (user) => {
        setSelectedUser(user);
        setIsProfileOpen(true);
    };

    const handleProfileClose = (needsRefresh) => {
        setIsProfileOpen(false);
        setSelectedUser(null);
        if (needsRefresh) {
            fetchUsers();
            fetchAnalytics();
        }
    };

    const handleExport = () => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (statusFilter !== 'All Status') params.append('status', statusFilter);
        if (employeeFilter) params.append('employeeId', employeeFilter);
        window.open(`${API_BASE_URL}/sa-users/export?${params.toString()}`, '_blank');
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10 max-w-7xl mx-auto">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Users</p>
                        <h3 className="text-2xl font-black text-surface-900">{analytics.totalUsers || 0}</h3>
                        <p className="text-xs font-semibold text-emerald-500 mt-1">{analytics.activeUsers || 0} Active</p>
                    </div>
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100"><HiOutlineUsers className="w-6 h-6 text-indigo-600" /></div>
                </div>
                
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Expiry Links</p>
                        <h3 className="text-2xl font-black text-emerald-600">{analytics.activeSubscriptions || 0}</h3>
                        <p className="text-xs font-semibold text-red-500 mt-1 flex items-center gap-1"><HiOutlineBellAlert className="w-3 h-3" /> {analytics.renewalDueUsers || 0} Renewals Due</p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100"><HiOutlineClock className="w-6 h-6 text-emerald-600" /></div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Monthly Inflow</p>
                        <h3 className="text-2xl font-black text-surface-900">₹{analytics.monthlyRevenue?.toLocaleString('en-IN') || 0}</h3>
                        <p className="text-xs font-semibold text-gray-400 mt-1">LTV Inbound (30D)</p>
                    </div>
                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100"><HiOutlineCurrencyRupee className="w-6 h-6 text-amber-600" /></div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between col-span-1 lg:col-span-2 xl:col-span-2">
                    <div className="flex-1">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Elite Performer</p>
                        <h3 className="text-xl font-black text-surface-900 truncate">{analytics.topPerformingEmployee || 'Scanning...'}</h3>
                        <p className="text-xs font-semibold text-emerald-600 mt-1 uppercase tracking-widest">Highest Module Output</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center border border-yellow-100"><HiOutlineTrophy className="w-6 h-6 text-yellow-600" /></div>
                </div>
            </div>

            {/* Matrix View Container */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                {/* CRM Controls */}
                <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col xl:flex-row gap-4 xl:items-center justify-between">
                    <div className="relative flex-1 max-w-2xl group">
                        <HiOutlineMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-red-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Find User Name, Store, Phone or Email Master Identity..." 
                            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all text-surface-900 shadow-sm"
                        />
                    </div>
                    
                    <div className="flex flex-wrap gap-3 items-center">
                        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-black uppercase tracking-widest text-surface-700 outline-none focus:ring-2 focus:ring-red-500/50 shadow-sm">
                            <option value="All Status">All Platforms</option>
                            <option value="ACTIVE">Active Units</option>
                            <option value="PENDING">Pending Setup</option>
                            <option value="INACTIVE">Suspended</option>
                        </select>
                        <select value={employeeFilter} onChange={e => { setEmployeeFilter(e.target.value); setPage(1); }} className="px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-black uppercase tracking-widest text-surface-700 outline-none focus:ring-2 focus:ring-red-500/50 shadow-sm">
                            <option value="">All Managers</option>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                        
                        <div className="h-10 w-px bg-gray-200 mx-2 hidden xl:block"></div>
                        
                        <button onClick={handleExport} className="flex items-center gap-2 px-5 py-3 bg-white text-surface-600 border border-gray-200 hover:border-red-200 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-sm hover:text-red-600">
                            <HiOutlineDocumentArrowDown className="w-5 h-5 text-emerald-500" /> Export CSV
                        </button>
                        
                        <button onClick={() => setIsAddUserOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-red-500/30">
                            <HiOutlinePlus className="w-5 h-5" /> Provision User
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto flex-1">
                    {loading ? (
                        <div className="p-12 pl-24 text-gray-400 font-bold uppercase tracking-widest text-xs flex items-center gap-3">
                            <div className="w-6 h-6 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div> Scanning CRM Matrix...
                        </div>
                    ) : users.length === 0 ? (
                        <div className="p-24 text-center">
                            <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <HiOutlineUsers className="w-10 h-10 text-gray-300" />
                            </div>
                            <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No Active Unit Identity Mapped</p>
                        </div>
                    ) : (
                        <table className="w-full text-left min-w-[1300px]">
                            <thead className="bg-white">
                                <tr className="border-b border-gray-100 text-[10px] font-black text-surface-400 uppercase tracking-widest bg-gray-50/20">
                                    <th className="px-8 py-5">Platform Entity</th>
                                    <th className="px-8 py-5">Communication Core</th>
                                    <th className="px-8 py-5">Active Subscription</th>
                                    <th className="px-8 py-5">Gross Revenue (LTV)</th>
                                    <th className="px-8 py-5 text-center">Lifecycle Status</th>
                                    <th className="px-8 py-5 text-center">Managed By</th>
                                    <th className="px-8 py-5 text-right">Directives</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-50">
                                {users.map(u => (
                                    <tr key={u.id} className={`hover:bg-red-50/10 transition-colors group cursor-pointer ${u.platformStatus === 'DELETED' ? 'opacity-50 grayscale' : ''}`} onClick={() => handleViewProfile(u)}>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center font-black text-gray-400 uppercase text-xs group-hover:bg-red-50 group-hover:text-red-500 transition-colors">
                                                    {u.firstName.charAt(0)}{u.lastName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-surface-900 group-hover:text-red-600 transition-colors">{u.firstName} {u.lastName}</p>
                                                    <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-wider">{u.store?.name || 'Isolated Entity'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="text-xs font-black text-surface-700">{u.phone}</p>
                                            <p className="text-[10px] font-bold text-gray-400 mt-0.5">{u.email}</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="inline-flex items-center px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest border border-indigo-100">{u.currentPlan}</div>
                                            {u.subscriptionEnd && (
                                                <p className={`text-[10px] mt-2 font-bold flex items-center gap-1 ${new Date(u.subscriptionEnd) < new Date() ? 'text-red-500' : 'text-emerald-700'}`}>
                                                    <HiOutlineClock className="w-3 h-3" /> {new Date(u.subscriptionEnd).toLocaleDateString()}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="font-black text-surface-900 bg-surface-50 px-3 py-1.5 rounded-xl border border-gray-200 inline-block">
                                                ₹{u.totalPayments.toLocaleString('en-IN')}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] border ${
                                                u.platformStatus === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                u.platformStatus === 'INACTIVE' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                u.platformStatus === 'DELETED' ? 'bg-red-50 text-red-700 border-red-200' :
                                                'bg-gray-100 text-gray-600 border-gray-300'
                                            }`}>
                                                {u.platformStatus}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            {u.assignedAgent ? (
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[10px] font-black text-surface-600 uppercase tracking-widest">{u.assignedAgent.name}</span>
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">{u.assignedAgent.code}</span>
                                                </div>
                                            ) : <span className="text-gray-300 text-[10px] font-black uppercase">UNASSIGNED</span>}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button onClick={(e) => { e.stopPropagation(); handleViewProfile(u); }} className="p-3 bg-white text-gray-500 hover:text-red-500 hover:bg-red-50 border border-gray-100 rounded-2xl shadow-sm transition-all focus:outline-none" title="Matrix Observer">
                                                <HiOutlineEye className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                
                {/* Modern Pagination */}
                <div className="border-t border-gray-100 p-6 bg-gray-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Matrix Load Page</span>
                         <span className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-black text-surface-800">{page}</span>
                         <span className="text-[10px] font-black text-gray-400 uppercase">of {Math.ceil(totalUsers / 12) || 1}</span>
                    </div>
                    <div className="flex gap-3">
                        <button disabled={page === 1} onClick={() => { setPage(p => p - 1); window.scrollTo(0,0); }} className="px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-all">Previous</button>
                        <button disabled={page >= Math.ceil(totalUsers / 12)} onClick={() => { setPage(p => p + 1); window.scrollTo(0,0); }} className="px-8 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-all">Load More Units</button>
                    </div>
                </div>
            </div>

            {isProfileOpen && selectedUser && (
                <SAUserProfileModal 
                    user={selectedUser} 
                    onClose={handleProfileClose}
                />
            )}

            {isAddUserOpen && (
                <SAAddUserModal 
                    onClose={(refresh) => { setIsAddUserOpen(false); if(refresh) fetchUsers(); }} 
                    employees={employees}
                />
            )}
        </div>
    );
}
