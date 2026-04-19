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
import StaffPage from './pages/StaffPage';

import ReportsPage from './pages/ReportsPage';
import UnifiedEntryPage from './pages/UnifiedEntryPage';
import ApprovalsPage from './pages/ApprovalsPage';
import ExpensesPage from './pages/ExpensesPage';
import InventoryPage from './pages/InventoryPage';
import CustomerPortalPage from './pages/CustomerPortalPage';
import NetworkPage from './pages/B2B/NetworkPage';
import RegisterPage from './pages/RegisterPage';
import PlanCheckoutPage from './pages/PlanCheckoutPage';
import StoreProfilePage from './pages/B2B/StoreProfilePage';
import HomePage from './pages/HomePage';
import PublicPaymentPage from './pages/PublicPaymentPage';
import ProfilePage from './pages/ProfilePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Super Admin Imports
import SALayout from './components/superadmin/SALayout';
import SADashboardPage from './pages/superadmin/SADashboardPage';
import SAUsersPage from './pages/superadmin/SAUsersPage';
import SAEmployeesPage from './pages/superadmin/SAEmployeesPage';
import SALeadsPage from './pages/superadmin/SALeadsPage';
import SAPlansPage from './pages/superadmin/SAPlansPage';
import SAPaymentsPage from './pages/superadmin/SAPaymentsPage';
import SAOnboardingPage from './pages/superadmin/SAOnboardingPage';
import SAReportsPage from './pages/superadmin/SAReportsPage';
import SASettingsPage from './pages/superadmin/SASettingsPage';

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
                                <Route path="/register" element={<RegisterPage />} />
                                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                                <Route path="/reset-password" element={<ResetPasswordPage />} />
                                <Route path="/checkout" element={<ProtectedRoute><PlanCheckoutPage /></ProtectedRoute>} />
                                {/* Customer Portal — public, separate from business dashboard */}

                                <Route path="/" element={<HomePage />} />
                                <Route path="/pay/:id" element={<PublicPaymentPage />} />
                                <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                                    <Route path="dashboard" element={<DashboardPage />} />
                                    <Route path="products" element={<ProductsPage />} />
                                    <Route path="sales" element={<SalesPage />} />
                                    <Route path="purchases" element={<ProtectedRoute adminOnly><PurchasesPage /></ProtectedRoute>} />
                                    <Route path="b2b/network" element={<NetworkPage />} />
                                    <Route path="b2b/store/:id" element={<StoreProfilePage />} />
                                    <Route path="b2b/invoices" element={<Navigate to="/approvals" replace />} />
                                    <Route path="customers" element={<CustomersPage />} />
                                    <Route path="ledger" element={<Navigate to="/customers?filter=pending" replace />} />
                                    <Route path="suppliers" element={<ProtectedRoute adminOnly><SuppliersPage /></ProtectedRoute>} />
                                    <Route path="staff" element={<ProtectedRoute adminOnly><StaffPage /></ProtectedRoute>} />

                                    <Route path="reports" element={<ProtectedRoute adminOnly><ReportsPage /></ProtectedRoute>} />
                                    <Route path="entry" element={<UnifiedEntryPage />} />
                                    <Route path="approvals" element={<ProtectedRoute adminOnly><ApprovalsPage /></ProtectedRoute>} />
                                    <Route path="expenses" element={<ExpensesPage />} />
                                    <Route path="inventory" element={<InventoryPage />} />
                                    <Route path="profile" element={<ProfilePage />} />
                                </Route>

                                {/* Super Admin Segment (Currently un-protected for UI preview) */}
                                <Route path="/superadmin" element={<SALayout />}>
                                    <Route index element={<Navigate to="dashboard" replace />} />
                                    <Route path="dashboard" element={<SADashboardPage />} />
                                    <Route path="users" element={<SAUsersPage />} />
                                    <Route path="employees" element={<SAEmployeesPage />} />
                                    <Route path="leads" element={<SALeadsPage />} />
                                    <Route path="plans" element={<SAPlansPage />} />
                                    <Route path="payments" element={<SAPaymentsPage />} />
                                    <Route path="reports" element={<SAReportsPage />} />
                                    <Route path="settings" element={<SASettingsPage />} />
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
