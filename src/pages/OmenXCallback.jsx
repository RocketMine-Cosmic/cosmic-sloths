import React, { useEffect, useState } from 'react';

export default function OmenXCallback() {
    const [status, setStatus] = useState('Processing OAuth callback…');

    useEffect(() => {
        // SDK automatically handles code exchange and stores auth data
        // Wait a moment for SDK to complete, then close popup
        const timer = setTimeout(() => {
            if (window.opener) {
                window.opener.postMessage({ type: 'OMENX_AUTH_COMPLETE' }, window.location.origin);
            }
            window.close();
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="min-h-screen bg-[#0b0416] flex items-center justify-center">
            <div className="text-center text-purple-300 font-mono px-6">
                <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <div className="text-sm tracking-widest uppercase">{status}</div>
            </div>
        </div>
    );
}