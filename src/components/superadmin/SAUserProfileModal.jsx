import { useState, useEffect } from 'react';
import { 
    HiOutlineXMark, HiOutlineBanknotes, HiOutlineClock, 
    HiOutlineArrowPathRoundedSquare, HiOutlinePencilSquare,
    HiOutlineCheck, HiOutlineTrash
} from 'react-icons/hi2';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function SAUserProfileModal({ user, onClose }) {
    const [activeTab, setActiveTab] = useState('Overview');
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isModifying, setIsModifying] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    // Derived Lookups
    const [plans, setPlans] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [editForm, setEditForm] = useState({});

    useEffect(() => {
        fetchProfile();
        fetchLookupData(); // Always fetch employees for assignment
    }, [activeTab]);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/sa-users/${user.id}`);
            const data = await res.json();
            if (data.success) {
                setProfileData(data.data);
                setEditForm({
                    firstName: data.data.firstName,
                    lastName: data.data.lastName,
                    phone: data.data.phone,
                    notes: data.data.notes,
                    assignedAgentId: data.data.assignedAgentId || '',
                    storeDetails: {
                        name: data.data.store?.name || '',
                        address: data.data.store?.address || '',
                        city: data.data.store?.city || '',
                        state: data.data.store?.state || '',
                        pincode: data.data.store?.pincode || ''
                    }
                });
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const fetchLookupData = async () => {
        try {
            const [plnRes, empRes] = await Promise.all([
                fetch(`${API_URL}/plans`), fetch(`${API_URL}/employees`)
            ]);
            const [plnData, empData] = await Promise.all([plnRes.json(), empRes.json()]);
            if (plnData.success) setPlans(plnData.data.filter(p => p.isActive));
            if (empData.success) setEmployees(empData.data);
        } catch (e) { console.error('Lookup failed'); }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setIsModifying(true);
        try {
            const res = await fetch(`${API_URL}/sa-users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm)
            });
            if (res.ok) {
                setIsEditing(false);
                fetchProfile();
            }
        } catch (e) { alert('Update failed'); } finally { setIsModifying(false); }
    };

    const handleDelete = async (hardData = false) => {
        if (!confirm(`Are you sure you want to ${hardData ? 'PERMANENTLY' : 'soft'} delete this user?`)) return;
        setIsModifying(true);
        try {
            const url = hardData ? `${API_URL}/sa-users/${user.id}/hard` : `${API_URL}/sa-users/${user.id}`;
            await fetch(url, { method: 'DELETE' });
            onClose(true);
        } catch (e) { alert('Delete failed'); } finally { setIsModifying(false); }
    };

    const changeStatus = async (status) => {
        setIsModifying(true);
        try {
            await fetch(`${API_URL}/sa-users/${user.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            fetchProfile();
        } catch (e) { alert('Failed'); } finally { setIsModifying(false); }
    };

    const addManualPayment = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        setIsModifying(true);
        try {
            await fetch(`${API_URL}/sa-users/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    amount: fd.get('amount'),
                    method: fd.get('method'),
                    notes: fd.get('notes')
                })
            });
            e.target.reset();
            fetchProfile();
            setActiveTab('Overview'); 
        } finally { setIsModifying(false); }
    };

    const assignPlan = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        setIsModifying(true);
        try {
            await fetch(`${API_URL}/sa-users/subscriptions/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    planId: fd.get('planId'),
                    durationMonths: fd.get('duration')
                })
            });
            fetchProfile();
        } finally { setIsModifying(false); }
    };

    if (loading && !profileData) {
        return (
            <div className="fixed inset-0 bg-surface-900/60 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-2xl flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="font-black text-gray-400 uppercase tracking-widest text-xs">Accessing Matrix Profile...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-surface-900/60 backdrop-blur-sm z-50 flex justify-end animate-fade-in relative z-50">
            <div className="bg-white w-full max-w-4xl h-full shadow-2xl flex flex-col relative animate-slide-in-right border-l-4 border-red-500">
                
                {/* Header */}
                <div className="bg-surface-50 p-6 border-b border-gray-100 flex items-start justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-100/50 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                    <div className="relative z-10 flex gap-5">
                        <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 text-white rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg shadow-red-500/30">
                            {profileData.firstName?.charAt(0) || 'C'}
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-surface-900 tracking-tight">{profileData.firstName} {profileData.lastName}</h2>
                            <p className="text-sm font-bold text-gray-500 font-mono tracking-tight">{profileData.store?.name || 'Unbound Entity'}</p>
                            
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${
                                    profileData.platformStatus === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    profileData.platformStatus === 'INACTIVE' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    profileData.platformStatus === 'DELETED' ? 'bg-red-50 text-red-700 border-red-200' :
                                    'bg-gray-100 text-gray-600 border-gray-300'
                                }`}>{profileData.platformStatus}</span>
                                <span className="text-[10px] font-bold text-gray-400">ID: {profileData.userCode || profileData.id.split('-')[0]}</span>
                            </div>
                        </div>
                    </div>
                
                    <div className="flex gap-2 relative z-10">
                        <button onClick={() => setIsEditing(!isEditing)} className={`p-2 rounded-xl transition-all ${isEditing ? 'bg-red-600 text-white' : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'}`}>
                            {isEditing ? <HiOutlineXMark className="w-5 h-5" /> : <HiOutlinePencilSquare className="w-5 h-5" />}
                        </button>
                        <button onClick={() => onClose(true)} className="p-2 bg-white text-gray-500 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                            <HiOutlineXMark className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-6">
                    {['Overview', 'Payments', 'Subscriptions', 'Settings'].map(tab => (
                        <button 
                            key={tab} 
                            onClick={() => setActiveTab(tab)}
                            className={`px-5 py-4 text-sm font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-red-500 text-red-600' : 'border-transparent text-gray-400 hover:text-surface-700'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-white/50 space-y-6">
                    {activeTab === 'Overview' && (
                        <div className="space-y-6 animate-fade-in">
                            {isEditing ? (
                                <form onSubmit={handleUpdateProfile} className="space-y-6 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase">First Name</label><input required className="w-full form-input mt-1" value={editForm.firstName} onChange={e => setEditForm({...editForm, firstName: e.target.value})} /></div>
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase">Last Name</label><input required className="w-full form-input mt-1" value={editForm.lastName} onChange={e => setEditForm({...editForm, lastName: e.target.value})} /></div>
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase">Phone</label><input required className="w-full form-input mt-1" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} /></div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase">Assign Manager</label>
                                            <select className="w-full form-input mt-1" value={editForm.assignedAgentId} onChange={e => setEditForm({...editForm, assignedAgentId: e.target.value})}>
                                                <option value="">No Assignment</option>
                                                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2"><label className="text-[10px] font-black text-gray-400 uppercase">Business Name</label><input required className="w-full form-input mt-1" value={editForm.storeDetails.name} onChange={e => setEditForm({...editForm, storeDetails: {...editForm.storeDetails, name: e.target.value}})} /></div>
                                        <div className="md:col-span-2"><label className="text-[10px] font-black text-gray-400 uppercase">Account Notes</label><textarea className="w-full form-input mt-1 h-20 pt-2" value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} /></div>
                                    </div>
                                    <button disabled={isModifying} type="submit" className="w-full py-3 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 hover:bg-red-700 transition-all">
                                        <HiOutlineCheck className="w-5 h-5"/> {isModifying ? 'Updating...' : 'Commit Changes'}
                                    </button>
                                </form>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                                            <p className="text-xs font-bold text-gray-500 uppercase">Contact Core</p>
                                            <p className="text-sm font-bold text-surface-900 mt-2">{profileData.phone}</p>
                                            <p className="text-sm font-semibold text-gray-500">{profileData.email}</p>
                                        </div>
                                        <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                                            <p className="text-xs font-bold text-gray-500 uppercase">Lifecycle Alignment</p>
                                            <p className="text-sm font-black text-surface-800 mt-2">{profileData.assignedAgent?.name || 'UNASSIGNED MATRIX'}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Provisioned Manager</p>
                                        </div>
                                        <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 col-span-2">
                                            <p className="text-xs font-bold text-gray-500 uppercase">Account Analytics</p>
                                            <p className="text-sm font-semibold text-surface-700 mt-2 italic">{profileData.notes || 'No CRM logging attached to this entity.'}</p>
                                        </div>
                                    </div>

                                    <div className="p-5 border border-indigo-100 bg-indigo-50/30 rounded-2xl">
                                        <h3 className="text-sm font-black text-indigo-900 uppercase tracking-widest mb-4">Operations Directives</h3>
                                        <div className="flex gap-3">
                                            {profileData.platformStatus !== 'ACTIVE' && (
                                                <button onClick={() => changeStatus('ACTIVE')} disabled={isModifying} className="px-4 py-2 bg-emerald-50 text-emerald-700 font-bold text-xs uppercase rounded-lg border border-emerald-200 hover:bg-emerald-100">Activate Account</button>
                                            )}
                                            {profileData.platformStatus !== 'INACTIVE' && (
                                                <button onClick={() => changeStatus('INACTIVE')} disabled={isModifying} className="px-4 py-2 bg-amber-50 text-amber-700 font-bold text-xs uppercase rounded-lg border border-amber-200 hover:bg-amber-100">Suspend Matrix</button>
                                            )}
                                            <button onClick={() => handleDelete(false)} disabled={isModifying} className="px-4 py-2 bg-red-50 text-red-700 font-bold text-xs uppercase rounded-lg border border-red-200 hover:bg-red-100">Scrap Entity</button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'Payments' && (
                        <div className="space-y-6 animate-fade-in">
                            <form onSubmit={addManualPayment} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 rounded-2xl border border-emerald-100 bg-emerald-50/20">
                                <div className="md:col-span-4"><h3 className="text-xs font-black text-emerald-800 uppercase tracking-widest">Post Manual Invoice Override</h3></div>
                                <div><label className="text-[10px] font-bold text-emerald-600 uppercase">Credit Amount (₹)</label><input required name="amount" type="number" className="w-full form-input mt-1" /></div>
                                <div><label className="text-[10px] font-bold text-emerald-600 uppercase">Protocol</label><select name="method" className="w-full form-input mt-1"><option>CASH</option><option>RAZORPAY</option><option>UPI</option></select></div>
                                <div><label className="text-[10px] font-bold text-emerald-600 uppercase">Txn Logging Note</label><input required name="notes" className="w-full form-input mt-1" placeholder="Internal Ref..." /></div>
                                <div className="flex items-end"><button disabled={isModifying} type="submit" className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase rounded-xl transition-colors">Post Credit</button></div>
                            </form>

                            <h3 className="text-lg font-black text-surface-900 pt-4 border-t border-gray-100">Financial Ledger Tracker</h3>
                            <div className="space-y-3 pb-8">
                                {profileData.systemPayments?.length === 0 ? <p className="text-xs text-gray-500 font-bold">No payments detected on matrix.</p> : 
                                profileData.systemPayments.map(p => (
                                    <div key={p.id} className="p-4 rounded-xl border border-gray-100 bg-white flex justify-between items-center shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center"><HiOutlineBanknotes className="w-5 h-5"/></div>
                                            <div>
                                                <p className="text-sm font-black text-surface-900">₹{parseFloat(p.amount).toLocaleString('en-IN')}</p>
                                                <p className="text-[10px] uppercase font-bold text-gray-400">{new Date(p.createdAt).toLocaleString()} via {p.method}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[9px] bg-emerald-50 text-emerald-700 font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-emerald-100">{p.status}</span>
                                            <p className="text-[10px] italic text-gray-500 mt-1 max-w-[150px] truncate">{p.paymentId}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'Subscriptions' && (
                        <div className="space-y-6 animate-fade-in">
                            <form onSubmit={assignPlan} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 rounded-2xl border border-indigo-100 bg-indigo-50/20">
                                <div className="md:col-span-4"><h3 className="text-xs font-black text-indigo-800 uppercase tracking-widest">Extend Platform Subscription</h3></div>
                                <div className="md:col-span-2">
                                    <label className="text-[10px] font-bold text-indigo-600 uppercase">Target Plan Protocol</label>
                                    <select required name="planId" className="w-full form-input mt-1">
                                        <option value="">Select Protocol</option>
                                        {plans.map(p => <option key={p.id} value={p.id}>{p.name} (Base: {p.durationMonths}m)</option>)}
                                    </select>
                                </div>
                                <div><label className="text-[10px] font-bold text-indigo-600 uppercase">Override Months</label><input required name="duration" type="number" defaultValue={12} className="w-full form-input mt-1" /></div>
                                <div className="flex items-end"><button disabled={isModifying} type="submit" className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase rounded-xl transition-colors">Bind Module</button></div>
                            </form>

                            <h3 className="text-lg font-black text-surface-900 pt-4 border-t border-gray-100">Subscription Matrix</h3>
                            <div className="space-y-3 pb-8">
                                {profileData.clientSubscriptions?.length === 0 ? <p className="text-xs text-gray-500 font-bold">No active subscriptions detected.</p> : 
                                profileData.clientSubscriptions.map(s => (
                                    <div key={s.id} className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="text-sm font-black text-surface-900">{s.plan.name}</h4>
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border ${
                                                s.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'
                                            }`}>{s.status}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs font-semibold text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                            <span>Began: {new Date(s.startDate).toLocaleDateString()}</span>
                                            <HiOutlineArrowPathRoundedSquare className="w-4 h-4 text-gray-400" />
                                            <span className={new Date(s.endDate) < new Date() ? 'text-red-500 font-bold' : 'text-emerald-600 font-bold'}>Expiry: {new Date(s.endDate).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'Settings' && (
                        <div className="p-10 space-y-8 animate-fade-in">
                            <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                                <h4 className="text-red-700 font-black uppercase tracking-widest text-sm flex items-center gap-2 mb-2">
                                    <HiOutlineTrash className="w-5 h-5" /> Danger Protocol Zone
                                </h4>
                                <p className="text-xs font-bold text-red-600 mb-6">These actions are irreversible and will scrap all biometric and financial telemetry associated with this ID from the master matrix.</p>
                                
                                <div className="space-y-3">
                                    <button onClick={() => handleDelete(false)} className="w-full py-3 border-2 border-red-200 text-red-700 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-red-600 hover:text-white transition-all">Soft Scrap Matrix Identity</button>
                                    <button onClick={() => handleDelete(true)} className="w-full py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-red-900 transition-all">Permanent Hard Flush Flush</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>

            <style>{`
                .form-input {
                    padding: 0.60rem 1rem;
                    background-color: #ffffff;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.5rem;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #111827;
                    transition: all 0.2s;
                    outline: none;
                }
                .form-input:focus {
                    border-color: #f97316;
                    box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.2);
                }
            `}</style>
        </div>
    );
}
