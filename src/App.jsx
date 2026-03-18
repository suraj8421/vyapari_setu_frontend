import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { OfflineProvider } from './context/OfflineContext';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import SalesPage from './pages/SalesPage';
import PurchasesPage from './pages/PurchasesPage';
import CustomersPage from './pages/CustomersPage';
import SuppliersPage from './pages/SuppliersPage';
import StoresPage from './pages/StoresPage';
import UsersPage from './pages/UsersPage';
import ReportsPage from './pages/ReportsPage';
import UnifiedEntryPage from './pages/UnifiedEntryPage';
import ApprovalsPage from './pages/ApprovalsPage';
import ExpensesPage from './pages/ExpensesPage';
import InventoryPage from './pages/InventoryPage';
import CustomerPortalPage from './pages/CustomerPortalPage';
import NetworkPage from './pages/B2B/NetworkPage';

import { Toaster } from 'react-hot-toast';

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <SocketProvider>
                    <OfflineProvider>
                        <NotificationProvider>
                        <Toaster position="top-right" />
                        <Routes>
                            <Route path="/login" element={<LoginPage />} />
                            {/* Customer Portal — public, separate from business dashboard */}
                            <Route path="/customer-portal" element={<CustomerPortalPage />} />
                            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                                <Route index element={<Navigate to="/dashboard" replace />} />
                                <Route path="dashboard" element={<DashboardPage />} />
                                <Route path="products" element={<ProductsPage />} />
                                <Route path="sales" element={<SalesPage />} />
                                <Route path="purchases" element={<ProtectedRoute adminOnly><PurchasesPage /></ProtectedRoute>} />
                                <Route path="b2b/network" element={<NetworkPage />} />
                                <Route path="b2b/invoices" element={<Navigate to="/approvals" replace />} />
                                <Route path="customers" element={<CustomersPage />} />
                                <Route path="suppliers" element={<ProtectedRoute adminOnly><SuppliersPage /></ProtectedRoute>} />
                                <Route path="stores" element={<ProtectedRoute adminOnly><StoresPage /></ProtectedRoute>} />
                                <Route path="users" element={<ProtectedRoute adminOnly><UsersPage /></ProtectedRoute>} />
                                <Route path="reports" element={<ProtectedRoute adminOnly><ReportsPage /></ProtectedRoute>} />
                                <Route path="entry" element={<UnifiedEntryPage />} />
                                <Route path="approvals" element={<ProtectedRoute adminOnly><ApprovalsPage /></ProtectedRoute>} />
                                <Route path="expenses" element={<ExpensesPage />} />
                                <Route path="inventory" element={<InventoryPage />} />
                            </Route>
                            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                    </NotificationProvider>
                </OfflineProvider>
                </SocketProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
