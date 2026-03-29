import { useState, useEffect } from 'react';
import { 
    HiOutlineArrowDownTray, HiOutlineUserPlus, HiOutlineMagnifyingGlass, 
    HiOutlinePencilSquare, HiOutlineTrash, HiOutlineEye,
    HiOutlineUsers, HiOutlineBriefcase, HiOutlineBanknotes, HiOutlineLockClosed, HiOutlineLockOpen
} from 'react-icons/hi2';
import EmployeeFormModal from '../../components/superadmin/EmployeeFormModal';
import EmployeeDetailsDrawer from '../../components/superadmin/EmployeeDetailsDrawer';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function SAEmployeesPage() {
    const [employees, setEmployees] = useState([]);
    const [managers, setManagers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Filters
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('All Roles');
    const [stateFilter, setStateFilter] = useState('All States');
    const [statusFilter, setStatusFilter] = useState('All Status');

    // UI States
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [viewingEmployee, setViewingEmployee] = useState(null);

    // Dashboard Stats Derived
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(e => e.isActive).length;
    const inactiveEmployees = totalEmployees - activeEmployees;
    const totalClients = employees.reduce((sum, e) => sum + (e.usersCount || 0), 0);

    const targetSalesTotal = employees.reduce((sum, e) => sum + (e.rawSalesValue || 0), 0);
    let totalSales = '₹0';
    if (targetSalesTotal > 0) {
        if (targetSalesTotal >= 100000) {
            totalSales = `₹${(targetSalesTotal / 100000).toFixed(1)}L`;
        } else if (targetSalesTotal >= 1000) {
            totalSales = `₹${(targetSalesTotal / 1000).toFixed(1)}K`;
        } else {
            totalSales = `₹${targetSalesTotal}`;
        }
    }

    useEffect(() => {
        fetchEmployees();
        fetchManagers();
    }, [roleFilter, stateFilter, statusFilter, search]);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();
            if (roleFilter !== 'All Roles') queryParams.append('role', roleFilter);
            if (stateFilter !== 'All States') queryParams.append('state', stateFilter);
            if (statusFilter !== 'All Status') queryParams.append('status', statusFilter);
            if (search) queryParams.append('search', search);

            const res = await fetch(`${API_URL}/employees?${queryParams.toString()}`);
            const data = await res.json();
            if (data.success) {
                setEmployees(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchManagers = async () => {
        try {
            const res = await fetch(`${API_URL}/employees/managers`);
            const data = await res.json();
            if (data.success) {
                setManagers(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch managers:', error);
        }
    };

    const handleFormSubmit = async (formData) => {
        setActionLoading(true);
        try {
            const url = editingEmployee ? `${API_URL}/employees/${editingEmployee.id}` : `${API_URL}/employees`;
            const method = editingEmployee ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (data.success) {
                setIsFormOpen(false);
                setEditingEmployee(null);
                fetchEmployees();
                fetchManagers(); // Refresh managers list purely in case a role changed
            } else {
                alert(data.message || 'Error saving employee');
            }
        } catch (error) {
            console.error('Error saving employee:', error);
            alert('Failed to save employee');
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        if (!confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this employee?`)) return;
        try {
            const res = await fetch(`${API_URL}/employees/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !currentStatus })
            });
            const data = await res.json();
            if (data.success) fetchEmployees();
        } catch (error) {
            console.error('Failed to toggle status:', error);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you certain you wish to delete this employee? This action is not reversible.')) return;
        try {
            const res = await fetch(`${API_URL}/employees/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) fetchEmployees();
        } catch (error) {
            console.error('Failed to delete employee:', error);
        }
    };

    const openEdit = (emp) => {
        setEditingEmployee(emp);
        setIsFormOpen(true);
    };

    const openDetails = (emp) => {
        setViewingEmployee(emp);
        setIsDetailsOpen(true);
    };

    const exportToCSV = () => {
        const headers = ['Code', 'Name', 'Email', 'Phone', 'Role', 'State', 'Status', 'Manager', 'Joined'];
        const rows = employees.map(e => [
            e.code, e.name, e.email, e.phone, e.role, e.state, 
            e.isActive ? 'Active' : 'Inactive', 
            e.manager ? e.manager.name : 'None',
            new Date(e.joiningDate).toLocaleDateString()
        ]);
        
        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n" 
            + rows.map(e => e.join(",")).join("\n");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "employees_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const uniqueStates = [...new Set(employees.map(e => e.state).filter(Boolean))];

    return (
        <div className="space-y-6 animate-fade-in relative pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                {/* Changed blur blob from indigo to orange to match theme */}
                <div className="absolute right-0 top-0 w-64 h-64 bg-orange-50 rounded-full blur-3xl -mr-10 -mt-20 opacity-80 pointer-events-none"></div>
                <div className="relative z-10">
                    <h1 className="text-2xl font-black text-surface-900 tracking-tight">Employees & Hierarchy</h1>
                    <p className="text-sm text-surface-500 font-medium mt-1">Manage team roles, map reporting managers, and view performance metrics.</p>
                </div>
                <div className="flex gap-3 relative z-10">
                    <button onClick={exportToCSV} className="flex items-center gap-2 btn-secondary px-5 py-2.5 border border-gray-200 text-surface-700 bg-gray-50 rounded-xl font-bold shadow-sm hover:bg-gray-100 transition-all">
                        <HiOutlineArrowDownTray className="w-5 h-5 text-gray-400" />
                        Export
                    </button>
                    <button onClick={() => { setEditingEmployee(null); setIsFormOpen(true); }} className="flex items-center gap-2 btn-primary bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-red-500/30 transition-all">
                        <HiOutlineUserPlus className="w-5 h-5" />
                        New Employee
                    </button>
                </div>
            </div>

            {/* Dashboard Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100"><HiOutlineUsers className="w-6 h-6 text-blue-500" /></div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Staff</p>
                        <h3 className="text-2xl font-black text-surface-900 leading-none mt-1">{totalEmployees}</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100"><HiOutlineLockOpen className="w-6 h-6 text-emerald-500" /></div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active/Inactive</p>
                        <h3 className="text-2xl font-black text-surface-900 leading-none mt-1">{activeEmployees} / {inactiveEmployees}</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center border border-purple-100"><HiOutlineBriefcase className="w-6 h-6 text-purple-500" /></div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Client Base</p>
                        <h3 className="text-2xl font-black text-surface-900 leading-none mt-1">{totalClients}</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center border border-orange-100"><HiOutlineBanknotes className="w-6 h-6 text-orange-500" /></div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Global Sales</p>
                        <h3 className="text-2xl font-black text-surface-900 leading-none mt-1">{totalSales}</h3>
                    </div>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-wrap gap-4 items-center justify-between">
                    <div className="relative flex-1 max-w-md">
                        <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search employee or code..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            // Changed focus rings to match red/orange theme
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
                        />
                    </div>
                    <div className="flex gap-3">
                        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-surface-700 outline-none focus:ring-2 focus:ring-red-500/50">
                            <option>All Roles</option>
                            <option>Agent</option>
                            <option>BDE</option>
                            <option>TL</option>
                            <option>ASM</option>
                            <option>RH</option>
                        </select>
                        <select value={stateFilter} onChange={e => setStateFilter(e.target.value)} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-surface-700 outline-none focus:ring-2 focus:ring-red-500/50">
                            <option>All States</option>
                            {uniqueStates.map(st => <option key={st} value={st}>{st}</option>)}
                        </select>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-surface-700 outline-none focus:ring-2 focus:ring-red-500/50">
                            <option>All Status</option>
                            <option>Active</option>
                            <option>Inactive</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[300px]">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500 font-medium">Loading employees...</div>
                    ) : employees.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 font-medium bg-gray-50/30 m-4 rounded-xl border border-gray-100 border-dashed">
                            No employees found. <button onClick={() => { setEditingEmployee(null); setIsFormOpen(true); }} className="text-red-600 font-bold hover:underline">Add one now</button>
                        </div>
                    ) : (
                        <table className="w-full text-left min-w-[1000px]">
                            <thead className="bg-white">
                                <tr className="border-b border-gray-200 text-xs font-black text-surface-400 uppercase tracking-widest">
                                    <th className="px-6 py-4">Employee</th>
                                    <th className="px-6 py-4">Role & Location</th>
                                    <th className="px-6 py-4">Reporting Manager</th>
                                    <th className="px-6 py-4 text-center">Managed Clients</th>
                                    <th className="px-6 py-4 text-center">Sales Closed</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-100">
                                {employees.map(emp => (
                                    // Changed hover highlight
                                    <tr key={emp.id} className="hover:bg-orange-50/30 transition-colors group">
                                        <td className="px-6 py-5 cursor-pointer" onClick={() => openDetails(emp)}>
                                            {/* Changed hover text */}
                                            <p className="font-black text-surface-900 group-hover:text-red-700 transition-colors">{emp.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-xs font-bold text-gray-400 font-mono tracking-tight">{emp.code}</p>
                                                <p className="text-[10px] bg-gray-100 text-gray-500 px-1 py-0.5 rounded font-black">{new Date(emp.createdAt).getFullYear()}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 cursor-pointer" onClick={() => openDetails(emp)}>
                                            <div className="flex flex-col items-start gap-1.5">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded shadow-sm text-xs font-black uppercase tracking-wider border ${
                                                    emp.role === 'ASM' || emp.role === 'RH' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                                                    emp.role === 'TL' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                                                    'bg-blue-100 text-blue-800 border-blue-200'
                                                }`}>
                                                    {emp.role}
                                                </span>
                                                <span className="text-xs font-semibold text-surface-500">{emp.state || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 font-semibold text-surface-700 cursor-pointer" onClick={() => openDetails(emp)}>
                                            {emp.manager ? (
                                                <div className="flex items-center gap-2">
                                                    <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                                    <div>
                                                        <p className="text-sm font-bold text-surface-700">{emp.manager.name}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase">{emp.manager.role}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 font-bold text-xs uppercase tracking-wider">Board / HQ</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-center cursor-pointer" onClick={() => openDetails(emp)}>
                                            <span className="inline-block px-3 py-1 bg-gray-100 text-surface-900 font-black rounded-lg border border-gray-200">{emp.usersCount || 0}</span>
                                        </td>
                                        <td className="px-6 py-5 text-center cursor-pointer" onClick={() => openDetails(emp)}>
                                            <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 font-black rounded-lg border border-emerald-200">{emp.salesFormatted || '₹0'}</span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <button onClick={() => handleToggleStatus(emp.id, emp.isActive)} className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${emp.isActive ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200' : 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200'}`} title="Click to Toggle">
                                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${emp.isActive ? 'bg-emerald-600' : 'bg-red-600'}`}></span>
                                                    {emp.isActive ? 'Active' : 'Inactive'}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openDetails(emp)} className="p-2 bg-white text-gray-600 hover:text-red-600 hover:bg-red-50 border border-gray-200 rounded-lg shadow-sm transition-all" title="View details">
                                                    <HiOutlineEye className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => openEdit(emp)} className="p-2 bg-white text-gray-600 hover:text-orange-600 hover:bg-orange-50 border border-gray-200 rounded-lg shadow-sm transition-all" title="Edit employee">
                                                    <HiOutlinePencilSquare className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(emp.id)} className="p-2 bg-white text-gray-600 hover:text-red-600 hover:bg-red-50 border border-gray-200 rounded-lg shadow-sm transition-all" title="Delete employee">
                                                    <HiOutlineTrash className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <EmployeeFormModal 
                isOpen={isFormOpen} 
                onClose={() => setIsFormOpen(false)} 
                onSubmit={handleFormSubmit}
                editingEmployee={editingEmployee}
                managersList={managers}
                isLoading={actionLoading}
            />

            <EmployeeDetailsDrawer 
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                employee={viewingEmployee}
            />
        </div>
    );
}
