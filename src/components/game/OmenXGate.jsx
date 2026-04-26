import React from 'react';
import OmenXAuthButton from './OmenXAuthButton';
import SpaceBackground from './SpaceBackground';
import { useOmenXAuth } from '@/lib/OmenXAuthContext';

export default function OmenXGate({ children, isCarousel }) {
    // Read shared auth state — no per-gate `me` call (was 13× across the carousel).
    const { authData: auth, base44Authed } = useOmenXAuth();

    // Bypass auth inside Base44 preview iframe
    const isPreview = window.self !== window.top && window.location !== window.parent.location;
    if (isPreview) return children;

    // Both signed in + wallet connected → render children
    if (base44Authed && auth) return children;

    // Determine gate messaging based on which step is missing
    let icon, title, subtitle;
    if (base44Authed === null) {
        icon = '⏳';
        title = 'Loading';
        subtitle = 'Checking your session…';
    } else if (!base44Authed) {
        icon = '🚀';
        title = 'Sign In Required';
        subtitle = 'Sign in to access this area.';
    } else {
        icon = '🔗';
        title = 'Wallet Required';
        subtitle = 'Connect your OmenX wallet to access this area.';
    }

    return (
        <div className={`${isCarousel ? 'min-h-full' : 'min-h-screen'} relative text-slate-200 flex flex-col items-center justify-center gap-6 p-6 font-sans`}>
            {!isCarousel && <SpaceBackground />}
            <div className="relative z-10 text-center flex flex-col items-center gap-4">
                <div className="text-6xl mb-2">{icon}</div>
                <h2 className="text-2xl md:text-3xl font-black tracking-widest uppercase text-white">{title}</h2>
                <p className="text-slate-400 text-sm max-w-xs">{subtitle}</p>
                <OmenXAuthButton fullWidth />
            </div>
        </div>
    );
}