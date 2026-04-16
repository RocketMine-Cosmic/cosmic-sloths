import moment from 'moment';
import { BOUNTIES_POOL, DAILY_MISSIONS_POOL } from './Constants';
import { base44 } from '@/api/base44Client';
import { getOmenXUser } from '@/lib/omenxUser';

export const SaveManager = {
  _saveId: null,
  _userId: null,
  _syncTimeout: null,

  initialize: async () => {
    // OmenX-only: no Base44 backend sync
    console.log('[SaveManager] Using local save only (OmenX mode)');
  },

  // OmenX-only: no backend sync
  syncToBackendNow: async () => {},
  _syncToBackend: () => {},

  load: () => {
    const defaultChars = ['neobyte', 'pandypaws', 'novabyte'];
    const currentWeek = moment().format('YYYY-[W]ww');
    const currentSeason = `${moment().format('YYYY')}-S${Math.floor(moment().week() / 4) + 1}`;

    const defaultSave = {
      gold: 0,
      cosmicTokens: 5000,
      receivedTestTokens: true,
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
            const shuffled = [...BOUNTIES_POOL].sort(() => 0.5 - Math.random());
            const shuffledMissions = [...DAILY_MISSIONS_POOL].sort(() => 0.5 - Math.random());
            parsed.bounties = {
                date: today,
                active: shuffled.slice(0, 3).map(b => ({ ...b, progress: 0, claimed: false })),
                dailyMission: { ...shuffledMissions[0], progress: 0, claimed: false }
            };
            localStorage.setItem('cosmic_sloth_save', JSON.stringify(parsed));
        } else if (!parsed.bounties.dailyMission) {
            const shuffledMissions = [...DAILY_MISSIONS_POOL].sort(() => 0.5 - Math.random());
            parsed.bounties.dailyMission = { ...shuffledMissions[0], progress: 0, claimed: false };
            localStorage.setItem('cosmic_sloth_save', JSON.stringify(parsed));
        }
        
        if (!parsed.receivedTestTokens) {
            parsed.cosmicTokens = (parsed.cosmicTokens || 0) + 5000;
            parsed.receivedTestTokens = true;
            localStorage.setItem('cosmic_sloth_save', JSON.stringify(parsed));
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
    } catch (e) {
      console.error('[SaveManager] Failed to save locally', e);
    }
  }
};