// ============================================
// Sidebar Component
// ============================================

import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import {
    HiOutlineChartBarSquare,
    HiOutlineCube,
    HiOutlineShoppingCart,
    HiOutlineTruck,
    HiOutlineUsers,
    HiOutlineBuildingStorefront,
    HiOutlineDocumentChartBar,
    HiOutlineArrowRightOnRectangle,
    HiOutlineCurrencyRupee,
    HiOutlineClipboardDocumentList,
    HiOutlineUserGroup,
} from 'react-icons/hi2';

export default function Sidebar({ isOpen, onClose }) {
    const { t } = useTranslation();
    const { user, isAdmin, logout } = useAuth();

    const navItems = [
        { to: '/dashboard', icon: HiOutlineChartBarSquare, label: t('nav.dashboard') },
        { to: '/products', icon: HiOutlineCube, label: t('nav.products') },
        { to: '/sales', icon: HiOutlineShoppingCart, label: t('nav.sales') },
        { to: '/purchases', icon: HiOutlineTruck, label: t('nav.purchases'), adminOnly: true },
        { to: '/customers', icon: HiOutlineCurrencyRupee, label: t('nav.khata') },
        { to: '/suppliers', icon: HiOutlineClipboardDocumentList, label: t('nav.suppliers'), adminOnly: true },
        { to: '/stores', icon: HiOutlineBuildingStorefront, label: t('nav.stores'), adminOnly: true },
        { to: '/users', icon: HiOutlineUserGroup, label: t('nav.users'), adminOnly: true },
        { to: '/reports', icon: HiOutlineDocumentChartBar, label: t('nav.reports'), adminOnly: true },
    ];

    const filteredItems = navItems.filter((item) => !item.adminOnly || isAdmin);

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
                className={`fixed top-0 left-0 h-full w-64 bg-white/95 backdrop-blur-xl 
                     border-r border-gray-200 z-50 transform transition-transform duration-300
                     lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 
                          flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary-500/30">
                        K
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gradient">{t('common.appName')}</h1>
                        <p className="text-[10px] text-surface-500 uppercase tracking-widest">{t('common.tagline')}</p>
                    </div>
                </div>

                {/* User Info */}
                <div className="px-4 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 
                            flex items-center justify-center text-white text-sm font-bold">
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-surface-900 truncate">
                                {user?.firstName} {user?.lastName}
                            </p>
                            <p className="text-xs text-surface-500">
                                {isAdmin ? t('users.admin') : t('users.storeUser')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                    {filteredItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={onClose}
                            className={({ isActive }) =>
                                `sidebar-link ${isActive ? 'active' : ''}`
                            }
                        >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Logout */}
                <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-200">
                    <button
                        onClick={logout}
                        className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                        <HiOutlineArrowRightOnRectangle className="w-5 h-5" />
                        <span>{t('auth.logout')}</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
