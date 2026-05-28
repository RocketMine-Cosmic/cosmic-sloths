import { CHARACTERS, WEAPONS, ARENAS, CHARACTER_TALENTS, DIFFICULTIES, SKIN_COSMETICS, RELICS, getCharacterMastery, getWeaponStatsAndMastery } from './Constants';
import { SFXManager } from './SFXManager';
import { ParticleManager } from './ParticleManager';
import { SaveManager } from './SaveManager';
import { fireWeaponLogic } from './WeaponSystem';
import { renderGame } from './GameEngineDraw';
import { triggerSquadUltimate, updateSquadClones } from './SquadUltimate';
import { spawnEnemies as spawnEnemiesLogic } from './EnemySpawner';
import { updateProjectiles as updateProjectilesLogic } from './ProjectileSystem';
import { updateEnemies as updateEnemiesLogic } from './EnemyAI';
import { updatePickups as updatePickupsLogic } from './PickupSystem';
import { levelUp as levelUpLogic, generateChoices as generateChoicesLogic, applyUpgrade as applyUpgradeLogic, checkSynergies as checkSynergiesLogic, checkEvolutions as checkEvolutionsLogic } from './UpgradeSystem';
import { updateCharacterMechanics } from './CharacterMechanics';
import { isS6OrLater } from '@/lib/seasonGate';

export class GameEngine {
    constructor(canvas, characterId, arenaId, difficultyId, save, callbacks, isEndless = false, worldBossId = null, worldBossName = null, startingWeaponId = null) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.callbacks = callbacks;
        this.characterId = characterId;
        this.save = save;

        // Meteor pool bias override — when entering the Squad Meteor arena, swap
        // poolBiasAllocations for the dedicated meteorPoolBiasAllocations map (if
        // set via the selector on /squad-meteor). Clones the save so we don't
        // mutate the live PlayerSave reference — original allocations are restored
        // automatically when the run ends and the next run is constructed from the
        // freshly-loaded save. Saves players the chore of manual respec for meteor.
        if (arenaId === 'quantum_meteor'
            && save?.meteorPoolBiasAllocations
            && Object.keys(save.meteorPoolBiasAllocations).length > 0) {
            this.save = { ...save, poolBiasAllocations: save.meteorPoolBiasAllocations };
        }
        this.worldBossId = worldBossId || 'world_boss_0';
        this.worldBossName = worldBossName || 'The World Eater';
        this.difficulty = { ...(DIFFICULTIES.find(d => d.id === difficultyId) || DIFFICULTIES[0]) };

        // S6+ balance levers (per docs/S6_MASTER_PLAN.md). Auto-flips at the
        // W20→W21 rollover (Mon May 25 2026 00:00 UTC). S5 keeps legacy values.
        this._isS6 = isS6OrLater();

        // L3 — Cosmic difficulty 3.0× → 2.0× gold/XP. Cuts the dominant
        // difficulty stacker without touching enemy HP/dmg (still 2.5×).
        if (this._isS6 && this.difficulty.id === 'cosmic') {
            this.difficulty.goldMult = 2.0;
            this.difficulty.xpMult = 2.0;
        }
        
        const saveStats = save.permanentUpgrades || {};
        const weeklyStats = save.weeklyUpgrades || {};
        const seasonalStats = save.seasonalUpgrades || {};
        
        // Diminishing returns when all 3 period tiers (perm + weekly + seasonal) are stacked.
        // Whales with everything maxed at 5/5/5 used to get a full 15 levels of stacked
        // bonuses on every stat — that produced 1.4M-gold runs and broke the leaderboard.
        // Now: weekly+seasonal contributions are scaled by 0.66× when stacked on top of
        // permanent. Solo period upgrades still feel full-value; only the triple-max stack
        // is curbed (~30% nerf to the ceiling).
        const STACK_FACTOR = 0.66;
        const getStatBonus = (stat) => {
            const perm = (saveStats[stat] || 0);
            const week = (weeklyStats[stat] || 0) * STACK_FACTOR;
            const season = (seasonalStats[stat] || 0) * STACK_FACTOR;
            
            if (stat === 'health') return (perm * 5) + (week * 10) + (season * 20);
            if (stat === 'speed') return (perm * 0.02) + (week * 0.05) + (season * 0.1);
            if (stat === 'damage') return (perm * 0.02) + (week * 0.05) + (season * 0.1);
            if (stat === 'magnet') return (perm * 5) + (week * 15) + (season * 30);
            if (stat === 'regen') return (perm * 0.1) + (week * 0.2) + (season * 0.5);
            if (stat === 'cooldown') return (perm * 0.02) + (week * 0.05) + (season * 0.1);
            if (stat === 'luck') return (perm * 1) + (week * 2) + (season * 3);
            return 0;
        };

        const permTalents = save.permanentTalents?.[characterId] || [];
        const weekTalents = save.weeklyTalents?.[characterId] || [];
        const seasonTalents = save.seasonalTalents?.[characterId] || [];
        const talentsData = CHARACTER_TALENTS[characterId] || [];

        let talentBonus = {
            maxHp: 0, speedMult: 0, damageMult: 0, magnetRange: 0, regen: 0, armor: 0, areaMult: 0, cooldownMult: 0, projSpeedMult: 0, goldMult: 0, xpMult: 0, luck: 0
        };

        // S6+ L1: weekly/seasonal talent contributions scaled by 0.66× when NOT
        // already covered by the permanent tier. Permanent stays full value.
        // S5 legacy: same talent ID across all three tiers still only applies once
        // (Set-style dedup) — preserved exactly via the seenIds short-circuit below.
        const TALENT_STACK_FACTOR = this._isS6 ? 0.66 : 1.0;
        const applyTalent = (tId, factor, seenIds) => {
            if (seenIds.has(tId)) return;
            seenIds.add(tId);
            const t = talentsData.find(td => td.id === tId);
            if (t) talentBonus[t.stat] = (talentBonus[t.stat] || 0) + (t.value * factor);
        };
        const seenIds = new Set();
        // Permanent first → always 1.0×, takes precedence (Set dedup parity).
        permTalents.forEach(id => applyTalent(id, 1.0, seenIds));
        // Weekly + seasonal — full value on S5 (parity), 0.66× on S6+.
        weekTalents.forEach(id => applyTalent(id, TALENT_STACK_FACTOR, seenIds));
        seasonTalents.forEach(id => applyTalent(id, TALENT_STACK_FACTOR, seenIds));

        const charKills = save.characterKills?.[characterId] || 0;
        const mastery = getCharacterMastery(charKills, characterId);
        // Apply ALL unlocked tiers (not just the highest) so they stack as a long-term grind reward.
        // - `stat` + `value`: single-stat bump (legacy tiers 1–5)
        // - `multiStat`: object of {stat: value} pairs (tier 6 character-flavoured stat package)
        // - `allStats`: applies the value to a curated set of core stat multipliers (NeoByte tier 6)
        // - `abilityBoost`: read elsewhere by CharacterMechanics / GameEngine to tweak active skills
        // Note: tier 7 ability boosts are stored on `this.masteryAbilityBoost` for runtime use.
        this.masteryAbilityBoost = {};
        const allStatsKeys = ['speedMult', 'damageMult', 'areaMult', 'cooldownMult', 'magnetRange', 'xpMult', 'goldMult'];
        (mastery.unlockedTiers || [mastery.current]).forEach(tier => {
            if (!tier) return;
            if (tier.stat && tier.value) {
                talentBonus[tier.stat] = (talentBonus[tier.stat] || 0) + tier.value;
            }
            if (tier.multiStat) {
                for (const [k, v] of Object.entries(tier.multiStat)) {
                    talentBonus[k] = (talentBonus[k] || 0) + v;
                }
            }
            if (tier.stat === 'allStats' && tier.value) {
                allStatsKeys.forEach(k => {
                    // magnetRange is a flat-add stat (default 60-72) so apply value as %.
                    if (k === 'magnetRange') talentBonus[k] = (talentBonus[k] || 0) + Math.round(60 * tier.value);
                    // cooldownMult is a "lower is better" stat — invert.
                    else if (k === 'cooldownMult') talentBonus[k] = (talentBonus[k] || 0) - tier.value;
                    else talentBonus[k] = (talentBonus[k] || 0) + tier.value;
                });
            }
            if (tier.abilityBoost) Object.assign(this.masteryAbilityBoost, tier.abilityBoost);
        });

        const equippedRelics = save.equippedRelics || [];
        const relicBonus = {
            maxHp: 0, speedMult: 0, damageMult: 0, magnetRange: 0, regen: 0, armor: 0, areaMult: 0, cooldownMult: 0, projSpeedMult: 0, goldMult: 0, xpMult: 0, luck: 0
        };

        // S6 Astral Lab — permanent stat buffs purchased via gold-only RNG pulls
        // (see functions/forgeAction.js + components/game/MysteryForgeCard.jsx).
        // Folded into talentBonus so the existing player.* caps still clamp them
        // (e.g. damageMult cap of 4.0 means whales who hit the cap via talents+
        // mastery+relics see no benefit from astral damage pulls — by design).
        // S5 ignores astralBuffs entirely (gated server-side, but defensive here too).
        if (this._isS6 && save.astralBuffs && typeof save.astralBuffs === 'object') {
            for (const [k, v] of Object.entries(save.astralBuffs)) {
                if (typeof v !== 'number' || !isFinite(v)) continue;
                talentBonus[k] = (talentBonus[k] || 0) + v;
            }
        }

