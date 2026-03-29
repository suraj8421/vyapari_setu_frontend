import { useState } from 'react';
import { HiOutlineCheckBadge, HiOutlineBanknotes, HiOutlineDocumentCheck } from 'react-icons/hi2';

export default function SAPaymentsPage() {
    const [activeTab, setActiveTab] = useState('online');

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
                               <tr className="hover:bg-emerald-50/50 transition-colors">
                                   <td className="px-6 py-5 font-bold text-surface-600">20 Oct 2026<br/><span className="text-[10px] text-surface-400 uppercase tracking-widest">14:05:22 IST</span></td>
                                   <td className="px-6 py-5">
                                       <p className="font-black text-surface-900">Sharma Retailers</p>
                                       <p className="text-xs font-bold text-gray-400 font-mono">USR-MH-001</p>
                                   </td>
                                   <td className="px-6 py-5"><span className="px-3 py-1 bg-blue-100 text-blue-800 font-black text-[10px] uppercase tracking-widest rounded shadow-sm border border-blue-200">Gold Plan</span></td>
                                   <td className="px-6 py-5 font-mono text-xs font-black text-emerald-700 tracking-tight flex items-center gap-2 mt-3">
                                       <HiOutlineCheckBadge className="w-4 h-4 text-emerald-500" /> pay_L98x21zA
                                   </td>
                                   <td className="px-6 py-5 text-right font-black text-surface-900 text-lg">₹4,999<span className="text-xs text-green-500 ml-1">✔</span></td>
                               </tr>
                           </tbody>
                       </table>
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
                               <tr className="hover:bg-red-50/30 transition-colors">
                                   <td className="px-6 py-5 font-bold text-surface-600">19 Oct 2026</td>
                                   <td className="px-6 py-5">
                                       <p className="font-black text-surface-900">Gupta Traders</p>
                                       <p className="text-xs font-bold text-purple-600 font-mono mt-0.5 border border-purple-200 bg-purple-50 inline-block px-1.5 py-0.5 rounded">BDE: Raj (EMP-11)</p>
                                   </td>
                                   <td className="px-6 py-5">
                                       <span className="inline-flex items-center px-3 py-1.5 rounded bg-gray-100 text-gray-700 font-black text-[10px] uppercase tracking-wider border border-gray-200 shadow-inner">
                                           Physical Cash
                                       </span>
                                   </td>
                                   <td className="px-6 py-5 text-right font-black text-surface-900 text-lg">₹8,999</td>
                                   <td className="px-6 py-5 text-center">
                                       <div className="flex items-center justify-center gap-2">
                                           <button className="px-3 py-1.5 font-bold text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 rounded shadow-sm">APPROVE</button>
                                           <button className="px-3 py-1.5 font-bold text-xs bg-red-100 text-red-800 border border-red-300 hover:bg-red-200 rounded shadow-sm">REJECT</button>
                                       </div>
                                   </td>
                               </tr>
                           </tbody>
                       </table>
                    </div>
                )}
            </div>
        </div>
    );
}
