import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

// This page is opened as a popup by OmenXAuthButton.
// It reads the ?code and ?state from the URL, exchanges the code for tokens
// via the OmenX API, then posts the result back to the opener and closes.

// Matches what's registered in the Omen Developer Portal

export default function OmenXCallback() {
    const [status, setStatus] = useState('Connecting to OmenX…');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const savedState = localStorage.getItem('omenx_state');

        if (!code) {
            setStatus('No authorization code received.');
            if (window.opener) window.opener.postMessage({ type: 'OMENX_AUTH_ERROR', error: 'no_code' }, window.location.origin);
            return;
        }

        if (state !== savedState) {
            setStatus('State mismatch — possible CSRF.');
            if (window.opener) window.opener.postMessage({ type: 'OMENX_AUTH_ERROR', error: 'state_mismatch' }, window.location.origin);
            return;
        }

        localStorage.removeItem('omenx_state');

        // Exchange code for token via backend
        console.log('[Callback] Invoking omenxTokenExchange with code:', code);
        base44.functions.invoke('omenxTokenExchange', { code })
            .then(async res => {
                console.log('[Callback] Response received:', res);
                const tokenData = res.data;
                if (tokenData.error) throw new Error(tokenData.error);
                
                // Fetch user info to get wallet address
                let walletData = {};
                try {
                    const userRes = await fetch('https://api.omen.foundation/v1/oauth/userinfo', {
                        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
                    });
                    const text = await userRes.text();
                    console.log('[Callback] /oauth/userinfo status:', userRes.status, 'body:', text);
                    if (userRes.ok && text) {
                        walletData = JSON.parse(text);
                        console.log('[Callback] User info:', walletData);
                    }
                } catch (err) {
                    console.error('[Callback] Failed to fetch user info:', err);
                }

                const fullData = { ...tokenData, ...walletData };
                setStatus('Connected! You can close this window now.');
                localStorage.setItem('omenx_auth_data', JSON.stringify(fullData));
                if (window.opener) {
                    window.opener.postMessage({ type: 'OMENX_AUTH_SUCCESS', payload: fullData }, window.location.origin);
                }
            })
            .catch(err => {
                console.error('[Callback] error', err);
                setStatus('Connection failed: ' + err.message);
                if (window.opener) window.opener.postMessage({ type: 'OMENX_AUTH_ERROR', error: err.message }, window.location.origin);
            });
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