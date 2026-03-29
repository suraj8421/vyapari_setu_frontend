import { useState, useEffect } from 'react';
import { 
    HiOutlinePlus, HiOutlineMagnifyingGlass, HiOutlinePencilSquare, 
    HiOutlineEye, HiOutlineTrash, HiOutlineDocumentArrowDown 
} from 'react-icons/hi2';
import OnboardingForm from '../../components/superadmin/OnboardingForm';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function SAOnboardingPage() {
    const [view, setView] = useState('list'); // 'list' | 'form'
    const [onboardings, setOnboardings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingDraft, setEditingDraft] = useState(null);

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Status');

    useEffect(() => {
        if (view === 'list') {
            fetchOnboardings();
        }
    }, [view, search, statusFilter]);

    const fetchOnboardings = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();
            if (statusFilter !== 'All Status') queryParams.append('status', statusFilter);
            if (search) queryParams.append('search', search);

            const res = await fetch(`${API_URL}/onboarding?${queryParams.toString()}`);
            const data = await res.json();
            if (data.success) {
                setOnboardings(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch onboardings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (record) => {
        setEditingDraft(record);
        setView('form');
    };

    const handleDelete = async (id) => {
        if (!confirm('Permanently delete this onboarding record?')) return;
        try {
            const res = await fetch(`${API_URL}/onboarding/${id}`, { method: 'DELETE' });
            if (res.ok) fetchOnboardings();
        } catch (e) {
            console.error(e);
        }
    };

    const handleFormComplete = (data, finalStatus) => {
        setView('list');
        setEditingDraft(null);
        if (finalStatus === 'COMPLETED') {
            // Future post-actions: trigger receipt email, webhook, etc here natively.
            alert('Onboarding Completed! Store Provisioned.');
        } else {
            alert(`Draft Saved / Marked as ${finalStatus}`);
        }
    };

    if (view === 'form') {
        return (
            <div className="max-w-6xl mx-auto animate-fade-in relative z-10 pb-10">
                <OnboardingForm 
                    initialData={editingDraft} 
                    onClose={() => { setView('list'); setEditingDraft(null); }} 
                    onComplete={handleFormComplete} 
                />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in relative pb-10 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-red-50 rounded-full blur-3xl -mr-10 -mt-20 opacity-80 pointer-events-none"></div>
                <div className="relative z-10">
                    <h1 className="text-2xl font-black text-surface-900 tracking-tight">Onboarding Operations</h1>
                    <p className="text-sm text-surface-500 font-medium mt-1">Manage master store records, draft entries, and provision target entities.</p>
                </div>
                <div className="relative z-10">
                    <button onClick={() => { setEditingDraft(null); setView('form'); }} className="flex items-center gap-2 btn-primary bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-red-500/30 transition-all">
                        <HiOutlinePlus className="w-5 h-5" />
                        Initiate Intake
                    </button>
                </div>
            </div>

            {/* List View Container */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-wrap gap-4 items-center justify-between">
                    <div className="relative flex-1 max-w-md">
                        <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Find business code, name or phone..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all text-surface-900"
                        />
                    </div>
                    <div>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-surface-700 outline-none focus:ring-2 focus:ring-red-500/50">
                            <option>All Status</option>
                            <option value="DRAFT">Draft Setup</option>
                            <option value="PAYMENT_PENDING">Payment Pending</option>
                            <option value="COMPLETED">Provisioned & Live</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[300px]">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">Querying Matrix...</div>
                    ) : onboardings.length === 0 ? (
                        <div className="p-12 text-center text-surface-400 font-black text-sm uppercase tracking-widest bg-gray-50/30 border border-gray-100 border-dashed rounded-xl m-4">
                            No onboarding records mapped in system.
                        </div>
                    ) : (
                        <table className="w-full text-left min-w-[1000px]">
                            <thead className="bg-white">
                                <tr className="border-b border-gray-100 text-[10px] font-black text-surface-400 uppercase tracking-widest bg-gray-50/20">
                                    <th className="px-6 py-4">Entity Identity</th>
                                    <th className="px-6 py-4">Contact Protocol</th>
                                    <th className="px-6 py-4">Financial Log</th>
                                    <th className="px-6 py-4 text-center">Lifecycle Status</th>
                                    <th className="px-6 py-4 text-right">Directives</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-50">
                                {onboardings.map(item => (
                                    <tr key={item.id} className="hover:bg-red-50/30 transition-colors group">
                                        <td className="px-6 py-5">
                                            <p className="font-black text-surface-900 group-hover:text-red-600 transition-colors">{item.businessName}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                {item.plan && <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-black border border-indigo-100">{item.plan.name}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="text-sm font-bold text-surface-700">{item.ownerName}</p>
                                            <p className="text-xs font-semibold text-gray-500 mt-1 flex items-center gap-1.5">{item.phoneNumber}</p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-black text-surface-900 border border-gray-200 bg-white rounded-md px-1.5 py-0.5 inline-block w-max">TOTAL: ₹{item.totalAmount || 0}</span>
                                                <span className={`text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded w-max border ${item.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                                    DUE: ₹{item.dueAmount || 0}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${
                                                item.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                item.status === 'DRAFT' ? 'bg-gray-100 text-gray-600 border-gray-300' :
                                                'bg-amber-50 text-amber-700 border-amber-200'
                                            }`}>
                                                {item.status.replace('_', ' ')}
                                            </span>
                                            {item.collectedBy && <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">Logged by: {item.collectedBy.name}</p>}
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEdit(item)} className="p-2 bg-white text-gray-500 hover:text-red-500 hover:bg-red-50 border border-gray-100 rounded-lg shadow-sm transition-all" title="Review & Edit Draft">
                                                    <HiOutlinePencilSquare className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className="p-2 bg-white text-gray-500 hover:text-red-500 hover:bg-red-50 border border-gray-100 rounded-lg shadow-sm transition-all" title="Scrap Record">
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
        </div>
    );
}
