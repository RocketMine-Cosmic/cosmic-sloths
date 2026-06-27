import React from 'react';
import { getChestAssetUrl } from '@/lib/chestCosmeticAssets';

// Wraps a leaderboard row content with a chest-tier LB Banner Frame, using
// CSS border-image 9-slice on the source 1024×1024 PNG. The slice region
// concentrates the painted ornament in a ~120px ring around the canvas
// (corners + edges), discarding the dark centre — which lets the row content
// underneath read perfectly while the frame stretches cleanly to any row width.
//
// Pass `frameId` (e.g. 'lb_frame_gold_filigree'). Resolves to a URL via the
// shared chest-asset cache. If the asset isn't loaded yet or the id is falsy,
// renders children with no decoration so the row never blanks out.
export default function LBFrame({ frameId, children, className = '' }) {
    const url = frameId ? getChestAssetUrl(frameId) : null;
    if (!url) return <>{children}</>;
    return (
        <div
            className={`relative ${className}`}
            style={{
                borderStyle: 'solid',
                borderColor: 'transparent',
                borderTopWidth: 16,
                borderBottomWidth: 16,
                borderLeftWidth: 56,
                borderRightWidth: 56,
                borderImageSource: `url(${url})`,
                borderImageSlice: '120 320 120 320 fill',
                borderImageRepeat: 'stretch',
                borderImageOutset: 0,
            }}
        >
            {children}
        </div>
    );
}