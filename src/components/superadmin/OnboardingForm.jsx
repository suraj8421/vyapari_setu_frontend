import { useState, useEffect } from 'react';
import { 
    HiOutlineBriefcase, HiOutlineCreditCard, HiOutlineUserGroup, 
    HiOutlineCheckCircle, HiArrowLeft, HiArrowRight, HiOutlineDocumentText
} from 'react-icons/hi2';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function OnboardingForm({ onClose, onComplete, initialData }) {
    const [step, setStep] = useState(1);
    const [plans, setPlans] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Form data
    const [formData, setFormData] = useState({
        ownerName: '', phoneNumber: '', alternatePhone: '', email: '',
        businessName: '', businessCategory: '',
        state: '', city: '', address: '', pincode: '', landmark: '', notes: '',
        // Plan
        planId: '', planDuration: '', planPrice: '', discountAmount: '0',
        discountReason: '', totalAmount: '',
        // Payment
        amountReceived: '0', dueAmount: '0', paymentMethod: 'CASH',
        paymentStatus: 'PENDING', transactionId: '', collectedById: '', pricingNotes: '',
        status: 'DRAFT', ...initialData
    });

    useEffect(() => {
        fetchPlans();
        fetchEmployees();
    }, []);

    // Calculate total logic
    useEffect(() => {
        const base = parseFloat(formData.planPrice) || 0;
        const discount = parseFloat(formData.discountAmount) || 0;
        const total = Math.max(0, base - discount);
        const received = parseFloat(formData.amountReceived) || 0;
        const due = Math.max(0, total - received);
        let paymentStatus = 'PENDING';
        if (received > 0) {
            paymentStatus = due === 0 ? 'PAID' : 'PARTIAL';
        }
        
        setFormData(prev => ({ 
            ...prev, 
            totalAmount: total.toFixed(2), 
            dueAmount: due.toFixed(2),
            paymentStatus
        }));
    }, [formData.planPrice, formData.discountAmount, formData.amountReceived]);

    const fetchPlans = async () => {
        try {
            const res = await fetch(`${API_URL}/plans`);
            const data = await res.json();
            if (data.success) setPlans(data.data.filter(p => p.isActive));
        } catch (error) { console.error('Error fetching plans'); }
    };

    const fetchEmployees = async () => {
        try {
            const res = await fetch(`${API_URL}/employees?status=Active`);
            const data = await res.json();
            if (data.success) setEmployees(data.data);
        } catch (error) { console.error('Error fetching employees'); }
    };

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handlePlanSelect = (planId) => {
        const plan = plans.find(p => p.id === planId);
        if (plan) {
            setFormData(prev => ({
                ...prev, planId: plan.id, planDuration: plan.durationMonths, planPrice: (plan.price / 100).toString()
            }));
        }
    };

    const validateStep = () => {
        if (step === 1) {
            if (!formData.ownerName || !formData.phoneNumber || !formData.businessName || !formData.state || !formData.city) {
                alert('Please fill all mandatory (*) fields.'); return false;
            }
        }
        if (step === 2) {
            if (!formData.planId) { alert('Please select a plan.'); return false; }
            if (parseFloat(formData.discountAmount) > 0 && !formData.discountReason) {
                alert('Please provide a reason for the discount applied.'); return false;
            }
        }
        if (step === 3) {
            if (!formData.collectedById) { alert('Please map a collection agent/employee.'); return false; }
        }
        return true;
    };

    const nextStep = () => validateStep() && setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const handleSubmit = async (submitStatus) => {
        if (submitStatus !== 'DRAFT' && !validateStep()) return;
        setIsLoading(true);
        try {
            const payload = { 
                ...formData, 
                status: submitStatus,
                // Convert back to paisa for database
                planPrice: Math.round(parseFloat(formData.planPrice) * 100),
                discountAmount: Math.round(parseFloat(formData.discountAmount) * 100),
                totalAmount: Math.round(parseFloat(formData.totalAmount) * 100),
                amountReceived: Math.round(parseFloat(formData.amountReceived) * 100),
                dueAmount: Math.round(parseFloat(formData.dueAmount) * 100),
            };
            const method = payload.id ? 'PUT' : 'POST';
            const url = payload.id ? `${API_URL}/onboarding/${payload.id}` : `${API_URL}/onboarding`;
            
            const res = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                onComplete(data.data, submitStatus);
            } else {
                alert(data.message || 'Error saving onboarding');
            }
        } catch (error) {
            console.error(error);
            alert('Failed to connect to server');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden relative min-h-[600px] flex flex-col">
            {/* Header / Stepper */}
            <div className="bg-surface-50 border-b border-gray-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors"><HiArrowLeft className="w-5 h-5 text-gray-500" /></button>
                    <div>
                        <h2 className="text-xl font-black text-surface-900">Entity Onboarding</h2>
                        <p className="text-xs font-semibold text-surface-500">Master Record Configuration</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-surface-400">
                    <div className={`flex items-center gap-2 ${step >= 1 ? 'text-red-500' : ''}`}><span className={`w-6 h-6 flex items-center justify-center rounded-full border-2 ${step >= 1 ? 'border-red-500 text-red-500 bg-red-50' : 'border-gray-200'} transition-all`}>1</span> Business</div>
                    <div className="h-px w-8 bg-gray-200 hidden md:block"></div>
                    <div className={`flex items-center gap-2 ${step >= 2 ? 'text-orange-500' : ''}`}><span className={`w-6 h-6 flex items-center justify-center rounded-full border-2 ${step >= 2 ? 'border-orange-500 text-orange-500 bg-orange-50' : 'border-gray-200'} transition-all`}>2</span> Plan</div>
                    <div className="h-px w-8 bg-gray-200 hidden md:block"></div>
                    <div className={`flex items-center gap-2 ${step >= 3 ? 'text-amber-500' : ''}`}><span className={`w-6 h-6 flex items-center justify-center rounded-full border-2 ${step >= 3 ? 'border-amber-500 text-amber-500 bg-amber-50' : 'border-gray-200'} transition-all`}>3</span> Payment</div>
                    <div className="h-px w-8 bg-gray-200 hidden md:block"></div>
                    <div className={`flex items-center gap-2 ${step >= 4 ? 'text-emerald-500' : ''}`}><span className={`w-6 h-6 flex items-center justify-center rounded-full border-2 ${step >= 4 ? 'border-emerald-500 text-emerald-500 bg-emerald-50' : 'border-gray-200'} transition-all`}>4</span> Review</div>
                </div>
            </div>

            <div className="p-8 flex-1 overflow-y-auto">
                {step === 1 && (
                    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
                        <h3 className="text-lg font-black text-surface-900 border-l-4 border-red-500 pl-3">Business & Owner Identity</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div><label className="block text-xs font-bold text-surface-500 mb-1.5">Business Name *</label><input required name="businessName" value={formData.businessName} onChange={handleChange} className="w-full form-input" placeholder="e.g. Acme Corp" /></div>
                            <div><label className="block text-xs font-bold text-surface-500 mb-1.5">Category</label><input name="businessCategory" value={formData.businessCategory} onChange={handleChange} className="w-full form-input" placeholder="e.g. Retail, Service" /></div>
                            <div><label className="block text-xs font-bold text-surface-500 mb-1.5">Owner Name *</label><input required name="ownerName" value={formData.ownerName} onChange={handleChange} className="w-full form-input" placeholder="Full Name" /></div>
                            <div><label className="block text-xs font-bold text-surface-500 mb-1.5">Primary Phone *</label><input required name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} className="w-full form-input" placeholder="+91" /></div>
                            <div><label className="block text-xs font-bold text-surface-500 mb-1.5">Alternate/WhatsApp</label><input name="alternatePhone" value={formData.alternatePhone} onChange={handleChange} className="w-full form-input" placeholder="+91" /></div>
                            <div><label className="block text-xs font-bold text-surface-500 mb-1.5">Email Address</label><input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full form-input" placeholder="mail@example.com" /></div>
                        </div>

                        <h3 className="text-lg font-black text-surface-900 border-l-4 border-red-500 pl-3 pt-4">Location Mapping</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            <div><label className="block text-xs font-bold text-surface-500 mb-1.5">State *</label><input required name="state" value={formData.state} onChange={handleChange} className="w-full form-input" placeholder="State" /></div>
                            <div><label className="block text-xs font-bold text-surface-500 mb-1.5">City *</label><input required name="city" value={formData.city} onChange={handleChange} className="w-full form-input" placeholder="City" /></div>
                            <div><label className="block text-xs font-bold text-surface-500 mb-1.5">Pincode *</label><input required name="pincode" value={formData.pincode} onChange={handleChange} className="w-full form-input" placeholder="e.g. 400001" /></div>
                            <div className="lg:col-span-3"><label className="block text-xs font-bold text-surface-500 mb-1.5">Full Address</label><textarea required name="address" value={formData.address} onChange={handleChange} rows={2} className="w-full form-input resize-none" placeholder="..." /></div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
                        <h3 className="text-lg font-black text-surface-900 border-l-4 border-orange-500 pl-3">Subscription Protocol</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {plans.map(p => (
                                <div key={p.id} onClick={() => handlePlanSelect(p.id)} className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${formData.planId === p.id ? 'border-orange-500 bg-orange-50 shadow-md scale-[1.02]' : 'border-gray-100 hover:border-orange-200 hover:bg-orange-50/30'}`}>
                                    <h4 className="font-black text-surface-900">{p.name}</h4>
                                    <p className="text-2xl font-black text-orange-600 mt-2">₹{p.price / 100}</p>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">{p.durationMonths} Months Access</p>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
                            <div><label className="block text-xs font-bold text-surface-500 mb-1.5">Base Plan Price (₹)</label><input disabled value={formData.planPrice} className="w-full form-input bg-gray-50/50" /></div>
                            <div><label className="block text-xs font-bold text-surface-500 mb-1.5">Discount Amount (₹)</label><input type="number" name="discountAmount" value={formData.discountAmount} onChange={handleChange} className="w-full form-input" /></div>
                            <div><label className="block text-xs font-bold text-surface-500 mb-1.5">Final Computed Total (₹)</label><input disabled value={formData.totalAmount} className="w-full form-input bg-emerald-50/30 text-emerald-700 font-bold border-emerald-200" /></div>
                            {parseFloat(formData.discountAmount) > 0 && (
                                <div className="md:col-span-3">
                                    <label className="block text-xs font-bold text-orange-600 mb-1.5">Mandatory Discount Reason *</label>
                                    <input required name="discountReason" value={formData.discountReason} onChange={handleChange} className="w-full form-input border-orange-300 bg-orange-50 focus:ring-orange-500" placeholder="Required explanation for discount override" />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
                        <h3 className="text-lg font-black text-surface-900 border-l-4 border-amber-500 pl-3">Payment & Agent Mapping</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div><label className="block text-xs font-bold text-surface-500 mb-1.5">Amount Received (₹) *</label><input type="number" name="amountReceived" value={formData.amountReceived} onChange={handleChange} className="w-full form-input" /></div>
                            <div><label className="block text-xs font-bold text-surface-500 mb-1.5">Due Amount (₹)</label><input disabled value={formData.dueAmount} className={`w-full form-input font-bold ${parseFloat(formData.dueAmount) > 0 ? 'text-red-500 bg-red-50/30' : 'text-emerald-500 bg-emerald-50/30'}`} /></div>
                            <div>
                                <label className="block text-xs font-bold text-surface-500 mb-1.5">Payment Status</label>
                                <div className={`w-full px-4 py-3 rounded-xl font-bold border text-sm flex items-center justify-center
                                    ${formData.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : formData.paymentStatus === 'PARTIAL' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                                    {formData.paymentStatus}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-surface-500 mb-1.5">Payment Method</label>
                                <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="w-full form-input">
                                    <option value="CASH">Cash</option><option value="UPI">UPI</option><option value="BANK_TRANSFER">Bank Transfer</option><option value="CHEQUE">Cheque</option><option value="ONLINE_LINK">Online Link</option>
                                </select>
                            </div>
                            <div className="md:col-span-2"><label className="block text-xs font-bold text-surface-500 mb-1.5">Transaction ID / UTR / Remarks</label><input name="transactionId" value={formData.transactionId} onChange={handleChange} className="w-full form-input" placeholder="Required for UPI/Bank" /></div>

                            <div className="md:col-span-3 pt-4 border-t border-gray-100">
                                <label className="block text-xs font-black text-surface-500 uppercase tracking-widest mb-1.5">Map Employee (Sales Credit) *</label>
                                <select required name="collectedById" value={formData.collectedById} onChange={handleChange} className="w-full form-input border-indigo-200 bg-indigo-50/30 text-indigo-900 focus:ring-indigo-500 font-bold">
                                    <option value="">-- Assign Employee --</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.code}) - {e.role}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
                        <div className="bg-surface-50 p-6 rounded-2xl border border-gray-100 text-center">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-sm">
                                <HiOutlineCheckCircle className="w-8 h-8 text-emerald-600" />
                            </div>
                            <h3 className="text-xl font-black text-surface-900 mb-1">Final Review</h3>
                            <p className="text-sm font-semibold text-surface-500 max-w-md mx-auto">Please confirm the core onboarding details before flushing this payload into the main operational database.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div>
                                <h4 className="text-xs font-black text-surface-400 uppercase tracking-widest mb-3 pb-2 border-b">Business Manifest</h4>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex justify-between"><span className="text-surface-500 font-semibold">Entity</span><span className="font-bold">{formData.businessName}</span></li>
                                    <li className="flex justify-between"><span className="text-surface-500 font-semibold">Owner</span><span className="font-bold">{formData.ownerName}</span></li>
                                    <li className="flex justify-between"><span className="text-surface-500 font-semibold">Contact</span><span className="font-bold">{formData.phoneNumber}</span></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-surface-400 uppercase tracking-widest mb-3 pb-2 border-b">Financial Ledger</h4>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex justify-between"><span className="text-surface-500 font-semibold">Plan Base</span><span className="font-bold">₹{formData.planPrice}</span></li>
                                    <li className="flex justify-between"><span className="text-surface-500 font-semibold text-red-500">Discount</span><span className="font-bold text-red-500">-₹{formData.discountAmount}</span></li>
                                    <li className="flex justify-between"><span className="text-surface-500 font-black">Net Total</span><span className="font-black">₹{formData.totalAmount}</span></li>
                                    <li className="flex justify-between pt-2 border-t border-dashed mt-2"><span className="text-surface-500 font-black">Collected</span><span className="text-emerald-600 font-black">₹{formData.amountReceived}</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Navigation */}
            <div className="bg-gray-50 border-t border-gray-100 p-5 flex items-center justify-between mt-auto">
                <button 
                    onClick={() => handleSubmit('DRAFT')} 
                    disabled={isLoading}
                    className="px-5 py-2.5 text-surface-600 font-bold text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                    {isLoading ? 'Saving...' : 'Save Draft'}
                </button>
                
                <div className="flex items-center gap-3">
                    {step > 1 && (
                        <button onClick={prevStep} className="px-5 py-2.5 text-surface-600 font-bold text-sm bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                            Back
                        </button>
                    )}
                    
                    {step < 4 ? (
                        <button onClick={nextStep} className="flex items-center gap-2 btn-primary bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-red-500/30 transition-all">
                            Continue <HiArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button disabled={isLoading} onClick={() => handleSubmit(formData.paymentStatus === 'PAID' ? 'COMPLETED' : 'PAYMENT_PENDING')} className="flex items-center gap-2 btn-primary bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-8 py-2.5 rounded-xl font-black shadow-lg shadow-emerald-500/30 transition-all text-sm uppercase tracking-widest">
                            {isLoading ? 'Processing...' : 'Provision & Launch'}
                        </button>
                    )}
                </div>
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
                    background-color: #ffffff;
                    border-color: #f97316;
                    box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.2);
                }
                .form-input:disabled { opacity: 0.6; cursor: not-allowed; }
            `}</style>
        </div>
    );
}
