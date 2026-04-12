// ============================================
// Sidebar Component
// ============================================

import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
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
} from 'react-icons/hi2';

export default function Sidebar({ isOpen, onClose }) {
    const { t } = useTranslation();
    const { user, isAdmin, logout } = useAuth();
    
    // Use unified NotificationContext instead of polling transactionAPI
    const { unreadCount: pendingCount } = useNotification();

    const navItems = [
        { to: '/entry', icon: HiOutlineClipboardDocumentList, label: t('nav.unifiedEntry') },
        { to: '/dashboard', icon: HiOutlineChartBarSquare, label: t('nav.dashboard') },
        { to: '/products', icon: HiOutlineCube, label: t('nav.products') },
        // NEW: Inventory page — schema existed, no frontend page at all; grouped with Products
        { to: '/inventory', icon: HiOutlineCubeTransparent, label: t('nav.inventory') },
        { to: '/sales', icon: HiOutlineShoppingCart, label: t('nav.sales') },
        { to: '/purchases', icon: HiOutlineTruck, label: t('nav.purchases'), adminOnly: true },
        { to: '/customers', icon: HiOutlineCurrencyRupee, label: t('nav.khata') },
        // NEW: Expenses page — all users can view; was missing from nav entirely
        { to: '/expenses', icon: HiOutlineReceiptRefund, label: t('nav.expenses') },
        { to: '/suppliers', icon: HiOutlineClipboardDocumentList, label: t('nav.suppliers'), adminOnly: true },
        { to: '/staff', icon: HiOutlineUserGroup, label: t('nav.staff'), adminOnly: true },
        { to: '/reports', icon: HiOutlineDocumentChartBar, label: t('nav.reports'), adminOnly: true },
        // NEW: Approvals link — only for admins, shows live pending count badge
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
                className={`fixed top-0 left-0 h-full w-64 bg-background-cream/95 backdrop-blur-xl 
                     border-r border-gray-200 z-50 transform transition-transform duration-300
                     lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                {/* Space at the top */}
                <div className="pt-4" />

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
                                {isAdmin ? t('users.admin') : t('users.staff')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                    {filteredItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={onClose}
                            className={({ isActive }) =>
                                `sidebar-link ${isActive ? 'active' : ''}`
                            }
                        >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            <span className="flex-1">{item.label}</span>

                            {/* NEW: Live pending count badge.
                                Only rendered for items that have a badge value (Approvals).
                                The badge pulses to draw attention when count > 0. */}
                            {item.badge != null && (
                                <span className="ml-auto flex items-center justify-center
                                                 w-5 h-5 rounded-full bg-amber-500 text-white
                                                 text-[10px] font-black animate-pulse">
                                    {item.badge > 9 ? '9+' : item.badge}
                                </span>
                            )}
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