        const charAugments = save.forgeCharAugments?.[characterId] || [];
        const hasAug = (id) => charAugments.includes(id);
        const augBonus = {
            maxHp: 0, speedMult: (hasAug('holo_speed') ? 0.1 : 0) + (hasAug('sky_speed') ? 0.15 : 0),
            damageMult: 0, magnetRange: 0, regen: hasAug('holo_regen') ? 0.3 : 0,
            armor: hasAug('pan_armor') ? 3 : 0, areaMult: hasAug('nova_aoe') ? 0.2 : 0,
            cooldownMult: 0, projSpeedMult: 0, goldMult: hasAug('syn_gold') ? 0.2 : 0,
            xpMult: hasAug('code_xp') ? 0.15 : 0, luck: 0, critBonus: hasAug('neo_crit') ? 0.08 : 0
        };

        const relicLevels = save.relicLevels || {};
        const relicPrestigeMap = save.relicPrestige || {};
        equippedRelics.forEach(rId => {
            const r = RELICS.find(rd => rd.id === rId);
            if (r) {
                const level = relicLevels[rId] || 1;
                const baseVal = r.values ? r.values[Math.min(level, 5) - 1] : r.value;
                // Prestige: +5% per tier (PL1–PL5 → +5% to +25%) applied multiplicatively
                // to the relic's effect value. e.g. Midas Core L5 at PL2 = +50% × 1.10 = +55%.
                const prestigeTier = Math.min(5, Math.max(0, Number(relicPrestigeMap[rId] || 0)));
                const val = baseVal * (1 + prestigeTier * 0.05);
                relicBonus[r.stat] = (relicBonus[r.stat] || 0) + val;
            }
        });

        const baseCharRaw = CHARACTERS.find(c => c.id === characterId) || CHARACTERS[0];
        const skinId = save.cosmetics?.skins?.[characterId] || `${characterId}_default`;
        const skinColor = SKIN_COSMETICS.find(s => s.id === skinId)?.color;
        const baseChar = skinColor ? { ...baseCharRaw, color: skinColor } : (save.skinColorOverride ? { ...baseCharRaw, color: save.skinColorOverride } : baseCharRaw);

