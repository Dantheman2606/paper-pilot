'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export interface User {
    id: string;
    email: string;
    name: string;
    createdAt: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const logout = useCallback(() => {
        localStorage.removeItem('pp_token');
        setToken(null);
        setUser(null);
        router.push('/login');
    }, [router]);

    useEffect(() => {
        const storedToken = localStorage.getItem('pp_token');
        if (!storedToken) {
            setLoading(false);
            return;
        }

        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        api.get('/auth/me')
            .then((res) => {
                setUser(res.data);
                setToken(storedToken);
            })
            .catch(() => {
                localStorage.removeItem('pp_token');
            })
            .finally(() => setLoading(false));
    }, []);

    const login = async (email: string, password: string) => {
        const res = await api.post('/auth/login', { email, password });
        const { token: t, user: u } = res.data;
        localStorage.setItem('pp_token', t);
        api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
        setToken(t);
        setUser(u);
        router.push('/chat');
    };

    const register = async (email: string, password: string, name: string) => {
        const res = await api.post('/auth/register', { email, password, name });
        const { token: t, user: u } = res.data;
        localStorage.setItem('pp_token', t);
        api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
        setToken(t);
        setUser(u);
        router.push('/chat');
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
