import { HiOutlineServerStack, HiOutlineKey, HiOutlinePaintBrush } from 'react-icons/hi2';

export default function SASettingsPage() {
    return (
        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
            {/* Header */}
            <div className="border-b-2 border-surface-200 pb-5">
                <h1 className="text-3xl font-black text-surface-900 tracking-tighter">System Configuration</h1>
                <p className="text-base font-semibold text-surface-500 mt-2">Adjust core behavior, visual overrides, and gateway hooks.</p>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center gap-4 bg-gray-50/50">
                    <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                        <HiOutlineKey className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-surface-900">Payment Gateway Links</h2>
                        <p className="text-sm font-semibold text-surface-500">Configure core keys for automated billing (Razorpay/Stripe)</p>
                    </div>
                </div>
                <div className="p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                             <label className="text-xs font-black text-surface-400 uppercase tracking-widest">Live Secret Key</label>
                             <input type="password" value="rzp_live_xxxxxxxxxxx" disabled className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-mono text-sm text-gray-500" />
                        </div>
                        <div className="space-y-2">
                             <label className="text-xs font-black text-surface-400 uppercase tracking-widest">Webhook Pathing</label>
                             <input type="text" value="https://api.vyaparisetu.com/webhooks/rzp" disabled className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-mono text-sm text-gray-500" />
                        </div>
                    </div>
                    <button className="px-5 py-2.5 rounded-xl border border-red-200 text-red-600 font-bold hover:bg-red-50 transition-colors">Invoke Key Rotation (Restricted)</button>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                 <div className="p-6 border-b border-gray-100 flex items-center gap-4 bg-gray-50/50">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                        <HiOutlineServerStack className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-surface-900">Feature Toggles</h2>
                        <p className="text-sm font-semibold text-surface-500">Disable specific sub-modules aggressively during outages or maintenance</p>
                    </div>
                </div>
                <div className="p-6 divide-y divide-gray-100">
                     {[
                         { id: 1, label: 'B2B Network Purchasing App', status: 'Enabled', color: 'bg-emerald-500' },
                         { id: 2, label: 'Razorpay Checkout Overlay', status: 'Enabled', color: 'bg-emerald-500' },
                         { id: 3, label: 'Background Sync Quoting', status: 'Disabled', color: 'bg-gray-300' }
                     ].map(toggle => (
                         <div key={toggle.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                              <span className="font-bold text-surface-700">{toggle.label}</span>
                              <div className="flex items-center gap-3">
                                  <span className="text-xs font-bold text-surface-400 uppercase tracking-widest">{toggle.status}</span>
                                  <div className={`w-12 h-6 rounded-full relative ${toggle.status === 'Enabled' ? 'bg-emerald-500' : 'bg-gray-200'} cursor-pointer transition-colors shadow-inner border border-black/5`}>
                                      <div className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow transition-all ${toggle.status === 'Enabled' ? 'left-[26px]' : 'left-1'}`}></div>
                                  </div>
                              </div>
                         </div>
                     ))}
                </div>
            </div>
            
            <p className="text-xs text-center font-bold text-gray-400 uppercase tracking-widest mt-10">VyapariSetu Core • Admin OS Build v1.42.0 • Region: IN</p>
        </div>
    );
}
