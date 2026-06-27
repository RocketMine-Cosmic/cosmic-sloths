import React from 'react';
import { getChestAssetUrl } from '@/lib/chestCosmeticAssets';
import { getLBFrameStyle } from '@/lib/lbFrameStyles';
import { isStandardLbFrame, getStandardLbFrame } from '@/lib/standardCosmetics';

// Wraps a leaderboard row with an LB Banner Frame.
//
// Two render paths:
//   1. Standard (CSS) frames — pure border / box-shadow / gradient, no PNG.
//   2. Chest (PNG) frames — stretched 8:1 banner art behind the row.
export default function LBFrame({ frameId, children, className = '' }) {
    if (!frameId) return <>{children}</>;

    // Standard ("Support the Devs") CSS-only frames.
    if (isStandardLbFrame(frameId)) {
        const f = getStandardLbFrame(frameId);
        if (f.kind === 'gradient') {
            // Gradient frames use border-image + a shifting background-position.
            return (
                <div
                    className={`relative rounded-lg ${f.anim} ${className}`}
                    style={{
                        padding: '2px',
                        backgroundImage: f.gradient,
                        backgroundSize: '200% 100%',
                    }}
                >
                    <div className="rounded-md bg-slate-900/95">
                        {children}
                    </div>
                </div>
            );
        }
        return (
            <div className={`relative rounded-lg ${f.anim} ${className}`} style={f.style}>
                {children}
            </div>
        );
    }

    // Chest (PNG) frames.
    const url = getChestAssetUrl(frameId);
    if (!url) return <>{children}</>;
    const { anim } = getLBFrameStyle(frameId);
    return (
        <div className={`relative lb-frame-wrap ${anim} ${className}`}>
            <img
                src={url}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full pointer-events-none select-none"
                style={{ objectFit: 'fill' }}
            />
            <div className="relative z-10 px-4 py-3">
                {children}
            </div>
        </div>
    );
}