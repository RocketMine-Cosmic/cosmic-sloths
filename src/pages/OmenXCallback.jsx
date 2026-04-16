import React, { useEffect } from 'react';
import { omenx } from '@/lib/omenx';

// OAuth callback page — opened as a popup by OmenXAuthButton
// The SDK's handleCallback() exchanges the code and posts authData back to the opener
export default function OmenXCallback() {
    useEffect(() => {
        omenx.handleCallback().catch(err => {
            console.error('[OmenX] callback error', err);
        });
    }, []);

    return (
        <div className="min-h-screen bg-[#0b0416] flex items-center justify-center">
            <div className="text-center text-purple-300 font-mono">
                <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <div className="text-sm tracking-widest uppercase">Connecting to OmenX…</div>
            </div>
        </div>
    );
}