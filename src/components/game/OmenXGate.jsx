import React, { useState } from 'react';
import OmenXAuthButton from './OmenXAuthButton';
import SpaceBackground from './SpaceBackground';

function getOmenXAuth() {
    try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; }
}

export default function OmenXGate({ children, isCarousel }) {
    const [auth, setAuth] = useState(getOmenXAuth);

    // Only bypass auth inside the Base44 preview iframe
    const isPreview = window.self !== window.top && window.location !== window.parent.location;
    if (isPreview) return children;

    if (!auth) {
        return (
            <div className={`${isCarousel ? 'min-h-full' : 'min-h-screen'} relative text-slate-200 flex flex-col items-center justify-center gap-6 p-6 font-sans`}>
                {!isCarousel && <SpaceBackground />}
                <div className="relative z-10 text-center flex flex-col items-center gap-4">
                    <div className="text-6xl mb-2">🔒</div>
                    <h2 className="text-2xl md:text-3xl font-black tracking-widest uppercase text-white">Login Required</h2>
                    <p className="text-slate-400 text-sm max-w-xs">Login with OmenX to access this area.</p>
                    <OmenXAuthButton fullWidth onAuthChange={(data) => setAuth(data)} />
                </div>
            </div>
        );
    }

    return children;
}