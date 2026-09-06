// ============================================
// Protected Route Component
// ============================================

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children, adminOnly = false, superAdminOnly = false }) {
    const { isAuthenticated, isAdmin, user } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Super admin routes: only role === 'SUPERADMIN' may pass
    if (superAdminOnly && user?.role !== 'SUPERADMIN') {
        return <Navigate to="/dashboard" replace />;
    }

    if (adminOnly && !isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}