        if (arenaId === 'world_boss_arena') {
            this.arena = { id: 'world_boss_arena', name: 'Global Raid', bg: '#1a0000', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/887e8de50_image-48.jpg', duration: Infinity, effect: 'none' };
        } else {
            this.arena = ARENAS.find(a => a.id === arenaId) || ARENAS[0];
            if (isEndless) {
                this.arena = { ...this.arena, duration: Infinity };
            }
        }
        
        this.envEffect = this.arena.effect || 'none';
        this.envParticles = [];
        this.envModifiers = {
            playerSpeed: 1,
            enemySpawnRate: 1,
            enemySpeed: 1
        };

        if (this.envEffect === 'neon_rain') {
            this.envModifiers.playerSpeed = 1.1;
            this.envModifiers.enemySpeed = 1.1;
        } else if (this.envEffect === 'fog') {
            this.envModifiers.playerSpeed = 0.9;
            this.envModifiers.enemySpawnRate = 0.9;
        } else if (this.envEffect === 'solar_flare') {
            this.envModifiers.enemySpawnRate = 1.2;
        }

        this.arenaImage = null;
        if (this.arena.image) {
            this.arenaImage = new Image();
            this.arenaImage.crossOrigin = "Anonymous";
            this.arenaImage.src = this.arena.image;
        }

        let playerImage = null;
        if (baseChar.image) {
            playerImage = new Image();
            playerImage.src = baseChar.image;
        }
        
        let idleImage = null;
        if (baseChar.idleSprite) {
            idleImage = new Image();
            idleImage.src = baseChar.idleSprite;
        }
        
        let walkImage = null;
        if (baseChar.walkSprite) {
            walkImage = new Image();
            walkImage.src = baseChar.walkSprite;
        }
        
        this.killEffect = save.cosmetics?.killEffect || 'none';

        const initialWeaponId = startingWeaponId || 'neoBlaster';

        // Sector gold penalty removed — dynamic difficulty already adjusts spawn rate
        // based on player performance, and sectors unlock linearly (you can't skip
        // ahead) so punishing earlier sectors was player-hostile with no anti-farm value.
        // Leaderboard score still uses an arena multiplier in saveScore — that's untouched.
        const sectorPenalty = 1.0;

        // VIP bonus: 1% damage + 1% HP per VIP level (stored in save.vipLevel)
        const vipLevel = save.vipLevel || 0;
        const vipDmgBonus = vipLevel * 0.01;
        const vipHpBonus = Math.floor((baseChar.hp + getStatBonus('health') + (talentBonus.maxHp || 0) + (relicBonus.maxHp || 0)) * vipLevel * 0.01);

        // Title buff: small permanent bonuses while a title is equipped (save.titleBuff
        // is set by Game.jsx from the OmenX user record before constructing the engine).
        const titleBuff = save.titleBuff || {};
        const titleHpBase = baseChar.hp + getStatBonus('health') + (talentBonus.maxHp || 0) + (relicBonus.maxHp || 0);
        const titleHpBonus = Math.floor(titleHpBase * (titleBuff.hpMult || 0));

        // Admin perk: tiny flat +N% to base stats (client-side, set in Game.jsx).
        // Layered as additive multipliers — kept very small (default 2%).
        const adminMult = (save.adminBuff?.mult) || 0;
        const adminHpBonus = Math.floor(titleHpBase * adminMult);

        // Squad Meteor buffs — apply to EVERY squad member's runs across every arena
        // ("Buffs apply to every squad member's runs" per getSquadMeteorState).
        // Server returns percentages as whole numbers (5 = +5%), convert to additive
        // multiplier deltas. cdrPct is "lower cooldown is better" — subtracted from
        // cooldownMult (mirrors how talents handle cooldown reductions).
        const meteorBuffs = save.squadMeteorBuffs || null;
        const meteorDmgMult  = meteorBuffs ? (meteorBuffs.damage_pct || 0) / 100 : 0;
        const meteorAoeMult  = meteorBuffs ? (meteorBuffs.aoe_pct    || 0) / 100 : 0;
        const meteorGoldMult = meteorBuffs ? (meteorBuffs.gold_pct   || 0) / 100 : 0;
        const meteorCdrMult  = meteorBuffs ? (meteorBuffs.cdr_pct    || 0) / 100 : 0;

        this.player = {
            name: baseChar.name,
            image: playerImage,
            idleImage: idleImage,
            walkImage: walkImage,
            frameTimer: 0,
            currentFrame: 0,
            x: 0, y: 0, radius: 16,
            maxHp: baseChar.hp + getStatBonus('health') + (talentBonus.maxHp || 0) + (relicBonus.maxHp || 0) + vipHpBonus + titleHpBonus + adminHpBonus,
            hp: baseChar.hp + getStatBonus('health') + (talentBonus.maxHp || 0) + (relicBonus.maxHp || 0) + vipHpBonus + titleHpBonus + adminHpBonus,
            speed: baseChar.speed,
            speedMult: (1 + getStatBonus('speed') + (talentBonus.speedMult || 0) + (relicBonus.speedMult || 0) + augBonus.speedMult + (titleBuff.speedMult || 0) + adminMult) * this.envModifiers.playerSpeed,
            damageMult: (baseChar.damageMult || 1) + getStatBonus('damage') + (talentBonus.damageMult || 0) + (relicBonus.damageMult || 0) + vipDmgBonus + (titleBuff.damageMult || 0) + adminMult + meteorDmgMult,
            magnetRange: (baseChar.magnetRange || 60) + 30 + getStatBonus('magnet') + (talentBonus.magnetRange || 0) + (relicBonus.magnetRange || 0) + (titleBuff.magnetRange || 0) + Math.floor(((baseChar.magnetRange || 60) + 30) * adminMult),
            regen: baseChar.regen + getStatBonus('regen') + (talentBonus.regen || 0) + (relicBonus.regen || 0) + augBonus.regen + (titleBuff.regen || 0),
            armor: baseChar.armor + (talentBonus.armor || 0) + (relicBonus.armor || 0) + augBonus.armor + (titleBuff.armor || 0),
            areaMult: (baseChar.areaMult || 1) + (talentBonus.areaMult || 0) + (relicBonus.areaMult || 0) + augBonus.areaMult + (titleBuff.areaMult || 0) + adminMult + meteorAoeMult,
            cooldownMult: (baseChar.cooldownMult || 1) - getStatBonus('cooldown') + (talentBonus.cooldownMult || 0) + (relicBonus.cooldownMult || 0) + (titleBuff.cooldownMult || 0) - meteorCdrMult,
            projSpeedMult: (baseChar.projSpeedMult || 1) + (talentBonus.projSpeedMult || 0) + (relicBonus.projSpeedMult || 0),
            // S6+ L2: NFT gold multiplier folded into player.goldMult ADDITIVELY
            // instead of multiplied at pickup time. (`save.nftGoldMultiplier` is e.g.
            // 1.1 for +10% — convert to additive 0.1 when present.) PickupSystem
            // skips the multiplicative pickup-time bonus on S6+ to match.
            goldMult: ((baseChar.goldMult || 1) + (talentBonus.goldMult || 0) + (relicBonus.goldMult || 0) + augBonus.goldMult + (titleBuff.goldMult || 0) + adminMult + meteorGoldMult + (this._isS6 ? Math.max(0, (save.nftGoldMultiplier || 1) - 1) : 0)) * this.difficulty.goldMult * sectorPenalty,
            xpMult: ((baseChar.xpMult || 1) + (talentBonus.xpMult || 0) + (relicBonus.xpMult || 0) + augBonus.xpMult + (titleBuff.xpMult || 0) + adminMult) * this.difficulty.xpMult,
            luck: (baseChar.luck || 0) + getStatBonus('luck') + (talentBonus.luck || 0) + (relicBonus.luck || 0) + (titleBuff.luck || 0) + adminMult,
            critBonus: augBonus.critBonus + (titleBuff.critBonus || 0),
            charAugments: charAugments,
            color: baseChar.color,
            trail: save.cosmetics?.trail || 'default',
            weapons: [{ ...WEAPONS[initialWeaponId], level: 1, timer: 0 }],
            passives: [],
            passiveLevels: {},
            // Stored for the buff-aura renderer (purely visual; stat math above
            // already mixed these values into the relevant player fields).
            titleBuff: titleBuff && Object.keys(titleBuff).length ? titleBuff : null
        };
        
        // S6+ Fix A — final safety clamps on the most-stacked multipliers. Catches
        // late-run Overcharge stacking, uncapped Astral Lab pulls, and any future
        // multiplier source we haven't yet predicted. The engine's per-level growth
        // caps in levelUp() (5.0 dmg / 2000 HP) DON'T apply to upgrade picks, so
        // without these clamps a 90-min endless player can blow past them via
        // Overcharge fillers. S5 unchanged (legacy whales keep their stacking).
        if (this._isS6) {
            this.player.damageMult = Math.min(6.0,  this.player.damageMult);
            this.player.goldMult   = Math.min(8.0,  this.player.goldMult);
            this.player.areaMult   = Math.min(4.0,  this.player.areaMult);
            this.player.xpMult     = Math.min(5.0,  this.player.xpMult);
            // cooldownMult is "lower is better" — floor at 0.35 (matches the
            // existing per-weapon Math.max(0.35, ...) safeguard in updateWeapons).
            this.player.cooldownMult = Math.max(0.35, this.player.cooldownMult);
        }

        // Session XP buff (purchased via "+50% XP" SKU). xpExpiry is a server-clock
        // ms timestamp set by purchaseSku. We snapshot the expiry here AND re-check
        // every frame so the buff naturally drops off mid-run if it expires (rather
        // than staying applied for the whole run because we only checked at startup).
        this.xpBuffExpiry = Number(save.sessionBuffs?.xpExpiry || 0);
        const hasXpBuff = this.xpBuffExpiry > Date.now();
        const xpBuffMultiplier = hasXpBuff ? 1.5 : 1.0;

        // Global XP buff — admin-set server-wide multiplier (e.g. 2× XP for 24h
        // as a make-good when something disrupts play). Folded into the baseline
        // so it naturally stacks with the personal +50% buff multiplicatively.
        // Locked in at run-start: changing the global value mid-run does not
        // affect runs already in progress (matches how difficulty is locked).
        const globalBuff = save.globalXpBuff;
        const globalXpMult = (globalBuff && globalBuff.multiplier > 1 && globalBuff.expiresAt > Date.now())
            ? Number(globalBuff.multiplier)
            : 1.0;
        this.globalXpMult = globalXpMult;

        // Cache the no-personal-buff baseline (incl. global mult) so we can toggle
        // the personal +50% on/off cleanly when it expires mid-run (see update() below).
        this._xpMultBase = ((baseChar.xpMult || 1) + (talentBonus.xpMult || 0) + (relicBonus.xpMult || 0) + augBonus.xpMult + (titleBuff.xpMult || 0) + adminMult) * this.difficulty.xpMult * globalXpMult;
        this.player.xpMult = this._xpMultBase * xpBuffMultiplier;
        this.player.xpBuffActive = hasXpBuff;
        if (hasXpBuff) {
            console.log('[GameEngine] +50% XP buff ACTIVE — expires in', Math.floor((this.xpBuffExpiry - Date.now()) / 1000), 'seconds');
        }
        if (globalXpMult > 1) {
            console.log(`[GameEngine] Global XP buff ACTIVE — ${globalXpMult}× for entire server`);
        }

        if (hasAug('dat_ghost')) {
            this.player.iFrames = 5.0;
            this.player.invincibleTimer = 5.0;
        }
        
        this.camera = { x: 0, y: 0 };
        this.joystick = { x: 0, y: 0 };
        this.enemies = [];
        this.projectiles = [];
        this.pickups = [];
        this.particleManager = new ParticleManager();
        this.damageTexts = [];
        
        this.stars = Array.from({length: 150}, () => ({ x: Math.random() * 2000, y: Math.random() * 2000, size: Math.random() * 2 + 0.5, parallax: Math.random() * 0.4 + 0.1 }));
        
        this.keys = {};
        this.time = 0;
        this.frameCount = 0;
        this.level = 1;
        this.xp = 25;
        this.banishedUpgrades = new Set();
        this.xpRequired = 25;
        this.gold = 0;
        this.kills = 0;

        if (arenaId === 'world_boss_arena') {
            let totalXpNeeded = 0;
            let currentReq = 10;
            for (let i = 1; i < 20; i++) {
                totalXpNeeded += currentReq;
                currentReq = Math.floor(currentReq * 1.1 + 20);
            }
            this.xp = totalXpNeeded;
        }

        // Squad Meteor — 3-minute DPS-check arena with no mob spawns. Hand out
        // EXACTLY 10 starter level-ups at run start (no XP priming — XP-based
        // priming is what makes raid players overshoot with stacked XP buffs,
        // which Texxy explicitly doesn't want here). Each pick fires the normal
        // LevelUpModal (reroll/banish/evolutions all behave as usual); when the
        // player commits an upgrade, applyUpgrade decrements
        // `pendingStarterLevelUps` and calls `engine.levelUp()` directly for
        // the next pick. Run timer stays paused while the modal is open
        // (engine.isPaused), so the 3-min clock only starts after all 10 picks.
        if (arenaId === 'quantum_meteor') {
            this.pendingStarterLevelUps = 10;
        }
        
        this.isPaused = false;
        this.isGameOver = false;
        this.isVictory = false;
        this.encounteredEnemies = new Set();
        this.enemyKills = {};
        
        this.lockedCharacters = ['glitch', 'holodrift', 'codebreaker', 'dataphantom', 'neonvortex', 'synthbeats', 'skybyte']
            .filter(id => !(save.foundCharacters || []).includes(id));
        this.characterPickupSpawned = false;
        this.characterPickup = null;
        this.bossSpawned = false;
        this.enemyProjectiles = [];
        this.hazards = [];
        
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeTimer = 0;
        this.hitStopTimer = 0;
        this.zoom = window.innerWidth < 768 ? 0.5 : 0.8;
        this.bossModifiers = save.bossModifiers || {};
        this.worldBossDamage = 0;
        this.totalDamageDealt = 0;
        this.bossesKilled = 0;
        this.elitesKilled = 0;
        // Per-weapon stat tracking — credit damage on every hit, credit kill on the killing blow.
        this.weaponDamage = {};
        this.weaponKills = {};
        // Per-run relic fragment accumulator. Picked up via PickupSystem,
        // sent to saveScore at run end where the SERVER credits PlayerSave.relicFragments
        // (client cannot bump that field — syncSave blocks it as anti-cheat).
        this.runFragments = 0;

        // Rolling 10-second damage window. Each entry is { t, dmg }; we sum entries
        // whose timestamp is within the last DPS_WINDOW seconds. Lets the HUD's DPS
        // value reflect *recent* output so post-boss buffs / new evolutions show up
        // in real time instead of being averaged-out across the whole run.
        this.dpsWindow = [];
        this.DPS_WINDOW = 10;
        
        this.characterMechanics = {
            bannerTimer: 0,
            banners: [],
            scrapArmor: 0,
            decoyTimer: 0,
            decoys: [],
            hackTimer: 0,
            hackedEnemies: [],
            sonicCharge: 0,
            lastMoveDir: { x: 0, y: 0 }
        };
        
        this.bindEvents();
        this.lastTime = performance.now();
        this.animationId = requestAnimationFrame(this.loop.bind(this));
    }

    triggerSquadUltimate(tier) {
        triggerSquadUltimate(this, tier);
    }

