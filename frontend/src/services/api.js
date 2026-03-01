/**
 * api.js — Zenith Gold X™ Frontend Axios Module
 *
 * Phase 5 Implementation:
 *  - Auto-loads JWT from localStorage on import
 *  - Sets Authorization header globally
 *  - Intercepts 401 → auto-logout
 *  - Extracts clean error messages from backend responses
 */

import axios from 'axios';

// Shared axios instance (used by all pages)
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5005/api',
    timeout: 15000
});

// ---------------------------------------------------------------
// Phase 5 — Auto-hydrate token on app load
// ---------------------------------------------------------------
const token = localStorage.getItem('token');
if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// ---------------------------------------------------------------
// Phase 5 — Login helper (call this after successful login)
// ---------------------------------------------------------------
export function hydrateAuth(data) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role);
    localStorage.setItem('userId', data.id);

    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
}

// ---------------------------------------------------------------
// Phase 5 — Logout helper
// ---------------------------------------------------------------
export function clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    delete api.defaults.headers.common['Authorization'];
    delete axios.defaults.headers.common['Authorization'];
}

// ---------------------------------------------------------------
// Phase 5 — Response / Error Interceptor
// ---------------------------------------------------------------
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const msg = error.response?.data?.message || "Upload failed";
        alert(msg);

        if (error?.response?.status === 401) {
            clearAuth();
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

export default api;
