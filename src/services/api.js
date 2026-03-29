// ============================================
// Axios API Client
// ============================================

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor: attach access token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor: handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) {
                    throw new Error('No refresh token');
                }

                const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                    refreshToken,
                });

                if (data.success) {
                    localStorage.setItem('accessToken', data.data.accessToken);
                    localStorage.setItem('refreshToken', data.data.refreshToken);
                    originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                // Do not forcefully log out if using the Mock Super Admin
                if (localStorage.getItem('accessToken') !== 'mock-super-token') {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                }
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

// ─── API Methods ─────────────────────────────

// Auth
export const authAPI = {
    login: (data) => api.post('/auth/login', data),
    register: (data) => api.post('/auth/register', data),
    refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
    logout: () => api.post('/auth/logout'),
    getProfile: () => api.get('/auth/profile'),
};

// Dashboard
export const dashboardAPI = {
    getOverview: (storeId) => api.get('/dashboard/overview', { params: { storeId } }),
    getSalesChart: (days, storeId) => api.get('/dashboard/sales-chart', { params: { days, storeId } }),
    getTopProducts: (limit, storeId) => api.get('/dashboard/top-products', { params: { limit, storeId } }),
    getProfitLoss: (startDate, endDate, storeId) => api.get('/dashboard/profit-loss', { params: { startDate, endDate, storeId } }),
    getStaffPerformance: (storeId) => api.get('/dashboard/staff-performance', { params: { storeId } }),
};

// Stores
export const storeAPI = {
    getAll: (params) => api.get('/stores', { params }),
    getById: (id) => api.get(`/stores/${id}`),
    create: (data) => api.post('/stores', data),
    update: (id, data) => api.put(`/stores/${id}`, data),
    delete: (id) => api.delete(`/stores/${id}`),
};

// Products
export const productAPI = {
    getAll: (params) => api.get('/products', { params }),
    getById: (id) => api.get(`/products/${id}`),
    create: (data) => api.post('/products', data),
    update: (id, data) => api.put(`/products/${id}`, data),
    delete: (id) => api.delete(`/products/${id}`),
    getCategories: () => api.get('/products/categories'),
    getLowStock: () => api.get('/products/low-stock'),
    getMovementHistory: (id) => api.get(`/products/${id}/movement`),
};

// Sales
export const saleAPI = {
    getAll: (params) => api.get('/sales', { params }),
    getById: (id) => api.get(`/sales/${id}`),
    create: (data) => api.post('/sales', data),
    // FIX: Added updateStatus method — was missing despite SaleStatus enum having RETURNED etc.
    updateStatus: (id, data) => api.patch(`/sales/${id}/status`, data),
};

// Purchases
export const purchaseAPI = {
    getAll: (params) => api.get('/purchases', { params }),
    getById: (id) => api.get(`/purchases/${id}`),
    create: (data) => api.post('/purchases', data),
    // FIX: Added updateStatus method — was missing despite PurchaseStatus enum having CANCELLED etc.
    updateStatus: (id, data) => api.patch(`/purchases/${id}/status`, data),
};

// Customers
export const customerAPI = {
    getAll: (params) => api.get('/customers', { params }),
    getById: (id) => api.get(`/customers/${id}`),
    create: (data) => api.post('/customers', data),
    update: (id, data) => api.put(`/customers/${id}`, data),
    delete: (id) => api.delete(`/customers/${id}`),
    getLedger: (id, params) => api.get(`/customers/${id}/ledger`, { params }),
    recordPayment: (data) => api.post('/customers/payment', data),
    getOutstanding: () => api.get('/customers/outstanding'),
};

// Suppliers
export const supplierAPI = {
    getAll: (params) => api.get('/suppliers', { params }),
    getById: (id) => api.get(`/suppliers/${id}`),
    create: (data) => api.post('/suppliers', data),
    update: (id, data) => api.put(`/suppliers/${id}`, data),
    delete: (id) => api.delete(`/suppliers/${id}`),
};

// Users
export const userAPI = {
    getAll: (params) => api.get('/users', { params }),
    getById: (id) => api.get(`/users/${id}`),
    create: (data) => api.post('/users', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
};

// Transactions (Unified Entry)
export const transactionAPI = {
    create: (data) => api.post('/transactions', data),
    update: (type, id, data) => api.put(`/transactions/${type}/${id}`, data),
    getHistory: (type, id) => api.get(`/transactions/${type}/${id}/history`),
    // FIX: Updated approve/reject to use the new /logs/:logId/* URL pattern
    // (old /approve/:logId had a potential route conflict)
    approve: (logId) => api.post(`/transactions/logs/${logId}/approve`),
    reject: (logId, notes) => api.post(`/transactions/logs/${logId}/reject`, { notes }),
    // FIX: Added getPending — was completely missing, admins had no discovery mechanism
    getPending: () => api.get('/transactions/pending'),
};

// NEW: Full expense API — previously only getAll, getById, getCategories existed.
// Added create/update/delete to match the backend controller which had these methods.
export const expenseAPI = {
    getAll: (params) => api.get('/expenses', { params }),
    getById: (id) => api.get(`/expenses/${id}`),
    getCategories: () => api.get('/expenses/categories'),
    create: (data) => api.post('/expenses', data),
    update: (id, data) => api.put(`/expenses/${id}`, data),
    delete: (id) => api.delete(`/expenses/${id}`),
};

// Scanner API
export const scannerAPI = {
    scanBarcode: (barcode) => api.post('/scanner/barcode', { barcode }),
    processImage: (formData) => api.post('/scanner/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    processDocument: (formData) => api.post('/scanner/document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
};

// B2B Network API
export const b2bAPI = {
    // Network
    getConnections: () => api.get('/b2b/network'),
    searchStores: (query) => api.get('/b2b/network/search', { params: { q: query } }),
    requestConnection: (targetStoreId, intent) => api.post('/b2b/network/request', { targetStoreId, intent }),
    acceptConnection: (connectionId) => api.post(`/b2b/network/${connectionId}/accept`),
    
    // Invoices
    getInvoices: () => api.get('/b2b/invoices'),
    createInvoice: (data) => api.post('/b2b/invoices/create', data),
    confirmInvoice: (id) => api.post(`/b2b/invoices/${id}/confirm`),
    rejectInvoice: (id, reason) => api.post(`/b2b/invoices/${id}/reject`, { reason }),
    requestCorrection: (id, reason) => api.post(`/b2b/invoices/${id}/request-correction`, { reason }),

    // Messages
    getMessages: (invoiceId) => api.get(`/b2b/messages/${invoiceId}`),
    sendMessage: (invoiceId, messageText) => api.post('/b2b/messages/send', { invoiceId, messageText }),

    // Notifications
    getNotifications: () => api.get('/b2b/notifications'),
    markAsRead: (id) => api.post(`/b2b/notifications/${id}/read`),
    markAllAsRead: () => api.post('/b2b/notifications/mark-all-read'),

    // Store Profile & Ordering
    getStoreDetails: (id) => api.get(`/b2b/store/${id}`),
    getStoreProducts: (id) => api.get(`/b2b/store/${id}/products`),
    placeOrder: (data) => api.post('/b2b/place-order', data),
};

// Unified Approval Notification API
export const approvalAPI = {
    getAll: (params) => api.get('/approvals', { params }),
    getUnreadCount: () => api.get('/approvals/unread-count'),
    markRead: (id) => api.patch(`/approvals/${id}/read`),
    markAllRead: () => api.post('/approvals/mark-all-read'),
    confirmInvoice: (notifId) => api.post(`/approvals/${notifId}/confirm-invoice`),
    rejectInvoice: (notifId, reason) => api.post(`/approvals/${notifId}/reject-invoice`, { reason }),
    acceptConnection: (notifId) => api.post(`/approvals/${notifId}/accept-connection`),
    // NEW: Properly blocks the connection (sets status BLOCKED) rather than just marking read
    rejectConnection: (notifId, reason) => api.post(`/approvals/${notifId}/reject-connection`, { reason }),
    lock: (id) => api.post(`/approvals/${id}/lock`),
    unlock: (id) => api.post(`/approvals/${id}/unlock`),
    bulkAction: (ids, action) => api.post(`/approvals/bulk-action`, { ids, action }),
};

// Plan API
export const planAPI = {
    getAll: () => api.get('/plans'),
    getAllAdmin: () => api.get('/plans/admin'),
    create: (data) => api.post('/plans', data),
    update: (id, data) => api.put(`/plans/${id}`, data),
    delete: (id) => api.delete(`/plans/${id}`),
};

// Super Admin Dashboard
export const saDashboardAPI = {
    getStats: (range) => api.get('/sa-dashboard/stats', { params: { range } }),
    getGrowth: () => api.get('/sa-dashboard/growth'),
};

export const saLeadsAPI = {
    getAll: (params) => api.get('/sa-leads', { params }),
    create: (data) => api.post('/sa-leads', data),
    update: (id, data) => api.put(`/sa-leads/${id}`, data),
    delete: (id) => api.delete(`/sa-leads/${id}`),
    export: () => api.get('/sa-leads/export', { responseType: 'blob' }),
};

export const saReportsAPI = {
    exportClients: () => api.get('/sa-users/export', { responseType: 'blob' }),
    exportEmployees: () => api.get('/employees/export', { responseType: 'blob' }),
    exportPayments: () => api.get('/sa-users/payments/export', { responseType: 'blob' }),
    exportSubscriptions: () => api.get('/sa-users/subscriptions/export', { responseType: 'blob' }),
};

export default api;

// ─── Customer Portal API (separate Axios instance with customer tokens) ────

const CUSTOMER_API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/customer-portal` : '/api/customer-portal';

const customerApi = axios.create({
    baseURL: CUSTOMER_API_BASE,
    headers: { 'Content-Type': 'application/json' },
});

// Attach customer token (stored separately from business token)
customerApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('customerAccessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle customer token refresh
customerApi.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem('customerRefreshToken');
                if (!refreshToken) throw new Error('No refresh token');
                const { data } = await axios.post(`${CUSTOMER_API_BASE}/refresh`, { refreshToken });
                if (data.success) {
                    localStorage.setItem('customerAccessToken', data.data.accessToken);
                    localStorage.setItem('customerRefreshToken', data.data.refreshToken);
                    originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
                    return customerApi(originalRequest);
                }
            } catch (_) {
                localStorage.removeItem('customerAccessToken');
                localStorage.removeItem('customerRefreshToken');
                localStorage.removeItem('customerUser');
                window.location.href = '/customer-portal';
            }
        }
        return Promise.reject(error);
    }
);

export const customerPortalAPI = {
    register: (data) => customerApi.post('/register', data),
    login: (data) => customerApi.post('/login', data),
    refresh: (refreshToken) => customerApi.post('/refresh', { refreshToken }),
    logout: () => customerApi.post('/logout'),
    getProfile: () => customerApi.get('/profile'),
    getNotifications: (params) => customerApi.get('/notifications', { params }),
    acceptNotification: (id) => customerApi.put(`/notifications/${id}/accept`),
    rejectNotification: (id, reason) => customerApi.put(`/notifications/${id}/reject`, { reason }),
    getPurchases: (params) => customerApi.get('/purchases', { params }),
};
