import { useState, useEffect, useCallback } from 'react';
import { HiOutlineDocumentText, HiOutlineMagnifyingGlass, HiOutlinePlus, HiOutlineTrash, HiOutlinePencilSquare } from 'react-icons/hi2';
import { saLeadsAPI } from '../../services/api';
import SALeadFormModal from '../../components/superadmin/SALeadFormModal';
import { toast } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function SALeadsPage() {
    const [leads, setLeads] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filters & Pagination
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('Pipeline: All');
    const [agentFilter, setAgentFilter] = useState('Agent: All');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    // Modal UI
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page,
                search,
                status: statusFilter,
                agentId: agentFilter,
                limit: 12
            };
            const res = await saLeadsAPI.getAll(params);
            if (res.data.success) {
                setLeads(res.data.data);
                setTotal(res.data.pagination.total);
            }
        } catch (err) {
            console.error('Leads fetch error:', err);
            toast.error('Failed to load leads');
        } finally {
            setLoading(false);
        }
    }, [page, search, statusFilter, agentFilter]);

    const fetchEmployees = async () => {
        try {
            const res = await fetch(`${API_URL}/employees`);
            const data = await res.json();
            if (data.success) setEmployees(data.data);
        } catch (e) { console.error('Error fetching employees'); }
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const handleFormSubmit = async (formData) => {
        try {
            if (editingLead) {
                await saLeadsAPI.update(editingLead.id, formData);
                toast.success('Lead updated');
            } else {
                await saLeadsAPI.create(formData);
                toast.success('Lead logged successfully');
            }
            setIsModalOpen(false);
            setEditingLead(null);
            fetchData();
        } catch (err) {
            toast.error('Error processing lead data');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this lead?')) return;
        try {
            await saLeadsAPI.delete(id);
            toast.success('Lead removed');
            fetchData();
        } catch (err) {
            toast.error('Failed to delete lead');
        }
    };

    const getStatusStyle = (status) => {
        const s = status.toUpperCase();
        if (s === 'NEW') return 'bg-blue-100 text-blue-800 border-blue-200';
        if (s === 'QUALIFIED' || s === 'INTERESTED') return 'bg-indigo-100 text-indigo-800 border-indigo-200';
        if (s === 'CONTACTED') return 'bg-amber-100 text-amber-800 border-amber-200';
        if (s === 'CONVERTED') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        if (s === 'LOST') return 'bg-red-100 text-red-800 border-red-200';
        return 'bg-gray-100 text-gray-800 border-gray-200';
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-red-50 rounded-full blur-3xl -mr-10 -mt-20 opacity-80 pointer-events-none"></div>
                <div className="relative z-10">
                    <h1 className="text-2xl font-black text-surface-900 tracking-tight">Leads & Prospects CRM</h1>
                    <p className="text-sm text-surface-500 font-medium mt-1">Lightweight pipeline to convert prospective businesses before formal onboarding.</p>
                </div>
                <div className="flex gap-3 relative z-10">
                    <button 
                        onClick={() => { setEditingLead(null); setIsModalOpen(true); }}
                        className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white px-6 py-2.5 rounded-2xl font-bold shadow-lg shadow-red-500/30 transition-all hover:scale-105 active:scale-95"
                    >
                        <HiOutlinePlus className="w-5 h-5" />
                        Log New Lead
                    </button>
                </div>
            </div>

            {/* List View */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                {/* CRM Controls */}
                <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-wrap gap-4 items-center justify-between">
                    <div className="relative flex-1 max-w-sm">
                        <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search leads by firm or phone..." 
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all"
                        />
                    </div>
                    <div className="flex gap-3 items-center flex-wrap">
                        <select 
                            value={statusFilter} 
                            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase tracking-widest text-surface-700 outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
                        >
                            <option>Pipeline: All</option>
                            <option value="NEW">New</option>
                            <option value="CONTACTED">Contacted</option>
                            <option value="QUALIFIED">Qualified</option>
                            <option value="CONVERTED">Converted</option>
                            <option value="LOST">Lost</option>
                        </select>
                        <select 
                            value={agentFilter} 
                            onChange={e => { setAgentFilter(e.target.value); setPage(1); }}
                            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase tracking-widest text-surface-700 outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
                        >
                            <option>Agent: All</option>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-12 text-center text-gray-400 font-black uppercase tracking-[0.2em] text-xs">Querying Lead Matrix...</div>
                    ) : leads.length === 0 ? (
                        <div className="p-20 text-center">
                            <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <HiOutlineDocumentText className="w-8 h-8 text-gray-200" />
                            </div>
                            <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No Active Prospect Records Found</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-[950px]">
                            <thead className="bg-white">
                                <tr className="border-b border-gray-100 text-[10px] font-black text-surface-400 uppercase tracking-widest bg-gray-50/20">
                                    <th className="px-6 py-4">Prospective Client</th>
                                    <th className="px-6 py-4">Contact Detail</th>
                                    <th className="px-6 py-4">Origin Hub</th>
                                    <th className="px-6 py-4">Handling Agent</th>
                                    <th className="px-6 py-4 text-center">Status & Pipeline</th>
                                    <th className="px-6 py-4 text-right">Directives</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-50">
                                {leads.map(lead => (
                                    <tr key={lead.id} className="hover:bg-red-50/10 transition-colors group cursor-pointer border-l-4 border-l-transparent hover:border-l-red-500">
                                        <td className="px-6 py-6" onClick={() => { setEditingLead(lead); setIsModalOpen(true); }}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center font-black text-gray-400 uppercase text-xs group-hover:bg-red-50 group-hover:text-red-500 transition-colors">
                                                    {lead.businessName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-surface-900 group-hover:text-red-600 transition-colors text-base">{lead.businessName}</p>
                                                    <p className="text-[10px] font-bold text-surface-400 font-mono tracking-tight mt-0.5 uppercase tracking-widest">{lead.contactName}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 font-bold text-surface-700">
                                            <p className="text-xs font-black text-surface-800">{lead.phone}</p>
                                            <p className="text-[10px] font-bold text-gray-400 mt-1">{lead.email || 'NO_MAIL'}</p>
                                        </td>
                                        <td className="px-6 py-6 font-bold text-surface-700">
                                            <span className="px-2.5 py-1 bg-gray-50 text-gray-500 font-black text-[9px] uppercase tracking-wider rounded-lg border border-gray-200">{lead.source || 'ORGANIC'}</span>
                                        </td>
                                        <td className="px-6 py-6 font-black text-surface-600 text-xs">
                                            {lead.employee ? (
                                                <div>
                                                    <p className="text-surface-900 font-black">{lead.employee.name}</p>
                                                    <p className="text-[9px] text-gray-400 uppercase">{lead.employee.role}</p>
                                                </div>
                                            ) : <span className="text-gray-300 italic text-[10px]">UNASSIGNED</span>}
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-sm ${getStatusStyle(lead.status)}`}>
                                                {lead.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setEditingLead(lead); setIsModalOpen(true); }}
                                                    className="p-2.5 bg-white text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-100 rounded-xl shadow-sm transition-all"
                                                >
                                                    <HiOutlinePencilSquare className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(lead.id); }}
                                                    className="p-2.5 bg-white text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-100 rounded-xl shadow-sm transition-all"
                                                >
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

                {/* Modern Pagination */}
                <div className="border-t border-gray-100 p-6 bg-gray-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Matrix Load Page</span>
                         <span className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs font-black text-surface-800">{page}</span>
                         <span className="text-[10px] font-black text-gray-400 uppercase">of {Math.ceil(total / 12) || 1}</span>
                    </div>
                    <div className="flex gap-3">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-all">Previous</button>
                        <button disabled={page >= Math.ceil(total / 12)} onClick={() => setPage(p => p + 1)} className="px-8 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-all">Load More Records</button>
                    </div>
                </div>
            </div>

            <SALeadFormModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleFormSubmit}
                editingLead={editingLead}
                employees={employees}
            />
        </div>
    );
}
