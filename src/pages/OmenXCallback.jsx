import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

// This page is opened as a popup by OmenXAuthButton.
// It reads the ?code and ?state from the URL, exchanges the code for tokens
// via the OmenX API, then posts the result back to the opener and closes.

const REDIRECT_URI = 'https://cosmic-sloth-survival-copy-b89d66e3.base44.app/auth/callback';

export default function OmenXCallback() {
    const [status, setStatus] = useState('Connecting to OmenX…');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const savedState = sessionStorage.getItem('omenx_state');

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

        sessionStorage.removeItem('omenx_state');

        // Exchange code for token via backend (keeps API key secret)
        base44.functions.invoke('omenxTokenExchange', { code })
            .then(res => {
                const data = res.data;
                if (data.error) throw new Error(data.error);
                setStatus('Connected! You can close this window.');
                if (window.opener) {
                    window.opener.postMessage({ type: 'OMENX_AUTH_SUCCESS', payload: data }, window.location.origin);
                }
                setTimeout(() => window.close(), 1000);
            })
            .catch(err => {
                console.error('[OmenX] token exchange error', err);
                setStatus('Connection failed. Please try again.');
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