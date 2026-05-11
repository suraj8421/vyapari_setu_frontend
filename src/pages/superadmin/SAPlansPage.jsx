import React, { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, X, Check, PackageOpen, BadgeAlert } from 'lucide-react';
import toast from 'react-hot-toast';

import { API_BASE_URL } from '../../services/api';

const calculateDurationDays = (durationValue, durationUnit) => {
    const value = parseInt(durationValue) || 0;
    switch (durationUnit) {
        case 'years': return value * 365;
        case 'months': return value * 30; // Approximation often used in billing
        case 'days': return value;
        default: return value;
    }
};

const getDurationFromDays = (days) => {
    if (!days) return { durationValue: '', durationUnit: 'days' };
    if (days >= 365 && days % 365 === 0) {
        return { durationValue: days / 365, durationUnit: 'years' };
    }
    if (days >= 30 && days % 30 === 0) {
        return { durationValue: days / 30, durationUnit: 'months' };
    }
    return { durationValue: days, durationUnit: 'days' };
};

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="relative bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-fade-in-up">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-3xl">
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">{title}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-900 outline-none">
                        <X size={20} className="stroke-[2.5]" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default function PlansManagement() {
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    
    const [currentPlan, setCurrentPlan] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        oldPrice: '',
        durationValue: '1',
        durationUnit: 'months',
        type: 'normal',
        offerText: '',
        offerValidity: '',
        status: 'active',
        features: ['']
    });

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${API_BASE_URL}/plans/admin`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setPlans(data.data || []);
            } else {
                toast.error(data.message || 'Failed to fetch plans');
            }
        } catch (err) {
            toast.error('Error fetching plans');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const resetForm = () => {
        setFormData({
            name: '',
            price: '',
            oldPrice: '',
            durationValue: '1',
            durationUnit: 'months',
            type: 'normal',
            offerText: '',
            offerValidity: '',
            status: 'active',
            features: ['']
        });
        setCurrentPlan(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFeatureChange = (index, value) => {
        const newFeatures = [...formData.features];
        newFeatures[index] = value;
        setFormData(prev => ({ ...prev, features: newFeatures }));
    };

    const addFeatureField = () => {
        setFormData(prev => ({ ...prev, features: [...prev.features, ''] }));
    };

    const removeFeatureField = (index) => {
        const newFeatures = formData.features.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, features: newFeatures }));
    };

    const openEditModal = (plan) => {
        setCurrentPlan(plan);
        const duration = getDurationFromDays(plan.durationDays);
        setFormData({
            name: plan.name || '',
            price: plan.price ? (plan.price / 100).toString() : '',
            oldPrice: plan.oldPrice ? (plan.oldPrice / 100).toString() : '',
            durationValue: duration.durationValue.toString(),
            durationUnit: duration.durationUnit,
            type: plan.type || 'normal',
            offerText: plan.offerText || '',
            offerValidity: plan.offerValidity ? new Date(plan.offerValidity).toISOString().split('T')[0] : '',
            status: plan.status || 'active',
            features: plan.features?.length > 0 ? plan.features : ['']
        });
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (plan) => {
        setCurrentPlan(plan);
        setIsDeleteModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('accessToken');
        const cleanedFeatures = formData.features.filter(f => f.trim() !== '');

        const payload = {
            name: formData.name,
            price: Math.round(parseFloat(formData.price || 0) * 100),
            oldPrice: formData.oldPrice ? Math.round(parseFloat(formData.oldPrice) * 100) : null,
            durationDays: calculateDurationDays(formData.durationValue, formData.durationUnit),
            type: formData.type,
            offerText: formData.offerText,
            offerValidity: formData.offerValidity || null,
            status: formData.status,
            features: cleanedFeatures
        };

        try {
            let res;
            if (isEditModalOpen) {
                res = await fetch(`${API_BASE_URL}/plans/${currentPlan._id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });
            } else {
                res = await fetch(`${API_BASE_URL}/plans`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });
            }

            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(isEditModalOpen ? 'Plan updated successfully' : 'Plan created successfully');
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
                resetForm();
                fetchPlans();
            } else {
                toast.error(data.message || 'Error saving plan');
            }
        } catch (err) {
            toast.error('An error occurred while saving.');
        }
    };

    const handleDelete = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await fetch(`${API_BASE_URL}/plans/${currentPlan._id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success('Plan deleted successfully');
                setIsDeleteModalOpen(false);
                setCurrentPlan(null);
                fetchPlans();
            } else {
                toast.error(data.message || 'Error deleting plan');
            }
        } catch (err) {
            toast.error('An error occurred during deletion.');
        }
    };

    const filteredPlans = plans.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const renderForm = () => (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Plan Name</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-gray-900 bg-gray-50 focus:bg-white"
                        placeholder="e.g. Basic Starter"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Plan Type</label>
                    <select
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-gray-900 bg-gray-50 focus:bg-white appearance-none cursor-pointer"
                    >
                        <option value="normal">Normal Plan</option>
                        <option value="addon">Add-on</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Current Price (₹)</label>
                    <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        required
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-gray-900 bg-gray-50 focus:bg-white"
                        placeholder="0"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Old Price (₹) - Optional</label>
                    <input
                        type="number"
                        name="oldPrice"
                        value={formData.oldPrice}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-gray-900 bg-gray-50 focus:bg-white"
                        placeholder="0"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Duration</label>
                    <div className="flex gap-3">
                        <input
                            type="number"
                            name="durationValue"
                            value={formData.durationValue}
                            onChange={handleInputChange}
                            required
                            min="1"
                            className="w-2/3 px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-gray-900 bg-gray-50 focus:bg-white"
                        />
                        <select
                            name="durationUnit"
                            value={formData.durationUnit}
                            onChange={handleInputChange}
                            className="w-1/3 px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-gray-900 bg-gray-50 focus:bg-white cursor-pointer appearance-none text-center"
                        >
                            <option value="days">Days</option>
                            <option value="months">Months</option>
                            <option value="years">Years</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                    <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-gray-900 bg-gray-50 focus:bg-white appearance-none cursor-pointer"
                    >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Offer Text (Optional)</label>
                        <input
                            type="text"
                            name="offerText"
                            value={formData.offerText}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-gray-900 bg-gray-50 focus:bg-white"
                            placeholder="e.g. Save 20%"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Offer Validity (Optional)</label>
                        <input
                            type="date"
                            name="offerValidity"
                            value={formData.offerValidity}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-gray-900 bg-gray-50 focus:bg-white"
                        />
                    </div>
                </div>
            </div>

            <div className="pt-2">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Plan Features</label>
                <div className="space-y-3">
                    {formData.features.map((feature, index) => (
                        <div key={index} className="flex gap-3">
                            <input
                                type="text"
                                value={feature}
                                onChange={(e) => handleFeatureChange(index, e.target.value)}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-gray-900 bg-gray-50 focus:bg-white"
                                placeholder={`Feature ${index + 1}`}
                                required
                            />
                            {formData.features.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeFeatureField(index)}
                                    className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors shrink-0"
                                >
                                    <Trash2 size={20} />
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addFeatureField}
                        className="text-sm font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1.5 mt-2"
                    >
                        <Plus size={16} className="stroke-[3]" /> Add Feature
                    </button>
                </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-end gap-3 mt-8">
                <button
                    type="button"
                    onClick={() => {
                        setIsCreateModalOpen(false);
                        setIsEditModalOpen(false);
                        resetForm();
                    }}
                    className="px-6 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="btn-primary bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-orange-500/30 transition-all"
                >
                    {isEditModalOpen ? 'Save Changes' : 'Create Plan'}
                </button>
            </div>
        </form>
    );

    return (
        <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-50 to-red-50 rounded-full blur-3xl -z-10 opacity-70 translate-x-20 -translate-y-20"></div>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        Plan Management
                        <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider relative -top-1">Super Admin</span>
                    </h1>
                    <p className="text-sm sm:text-base text-gray-500 font-medium mt-1.5 max-w-xl">
                        Design subscription architecture, configure exact price points, adjust dynamic durations, and flag plan features.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                    <div className="relative group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Find a plan..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-64 pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium text-gray-800 bg-gray-50/50 hover:bg-gray-50 focus:bg-white"
                        />
                    </div>
                    <button
                        onClick={() => { resetForm(); setIsCreateModalOpen(true); }}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-orange-500/30 transition-all hover:-translate-y-0.5"
                    >
                        <Plus size={20} className="stroke-[2.5]" /> Create Plan
                    </button>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm h-96">
                            <div className="w-1/2 h-6 bg-gray-200 rounded-lg mb-6"></div>
                            <div className="w-2/3 h-10 bg-gray-200 rounded-lg mb-8"></div>
                            <div className="space-y-4">
                                <div className="w-full h-4 bg-gray-200 rounded"></div>
                                <div className="w-5/6 h-4 bg-gray-200 rounded"></div>
                                <div className="w-4/5 h-4 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredPlans.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-16 flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-50/50"></div>
                    <div className="bg-orange-50 p-6 rounded-full mb-6 relative z-10 shadow-inner shadow-orange-100">
                        <PackageOpen size={48} className="text-orange-500 stroke-[1.5]" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2 relative z-10">No Plans Configured</h3>
                    <p className="text-gray-500 mb-8 max-w-sm relative z-10 font-medium">Get started by creating your first subscription package to enable billing.</p>
                    <button
                        onClick={() => { resetForm(); setIsCreateModalOpen(true); }}
                        className="btn-primary flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 text-white px-8 py-3 rounded-xl font-bold shadow-xl shadow-orange-500/20 transition-all hover:scale-105 relative z-10"
                    >
                        <Plus size={20} className="stroke-[2.5]" /> Formulate First Plan
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPlans.map(plan => {
                        const durationText = (() => {
                            const d = getDurationFromDays(plan.durationDays);
                            return `${d.durationValue} ${d.durationUnit.charAt(0).toUpperCase() + d.durationUnit.slice(1)}`;
                        })();

                        return (
                            <div key={plan._id} className="group bg-white flex flex-col justify-between border border-gray-100 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-500/5 rounded-3xl p-6 sm:p-8 transition-all duration-300 relative overflow-hidden">
                                {plan.offerText && plan.status === 'active' && (
                                    <div className="absolute top-0 right-0 bg-gradient-to-bl from-green-500 to-emerald-600 text-white px-5 py-1.5 rounded-bl-2xl font-black text-xs uppercase tracking-widest shadow-md">
                                        {plan.offerText}
                                    </div>
                                )}
                                
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-5 mt-2">
                                        <div className="pr-12">
                                            <h3 className="text-xl font-black text-gray-900 leading-tight mb-2">{plan.name}</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {plan.type === 'addon' && (
                                                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold border bg-purple-50 text-purple-700 border-purple-200 uppercase tracking-wider">
                                                        Add-on
                                                    </span>
                                                )}
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider ${
                                                    plan.status === 'active' 
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                        : 'bg-gray-50 text-gray-500 border-gray-200'
                                                }`}>
                                                    {plan.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-8">
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <span className="text-4xl font-black text-gray-900 tracking-tighter">
                                                ₹{(plan.price / 100).toFixed(2).replace(/\.00$/, '')}
                                            </span>
                                            {plan.oldPrice && (
                                                <span className="text-sm font-bold text-gray-400 line-through">
                                                    ₹{(plan.oldPrice / 100).toFixed(2).replace(/\.00$/, '')}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-sm font-bold text-gray-400 uppercase tracking-widest px-1">
                                            / {durationText}
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4 mb-10">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Included Features</p>
                                        <ul className="space-y-3.5">
                                            {plan.features?.slice(0, 5).map((f, i) => (
                                                <li key={i} className="flex items-start gap-3">
                                                    <div className="mt-0.5 p-1 rounded-full bg-orange-50 text-orange-600 shrink-0">
                                                        <Check size={12} className="stroke-[3.5]" />
                                                    </div>
                                                    <span className="text-sm font-semibold text-gray-600 leading-tight">{f}</span>
                                                </li>
                                            ))}
                                            {plan.features?.length > 5 && (
                                                <li className="text-sm font-bold text-gray-400 italic pl-8">
                                                    + {plan.features.length - 5} more features...
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-6 border-t border-gray-50 mt-auto relative z-10">
                                    <button 
                                        onClick={() => openEditModal(plan)} 
                                        className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-colors"
                                    >
                                        <Pencil size={16} /> Edit
                                    </button>
                                    <button 
                                        onClick={() => openDeleteModal(plan)} 
                                        className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors"
                                    >
                                        <Trash2 size={16} /> Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Modal */}
            <Modal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); resetForm(); }} title="Formulate New Plan">
                {renderForm()}
            </Modal>

            {/* Edit Modal */}
            <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); resetForm(); }} title="Edit Configuration">
                {renderForm()}
            </Modal>

            {/* Delete Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Deletion">
                <div className="text-center py-6">
                    <div className="bg-red-50 text-red-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <BadgeAlert size={40} className="stroke-[1.5]" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-2">Delete Plan?</h3>
                    <p className="text-gray-500 font-medium mb-8 max-w-sm mx-auto">
                        Are you sure you want to permanently delete <strong className="text-gray-800">{currentPlan?.name}</strong>? This action cannot be undone and may affect active subsciptions.
                    </p>
                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            No, Cancel
                        </button>
                        <button
                            onClick={handleDelete}
                            className="px-6 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all hover:scale-105"
                        >
                            Yes, Delete
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
