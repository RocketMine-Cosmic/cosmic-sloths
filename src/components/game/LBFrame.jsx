import React from 'react';
import { getChestAssetUrl } from '@/lib/chestCosmeticAssets';
import { getLBFrameStyle } from '@/lib/lbFrameStyles';

// Wraps a leaderboard row with a chest-tier LB Banner Frame.
//
// Source PNGs are square 1024×1024 ornate picture frames. To avoid squashing
// the corners into an 8:1 row, we use background-image with `auto 100%` size
// + `left`/`right` background-position on two end-caps. The PNG scales to the
// cap's height at natural aspect, and the cap's WIDTH controls how much of
// the source's left or right portion shows. The middle fills with the dark
// centre tone so corners read crisp and the row content sits on a clean band.
export default function LBFrame({ frameId, children, className = '' }) {
    const url = frameId ? getChestAssetUrl(frameId) : null;
    if (!url) return <>{children}</>;
    const { anim } = getLBFrameStyle(frameId);
    // Cap width is a fraction of the row height — picked so each cap shows
    // roughly the corner third of the source at natural aspect on any row size.
    // Two caps + middle = full coverage with no horizontal stretch on the art.
    const capStyle = {
        backgroundImage: `url(${url})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'auto 100%',
    };
    return (
        <div
            className={`relative lb-frame-wrap overflow-hidden ${anim} ${className}`}
            style={{ backgroundColor: '#0a0e1a' }}
        >
            {/* Left cap — shows the left ~third of the source PNG */}
            <div
                aria-hidden="true"
                className="absolute left-0 top-0 bottom-0 pointer-events-none"
                style={{
                    width: '20%',
                    minWidth: 90,
                    maxWidth: 160,
                    ...capStyle,
                    backgroundPosition: 'left center',
                }}
            />
            {/* Right cap — shows the right ~third */}
            <div
                aria-hidden="true"
                className="absolute right-0 top-0 bottom-0 pointer-events-none"
                style={{
                    width: '20%',
                    minWidth: 90,
                    maxWidth: 160,
                    ...capStyle,
                    backgroundPosition: 'right center',
                }}
            />
            <div className="relative z-10 py-3" style={{ paddingLeft: '22%', paddingRight: '22%' }}>
                {children}
            </div>
        </div>
    );
}