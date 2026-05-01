import React from 'react';
import SpaceBackground from './SpaceBackground';
import { useOmenXAuth } from '@/lib/OmenXAuthContext';
import { base44 } from '@/api/base44Client';
import { omenx, getRedirectUri } from '@/lib/omenx';

export default function OmenXGate({ children, isCarousel }) {
    // Read shared auth state — no per-gate `me` call (was 13× across the carousel).
    const { authData: auth, base44Authed } = useOmenXAuth();

    // Bypass auth inside Base44 preview iframe
    const isPreview = window.self !== window.top && window.location !== window.parent.location;
    if (isPreview) return children;

    // Both signed in + wallet connected → render children
    if (base44Authed && auth) return children;

    // Determine gate messaging + action based on which step is missing.
    // Users coming from the Omen website already have OmenX auth (delivered via
    // postMessage from parent) but no Base44 auth — they need a clear CTA right
    // here, otherwise they don't know wallet linking requires a separate sign-in.
    let icon, title, subtitle, ctaLabel, ctaAction;
    if (base44Authed === null) {
        icon = '⏳';
        title = 'Loading';
        subtitle = 'Checking your session…';
    } else if (!base44Authed) {
        icon = '🚀';
        title = 'Sign In Required';
        subtitle = auth
            ? 'Your wallet is connected, but you need to sign in to link it and enable cloud saves.'
            : 'Sign in to access this area.';
        ctaLabel = 'Sign In';
        ctaAction = async () => {
            try {
                const result = base44.auth.redirectToLogin(window.location.href);
                if (result && typeof result.then === 'function') await result;
            } catch (err) {
                console.error('[OmenXGate] redirectToLogin failed:', err);
            }
        };
    } else {
        icon = '🔗';
        title = 'Wallet Required';
        subtitle = 'Connect your OmenX wallet to access this area.';
        ctaLabel = 'Connect Wallet';
        ctaAction = async () => {
            try {
                await omenx.authenticate({ redirectUri: getRedirectUri(), enablePKCE: true });
            } catch (e) {}
        };
    }

    return (
        <div className={`${isCarousel ? 'min-h-full' : 'min-h-screen'} relative text-slate-200 flex flex-col items-center justify-center gap-6 p-6 font-sans`}>
            {!isCarousel && <SpaceBackground />}
            <div className="relative z-10 text-center flex flex-col items-center gap-4">
                <div className="text-6xl mb-2">{icon}</div>
                <h2 className="text-2xl md:text-3xl font-black tracking-widest uppercase text-white">{title}</h2>
                <p className="text-slate-400 text-sm max-w-xs">{subtitle}</p>
                {ctaAction && (
                    <button
                        onClick={ctaAction}
                        className="mt-2 px-6 py-3 bg-cyan-900/30 hover:bg-cyan-900/50 border border-cyan-500/60 hover:border-cyan-400 text-cyan-100 hover:text-white font-black tracking-widest uppercase text-sm rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-all"
                    >
                        {ctaLabel}
                    </button>
                )}
            </div>
        </div>
    );
}