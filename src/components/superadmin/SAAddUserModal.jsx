import { useState, useEffect } from 'react';
import { 
    HiOutlineXMark, HiOutlineBriefcase, HiOutlineCurrencyRupee
} from 'react-icons/hi2';

import { saUserAPI, planAPI } from '../../services/api';

export default function SAAddUserModal({ onClose, employees = [] }) {
    const [isLoading, setIsLoading] = useState(false);
    const [plans, setPlans] = useState([]);
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', phone: '', email: '',
        password: '', platformStatus: 'ACTIVE', notes: '', assignedAgentId: '',
        planId: '',
        paymentMethod: 'CASH',
        amountReceived: '',
        storeDetails: { name: '', address: '', city: '', state: '', pincode: '' }
    });

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            const res = await planAPI.getAll();
            if (res.data.success) setPlans(res.data.data);
        } catch (e) {
            console.error('Error fetching plans');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('store.')) {
            const field = name.split('.')[1];
            setFormData(prev => ({ ...prev, storeDetails: { ...prev.storeDetails, [field]: value } }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await saUserAPI.create(formData);
            if (res.data.success) {
                onClose(true);
            } else {
                alert(res.data.message || 'Error occurred');
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to connect');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-surface-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-surface-900 uppercase tracking-tight">Provision New Entity</h2>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Manual SaaS Onboarding</p>
                    </div>
                    <button onClick={() => onClose()} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><HiOutlineXMark className="w-6 h-6 text-gray-400" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div><label className="block text-xs font-black text-gray-500 uppercase mb-1.5">First Name *</label><input required name="firstName" value={formData.firstName} onChange={handleChange} className="w-full form-input" /></div>
                        <div><label className="block text-xs font-black text-gray-500 uppercase mb-1.5">Last Name *</label><input required name="lastName" value={formData.lastName} onChange={handleChange} className="w-full form-input" /></div>
                        <div><label className="block text-xs font-black text-gray-500 uppercase mb-1.5">Primary Phone *</label><input required name="phone" value={formData.phone} onChange={handleChange} className="w-full form-input" /></div>
                        <div><label className="block text-xs font-black text-gray-500 uppercase mb-1.5">Email *</label><input required name="email" type="email" value={formData.email} onChange={handleChange} className="w-full form-input" /></div>
                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase mb-1.5">Assign Employee</label>
                            <select name="assignedAgentId" value={formData.assignedAgentId} onChange={handleChange} className="w-full form-input">
                                <option value="">-- No Assignment --</option>
                                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.code})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase mb-1.5">Select Plan *</label>
                            <select required name="planId" value={formData.planId} onChange={handleChange} className="w-full form-input">
                                <option value="">-- Choose Plan --</option>
                                {plans.map(p => <option key={p._id} value={p._id}>{p.name} (₹{p.price})</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <h3 className="text-sm font-black text-surface-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                             <HiOutlineBriefcase className="w-4 h-4 text-red-500" /> Business Module Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2"><label className="block text-xs font-black text-gray-500 uppercase mb-1.5">Store / Business Name *</label><input required name="store.name" value={formData.storeDetails.name} onChange={handleChange} className="w-full form-input" /></div>
                            <div><label className="block text-xs font-black text-gray-500 uppercase mb-1.5">State</label><input name="store.state" value={formData.storeDetails.state} onChange={handleChange} className="w-full form-input" /></div>
                            <div><label className="block text-xs font-black text-gray-500 uppercase mb-1.5">City</label><input name="store.city" value={formData.storeDetails.city} onChange={handleChange} className="w-full form-input" /></div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <h3 className="text-sm font-black text-surface-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                             <HiOutlineCurrencyRupee className="w-4 h-4 text-emerald-500" /> Payment Collection
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase mb-1.5">Payment Method</label>
                                <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="w-full form-input">
                                    <option value="CASH">CASH</option>
                                    <option value="GPAY">GPAY / PHONEPE</option>
                                    <option value="BANK_TRANSFER">BANK TRANSFER</option>
                                    <option value="CHEQUE">CHEQUE</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase mb-1.5">Amount Received (₹)</label>
                                <input 
                                    name="amountReceived" 
                                    type="number" 
                                    placeholder={formData.planId ? plans.find(p => p._id === formData.planId)?.price : '0'}
                                    value={formData.amountReceived} 
                                    onChange={handleChange} 
                                    className="w-full form-input" 
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                        <button type="button" onClick={() => onClose()} className="px-6 py-2.5 text-xs font-black text-gray-500 uppercase hover:bg-gray-50 rounded-xl">Cancel</button>
                        <button disabled={isLoading} type="submit" className="px-8 py-2.5 bg-gradient-to-r from-red-600 to-orange-500 text-white text-xs font-black uppercase rounded-xl shadow-lg shadow-red-500/20">
                            {isLoading ? 'Processing...' : 'Provision User'}
                        </button>
                    </div>
                </form>
            </div>
            
            <style>{`
                .form-input {
                    padding: 0.75rem 1rem;
                    background-color: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.75rem;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #111827;
                    transition: all 0.2s;
                    outline: none;
                }
                .form-input:focus {
                    background-color: #fff;
                    border-color: #f97316;
                    box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.2);
                }
            `}</style>
        </div>
    );
}
