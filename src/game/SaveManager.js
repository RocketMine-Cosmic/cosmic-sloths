import moment from 'moment';
import { BOUNTIES_POOL, DAILY_MISSIONS_POOL } from './Constants';
import { base44 } from '@/api/base44Client';
import { getOmenXUser } from '@/lib/omenxUser';
import { getAuthFromIndexedDB } from '@/lib/indexedDbAuth';
import { NFTPerkManager } from './NFTPerks';

let syncTimeout = null;
let pendingSync = false;

export const SaveManager = {
  _walletAddress: null,
  _playerSaveId: null,

  initialize: async () => {
    try {
      let walletAddress = null;
      let accessToken = null;
      
      // Try OmenX IndexedDB first (survives browser history clear)
      try {
        const omenxAuth = await getAuthFromIndexedDB();
        if (omenxAuth?.walletAddress) {
          walletAddress = omenxAuth.walletAddress;
          accessToken = omenxAuth.accessToken;
          console.log('[SaveManager] Using OmenX IndexedDB auth');
        }
      } catch (e) {
        console.log('[SaveManager] IndexedDB auth not available:', e.message);
      }
      
      // Fallback to OmenX localStorage
      if (!walletAddress) {
        const omenxAuth = (() => { try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; } })();
        walletAddress = omenxAuth?.walletAddress;
        accessToken = omenxAuth?.accessToken;
      }
      
      if (!walletAddress) {
        console.log('[SaveManager] No wallet authenticated, using local storage only');
        return;
      }
      
      SaveManager._walletAddress = walletAddress;
      console.log('[SaveManager] Initialized');
      
      // Load from backend FIRST (backend is source of truth)
      if (accessToken) {
        try {
          const { data: response } = await base44.functions.invoke('loadSave', {
            walletAddress: SaveManager._walletAddress,
            accessToken: accessToken
          });
          if (response?.saveData) {
            console.log('[SaveManager] Loaded from backend');
            let saveData = response.saveData;
            
            // Fetch NFT-unlocked characters and merge + apply perks
            try {
              const { data: nftRes } = await base44.functions.invoke('getNFTCharacters', { accessToken });
              if (nftRes?.unlockedCharacters?.length > 0) {
                const defaultChars = ['neobyte', 'pandypaws', 'novabyte'];
                const nftChars = nftRes.unlockedCharacters.filter(c => typeof c === 'string');
                saveData.unlockedCharacters = [...new Set([...defaultChars, ...nftChars])];
                console.log('[SaveManager] Unlocked NFT characters:', nftChars);
                // Apply NFT-based perks (gold multiplier, cost reductions, etc.)
                NFTPerkManager.applyNFTPerks(nftChars);
              }
            } catch (e) {
              console.log('[SaveManager] NFT fetch failed:', e.message);
            }
            
            localStorage.setItem('cosmic_sloth_save', JSON.stringify(saveData));
            return;
          }
        } catch (e) {
          console.log('[SaveManager] Backend load failed:', e.message);
        }
      }
      
      // Fallback: if backend failed and we have accessToken, try loadSave again silently
      // (no direct entity calls — avoid Base44 session requirement)
    } catch (e) {
      console.error('[SaveManager] Init error');
    }
  },

  syncToBackend: async () => {
    if (!SaveManager._walletAddress) return;
    
    try {
      const localSave = localStorage.getItem('cosmic_sloth_save');
      if (!localSave) return;

      const saveData = JSON.parse(localSave);
      const accessToken = (() => {
        try { return JSON.parse(localStorage.getItem('omenx_auth_data'))?.accessToken; } catch { return null; }
      })();
      if (!accessToken) return;

      await base44.functions.invoke('syncSave', {
        walletAddress: SaveManager._walletAddress,
        saveData,
        accessToken,
      });
    } catch (e) {
      console.error('[SaveManager] Sync error:', e.message);
    }
  },

  syncToBackendImmediate: async () => {
    // Flush pending sync and call immediately (no debounce)
    if (syncTimeout) clearTimeout(syncTimeout);
    pendingSync = false;
    return SaveManager.syncToBackend();
  },

  load: () => {
    // Sync cloud to local if needed (synchronously check, but don't block render)
    if (!localStorage.getItem('cosmic_sloth_save') && SaveManager._walletAddress) {
      // Cloud load already happened in initialize(), so just continue with local
    }

    // Canonical UTC ISO week calculation — must match lib/periodIds.js exactly
    const { week_id: currentWeek, season_id: currentSeason } = (() => {
        const now = new Date();
        const year = now.getUTCFullYear();
        const startOfYear = new Date(Date.UTC(year, 0, 1));
        const startOfWeek = new Date(startOfYear);
        startOfWeek.setUTCDate(startOfYear.getUTCDate() - startOfYear.getUTCDay() + 1);
        const isoWeek = Math.ceil(((now - startOfWeek) / 86400000 + 1) / 7);
        return { week_id: `${year}-W${String(isoWeek).padStart(2, '0')}`, season_id: `${year}-S${Math.floor((isoWeek - 1) / 4) + 1}` };
    })();

    const defaultChars = ['neobyte', 'pandypaws', 'novabyte'];

    const defaultSave = {
      gold: 0,
      relicFragments: 0,
      unlockedCharacters: [...defaultChars],
      foundCharacters: [],
      unlockedArenasByCharacter: {},
      unlockedTalents: {},
      permanentUpgrades: { damage: 0, health: 0, speed: 0, magnet: 0, regen: 0, cooldown: 0, luck: 0 },
      weeklyUpgrades: { weekId: currentWeek, damage: 0, health: 0, speed: 0, magnet: 0, regen: 0, cooldown: 0, luck: 0 },
      seasonalUpgrades: { seasonId: currentSeason, damage: 0, health: 0, speed: 0, magnet: 0, regen: 0, cooldown: 0, luck: 0 },
      permanentWeaponUpgrades: {},
      weeklyWeaponUpgrades: { weekId: currentWeek },
      seasonalWeaponUpgrades: { seasonId: currentSeason },
      permanentTalents: {},
      weeklyTalents: { weekId: currentWeek },
      seasonalTalents: { seasonId: currentSeason },
      cosmetics: { trail: 'default' },
      unlockedCosmetics: ['default'],
      maxTimeSurvived: 0,
      totalKills: 0,
      totalGoldEarned: 0,
      maxLevelReached: 0,
      bounties: { date: '', active: [], dailyMission: null },
      seasonalPoints: 0,
      encounteredEnemies: [],
      enemyKills: {},
      bossModifiers: {},
      hasSetProfileName: false,
      newGamePlusUnlocked: false,
      isNGPlus: false,
      unlockedRelics: [],
      equippedRelics: []
    };

    try {
      const data = localStorage.getItem('cosmic_sloth_save');
      if (data) {
        const parsed = JSON.parse(data);
        if (!parsed.foundCharacters) parsed.foundCharacters = [];
        
        const last7 = ['glitch', 'holodrift', 'codebreaker', 'dataphantom', 'neonvortex', 'synthbeats', 'skybyte'];
        
        if (parsed.unlockedCharacters) {
            parsed.unlockedCharacters = parsed.unlockedCharacters.filter(c => !last7.includes(c) || parsed.foundCharacters.includes(c));
            defaultChars.forEach(dc => {
                if (!parsed.unlockedCharacters.includes(dc)) {
                    parsed.unlockedCharacters.push(dc);
                }
            });
        } else {
            parsed.unlockedCharacters = [...defaultChars];
        }

        if (!parsed.unlockedArenasByCharacter) {
            parsed.unlockedArenasByCharacter = {};
        }
        parsed.unlockedCharacters.forEach(c => {
            if (!parsed.unlockedArenasByCharacter[c]) {
                parsed.unlockedArenasByCharacter[c] = parsed.unlockedArenas || ['station'];
            }
        });

        if (!parsed.permanentUpgrades) parsed.permanentUpgrades = { damage: 0, health: 0, speed: 0, magnet: 0, regen: 0, cooldown: 0, luck: 0 };
        if (!parsed.weeklyUpgrades || parsed.weeklyUpgrades.weekId !== currentWeek) {
            parsed.weeklyUpgrades = { weekId: currentWeek, damage: 0, health: 0, speed: 0, magnet: 0, regen: 0, cooldown: 0, luck: 0 };
        }
        if (!parsed.seasonalUpgrades || parsed.seasonalUpgrades.seasonId !== currentSeason) {
            parsed.seasonalUpgrades = { seasonId: currentSeason, damage: 0, health: 0, speed: 0, magnet: 0, regen: 0, cooldown: 0, luck: 0 };
        }
        
        if (!parsed.permanentWeaponUpgrades) parsed.permanentWeaponUpgrades = parsed.weaponUpgrades || {};
        if (!parsed.weeklyWeaponUpgrades || parsed.weeklyWeaponUpgrades.weekId !== currentWeek) {
            parsed.weeklyWeaponUpgrades = { weekId: currentWeek };
        }
        if (!parsed.seasonalWeaponUpgrades || parsed.seasonalWeaponUpgrades.seasonId !== currentSeason) {
            parsed.seasonalWeaponUpgrades = { seasonId: currentSeason };
        }
        
        if (!parsed.permanentTalents) parsed.permanentTalents = parsed.unlockedTalents || {};
        if (!parsed.weeklyTalents || parsed.weeklyTalents.weekId !== currentWeek) {
            parsed.weeklyTalents = { weekId: currentWeek };
        }
        if (!parsed.seasonalTalents || parsed.seasonalTalents.seasonId !== currentSeason) {
            parsed.seasonalTalents = { seasonId: currentSeason };
        }
        if (!parsed.cosmetics) parsed.cosmetics = { trail: 'default' };
        if (!parsed.unlockedCosmetics) parsed.unlockedCosmetics = ['default'];
        if (parsed.maxTimeSurvived === undefined) parsed.maxTimeSurvived = 0;
        if (parsed.totalKills === undefined) parsed.totalKills = 0;
        if (parsed.totalGoldEarned === undefined) parsed.totalGoldEarned = 0;
        if (parsed.maxLevelReached === undefined) parsed.maxLevelReached = 0;
        
        if (!parsed.bounties) {
            parsed.bounties = { date: '', active: [], dailyMission: null };
        }
        if (parsed.seasonalPoints === undefined) parsed.seasonalPoints = 0;
        if (!parsed.encounteredEnemies) parsed.encounteredEnemies = [];
        if (!parsed.enemyKills) parsed.enemyKills = {};
        if (!parsed.bossModifiers) parsed.bossModifiers = {};
        if (!parsed.unlockedRelics) parsed.unlockedRelics = [];
        if (!parsed.equippedRelics) parsed.equippedRelics = [];
        
        const today = moment().format('YYYY-MM-DD');
        if (parsed.bounties.date !== today) {
            try {
                const shuffled = [...BOUNTIES_POOL].sort(() => 0.5 - Math.random());
                const shuffledMissions = [...DAILY_MISSIONS_POOL].sort(() => 0.5 - Math.random());
                parsed.bounties = {
                    date: today,
                    active: shuffled.slice(0, 3).map(b => ({ ...b, progress: 0, claimed: false })),
                    dailyMission: { ...shuffledMissions[0], progress: 0, claimed: false }
                };
                localStorage.setItem('cosmic_sloth_save', JSON.stringify(parsed));
            } catch (e) {
                console.error('[SaveManager] Failed to reset daily bounties:', e.message);
                // Keep old bounties if reset fails
            }
        } else if (!parsed.bounties.dailyMission) {
            try {
                const shuffledMissions = [...DAILY_MISSIONS_POOL].sort(() => 0.5 - Math.random());
                parsed.bounties.dailyMission = { ...shuffledMissions[0], progress: 0, claimed: false };
                localStorage.setItem('cosmic_sloth_save', JSON.stringify(parsed));
            } catch (e) {
                console.error('[SaveManager] Failed to initialize daily mission:', e.message);
            }
        }
        
        if (parsed.rerollTokens !== undefined) {
            parsed.relicFragments = (parsed.relicFragments || 0) + parsed.rerollTokens;
            delete parsed.rerollTokens;
            localStorage.setItem('cosmic_sloth_save', JSON.stringify(parsed));
        }
        
        return { ...defaultSave, ...parsed };
      }
    } catch (e) {
      console.error('Failed to load save', e);
    }
    return defaultSave;
  },
  save: (data) => {
    try {
      data.updated_at = Date.now();
      const serialized = JSON.stringify(data);
      localStorage.setItem('cosmic_sloth_save', serialized);
      window.dispatchEvent(new CustomEvent('saveUpdated', { detail: data }));
      // Only sync if user is authenticated with OmenX
      if (SaveManager._walletAddress) {
        pendingSync = true;
        if (syncTimeout) clearTimeout(syncTimeout);
        syncTimeout = setTimeout(() => {
          if (pendingSync) {
            SaveManager.syncToBackend();
            pendingSync = false;
          }
        }, 10000); // Debounce to 10 seconds
      }
    } catch (e) {
      console.error('[SaveManager] Save error');
    }
  }
};