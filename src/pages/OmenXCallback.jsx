import React, { useLayoutEffect, useState } from 'react';

export default function OmenXCallback() {
    const [status, setStatus] = useState('Completing sign-in…');

    useLayoutEffect(() => {
        if (typeof window === 'undefined') return;

        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');

        if (!code || !state) {
            setStatus('Invalid callback parameters.');
            return;
        }

        try {
            const storageKey = `omenx_oauth_callback_${state}`;
            localStorage.setItem(
                storageKey,
                JSON.stringify({ code, state, timestamp: Date.now() })
            );
            console.log(`[OmenX callback] Stored ${storageKey}`);
        } catch (e) {
            console.error('[OmenX callback] localStorage failed', e);
            setStatus('Storage error. Please retry login.');
            return;
        }

        // Close popup after brief delay for storage flush
        setTimeout(() => {
            try {
                window.close();
            } catch (e) {
                console.error('[OmenX callback] Failed to close popup', e);
                setStatus('You can close this window.');
            }
        }, 150);
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