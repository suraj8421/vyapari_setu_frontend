import { useState, useEffect } from 'react';
import { HiOutlineXMark } from 'react-icons/hi2';

export default function SALeadFormModal({ isOpen, onClose, onSubmit, editingLead, employees = [] }) {
    const [formData, setFormData] = useState({
        businessName: '',
        contactName: '',
        phone: '',
        email: '',
        source: 'Website',
        status: 'NEW',
        assignedToId: ''
    });

    useEffect(() => {
        if (editingLead) {
            setFormData({
                businessName: editingLead.businessName || '',
                contactName: editingLead.contactName || '',
                phone: editingLead.phone || '',
                email: editingLead.email || '',
                source: editingLead.source || 'Website',
                status: editingLead.status || 'NEW',
                assignedToId: editingLead.assignedToId || ''
            });
        } else {
            setFormData({
                businessName: '',
                contactName: '',
                phone: '',
                email: '',
                source: 'Website',
                status: 'NEW',
                assignedToId: ''
            });
        }
    }, [editingLead, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 bg-surface-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-black text-surface-900 uppercase tracking-tight">
                            {editingLead ? 'Update Lead Pipeline' : 'Log New Prospect'}
                        </h2>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">CRM Data Intake</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <HiOutlineXMark className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase mb-1.5">Business / Firm Name *</label>
                            <input required name="businessName" value={formData.businessName} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-red-500/50 outline-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase mb-1.5">Contact Person *</label>
                                <input required name="contactName" value={formData.contactName} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-red-500/50 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase mb-1.5">Phone Number *</label>
                                <input required name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-red-500/50 outline-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase mb-1.5">Email (Optional)</label>
                            <input name="email" type="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-red-500/50 outline-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase mb-1.5">Lead Source</label>
                                <select name="source" value={formData.source} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-red-500/50 outline-none">
                                    <option value="Website">Website</option>
                                    <option value="Referral">Referral</option>
                                    <option value="Field Sales">Field Sales</option>
                                    <option value="Social Media">Social Media</option>
                                    <option value="Cold Call">Cold Call</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase mb-1.5">Pipeline Status</label>
                                <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-red-500/50 outline-none">
                                    <option value="NEW">New</option>
                                    <option value="CONTACTED">Contacted</option>
                                    <option value="QUALIFIED">Qualified</option>
                                    <option value="CONVERTED">Converted</option>
                                    <option value="LOST">Lost</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-500 uppercase mb-1.5">Assign Handling Agent</label>
                            <select name="assignedToId" value={formData.assignedToId} onChange={handleChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-red-500/50 outline-none">
                                <option value="">-- No Assignment --</option>
                                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 text-xs font-black text-gray-500 uppercase hover:bg-gray-50 rounded-xl">Cancel</button>
                        <button type="submit" className="px-8 py-2.5 bg-gradient-to-r from-red-600 to-orange-500 text-white text-xs font-black uppercase rounded-xl shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition-all">
                            {editingLead ? 'Update Lead' : 'Log Lead'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
