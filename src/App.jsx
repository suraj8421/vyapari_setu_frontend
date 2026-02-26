import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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

import { Toaster } from 'react-hot-toast';

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Toaster position="top-right" />
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="dashboard" element={<DashboardPage />} />
                        <Route path="products" element={<ProductsPage />} />
                        <Route path="sales" element={<SalesPage />} />
                        <Route path="purchases" element={<ProtectedRoute adminOnly><PurchasesPage /></ProtectedRoute>} />
                        <Route path="customers" element={<CustomersPage />} />
                        <Route path="suppliers" element={<ProtectedRoute adminOnly><SuppliersPage /></ProtectedRoute>} />
                        <Route path="stores" element={<ProtectedRoute adminOnly><StoresPage /></ProtectedRoute>} />
                        <Route path="users" element={<ProtectedRoute adminOnly><UsersPage /></ProtectedRoute>} />
                        <Route path="reports" element={<ProtectedRoute adminOnly><ReportsPage /></ProtectedRoute>} />
                        <Route path="entry" element={<UnifiedEntryPage />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}
