import React, { useLayoutEffect, useState } from 'react';
import { omenx } from '@/lib/omenx';

export default function OmenXCallback() {
    const [status, setStatus] = useState('Completing sign-in…');
    const [error, setError] = useState('');

    useLayoutEffect(() => {
        if (typeof window === 'undefined') return;

        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');

        if (!code || !state) {
            setStatus('Invalid callback parameters.');
            setError(`code=${code}, state=${state}`);
            return;
        }

        (async () => {
            try {
                setStatus('Exchanging authorization code...');
                await omenx.handleCallback();
                setStatus('✓ Sign-in successful! Closing...');
                setTimeout(() => {
                    try {
                        window.close();
                    } catch (e) {
                        setStatus('You can close this window.');
                    }
                }, 500);
            } catch (err) {
                console.error('[OmenX callback] handleCallback error:', err);
                setStatus('❌ Sign-in failed');
                setError(`${err.message || err}`);
            }
        })();
    }, []);

    return (
        <div className="min-h-screen bg-[#0b0416] flex items-center justify-center p-4">
            <div className="text-center text-purple-300 font-mono px-6 max-w-md">
                {!error && <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />}
                <div className="text-sm tracking-widest uppercase">{status}</div>
                {error && (
                    <div className="mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded text-red-200 text-xs break-words">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}