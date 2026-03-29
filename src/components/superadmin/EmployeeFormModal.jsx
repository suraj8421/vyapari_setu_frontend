import { useState, useEffect } from 'react';
import { HiXMark } from 'react-icons/hi2';

export default function EmployeeFormModal({ isOpen, onClose, onSubmit, editingEmployee, managersList, isLoading }) {
    const defaultState = {
        name: '', email: '', phone: '', password: '', role: 'Agent',
        state: '', city: '', zone: '', joiningDate: '', notes: '',
        targetAmount: '', salary: '', incentive: '', managerId: ''
    };
    
    const [formData, setFormData] = useState(defaultState);

    useEffect(() => {
        if (editingEmployee) {
            setFormData({
                ...editingEmployee,
                password: '', // Blank password unless changing
                targetAmount: editingEmployee.targetAmount || '',
                salary: editingEmployee.salary || '',
                incentive: editingEmployee.incentive || '',
                managerId: editingEmployee.managerId || '',
                joiningDate: editingEmployee.joiningDate ? editingEmployee.joiningDate.split('T')[0] : ''
            });
        } else {
            setFormData(defaultState);
        }
    }, [editingEmployee, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white w-full max-w-3xl rounded-3xl shadow-xl border border-gray-100 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-3xl z-10">
                    <div>
                        <h2 className="text-xl font-black text-surface-900">{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</h2>
                        <p className="text-xs text-surface-500 font-medium mt-1">Fill in the details to configure the employee profile.</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">
                        <HiXMark className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <form id="employeeForm" onSubmit={handleSubmit} className="space-y-6">
                        {/* Personal Details */}
                        <div>
                            <h3 className="text-sm font-bold text-surface-900 mb-4 px-1 border-l-4 border-red-500">Personal Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-surface-700 mb-1.5">Full Name *</label>
                                    <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-red-500/50 outline-none transition-all" placeholder="Enter full name" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-surface-700 mb-1.5">Phone Number *</label>
                                    <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-red-500/50 outline-none transition-all" placeholder="Enter phone" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-surface-700 mb-1.5">Email Address *</label>
                                    <input required type="email" name="email" value={formData.email} onChange={handleChange} disabled={!!editingEmployee} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-red-500/50 outline-none transition-all disabled:opacity-60" placeholder="employee@example.com" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-surface-700 mb-1.5">{editingEmployee ? 'Reset Password (Optional)' : 'Password *'}</label>
                                    <input required={!editingEmployee} type="password" name="password" value={formData.password} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-red-500/50 outline-none transition-all" placeholder="Enter password" />
                                </div>
                            </div>
                        </div>

                        {/* Professional Details */}
                        <div className="pt-2">
                            <h3 className="text-sm font-bold text-surface-900 mb-4 px-1 border-l-4 border-orange-500">Role & Hierarchy</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-surface-700 mb-1.5">Role *</label>
                                    <select required name="role" value={formData.role} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-surface-700 outline-none focus:bg-white focus:ring-2 focus:ring-red-500/50 transition-all">
                                        <option value="Agent">Agent</option>
                                        <option value="BDE">BDE (Business Dev Exec)</option>
                                        <option value="TL">TL (Team Leader)</option>
                                        <option value="ASM">ASM (Area Sales Manager)</option>
                                        <option value="RH">RH (Regional Head)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-surface-700 mb-1.5">Joining Date</label>
                                    <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-red-500/50 outline-none transition-all" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-surface-700 mb-1.5">Reporting Manager</label>
                                    <select name="managerId" value={formData.managerId} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-surface-700 outline-none focus:bg-white focus:ring-2 focus:ring-red-500/50 transition-all">
                                        <option value="">-- None (Direct Report) --</option>
                                        {managersList.filter(m => m.id !== editingEmployee?.id).map(m => (
                                            <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Location Details */}
                        <div className="pt-2">
                            <h3 className="text-sm font-bold text-surface-900 mb-4 px-1 border-l-4 border-emerald-500">Location</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-surface-700 mb-1.5">State</label>
                                    <input type="text" name="state" value={formData.state} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-red-500/50 outline-none" placeholder="e.g. Maharashtra" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-surface-700 mb-1.5">City</label>
                                    <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-red-500/50 outline-none" placeholder="e.g. Mumbai" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-surface-700 mb-1.5">Zone</label>
                                    <input type="text" name="zone" value={formData.zone} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-red-500/50 outline-none" placeholder="e.g. West Zone" />
                                </div>
                            </div>
                        </div>

                        {/* Financials */}
                        <div className="pt-2">
                            <h3 className="text-sm font-bold text-surface-900 mb-4 px-1 border-l-4 border-amber-500">Targets & Financials (Optional)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-surface-700 mb-1.5">Monthly Target (₹)</label>
                                    <input type="number" name="targetAmount" value={formData.targetAmount} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-red-500/50 outline-none" placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-surface-700 mb-1.5">Base Salary (₹)</label>
                                    <input type="number" name="salary" value={formData.salary} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-red-500/50 outline-none" placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-surface-700 mb-1.5">Incentive Tier (%)</label>
                                    <input type="number" name="incentive" value={formData.incentive} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-red-500/50 outline-none" placeholder="0.0" />
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="pt-2">
                            <label className="block text-xs font-bold text-surface-700 mb-1.5">Internal Notes</label>
                            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-red-500/50 outline-none resize-none" placeholder="Add any background info or KPIs..." />
                        </div>
                    </form>
                </div>

                <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 rounded-b-3xl">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-surface-700 hover:bg-gray-50 transition-colors">
                        Cancel
                    </button>
                    <button type="submit" form="employeeForm" disabled={isLoading} className="flex items-center justify-center min-w-[140px] px-5 py-2.5 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-500/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                        {isLoading ? 'Saving...' : (editingEmployee ? 'Save Changes' : 'Create Employee')}
                    </button>
                </div>
            </div>
        </div>
    );
}
