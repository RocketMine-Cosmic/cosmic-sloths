// Centralised registry of player titles. Each entry defines:
//   id          — stored on user.data.player_title
//   label       — display text
//   tier        — rarity bucket; controls badge colour everywhere titles render
//   describe(s) — function returning a "how to earn" string given player stats
//   isUnlocked(s) — function returning whether the player meets the requirement
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

export const PLAYER_TITLES = [
    // ---- Starter ----
    { id: 'Novice Pilot', label: 'Novice Pilot', tier: 'starter',
      describe: () => 'Awarded to every pilot — your starter title.',
      isUnlocked: () => true },

    // ---- Survival (time alive in a single run) ----
    { id: 'Survivor', label: 'Survivor', tier: 'common',
      describe: () => 'Survive 3 minutes in a single run.',
      isUnlocked: (s) => s.maxTimeSurvived >= 180 },
    { id: 'Veteran', label: 'Veteran', tier: 'common',
      describe: () => 'Survive 4 minutes in a single run.',
      isUnlocked: (s) => s.maxTimeSurvived >= 240 },
    { id: 'Master', label: 'Master', tier: 'uncommon',
      describe: () => 'Survive 5 minutes in a single run.',
      isUnlocked: (s) => s.maxTimeSurvived >= 300 },
    { id: 'Time Lord', label: 'Time Lord', tier: 'rare',
      describe: () => 'Survive 7 minutes in a single run.',
      isUnlocked: (s) => s.maxTimeSurvived >= 420 },
    { id: 'Eternal', label: 'Eternal', tier: 'epic',
      describe: () => 'Survive 8 minutes in a single run.',
      isUnlocked: (s) => s.maxTimeSurvived >= 480 },
    { id: 'Immortal Sloth', label: 'Immortal Sloth', tier: 'legendary',
      describe: () => 'Survive 10 minutes in a single run.',
      isUnlocked: (s) => s.maxTimeSurvived >= 600 },

    // ---- Combat (lifetime kills) ----
    { id: 'First Blood', label: 'First Blood', tier: 'starter',
      describe: () => 'Defeat 100 enemies (lifetime).',
      isUnlocked: (s) => s.totalKills >= 100 },
    { id: 'Vanguard', label: 'Vanguard', tier: 'common',
      describe: () => 'Defeat 1,000 enemies (lifetime).',
      isUnlocked: (s) => s.totalKills >= 1000 },
    { id: 'Exterminator', label: 'Exterminator', tier: 'uncommon',
      describe: () => 'Defeat 1,000 enemies (lifetime).',
      isUnlocked: (s) => s.totalKills >= 1000 },
    { id: 'Void Walker', label: 'Void Walker', tier: 'rare',
      describe: () => 'Defeat 10,000 enemies (lifetime).',
      isUnlocked: (s) => s.totalKills >= 10000 },
    { id: 'Cosmic Destroyer', label: 'Cosmic Destroyer', tier: 'rare',
      describe: () => 'Defeat 10,000 enemies (lifetime).',
      isUnlocked: (s) => s.totalKills >= 10000 },
    { id: 'Genocidal Sloth', label: 'Genocidal Sloth', tier: 'epic',
      describe: () => 'Defeat 50,000 enemies (lifetime).',
      isUnlocked: (s) => s.totalKills >= 50000 },
    { id: 'Sloth God', label: 'Sloth God', tier: 'legendary',
      describe: () => 'Defeat 100,000 enemies (lifetime).',
      isUnlocked: (s) => s.totalKills >= 100000 },
    { id: 'Bringer of Extinction', label: 'Bringer of Extinction', tier: 'mythic',
      describe: () => 'Defeat 250,000 enemies (lifetime).',
      isUnlocked: (s) => s.totalKills >= 250000 },

    // ---- Bosses & Raid ----
    { id: 'Leviathan Slayer', label: 'Leviathan Slayer', tier: 'uncommon',
      describe: () => 'Defeat your first Leviathan boss.',
      isUnlocked: (s) => s.leviathanKills >= 1 },
    { id: 'Apex Predator', label: 'Apex Predator', tier: 'epic',
      describe: () => 'Defeat 10 Leviathan bosses.',
      isUnlocked: (s) => s.leviathanKills >= 10 },
    { id: 'Raid Trooper', label: 'Raid Trooper', tier: 'rare',
      describe: () => 'Deal 10,000 damage to a Global Raid boss.',
      isUnlocked: (s) => s.globalRaidDamage >= 10000 },
    { id: 'World Eater Bane', label: 'World Eater Bane', tier: 'mythic',
      describe: () => 'Deal 500,000 damage to a Global Raid boss.',
      isUnlocked: (s) => s.globalRaidDamage >= 500000 },

    // ---- Score ----
    { id: 'Top Survivor', label: 'Top Survivor', tier: 'rare',
      describe: () => 'Reach 50,000 score in a single run.',
      isUnlocked: (s) => s.bestScore >= 50000 },
    { id: 'Cosmic Legend', label: 'Cosmic Legend', tier: 'legendary',
      describe: () => 'Reach 100,000 score in a single run.',
      isUnlocked: (s) => s.bestScore >= 100000 },

    // ---- Wealth ----
    { id: 'Pocket Change', label: 'Pocket Change', tier: 'starter',
      describe: () => 'Earn 10,000 gold (lifetime).',
      isUnlocked: (s) => s.totalGoldEarned >= 10000 },
    { id: 'Gold Hoarder', label: 'Gold Hoarder', tier: 'uncommon',
      describe: () => 'Hold 10,000 gold OR earn 100,000 gold lifetime.',
      isUnlocked: (s) => (s.gold >= 10000 || s.totalGoldEarned >= 100000) },
    { id: 'Filthy Rich', label: 'Filthy Rich', tier: 'rare',
      describe: () => 'Earn 100,000 gold (lifetime).',
      isUnlocked: (s) => s.totalGoldEarned >= 100000 },
    { id: 'Billionaire', label: 'Billionaire', tier: 'epic',
      describe: () => 'Earn 1,000,000 gold (lifetime).',
      isUnlocked: (s) => s.totalGoldEarned >= 1000000 },
    { id: 'Sloth of Wall Street', label: 'Sloth of Wall Street', tier: 'legendary',
      describe: () => 'Earn 5,000,000 gold (lifetime).',
      isUnlocked: (s) => s.totalGoldEarned >= 5000000 },

    // ---- Progression (max level reached) ----
    { id: 'Power Up', label: 'Power Up', tier: 'common',
      describe: () => 'Reach level 10 in a single run.',
      isUnlocked: (s) => s.maxLevelReached >= 10 },
    { id: 'Ascendant', label: 'Ascendant', tier: 'uncommon',
      describe: () => 'Reach level 20 in a single run.',
      isUnlocked: (s) => s.maxLevelReached >= 20 },
    { id: 'Ascended', label: 'Ascended', tier: 'uncommon',
      describe: () => 'Reach level 20 in a single run.',
      isUnlocked: (s) => s.maxLevelReached >= 20 },
    { id: 'Beyond Limits', label: 'Beyond Limits', tier: 'rare',
      describe: () => 'Reach level 30 in a single run.',
      isUnlocked: (s) => s.maxLevelReached >= 30 },
    { id: 'God Tier', label: 'God Tier', tier: 'epic',
      describe: () => 'Reach level 40 in a single run.',
      isUnlocked: (s) => s.maxLevelReached >= 40 },
    { id: 'Maximum Overdrive', label: 'Maximum Overdrive', tier: 'mythic',
      describe: () => 'Reach level 50 in a single run.',
      isUnlocked: (s) => s.maxLevelReached >= 50 },

    // ---- Collection ----
    { id: 'Growing Crew', label: 'Growing Crew', tier: 'common',
      describe: () => 'Unlock 5 different characters.',
      isUnlocked: (s) => s.unlockedCharactersCount >= 5 },
    { id: 'Commander', label: 'Commander', tier: 'uncommon',
      describe: () => 'Unlock 5 different characters.',
      isUnlocked: (s) => s.unlockedCharactersCount >= 5 },
    { id: 'Completionist', label: 'Completionist', tier: 'legendary',
      describe: () => 'Unlock all 10 characters.',
      isUnlocked: (s) => s.unlockedCharactersCount >= 10 },
    { id: 'Fashionista', label: 'Fashionista', tier: 'rare',
      describe: () => 'Unlock 6 cosmetic items.',
      isUnlocked: (s) => s.totalUnlockedCosmetics >= 6 },
    { id: 'Skillful', label: 'Skillful', tier: 'rare',
      describe: () => 'Unlock 15 character talents.',
      isUnlocked: (s) => s.totalUnlockedTalents >= 15 },
    { id: 'Omniscient', label: 'Omniscient', tier: 'mythic',
      describe: () => 'Unlock 30 character talents.',
      isUnlocked: (s) => s.totalUnlockedTalents >= 30 },
];

// Look up a title's tier-styling by id. Returns starter styling for unknown ids.
export function getTitleStyle(titleId) {
    if (!titleId) return TITLE_TIERS.starter;
    const t = PLAYER_TITLES.find(x => x.id === titleId);
    return TITLE_TIERS[t?.tier] || TITLE_TIERS.starter;
}