import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    HiOutlineUserPlus, HiOutlineMagnifyingGlass, HiOutlinePencilSquare, 
    HiOutlineTrash, HiOutlineEnvelope, HiOutlinePhone, 
    HiOutlineShieldCheck, HiOutlineUserCircle, HiOutlineUserGroup
} from 'react-icons/hi2';
import { userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';

export default function StaffPage() {
    const { t } = useTranslation();
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        role: 'STORE_USER'
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data } = await userAPI.getAll({ storeId: currentUser.storeId });
            if (data.success) {
                // Filter out the current admin from the management list to prevent self-deletion
                setUsers(data.data.filter(u => u.id !== currentUser.id));
            }
        } catch (error) {
            toast.error("Failed to load staff list");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone || '',
                role: user.role,
                password: '' // Don't show existing password
            });
        } else {
            setEditingUser(null);
            setFormData({
                firstName: '',
                lastName: '',
                email: '',
                password: '',
                phone: '',
                role: 'STORE_USER'
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData, storeId: currentUser.storeId };
            
            // If creating, password is required
            if (!editingUser && !formData.password) {
                return toast.error("Password is required for new accounts");
            }

            if (editingUser) {
                // Remove password if empty during update
                if (!payload.password) delete payload.password;
                await userAPI.update(editingUser.id, payload);
                toast.success("Staff details updated");
            } else {
                await userAPI.create(payload);
                toast.success("New staff member added");
            }
            
            setIsModalOpen(false);
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || "Error saving user");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure? This staff member will no longer be able to log in.")) return;
        try {
            await userAPI.delete(id);
            toast.success("Staff member deactivated");
            fetchUsers();
        } catch (error) {
            toast.error("Failed to delete user");
        }
    };

    const filteredUsers = users.filter(u => 
        u.firstName.toLowerCase().includes(search.toLowerCase()) || 
        u.lastName.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header section with brand colors */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-primary-50 rounded-full blur-3xl -mr-10 -mt-20 opacity-50 pointer-events-none"></div>
                
                <div className="relative z-10">
                    <h1 className="text-2xl font-black text-surface-900 tracking-tight">{t('nav.staff')}</h1>
                    <p className="text-sm text-surface-500 font-medium mt-1">Manage your team, assign roles, and control access permissions.</p>
                </div>

                <button 
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 btn-primary relative z-10"
                >
                    <HiOutlineUserPlus className="w-5 h-5" />
                    Add Staff Member
                </button>
            </div>

            {/* Dashboard summary stats for staff */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center border border-primary-100">
                        <HiOutlineUserCircle className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Team Size</p>
                        <h3 className="text-2xl font-black text-surface-900 leading-none mt-1">{users.length} Employees</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100">
                        <HiOutlineShieldCheck className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Status</p>
                        <h3 className="text-2xl font-black text-surface-900 leading-none mt-1">{users.filter(u => u.isActive).length} Active</h3>
                    </div>
                </div>
            </div>

            {/* Search and Table section */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
                <div className="p-6 border-b border-gray-50 flex flex-wrap gap-4 items-center justify-between">
                    <div className="relative flex-1 max-w-md">
                        <HiOutlineMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                        <input 
                            type="text" 
                            placeholder="Find staff by name or email..."
                            className="input-field pl-12 h-12"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="py-20 flex justify-center"><LoadingSpinner /></div>
                ) : filteredUsers.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center gap-4 opacity-50">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center border border-dashed border-gray-200">
                            <HiOutlineUserGroup className="w-10 h-10 text-gray-300" />
                        </div>
                        <p className="font-bold text-surface-400">No staff members found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th className="pl-6 w-12">Avatar</th>
                                    <th>Full Name</th>
                                    <th>Contact Info</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th className="pr-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(u => (
                                    <tr key={u.id}>
                                        <td className="pl-6">
                                            <div className="w-10 h-10 rounded-xl bg-surface-50 flex items-center justify-center font-bold text-surface-400 border border-surface-100">
                                                {u.firstName[0]}{u.lastName[0]}
                                            </div>
                                        </td>
                                        <td>
                                            <p className="font-bold text-surface-900 leading-tight">{u.firstName} {u.lastName}</p>
                                            <p className="text-[10px] uppercase tracking-wider font-black text-surface-400 mt-0.5">Joined {new Date(u.createdAt).toLocaleDateString()}</p>
                                        </td>
                                        <td>
                                            <div className="flex flex-col gap-1">
                                                <span className="flex items-center gap-1.5 text-xs font-medium text-surface-600">
                                                    <HiOutlineEnvelope className="w-3.5 h-3.5 opacity-50" /> {u.email}
                                                </span>
                                                {u.phone && (
                                                    <span className="flex items-center gap-1.5 text-xs font-medium text-surface-600">
                                                        <HiOutlinePhone className="w-3.5 h-3.5 opacity-50" /> {u.phone}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${u.role === 'STORE_ADMIN' ? 'badge-info' : 'badge-neutral'}`}>
                                                {u.role === 'STORE_ADMIN' ? 'Manager' : 'Staff'}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${u.isActive ? 'text-emerald-500' : 'text-red-400'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-red-400'}`} />
                                                {u.isActive ? 'Active' : 'Disabled'}
                                            </span>
                                        </td>
                                        <td className="pr-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleOpenModal(u)} className="btn-ghost btn-sm">
                                                    <HiOutlinePencilSquare className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(u.id)} className="btn-ghost btn-sm text-red-400 hover:bg-red-50">
                                                    <HiOutlineTrash className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* User Form Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingUser ? "Update Staff Profile" : "Onboard New Staff Member"}
                maxWidth="sm:max-w-md"
            >
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label className="input-label">First Name</label>
                            <input 
                                type="text" className="input-field" required 
                                value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="input-label">Last Name</label>
                            <input 
                                type="text" className="input-field" required
                                value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="input-label">Email Address</label>
                        <input 
                            type="email" className="input-field" required
                            disabled={!!editingUser}
                            value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="input-label">{editingUser ? "New Password (Optional)" : "Password"}</label>
                        <input 
                            type="password" className="input-field" 
                            required={!editingUser}
                            placeholder={editingUser ? "Leave blank to keep current" : "Min. 6 characters"}
                            value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="input-label">Phone Number</label>
                        <input 
                            type="tel" className="input-field"
                            value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                        />
                    </div>

                    <div>
                        <label className="input-label">Access Role</label>
                        <select 
                            className="select-field"
                            value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
                        >
                            <option value="STORE_USER">Staff (Sales/Entry)</option>
                            <option value="STORE_ADMIN">Manager (Full Access)</option>
                        </select>
                        <p className="text-[10px] text-surface-400 mt-2 italic font-medium leading-relaxed">Managers can view reports, handle purchases, and manage other staff members within your store.</p>
                    </div>

                    <div className="pt-4 flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary w-full sm:flex-1">Abort</button>
                        <button type="submit" className="btn-primary w-full sm:flex-1">
                            {editingUser ? "Apply Changes" : "Confirm Onboarding"}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
