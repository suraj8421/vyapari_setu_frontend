// src/services/api.js
// Centralized Axios instance and grouped service objects for the VyapariSetu frontend.
// This file now exports all APIs used throughout the app (auth, customers, products, dashboard, etc.)

import axios from 'axios';

// Base URL – can be overridden via VITE_API_URL in a .env file.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const API_BASE_URL = API_URL;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send cookies / auth headers
});

// Attach auth token from localStorage if present.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Global response interceptor – handles global errors like 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If we get a 401, it means our token is either missing, expired, or invalid.
    // We should clear the local auth state and redirect to login.
    if (error.response && error.response.status === 401) {
      console.warn('[api] Unauthorized (401) detected. Clearing local auth and redirecting...');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      
      // We only reload if we aren't already on the login page to avoid infinite loops
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------
export const authAPI = {
  login: (payload) => api.post('/auth/login', payload),
  register: (payload) => api.post('/auth/register', payload),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  changePassword: (payload) => api.post('/auth/change-password', payload),
  resetPassword: (payload) => api.post('/auth/reset-password', payload),
};

// ---------------------------------------------------------------------
// Customer API – used throughout the app (Dashboard, Customers page, Reports, etc.)
// ---------------------------------------------------------------------
export const customerAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getOne: (id) => api.get(`/customers/${id}`),
  create: (payload) => api.post('/customers', payload),
  update: (id, payload) => api.put(`/customers/${id}`, payload),
  delete: (id) => api.delete(`/customers/${id}`),
  getOutstanding: () => api.get('/customers/outstanding'), // used in DashboardPage
  getLedger: (customerId, query) => api.get(`/customers/${customerId}/ledger`, { params: query }),
  recordPayment: (payload) => api.post('/customers/payments', payload),
};

// ---------------------------------------------------------------------
// Product API – used for inventory and low‑stock alerts
// ---------------------------------------------------------------------
export const productAPI = {
  getAll: (params) => api.get('/products', { params }),
  getOne: (id) => api.get(`/products/${id}`),
  create: (payload) => api.post('/products', payload),
  update: (id, payload) => api.put(`/products/${id}`, payload),
  delete: (id) => api.delete(`/products/${id}`),
  getLowStock: () => api.get('/products/low-stock'), // used in DashboardPage
  getTopProducts: (limit) => api.get('/products/top', { params: { limit } }),
  getCategories: () => api.get('/products/categories'),
  getMovementHistory: (id) => api.get(`/products/${id}/movement`),
  adjustStock: (id, payload) => api.post(`/products/${id}/adjust`, payload),
  match: (payload) => api.post('/products/match', payload),
};

// ---------------------------------------------------------------------
// Supplier API
// ---------------------------------------------------------------------
export const supplierAPI = {
  getAll: (params) => api.get('/suppliers', { params }),
  getOne: (id) => api.get(`/suppliers/${id}`),
  create: (payload) => api.post('/suppliers', payload),
  update: (id, payload) => api.put(`/suppliers/${id}`, payload),
  delete: (id) => api.delete(`/suppliers/${id}`),
  match: (payload) => api.post('/suppliers/match', payload),
};

// ---------------------------------------------------------------------
// Store API
// ---------------------------------------------------------------------
export const storeAPI = {
  getAll: (params) => api.get('/stores', { params }),
  getOne: (id) => api.get(`/stores/${id}`),
  create: (payload) => api.post('/stores', payload),
  update: (id, payload) => api.put(`/stores/${id}`, payload),
  delete: (id) => api.delete(`/stores/${id}`),
};

// ---------------------------------------------------------------------
// User API – Staff Management (Force Refresh for Vite cache)
// ---------------------------------------------------------------------
export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getOne: (id) => api.get(`/users/${id}`),
  create: (payload) => api.post('/users', payload),
  update: (id, payload) => api.put(`/users/${id}`, payload),
  delete: (id) => api.delete(`/users/${id}`),
};

// ---------------------------------------------------------------------
// Employee API – Detailed HR Management
// ---------------------------------------------------------------------
export const employeeAPI = {
  getAll: (params) => api.get('/employees', { params }),
  getOne: (id) => api.get(`/employees/${id}`),
  create: (payload) => api.post('/employees', payload),
  update: (id, payload) => api.put(`/employees/${id}`, payload),
  delete: (id) => api.delete(`/employees/${id}`),
  toggleStatus: (id) => api.patch(`/employees/${id}/status`),
  getManagers: () => api.get('/employees/managers'),
  export: () => api.get('/employees/export', { responseType: 'blob' }),
};

// ---------------------------------------------------------------------
// Translate API
// ---------------------------------------------------------------------
export const translateAPI = {
  translate: (payload) => api.post('/translate', payload),
};