    triggerSonicBoom() {
        // Tier-7 mastery: charge can build past 100 → 200 ("supercharge"). Released
        // at supercharge it does 2.5× damage in a 1.6× radius and shakes the screen harder.
        const isSuper = (this.characterMechanics.sonicCharge || 0) >= 200;
        this.characterMechanics.sonicCharge = 0;
        const label = isSuper ? "HYPER BOOM!" : "SONIC BOOM!";
        const color = isSuper ? '#FFFFFF' : '#00D4FF';
        const radius = isSuper ? 480 : 300;
        const dmg = isSuper ? 125 : 50;
        const visualScale = isSuper ? 3.5 : 2.0;
        const shockGrowth = isSuper ? 1300 : 800;
        const shockWidth = isSuper ? 14 : 8;
        this.addDamageText(this.player.x, this.player.y - 40, label, color);
        this.particleManager.createExplosion(this.player.x, this.player.y, color, visualScale, 'default');
        this.addParticle(this.player.x, this.player.y, color, 1, 'shockwave', isSuper ? 4.5 : 3.0, { growthRate: shockGrowth, lineWidth: shockWidth });
        this.shake(isSuper ? 1.0 : 0.5);
        this.enemies.forEach(e => {
            if (Math.hypot(e.x - this.player.x, e.y - this.player.y) < radius) {
                // Skybyte's Sonic Boom — tagged so it appears in the post-run
                // weapon breakdown instead of "Untracked Damage".
                this.damageEnemy(e, dmg * this.player.damageMult, { weaponId: 'sonicBoom' });
                const angle = Math.atan2(e.y - this.player.y, e.x - this.player.x);
                e.x += Math.cos(angle) * (isSuper ? 180 : 100);
                e.y += Math.sin(angle) * (isSuper ? 180 : 100);
            }
        });
    }

    takeDamage(amount, sourceName = null) {
        // Hard gate: never apply damage while a level-up modal is open. This is
        // checked BEFORE isPaused because iPhone Chrome can race-flip isPaused
        // back to false via phantom focus events (Simon + Anubis bug 2026-05-23).
        // Belt-and-braces — the auto-resume paths below also guard on this flag.
        if (this._levelUpPending) return;
        // Defense-in-depth: never apply damage while the engine is paused.
        // The update() loop is already gated by isPaused, but takeDamage can be
        // reached via async paths (deferred contact ticks, confirmation modals
        // briefly flipping pause state, hazard timers firing across pause edges)
        // — Simon reported dying mid-pick on the LevelUpModal (2026-05-23 Discord).
        // rerollChoices() already calls out this same race in its own comment.
        // One line here closes the entire bug class without auditing every path.
        if (this.isPaused) return;
        if (this.player.invincibleTimer > 0 || this.player.iFrames > 0) return;
        // Remember whatever last hurt the player so we can show "killed by X" on game over.
        if (sourceName) this._lastDamageSource = sourceName;

        if (this.player.charAugments?.includes('glt_phase') && Math.random() < 0.1) {
            this.player.iFrames = 2.0;
            this.addDamageText(this.player.x, this.player.y - 20, "PHASE SHIFT", '#FF00FF');
            return;
        }
        
        if (this.player.charAugments?.includes('dat_shade')) {
            this.player.phantomBoostTimer = 2.0;
            this.player.iFrames = Math.max(this.player.iFrames || 0, 2.0);
            this.addParticle(this.player.x, this.player.y, '#C0C0C0', 20, 'smoke', 2);
        }

        // Armor — S5: pure flat reduction (legacy). S6+: hybrid model so armor
        // builds stay viable into late game. Each point of armor also grants a
        // 0.5% multiplicative reduction, capped at 25% (50 armor — only true
        // armor stackers reach this). Early game feels identical (flat dominates);
        // late game a dedicated stacker takes ~25% less from boss hits, making
        // armor a real defensive build path alongside HP/regen/iFrames.
        const totalArmor = this.player.armor + (this.characterMechanics.scrapArmor || 0);
        let actualDmg = Math.max(1, amount - totalArmor);
        if (this._isS6) {
            const pctReduction = Math.min(0.25, totalArmor * 0.005);
            actualDmg = Math.max(1, actualDmg * (1 - pctReduction));
        }
        if (this.player.charAugments?.includes('pan_fortress') && this.player.hp >= this.player.maxHp) {
            actualDmg = Math.max(1, Math.floor(actualDmg * 0.85));
        }
        actualDmg = Math.max(1, Math.floor(actualDmg));

        // Bribe (SynthBeats): dodge a hit by paying gold. Now scales with the damage
        // being negated (so big hits cost a lot of gold) and is rate-limited so
        // players can't infinitely tank damage by farming gold faster than they spend it.
        const bribeBaseCost = this.masteryAbilityBoost?.bribeCost ?? 5;
        const bribeCost = bribeBaseCost + Math.floor(amount * 2); // 5 + 2× incoming damage
        const bribeCooldown = 3.0;
        if (this.characterId === 'synthbeats' && this.gold >= bribeCost && (this.player.bribeCooldown || 0) <= 0) {
            this.gold -= bribeCost;
            this.player.bribeCooldown = bribeCooldown;
            if (this.callbacks.onGoldChange) this.callbacks.onGoldChange(this.gold);
            this.addDamageText(this.player.x, this.player.y - 20, `BRIBED! -${bribeCost}g`, '#FFD700');
            this.particleManager.createExplosion(this.player.x, this.player.y, '#FFD700', 1.0, 'default');
            this.player.iFrames = 0.5;
            return;
        }

        const phaseShiftChance = this.masteryAbilityBoost?.phaseShiftChance ?? 0.15;
        if (this.characterId === 'glitch' && Math.random() < phaseShiftChance) {
            this.player.iFrames = 2.0;
            this.player.invincibleTimer = 2.0;
            this.addDamageText(this.player.x, this.player.y - 20, "PHASE SHIFT!", '#FF00FF');
            this.addParticle(this.player.x, this.player.y, '#FF00FF', 15, 'slash', 1.5);
            this.player.weapons.forEach(w => w.timer = 0);
            return;
        }

        this.player.hp -= actualDmg;
        this.player.iFrames = 0.2;
        this.callbacks.onHpChange(this.player.hp, this.player.maxHp);
        this.addDamageText(this.player.x, this.player.y - 20, actualDmg, '#ff0000');
        SFXManager.playPlayerHit();
        
        const aegis = this.player.weapons.find(w => w.id === 'aegisMatrix');
        if (aegis && Math.random() < 0.5) {
            for(let i=0; i<5; i++) {
                const angle = Math.random() * Math.PI * 2;
                this.projectiles.push({
                    x: this.player.x, y: this.player.y,
                    vx: Math.cos(angle) * 500,
                    vy: Math.sin(angle) * 500,
                    radius: 10,
                    damage: aegis.baseDamage * this.player.damageMult * 2,
                    pierce: 1,
                    life: 2,
                    color: '#00ff66',
                    type: 'missile',
                    // Tag retaliation missiles so damage shows up in the post-run
                    // breakdown — these are spawned from takeDamage(), not the
                    // weapon-fire path, so they bypass the fallback weaponId
                    // assignment in WeaponSystem.js (Texxy bug 2026-05-17).
                    weaponId: 'aegisMatrix'
                });
            }
        }

        if (this.player.hp <= 0) {
            const currentOmenxBalance = this.save.omenxBalance ?? 0;
            if (!this.player.hasRevivedWithTokens && this.callbacks.onDeathPrompt && currentOmenxBalance >= 4) {
                 this.isPaused = true;
                 this.callbacks.onDeathPrompt();
                 return;
            }

            if (this.player.charAugments?.includes('holo_revive') && !this.player.holoRevived) {
                this.player.holoRevived = true;
                this.player.hp = this.player.maxHp * 0.1;
                this.player.iFrames = 3.0;
                this.callbacks.onHpChange(this.player.hp, this.player.maxHp);
                this.addDamageText(this.player.x, this.player.y - 40, "EMERGENCY REVIVE", '#00FA9A');
                this.particleManager.createExplosion(this.player.x, this.player.y, '#00FA9A', 2);
                return;
            }
            this.particleManager.createExplosion(this.player.x, this.player.y, this.player.color, 3, this.characterId);
            this.gameOver();
        }
    }

