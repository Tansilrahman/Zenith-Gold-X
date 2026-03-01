import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import api from '../services/api';
import { jwtDecode } from 'jwt-decode';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchMe = async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                // Guard against malformed tokens crashing jwtDecode
                let decoded;
                try {
                    decoded = jwtDecode(token);
                } catch {
                    logout();
                    setLoading(false);
                    return;
                }

                if (decoded.exp * 1000 < Date.now()) {
                    logout();
                    setLoading(false);
                    return;
                }

                const res = await api.get('/auth/me');
                setUser(res.data);
                localStorage.setItem('userId', res.data.id);
                localStorage.setItem('role', res.data.role);
            } catch (err) {
                logout(); // standardized clear session
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchMe();
    }, []);

    const login = async (email, password) => {
        const res = await api.post('/auth/login', { email, password });
        const { token, role, id } = res.data;

        // Persist session & set global auth header immediately
        localStorage.setItem('token', token);
        localStorage.setItem('role', role);
        localStorage.setItem('userId', id);

        // Set on both the shared api instance AND global axios
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        await fetchMe();
        return res.data;
    };

    const register = async (name, email, password, role) => {
        const res = await api.post('/auth/register', { name, email, password, role });
        return res.data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('role');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading, fetchMe }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