// ---------------------------------------------------------------------
// B2B API – Network & Sync
// ---------------------------------------------------------------------
export const b2bAPI = {
  searchStores: (query) => api.get('/b2b/network/search', { params: { q: query } }),
  requestConnection: (targetStoreId, intent) => api.post('/b2b/network/request', { targetStoreId, intent }),
  getConnections: () => api.get('/b2b/network'),
  acceptConnection: (connectionId) => api.post(`/b2b/network/${connectionId}/accept`),
  getStoreDetails: (id) => api.get(`/b2b/store/${id}`),
  getStoreProducts: (id) => api.get(`/b2b/store/${id}/products`),
};

// ---------------------------------------------------------------------
// Dashboard API – aggregates data for the Dashboard page.
// ---------------------------------------------------------------------
export const dashboardAPI = {
  getOverview: () => api.get('/dashboard/overview'),
  getSalesChart: (days) => api.get('/dashboard/sales-chart', { params: { days } }),
  getTopProducts: (limit) => api.get('/dashboard/top-products', { params: { limit } }),
  getProfitLoss: (startDate, endDate) => api.get('/dashboard/profit-loss', { params: { startDate, endDate } }),
};

// ---------------------------------------------------------------------
// Sale API – used by SalesPage.jsx
// ---------------------------------------------------------------------
export const saleAPI = {
  getAll: (params) => api.get('/sales', { params }),
  getOne: (id) => api.get(`/sales/${id}`),
  create: (payload) => api.post('/sales', payload),
  updateStatus: (id, payload) => api.patch(`/sales/${id}/status`, payload),
  delete: (id) => api.delete(`/sales/${id}`),
};

// ---------------------------------------------------------------------
// Sales‑Leads API
// ---------------------------------------------------------------------
export const saLeadsAPI = {
  getAll: (params) => api.get('/sales-leads', { params }),
  create: (payload) => api.post('/sales-leads', payload),
  update: (id, payload) => api.put(`/sales-leads/${id}`, payload),
  delete: (id) => api.delete(`/sales-leads/${id}`),
};

// ---------------------------------------------------------------------
// Approval API
// ---------------------------------------------------------------------
export const approvalAPI = {
  getAll: (params) => api.get('/approvals', { params }),
  getOne: (id) => api.get(`/approvals/${id}`),
  create: (payload) => api.post('/approvals', payload),
  update: (id, payload) => api.put(`/approvals/${id}`, payload),
  delete: (id) => api.delete(`/approvals/${id}`),
  getUnreadCount: () => api.get('/approvals/unread-count'),
  lock: (id) => api.post(`/approvals/${id}/lock`),
  unlock: (id) => api.post(`/approvals/${id}/unlock`),
  markRead: (id) => api.patch(`/approvals/${id}/read`),
  markAllRead: () => api.patch('/approvals/read-all'),
  bulkAction: (ids, action) => api.post('/approvals/bulk', { ids, action }),
  confirmInvoice: (id) => api.post(`/approvals/${id}/confirm-invoice`),
  acceptConnection: (id) => api.post(`/approvals/${id}/accept-connection`),
  rejectInvoice: (id, reason) => api.post(`/approvals/${id}/reject-invoice`, { reason }),
  rejectConnection: (id, reason) => api.post(`/approvals/${id}/reject-connection`, { reason }),
};

// ---------------------------------------------------------------------
// Expense API
// ---------------------------------------------------------------------
export const expenseAPI = {
  getAll: (params) => api.get('/expenses', { params }),
  getOne: (id) => api.get(`/expenses/${id}`),
  getCategories: () => api.get('/expenses/categories'),
};

// ---------------------------------------------------------------------
// Purchase API
// ---------------------------------------------------------------------
export const purchaseAPI = {
  getAll: (params) => api.get('/purchases', { params }),
  getOne: (id) => api.get(`/purchases/${id}`),
  create: (payload) => api.post('/purchases', payload),
  updateStatus: (id, payload) => api.patch(`/purchases/${id}/status`, payload),
  scan: (formData) => api.post('/purchases/scan', formData, { 
    headers: { 'Content-Type': 'multipart/form-data' } 
  }),
  getScanStatus: (jobId) => api.get(`/purchases/scan-status/${jobId}`),
};

// ---------------------------------------------------------------------
// Plan API
// ---------------------------------------------------------------------
export const planAPI = {
  getAll: () => api.get('/plans'),
  getOne: (id) => api.get(`/plans/${id}`),
  create: (data) => api.post('/plans', data),
  update: (id, data) => api.put(`/plans/${id}`, data),
  delete: (id) => api.delete(`/plans/${id}`),
};

// ---------------------------------------------------------------------
// Payment API (Razorpay)
// ---------------------------------------------------------------------
export const paymentAPI = {
  createOrder: (payload) => api.post('/payments/create-order', payload),
  verifyPayment: (payload) => api.post('/payments/verify-payment', payload),
  getPublicCustomer: (id) => api.get(`/payments/public/customer/${id}`),
};

// Export the default axios instance for any ad‑hoc calls.
export default api;