    bindEvents() {
        this.handleKeyDown = (e) => { this.keys[e.key.toLowerCase()] = true; };
        this.handleKeyUp = (e) => { this.keys[e.key.toLowerCase()] = false; };
        // Auto-pause when the browser throttles the tab. Without this, requestAnimationFrame
        // fires at ~1Hz in the background — clamped dt makes the game limp along while
        // real time races ahead, which players perceive as "boss HP stuck" or weapons
        // not firing. We just freeze the loop entirely while the tab is hidden.
        //
        // CRITICAL: don't fire auto-pause during the engine's first ~1 second AND before
        // the loop has actually ticked once. Mobile browsers (Samsung Internet, Chrome
        // Android, Discord webview) routinely fire spurious `visibilitychange(hidden=true)`
        // events during the page transition into /game — when the address bar collapses,
        // when the loading overlay first paints, when system UI inserts itself. Without
        // this guard, those phantom events latch _wasAutoPaused=true on a freshly-loaded
        // run and the engine never ticks — player sees a frozen "SURVIVE 0:00 / SCORE 0"
        // HUD with the boss already on screen and nothing happens (Lucifer bug 2026-05-15,
        // following Thom's 2026-05-14 report). The 1s + frameCount guard means we only
        // pause runs that have ACTUALLY started, which is the only state worth pausing.
        this._engineCreatedAt = performance.now();
        // Verify-then-pause pattern. iOS Safari fires spurious `visibilitychange(hidden)`
        // events during URL-bar collapse, Control Center peek, scroll-bounce, and other
        // system gestures — they clear within ~200ms. Pausing on every one of those was
        // causing the "random raid pauses" Thom kept reporting (Safari iPhone, 2026-05-15).
        // Now: when `hidden=true` arrives, schedule a verification check 350ms later. If
        // the document is STILL hidden by then, it's a real backgrounding and we pause.
        // If it flipped back to visible (Safari flicker), we ignore the event entirely.
        this._pendingHidePause = null;
        this.handleVisibilityChange = () => {
            if (document.hidden) {
                const aliveMs = performance.now() - (this._engineCreatedAt || 0);
                if (aliveMs < 1000 || (this.frameCount || 0) < 5) {
                    // Engine just spun up — ignore spurious hidden events fired
                    // by mobile browsers during the GameLoadingScreen → canvas
                    // transition (address-bar collapse, layout shift, etc.).
                    return;
                }
                // Defer the pause — wait to confirm the tab is actually backgrounded.
                if (this._pendingHidePause) clearTimeout(this._pendingHidePause);
                this._pendingHidePause = setTimeout(() => {
                    this._pendingHidePause = null;
                    if (!document.hidden) return; // Safari flicker — abort.
                    // Don't latch _wasAutoPaused if a level-up modal is already
                    // open — otherwise the resume path below would clear isPaused
                    // while the modal is still showing (player dies mid-pick).
                    if (this._levelUpPending) return;
                    this._wasAutoPaused = !this.isPaused;
                    this.isPaused = true;
                }, 350);
            } else {
                // Visible — cancel any pending pause from a flicker that already cleared.
                if (this._pendingHidePause) {
                    clearTimeout(this._pendingHidePause);
                    this._pendingHidePause = null;
                }
                if (this._wasAutoPaused && !this._levelUpPending) {
                    this._wasAutoPaused = false;
                    this.lastTime = performance.now(); // prevent dt spike on resume
                    this.isPaused = false;
                }
            }
        };
        // Belt-and-braces safety net for in-app browsers (Discord, Twitter, Telegram,
        // FB Messenger) that don't reliably fire `visibilitychange` when their webview
        // is re-focused. Without this, backgrounding the game to switch apps could
        // leave it paused forever with no UI indication.
        // NOTE: we used to also listen for `pointerdown` here, but that turned out to
        // mask the real bug above (engine started in auto-paused state and only
        // un-paused if the player happened to tap). We removed pointerdown so
        // auto-pause stays purely tied to actual document visibility — the right
        // semantic for a "browser put the tab to sleep" recovery net.
        this.handleAutoResume = () => {
            // Skip auto-resume while a level-up modal is open — the player is
            // mid-pick and the engine must stay frozen until they commit.
            if (this._wasAutoPaused && !document.hidden && !this._levelUpPending) {
                this._wasAutoPaused = false;
                this.lastTime = performance.now();
                this.isPaused = false;
            }
        };
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        window.addEventListener('focus', this.handleAutoResume);
    }

