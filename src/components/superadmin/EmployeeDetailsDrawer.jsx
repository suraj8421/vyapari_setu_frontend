import { HiXMark, HiOutlineUserCircle, HiOutlineBriefcase, HiOutlineChartBar, HiOutlineMapPin, HiOutlinePhone, HiOutlineEnvelope } from 'react-icons/hi2';

export default function EmployeeDetailsDrawer({ isOpen, onClose, employee }) {
    if (!isOpen || !employee) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/50 backdrop-blur-sm animate-fade-in shadow-2xl">
            <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl animate-slide-left">
                {/* Header Profile */}
                <div className="bg-gradient-to-r from-red-600 to-orange-500 p-6 flex flex-col text-white relative flex-shrink-0">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white">
                        <HiXMark className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-4 mt-2">
                        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border border-white/20 shadow-inner">
                            <HiOutlineUserCircle className="w-10 h-10 text-white/80" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black">{employee.name}</h2>
                            <p className="text-sm font-medium text-orange-100 font-mono mt-0.5">{employee.code}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-white/20 text-white border border-white/10">
                                    {employee.role}
                                </span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${employee.isActive ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'}`}>
                                    {employee.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-gray-50/50 flex flex-col custom-scrollbar">
                    {/* Contact & Location */}
                    <div className="p-6 bg-white border-b border-gray-100 flex flex-col gap-4">
                        <h3 className="text-xs font-black text-surface-400 uppercase tracking-widest mb-1">Contact Details</h3>
                        <div className="flex items-center gap-3 text-sm font-semibold text-surface-700">
                            <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0"><HiOutlineEnvelope className="w-4 h-4 text-gray-500" /></div>
                            {employee.email || 'N/A'}
                        </div>
                        <div className="flex items-center gap-3 text-sm font-semibold text-surface-700">
                            <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0"><HiOutlinePhone className="w-4 h-4 text-gray-500" /></div>
                            {employee.phone || 'N/A'}
                        </div>
                        <div className="flex items-center gap-3 text-sm font-semibold text-surface-700">
                            <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0"><HiOutlineMapPin className="w-4 h-4 text-gray-500" /></div>
                            {[employee.city, employee.state, employee.zone].filter(Boolean).join(', ') || 'Location Not Set'}
                        </div>
                        <div className="flex items-center gap-3 text-sm font-semibold text-surface-700">
                            <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0"><HiOutlineBriefcase className="w-4 h-4 text-gray-500" /></div>
                            <span className="text-gray-500 font-medium mr-1">Joined:</span> 
                            {employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : 'N/A'}
                        </div>
                    </div>

                    {/* Reporting & Hierarchy */}
                    <div className="p-6 bg-white border-b border-gray-100">
                        <h3 className="text-xs font-black text-surface-400 uppercase tracking-widest mb-4">Hierarchy Overview</h3>
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-full blur-2xl -mr-10 -mt-10"></div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Reports To</p>
                            <p className="text-sm font-black text-surface-900 flex items-center gap-2">
                                {employee.manager ? `${employee.manager.name} (${employee.manager.role})` : 'Direct Report to Board / HQ'}
                            </p>
                            
                            {employee.subordinatesCount > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Team Details</p>
                                    <p className="text-sm font-black text-surface-900 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                        {employee.subordinatesCount} Direct Report(s)
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="p-6 bg-white border-b border-gray-100">
                        <h3 className="text-xs font-black text-surface-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <HiOutlineChartBar className="w-4 h-4" />
                            Performance Summary
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col justify-center">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Managed Clients</span>
                                <span className="text-2xl font-black text-surface-900">{employee.usersCount || 0}</span>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex flex-col justify-center">
                                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">Sales Closed</span>
                                <span className="text-2xl font-black text-emerald-600">{employee.salesFormatted || '₹0'}</span>
                            </div>
                            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col justify-center">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Monthly Target</span>
                                <span className="text-lg font-black text-surface-900">{employee.targetAmount ? `₹${employee.targetAmount}` : 'N/A'}</span>
                            </div>
                            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex flex-col justify-center">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Incentive Tier</span>
                                <span className="text-lg font-black text-surface-900">{employee.incentive ? `${employee.incentive}%` : 'Standard'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes Section */}
                    {employee.notes && (
                        <div className="p-6 bg-white border-b border-gray-100 mb-6">
                            <h3 className="text-xs font-black text-surface-400 uppercase tracking-widest mb-3">Internal Notes</h3>
                            <p className="text-sm font-medium text-surface-700 bg-yellow-50/50 p-4 rounded-xl border border-yellow-100 shadow-sm leading-relaxed">
                                {employee.notes}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
