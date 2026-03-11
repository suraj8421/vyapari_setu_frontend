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
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                window.location.href = '/login';
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
    getProfile: () => api.get('/auth/me'),
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

// FIX: New expense API — expenses had no listing/management endpoints previously
export const expenseAPI = {
    getAll: (params) => api.get('/expenses', { params }),
    getById: (id) => api.get(`/expenses/${id}`),
    getCategories: () => api.get('/expenses/categories'),
};

export default api;

