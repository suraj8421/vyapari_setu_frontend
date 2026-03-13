// ============================================
// Main Layout (Sidebar + Header + Content)
// ============================================

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import OfflineBanner from '../common/OfflineBanner';

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="lg:ml-64 min-h-screen flex flex-col">
                <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
                <OfflineBanner />

                <main className="flex-1 p-4 lg:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
