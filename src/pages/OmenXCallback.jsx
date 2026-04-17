import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function OmenXCallback() {
    const [status, setStatus] = useState('Processing OAuth callback…');

    useEffect(() => {
        const exchangeCode = async () => {
            try {
                const params = new URLSearchParams(window.location.search);
                const code = params.get('code');
                
                if (!code) {
                    setStatus('No authorization code received');
                    return;
                }

                // Call backend to exchange code for token using ServerSDK
                const res = await base44.functions.invoke('omenxTokenExchange', { code });
                
                if (res.data.access_token) {
                    // Store auth data in localStorage for SDK and app to use
                    localStorage.setItem('omenx_auth_data', JSON.stringify({
                        access_token: res.data.access_token,
                        token_type: res.data.token_type || 'Bearer',
                        expires_in: res.data.expires_in,
                        walletAddress: res.data.walletAddress,
                        userId: res.data.userId,
                        username: res.data.username,
                    }));
                    
                    // Notify opener and close
                    if (window.opener) {
                        window.opener.postMessage({ type: 'OMENX_AUTH_COMPLETE' }, window.location.origin);
                    }
                    window.close();
                } else {
                    setStatus('Token exchange failed');
                }
            } catch (err) {
                console.error('[OmenXCallback] Error:', err);
                setStatus(`Error: ${err.message}`);
            }
        };

        exchangeCode();
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