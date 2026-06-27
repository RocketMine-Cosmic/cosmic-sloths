import React from 'react';
import { getChestAssetUrl } from '@/lib/chestCosmeticAssets';
import { getLBFrameStyle } from '@/lib/lbFrameStyles';

// Wraps a leaderboard row with a chest-tier LB Banner Frame.
//
// Source PNGs are now 1024×128 (8:1 banner aspect), painted to match the LB
// row's natural shape. So we just stretch the PNG full-bleed — the artwork
// already has the right proportions, no slicing or end-cap tricks needed.
export default function LBFrame({ frameId, children, className = '' }) {
    const url = frameId ? getChestAssetUrl(frameId) : null;
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