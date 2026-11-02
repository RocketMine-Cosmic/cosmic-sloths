import React, { useLayoutEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { applyOmenAuth } from '@/lib/omenAuthStore';
import { OMEN_AUTH_MESSAGE, OMEN_AUTH_ERROR_MESSAGE } from '@/lib/omenxRedirectAuth';

// /auth/callback — where Omen sends the player back after our own sign-in (F-002, 2 Nov 2026).
// Started by /auth/omen-start (index.html), which saved the PKCE verifier and the flow
// ({ mode, ret }) in this window's sessionStorage under the `state` Omen hands back.
//   popup    → exchange the code, post the sign-in to the window that opened us, close.
//   redirect → exchange, save, go back to `ret`.
//   silent   → exchange, save, go back to `ret`. If Omen answers with an error instead of a code
//              (login_required / consent_required: it can't sign in without a screen), go back to
//              `ret` with nothing changed — the player just keeps playing.

const readFlow = (state) => {
    try {
        const raw = state && sessionStorage.getItem(`omenx_flow_${state}`);
        if (raw) return JSON.parse(raw);
    } catch {}
    // Not started by /auth/omen-start (an old link): popup if something opened us, else redirect.
    return { mode: window.opener ? 'popup' : 'redirect', ret: '/' };
};

const safeReturn = (ret) => (typeof ret === 'string' && ret.startsWith('/') && !ret.startsWith('//') ? ret : '/');

const toOpener = (message) => {
    try {
        if (window.opener && !window.opener.closed) {
            window.opener.postMessage(message, window.location.origin);
            return true;
        }
    } catch {}
    return false;
};

export default function OmenXCallback() {
    const [status, setStatus] = useState('Signing in…');
    const [debugInfo, setDebugInfo] = useState(null);

    useLayoutEffect(() => {
        if (typeof window === 'undefined') return;

        const run = async () => {
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');
            const error = params.get('error');
            const state = params.get('state');
            const flow = readFlow(state);
            const ret = safeReturn(flow.ret);
            // ?omen_refresh=1 test switch: show the outcome for a few seconds, then go back.
            const goBack = (shown) => {
                if (flow.test) {
                    setStatus(shown);
                    setTimeout(() => window.location.replace(ret), 4000);
                } else {
                    window.location.replace(ret);
                }
            };

            const cleanUp = () => {
                try {
                    if (state) {
                        sessionStorage.removeItem(`omenx_pkce_${state}`);
                        sessionStorage.removeItem(`omenx_flow_${state}`);
                    }
                } catch {}
            };

            // Omen said no (or couldn't do it silently).
            if (!code) {
                cleanUp();
                const why = error || 'no_code';
                console.warn('[OmenXCallback] no code:', why);
                if (flow.mode === 'silent') { goBack(`✗ Refresh not done: Omen answered ${why}`); return; }
                if (flow.mode === 'popup' && toOpener({ type: OMEN_AUTH_ERROR_MESSAGE, error: why })) {
                    window.close();
                    return;
                }
                setStatus(why === 'access_denied' ? '❌ Sign-in cancelled' : `❌ Sign-in failed (${why})`);
                return;
            }

            try {
                const codeVerifier = (state && sessionStorage.getItem(`omenx_pkce_${state}`)) ||
                    Object.keys(sessionStorage)
                        .filter(k => k.startsWith('omenx_pkce_'))
                        .map(k => sessionStorage.getItem(k))[0] ||
                    null;

                const redirectUri = `${window.location.origin}/auth/callback`;
                const res = await base44.functions.invoke('exchangeOmenXCode', { code, codeVerifier, redirectUri });
                const tokenData = res.data;
                cleanUp();

                if (!tokenData || tokenData.error || !tokenData.accessToken || !tokenData.walletAddress) {
                    const errMsg = tokenData?.details?.error?.message || tokenData?.details?.error?.code || tokenData?.error || 'invalid token response';
                    console.error('[OmenXCallback] exchange failed', tokenData);
                    if (flow.mode === 'silent') { goBack(`✗ Refresh not done: ${errMsg}`); return; }
                    if (flow.mode === 'popup' && toOpener({ type: OMEN_AUTH_ERROR_MESSAGE, error: errMsg })) {
                        window.close();
                        return;
                    }
                    setDebugInfo({ response: tokenData });
                    setStatus(`❌ ${errMsg}`);
                    return;
                }

                const authData = {
                    accessToken: tokenData.accessToken,
                    refreshToken: tokenData.refreshToken,
                    expiresIn: tokenData.expiresIn,
                    walletAddress: tokenData.walletAddress,
                    username: tokenData.username || '',
                };

                if (flow.mode === 'popup') {
                    // The game that opened us saves it in its own storage (inside the Arcade frame
                    // that storage is separate from ours). Saved here too: on the website it's shared.
                    applyOmenAuth(authData, { fresh: true });
                    toOpener({ type: OMEN_AUTH_MESSAGE, authData });
                    setStatus('✓ Signed in');
                    window.close();
                    setTimeout(() => window.location.replace('/'), 1500);
                    return;
                }

                applyOmenAuth(authData, { fresh: true });
                goBack('✓ Refreshed: fresh Omen login recorded');
            } catch (err) {
                cleanUp();
                console.error('[OmenXCallback] unexpected error', err?.message);
                if (flow.mode === 'silent') { goBack(`✗ Refresh not done: ${err?.message || 'error'}`); return; }
                if (flow.mode === 'popup' && toOpener({ type: OMEN_AUTH_ERROR_MESSAGE, error: err?.message || 'error' })) {
                    window.close();
                    return;
                }
                setDebugInfo({ error: err?.message || 'Unknown error', response: err?.data || null });
                setStatus(`❌ ${err?.message || 'Sign-in failed'}`);
            }
        };

        run();
    }, []);

    return (
        <div className="min-h-screen bg-[#0b0416] flex items-center justify-center p-6">
            <div className="text-center text-purple-300 font-mono px-6 max-w-2xl w-full">
                {!status.startsWith('❌') && (
                    <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                )}
                <div className="text-sm tracking-widest uppercase mb-4">{status}</div>
                {debugInfo && (
                    <pre className="text-left text-xs normal-case tracking-normal bg-black/30 border border-purple-500/30 rounded-lg p-4 overflow-auto whitespace-pre-wrap break-all">
                        {JSON.stringify(debugInfo, null, 2)}
                    </pre>
                )}
                {status.startsWith('❌') && (
                    <button
                        onClick={() => window.location.replace('/')}
                        className="mt-4 px-4 py-2 bg-purple-900/40 hover:bg-purple-900/60 border border-purple-500/60 rounded text-purple-100 hover:text-white text-xs font-bold tracking-widest uppercase transition-colors"
                    >
                        ← Back to Main Menu
                    </button>
                )}
            </div>
        </div>
    );
}
