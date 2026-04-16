export const CHARACTERS = [
  { id: 'neobyte', name: 'NeoByte', desc: 'Commander. Balanced all-rounder.', skillDesc: 'Deploys a support banner every 15s that boosts damage and cooldowns.', hp: 120, speed: 3.0, armor: 5, regen: 0.1, cost: 0, color: '#0066FF', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/beab0f249_NeoByteF.png', idleSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/11e3e66c7_NeoByteIdle.png', walkSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/34f5b1be2_NeoByteWalk.png', damageMult: 1.0, cooldownMult: 1.0, areaMult: 1.0, magnetRange: 72, luck: 0, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 1.0 },
  { id: 'pandypaws', name: 'Pandypaws', desc: 'Heavy Armor Mechanic. Tanky but slow, low damage.', skillDesc: '5% chance on kill to drop scrap that grants permanent armor.', hp: 200, speed: 2.4, armor: 8, regen: 0.5, cost: 1000, color: '#C2185B', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/82f3642e6_PandyPawsF.png', idleSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/e73a641fd_PandyPawsIdle.png', walkSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/a756cd378_PandyPawsWalk.png', damageMult: 0.8, cooldownMult: 1.2, areaMult: 1.2, magnetRange: 60, luck: 0, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 0.8 },
  { id: 'novabyte', name: 'NovaByte', desc: 'Comms & Demolitions. High area and damage, low HP.', skillDesc: '10% chance on kill to trigger a localized chain explosion.', hp: 80, speed: 3.0, armor: 3, regen: 0, cost: 2000, color: '#FF007F', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/9db3cfc07_NovaByteF.png', idleSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/f3d0b5231_NovaByteIdle.png', walkSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/169f06639_NovaByteWalk.png', damageMult: 1.3, cooldownMult: 1.1, areaMult: 1.5, magnetRange: 72, luck: 0, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 1.0 },
  { id: 'glitch', name: 'Glitch', desc: 'Stealth Assassin. Very fast, high damage, fragile.', skillDesc: '15% chance when hit to phase shift and gain invulnerability.', hp: 60, speed: 3.6, armor: 3, regen: 0, cost: 4000, color: '#FF00FF', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/2469b9070_GlitchF.png', idleSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/918b41ceb_GlitchIdle.png', walkSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/cbd3bc6c7_GlitchWalk.png', damageMult: 1.4, cooldownMult: 0.8, areaMult: 0.8, magnetRange: 48, luck: 1, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 1.2 },
  { id: 'holodrift', name: 'HoloDrift', desc: 'Engineer. High magnet range and XP gain.', skillDesc: 'Deploys a holographic decoy every 20s that taunts enemies.', hp: 100, speed: 2.9, armor: 4, regen: 0.1, cost: 6000, color: '#00FA9A', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/553fe0f67_HoloDriftF.png', idleSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/5d2346bbe_HoloDriftIdle.png', walkSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/e4b28984e_HoloDriftWalk.png', damageMult: 0.9, cooldownMult: 1.0, areaMult: 1.0, magnetRange: 144, luck: 0, goldMult: 1.0, xpMult: 1.3, projSpeedMult: 1.0 },
  { id: 'codebreaker', name: 'CodeBreaker', desc: 'Cyber Warfare Hacker. Fast cooldowns, high luck.', skillDesc: 'Hacks a nearby enemy every 10s, turning them against allies.', hp: 90, speed: 3.1, armor: 4, regen: 0, cost: 8000, color: '#39FF14', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/d7c90aaac_CodeBreakerF.png', idleSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/661140437_CodeBreakerIdle.png', walkSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/7d2de0129_CodeBreakerWalk.png', damageMult: 0.7, cooldownMult: 0.6, areaMult: 1.0, magnetRange: 72, luck: 3, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 1.0 },
  { id: 'dataphantom', name: 'DataPhantom', desc: 'Strategic Hacker. High projectile speed, good armor.', skillDesc: 'Leeches data from nearby enemies to slow them and gain speed.', hp: 110, speed: 3.0, armor: 6, regen: 0.2, cost: 10000, color: '#98FF98', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/197092c32_DataPhantomF.png', idleSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/5e5068816_DataPhantomIdle.png', walkSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/d934f203d_DataPhantomWalk.png', damageMult: 1.0, cooldownMult: 1.0, areaMult: 1.0, magnetRange: 72, luck: 0, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 1.5 },
  { id: 'neonvortex', name: 'NeonVortex', desc: 'Elite Sniper. Extreme damage, very slow cooldowns.', skillDesc: 'Executes non-boss enemies below 20% HP with railgun blasts.', hp: 50, speed: 3.2, armor: 3, regen: 0, cost: 15000, color: '#7A00FF', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/467861605_NeonVortexF.png', idleSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/95c0e7e61_NeonVortexIdle.png', walkSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/f5ec27db1_NeonVortexWalk.png', damageMult: 2.0, cooldownMult: 1.5, areaMult: 0.7, magnetRange: 72, luck: 0, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 2.0 },
  { id: 'synthbeats', name: 'SynthBeats', desc: 'Diplomat. High gold gain and luck.', skillDesc: 'Automatically bribes death with 5 gold to negate incoming damage.', hp: 100, speed: 3.0, armor: 4, regen: 0.2, cost: 20000, color: '#FFD700', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/9eb5364ba_SynthBeatsF.png', idleSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/9f87d9681_SynthBeatsIdle.png', walkSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/f3624de57_SynthBeatsWalk.png', damageMult: 0.9, cooldownMult: 1.0, areaMult: 1.0, magnetRange: 84, luck: 2, goldMult: 1.5, xpMult: 1.0, projSpeedMult: 1.0 },
  { id: 'skybyte', name: 'SkyByte', desc: 'Ace Pilot. Very fast, good damage and area.', skillDesc: 'Charges a Sonic Boom while moving; triggers upon stopping.', hp: 90, speed: 3.5, armor: 3, regen: 0, cost: 25000, color: '#00D4FF', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/3cbfa8254_SkyByteF.png', idleSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/ae36c6378_SkyByteIdle.png', walkSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/489fe3f02_SkyByteWalk.png', damageMult: 1.2, cooldownMult: 0.9, areaMult: 1.2, magnetRange: 72, luck: 0, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 1.3 }
];

export const DIFFICULTIES = [
  { id: 'easy', name: 'Easy', desc: 'Forgiving start for new pilots. -50% XP & Gold.', xpMult: 0.5, goldMult: 0.5, enemyHpMult: 0.7, enemyDmgMult: 0.6, hazardChance: 0, speedMult: 0.85 },
  { id: 'normal', name: 'Normal', desc: 'Standard cosmic experience.', xpMult: 1.0, goldMult: 1.0, enemyHpMult: 1.0, enemyDmgMult: 1.0, hazardChance: 0, speedMult: 1.0 },
  { id: 'hard', name: 'Hard', desc: 'Tougher enemies. Occasional hazards. +100% XP & Gold.', xpMult: 2.0, goldMult: 2.0, enemyHpMult: 1.5, enemyDmgMult: 1.5, hazardChance: 0.05, speedMult: 1.1 },
  { id: 'cosmic', name: 'Cosmic', desc: 'Extreme danger. Frequent hazards. +200% XP & Gold.', xpMult: 3.0, goldMult: 3.0, enemyHpMult: 2.5, enemyDmgMult: 2.5, hazardChance: 0.15, speedMult: 1.25 }
];

export const ARENAS = [
  { id: 'station', name: 'Azure Expanse', bg: '#1a1a2e', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/82c27e5c0_Map2.png', duration: 180, effect: 'neon_rain' },
  { id: 'asteroid', name: 'Mystic Cosmos', bg: '#2d1b19', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/1f6fc6cad_Map11.png', duration: 210, effect: 'fog' },
  { id: 'nebula', name: 'Ethereal Nebula', bg: '#2b103a', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/888640bf8_Map13.png', duration: 240, effect: 'fog' },
  { id: 'void', name: 'Crimson Void', bg: '#0a0a0a', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/dca64fcac_Map14.png', duration: 270, effect: 'none' },
  { id: 'plasma', name: 'Solar Storm', bg: '#3a001e', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/289f5cb1d_Map15.png', duration: 300, effect: 'solar_flare' },
  { id: 'crystal', name: 'Emerald Galaxy', bg: '#002222', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/a138bba7b_Map16.png', duration: 330, effect: 'neon_rain' },
  { id: 'moon', name: 'Shattered Core', bg: '#112233', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/ef5a7f3ec_Map17.png', duration: 360, effect: 'fog' },
  { id: 'blackhole', name: 'Abyssal Vortex', bg: '#000000', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/b29cf4702_map18.png', duration: 390, effect: 'solar_flare' },
  { id: 'mothership', name: 'Turquoise Drift', bg: '#220022', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/b7bfbd6fe_Map19.png', duration: 420, effect: 'neon_rain' },
  { id: 'dimension', name: 'Rainbow Rift', bg: '#110033', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/6f707a3e0_Map20.png', duration: 450, effect: 'solar_flare' }
];

export const WEAPONS = {
  neoBlaster: { id: 'neoBlaster', name: 'Blaster', type: 'weapon', desc: 'Fires reliable energy blasts.', masteryDesc: 'MASTERY: Fires a spread of 3 blasts.', baseDamage: 12, baseCooldown: 45, baseArea: 1 },
  napBeam: { id: 'napBeam', name: 'Cosmic Nap Beam', type: 'weapon', desc: 'Fires a piercing beam.', masteryDesc: 'MASTERY: Beam chains to nearby enemies. (Blue Beam)', baseDamage: 10, baseCooldown: 50, baseArea: 1 },
  vineWhip: { id: 'vineWhip', name: 'Plasma Whip', type: 'weapon', desc: 'Swipes nearby enemies.', masteryDesc: 'MASTERY: Heals player for 5% of damage dealt. (Red Whip)', baseDamage: 15, baseCooldown: 40, baseArea: 1 },
  slothSwarm: { id: 'slothSwarm', name: 'Orbital Drones', type: 'weapon', desc: 'Orbiting defense drones.', masteryDesc: 'MASTERY: Drones move faster and shoot lasers. (Red Drones)', baseDamage: 6, baseCooldown: 90, baseArea: 1 },
  napalm: { id: 'napalm', name: 'Zero-G Napalm', type: 'weapon', desc: 'Leaves burning pools.', masteryDesc: 'MASTERY: Blue fire that slows enemies by 50%.', baseDamage: 5, baseCooldown: 75, baseArea: 1 },
  novaPulse: { id: 'novaPulse', name: 'Nova Pulse', type: 'weapon', desc: 'A massive expanding energy blast.', masteryDesc: 'MASTERY: Triggers a second echo pulse. (Purple Blast)', baseDamage: 25, baseCooldown: 150, baseArea: 1 },
  shieldBubble: { id: 'shieldBubble', name: 'Shield Bubble', type: 'weapon', desc: 'Pushes enemies away and damages them.', masteryDesc: 'MASTERY: Fires retaliatory lasers at enemies. (Golden Shield)', baseDamage: 15, baseCooldown: 180, baseArea: 1 },
  bouncingBlade: { id: 'bouncingBlade', name: 'Ricochet Blade', type: 'weapon', desc: 'Fires a bouncing sawblade.', masteryDesc: 'MASTERY: Blades bounce more times. (Silver Blade)', baseDamage: 15, baseCooldown: 60, baseArea: 1 },
  toxicCloud: { id: 'toxicCloud', name: 'Toxic Emitter', type: 'weapon', desc: 'Leaves a lingering poison cloud.', masteryDesc: 'MASTERY: Clouds grow larger over time. (Green Cloud)', baseDamage: 8, baseCooldown: 90, baseArea: 1 },
  // Synergies
  burningBarrier: { id: 'burningBarrier', name: 'Burning Barrier', type: 'weapon', desc: 'SYNERGY: A fiery shield that burns and pushes enemies.', baseDamage: 18, baseCooldown: 150, baseArea: 1.5, isSynergy: true },
  laserNova: { id: 'laserNova', name: 'Laser Nova', type: 'weapon', desc: 'SYNERGY: An expanding blast of piercing lasers.', baseDamage: 45, baseCooldown: 120, baseArea: 1.2, isSynergy: true },
  thornySwarm: { id: 'thornySwarm', name: 'Plasma Swarm', type: 'weapon', desc: 'SYNERGY: Orbiting drones armed with plasma whips.', baseDamage: 20, baseCooldown: 75, baseArea: 1.5, isSynergy: true },
  orbitalLasers: { id: 'orbitalLasers', name: 'Orbital Lasers', type: 'weapon', desc: 'SYNERGY: Drones that rapidly fire piercing beams.', baseDamage: 25, baseCooldown: 50, baseArea: 1.2, isSynergy: true },
  seismicWhip: { id: 'seismicWhip', name: 'Seismic Whip', type: 'weapon', desc: 'SYNERGY: Whip strikes generate expanding shockwaves.', baseDamage: 35, baseCooldown: 35, baseArea: 1.5, isSynergy: true },
  flamingLash: { id: 'flamingLash', name: 'Flaming Lash', type: 'weapon', desc: 'SYNERGY: A molten whip that leaves persistent fire.', baseDamage: 28, baseCooldown: 35, baseArea: 1.5, isSynergy: true },
  venomLash: { id: 'venomLash', name: 'Venom Lash', type: 'weapon', desc: 'SYNERGY: A whip that applies toxic damage and slows.', baseDamage: 25, baseCooldown: 40, baseArea: 1.5, isSynergy: true },
  supernovaBeam: { id: 'supernovaBeam', name: 'Supernova Beam', type: 'weapon', desc: 'EVOLVED: Massive piercing beam that explodes on impact.', baseDamage: 60, baseCooldown: 60, baseArea: 1.5, isEvolution: true },
  vampiricLash: { id: 'vampiricLash', name: 'Vampiric Lash', type: 'weapon', desc: 'EVOLVED: Heals slightly and covers screen.', baseDamage: 45, baseCooldown: 50, baseArea: 2.2, isEvolution: true },
  orbitalDefense: { id: 'orbitalDefense', name: 'Orbital Defense Network', type: 'weapon', desc: 'EVOLVED: Indestructible drones that rapidly shoot lasers.', baseDamage: 35, baseCooldown: 40, baseArea: 2, isEvolution: true },
  hellfire: { id: 'hellfire', name: 'Hellfire', type: 'weapon', desc: 'EVOLVED: Blue flames that persist and melt everything.', baseDamage: 25, baseCooldown: 80, baseArea: 1.5, isEvolution: true },
  quantumCollapse: { id: 'quantumCollapse', name: 'Quantum Collapse', type: 'weapon', desc: 'EVOLVED: Constant rapid pulses of dark energy.', baseDamage: 75, baseCooldown: 80, baseArea: 2, isEvolution: true },
  aegisMatrix: { id: 'aegisMatrix', name: 'Aegis Matrix', type: 'weapon', desc: 'EVOLVED: Massive repulsion and retaliates with missiles.', baseDamage: 40, baseCooldown: 100, baseArea: 2, isEvolution: true },
  buzzsawSwarm: { id: 'buzzsawSwarm', name: 'Buzzsaw Swarm', type: 'weapon', desc: 'EVOLVED: Multiple massive blades that ricochet wildly.', baseDamage: 30, baseCooldown: 50, baseArea: 1.5, isEvolution: true },
};

export const BOUNTIES_POOL = [
  { id: 'kills_200', desc: 'Defeat 200 enemies (Total)', type: 'kills', target: 200, reward: 150, currency: 'gold' },
  { id: 'kills_500', desc: 'Defeat 500 enemies (Total)', type: 'kills', target: 500, reward: 300, currency: 'gold' },
  { id: 'survive_300', desc: 'Survive for 5 mins (Single run)', type: 'survive', target: 300, reward: 2, currency: 'fragment' },
  { id: 'gold_100', desc: 'Earn 100 gold (Single run)', type: 'gold', target: 100, reward: 50, currency: 'gold' },
  { id: 'level_15', desc: 'Reach Level 15 (Single run)', type: 'level', target: 15, reward: 1, currency: 'fragment' },
  { id: 'play_3', desc: 'Play 3 runs', type: 'play', target: 3, reward: 100, currency: 'gold' }
];

export const DAILY_MISSIONS_POOL = [
  { id: 'dm_survive_600', desc: 'Survive for 10 mins (Single run)', type: 'survive', target: 600, reward: 10 },
  { id: 'dm_level_30', desc: 'Reach Level 30 (Single run)', type: 'level', target: 30, reward: 10 },
  { id: 'dm_kills_2000', desc: 'Defeat 2000 enemies (Total)', type: 'kills', target: 2000, reward: 10 },
  { id: 'dm_gold_500', desc: 'Earn 500 gold (Single run)', type: 'gold', target: 500, reward: 10 },
  { id: 'dm_play_5', desc: 'Play 5 runs', type: 'play', target: 5, reward: 10 }
];

export const SYNERGIES = [
  { weapon1: 'napalm', weapon2: 'shieldBubble', result: 'burningBarrier' },
  { weapon1: 'napBeam', weapon2: 'novaPulse', result: 'laserNova' },
  { weapon1: 'vineWhip', weapon2: 'slothSwarm', result: 'thornySwarm' },
  { weapon1: 'napBeam', weapon2: 'slothSwarm', result: 'orbitalLasers' },
  { weapon1: 'vineWhip', weapon2: 'novaPulse', result: 'seismicWhip' },
  { weapon1: 'napalm', weapon2: 'vineWhip', result: 'flamingLash' },
  { weapon1: 'toxicCloud', weapon2: 'vineWhip', result: 'venomLash' }
];

export const TRAIL_COSMETICS = [
    { id: 'default', name: 'No Trail',     goldCost: 0,     tokenCost: 0,   icon: '⚪', desc: 'Clean and simple.' },
    { id: 'fire',    name: 'Fire Trail',   goldCost: 3000,  tokenCost: 30,  icon: '🔥', desc: 'A blazing inferno follows your every move.' },
    { id: 'ice',     name: 'Ice Trail',    goldCost: 3000,  tokenCost: 30,  icon: '❄️', desc: 'Leaves a crystalline frost in your wake.' },
    { id: 'toxic',   name: 'Toxic Trail',  goldCost: 3000,  tokenCost: 30,  icon: '🧪', desc: 'Neon green slime marks your path.' },
    { id: 'plasma',  name: 'Plasma Trail', goldCost: 10000, tokenCost: 100, icon: '⚡', desc: 'Crackling cyan and magenta energy.' },
    { id: 'void',    name: 'Void Trail',   goldCost: 10000, tokenCost: 100, icon: '🌌', desc: 'Dark energy that bends space itself.' },
    { id: 'shadow',  name: 'Shadow Trail', goldCost: 10000, tokenCost: 100, icon: '🌑', desc: 'A shroud of absolute darkness.' },
    { id: 'gold',    name: 'Golden Trail', goldCost: 20000, tokenCost: 200, icon: '✨', desc: 'Pure wealth made visible.' },
    { id: 'blood',   name: 'Blood Trail',  goldCost: 20000, tokenCost: 200, icon: '🩸', desc: 'Leave a visceral red path.' },
    { id: 'pixel',   name: 'Pixel Trail',  goldCost: 20000, tokenCost: 200, icon: '👾', desc: 'Retro 8-bit digital fragments.' },
    { id: 'nebula',  name: 'Nebula Dust',  goldCost: 30000, tokenCost: 300, icon: '☄️', desc: 'Sprinkle cosmic stardust.' },
    { id: 'rainbow', name: 'Rainbow Trail',goldCost: 30000, tokenCost: 300, icon: '🌈', desc: 'All colors at once. Maximum flex.' },
];

export const KILL_COSMETICS = [
    { id: 'none',      name: 'No Effect',     goldCost: 0,     tokenCost: 0,   icon: '⚫', desc: 'Enemies die quietly.' },
    { id: 'explosion', name: 'Explosion',     goldCost: 3000,  tokenCost: 30,  icon: '💥', desc: 'Every kill bursts into flames.' },
    { id: 'freeze',    name: 'Freeze Burst',  goldCost: 3000,  tokenCost: 30,  icon: '🧊', desc: 'Enemies shatter into icy shards.' },
    { id: 'vaporize',  name: 'Vaporize',      goldCost: 3000,  tokenCost: 30,  icon: '☠️', desc: 'Enemies dissolve in toxic mist.' },
    { id: 'pixel_burst',name: 'Pixel Burst',  goldCost: 12000, tokenCost: 120, icon: '👾', desc: 'Enemies break into retro pixels.' },
    { id: 'implode',   name: 'Implode',       goldCost: 12000, tokenCost: 120, icon: '🌀', desc: 'Enemies collapse into a void singularity.' },
    { id: 'blood_splatter', name: 'Blood Splatter', goldCost: 12000, tokenCost: 120, icon: '🩸', desc: 'Messy biological destruction.' },
    { id: 'black_hole',name: 'Black Hole',    goldCost: 25000, tokenCost: 250, icon: '🕳️', desc: 'Sucks enemies into oblivion.' },
    { id: 'golden',    name: 'Gold Shatter',  goldCost: 25000, tokenCost: 250, icon: '💰', desc: 'Enemies explode into golden coins.' },
];

export const SKIN_COSMETICS = [
    { charId: 'neobyte',     id: 'neobyte_neon_vanguard', name: 'Neon Vanguard', goldCost: -1, tokenCost: -1, color: '#00D4FF', icon: '⚡', desc: 'Seasonal Reward: Neon blue sci-fi armor.', isSeasonalReward: true },
    { charId: 'pandypaws',   id: 'pandypaws_golden_sov', name: 'Golden Sovereign', goldCost: -1, tokenCost: -1, color: '#FFD700', icon: '👑', desc: 'Seasonal Reward: Heavy golden mechanical armor.', isSeasonalReward: true },
    { charId: 'novabyte',    id: 'novabyte_galactic_enforcer', name: 'Galactic Enforcer', goldCost: -1, tokenCost: -1, color: '#FF00FF', icon: '🌌', desc: 'Seasonal Reward: Hot pink enforcer gear.', isSeasonalReward: true },
    { charId: 'glitch',      id: 'glitch_toxic_phantom', name: 'Toxic Phantom', goldCost: -1, tokenCost: -1, color: '#39FF14', icon: '☣️', desc: 'Seasonal Reward: Sleek stealthy toxic green armor.', isSeasonalReward: true },
    { charId: 'holodrift',   id: 'holodrift_quantum_drifter', name: 'Quantum Drifter', goldCost: -1, tokenCost: -1, color: '#00FA9A', icon: '🌀', desc: 'Seasonal Reward: Emerald quantum suit.', isSeasonalReward: true },
    { charId: 'codebreaker', id: 'codebreaker_cyber_ninja', name: 'Cyber Ninja', goldCost: -1, tokenCost: -1, color: '#00FFFF', icon: '🥷', desc: 'Seasonal Reward: Cyan cyber stealth suit.', isSeasonalReward: true },
    { charId: 'dataphantom', id: 'dataphantom_abyssal_wraith', name: 'Abyssal Wraith', goldCost: -1, tokenCost: -1, color: '#8A2BE2', icon: '👻', desc: 'Seasonal Reward: Deep violet ethereal armor.', isSeasonalReward: true },
    { charId: 'neonvortex',  id: 'neonvortex_supernova_elite', name: 'Supernova Elite', goldCost: -1, tokenCost: -1, color: '#FF4500', icon: '☄️', desc: 'Seasonal Reward: Blazing orange hazard suit.', isSeasonalReward: true },
    { charId: 'synthbeats',  id: 'synthbeats_astro_dj', name: 'Astro DJ', goldCost: -1, tokenCost: -1, color: '#FF1493', icon: '🎧', desc: 'Seasonal Reward: Deep pink rhythmic gear.', isSeasonalReward: true },
    { charId: 'skybyte',     id: 'skybyte_nebula_ace', name: 'Nebula Ace', goldCost: -1, tokenCost: -1, color: '#1E90FF', icon: '🦅', desc: 'Seasonal Reward: Dodger blue flight suit.', isSeasonalReward: true },
    { charId: 'neobyte',     id: 'neobyte_default',    name: 'Electric Core Blue', goldCost: 0,     tokenCost: 0,    color: '#0066FF', icon: '🔵', desc: 'Electric Core Blue.' },
    { charId: 'neobyte',     id: 'neobyte_crimson',    name: 'Crimson',       goldCost: 5000,  tokenCost: 50,  color: '#DC143C', icon: '🔴', desc: 'Blood-red battle variant.' },
    { charId: 'neobyte',     id: 'neobyte_gold',       name: 'Gold Edition',  goldCost: 20000, tokenCost: 200, color: '#FFD700', icon: '🟡', desc: 'Gleaming prestige skin.' },
    { charId: 'pandypaws',   id: 'pandypaws_default',  name: 'Heavy Rose Pink', goldCost: 0,     tokenCost: 0,    color: '#C2185B', icon: '🩷', desc: 'Heavy Rose Pink armor.' },
    { charId: 'pandypaws',   id: 'pandypaws_obsidian', name: 'Obsidian',      goldCost: 5000,  tokenCost: 50,  color: '#222222', icon: '⬛', desc: 'Dark armour plating.' },
    { charId: 'pandypaws',   id: 'pandypaws_ice',      name: 'Cryo',          goldCost: 20000, tokenCost: 200, color: '#00CFFF', icon: '🩵', desc: 'Frozen tundra variant.' },
    { charId: 'novabyte',    id: 'novabyte_default',   name: 'Volatile Hot Pink', goldCost: 0,     tokenCost: 0,    color: '#FF007F', icon: '🟠', desc: 'Volatile Hot Pink.' },
    { charId: 'novabyte',    id: 'novabyte_void',      name: 'Void',          goldCost: 5000,  tokenCost: 50,  color: '#8A2BE2', icon: '🟣', desc: 'Corrupted by the void.' },
    { charId: 'novabyte',    id: 'novabyte_neon',      name: 'Neon',          goldCost: 20000, tokenCost: 200, color: '#39FF14', icon: '🟢', desc: 'Toxic neon glow.' },
    { charId: 'glitch',      id: 'glitch_default',     name: 'Neon Pink',     goldCost: 0,     tokenCost: 0,    color: '#FF00FF', icon: '🟣', desc: 'Neon Pink glitch form.' },
    { charId: 'glitch',      id: 'glitch_red',         name: 'Fatal Error',   goldCost: 5000,  tokenCost: 50,  color: '#FF0000', icon: '🔴', desc: 'Corrupted red state.' },
    { charId: 'glitch',      id: 'glitch_white',       name: 'Whitespace',    goldCost: 20000, tokenCost: 200, color: '#FFFFFF', icon: '⬜', desc: 'Pure emptiness.' },
    { charId: 'holodrift',   id: 'holodrift_default',  name: 'Holographic Green', goldCost: 0,     tokenCost: 0,    color: '#00FA9A', icon: '🩵', desc: 'Holographic Green form.' },
    { charId: 'holodrift',   id: 'holodrift_amber',    name: 'Amber',         goldCost: 5000,  tokenCost: 50,  color: '#FFA500', icon: '🟠', desc: 'Warm amber frequency.' },
    { charId: 'codebreaker', id: 'codebreaker_default',name: 'Neon Green',    goldCost: 0,     tokenCost: 0,    color: '#39FF14', icon: '🟢', desc: 'Neon Green hacker tech.' },
    { charId: 'codebreaker', id: 'codebreaker_pink',   name: 'Rootkit',       goldCost: 5000,  tokenCost: 50,  color: '#FF1493', icon: '🩷', desc: 'Stealth-mode pink.' },
    { charId: 'dataphantom', id: 'dataphantom_default',name: 'Ghost Green',   goldCost: 0,     tokenCost: 0,    color: '#98FF98', icon: '🔵', desc: 'Ghost Green presence.' },
    { charId: 'dataphantom', id: 'dataphantom_ghost',  name: 'Ghost',         goldCost: 5000,  tokenCost: 50,  color: '#C0C0C0', icon: '🩶', desc: 'Ethereal silver form.' },
    { charId: 'neonvortex',  id: 'neonvortex_default', name: 'Ultraviolet',   goldCost: 0,     tokenCost: 0,    color: '#7A00FF', icon: '🟡', desc: 'Ultraviolet energy.' },
    { charId: 'neonvortex',  id: 'neonvortex_plasma',  name: 'Plasma',        goldCost: 5000,  tokenCost: 50,  color: '#00E5FF', icon: '🩵', desc: 'Crackling plasma skin.' },
    { charId: 'synthbeats',  id: 'synthbeats_default', name: 'Rhythm Gold',   goldCost: 0,     tokenCost: 0,    color: '#FFD700', icon: '🟠', desc: 'Rhythm Gold aura.' },
    { charId: 'synthbeats',  id: 'synthbeats_violet',  name: 'Violet Drop',   goldCost: 5000,  tokenCost: 50,  color: '#9400D3', icon: '🟣', desc: 'Deep bass violet.' },
    { charId: 'skybyte',     id: 'skybyte_default',    name: 'Aerial Plasma Blue', goldCost: 0,     tokenCost: 0,    color: '#00D4FF', icon: '🩵', desc: 'Aerial Plasma Blue.' },
    { charId: 'skybyte',     id: 'skybyte_solar',      name: 'Solar Ace',     goldCost: 5000,  tokenCost: 50,  color: '#FF6600', icon: '🔶', desc: 'Blazing sunset variant.' },
];

export const EVOLUTIONS = [
    { baseWeapon: 'napBeam', passive: 'area_up', evolvedWeapon: 'supernovaBeam', name: 'Supernova Beam', desc: 'EVOLVED: Massive piercing beam that explodes on impact.' },
    { baseWeapon: 'vineWhip', passive: 'regen_up', evolvedWeapon: 'vampiricLash', name: 'Vampiric Lash', desc: 'EVOLVED: Heals massively and covers screen.' },
    { baseWeapon: 'slothSwarm', passive: 'spd_up', evolvedWeapon: 'orbitalDefense', name: 'Orbital Defense Network', desc: 'EVOLVED: Indestructible drones that rapidly shoot lasers.' },
    { baseWeapon: 'napalm', passive: 'dmg_up', evolvedWeapon: 'hellfire', name: 'Hellfire', desc: 'EVOLVED: Blue flames that persist and melt everything.' },
    { baseWeapon: 'novaPulse', passive: 'cd_down', evolvedWeapon: 'quantumCollapse', name: 'Quantum Collapse', desc: 'EVOLVED: Constant rapid pulses of dark energy.' },
    { baseWeapon: 'shieldBubble', passive: 'hp_up', evolvedWeapon: 'aegisMatrix', name: 'Aegis Matrix', desc: 'EVOLVED: Massive repulsion and retaliates with missiles.' },
    { baseWeapon: 'bouncingBlade', passive: 'proj_spd', evolvedWeapon: 'buzzsawSwarm', name: 'Buzzsaw Swarm', desc: 'EVOLVED: Multiple massive blades that ricochet wildly.' }
];

export const UPGRADES = [
  { id: 'dmg_up', name: 'Plasma Core', desc: '+10% Damage', type: 'passive', stat: 'damageMult', value: 0.1 },
  { id: 'spd_up', name: 'Hyperdrive Fuel', desc: '+10% Move Speed', type: 'passive', stat: 'speedMult', value: 0.1 },
  { id: 'hp_up', name: 'Exosuit Plating', desc: '+20 Max HP', type: 'passive', stat: 'maxHp', value: 20 },
  { id: 'area_up', name: 'Spatial Expander', desc: '+10% Area of Effect', type: 'passive', stat: 'areaMult', value: 0.1 },
  { id: 'cd_down', name: 'Quantum Accelerator', desc: '-5% Cooldowns', type: 'passive', stat: 'cooldownMult', value: -0.05 },
  { id: 'magnet_up', name: 'Tractor Beam', desc: '+25% Pickup Range', type: 'passive', stat: 'magnetRange', value: 25 },
  { id: 'regen_up', name: 'Nano-Repair Bots', desc: '+0.5 HP/sec', type: 'passive', stat: 'regen', value: 0.5 },
  { id: 'armor_up', name: 'Deflector Shield', desc: '+2 Armor', type: 'passive', stat: 'armor', value: 2 },
  { id: 'gold_up', name: 'Asteroid Miner', desc: '+20% Gold Drops', type: 'passive', stat: 'goldMult', value: 0.2 },
  { id: 'proj_spd', name: 'Ion Thrusters', desc: '+15% Projectile Speed', type: 'passive', stat: 'projSpeedMult', value: 0.15 },
  { id: 'xp_up', name: 'Neural Implant', desc: '+15% XP Gain', type: 'passive', stat: 'xpMult', value: 0.15 },
  { id: 'dmg_up2', name: 'Dark Matter Core', desc: '+15% Damage', type: 'passive', stat: 'damageMult', value: 0.15 },
  { id: 'spd_up2', name: 'Warp Drive', desc: '+15% Move Speed', type: 'passive', stat: 'speedMult', value: 0.15 },
  { id: 'area_up2', name: 'Gravitational Anomaly', desc: '+15% Area of Effect', type: 'passive', stat: 'areaMult', value: 0.15 },
  { id: 'cd_down2', name: 'Time Dilation Field', desc: '-10% Cooldowns', type: 'passive', stat: 'cooldownMult', value: -0.1 },
  { id: 'magnet_up2', name: 'Event Horizon', desc: '+50% Pickup Range', type: 'passive', stat: 'magnetRange', value: 50 },
  { id: 'w_napBeam', name: 'Cosmic Nap Beam', desc: 'Fires a piercing beam.', type: 'weapon', weaponId: 'napBeam' },
  { id: 'w_vineWhip', name: 'Plasma Whip', desc: 'Swipes nearby enemies.', type: 'weapon', weaponId: 'vineWhip' },
  { id: 'w_slothSwarm', name: 'Orbital Drones', desc: 'Orbiting defense drones.', type: 'weapon', weaponId: 'slothSwarm' },
  { id: 'w_napalm', name: 'Zero-G Napalm', desc: 'Leaves burning pools.', type: 'weapon', weaponId: 'napalm' },
  { id: 'w_novaPulse', name: 'Nova Pulse', desc: 'A massive expanding energy blast.', type: 'weapon', weaponId: 'novaPulse' },
  { id: 'w_shieldBubble', name: 'Shield Bubble', desc: 'Pushes enemies away and damages them.', type: 'weapon', weaponId: 'shieldBubble' },
  { id: 'w_neoBlaster', name: 'Blaster', desc: 'Fires reliable energy blasts.', type: 'weapon', weaponId: 'neoBlaster' },
  { id: 'w_bouncingBlade', name: 'Ricochet Blade', desc: 'Fires a bouncing sawblade.', type: 'weapon', weaponId: 'bouncingBlade' },
  { id: 'w_toxicCloud', name: 'Toxic Emitter', desc: 'Leaves a lingering poison cloud.', type: 'weapon', weaponId: 'toxicCloud' },
];

const loadSprite = (filename) => {
    if (typeof window !== 'undefined') {
        const img = new Image();
        img.src = `https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/${filename}`;
        return img;
    }
    return null;
};

export const ENEMIES = [
  // Tier 1
  { id: 't1_void_glow', name: 'Void Glow Orb', hp: 10, speed: 2.2, damage: 6, color: '#a855f7', radius: 27, xp: 1, tier: 1, spriteImage: loadSprite('ffb4f7068_void_glow_orb_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't1_nebula_jelly', name: 'Nebula Jelly', hp: 8, speed: 2.0, damage: 5, color: '#06b6d4', radius: 27, xp: 1, tier: 1, spriteImage: loadSprite('eb5805fe1_nebula_jelly_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't1_probe', name: 'Mini Probe Drone', hp: 12, speed: 2.5, damage: 8, color: '#84cc16', radius: 23, xp: 1, tier: 1, spriteImage: loadSprite('45cfb9820_mini_probe_drone_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't1_floater', name: 'Crystal Floater', hp: 14, speed: 1.8, damage: 7, color: '#ec4899', radius: 32, xp: 1, tier: 1, spriteImage: loadSprite('a70ff7ac4_crystal_floater_sheet.png'), frameCount: 16, animationSpeed: 0.15 },

  // Tier 2
  { id: 't2_serpent', name: 'Plasma Serpent', hp: 18, speed: 2.4, damage: 12, color: '#f97316', radius: 32, xp: 2, tier: 2, isRanged: true, spriteImage: loadSprite('7baf81106_plasma_serpent_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't2_eye_tentacle', name: 'Eye Tentacle', hp: 22, speed: 1.5, damage: 15, color: '#d946ef', radius: 36, xp: 2, tier: 2, spriteImage: loadSprite('e1e15823a_eye_tentacle_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't2_spore_wasp', name: 'Spore Wasp', hp: 15, speed: 2.6, damage: 10, color: '#84cc16', radius: 27, xp: 2, tier: 2, spriteImage: loadSprite('3b545ef7a_spore_wasp_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't2_rock', name: 'Rock Fragment', hp: 35, speed: 0.8, damage: 14, color: '#f97316', radius: 41, xp: 2, tier: 2, isTank: true, spriteImage: loadSprite('0452ce6df_rock_fragment_sheet.png'), frameCount: 16, animationSpeed: 0.15 },

  // Tier 3
  { id: 't3_manta', name: 'Void Manta', hp: 30, speed: 2.0, damage: 16, color: '#8b5cf6', radius: 41, xp: 3, tier: 3, spriteImage: loadSprite('9842135cf_void_mantra_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't3_energy_phantom', name: 'Energy Phantom', hp: 28, speed: 1.8, damage: 15, color: '#0ea5e9', radius: 36, xp: 3, tier: 3, spriteImage: loadSprite('74d31fdc0_energy_phantom_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't3_starfish', name: 'Stellar Starfish', hp: 35, speed: 1.2, damage: 18, color: '#eab308', radius: 36, xp: 3, tier: 3, spriteImage: loadSprite('bdcbfb6bd_stellar_starfish_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't3_angler', name: 'Angler Lantern', hp: 32, speed: 1.5, damage: 17, color: '#3b82f6', radius: 41, xp: 3, tier: 3, isRanged: true, spriteImage: loadSprite('b00d8e25b_angler_lantern_sheet.png'), frameCount: 16, animationSpeed: 0.15 },

  // Tier 4
  { id: 't4_spinner', name: 'Quantum Spinner', hp: 45, speed: 2.2, damage: 20, color: '#06b6d4', radius: 41, xp: 4, tier: 4, spriteImage: loadSprite('a2df90068_quantum_spinner_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't4_ribbon', name: 'Ribbon Phantom', hp: 40, speed: 1.9, damage: 22, color: '#d946ef', radius: 36, xp: 4, tier: 4, spriteImage: loadSprite('06dc947b3_ribbon_phantom_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't4_vortex', name: 'Vortex Drifter', hp: 55, speed: 1.4, damage: 25, color: '#ec4899', radius: 45, xp: 4, tier: 4, spriteImage: loadSprite('28251fe02_vortex_drifter_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't4_mothra', name: 'Neon Mothra', hp: 38, speed: 2.4, damage: 18, color: '#14b8a6', radius: 36, xp: 4, tier: 4, isRanged: true, spriteImage: loadSprite('23d933892_neon_mothra_sheet.png'), frameCount: 16, animationSpeed: 0.15 },

  // Tier 5
  { id: 't5_spike_virus', name: 'Spike Virus', hp: 65, speed: 1.8, damage: 28, color: '#a855f7', radius: 45, xp: 5, tier: 5, spriteImage: loadSprite('9b4da0034_spike_virus_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't5_coral', name: 'Coral Bloom', hp: 80, speed: 1.2, damage: 25, color: '#f43f5e', radius: 50, xp: 5, tier: 5, spriteImage: loadSprite('c045ec43a_coral_bloom_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't5_blade', name: 'Blade Arrowhead', hp: 60, speed: 2.5, damage: 30, color: '#94a3b8', radius: 41, xp: 5, tier: 5, isRanged: true, spriteImage: loadSprite('e573c6ccc_blade_arrowhead_sheet.png'), frameCount: 16, animationSpeed: 0.15 },

  // Tier 6
  { id: 't6_chain_eye', name: 'Chain Eye', hp: 100, speed: 1.6, damage: 35, color: '#d946ef', radius: 54, xp: 6, tier: 6, isRanged: true, spriteImage: loadSprite('65ffb3fae_chain_eye_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't6_frost_wyrm', name: 'Frost Wyrm', hp: 120, speed: 1.8, damage: 38, color: '#38bdf8', radius: 59, xp: 6, tier: 6, spriteImage: loadSprite('ab422464d_frost_wyrm_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't6_flame_wyrm', name: 'Flame Wyrmling', hp: 90, speed: 2.2, damage: 42, color: '#ef4444', radius: 50, xp: 6, tier: 6, spriteImage: loadSprite('906ceba81_flame_wyrmling_sheet.png'), frameCount: 16, animationSpeed: 0.15 },

  // Tier 7
  { id: 't7_frost_specter', name: 'Frost Specter', hp: 150, speed: 1.7, damage: 48, color: '#0ea5e9', radius: 59, xp: 7, tier: 7, spriteImage: loadSprite('f6ad447be_frost_specter_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't7_thunder', name: 'Thunder Sphere', hp: 140, speed: 2.1, damage: 52, color: '#eab308', radius: 54, xp: 7, tier: 7, isRanged: true, spriteImage: loadSprite('5cbd6ac67_thunder_sphere_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't7_gear_swarm', name: 'Nano Gear Swarm', hp: 160, speed: 1.4, damage: 45, color: '#94a3b8', radius: 63, xp: 7, tier: 7, spriteImage: loadSprite('0987d4652_nano_gear_swarm_sheet.png'), frameCount: 16, animationSpeed: 0.15 },

  // Tier 8
  { id: 't8_whisper', name: 'Whispering Void', hp: 200, speed: 1.5, damage: 60, color: '#7e22ce', radius: 68, xp: 8, tier: 8, spriteImage: loadSprite('0438a0ffd_whispering_void_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't8_bio_bloom', name: 'Bio Bloom Pod', hp: 240, speed: 1.0, damage: 55, color: '#22c55e', radius: 72, xp: 8, tier: 8, spriteImage: loadSprite('578d7e2aa_bio_bloom_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't8_ray_fish', name: 'Cosmic Ray Fish', hp: 180, speed: 2.3, damage: 65, color: '#38bdf8', radius: 63, xp: 8, tier: 8, spriteImage: loadSprite('bcd99f449_cosmic_ray_fish_sheet.png'), frameCount: 16, animationSpeed: 0.15 },

  // Tier 9
  { id: 't9_lava_blob', name: 'Lava Rock Blob', hp: 300, speed: 1.2, damage: 85, color: '#ef4444', radius: 77, xp: 9, tier: 9, isTank: true, spriteImage: loadSprite('f01e56245_lava_rock_blob_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't9_jelly_swarm', name: 'Plasma Jelly Swarm', hp: 260, speed: 1.9, damage: 80, color: '#06b6d4', radius: 68, xp: 9, tier: 9, spriteImage: loadSprite('70f1f9342_plasma_jelly_swarm_sheet.png'), frameCount: 16, animationSpeed: 0.15 },

  // Tier 10
  { id: 't10_shadow', name: 'Shadow Stalker', hp: 420, speed: 2.2, damage: 120, color: '#1e293b', radius: 81, xp: 10, tier: 10, spriteImage: loadSprite('9199eef7e_shadow_stalker_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't10_crystal_vortex', name: 'Crystal Vortex', hp: 480, speed: 1.6, damage: 130, color: '#d946ef', radius: 86, xp: 10, tier: 10, isRanged: true, spriteImage: loadSprite('703e0a56e_crystal_vortex_sheet.png'), frameCount: 16, animationSpeed: 0.15 },

  // Bosses (spawn anywhere at the end)
  { id: 'boss_nebula_devourer', name: 'Nebula Devourer', hp: 7000, speed: 0.8, damage: 60, color: '#8b5cf6', radius: 124, xp: 800, isBoss: true, spriteImage: loadSprite('34fdca1a0_nebula_devourer_sheet.png'), frameCount: 25, animationSpeed: 0.12, weakSide: 'back', weakDesc: 'Attack from behind' },
  { id: 'boss_plasma_kraken', name: 'Plasma Kraken', hp: 6000, speed: 0.6, damage: 70, color: '#ef4444', radius: 113, xp: 700, isBoss: true, spriteImage: loadSprite('7464748bb_plasma_kraken_sheet.png'), frameCount: 25, animationSpeed: 0.12, weakSide: 'side', weakDesc: 'Attack from the sides' },
  { id: 'boss_stellar_colossus', name: 'Stellar Colossus', hp: 9000, speed: 1.0, damage: 55, color: '#f59e0b', radius: 135, xp: 900, isBoss: true, spriteImage: loadSprite('d39368909_stellar_colossus_sheet.png'), frameCount: 25, animationSpeed: 0.12, weakSide: 'back', weakDesc: 'Attack from behind' },
  { id: 'boss_cosmic_wyrm', name: 'Cosmic Wyrm Lord', hp: 11000, speed: 0.9, damage: 80, color: '#0ea5e9', radius: 146, xp: 1000, isBoss: true, spriteImage: loadSprite('88e8a0d84_cosmic_wyrm_lord_sheet.png'), frameCount: 25, animationSpeed: 0.12, weakSide: 'side', weakDesc: 'Attack from the sides' },
  { id: 'boss_supernova_empress', name: 'Supernova Empress', hp: 14000, speed: 1.2, damage: 90, color: '#ec4899', radius: 110, xp: 1200, isBoss: true, spriteImage: loadSprite('4d3a1f090_supernova_empress_sheet.png'), frameCount: 25, animationSpeed: 0.12, weakSide: 'back', weakDesc: 'Attack from behind' },
  { id: 'boss_nexus_annihilator', name: 'Nexus Annihilator', hp: 18000, speed: 0.5, damage: 120, color: '#1e293b', radius: 160, xp: 1500, isBoss: true, spriteImage: loadSprite('29ea7426c_nexus_annihilator_sheet.png'), frameCount: 25, animationSpeed: 0.12, weakSide: 'side', weakDesc: 'Attack from the sides' }
];

export const CHARACTER_TALENTS = {
  neobyte: [
    { id: 'neo_1', name: 'Fleet Command', desc: '+10% Area', stat: 'areaMult', value: 0.1, tier: 1 },
    { id: 'neo_2a', name: 'Rapid Ordnance', desc: '-10% Cooldown', stat: 'cooldownMult', value: -0.1, tier: 2, requires: 'neo_1', excludes: 'neo_2b' },
    { id: 'neo_2b', name: 'Reinforced Hull', desc: '+30 Max HP', stat: 'maxHp', value: 30, tier: 2, requires: 'neo_1', excludes: 'neo_2a' },
    { id: 'neo_3a', name: 'Orbital Bombardment', desc: '+25% Damage', stat: 'damageMult', value: 0.25, tier: 3, requires: 'neo_2a' },
    { id: 'neo_3b', name: 'Aegis Shield', desc: '+5 Armor', stat: 'armor', value: 5, tier: 3, requires: 'neo_2b' }
  ],
  pandypaws: [
    { id: 'pan_1', name: 'Titanium Alloy', desc: '+3 Armor', stat: 'armor', value: 3, tier: 1 },
    { id: 'pan_2a', name: 'Gravity Crush', desc: '+20% Area', stat: 'areaMult', value: 0.2, tier: 2, requires: 'pan_1', excludes: 'pan_2b' },
    { id: 'pan_2b', name: 'Nanite Repair', desc: '+0.5 Regen', stat: 'regen', value: 0.5, tier: 2, requires: 'pan_1', excludes: 'pan_2a' },
    { id: 'pan_3a', name: 'Seismic Shock', desc: '+25% Damage', stat: 'damageMult', value: 0.25, tier: 3, requires: 'pan_2a' },
    { id: 'pan_3b', name: 'Dreadnought Chassis', desc: '+50 Max HP', stat: 'maxHp', value: 50, tier: 3, requires: 'pan_2b' }
  ],
  novabyte: [
    { id: 'nova_1', name: 'Reactive Armor', desc: '+20 Max HP', stat: 'maxHp', value: 20, tier: 1 },
    { id: 'nova_2a', name: 'Antimatter Charges', desc: '+15% Damage', stat: 'damageMult', value: 0.15, tier: 2, requires: 'nova_1', excludes: 'nova_2b' },
    { id: 'nova_2b', name: 'Lightweight Frame', desc: '+15% Speed', stat: 'speedMult', value: 0.15, tier: 2, requires: 'nova_1', excludes: 'nova_2a' },
    { id: 'nova_3a', name: 'Supernova Detonation', desc: '+30% Area', stat: 'areaMult', value: 0.3, tier: 3, requires: 'nova_2a' },
    { id: 'nova_3b', name: 'Evasion Thrusters', desc: '-15% Cooldown', stat: 'cooldownMult', value: -0.15, tier: 3, requires: 'nova_2b' }
  ],
  glitch: [
    { id: 'gli_1', name: 'Neural Overclock', desc: '+10% Speed', stat: 'speedMult', value: 0.1, tier: 1 },
    { id: 'gli_2a', name: 'Total Annihilation', desc: '+20% Damage', stat: 'damageMult', value: 0.2, tier: 2, requires: 'gli_1', excludes: 'gli_2b' },
    { id: 'gli_2b', name: 'Quantum Probability', desc: '+1 Luck', stat: 'luck', value: 1, tier: 2, requires: 'gli_1', excludes: 'gli_2a' },
    { id: 'gli_3a', name: 'Fatal Error', desc: '+30% Damage', stat: 'damageMult', value: 0.3, tier: 3, requires: 'gli_2a' },
    { id: 'gli_3b', name: 'Lucky Strike', desc: '+2 Luck', stat: 'luck', value: 2, tier: 3, requires: 'gli_2b' }
  ],
  holodrift: [
    { id: 'holo_1', name: 'Salvage Drones', desc: '+10% XP', stat: 'xpMult', value: 0.1, tier: 1 },
    { id: 'holo_2a', name: 'Magnetic Field Emitter', desc: '+30 Magnet', stat: 'magnetRange', value: 30, tier: 2, requires: 'holo_1', excludes: 'holo_2b' },
    { id: 'holo_2b', name: 'Light-Bending Mirage', desc: '+20% Speed', stat: 'speedMult', value: 0.2, tier: 2, requires: 'holo_1', excludes: 'holo_2a' },
    { id: 'holo_3a', name: 'Greed Protocol', desc: '+30% Gold', stat: 'goldMult', value: 0.3, tier: 3, requires: 'holo_2a' },
    { id: 'holo_3b', name: 'Holographic Decoy', desc: '+3 Armor', stat: 'armor', value: 3, tier: 3, requires: 'holo_2b' }
  ],
  codebreaker: [
    { id: 'code_1', name: 'Subroutine Bypass', desc: '-5% Cooldown', stat: 'cooldownMult', value: -0.05, tier: 1 },
    { id: 'code_2a', name: 'Crypto Mining', desc: '+15% Gold', stat: 'goldMult', value: 0.15, tier: 2, requires: 'code_1', excludes: 'code_2b' },
    { id: 'code_2b', name: 'Overclocked CPU', desc: '+15% Proj Speed', stat: 'projSpeedMult', value: 0.15, tier: 2, requires: 'code_1', excludes: 'code_2a' },
    { id: 'code_3a', name: 'Omniscience Protocol', desc: '+2 Luck', stat: 'luck', value: 2, tier: 3, requires: 'code_2a' },
    { id: 'code_3b', name: 'Infinite Loop', desc: '-15% Cooldown', stat: 'cooldownMult', value: -0.15, tier: 3, requires: 'code_2b' }
  ],
  dataphantom: [
    { id: 'data_1', name: 'Phase Shift', desc: '+10% Speed', stat: 'speedMult', value: 0.1, tier: 1 },
    { id: 'data_2a', name: 'Particle Accelerator', desc: '+20% Proj Speed', stat: 'projSpeedMult', value: 0.2, tier: 2, requires: 'data_1', excludes: 'data_2b' },
    { id: 'data_2b', name: 'Energy Shielding', desc: '+2 Armor', stat: 'armor', value: 2, tier: 2, requires: 'data_1', excludes: 'data_2a' },
    { id: 'data_3a', name: 'Data Corruption', desc: '+25% Damage', stat: 'damageMult', value: 0.25, tier: 3, requires: 'data_2a' },
    { id: 'data_3b', name: 'Ghost Protocol', desc: '+40 Max HP', stat: 'maxHp', value: 40, tier: 3, requires: 'data_2b' }
  ],
  neonvortex: [
    { id: 'neon_1', name: 'Targeting Optics', desc: '+10% Proj Speed', stat: 'projSpeedMult', value: 0.1, tier: 1 },
    { id: 'neon_2a', name: 'Railgun Calibration', desc: '+20% Damage', stat: 'damageMult', value: 0.2, tier: 2, requires: 'neon_1', excludes: 'neon_2b' },
    { id: 'neon_2b', name: 'Micro-Blackhole', desc: '+30% Area', stat: 'areaMult', value: 0.3, tier: 2, requires: 'neon_1', excludes: 'neon_2a' },
    { id: 'neon_3a', name: 'Singularity Shot', desc: '+30% Damage', stat: 'damageMult', value: 0.3, tier: 3, requires: 'neon_2a' },
    { id: 'neon_3b', name: 'Event Horizon', desc: '+50 Magnet', stat: 'magnetRange', value: 50, tier: 3, requires: 'neon_2b' }
  ],
  synthbeats: [
    { id: 'syn_1', name: 'Sonic Pacifier', desc: '+10% Area', stat: 'areaMult', value: 0.1, tier: 1 },
    { id: 'syn_2a', name: 'Intergalactic Trade', desc: '+20% Gold', stat: 'goldMult', value: 0.2, tier: 2, requires: 'syn_1', excludes: 'syn_2b' },
    { id: 'syn_2b', name: 'Temporal Rewind', desc: '-15% Cooldown', stat: 'cooldownMult', value: -0.15, tier: 2, requires: 'syn_1', excludes: 'syn_2a' },
    { id: 'syn_3a', name: 'Billionaire Club', desc: '+30% Gold', stat: 'goldMult', value: 0.3, tier: 3, requires: 'syn_2a' },
    { id: 'syn_3b', name: 'Bass Drop', desc: '+30% Area', stat: 'areaMult', value: 0.3, tier: 3, requires: 'syn_2b' }
  ],
  skybyte: [
    { id: 'sky_1', name: 'Slipstream Thrusters', desc: '+10% Speed', stat: 'speedMult', value: 0.1, tier: 1 },
    { id: 'sky_2a', name: 'Meteor Shower', desc: '+25% Area', stat: 'areaMult', value: 0.25, tier: 2, requires: 'sky_1', excludes: 'sky_2b' },
    { id: 'sky_2b', name: 'Barrel Roll', desc: '+2 Armor', stat: 'armor', value: 2, tier: 2, requires: 'sky_1', excludes: 'sky_2a' },
    { id: 'sky_3a', name: 'Carpet Bombing', desc: '+25% Damage', stat: 'damageMult', value: 0.25, tier: 3, requires: 'sky_2a' },
    { id: 'sky_3b', name: 'Evasive Maneuvers', desc: '+20% Speed', stat: 'speedMult', value: 0.2, tier: 3, requires: 'sky_2b' }
  ]
};

export const RELICS = [
    { id: 'relic_lucky_dice', name: 'Cosmic Dice', desc: 'Increases chance of crits and rare drops globally.', icon: '🎲', fragmentCost: 2, stat: 'luck', values: [1, 2, 3, 4, 5] },
    { id: 'relic_gold_magnet', name: 'Midas Core', desc: 'Boosts Gold Multiplier. Farm faster.', icon: '💰', fragmentCost: 3, stat: 'goldMult', values: [0.1, 0.2, 0.3, 0.4, 0.5] },
    { id: 'relic_xp_drive', name: 'Knowledge Drive', desc: 'Boosts XP Gain. Level up incredibly fast.', icon: '🧠', fragmentCost: 3, stat: 'xpMult', values: [0.1, 0.2, 0.3, 0.4, 0.5] },
    { id: 'relic_blood_chalice', name: 'Blood Chalice', desc: 'Increases HP Regen. Essential for long runs.', icon: '🍷', fragmentCost: 4, stat: 'regen', values: [0.2, 0.4, 0.6, 0.8, 1.0] },
    { id: 'relic_damage_core', name: 'Annihilation Core', desc: 'Boosts Base Damage. Annihilate your foes.', icon: '💥', fragmentCost: 5, stat: 'damageMult', values: [0.05, 0.10, 0.15, 0.20, 0.25] },
];

export const RELIC_RARITIES = [
    { level: 1, name: 'Common', color: 'text-slate-400', border: 'border-slate-500', bg: 'bg-slate-900', glow: 'shadow-[0_0_15px_rgba(100,116,139,0.3)]' },
    { level: 2, name: 'Uncommon', color: 'text-green-400', border: 'border-green-500', bg: 'bg-green-950/20', glow: 'shadow-[0_0_15px_rgba(74,222,128,0.3)]' },
    { level: 3, name: 'Rare', color: 'text-blue-400', border: 'border-blue-500', bg: 'bg-blue-950/20', glow: 'shadow-[0_0_15px_rgba(96,165,250,0.3)]' },
    { level: 4, name: 'Epic', color: 'text-purple-400', border: 'border-purple-500', bg: 'bg-purple-950/20', glow: 'shadow-[0_0_15px_rgba(192,132,252,0.3)]' },
    { level: 5, name: 'Legendary', color: 'text-yellow-400', border: 'border-yellow-500', bg: 'bg-yellow-950/20', glow: 'shadow-[0_0_15px_rgba(250,204,21,0.3)]' },
];

export const getEnemyMasteryMilestones = (enemy) => {
    if (!enemy) return [{ kills: 10, bonus: 0 }];
    if (enemy.isBoss) {
        return [
            { kills: 5, bonus: 2 },
            { kills: 15, bonus: 4 },
            { kills: 25, bonus: 6 },
            { kills: 35, bonus: 8 },
            { kills: 50, bonus: 10 }
        ];
    } else if (enemy.tier >= 9) {
        return [
            { kills: 50, bonus: 2 },
            { kills: 125, bonus: 4 },
            { kills: 250, bonus: 6 },
            { kills: 375, bonus: 8 },
            { kills: 500, bonus: 10 }
        ];
    } else if (enemy.tier >= 5) {
        return [
            { kills: 100, bonus: 2 },
            { kills: 250, bonus: 4 },
            { kills: 500, bonus: 6 },
            { kills: 750, bonus: 8 },
            { kills: 1000, bonus: 10 }
        ];
    } else {
        return [
            { kills: 200, bonus: 2 },
            { kills: 500, bonus: 4 },
            { kills: 1000, bonus: 6 },
            { kills: 1500, bonus: 8 },
            { kills: 2000, bonus: 10 }
        ];
    }
};

export const CHARACTER_MASTERY_LEVELS = [
    { level: 1, killsRequired: 0, title: 'Novice', bonusDesc: 'None', stat: null, value: 0, badge: '🟢' },
    { level: 2, killsRequired: 2000, title: 'Adept', bonusDesc: '+5% Speed', stat: 'speedMult', value: 0.05, badge: '🔵' },
    { level: 3, killsRequired: 5000, title: 'Expert', bonusDesc: '+10% Damage', stat: 'damageMult', value: 0.1, badge: '🟣' },
    { level: 4, killsRequired: 10000, title: 'Master', bonusDesc: '+15% Area', stat: 'areaMult', value: 0.15, badge: '🟡' },
    { level: 5, killsRequired: 25000, title: 'Grandmaster', bonusDesc: '-10% Cooldown', stat: 'cooldownMult', value: -0.1, badge: '👑' },
];

export const getCharacterMastery = (kills) => {
    let current = CHARACTER_MASTERY_LEVELS[0];
    let next = CHARACTER_MASTERY_LEVELS[1];
    for (let i = 0; i < CHARACTER_MASTERY_LEVELS.length; i++) {
        if (kills >= CHARACTER_MASTERY_LEVELS[i].killsRequired) {
            current = CHARACTER_MASTERY_LEVELS[i];
            next = CHARACTER_MASTERY_LEVELS[i+1] || null;
        }
    }
    return { current, next };
};

export const getWeaponStatsAndMastery = (save, wId) => {
    if (!save) return { dmgMult: 1, areaMult: 1, cdMult: 1, isMastered: false };
    const perm = save.permanentWeaponUpgrades?.[wId] || {};
    const week = save.weeklyWeaponUpgrades?.[wId] || {};
    const season = save.seasonalWeaponUpgrades?.[wId] || {};
    
    const dmgUpgradeLevel = (perm.damage || 0) + (week.damage || 0) + (season.damage || 0);
    const areaUpgradeLevel = (perm.area || 0) + (week.area || 0) + (season.area || 0);
    const cdUpgradeLevel = (perm.cooldown || 0) + (week.cooldown || 0) + (season.cooldown || 0);
    
    const forgeAugments = save.forgeWeaponAugments?.[wId] || [];
    let forgeDmg = 0;
    if (forgeAugments.includes('damage_1')) forgeDmg += 0.15;
    if (forgeAugments.includes('damage_2')) forgeDmg += 0.35;
    if (forgeAugments.includes('damage_3')) forgeDmg += 0.60;

    let forgeArea = 0;
    if (forgeAugments.includes('area_1')) forgeArea += 0.15;
    if (forgeAugments.includes('area_2')) forgeArea += 0.35;
    if (forgeAugments.includes('area_3')) forgeArea += 0.60;
    
    let forgeCd = 0;
    if (forgeAugments.includes('cd_1')) forgeCd += 0.10;
    if (forgeAugments.includes('cd_2')) forgeCd += 0.20;
    if (forgeAugments.includes('cd_3')) forgeCd += 0.35;

    const isMastered = (dmgUpgradeLevel >= 5 && areaUpgradeLevel >= 5 && cdUpgradeLevel >= 5) || 
                       (forgeAugments.includes('damage_3') && forgeAugments.includes('area_3') && forgeAugments.includes('cd_3'));
                       
    return {
        dmgMult: 1 + (dmgUpgradeLevel * 0.1) + forgeDmg,
        areaMult: 1 + (areaUpgradeLevel * 0.1) + forgeArea,
        cdMult: 1 - (cdUpgradeLevel * 0.05) - forgeCd,
        isMastered
    };
};