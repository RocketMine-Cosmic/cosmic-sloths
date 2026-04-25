import React, { useLayoutEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { saveAuthToIndexedDB } from '@/lib/indexedDbAuth';
import { omenx } from '@/lib/omenx';

export default function OmenXCallback() {
    const [status, setStatus] = useState('Processing login...');
    const [debugInfo, setDebugInfo] = useState(null);

    useLayoutEffect(() => {
        if (typeof window === 'undefined') return;

        const handleCallback = async () => {
            try {
                setStatus('✓ SDK is handling token exchange...');
                console.log('[OmenXCallback] Initializing SDK for callback...');
                
                // Initialize SDK to handle callback + PKCE verification
                await omenx.init();
                console.log('[OmenXCallback] SDK initialized, waiting for onAuth...');
                
                // Give the SDK time to process and call onAuth
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // The SDK's onAuth callback should have already stored the auth data
                // Just wait a moment for it to complete
                const authData = (() => {
                    try {
                        const stored = localStorage.getItem('omenx_auth_data');
                        return stored ? JSON.parse(stored) : null;
                    } catch { return null; }
                })();

                if (authData && authData.walletAddress && authData.accessToken) {
                    setStatus('✓ Login successful! Closing...');
                    console.log('[OmenXCallback] SDK auth data found, notifying opener');
                    
                    // Notify opener if this was opened as popup
                    if (window.opener) {
                        try {
                            window.opener.postMessage({ type: 'omenx_auth', authData }, '*');
                        } catch(e) { console.log('[OmenXCallback] postMessage failed (cross-origin?)', e); }
                    }
                    
                    // Create initial save on first login
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
                        
                        try {
                            const base44 = await import('@/api/base44Client').then(m => m.base44);
                            await base44.functions.invoke('initializeFirstLogin', {
                                walletAddress: authData.walletAddress,
                                accessToken: authData.accessToken,
                                initialSave
                            });
                        } catch (e) {
                            console.error('[OmenXCallback] First login init failed:', e);
                        }
                    }

                    // Close popup or redirect
                    setTimeout(() => {
                        window.close();
                        setTimeout(() => window.location.replace('/'), 500);
                    }, 1000);
                } else {
                    setStatus('❌ SDK did not provide auth data');
                    setDebugInfo({ authData, hasWallet: !!authData?.walletAddress, hasToken: !!authData?.accessToken });
                }
            } catch (err) {
                console.error('[OmenXCallback] Error:', err);
                setStatus(`❌ ${err.message}`);
                setDebugInfo({ error: err.message });
            }
        };

        handleCallback();
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