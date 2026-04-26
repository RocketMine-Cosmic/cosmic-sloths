import moment from 'moment';
import { BOUNTIES_POOL, DAILY_MISSIONS_POOL } from './Constants';
import { getOmenXUser } from '@/lib/omenxUser';
import { getAuthFromIndexedDB } from '@/lib/indexedDbAuth';
import { NFTPerkManager } from './NFTPerks';

let syncTimeout = null;
let pendingSync = false;
let syncRetries = 0;
const MAX_SYNC_RETRIES = 3;
let cloudSyncComplete = false;
let syncInFlight = false;          // prevents concurrent sync races
let queuedSyncWhileInFlight = false; // if save() fires during a sync, run one more after
let visibilityListenerAttached = false;

export const SaveManager = {
  _walletAddress: null,
  _accessToken: null,
  _initialized: false,

  initialize: async () => {
    if (SaveManager._initialized) return;
    SaveManager._initialized = true;
    console.log('[SaveManager] Initialize called');

    // Global visibility-change listener — fires on tab hide, mobile background,
    // navigation away. Browser keeps the page alive long enough for the async
    // fetch to complete (unlike beforeunload). One listener covers all pages.
    if (!visibilityListenerAttached && typeof document !== 'undefined') {
      visibilityListenerAttached = true;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && SaveManager._walletAddress) {
          SaveManager.syncToBackendImmediate();
        }
      });
    }
    try {
      // Use localStorage immediately (fastest) — no async wait needed
      const omenxAuth = (() => { try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; } })();
      let walletAddress = omenxAuth?.walletAddress;
      let accessToken = omenxAuth?.accessToken;

      // In parallel, warm up IndexedDB auth (don't block on it)
      if (!walletAddress) {
        try {
          const idbAuth = await getAuthFromIndexedDB();
          if (idbAuth?.walletAddress) {
            walletAddress = idbAuth.walletAddress;
            accessToken = idbAuth.accessToken;
            // Sync back to localStorage so next time is instant
            localStorage.setItem('omenx_auth_data', JSON.stringify(idbAuth));
          }
        } catch (e) {
          console.log('[SaveManager] IndexedDB auth not available:', e.message);
        }
      }
      
      if (!walletAddress) {
        console.log('[SaveManager] No wallet authenticated, using local storage only');
        return;
      }

      SaveManager._walletAddress = walletAddress;
      SaveManager._accessToken = accessToken; // kept for reference; not required by backend anymore
      
      // Load cloud save on init via Base44 SDK (uses Base44 session — no token needed)
      try {
        const { base44 } = await import('@/api/base44Client');

        // CRITICAL: Wait for the Base44 user record to have wallet_address linked
        // before loading. Otherwise loadSave returns null (no wallet linked yet),
        // we treat user as new, and empty local save eventually overwrites cloud.
        const expectedWallet = walletAddress.toLowerCase();
        let walletLinked = false;
        for (let attempt = 0; attempt < 20; attempt++) { // ~10s max (20 × 500ms)
          try {
            const isAuthed = await base44.auth.isAuthenticated();
            if (isAuthed) {
              const me = await base44.auth.me();
              if (me?.wallet_address?.toLowerCase() === expectedWallet) {
                walletLinked = true;
                break;
              }
            }
          } catch (_) { /* keep polling */ }
          await new Promise(r => setTimeout(r, 500));
        }
        if (!walletLinked) {
          console.warn('[SaveManager] Wallet not linked to Base44 user after 10s — skipping cloud load to avoid overwriting cloud save with empty local');
          return;
        }

        const res = await base44.functions.invoke('loadSave', {});
        const response = res.data;
        
        if (response?.saveData) {
          const cloudSave = response.saveData;
          const localSave = localStorage.getItem('cosmic_sloth_save');
          const cloudData = typeof cloudSave === 'string' ? JSON.parse(cloudSave) : cloudSave;
          
          if (localSave) {
            const localData = JSON.parse(localSave);
            // CRITICAL: Deep merge upgrades by taking MAX values (never lose paid upgrades)
            const mergeUpgrades = (local, cloud) => {
              const result = { ...cloud };
              if (local) {
                for (const [key, val] of Object.entries(local)) {
                  if (typeof val === 'number' && typeof result[key] === 'number') {
                    result[key] = Math.max(val, result[key]); // Never lose paid upgrades
                  }
                }
              }
              return result;
            };
            const mergeNestedUpgrades = (local, cloud) => {
              const result = { ...cloud };
              if (local) {
                for (const [weaponId, upgrades] of Object.entries(local)) {
                  if (typeof upgrades === 'object' && upgrades !== null) {
                    result[weaponId] = mergeUpgrades(upgrades, cloud[weaponId] || {});
                  }
                }
              }
              return result;
            };
            const merged = {
              ...localData,
              ...cloudData,
              permanentUpgrades: mergeUpgrades(localData.permanentUpgrades, cloudData.permanentUpgrades || {}),
              permanentWeaponUpgrades: mergeNestedUpgrades(localData.permanentWeaponUpgrades, cloudData.permanentWeaponUpgrades || {}),
              permanentTalents: { ...localData.permanentTalents, ...cloudData.permanentTalents },
              weeklyUpgrades: mergeUpgrades(localData.weeklyUpgrades, cloudData.weeklyUpgrades || {}),
              seasonalUpgrades: mergeUpgrades(localData.seasonalUpgrades, cloudData.seasonalUpgrades || {}),
              unlockedRelics: [...new Set([...(localData.unlockedRelics || []), ...(cloudData.unlockedRelics || [])])],
              equippedRelics: cloudData.equippedRelics || localData.equippedRelics || []
            };
            localStorage.setItem('cosmic_sloth_save', JSON.stringify(merged));
            window.dispatchEvent(new CustomEvent('saveUpdated', { detail: merged }));
            console.log('[SaveManager] Deep merged upgrades (never losing paid upgrades)');
          } else {
            localStorage.setItem('cosmic_sloth_save', JSON.stringify(cloudData));
            window.dispatchEvent(new CustomEvent('saveUpdated', { detail: cloudData }));
            console.log('[SaveManager] Loaded cloud save');
          }
        }
      } catch (e) {
        console.warn('[SaveManager] Cloud load failed, continuing with local:', e.message);
      }
      
      console.log('[SaveManager] Initialized');
    } catch (e) {
      console.error('[SaveManager] Init error:', e.message);
    } finally {
      cloudSyncComplete = true;
    }
  },

  syncToBackend: async () => {
    // Mutex: if a sync is already running, mark that another is needed and bail.
    // The in-flight one will trigger one more pass when it finishes — coalesces
    // burst calls (e.g. rapid purchases) into at most 2 requests instead of N.
    if (syncInFlight) {
      queuedSyncWhileInFlight = true;
      return;
    }

    // Always fetch fresh wallet from localStorage (may have been set after initialize).
    // Backend reads wallet from the Base44 session (linked at first login) — no token needed.
    let walletAddress = SaveManager._walletAddress;

    if (!walletAddress) {
      const omenxAuth = (() => { try { return JSON.parse(localStorage.getItem('omenx_auth_data')); } catch { return null; } })();
      walletAddress = omenxAuth?.walletAddress;
    }

    if (!walletAddress) return;

    syncInFlight = true;
    try {
      const localSave = localStorage.getItem('cosmic_sloth_save');
      if (!localSave) return;

      const { base44 } = await import('@/api/base44Client');
      const res = await base44.functions.invoke('syncSave', {
        saveData: JSON.parse(localSave),
      });
      if (res.data?.error) {
        console.warn('[SaveManager] Sync failed:', res.data.error);
        syncRetries++;
        if (syncRetries >= MAX_SYNC_RETRIES) {
          console.error('[SaveManager] Sync failed after', MAX_SYNC_RETRIES, 'retries. User data may be out of sync.');
          window.dispatchEvent(new CustomEvent('syncFailed', { detail: { reason: 'max_retries' } }));
          syncRetries = 0; // Reset for next batch
        }
      } else {
        console.log('[SaveManager] Cloud sync');
        syncRetries = 0; // Reset on success
      }
    } catch (e) {
      console.warn('[SaveManager] Sync failed:', e.message);
      syncRetries++;
      if (syncRetries >= MAX_SYNC_RETRIES) {
        console.error('[SaveManager] Sync failed after', MAX_SYNC_RETRIES, 'retries. User data may be out of sync.');
        window.dispatchEvent(new CustomEvent('syncFailed', { detail: { reason: 'network_error' } }));
        syncRetries = 0;
      }
    } finally {
      syncInFlight = false;
      // If a save() came in while we were syncing, run one more pass so the
      // newest state reaches the cloud. Single follow-up — won't loop.
      if (queuedSyncWhileInFlight) {
        queuedSyncWhileInFlight = false;
        SaveManager.syncToBackend();
      }
    }
  },

  syncToBackendImmediate: async () => {
    // Emergency sync for critical events (game end) — skip debounce
    if (syncTimeout) clearTimeout(syncTimeout);
    pendingSync = false;
    syncRetries = 0; // Reset retry count for critical syncs
    await SaveManager.syncToBackend();
  },

  _cloudSyncComplete: cloudSyncComplete,
  
  load: () => {
    // Check if local save is stale (last update was >5 min ago and cloud might have newer data)
    const localSave = localStorage.getItem('cosmic_sloth_save');
    const localMeta = localSave ? JSON.parse(localSave) : null;
    const now = Date.now();
    const fiveMinAgo = now - (5 * 60 * 1000);
    
    // If local is old and we're authenticated, re-sync in background (don't block load())
    if (SaveManager._walletAddress && localMeta?.updated_at && localMeta.updated_at < fiveMinAgo) {
      SaveManager.syncToBackend().catch(e => console.warn('[SaveManager] Background re-sync failed:', e.message));
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

    const defaultChars = ['neobyte'];

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
        
        if (!parsed.unlockedCharacters) {
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
        // Archive old weekly upgrades instead of losing them
        if (parsed.weeklyUpgrades && parsed.weeklyUpgrades.weekId && parsed.weeklyUpgrades.weekId !== currentWeek) {
            if (!parsed.weeklyUpgradeHistory) parsed.weeklyUpgradeHistory = {};
            parsed.weeklyUpgradeHistory[parsed.weeklyUpgrades.weekId] = parsed.weeklyUpgrades;
            parsed.weeklyUpgrades = { weekId: currentWeek, damage: 0, health: 0, speed: 0, magnet: 0, regen: 0, cooldown: 0, luck: 0 };
            // Mark that archive needs syncing
            parsed._needsArchiveSync = true;
        } else if (!parsed.weeklyUpgrades) {
            parsed.weeklyUpgrades = { weekId: currentWeek, damage: 0, health: 0, speed: 0, magnet: 0, regen: 0, cooldown: 0, luck: 0 };
        }
        // Archive old seasonal upgrades instead of losing them
        if (parsed.seasonalUpgrades && parsed.seasonalUpgrades.seasonId && parsed.seasonalUpgrades.seasonId !== currentSeason) {
            if (!parsed.seasonalUpgradeHistory) parsed.seasonalUpgradeHistory = {};
            parsed.seasonalUpgradeHistory[parsed.seasonalUpgrades.seasonId] = parsed.seasonalUpgrades;
            parsed.seasonalUpgrades = { seasonId: currentSeason, damage: 0, health: 0, speed: 0, magnet: 0, regen: 0, cooldown: 0, luck: 0 };
            parsed._needsArchiveSync = true;
        } else if (!parsed.seasonalUpgrades) {
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
        if (!parsed.foundCharacters) parsed.foundCharacters = [];
        
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
      // Only sync once a wallet is linked (Base44 session handles auth server-side)
      if (SaveManager._walletAddress) {
        pendingSync = true;
        if (syncTimeout) clearTimeout(syncTimeout);
        syncTimeout = setTimeout(() => {
          if (pendingSync) {
            SaveManager.syncToBackend();
            pendingSync = false;
          }
        }, 3000); // Debounce to 3 seconds — short enough to limit free-currency loss on tab close, long enough to coalesce bursts
      }
    } catch (e) {
      console.error('[SaveManager] Save error:', e.message);
    }
  }
};