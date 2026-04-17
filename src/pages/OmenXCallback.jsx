import React, { useLayoutEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function OmenXCallback() {
    const [status, setStatus] = useState('Processing login...');

    useLayoutEffect(() => {
        if (typeof window === 'undefined') return;

        const exchangeToken = async () => {
            try {
                const params = new URLSearchParams(window.location.search);
                const code = params.get('code');

                if (!code) {
                    setStatus('❌ No authorization code received');
                    setTimeout(() => window.close(), 2000);
                    return;
                }

                // Use backend function to exchange code (avoids CORS)
                const res = await base44.functions.invoke('exchangeOmenXCode', { code });
                const tokenData = res.data;

                if (!tokenData || tokenData.error) {
                    console.error('[OmenX callback] Exchange failed:', tokenData?.error);
                    setStatus('❌ Login failed');
                    setTimeout(() => window.close(), 2000);
                    return;
                }

                const authData = {
                    accessToken: tokenData.accessToken,
                    refreshToken: tokenData.refreshToken,
                    expiresIn: tokenData.expiresIn,
                    walletAddress: tokenData.walletAddress,
                    username: tokenData.username,
                };

                // Write to localStorage
                localStorage.setItem('omenx_auth_data', JSON.stringify(authData));
                console.log('[OmenX callback] ✓ Auth data saved');

                // Notify parent window
                window.dispatchEvent(new StorageEvent('storage', {
                    key: 'omenx_auth_data',
                    newValue: JSON.stringify(authData),
                    storageArea: localStorage,
                }));

                setStatus('✓ Login successful! Closing...');
                setTimeout(() => window.close(), 500);
            } catch (err) {
                console.error('[OmenX callback] Error:', err);
                setStatus(`❌ ${err.message}`);
                setTimeout(() => window.close(), 2000);
            }
        };

        exchangeToken();
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