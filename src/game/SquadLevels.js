// Squad leveling system
// XP is awarded based on weekly kills contributed

export const SQUAD_LEVELS = [
  { level: 1,  xpRequired: 0,      name: 'Recruits',    badge: '🦥', borderColor: '#64748b', glowColor: 'rgba(100,116,139,0.4)' },
  { level: 2,  xpRequired: 5000,   name: 'Drifters',    badge: '⭐', borderColor: '#3b82f6', glowColor: 'rgba(59,130,246,0.4)' },
  { level: 3,  xpRequired: 15000,  name: 'Hunters',     badge: '🔥', borderColor: '#10b981', glowColor: 'rgba(16,185,129,0.4)' },
  { level: 4,  xpRequired: 35000,  name: 'Vanguards',   badge: '⚡', borderColor: '#f59e0b', glowColor: 'rgba(245,158,11,0.5)' },
  { level: 5,  xpRequired: 75000,  name: 'Reapers',     badge: '💀', borderColor: '#ef4444', glowColor: 'rgba(239,68,68,0.5)' },
  { level: 6,  xpRequired: 150000, name: 'Legends',     badge: '👑', borderColor: '#a855f7', glowColor: 'rgba(168,85,247,0.6)' },
  { level: 7,  xpRequired: 300000, name: 'Cosmic Elite', badge: '🌌', borderColor: '#ec4899', glowColor: 'rgba(236,72,153,0.7)' },
];

export const MAX_SQUAD_LEVEL = SQUAD_LEVELS.length;

export function getSquadLevel(xp = 0) {
  let current = SQUAD_LEVELS[0];
  for (const lvl of SQUAD_LEVELS) {
    if (xp >= lvl.xpRequired) current = lvl;
    else break;
  }
  return current;
}

export function getNextSquadLevel(xp = 0) {
  const currentLevel = getSquadLevel(xp);
  return SQUAD_LEVELS.find(l => l.level === currentLevel.level + 1) || null;
}

export function getSquadXpProgress(xp = 0) {
  const current = getSquadLevel(xp);
  const next = getNextSquadLevel(xp);
  if (!next) return 100; // Max level
  const progressXp = xp - current.xpRequired;
  const neededXp = next.xpRequired - current.xpRequired;
  return Math.min(100, (progressXp / neededXp) * 100);
}

// XP awarded = kills contributed this week (1 kill = 1 XP)
export function calculateXpFromKills(kills) {
  return kills;
}