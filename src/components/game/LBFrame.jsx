import React from 'react';
import { getChestAssetUrl } from '@/lib/chestCosmeticAssets';
import { getLBFrameStyle } from '@/lib/lbFrameStyles';

// Wraps a leaderboard row content with a chest-tier LB Banner Frame, using
// CSS border-image 9-slice on the source 1024×1024 PNG. Per-frame slice +
// repeat values come from lbFrameStyles.js so each frame's corner art and
// edge ornament are tuned individually (filigree tiles cleanly, nebula
// stretches, eclipse crown keeps its bigger corner detail intact).
//
// Pass `frameId` (e.g. 'lb_frame_gold_filigree'). Resolves to a URL via the
// shared chest-asset cache. If the asset isn't loaded yet or the id is falsy,
// renders children with no decoration so the row never blanks out.
export default function LBFrame({ frameId, children, className = '' }) {
    const url = frameId ? getChestAssetUrl(frameId) : null;
    if (!url) return <>{children}</>;
    const { slice, repeat, anim } = getLBFrameStyle(frameId);
    return (
        <div
            className={`relative ${anim} ${className}`}
            style={{
                borderStyle: 'solid',
                borderColor: 'transparent',
                borderTopWidth: 16,
                borderBottomWidth: 16,
                borderLeftWidth: 56,
                borderRightWidth: 56,
                borderImageSource: `url(${url})`,
                borderImageSlice: slice,
                borderImageRepeat: repeat,
                borderImageOutset: 0,
            }}
        >
            {children}
        </div>
    );
}