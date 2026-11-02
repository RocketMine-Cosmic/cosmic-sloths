import React from 'react';

// Shown inside the Omen Arcade frame when no Omen sign-in has arrived from the Arcade (F-002,
// Rob's option A, 2 Nov 2026). There is no Connect Wallet button here on purpose: Omen's sign-in
// page cuts the link back to any window that opens it (Cross-Origin-Opener-Policy: same-origin),
// and a framed game's storage is separate from a popup's, so a sign-in window can never hand the
// login back to the frame. The Arcade itself owns sign-in: once the player is signed in there, a
// fresh load of the game receives the pass. Two ways out, so nobody is stuck:
//   Reload            — load the game again inside the Arcade (it asks the Arcade for the pass);
//   Open in its own tab — the website version, where Connect Wallet works.
export default function ArcadeSignInNotice({ compact = false }) {
    const ownTab = window.location.origin + window.location.pathname + window.location.search;
    const link = 'underline font-bold text-purple-200 hover:text-white';
    return (
        <div className={`flex flex-col items-center gap-1 text-center ${compact ? 'text-[11px]' : 'text-sm'} text-purple-200/90 max-w-xs`}>
            <div className="font-bold text-purple-100">Sign in to Omen Arcade to connect your wallet.</div>
            <div className="flex gap-3">
                <button type="button" className={link} onClick={() => window.location.reload()}>Reload</button>
                <a className={link} href={ownTab} target="_blank" rel="noopener noreferrer">Open in its own tab</a>
            </div>
        </div>
    );
}
