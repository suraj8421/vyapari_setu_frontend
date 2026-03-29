import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SASidebar from './SASidebar';
import Header from '../layout/Header';

export default function SALayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-surface-50">
            <SASidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="lg:ml-64 min-h-screen flex flex-col">
                <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} isSuperAdmin={true} />
                
                <main className="flex-1 p-4 lg:p-6 pb-20 overflow-x-hidden">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
