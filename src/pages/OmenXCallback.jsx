import React, { useLayoutEffect, useState } from 'react';

export default function OmenXCallback() {
    const [status, setStatus] = useState('✓ Sign-in successful! Closing...');

    useLayoutEffect(() => {
        if (typeof window === 'undefined') return;

        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');

        // Close popup after delay—let the opener window handle token exchange
        setTimeout(() => {
            try {
                window.close();
            } catch (e) {
                console.error('[OmenX callback] Close failed', e);
                setStatus('You can close this window.');
            }
        }, 500);
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