import React, { useLayoutEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function OmenXCallback() {
    const [status, setStatus] = useState('Processing login...');
    const [debugInfo, setDebugInfo] = useState('');

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

                // Grab PKCE code_verifier - try all known keys
                const allSessionKeys = Object.keys(sessionStorage);
                const allLocalKeys = Object.keys(localStorage).filter(k => !k.includes('cosmic_sloth'));
                setDebugInfo(`SS keys: [${allSessionKeys.join(', ')}] | LS keys: [${allLocalKeys.join(', ')}]`);

                // The SDK stores the PKCE verifier under "omenx_pkce_<state>"
                const state = params.get('state');
                const codeVerifier = (state && sessionStorage.getItem(`omenx_pkce_${state}`)) ||
                                     Object.keys(sessionStorage)
                                         .filter(k => k.startsWith('omenx_pkce_'))
                                         .map(k => sessionStorage.getItem(k))[0] ||
                                     null;

                // Use backend function to exchange code (avoids CORS)
                const res = await base44.functions.invoke('exchangeOmenXCode', { code, codeVerifier });
                const tokenData = res.data;

                if (!tokenData || tokenData.error) {
                    const errMsg = tokenData?.details?.error?.message || tokenData?.details?.error?.code || tokenData?.error || 'unknown';
                    setStatus(`❌ ${errMsg}`);
                    setTimeout(() => window.close(), 8000);
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
                setStatus(`❌ ${err.message}`);
                setTimeout(() => window.close(), 8000);
            }
        };

        exchangeToken();
    }, []);

    return (
        <div className="min-h-screen bg-[#0b0416] flex items-center justify-center">
            <div className="text-center text-purple-300 font-mono px-6">
                <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <div className="text-sm tracking-widest uppercase">{status}</div>
                {debugInfo && (
                    <div className="mt-4 text-[10px] text-purple-400/70 max-w-xs break-all text-left">{debugInfo}</div>
                )}
            </div>
        </div>
    );
}