import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { OfflineProvider } from './context/OfflineContext';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoadingFallback from './components/common/LoadingFallback';

// ── CRITICAL ROUTES (Eager Load) ─────────────────────────────────────────────
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';

// ── PROTECTED ROUTES (Lazy Load) ─────────────────────────────────────────────
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const SalesPage = lazy(() => import('./pages/SalesPage'));
const PurchasesPage = lazy(() => import('./pages/PurchasesPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const SuppliersPage = lazy(() => import('./pages/SuppliersPage'));
const StaffPage = lazy(() => import('./pages/StaffPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const UnifiedEntryPage = lazy(() => import('./pages/UnifiedEntryPage'));
const ApprovalsPage = lazy(() => import('./pages/ApprovalsPage'));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

// ── PUBLIC/UTILITY ROUTES (Lazy Load) ────────────────────────────────────────
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const PublicPaymentPage = lazy(() => import('./pages/PublicPaymentPage'));
const PlanCheckoutPage = lazy(() => import('./pages/PlanCheckoutPage'));
const CustomerPortalPage = lazy(() => import('./pages/CustomerPortalPage'));

// ── B2B MODULES (Lazy Load) ──────────────────────────────────────────────────
const NetworkPage = lazy(() => import('./pages/B2B/NetworkPage'));
const StoreProfilePage = lazy(() => import('./pages/B2B/StoreProfilePage'));

// ── SUPER ADMIN SEGMENT (Lazy Load) ──────────────────────────────────────────
const SALayout = lazy(() => import('./components/superadmin/SALayout'));
const SADashboardPage = lazy(() => import('./pages/superadmin/SADashboardPage'));
const SAUsersPage = lazy(() => import('./pages/superadmin/SAUsersPage'));
const SAEmployeesPage = lazy(() => import('./pages/superadmin/SAEmployeesPage'));
const SALeadsPage = lazy(() => import('./pages/superadmin/SALeadsPage'));
const SAPlansPage = lazy(() => import('./pages/superadmin/SAPlansPage'));
const SAPaymentsPage = lazy(() => import('./pages/superadmin/SAPaymentsPage'));
const SAOnboardingPage = lazy(() => import('./pages/superadmin/SAOnboardingPage'));
const SAReportsPage = lazy(() => import('./pages/superadmin/SAReportsPage'));
const SASettingsPage = lazy(() => import('./pages/superadmin/SASettingsPage'));

import { Toaster } from 'react-hot-toast';

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <SocketProvider>
                    <OfflineProvider>
                        <NotificationProvider>
                            <Toaster position="top-right" />
                            <Suspense fallback={<LoadingFallback />}>
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
                            </Suspense>
                        </NotificationProvider>
                    </OfflineProvider>
                </SocketProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
