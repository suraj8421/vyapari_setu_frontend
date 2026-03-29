import { HiOutlineDocumentArrowDown, HiOutlineFunnel } from 'react-icons/hi2';
import { saReportsAPI, saLeadsAPI } from '../../services/api';
import { toast } from 'react-hot-toast';

export default function SAReportsPage() {
    
    const handleExport = async (type) => {
        try {
            let res;
            let filename = `${type}_report_${new Date().toISOString().split('T')[0]}.csv`;

            toast.loading(`Extracting ${type} payload...`, { id: 'export' });

            if (type === 'clients') res = await saReportsAPI.exportClients();
            else if (type === 'employees') res = await saReportsAPI.exportEmployees();
            else if (type === 'payments') res = await saReportsAPI.exportPayments();
            else if (type === 'subscriptions') res = await saReportsAPI.exportSubscriptions();
            else if (type === 'leads') res = await saLeadsAPI.export();

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            
            toast.success(`${type} payload extracted!`, { id: 'export' });
        } catch (err) {
            console.error('Export failed:', err);
            toast.error('Failed to extract report', { id: 'export' });
        }
    };

    const modules = [
        { id: 'clients', title: 'Global Client Audit', desc: 'Full business profiles mapped with active validity, assignments, and historical logging.', color: 'red' },
        { id: 'employees', title: 'Sales Force Efficacy', desc: 'Hierarchy node performance, client-agent volume, and regional conversion rates.', color: 'indigo' },
        { id: 'payments', title: 'Payment Pipeline Ledger', desc: 'Razorpay traces versus Escrow drafts, complete with temporal filters.', color: 'emerald' },
        { id: 'subscriptions', title: 'Subscription Density', desc: 'Volume clustering of tiers, plan-wise MRR, and expiry vulnerability logs.', color: 'blue' },
        { id: 'leads', title: 'Leads Volume', desc: 'Conversion ratios against source channels separated by assignment nodes.', color: 'amber' },
    ];

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-gray-50 rounded-full blur-3xl -mr-10 -mt-20 opacity-80 pointer-events-none"></div>
                <div className="relative z-10">
                    <h1 className="text-3xl font-black text-surface-900 tracking-tight">Reports & Analytical Exports</h1>
                    <p className="text-sm text-surface-500 font-medium mt-1 uppercase tracking-widest leading-loose">Configure advanced filters to extract targeted datasets for auditing.</p>
                </div>
            </div>

            {/* Content Switcher */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map((mod, i) => (
                    <div key={i} className="bg-white rounded-[2.5rem] border border-gray-100 p-8 flex flex-col justify-between hover:shadow-xl transition-all shadow-sm group relative overflow-hidden">
                        <div className={`absolute -right-4 -top-4 w-24 h-24 bg-${mod.color}-50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                        
                        <div className="relative z-10 font-sans">
                            <div className={`w-14 h-14 bg-${mod.color}-100 text-${mod.color}-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm`}>
                                <HiOutlineDocumentArrowDown className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl font-black text-surface-900 mb-3 tracking-tight">{mod.title}</h3>
                            <p className="text-sm font-bold text-surface-400 mb-8 leading-relaxed italic">{mod.desc}</p>
                        </div>
                        
                        <div className="space-y-4 relative z-10">
                            <button className={`disabled w-full py-3 rounded-2xl border-2 border-${mod.color}-100 bg-white text-surface-400 font-black text-[10px] uppercase tracking-[0.2em] transition-colors flex items-center justify-center gap-2 cursor-not-allowed opacity-50`}>
                                <HiOutlineFunnel className="w-4 h-4" /> constraints locked
                            </button>
                            <button 
                                onClick={() => handleExport(mod.id)}
                                className={`w-full py-4 rounded-2xl bg-${mod.color}-600 text-white font-black uppercase tracking-[0.2em] text-[10px] hover:bg-${mod.color}-700 shadow-lg shadow-${mod.color}-500/30 transition-all hover:scale-[1.02] active:scale-95`}
                            >
                                Extract Payload .CSV
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
