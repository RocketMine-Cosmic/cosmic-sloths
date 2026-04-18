import React, { useLayoutEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function OmenXCallback() {
    const [status, setStatus] = useState('Processing login...');

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

                const res = await base44.functions.invoke('exchangeOmenXCode', { code, codeVerifier });
                const tokenData = res.data;

                if (!tokenData || tokenData.error) {
                    const errMsg = tokenData?.details?.error?.message || tokenData?.details?.error?.code || tokenData?.error || 'unknown';
                    setStatus(`❌ ${errMsg}`);
                    setTimeout(() => window.close(), 8000);
                    return;
                }

                const authData = {
                    accessToken: tokenData.accessToken,
                    refreshToken: tokenData.refreshToken,
                    expiresIn: tokenData.expiresIn,
                    walletAddress: tokenData.walletAddress,
                    username: tokenData.username,
                };

                localStorage.setItem('omenx_auth_data', JSON.stringify(authData));
                
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
                        totalKills: 0,
                        pilotName: ''
                    };
                    localStorage.setItem('cosmic_sloth_save', JSON.stringify(initialSave));
                    localStorage.setItem('omenx_user_profile', JSON.stringify({ pilotName: '', playerTitle: '', pilotIcon: '🦥' }));
                    
                    // Create PlayerSave record in backend
                    try {
                        const base44 = await import('@/api/base44Client').then(m => m.base44);
                        await base44.asServiceRole.entities.PlayerSave.create({
                            wallet_address: authData.walletAddress,
                            save_data: initialSave,
                            updated_at: Date.now()
                        });
                    } catch (e) {
                        console.error('Failed to create PlayerSave:', e);
                    }
                }

                if (window.opener) {
                    try {
                        window.opener.dispatchEvent(new StorageEvent('storage', {
                            key: 'omenx_auth_data',
                            newValue: JSON.stringify(authData),
                            storageArea: localStorage,
                        }));
                    } catch(e) { /* cross-origin, ignore */ }
                    setStatus('✓ Login successful!');
                    setTimeout(() => window.close(), 15000);
                } else {
                    setStatus('✓ Login successful! You can close this tab.');
                    setTimeout(() => window.close(), 1500);
                }
            } catch (err) {
                setStatus(`❌ ${err.message}`);
                setTimeout(() => window.close(), 8000);
            }
        };

        exchangeToken();
    }, []);

    return (
        <div className="min-h-screen bg-[#0b0416] flex items-center justify-center">
            <div className="text-center text-purple-300 font-mono px-6">
                <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <div className="text-sm tracking-widest uppercase">{status}</div>
            </div>
        </div>
    );
}