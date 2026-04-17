import React, { useLayoutEffect, useState } from 'react';

export default function OmenXCallback() {
    const [status, setStatus] = useState('Processing login...');

    useLayoutEffect(() => {
        if (typeof window === 'undefined') return;

        const exchangeToken = async () => {
            try {
                const params = new URLSearchParams(window.location.search);
                const code = params.get('code');
                const state = params.get('state');

                if (!code) {
                    setStatus('❌ No authorization code received');
                    setTimeout(() => window.close(), 2000);
                    return;
                }

                const apiBaseUrl = 'https://api.omen.foundation';
                const redirectUri = 'https://cosmic-sloth-survival-copy-b89d66e3.base44.app/auth/callback';

                // Exchange code for tokens
                const tokenResponse = await fetch(`${apiBaseUrl}/v1/oauth/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        grant_type: 'authorization_code',
                        code,
                        redirect_uri: redirectUri,
                        client_id: 'cosmic-sloths',
                    }),
                });

                if (!tokenResponse.ok) {
                    const error = await tokenResponse.json();
                    console.error('[OmenX callback] Token exchange failed:', error);
                    setStatus('❌ Token exchange failed');
                    setTimeout(() => window.close(), 2000);
                    return;
                }

                const tokenData = await tokenResponse.json();
                const authData = {
                    accessToken: tokenData.access_token,
                    refreshToken: tokenData.refresh_token,
                    expiresIn: tokenData.expires_in,
                    walletAddress: tokenData.wallet_address,
                    username: tokenData.username,
                };

                // Write to localStorage
                localStorage.setItem('omenx_auth_data', JSON.stringify(authData));
                console.log('[OmenX callback] ✓ Auth data saved:', authData);

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