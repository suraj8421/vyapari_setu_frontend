import { useState, useEffect } from 'react';
import { HiOutlineCheckBadge, HiOutlineBanknotes, HiOutlineDocumentCheck } from 'react-icons/hi2';
import { saUserAPI } from '../../services/api';

export default function SAPaymentsPage() {
    const [activeTab, setActiveTab] = useState('online');
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState([]);

    useEffect(() => {
        const fetchPayments = async () => {
            try {
                console.log('[SA-Payments] Fetching payment history...');
                const res = await saUserAPI.getPayments();
                console.log('[SA-Payments] Received data:', res.data);
                if (res.data.success) {
                    setPayments(res.data.data);
                }
            } catch (e) { 
                console.error('Failed to fetch payments', e); 
            }
            finally { setLoading(false); }
        };
        fetchPayments();
    }, []);

    const manualPayments = payments.filter(p => p.method !== 'ONLINE');
    const onlinePayments = payments.filter(p => p.method === 'ONLINE');

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-surface-900 tracking-tight">Financial Operations</h1>
                    <p className="text-sm text-surface-500 font-medium mt-1">Audit automated gateway traces and enforce manual cash approval checks from field agents.</p>
                </div>
                <div className="flex bg-gray-100 p-1.5 rounded-2xl shadow-inner border border-gray-200">
                    <button 
                        onClick={() => setActiveTab('online')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${activeTab === 'online' ? 'bg-white text-emerald-700 shadow-md ring-1 ring-black/5' : 'text-surface-500 hover:bg-gray-50'}`}
                    >
                        <HiOutlineCheckBadge className="w-5 h-5" />
                        Online Gateways
                    </button>
                    <button 
                        onClick={() => setActiveTab('manual')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${activeTab === 'manual' ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-md ring-1 ring-red-500/50' : 'text-surface-500 hover:bg-gray-50'}`}
                    >
                        <HiOutlineBanknotes className="w-5 h-5" />
                        Manual Handover
                    </button>
                </div>
            </div>

            {/* Content Switcher */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                
                {activeTab === 'online' && (
                    <div className="animate-slide-up h-full">
                       <div className="p-6 border-b border-gray-100 bg-emerald-50/30 flex justify-between items-center">
                           <h2 className="text-lg font-black text-emerald-900 flex items-center gap-2"><div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div> Verified System Webhooks</h2>
                           <span className="font-bold text-sm text-emerald-700 uppercase tracking-widest px-3 py-1 bg-emerald-100 rounded-lg">Razorpay / Stripe Log</span>
                       </div>
                       <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white">
                                <tr className="border-b border-gray-100 text-xs font-black text-surface-400 uppercase tracking-widest">
                                    <th className="px-6 py-5">Verified Txn Date</th>
                                    <th className="px-6 py-5">Client Source</th>
                                    <th className="px-6 py-5">Subscribed Plan</th>
                                    <th className="px-6 py-5 font-mono">Gateway Trace ID</th>
                                    <th className="px-6 py-5 text-right">Settled Amount</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-50">
                                {onlinePayments.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-20 text-center text-surface-500 font-medium italic">
                                            No verified online transactions found.
                                        </td>
                                    </tr>
                                ) : (
                                    onlinePayments.map((p) => (
                                        <tr key={p.id} className="hover:bg-emerald-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-surface-700">{new Date(p.createdAt).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 font-bold text-surface-900">{p.user?.firstName} {p.user?.lastName}</td>
                                            <td className="px-6 py-4 font-semibold text-emerald-600">{p.subscription?.plan?.name || 'Manual'}</td>
                                            <td className="px-6 py-4 font-mono text-xs text-gray-400">{p.paymentId}</td>
                                            <td className="px-6 py-4 text-right font-black text-surface-900">₹{(p.amount / 100).toLocaleString('en-IN')}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                       </div>
                    </div>
                )}

                {activeTab === 'manual' && (
                    <div className="animate-slide-up h-full">
                       <div className="p-6 border-b border-gray-100 bg-orange-50/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                           <div>
                               <h2 className="text-lg font-black text-orange-900 flex items-center gap-2"><HiOutlineDocumentCheck className="w-5 h-5 text-orange-600" /> Admin Approval Desk</h2>
                               <p className="text-sm font-semibold text-orange-700 mt-1">Cross-check field cash collections or direct bank transfers.</p>
                           </div>
                           <button className="btn-primary bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-red-500/30">
                              + Log Manual Draft
                           </button>
                       </div>
                       <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white">
                                <tr className="border-b border-gray-100 text-xs font-black text-surface-400 uppercase tracking-widest">
                                    <th className="px-6 py-5">Draft Date</th>
                                    <th className="px-6 py-5">Target Client</th>
                                    <th className="px-6 py-5">Collection Medium</th>
                                    <th className="px-6 py-5 text-right">Escrow Auth Amount</th>
                                    <th className="px-6 py-5 text-center">Approvals</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-gray-50">
                                {manualPayments.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-20 text-center text-surface-500 font-medium italic">
                                            No manual handover drafts pending approval.
                                        </td>
                                    </tr>
                                ) : (
                                    manualPayments.map((p) => (
                                        <tr key={p.id} className="hover:bg-red-50/30 transition-colors">
                                            <td className="px-6 py-4 font-bold text-surface-700">{new Date(p.createdAt).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 font-bold text-surface-900">{p.user?.firstName} {p.user?.lastName}</td>
                                            <td className="px-6 py-4 font-semibold text-red-600 uppercase tracking-tighter">{p.method}</td>
                                            <td className="px-6 py-4 text-right font-black text-surface-900">₹{(p.amount / 100).toLocaleString('en-IN')}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg font-black text-[10px] uppercase">Verified</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                       </div>
                    </div>
                )}
            </div>
        </div>
    );
}
