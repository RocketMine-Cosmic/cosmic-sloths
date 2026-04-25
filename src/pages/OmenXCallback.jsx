import React, { useLayoutEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { saveAuthToIndexedDB } from '@/lib/indexedDbAuth';

export default function OmenXCallback() {
    const [status, setStatus] = useState('Processing login...');
    const [debugInfo, setDebugInfo] = useState(null);

    useLayoutEffect(() => {
        if (typeof window === 'undefined') return;

        const exchangeToken = async () => {
            try {
                const params = new URLSearchParams(window.location.search);
                const code = params.get('code');

                if (!code) {
                    setStatus('❌ No authorization code received');
                    setTimeout(() => window.close(), 2000);
                    return;
                }

                const state = params.get('state');
                const codeVerifier = (state && sessionStorage.getItem(`omenx_pkce_${state}`)) ||
                                     Object.keys(sessionStorage)
                                         .filter(k => k.startsWith('omenx_pkce_'))
                                         .map(k => sessionStorage.getItem(k))[0] ||
                                     null;

                console.log('[OmenXCallback] Starting token exchange', {
                    currentUrl: window.location.href,
                    origin: window.location.origin,
                    codePresent: !!code,
                    state,
                    hasCodeVerifier: !!codeVerifier,
                });

                const redirectUri = `${window.location.origin}/auth/callback`;
                const res = await base44.functions.invoke('exchangeOmenXCode', { code, codeVerifier, redirectUri });
                const tokenData = res.data;
                console.log('[OmenXCallback] Exchange response', tokenData);

                if (!tokenData || tokenData.error) {
                    const errMsg = tokenData?.details?.error?.message || tokenData?.details?.error?.code || tokenData?.error || 'unknown';
                    const debugPayload = {
                        currentUrl: window.location.href,
                        origin: window.location.origin,
                        state,
                        hasCodeVerifier: !!codeVerifier,
                        response: tokenData,
                    };
                    console.error('[OmenXCallback] Exchange failed', debugPayload);
                    setDebugInfo(debugPayload);
                    setStatus(`❌ ${errMsg}`);
                    return;
                }

                // Validate token data has required fields
                if (!tokenData.accessToken || !tokenData.walletAddress) {
                    setStatus('❌ Invalid token response: missing accessToken or walletAddress');
                    return;
                }

                const authData = {
                    accessToken: tokenData.accessToken,
                    refreshToken: tokenData.refreshToken,
                    expiresIn: tokenData.expiresIn,
                    walletAddress: tokenData.walletAddress,
                    username: tokenData.username || '',
                    // Preserve any existing profile customizations from prior session
                    ...(() => {
                        try {
                            const stored = localStorage.getItem('omenx_auth_data');
                            if (!stored) return { player_name: tokenData.username || '', player_title: '', pilot_icon: '🦥' };
                            const existing = JSON.parse(stored);
                            return {
                                player_name: existing?.player_name || tokenData.username || '',
                                player_title: existing?.player_title || '',
                                pilot_icon: existing?.pilot_icon || '🦥',
                            };
                        } catch { return { player_name: tokenData.username || '', player_title: '', pilot_icon: '🦥' }; }
                    })(),
                };

                // Save to IndexedDB (survives history clear) and localStorage (fallback)
                try {
                    await saveAuthToIndexedDB(authData);
                } catch (e) {
                    console.error('[OmenXCallback] Storage error');
                }
                localStorage.setItem('omenx_auth_data', JSON.stringify(authData));
                
                // Generate and store sessionId for multi-device detection
                const sessionId = `${authData.walletAddress}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
                localStorage.setItem('omenx_session_data', JSON.stringify({ sessionId, createdAt: Date.now() }));
                
                // Notify opener (popup mode) via postMessage — works cross-origin
                if (window.opener) {
                    try {
                        window.opener.postMessage({ type: 'omenx_auth', authData }, '*');
                    } catch(e) { /* ignore */ }
                    // Also try same-origin storage event as fallback
                    try {
                        window.opener.dispatchEvent(new StorageEvent('storage', {
                            key: 'omenx_auth_data',
                            newValue: JSON.stringify(authData),
                            storageArea: localStorage,
                        }));
                    } catch(e) { /* cross-origin, ignore */ }
                }
                
                // Create initial save file and PlayerSave on first login
                const existingProfile = localStorage.getItem('omenx_user_profile');
                if (!existingProfile) {
                    const initialSave = {
                        unlockedCharacters: ['neobyte'],
                        unlockedArenasByCharacter: { neobyte: ['station'] },
                        unlockedCosmetics: ['default'],
                        cosmetics: { skins: {}, trail: 'default', killEffect: 'none' },
                        gold: 0,
                        sessionBuffs: {},
                        characterKills: {},
                        foundCharacters: [],
                        encounteredEnemies: [],
                        enemyKills: {},
                        relicFragments: 0,
                        cosmicTokens: 0,
                        lastSelectedChar: 'neobyte',
                        lastSelectedArena: 'station',
                        lastSelectedDifficulty: 'normal',
                        lastSelectedWeapon: 'neoBlaster',
                        isNGPlus: false,
                        newGamePlusUnlocked: false,
                        hasSetProfileName: false,
                        bounties: { active: [], dailyMission: null },
                        maxTimeSurvived: 0,
                        totalGoldEarned: 0,
                        maxLevelReached: 0,
                        totalKills: 0
                    };
                    localStorage.setItem('cosmic_sloth_save', JSON.stringify(initialSave));
                    localStorage.setItem('omenx_user_profile', JSON.stringify({ pilotName: '', playerTitle: '', pilotIcon: '🦥' }));
                    
                    // Create PlayerSave record via backend function
                    try {
                        const base44 = await import('@/api/base44Client').then(m => m.base44);
                        await base44.functions.invoke('initializeFirstLogin', {
                            walletAddress: authData.walletAddress,
                            accessToken: authData.accessToken,
                            initialSave
                        });
                    } catch (e) {
                        console.error('Failed to initialize first login:', e);
                    }
                }

                setStatus('✓ Login successful!');
                // Send postMessage before closing (or redirecting)
                if (window.opener) {
                    try {
                        window.opener.postMessage({ type: 'omenx_auth', authData }, '*');
                        // Give postMessage time to reach opener before closing
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } catch(e) { /* ignore */ }
                }
                // Always try to close — works when opened as popup
                // If this was a direct navigation, window.close() will fail silently
                // and we fall back to redirect after a short delay
                window.close();
                // Fallback: if still open after 1.5s, we're in direct navigation mode
                setTimeout(() => {
                    window.location.replace('/');
                }, 1500);
            } catch (err) {
                const debugPayload = {
                    currentUrl: typeof window !== 'undefined' ? window.location.href : '',
                    origin: typeof window !== 'undefined' ? window.location.origin : '',
                    error: err?.message || 'Unknown error',
                    response: err?.response?.data || null,
                };
                console.error('[OmenXCallback] Unexpected error', debugPayload);
                setDebugInfo(debugPayload);
                setStatus(`❌ ${err.message}`);
            }
        };

        exchangeToken();
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
            </div>
        </div>
    );
}