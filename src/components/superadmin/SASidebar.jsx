import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
    HiOutlineChartBarSquare,
    HiOutlineUsers,
    HiOutlineBriefcase,
    HiOutlineDocumentText,
    HiOutlineRectangleGroup,
    HiOutlineCreditCard,
    HiOutlineUserPlus,
    HiOutlineDocumentChartBar,
    HiOutlineCog6Tooth,
    HiOutlineArrowRightOnRectangle
} from 'react-icons/hi2';
import { saLeadsAPI } from '../../services/api';
import { useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';

export default function SASidebar({ isOpen, onClose }) {
    const [hasNewLeads, setHasNewLeads] = useState(false);
    const { socket } = useSocket();

    const checkNewLeads = async () => {
        try {
            // Get NEW leads count to show notification dot
            const res = await saLeadsAPI.getAll({ status: 'NEW', limit: 1 });
            if (res.data.success && res.data.pagination.total > 0) {
                setHasNewLeads(true);
            } else {
                setHasNewLeads(false);
            }
        } catch (err) {
            console.error('New leads check failed:', err);
        }
    };

    useEffect(() => {
        checkNewLeads();
        
        if (socket) {
            socket.on('leads_updated', checkNewLeads);
        }

        // Still keep fallback polling (longer interval)
        const interval = setInterval(checkNewLeads, 5 * 60 * 1000);
        
        return () => {
            clearInterval(interval);
            if (socket) {
                socket.off('leads_updated', checkNewLeads);
            }
        };
    }, [socket]);

    const navItems = [
        { to: '/superadmin/dashboard', icon: HiOutlineChartBarSquare, label: 'Dashboard Overview' },
        { to: '/superadmin/users', icon: HiOutlineUsers, label: 'Users / Clients' },
        { to: '/superadmin/employees', icon: HiOutlineBriefcase, label: 'Employees (Agents)' },
        { to: '/superadmin/leads', icon: HiOutlineDocumentText, label: 'Leads CRM' },
        { to: '/superadmin/plans', icon: HiOutlineRectangleGroup, label: 'Subscription Plans' },
        { to: '/superadmin/payments', icon: HiOutlineCreditCard, label: 'Payments Management' },
        { to: '/superadmin/reports', icon: HiOutlineDocumentChartBar, label: 'Reports / Exports' },
        { to: '/superadmin/settings', icon: HiOutlineCog6Tooth, label: 'Settings' },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full w-64 bg-background-cream/95 backdrop-blur-xl 
                     border-r border-gray-200 z-50 transform transition-transform duration-300
                     lg:translate-x-0 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-orange-500 
                          flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-red-500/30">
                        V
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500">
                            Super Admin
                        </h1>
                        <p className="text-[10px] text-surface-500 uppercase tracking-widest font-semibold tracking-wider">VyapariSetu Core</p>
                    </div>
                </div>

                {/* User Info */}
                <div className="px-5 py-5 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-400 
                        flex items-center justify-center text-white text-sm font-bold shadow-md">
                        SA
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-surface-900 truncate">System Admin</p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700">
                            Full Access
                        </span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
                    {navItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={onClose}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 
                                ${isActive ? 'bg-gradient-to-r from-red-50 to-orange-50 text-red-700 shadow-sm border border-red-100' : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'}`
                            }
                        >
                            <item.icon className={`w-5 h-5 flex-shrink-0`} />
                            <span className="flex-1">{item.label}</span>
                            {item.label === 'Leads CRM' && hasNewLeads && (
                                <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Logout */}
                <div className="p-4 border-t border-gray-200 bg-surface-50/50">
                    <button
                        onClick={() => window.location.href = '/login'}
                        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-bold 
                        text-red-600 bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 transition-all shadow-sm"
                    >
                        <HiOutlineArrowRightOnRectangle className="w-5 h-5" />
                        <span>Exit Panel</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
