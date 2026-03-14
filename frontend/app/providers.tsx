'use client';

import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            {children}
            <Toaster
                position="bottom-right"
                toastOptions={{
                    style: {
                        background: '#111',
                        color: '#fff',
                        border: '1px solid #222',
                        borderRadius: '8px',
                        fontSize: '14px',
                    },
                    success: {
                        iconTheme: { primary: '#fff', secondary: '#000' },
                    },
                    error: {
                        iconTheme: { primary: '#ff4444', secondary: '#000' },
                    },
                }}
            />
        </AuthProvider>
    );
}
