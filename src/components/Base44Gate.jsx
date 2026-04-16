import React from 'react';
import { useAuth } from '@/lib/AuthContext';

export default function Base44Gate({ children }) {
    const { isAuthenticated, isLoadingAuth, authError } = useAuth();

    if (isLoadingAuth) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
                <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!isAuthenticated || authError) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔒</div>
                    <h2 className="text-2xl font-bold text-cyan-400 mb-2">Authentication Required</h2>
                    <p className="text-slate-400 mb-4">Redirecting to login...</p>
                </div>
            </div>
        );
    }

    return children;
}