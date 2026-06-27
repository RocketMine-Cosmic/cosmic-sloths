import React from 'react';
import { getChestAssetUrl } from '@/lib/chestCosmeticAssets';
import { getLBFrameStyle } from '@/lib/lbFrameStyles';

// Wraps a leaderboard row with a chest-tier LB Banner Frame.
//
// Render approach: the frame PNG is positioned absolutely BEHIND the row
// content, sized to cover the full row box (`object-fit: fill`). The PNG was
// generated as a complete painted picture-frame around a dark centre — so we
// use the whole asset as a background plate. The row content sits on top of
// the painted dark centre with comfortable padding so it lands inside the
// frame's inner "window", not over the corner ornaments.
//
// We tried 9-slice first — it captured the corners cleanly but stretched the
// PNG's inner painted border across the top/bottom edges, producing a visible
// amber band. The full-image approach trades a tiny bit of corner distortion
// at wide row aspects for a clean read of the whole frame.
//
// Pass `frameId` (e.g. 'lb_frame_gold_filigree'). Resolves to a URL via the
// shared chest-asset cache. If the asset isn't loaded yet or the id is falsy,
// renders children with no decoration so the row never blanks out.
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
            <div className="relative z-10 px-12 py-3">
                {children}
            </div>
        </div>
    );
}