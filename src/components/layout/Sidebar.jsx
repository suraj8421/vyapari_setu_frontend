// ============================================
// Sidebar Component
// ============================================

import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import Logo from '../common/Logo';
import {
    HiOutlineChartBarSquare,
    HiOutlineCube,
    HiOutlineShoppingCart,
    HiOutlineTruck,
    HiOutlineDocumentChartBar,
    HiOutlineArrowRightOnRectangle,
    HiOutlineCurrencyRupee,
    HiOutlineClipboardDocumentList,
    HiOutlineUserGroup,
    HiOutlineClipboardDocumentCheck,
    HiOutlineReceiptRefund,
    HiOutlineCubeTransparent,
    HiChevronLeft,
    HiChevronRight
} from 'react-icons/hi2';

export default function Sidebar({ isOpen, onClose }) {
    const { t } = useTranslation();
    const { user, isAdmin, logout } = useAuth();
    const [isCollapsed, setIsCollapsed] = useState(false);
    
    // Use unified NotificationContext instead of polling transactionAPI
    const { unreadCount: pendingCount } = useNotification();

    const navItems = [
        { to: '/entry', icon: HiOutlineClipboardDocumentList, label: t('nav.unifiedEntry') },
        { to: '/dashboard', icon: HiOutlineChartBarSquare, label: t('nav.dashboard') },
        { to: '/products', icon: HiOutlineCube, label: t('nav.products') },
        { to: '/inventory', icon: HiOutlineCubeTransparent, label: t('nav.inventory') },
        { to: '/sales', icon: HiOutlineShoppingCart, label: t('nav.sales') },
        { to: '/purchases', icon: HiOutlineTruck, label: t('nav.purchases'), adminOnly: true },
        { to: '/customers', icon: HiOutlineCurrencyRupee, label: t('nav.khata') },
        { to: '/expenses', icon: HiOutlineReceiptRefund, label: t('nav.expenses') },
        { to: '/suppliers', icon: HiOutlineClipboardDocumentList, label: t('nav.suppliers'), adminOnly: true },
        { to: '/staff', icon: HiOutlineUserGroup, label: t('nav.staff'), adminOnly: true },
        { to: '/reports', icon: HiOutlineDocumentChartBar, label: t('nav.reports'), adminOnly: true },
        {
            to: '/approvals',
            icon: HiOutlineClipboardDocumentCheck,
            label: t('nav.approvals'),
            adminOnly: true,
            badge: pendingCount > 0 ? pendingCount : null,
        },
        { to: '/b2b/network', icon: HiOutlineUserGroup, label: t('nav.b2bNetwork') },
    ];

    const filteredItems = navItems.filter(item => !item.adminOnly || isAdmin);

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
                className={`fixed top-0 left-0 h-full bg-background-cream/95 backdrop-blur-xl 
                     border-r border-gray-200 z-50 transform transition-all duration-300 ease-in-out
                     lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                     ${isCollapsed ? 'w-20' : 'w-64'}`}
            >
                {/* Logo Section */}
                <div className={`p-4 flex items-center justify-between border-b border-gray-100 h-16`}>
                    <NavLink to="/dashboard" className="flex items-center">
                        <Logo variant="sidebar" collapsed={isCollapsed} />
                    </NavLink>
                    
                    {/* Collapse Toggle (Desktop only) */}
                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden lg:flex p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:text-primary-500 hover:bg-primary-50 transition-colors"
                    >
                        {isCollapsed ? <HiChevronRight className="w-5 h-5" /> : <HiChevronLeft className="w-5 h-5" />}
                    </button>
                </div>

                {/* User Info */}
                <div className="px-3 py-4 border-b border-gray-100 overflow-hidden">
                    <NavLink
                        to="/profile"
                        onClick={onClose}
                        className={({ isActive }) => `flex items-center gap-3 px-2 py-2 rounded-xl transition-all duration-200 
                            ${isActive 
                                ? 'bg-primary-50 ring-1 ring-primary-100' 
                                : 'hover:bg-gray-50'
                            }`}
                    >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 
                            flex-shrink-0 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </div>
                        {!isCollapsed && (
                            <div className="flex-1 min-w-0 transition-opacity duration-300">
                                <p className="text-sm font-medium text-surface-900 truncate">
                                    {user?.firstName} {user?.lastName}
                                </p>
                                <p className="text-xs text-surface-500">
                                    {isAdmin ? t('users.admin') : t('users.staff')}
                                </p>
                            </div>
                        )}
                    </NavLink>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                    {filteredItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={onClose}
                            title={isCollapsed ? item.label : ''}
                            className={({ isActive }) =>
                                `sidebar-link group flex items-center gap-3 p-2 rounded-xl transition-all ${isActive ? 'active bg-primary-50 text-primary-600' : 'text-gray-500 hover:bg-gray-50'}`
                            }
                        >
                            <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110`} />
                            {!isCollapsed && <span className="flex-1 whitespace-nowrap transition-opacity duration-300">{item.label}</span>}

                            {item.badge != null && (
                                <span className={`${isCollapsed ? 'absolute top-1 right-1 w-2 h-2' : 'ml-auto w-5 h-5 text-[10px]'} 
                                                 flex items-center justify-center rounded-full bg-amber-500 text-white
                                                 font-black animate-pulse`}>
                                    {isCollapsed ? '' : (item.badge > 9 ? '9+' : item.badge)}
                                </span>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Logout */}
                <div className={`p-3 border-t border-gray-200 bg-background-cream/50`}>
                    <button
                        onClick={logout}
                        className={`sidebar-link group w-full flex items-center gap-3 p-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all`}
                        title={isCollapsed ? t('auth.logout') : ''}
                    >
                        <HiOutlineArrowRightOnRectangle className="w-5 h-5 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                        {!isCollapsed && <span>{t('auth.logout')}</span>}
                    </button>
                </div>
            </aside>
        </>
    );
}
