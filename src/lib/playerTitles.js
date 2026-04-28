// Centralised registry of player titles. Each entry defines:
//   id          — stored on user.data.player_title
//   label       — display text
//   tier        — rarity bucket; controls badge colour everywhere titles render
//   describe(s) — function returning a "how to earn" string given player stats
//   isUnlocked(s) — function returning whether the player meets the requirement
//   buff (opt)  — small in-run buff applied while this title is equipped.
//                 Shape: { damageMult, hpMult, goldMult, xpMult, luck, regen }
//                 Numbers are additive multipliers/flat values consistent with
//                 GameEngine's existing stat math (e.g. damageMult: 0.02 = +2%).
//                 Most titles have NO buff (buff: null) — they're just for show.
//
// `s` is a stats bag: { totalKills, leviathanKills, bestScore, gold,
//   totalGoldEarned, maxLevelReached, maxTimeSurvived, unlockedCharactersCount,
//   totalUnlockedCosmetics, totalUnlockedTalents, globalRaidDamage }

// Tier → tailwind-class colour set used for the title badge wherever it shows.
export const TITLE_TIERS = {
    starter:    { text: 'text-slate-300',   bg: 'bg-slate-900/80',    border: 'border-slate-600/50',    label: 'Starter' },
    common:     { text: 'text-emerald-300', bg: 'bg-emerald-950/60',  border: 'border-emerald-700/50',  label: 'Common' },
    uncommon:   { text: 'text-cyan-300',    bg: 'bg-cyan-950/60',     border: 'border-cyan-700/50',     label: 'Uncommon' },
    rare:       { text: 'text-blue-300',    bg: 'bg-blue-950/60',     border: 'border-blue-700/50',     label: 'Rare' },
    epic:       { text: 'text-purple-300',  bg: 'bg-purple-950/60',   border: 'border-purple-700/50',   label: 'Epic' },
    legendary:  { text: 'text-amber-300',   bg: 'bg-amber-950/70',    border: 'border-amber-600/60',    label: 'Legendary' },
    mythic:     { text: 'text-rose-300',    bg: 'bg-rose-950/70',     border: 'border-rose-600/60',     label: 'Mythic' },
};

// Tier display order — most prestigious first
export const TIER_ORDER = ['mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common', 'starter'];

// Helper: format a buff for display in the UI
export function formatBuff(buff) {
    if (!buff) return null;
    const parts = [];
    if (buff.damageMult) parts.push(`+${Math.round(buff.damageMult * 100)}% damage`);
    if (buff.hpMult) parts.push(`+${Math.round(buff.hpMult * 100)}% HP`);
    if (buff.goldMult) parts.push(`+${Math.round(buff.goldMult * 100)}% gold`);
    if (buff.xpMult) parts.push(`+${Math.round(buff.xpMult * 100)}% XP`);
    if (buff.luck) parts.push(`+${buff.luck} luck`);
    if (buff.regen) parts.push(`+${buff.regen.toFixed(1)} HP/s regen`);
    if (buff.magnetRange) parts.push(`+${buff.magnetRange} magnet`);
    if (buff.armor) parts.push(`+${buff.armor} armor`);
    if (buff.areaMult) parts.push(`+${Math.round(buff.areaMult * 100)}% area`);
    if (buff.speedMult) parts.push(`+${Math.round(buff.speedMult * 100)}% speed`);
    if (buff.cooldownMult) parts.push(`-${Math.round(Math.abs(buff.cooldownMult) * 100)}% cooldown`);
    return parts.join(', ');
}

