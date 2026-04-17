import React, { useEffect, useState } from 'react';
import { OmenXGameSDK } from '@omen.foundation/game-sdk';

const sdk = new OmenXGameSDK({
    gameId: 'cosmic-sloths',
    onAuth: (authData) => {
        localStorage.setItem('omenx_auth_data', JSON.stringify(authData));
    },
});

export default function OmenXCallback() {
    const [status, setStatus] = useState('Processing OAuth callback…');

    useEffect(() => {
        // SDK handles the callback automatically via onAuth hook
        // Just notify the parent window when complete
        setTimeout(() => {
            const authData = localStorage.getItem('omenx_auth_data');
            if (window.opener) {
                window.opener.postMessage({ type: 'OMENX_AUTH_SUCCESS', payload: authData ? JSON.parse(authData) : null }, window.location.origin);
            }
            setStatus('Connected! Closing…');
            setTimeout(() => window.close(), 500);
        }, 1000);
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