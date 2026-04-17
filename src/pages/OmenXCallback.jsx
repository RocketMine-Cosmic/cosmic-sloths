import React, { useEffect, useState } from 'react';
import { OmenXGameSDK } from '@omen.foundation/game-sdk';
import { base44 } from '@/api/base44Client';

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

        // Exchange code for token
        console.log('[Callback] Invoking omenxTokenExchange with code:', code);
        base44.functions.invoke('omenxTokenExchange', { code })
            .then(res => {
                console.log('[Callback] Token response:', res.data);
                const data = res.data;
                if (data.error) throw new Error(data.error);
                
                setStatus('Connected! Closing…');
                localStorage.setItem('omenx_auth_data', JSON.stringify(data));
                if (window.opener) {
                    window.opener.postMessage({ type: 'OMENX_AUTH_SUCCESS', payload: data }, window.location.origin);
                }
                setTimeout(() => window.close(), 500);
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