export const PLAYER_TITLES = [
    // ============ STARTER ============
    { id: 'Novice Pilot', label: 'Novice Pilot', tier: 'starter', buff: null,
      describe: () => 'Awarded to every pilot — your starter title.',
      isUnlocked: () => true },
    { id: 'Rookie', label: 'Rookie', tier: 'starter', buff: null,
      describe: () => 'Defeat 10 enemies (lifetime).',
      isUnlocked: (s) => s.totalKills >= 10 },
    { id: 'First Blood', label: 'First Blood', tier: 'starter', buff: null,
      describe: () => 'Defeat 100 enemies (lifetime).',
      isUnlocked: (s) => s.totalKills >= 100 },
    { id: 'Pocket Change', label: 'Pocket Change', tier: 'starter', buff: null,
      describe: () => 'Earn 10,000 gold (lifetime).',
      isUnlocked: (s) => s.totalGoldEarned >= 10000 },
    { id: 'Dabbler', label: 'Dabbler', tier: 'starter', buff: null,
      describe: () => 'Reach level 5 in a single run.',
      isUnlocked: (s) => s.maxLevelReached >= 5 },

    // ============ COMMON ============
    { id: 'Survivor', label: 'Survivor', tier: 'common', buff: { hpMult: 0.01 },
      describe: () => 'Survive 3 minutes in a single run.',
      isUnlocked: (s) => s.maxTimeSurvived >= 180 },
    { id: 'Veteran', label: 'Veteran', tier: 'common', buff: { hpMult: 0.02 },
      describe: () => 'Survive 4 minutes in a single run.',
      isUnlocked: (s) => s.maxTimeSurvived >= 240 },
    { id: 'Vanguard', label: 'Vanguard', tier: 'common', buff: { damageMult: 0.01 },
      describe: () => 'Defeat 1,000 enemies (lifetime).',
      isUnlocked: (s) => s.totalKills >= 1000 },
    { id: 'Power Up', label: 'Power Up', tier: 'common', buff: { xpMult: 0.02 },
      describe: () => 'Reach level 10 in a single run.',
      isUnlocked: (s) => s.maxLevelReached >= 10 },
    { id: 'Growing Crew', label: 'Growing Crew', tier: 'common', buff: null,
      describe: () => 'Unlock 3 different characters.',
      isUnlocked: (s) => s.unlockedCharactersCount >= 3 },
    { id: 'Coin Collector', label: 'Coin Collector', tier: 'common', buff: { goldMult: 0.02 },
      describe: () => 'Earn 25,000 gold (lifetime).',
      isUnlocked: (s) => s.totalGoldEarned >= 25000 },

    // ============ UNCOMMON ============
    { id: 'Master', label: 'Master', tier: 'uncommon', buff: { hpMult: 0.03 },
      describe: () => 'Survive 5 minutes in a single run.',
      isUnlocked: (s) => s.maxTimeSurvived >= 300 },
    { id: 'Exterminator', label: 'Exterminator', tier: 'uncommon', buff: { damageMult: 0.02 },
      describe: () => 'Defeat 5,000 enemies (lifetime).',
      isUnlocked: (s) => s.totalKills >= 5000 },
    { id: 'Leviathan Slayer', label: 'Leviathan Slayer', tier: 'uncommon', buff: { damageMult: 0.02 },
      describe: () => 'Defeat your first Leviathan boss.',
      isUnlocked: (s) => s.leviathanKills >= 1 },
    { id: 'Ascendant', label: 'Ascendant', tier: 'uncommon', buff: { xpMult: 0.03 },
      describe: () => 'Reach level 20 in a single run.',
      isUnlocked: (s) => s.maxLevelReached >= 20 },
    { id: 'Gold Hoarder', label: 'Gold Hoarder', tier: 'uncommon', buff: { goldMult: 0.03 },
      describe: () => 'Hold 10,000 gold OR earn 100,000 gold lifetime.',
      isUnlocked: (s) => (s.gold >= 10000 || s.totalGoldEarned >= 100000) },
    { id: 'Commander', label: 'Commander', tier: 'uncommon', buff: { luck: 1 },
      describe: () => 'Unlock 5 different characters.',
      isUnlocked: (s) => s.unlockedCharactersCount >= 5 },
    { id: 'Lucky Sloth', label: 'Lucky Sloth', tier: 'uncommon', buff: { luck: 1 },
      describe: () => 'Earn 50,000 gold (lifetime).',
      isUnlocked: (s) => s.totalGoldEarned >= 50000 },

    // ============ RARE ============
    { id: 'Time Lord', label: 'Time Lord', tier: 'rare', buff: { hpMult: 0.04, regen: 0.2 },
      describe: () => 'Survive 7 minutes in a single run.',
      isUnlocked: (s) => s.maxTimeSurvived >= 420 },
    { id: 'Void Walker', label: 'Void Walker', tier: 'rare', buff: { damageMult: 0.03 },
      describe: () => 'Defeat 10,000 enemies (lifetime).',
      isUnlocked: (s) => s.totalKills >= 10000 },
    { id: 'Cosmic Destroyer', label: 'Cosmic Destroyer', tier: 'rare', buff: { damageMult: 0.03, areaMult: 0.03 },
      describe: () => 'Defeat 20,000 enemies (lifetime).',
      isUnlocked: (s) => s.totalKills >= 20000 },
    { id: 'Top Survivor', label: 'Top Survivor', tier: 'rare', buff: { hpMult: 0.04 },
      describe: () => 'Reach 50,000 score in a single run.',
      isUnlocked: (s) => s.bestScore >= 50000 },
    { id: 'Filthy Rich', label: 'Filthy Rich', tier: 'rare', buff: { goldMult: 0.04 },
      describe: () => 'Earn 100,000 gold (lifetime).',
      isUnlocked: (s) => s.totalGoldEarned >= 100000 },
    { id: 'Beyond Limits', label: 'Beyond Limits', tier: 'rare', buff: { xpMult: 0.04 },
      describe: () => 'Reach level 30 in a single run.',
      isUnlocked: (s) => s.maxLevelReached >= 30 },
    { id: 'Raid Trooper', label: 'Raid Trooper', tier: 'rare', buff: { damageMult: 0.03 },
      describe: () => 'Deal 10,000 damage to a Global Raid boss.',
      isUnlocked: (s) => s.globalRaidDamage >= 10000 },
    { id: 'Fashionista', label: 'Fashionista', tier: 'rare', buff: { luck: 2 },
      describe: () => 'Unlock 6 cosmetic items.',
      isUnlocked: (s) => s.totalUnlockedCosmetics >= 6 },
    { id: 'Skillful', label: 'Skillful', tier: 'rare', buff: { cooldownMult: -0.02 },
      describe: () => 'Unlock 15 character talents.',
      isUnlocked: (s) => s.totalUnlockedTalents >= 15 },

    // ============ EPIC ============
    { id: 'Eternal', label: 'Eternal', tier: 'epic', buff: { hpMult: 0.05, regen: 0.3 },
      describe: () => 'Survive 8 minutes in a single run.',
      isUnlocked: (s) => s.maxTimeSurvived >= 480 },
    { id: 'Genocidal Sloth', label: 'Genocidal Sloth', tier: 'epic', buff: { damageMult: 0.05 },
      describe: () => 'Defeat 50,000 enemies (lifetime).',
      isUnlocked: (s) => s.totalKills >= 50000 },
    { id: 'Apex Predator', label: 'Apex Predator', tier: 'epic', buff: { damageMult: 0.04, critBonus: 0.02 },
      describe: () => 'Defeat 10 Leviathan bosses.',
      isUnlocked: (s) => s.leviathanKills >= 10 },
    { id: 'Billionaire', label: 'Billionaire', tier: 'epic', buff: { goldMult: 0.06 },
      describe: () => 'Earn 1,000,000 gold (lifetime).',
      isUnlocked: (s) => s.totalGoldEarned >= 1000000 },
    { id: 'God Tier', label: 'God Tier', tier: 'epic', buff: { xpMult: 0.05, hpMult: 0.03 },
      describe: () => 'Reach level 40 in a single run.',
      isUnlocked: (s) => s.maxLevelReached >= 40 },
    { id: 'Raid Captain', label: 'Raid Captain', tier: 'epic', buff: { damageMult: 0.04 },
      describe: () => 'Deal 100,000 damage to a Global Raid boss.',
      isUnlocked: (s) => s.globalRaidDamage >= 100000 },

    // ============ LEGENDARY ============
    { id: 'Immortal Sloth', label: 'Immortal Sloth', tier: 'legendary', buff: { hpMult: 0.07, regen: 0.5 },
      describe: () => 'Survive 10 minutes in a single run.',
      isUnlocked: (s) => s.maxTimeSurvived >= 600 },
    { id: 'Sloth God', label: 'Sloth God', tier: 'legendary', buff: { damageMult: 0.07 },
      describe: () => 'Defeat 100,000 enemies (lifetime).',
      isUnlocked: (s) => s.totalKills >= 100000 },
    { id: 'Cosmic Legend', label: 'Cosmic Legend', tier: 'legendary', buff: { damageMult: 0.05, hpMult: 0.05 },
      describe: () => 'Reach 100,000 score in a single run.',
      isUnlocked: (s) => s.bestScore >= 100000 },
    { id: 'Sloth of Wall Street', label: 'Sloth of Wall Street', tier: 'legendary', buff: { goldMult: 0.10 },
      describe: () => 'Earn 5,000,000 gold (lifetime).',
      isUnlocked: (s) => s.totalGoldEarned >= 5000000 },
    { id: 'Completionist', label: 'Completionist', tier: 'legendary', buff: { luck: 3, damageMult: 0.03 },
      describe: () => 'Unlock all 10 characters.',
      isUnlocked: (s) => s.unlockedCharactersCount >= 10 },

    // ============ MYTHIC ============
    { id: 'Maximum Overdrive', label: 'Maximum Overdrive', tier: 'mythic', buff: { damageMult: 0.05, xpMult: 0.05, hpMult: 0.05 },
      describe: () => 'Reach level 50 in a single run.',
      isUnlocked: (s) => s.maxLevelReached >= 50 },
    { id: 'Bringer of Extinction', label: 'Bringer of Extinction', tier: 'mythic', buff: { damageMult: 0.10 },
      describe: () => 'Defeat 250,000 enemies (lifetime).',
      isUnlocked: (s) => s.totalKills >= 250000 },
    { id: 'Omniscient', label: 'Omniscient', tier: 'mythic', buff: { cooldownMult: -0.05, areaMult: 0.05 },
      describe: () => 'Unlock 30 character talents.',
      isUnlocked: (s) => s.totalUnlockedTalents >= 30 },
    { id: 'World Eater Bane', label: 'World Eater Bane', tier: 'mythic', buff: { damageMult: 0.08, hpMult: 0.05 },
      describe: () => 'Deal 500,000 damage to a Global Raid boss.',
      isUnlocked: (s) => s.globalRaidDamage >= 500000 },
];

// Look up a title's tier-styling by id. Returns starter styling for unknown ids.
export function getTitleStyle(titleId) {
    if (!titleId) return TITLE_TIERS.starter;
    const t = PLAYER_TITLES.find(x => x.id === titleId);
    return TITLE_TIERS[t?.tier] || TITLE_TIERS.starter;
}

// Look up a title's buff by id. Returns null if no buff defined.
export function getTitleBuff(titleId) {
    if (!titleId) return null;
    const t = PLAYER_TITLES.find(x => x.id === titleId);
    return t?.buff || null;
}