    cleanup() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        window.removeEventListener('focus', this.handleAutoResume);
        if (this._pendingHidePause) {
            clearTimeout(this._pendingHidePause);
            this._pendingHidePause = null;
        }
        cancelAnimationFrame(this.animationId);
    }

    loop(timestamp) {
        try {
            // Self-healing auto-pause recovery. If the engine is paused, the
            // document is visible, and the player hasn't intentionally paused
            // (no UI modal open), force-resume. This is intentionally aggressive
            // because mobile browsers (Samsung Internet, Chrome Android, Discord
            // webview) fire phantom/orphaned visibility events during page-load
            // transitions that can latch the engine into a permanent pause —
            // sometimes WITHOUT a matching `visible` event ever following, and
            // sometimes with `_wasAutoPaused` cleared by an earlier resume that
            // raced with a stale `hidden` event. Checking the actual state of the
            // world (document.hidden + no game-over/victory/modal) is more
            // reliable than trusting our own flags weren't trampled.
            //
            // Intentional pauses we MUST respect (don't auto-resume through):
            //   - Pause menu (PauseModal — Game.jsx tracks this in React state,
            //     not on the engine; checking `!document.hidden` is enough because
            //     when the player taps Resume, Game.jsx flips engine.isPaused
            //     back itself).
            //   - Level-up / death / victory modals (engine sets isPaused=true
            //     and we check isGameOver/isVictory below; for level-up, the
            //     callbacks.onLevelUp setter populates levelUpChoices in React,
            //     and we leave that one alone via the _wasAutoPaused gate).
            //
            // To distinguish, only force-resume runs that auto-paused themselves
            // — that's exactly what _wasAutoPaused tracks. If it got cleared by
            // a stale event race, the visibility handler's "visible" branch will
            // also have run and unpaused us, so the engine should already be
            // moving. Belt-and-braces (Lucifer 2026-05-14, Thom 2026-05-15).
            if (this._wasAutoPaused && this.isPaused && !document.hidden
                && !this.isGameOver && !this.isVictory && !this._levelUpPending) {
                this._wasAutoPaused = false;
                this.lastTime = timestamp;
                this.isPaused = false;
            }
            if (!this.isPaused && !this.isGameOver && !this.isVictory) {
                const dt = (timestamp - this.lastTime) / 1000;
                this.update(dt);
                this.draw();
            }
        } catch (e) {
            console.error("Game loop error:", e);
        }
        this.lastTime = timestamp;
        this.animationId = requestAnimationFrame(this.loop.bind(this));
    }

    update(dt) {
        if (dt > 0.1) dt = 0.1;
        this.lastDt = dt;
        
        // Dynamic Difficulty
        if (!this.dynamicDifficulty) this.dynamicDifficulty = {
            timer: 0, lastKills: 0, damageTaken: 0, lastHp: this.player.hp, speedMult: 1.0, spawnRateMult: 1.0
        };
        this.dynamicDifficulty.timer += dt;
        if (this.player.hp < this.dynamicDifficulty.lastHp) {
            this.dynamicDifficulty.damageTaken += (this.dynamicDifficulty.lastHp - this.player.hp);
        }
        this.dynamicDifficulty.lastHp = this.player.hp;

        if (this.dynamicDifficulty.timer >= 15) {
            const killsDelta = this.kills - this.dynamicDifficulty.lastKills;
            // S6+ Option 2: asymmetric ramp — strong play climbs FAST (+0.15/cycle),
            // struggling decays SLOW (-0.05/cycle). One good 15s window matters more
            // than one bad one. Rewards consistency for top players. S5 keeps the
            // legacy symmetric ±0.1 ramp.
            // Whale-headroom patch (2026-05-28 — Simon/Anubis/ReZuM Discord feedback):
            // top players were hitting the previous 2.0× ceiling and seeing no score
            // gain from further investment. Spawn ceiling raised 2.0× → 3.5×, enemy
            // speed ceiling 2.0× → 2.5×. Floor (0.7×) unchanged — strugglers protected.
            const upStep   = this._isS6 ? 0.15 : 0.1;
            const downStep = this._isS6 ? 0.05 : 0.1;
            const spawnCap = this._isS6 ? 3.5 : 2.0;
            const speedCap = this._isS6 ? 2.5 : 2.0;
            if (this.dynamicDifficulty.damageTaken > this.player.maxHp * 0.3) {
                this.dynamicDifficulty.speedMult = Math.max(0.7, this.dynamicDifficulty.speedMult - downStep);
                this.dynamicDifficulty.spawnRateMult = Math.max(0.7, this.dynamicDifficulty.spawnRateMult - downStep);
            } else if (killsDelta > 30 && this.dynamicDifficulty.damageTaken < this.player.maxHp * 0.05) {
                this.dynamicDifficulty.speedMult = Math.min(speedCap, this.dynamicDifficulty.speedMult + upStep);
                this.dynamicDifficulty.spawnRateMult = Math.min(spawnCap, this.dynamicDifficulty.spawnRateMult + upStep);
            }
            this.dynamicDifficulty.lastKills = this.kills;
            this.dynamicDifficulty.damageTaken = 0;
            this.dynamicDifficulty.timer = 0;
        }

        if (this.hitStopTimer > 0) {
            this.hitStopTimer -= dt;
            return;
        }
        
        if (this.shakeTimer > 0) {
            this.shakeX = (Math.random() - 0.5) * this.shakeTimer * 20;
            this.shakeY = (Math.random() - 0.5) * this.shakeTimer * 20;
            this.shakeTimer -= dt;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
        }

        this.frameCount++;
        this.time += dt;
        
        if (this.frameCount % 30 === 0) {
            this.callbacks.onTimeChange(Math.floor(this.time));
        }

        // XP buff expiry check — drops the +50% multiplier mid-run if it ran out.
        // Ticks once per second (frame % 60) so we don't recompute every frame.
        if (this.xpBuffExpiry && this.frameCount % 60 === 0) {
            const stillActive = this.xpBuffExpiry > Date.now();
            if (this.player.xpBuffActive !== stillActive) {
                this.player.xpBuffActive = stillActive;
                this.player.xpMult = this._xpMultBase * (stillActive ? 1.5 : 1.0);
            }
        }

        // Endless gold: time-based accrual only. Enemy/boss drops are suppressed
        // (see EnemySpawner / EnemyAI). 10 gold/sec base × player.goldMult so
        // character/talent/VIP multipliers still feel meaningful. Accumulator
        // tracks fractional gold across frames so low rates accrue smoothly.
        if (this.arena.duration === Infinity) {
            this._endlessGoldAccum = (this._endlessGoldAccum || 0) + (10 * this.player.goldMult * dt);
            if (this._endlessGoldAccum >= 1) {
                const inc = Math.floor(this._endlessGoldAccum);
                this._endlessGoldAccum -= inc;
                this.gold += inc;
                this.callbacks.onGoldChange(this.gold);
            }
        }

        // Periodic safety snapshot — protects against Android tab kills mid-run.
        // Every ~10s for endless/world-boss arenas, dump current stats to localStorage.
        // If the tab dies before gameOver(), next launch picks this up and queues it
        // as a normal saveScore. ~6 writes/min — negligible storage churn.
        if (this.frameCount % 600 === 0 && (this.arena.duration === Infinity || this.arena.id === 'world_boss_arena')) {
            try {
                import('@/lib/runSnapshot').then(m => m.writeRunSnapshot(this._runStats()));
            } catch {}
        }

        // Cloud checkpoint — every ~2 min during endless/raid runs, push current
        // stats to PlayerSave.pendingRunSnapshot so a tab kill / device wipe / cache
        // clear / 25-min endless that loses session can still recover the run on
        // next launch (flushPendingScores promotes the cloud snapshot into the
        // saveScore queue). Safe because: syncSave treats pendingRunSnapshot as
        // server-owned (client cannot re-upload a stale snapshot), and saveScore
        // clears the field as soon as it credits a recovered run. Only fires
        // after the run has meaningful progress (≥30s, ≥5 kills) so a tester
        // alt-tabbing in the first few seconds doesn't spam writes.
        if (this.frameCount % 7200 === 0
            && (this.arena.duration === Infinity || this.arena.id === 'world_boss_arena')
            && (this.kills || 0) >= 5
            && (this.time || 0) >= 30) {
            try {
                import('@/api/base44Client').then(({ base44 }) => {
                    base44.functions.invoke('checkpointRun', { stats: this._runStats() })
                        .catch(err => console.warn('[checkpointRun]', err?.message));
                });
            } catch {}
        }

        // Victory triggers:
        //  • Sectors: as soon as the boss is defeated (after a brief 3s grace for VFX
        //    and the loot recap text). Killing the boss ENDS the level — mobs no
        //    longer spawn during the grace (see EnemySpawner). The arena timer is
        //    only a fallback in case the player somehow runs out the clock without
        //    the boss spawning (shouldn't happen but defensive).
        //  • Endless / world boss arena: never trigger from this branch (duration is
        //    Infinity for endless, and world boss is its own thing).
        const inPostBossGrace = this.postBossGraceUntil && this.time < this.postBossGraceUntil;
        const sectorBossDone = this.sectorBossDefeated && !inPostBossGrace;
        const timerExpired = this.time >= this.arena.duration && !this.isBossActive && !inPostBossGrace;
        if ((sectorBossDone || timerExpired) && !this.isGameOver && !this.isVictory) {
            this.victory();
            return;
        }

        // Regen
        if (this.player.regen > 0 && this.frameCount % 60 === 0) {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.regen);
            this.callbacks.onHpChange(this.player.hp, this.player.maxHp);
        }

        // Endless XP trickle — after 5 minutes, gain a small passive XP stream so
        // levelling isn't entirely boss-gated. Scales with the current XP requirement
        // (~one level every ~3 minutes of pure idling, faster with kills).
        // S6+ Fix B: trickle uses the no-buff baseline (skips the 1.5× session buff)
        // AND halts past level 50 so 90-min endless AFK can't spam Overcharge picks
        // forever. The buff still applies normally to kill XP — only the passive
        // trickle is excluded. S5 keeps the legacy behaviour.
        if (this.arena.duration === Infinity && this.time > 300) {
            if (this._isS6 && this.level >= 50) {
                // skip — endless AFK ceiling
            } else {
                const trickleMult = this._isS6 ? (this._xpMultBase || this.player.xpMult) : this.player.xpMult;
                const trickle = (this.xpRequired / 180) * dt * trickleMult;
                this.xp += trickle;
            }
        }

        // Movement input
        let dx = 0, dy = 0;
        if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
        if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
        if (this.keys['d'] || this.keys['arrowright']) dx += 1;
        
        let usingGamepad = false;
        // Skip the (relatively expensive) getGamepads() call entirely when no
        // gamepad has ever been connected this session. GamepadManager flips
        // window.__gamepadConnected on the gamepadconnected event.
        if (typeof navigator !== 'undefined' && navigator.getGamepads && window.__gamepadConnected) {
            const gamepads = navigator.getGamepads();
            for (let i = 0; i < gamepads.length; i++) {
                const gp = gamepads[i];
                if (gp && gp.connected) {
                    const axeX = gp.axes[0] || 0;
                    const axeY = gp.axes[1] || 0;
                    const deadzone = 0.15;
                    
                    if (Math.abs(axeX) > deadzone || Math.abs(axeY) > deadzone) {
                        dx = axeX;
                        dy = axeY;
                        usingGamepad = true;
                    }
                    
                    if (gp.buttons[12] && gp.buttons[12].pressed) { dy = -1; usingGamepad = true; }
                    if (gp.buttons[13] && gp.buttons[13].pressed) { dy = 1; usingGamepad = true; }
                    if (gp.buttons[14] && gp.buttons[14].pressed) { dx = -1; usingGamepad = true; }
                    if (gp.buttons[15] && gp.buttons[15].pressed) { dx = 1; usingGamepad = true; }
                    
                    if (usingGamepad) break;
                }
            }
        }
        
        if (this.joystick.x !== 0 || this.joystick.y !== 0) {
            dx = this.joystick.x;
            dy = this.joystick.y;
        } else if (usingGamepad) {
            const len = Math.sqrt(dx*dx + dy*dy);
            if (len > 1) {
                dx /= len; dy /= len;
            }
        } else if (dx !== 0 && dy !== 0) {
            const len = Math.sqrt(dx*dx + dy*dy);
            dx /= len; dy /= len;
        }
        
        let moveMultiplier = 1.0;
        if (this.characterId === 'dataphantom' && this.player.phantomBoostTimer > 0) moveMultiplier = 1.5;

        const actualSpeed = this.player.speed * this.player.speedMult * 60 * dt * moveMultiplier;
        this.player.x += dx * actualSpeed;
        this.player.y += dy * actualSpeed;

        this.player.isMoving = (dx !== 0 || dy !== 0);
        if (dx < 0) this.player.facingLeft = true;
        else if (dx > 0) this.player.facingLeft = false;
        
        if (this.player.isMoving) {
            this.player.moveTimer = (this.player.moveTimer || 0) + dt * 15;
        } else {
            this.player.moveTimer = 0;
        }

        if (this.player.invincibleTimer > 0) this.player.invincibleTimer -= dt;
        if (this.player.iFrames > 0) this.player.iFrames -= dt;
        if (this.player.synAmpTimer > 0) this.player.synAmpTimer -= dt;
        if (this.player.bribeCooldown > 0) this.player.bribeCooldown -= dt;
        
        this.zoom = window.innerWidth < 768 ? 0.5 : 0.8;
        this.camera.x = this.player.x - (this.canvas.width / this.zoom) / 2;
        this.camera.y = this.player.y - (this.canvas.height / this.zoom) / 2;

        this.spawnEnemies(dt);
        this.updateWeapons(dt);
        
        if (!this.enemyPool) this.enemyPool = [];

        // Build Spatial Hash for Collision Optimization.
        // Reuse the Map + cell arrays across frames to avoid GC churn — at 200+
        // enemies × 60fps the previous "new Map() + fresh arrays" approach was
        // ~12k allocations/sec and a real source of stutter in long endless runs.
        if (!this.spatialHash) this.spatialHash = new Map();
        // Clear cell arrays in place; keep the Map keys for reuse next frame.
        for (const arr of this.spatialHash.values()) arr.length = 0;
        // Cache active bosses once per frame so projectile code doesn't re-filter
        // engine.enemies for every single bullet (was O(projectiles × enemies)).
        this._activeBosses = [];
        const cellSize = 100;
        for (let i = 0; i < this.enemies.length; i++) {
            const e = this.enemies[i];
            if (e.hp <= 0) continue;
            if (e.isBoss) this._activeBosses.push(e);
            const cx = Math.floor(e.x / cellSize);
            const cy = Math.floor(e.y / cellSize);
            const key = `${cx},${cy}`;
            let cell = this.spatialHash.get(key);
            if (!cell) { cell = []; this.spatialHash.set(key, cell); }
            cell.push(e);
        }

        this.updateProjectiles(dt);
        this.updateEnemies(dt);
        this.updatePickups(dt);
        this.updateHazards(dt);
        updateSquadClones(this, dt);

        updateCharacterMechanics(this, dt, dx, dy);

        if (this.xp >= this.xpRequired && !this.isPaused && !this.isGameOver && !this.isVictory) {
            this.levelUp();
        }

        // Squad Meteor — kick off the 10-stack starter level-ups on the first
        // unpaused tick. XP is intentionally NOT used here (raid uses XP and
        // gets overshoot with stacked XP buffs — Texxy explicitly wants Lv.10
        // exactly). Subsequent picks chain via applyUpgrade → levelUp().
        if (this.pendingStarterLevelUps > 0 && !this._starterStackBegan && !this.isPaused) {
            this._starterStackBegan = true;
            this.levelUp();
        }
        
        // In-run character pickup spawning was the OLD unlock method — disabled
        // since unlocks are now exclusively server-granted at kill milestones via saveScore.
        // Keeping `this.characterPickup` null guarantees the pickup never spawns or grants.

        // Particles & Text
        this.particleManager.update(dt);
        
        this.damageTexts = this.damageTexts.filter(t => {
            t.life -= dt;
            t.y -= 20 * dt;
            return t.life > 0;
        });

        // Environmental Effects Update
        const vWidth = this.canvas.width / this.zoom;
        const vHeight = this.canvas.height / this.zoom;
        
        if (this.envEffect === 'neon_rain' && Math.random() < 0.5) {
            this.envParticles.push({ x: this.player.x + (Math.random() * vWidth * 1.5 - vWidth * 0.75), y: this.player.y - vHeight/2 - 50, vx: 100, vy: 600 + Math.random() * 300, life: 2, color: Math.random() > 0.5 ? '#00ffff' : '#ff00ff', length: 20 + Math.random() * 20 });
        } else if (this.envEffect === 'fog' && Math.random() < 0.05) {
            this.envParticles.push({ x: this.player.x + (Math.random() * vWidth * 2 - vWidth), y: this.player.y + (Math.random() * vHeight * 2 - vHeight), vx: 20 + Math.random() * 30, vy: 10 + Math.random() * 20, life: 10, size: 200 + Math.random() * 300 });
        } else if (this.envEffect === 'solar_flare') {
            if (Math.random() < 0.05) {
                this.envParticles.push({ type: 'flare', x: this.player.x + (Math.random() * vWidth * 1.5 - vWidth * 0.75), y: this.player.y + (Math.random() * vHeight * 1.5 - vHeight * 0.75), life: 2.0, maxLife: 2.0, size: 100 + Math.random() * 200, angle: Math.random() * Math.PI * 2 });
            }
            if (Math.random() < 0.3) {
                this.envParticles.push({ type: 'ember', x: this.player.x + (Math.random() * vWidth * 1.5 - vWidth * 0.75), y: this.player.y + vHeight / 2 + 50, vx: (Math.random() - 0.5) * 200, vy: -200 - Math.random() * 200, life: 3.0, maxLife: 3.0, size: 2 + Math.random() * 3 });
            }
        }

        this.envParticles = this.envParticles.filter(p => {
            p.life -= dt;
            if (p.vx) p.x += p.vx * dt;
            if (p.vy) p.y += p.vy * dt;
            return p.life > 0;
        });
    }

    spawnEnemies(dt) { spawnEnemiesLogic(this, dt); }
    updateProjectiles(dt) { updateProjectilesLogic(this, dt); }
    updateEnemies(dt) { updateEnemiesLogic(this, dt); }
    updatePickups(dt) { updatePickupsLogic(this, dt); }
    levelUp() { levelUpLogic(this); }
    rerollChoices() {
        // Defensive — guarantee the engine stays paused while the new choices
        // are rendered. Without this, any path that briefly flipped isPaused
        // (e.g. a confirmation modal closing) would let mobs deal a killing
        // blow to a player who's mid-reroll, triggering the revive modal
        // ON TOP of the still-open LevelUpModal (Tijckers bug 2026-05-14).
        this.isPaused = true;
        this._levelUpPending = true;
        this.callbacks.onLevelUp(generateChoicesLogic(this));
    }
    generateChoices() { return generateChoicesLogic(this); }
    applyUpgrade(upgrade) { applyUpgradeLogic(this, upgrade); }
    checkSynergies() { checkSynergiesLogic(this); }
    checkEvolutions() { checkEvolutionsLogic(this); }

    updateHazards(dt) {
        if (this.difficulty.hazardChance > 0 && Math.random() < this.difficulty.hazardChance * dt) {
            const hx = this.player.x + (Math.random() * 600 - 300);
            const hy = this.player.y + (Math.random() * 600 - 300);
            this.hazards.push({
                x: hx, y: hy,
                radius: 60,
                damage: 30 * this.difficulty.enemyDmgMult,
                timer: 2.0,
                active: false
            });
        }

        this.hazards = this.hazards.filter(h => {
            h.timer -= dt;
            if (h.timer <= 0 && !h.active) {
                h.active = true;
                h.timer = 0.5;
                if (Math.hypot(this.player.x - h.x, this.player.y - h.y) < this.player.radius + h.radius) {
                    this.takeDamage(h.damage, 'Cosmic Hazard');
                }
                this.addParticle(h.x, h.y, '#ff4500', 20);
            }
            return h.timer > 0;
        });
    }

    updateWeapons(dt) {
        // Tier-7 NeoByte mastery: banner buff +50% stronger (1.3x → 1.45x cooldown speed)
        const bannerBuffMult = this.masteryAbilityBoost?.banner?.buffMult || 1.0;
        const bannerCdBoost = 1.0 + (0.3 * bannerBuffMult);
        const timeMultiplier = (this.characterId === 'neobyte' && this.player.bannerBuff) ? bannerCdBoost : 1.0;
        this.player.weapons.forEach(w => {
            w.timer -= dt * timeMultiplier;
            if (w.timer <= 0) {
                this.fireWeapon(w);
                
                const stats = getWeaponStatsAndMastery(this.save, w.id);
                const cdMultiplier = stats.cdMult;
                
                w.timer = (w.baseCooldown / 60) * Math.max(0.35, this.player.cooldownMult) * Math.max(0.5, cdMultiplier);
            }
        });
    }

    fireWeapon(w) {
        fireWeaponLogic(this, w);
    }

    damageEnemy(enemy, amount, projectile = null) {
        let damageMult = 1.0;
        let isFullyMastered = false;

        if (this.characterId === 'neobyte' && this.player.bannerBuff) {
            // Tier-7 NeoByte mastery: banner damage buff +50% stronger (1.3x → 1.45x)
            const bannerBuffMult = this.masteryAbilityBoost?.banner?.buffMult || 1.0;
            damageMult *= 1.0 + (0.3 * bannerBuffMult);
        }
        if (this.player.charAugments?.includes('neo_surge') && this.time <= 30) {
            damageMult *= 1.25;
        }
        
        if (enemy && enemy.id) {
            const pastKills = this.save?.enemyKills?.[enemy.id] || 0;
            
            let milestones = [
                { kills: 200, bonus: 2 },
                { kills: 500, bonus: 4 },
                { kills: 1000, bonus: 6 },
                { kills: 1500, bonus: 8 },
                { kills: 2000, bonus: 10 }
            ];
            
            if (enemy.isBoss) {
                milestones = [
                    { kills: 5, bonus: 2 }, { kills: 15, bonus: 4 }, { kills: 25, bonus: 6 },
                    { kills: 35, bonus: 8 }, { kills: 50, bonus: 10 }
                ];
            } else if (enemy.tier >= 9) {
                milestones = [
                    { kills: 50, bonus: 2 }, { kills: 125, bonus: 4 }, { kills: 250, bonus: 6 },
                    { kills: 375, bonus: 8 }, { kills: 500, bonus: 10 }
                ];
            } else if (enemy.tier >= 5) {
                milestones = [
                    { kills: 100, bonus: 2 }, { kills: 250, bonus: 4 }, { kills: 500, bonus: 6 },
                    { kills: 750, bonus: 8 }, { kills: 1000, bonus: 10 }
                ];
            }

            let achievedBonus = 0;
            for (let i = milestones.length - 1; i >= 0; i--) {
                if (pastKills >= milestones[i].kills) {
                    achievedBonus = milestones[i].bonus;
                    break;
                }
            }
            damageMult += (achievedBonus / 100);
            isFullyMastered = pastKills >= milestones[milestones.length - 1].kills;
        }

        let finalDamage = amount * damageMult;
        let isCrit = false;
        let isWeakHit = false;

        // Check boss weak side
        if (enemy.isBoss && enemy.weakSide && projectile) {
            const bossForwardAngle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
            const hitAngle = Math.atan2(-projectile.vy, -projectile.vx);
            let diff = Math.abs(hitAngle - bossForwardAngle);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;

            if (enemy.weakSide === 'back' && diff < Math.PI * 0.35) {
                isWeakHit = true;
            } else if (enemy.weakSide === 'side' && diff > Math.PI * 0.3 && diff < Math.PI * 0.7) {
                isWeakHit = true;
            }

            if (isWeakHit) {
                finalDamage *= 2.0;
            }
        }

        const critChance = 0.05 + (this.player.luck * 0.02) + (this.player.critBonus || 0);
        if (Math.random() < critChance) {
            isCrit = true;
            finalDamage *= 1.5;
        }
        
        enemy.hp -= finalDamage;
        this.totalDamageDealt += finalDamage;

        // Push into rolling DPS window (used by HUD).
        if (this.dpsWindow) {
            this.dpsWindow.push({ t: this.time, dmg: finalDamage });
        }

        // Credit damage to source weapon (if any) and remember last hitter for kill credit.
        // If the caller didn't tag this hit, bucket it under 'untaggedAoE' so it
        // shows up as a clear named row in RunStatsBox instead of silently bloating
        // "Other" (Anubis bug 2026-05-17 — 81% in Other on an AoE-stack run).
        // Dev-only one-shot console.warn helps hunt down the source on next run.
        const sourceId = projectile?.weaponId || 'untaggedAoE';
        this.weaponDamage[sourceId] = (this.weaponDamage[sourceId] || 0) + finalDamage;
        if (projectile?.weaponId) {
            enemy._lastWeaponId = sourceId;
        } else if (!this._warnedUntaggedTypes) {
            this._warnedUntaggedTypes = new Set();
        }
        if (!projectile?.weaponId && this._warnedUntaggedTypes) {
            const tag = projectile?.type || 'no-projectile';
            if (!this._warnedUntaggedTypes.has(tag)) {
                this._warnedUntaggedTypes.add(tag);
                console.warn('[Untagged damage source]', tag, projectile);
            }
        }

        // Don't let local damage "kill" the world boss — the server handles
        // boss level-ups when this run's total damage is submitted. Clamp at 1 HP
        // so the visual bar can drain to nearly empty without ending the run early.
        if (enemy.isWorldBoss && enemy.hp < 1) enemy.hp = 1;
        
        if (this.player.charAugments?.includes('glt_corrupt') && Math.random() < 0.15 && !enemy.isBoss) {
            enemy.hacked = true;
            enemy.color = '#39FF14';
        }

        const executeThreshold = this.masteryAbilityBoost?.executeThreshold ?? 0.2;
        // Execute exempts bosses, elites, and tier-7+ enemies — high-tier enemies have
        // inflated HP pools that NeonVortex was vaporising at 20% HP, causing runaway
        // snowballing in late sectors and endless. (Balance pass 2026-05-02 — leaderboard
        // showed NeonVortex dominating top 30 scores.)
        if (this.characterId === 'neonvortex' && !enemy.isBoss && !enemy.isElite && (enemy.tier || 0) < 7 && enemy.hp > 0 && enemy.hp <= enemy.maxHp * executeThreshold) {
            enemy.hp = 0;
            this.addDamageText(enemy.x, enemy.y - 20, "EXECUTED", '#7A00FF');
            for(let i=0; i<3; i++) {
                const angle = (Math.PI * 2 / 3) * i + Math.random();
                this.projectiles.push({
                    x: enemy.x, y: enemy.y,
                    vx: Math.cos(angle) * 800,
                    vy: Math.sin(angle) * 800,
                    radius: 8,
                    damage: this.player.damageMult * 30,
                    pierce: 3,
                    life: 2,
                    color: '#7A00FF',
                    type: 'railgun',
                    // Credit NeonVortex execute splash to neonExecute so it appears in
                    // the post-run weapon breakdown (Texxy bug 2026-05-15).
                    weaponId: 'neonExecute'
                });
            }
        }

        if (enemy.isWorldBoss) {
            // Route damage to the right bucket: meteor target → runMeteorDamage,
            // actual world boss → worldBossDamage. Both reuse the world-boss render
            // pipeline (clamped HP, floating damage-buffer text) but count separately.
            if (enemy._isMeteorTarget) {
                this.runMeteorDamage = (this.runMeteorDamage || 0) + finalDamage;
            } else {
                this.worldBossDamage += finalDamage;
            }

            enemy.damageBuffer = (enemy.damageBuffer || 0) + finalDamage;
            if (isCrit) enemy.hadCritInBuffer = true;
            if (isWeakHit) enemy.hadWeakInBuffer = true;
            
            if (!enemy.lastDamageTextTime) enemy.lastDamageTextTime = this.time;
            
            if (this.time - enemy.lastDamageTextTime >= 0.25) {
                let color = enemy.hadCritInBuffer ? '#ff4444' : '#ffffff';
                if (enemy.hadWeakInBuffer) {
                    color = '#ffdd00';
                    this.addDamageText(enemy.x, enemy.y - 30, 'WEAK SPOT!', '#ffdd00', false);
                }
                this.addDamageText(enemy.x, enemy.y - 10, Math.floor(enemy.damageBuffer), color, enemy.hadCritInBuffer);
                enemy.damageBuffer = 0;
                enemy.hadCritInBuffer = false;
                enemy.hadWeakInBuffer = false;
                enemy.lastDamageTextTime = this.time;
            }
            if (Math.random() < 0.1) SFXManager.playEnemyHit();
            return;
        }

        let color = isCrit ? '#ff4444' : (isFullyMastered ? '#ff00ff' : '#ffffff');
        if (enemy.isBoss) {
            if (isWeakHit) {
                color = '#ffdd00';
                this.addDamageText(enemy.x, enemy.y - 30, 'WEAK SPOT!', '#ffdd00', false);
            }
            this.addDamageText(enemy.x, enemy.y - 10, Math.floor(finalDamage), color, isCrit);
        }
        SFXManager.playEnemyHit();
    }

    shake(amount) {
        this.shakeTimer = Math.max(this.shakeTimer, amount);
    }

    // Rolling 10s DPS — averages only the most recent damage so the HUD reflects
    // upgrades immediately (vs. dividing total run damage by total run time, which
    // makes late-run buffs invisible).
    getRollingDps() {
        if (!this.dpsWindow || this.dpsWindow.length === 0) return 0;
        const cutoff = this.time - this.DPS_WINDOW;
        // Drop expired entries (cheap — array stays bounded by recent damage rate).
        while (this.dpsWindow.length && this.dpsWindow[0].t < cutoff) {
            this.dpsWindow.shift();
        }
        if (this.dpsWindow.length === 0) return 0;
        let sum = 0;
        for (let i = 0; i < this.dpsWindow.length; i++) sum += this.dpsWindow[i].dmg;
        // Use elapsed window length (clamped to actual observed span) to keep early-run DPS sane.
        const span = Math.max(1, Math.min(this.DPS_WINDOW, this.time));
        return sum / span;
    }

    addParticle(x, y, color, count, type = 'spark', sizeMult = 1) {
        this.particleManager.addParticle(x, y, color, count, type, sizeMult);
    }

    addDamageText(x, y, text, color, isCrit = false) {
        if (this.damageTexts.length > 40 && !isCrit && text !== 'WEAK SPOT!') return;
        const offsetX = (Math.random() - 0.5) * 20;
        this.damageTexts.push({ x: x + offsetX, y, text, color, life: 0.8, isCrit });
        if (this.damageTexts.length > 60) this.damageTexts.shift();
    }

    banishUpgrade(upgradeId) {
        if (!this.banishedUpgrades) this.banishedUpgrades = new Set();
        this.banishedUpgrades.add(upgradeId);
    }

    _runStats(extra = {}) {
        return {
            time: Math.floor(this.time), level: this.level, kills: this.kills, gold: this.gold,
            characterId: this.characterId, arenaId: this.arena?.id,
            encountered: Array.from(this.encounteredEnemies), enemyKills: this.enemyKills,
            worldBossDamage: this.worldBossDamage || 0,
            meteorDamage: Math.floor(this.runMeteorDamage || 0),
            totalDamageDealt: Math.floor(this.totalDamageDealt || 0),
            bossesKilled: this.bossesKilled || 0, elitesKilled: this.elitesKilled || 0,
            weaponDamage: this.weaponDamage || {},
            weaponKills: this.weaponKills || {},
            killedBy: this._lastDamageSource || null,
            fragments: this.runFragments || 0,
            ...extra
        };
    }
    gameOver() {
        this.isGameOver = true;
        if (this.save) { this.save.enemyKills = this.enemyKills; SaveManager.save(this.save); }
        SFXManager.playGameOver();
        // DO NOT clear the safety snapshot here — if the player navigates away
        // before saveScore returns (back button, force-close, lock screen), the
        // request is cancelled and the run would be lost. The snapshot is the
        // recovery net, so we keep it until saveScore CONFIRMS success in Game.jsx
        // (which clears it via clearRunSnapshot()). saveScore's dup-check (last
        // 2 minutes) prevents double-crediting if a hot-reload re-queues it.
        this.callbacks.onGameOver(this._runStats());
    }
    victory() {
        this.isVictory = true;
        SFXManager.playVictory();
        // Same as gameOver — keep snapshot until saveScore confirms success.
        // Strip killedBy on victory — the player WON, so showing "killed by X" in
        // the victory modal is misleading. Belt-and-braces: VictoryModal already
        // passes hideKilledBy, but this guarantees no UI path can leak it.
        this.callbacks.onVictory(this._runStats({ arenaId: this.arena.id, killedBy: null }));
    }

    draw() {
        renderGame.call(this);
    }
}