export const CHARACTERS = [
  { id: 'neobyte', name: 'NeoByte', desc: 'Commander. Balanced all-rounder.', hp: 120, speed: 3.0, armor: 2, regen: 0.1, cost: 0, color: '#4169E1', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/beab0f249_NeoByteF.png', idleSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/de0a679f4_NeoByteIdle.png', walkSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/75dd9433c_NeoByteWalk.png', damageMult: 1.0, cooldownMult: 1.0, areaMult: 1.0, magnetRange: 60, luck: 0, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 1.0 },
  { id: 'pandypaws', name: 'Pandypaws', desc: 'Heavy Armor Mechanic. Tanky but slow, low damage.', hp: 200, speed: 2.4, armor: 5, regen: 0.5, cost: 1000, color: '#FF69B4', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/82f3642e6_PandyPawsF.png', idleSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/2cc570289_PandyPawsIdle.png', walkSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/cb5611f5e_PandyPawsWalk.png', damageMult: 0.8, cooldownMult: 1.2, areaMult: 1.2, magnetRange: 50, luck: 0, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 0.8 },
  { id: 'novabyte', name: 'NovaByte', desc: 'Comms & Demolitions. High area and damage, low HP.', hp: 80, speed: 3.0, armor: 0, regen: 0, cost: 2000, color: '#FF4500', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/9db3cfc07_NovaByteF.png', idleSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/4a222b5ab_NovaByteIdle.png', walkSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/948cc9202_NovaByteWalk.png', damageMult: 1.3, cooldownMult: 1.1, areaMult: 1.5, magnetRange: 60, luck: 0, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 1.0 },
  { id: 'glitch', name: 'Glitch', desc: 'Stealth Assassin. Very fast, high damage, fragile.', hp: 60, speed: 3.6, armor: 0, regen: 0, cost: 4000, color: '#8A2BE2', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/2469b9070_GlitchF.png', idleSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/d02f2b1ce_GlitchIdle.png', walkSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/8648d6c3d_GlitchWalk.png', damageMult: 1.4, cooldownMult: 0.8, areaMult: 0.8, magnetRange: 40, luck: 1, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 1.2 },
  { id: 'holodrift', name: 'HoloDrift', desc: 'Engineer. High magnet range and XP gain.', hp: 100, speed: 2.9, armor: 1, regen: 0.1, cost: 6000, color: '#20B2AA', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/553fe0f67_HoloDriftF.png', idleSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/1f5b68f1a_HoloDriftIdle.png', walkSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/104ef0826_HoloDriftWalk.png', damageMult: 0.9, cooldownMult: 1.0, areaMult: 1.0, magnetRange: 120, luck: 0, goldMult: 1.0, xpMult: 1.3, projSpeedMult: 1.0 },
  { id: 'codebreaker', name: 'CodeBreaker', desc: 'Cyber Warfare Hacker. Fast cooldowns, high luck.', hp: 90, speed: 3.1, armor: 1, regen: 0, cost: 8000, color: '#32CD32', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/d7c90aaac_CodeBreakerF.png', idleSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/e54bbd0c7_CodeBreakerIdle.png', walkSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/b0690b90d_CodeBreakerWalk.png', damageMult: 0.7, cooldownMult: 0.6, areaMult: 1.0, magnetRange: 60, luck: 3, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 1.0 },
  { id: 'dataphantom', name: 'DataPhantom', desc: 'Strategic Hacker. High projectile speed, good armor.', hp: 110, speed: 3.0, armor: 3, regen: 0.2, cost: 10000, color: '#4682B4', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/197092c32_DataPhantomF.png', idleSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/2ae3abe48_DataPhantomIdle.png', walkSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/af854d144_DataPhantomWalk.png', damageMult: 1.0, cooldownMult: 1.0, areaMult: 1.0, magnetRange: 60, luck: 0, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 1.5 },
  { id: 'neonvortex', name: 'NeonVortex', desc: 'Elite Sniper. Extreme damage, very slow cooldowns.', hp: 50, speed: 3.2, armor: 0, regen: 0, cost: 15000, color: '#FFD700', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/467861605_NeonVortexF.png', idleSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/f119754ca_NeonVortexIdle.png', walkSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/dadf10d30_NeonVortexWalk.png', damageMult: 2.0, cooldownMult: 1.5, areaMult: 0.7, magnetRange: 60, luck: 0, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 2.0 },
  { id: 'synthbeats', name: 'SynthBeats', desc: 'Diplomat. High gold gain and luck.', hp: 100, speed: 3.0, armor: 1, regen: 0.2, cost: 20000, color: '#FF8C00', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/9eb5364ba_SynthBeatsF.png', idleSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/d110b2e04_SynthBeatsIdle.png', walkSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/30c23f58e_SynthBeatsWalk.png', damageMult: 0.9, cooldownMult: 1.0, areaMult: 1.0, magnetRange: 70, luck: 2, goldMult: 1.5, xpMult: 1.0, projSpeedMult: 1.0 },
  { id: 'skybyte', name: 'SkyByte', desc: 'Ace Pilot. Very fast, good damage and area.', hp: 90, speed: 3.5, armor: 0, regen: 0, cost: 25000, color: '#00FFFF', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/3cbfa8254_SkyByteF.png', idleSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/88972e65a_SkyByteIdle.png', walkSprite: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/3904ffa21_SkyByteWalk.png', damageMult: 1.2, cooldownMult: 0.9, areaMult: 1.2, magnetRange: 60, luck: 0, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 1.3 }
];

export const DIFFICULTIES = [
  { id: 'normal', name: 'Normal', desc: 'Standard cosmic experience.', xpMult: 1.0, goldMult: 1.0, enemyHpMult: 1.0, enemyDmgMult: 1.0, hazardChance: 0 },
  { id: 'hard', name: 'Hard', desc: 'Tougher enemies. Occasional hazards. +50% XP & Gold.', xpMult: 1.5, goldMult: 1.5, enemyHpMult: 1.5, enemyDmgMult: 1.5, hazardChance: 0.05 },
  { id: 'cosmic', name: 'Cosmic', desc: 'Extreme danger. Frequent hazards. +150% XP & Gold.', xpMult: 2.5, goldMult: 2.5, enemyHpMult: 2.5, enemyDmgMult: 2.5, hazardChance: 0.15 }
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
  napBeam: { id: 'napBeam', name: 'Cosmic Nap Beam', type: 'weapon', desc: 'Fires a piercing beam.', masteryDesc: 'MASTERY: Beam chains to nearby enemies. (Blue Beam)', baseDamage: 10, baseCooldown: 60, baseArea: 1 },
  vineWhip: { id: 'vineWhip', name: 'Plasma Whip', type: 'weapon', desc: 'Swipes nearby enemies.', masteryDesc: 'MASTERY: Heals player for 5% of damage dealt. (Red Whip)', baseDamage: 15, baseCooldown: 45, baseArea: 1 },
  slothSwarm: { id: 'slothSwarm', name: 'Orbital Drones', type: 'weapon', desc: 'Orbiting defense drones.', masteryDesc: 'MASTERY: Drones move faster and shoot lasers. (Red Drones)', baseDamage: 5, baseCooldown: 120, baseArea: 1 },
  napalm: { id: 'napalm', name: 'Zero-G Napalm', type: 'weapon', desc: 'Leaves burning pools.', masteryDesc: 'MASTERY: Blue fire that slows enemies by 50%.', baseDamage: 3, baseCooldown: 90, baseArea: 1 },
  novaPulse: { id: 'novaPulse', name: 'Nova Pulse', type: 'weapon', desc: 'A massive expanding energy blast.', masteryDesc: 'MASTERY: Triggers a second echo pulse. (Purple Blast)', baseDamage: 25, baseCooldown: 180, baseArea: 1 },
  shieldBubble: { id: 'shieldBubble', name: 'Shield Bubble', type: 'weapon', desc: 'Pushes enemies away and damages them.', masteryDesc: 'MASTERY: Fires retaliatory lasers at enemies. (Golden Shield)', baseDamage: 10, baseCooldown: 240, baseArea: 1 },
  // Synergies
  burningBarrier: { id: 'burningBarrier', name: 'Burning Barrier', type: 'weapon', desc: 'SYNERGY: A fiery shield that burns and pushes enemies.', baseDamage: 8, baseCooldown: 180, baseArea: 1.5, isSynergy: true },
  laserNova: { id: 'laserNova', name: 'Laser Nova', type: 'weapon', desc: 'SYNERGY: An expanding blast of piercing lasers.', baseDamage: 30, baseCooldown: 150, baseArea: 1.2, isSynergy: true },
  thornySwarm: { id: 'thornySwarm', name: 'Plasma Swarm', type: 'weapon', desc: 'SYNERGY: Orbiting drones armed with plasma whips.', baseDamage: 12, baseCooldown: 90, baseArea: 1.5, isSynergy: true },
};

export const SYNERGIES = [
  { weapon1: 'napalm', weapon2: 'shieldBubble', result: 'burningBarrier' },
  { weapon1: 'napBeam', weapon2: 'novaPulse', result: 'laserNova' },
  { weapon1: 'vineWhip', weapon2: 'slothSwarm', result: 'thornySwarm' }
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
  { id: 't1_void_glow', name: 'Void Glow Orb', hp: 10, speed: 2.2, damage: 6, color: '#a855f7', radius: 36, xp: 1, tier: 1, spriteImage: loadSprite('ffb4f7068_void_glow_orb_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't1_nebula_jelly', name: 'Nebula Jelly', hp: 8, speed: 2.0, damage: 5, color: '#06b6d4', radius: 36, xp: 1, tier: 1, spriteImage: loadSprite('eb5805fe1_nebula_jelly_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't1_probe', name: 'Mini Probe Drone', hp: 12, speed: 2.5, damage: 8, color: '#84cc16', radius: 30, xp: 1, tier: 1, spriteImage: loadSprite('45cfb9820_mini_probe_drone_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't1_floater', name: 'Crystal Floater', hp: 14, speed: 1.8, damage: 7, color: '#ec4899', radius: 42, xp: 1, tier: 1, spriteImage: loadSprite('a70ff7ac4_crystal_floater_sheet.png'), frameCount: 16, animationSpeed: 0.15 },

  // Tier 2
  { id: 't2_serpent', name: 'Plasma Serpent', hp: 18, speed: 2.4, damage: 12, color: '#f97316', radius: 42, xp: 2, tier: 2, spriteImage: loadSprite('7baf81106_plasma_serpent_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't2_eye_tentacle', name: 'Eye Tentacle', hp: 22, speed: 1.5, damage: 15, color: '#d946ef', radius: 48, xp: 2, tier: 2, spriteImage: loadSprite('e1e15823a_eye_tentacle_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't2_spore_wasp', name: 'Spore Wasp', hp: 15, speed: 2.6, damage: 10, color: '#84cc16', radius: 36, xp: 2, tier: 2, spriteImage: loadSprite('3b545ef7a_spore_wasp_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't2_rock', name: 'Rock Fragment', hp: 35, speed: 0.8, damage: 14, color: '#f97316', radius: 54, xp: 2, tier: 2, isTank: true, spriteImage: loadSprite('0452ce6df_rock_fragment_sheet.png'), frameCount: 16, animationSpeed: 0.15 },

  // Tier 3
  { id: 't3_manta', name: 'Void Manta', hp: 30, speed: 2.0, damage: 16, color: '#8b5cf6', radius: 54, xp: 3, tier: 3, spriteImage: loadSprite('9842135cf_void_mantra_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't3_energy_phantom', name: 'Energy Phantom', hp: 28, speed: 1.8, damage: 15, color: '#0ea5e9', radius: 48, xp: 3, tier: 3, spriteImage: loadSprite('74d31fdc0_energy_phantom_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't3_starfish', name: 'Stellar Starfish', hp: 35, speed: 1.2, damage: 18, color: '#eab308', radius: 48, xp: 3, tier: 3, spriteImage: loadSprite('bdcbfb6bd_stellar_starfish_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't3_angler', name: 'Angler Lantern', hp: 32, speed: 1.5, damage: 17, color: '#3b82f6', radius: 54, xp: 3, tier: 3, spriteImage: loadSprite('b00d8e25b_angler_lantern_sheet.png'), frameCount: 16, animationSpeed: 0.15 },

  // Tier 4
  { id: 't4_spinner', name: 'Quantum Spinner', hp: 45, speed: 2.2, damage: 20, color: '#06b6d4', radius: 54, xp: 4, tier: 4, spriteImage: loadSprite('a2df90068_quantum_spinner_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't4_ribbon', name: 'Ribbon Phantom', hp: 40, speed: 1.9, damage: 22, color: '#d946ef', radius: 48, xp: 4, tier: 4, spriteImage: loadSprite('06dc947b3_ribbon_phantom_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't4_vortex', name: 'Vortex Drifter', hp: 55, speed: 1.4, damage: 25, color: '#ec4899', radius: 60, xp: 4, tier: 4, spriteImage: loadSprite('28251fe02_vortex_drifter_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't4_mothra', name: 'Neon Mothra', hp: 38, speed: 2.4, damage: 18, color: '#14b8a6', radius: 48, xp: 4, tier: 4, spriteImage: loadSprite('23d933892_neon_mothra_sheet.png'), frameCount: 16, animationSpeed: 0.15 },

  // Tier 5
  { id: 't5_spike_virus', name: 'Spike Virus', hp: 65, speed: 1.8, damage: 28, color: '#a855f7', radius: 60, xp: 5, tier: 5, spriteImage: loadSprite('9b4da0034_spike_virus_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't5_coral', name: 'Coral Bloom', hp: 80, speed: 1.2, damage: 25, color: '#f43f5e', radius: 66, xp: 5, tier: 5, spriteImage: loadSprite('c045ec43a_coral_bloom_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't5_blade', name: 'Blade Arrowhead', hp: 60, speed: 2.5, damage: 30, color: '#94a3b8', radius: 54, xp: 5, tier: 5, isRanged: true, spriteImage: loadSprite('e573c6ccc_blade_arrowhead_sheet.png'), frameCount: 16, animationSpeed: 0.15 },

  // Tier 6
  { id: 't6_chain_eye', name: 'Chain Eye', hp: 100, speed: 1.6, damage: 35, color: '#d946ef', radius: 72, xp: 6, tier: 6, isRanged: true, spriteImage: loadSprite('65ffb3fae_chain_eye_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't6_frost_wyrm', name: 'Frost Wyrm', hp: 120, speed: 1.8, damage: 38, color: '#38bdf8', radius: 78, xp: 6, tier: 6, spriteImage: loadSprite('ab422464d_frost_wyrm_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't6_flame_wyrm', name: 'Flame Wyrmling', hp: 90, speed: 2.2, damage: 42, color: '#ef4444', radius: 66, xp: 6, tier: 6, spriteImage: loadSprite('906ceba81_flame_wyrmling_sheet.png'), frameCount: 16, animationSpeed: 0.15 },

  // Tier 7
  { id: 't7_frost_specter', name: 'Frost Specter', hp: 150, speed: 1.7, damage: 48, color: '#0ea5e9', radius: 78, xp: 7, tier: 7, spriteImage: loadSprite('f6ad447be_frost_specter_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't7_thunder', name: 'Thunder Sphere', hp: 140, speed: 2.1, damage: 52, color: '#eab308', radius: 72, xp: 7, tier: 7, isRanged: true, spriteImage: loadSprite('5cbd6ac67_thunder_sphere_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't7_gear_swarm', name: 'Nano Gear Swarm', hp: 160, speed: 1.4, damage: 45, color: '#94a3b8', radius: 84, xp: 7, tier: 7, spriteImage: loadSprite('0987d4652_nano_gear_swarm_sheet.png'), frameCount: 16, animationSpeed: 0.15 },

  // Tier 8
  { id: 't8_whisper', name: 'Whispering Void', hp: 200, speed: 1.5, damage: 60, color: '#7e22ce', radius: 90, xp: 8, tier: 8, spriteImage: loadSprite('0438a0ffd_whispering_void_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't8_bio_bloom', name: 'Bio Bloom Pod', hp: 240, speed: 1.0, damage: 55, color: '#22c55e', radius: 96, xp: 8, tier: 8, spriteImage: loadSprite('578d7e2aa_bio_bloom_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't8_ray_fish', name: 'Cosmic Ray Fish', hp: 180, speed: 2.3, damage: 65, color: '#38bdf8', radius: 84, xp: 8, tier: 8, spriteImage: loadSprite('bcd99f449_cosmic_ray_fish_sheet.png'), frameCount: 16, animationSpeed: 0.15 },

  // Tier 9
  { id: 't9_lava_blob', name: 'Lava Rock Blob', hp: 300, speed: 1.2, damage: 85, color: '#ef4444', radius: 102, xp: 9, tier: 9, isTank: true, spriteImage: loadSprite('f01e56245_lava_rock_blob_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't9_jelly_swarm', name: 'Plasma Jelly Swarm', hp: 260, speed: 1.9, damage: 80, color: '#06b6d4', radius: 90, xp: 9, tier: 9, spriteImage: loadSprite('70f1f9342_plasma_jelly_swarm_sheet.png'), frameCount: 16, animationSpeed: 0.15 },

  // Tier 10
  { id: 't10_shadow', name: 'Shadow Stalker', hp: 420, speed: 2.2, damage: 120, color: '#1e293b', radius: 108, xp: 10, tier: 10, spriteImage: loadSprite('9199eef7e_shadow_stalker_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 't10_crystal_vortex', name: 'Crystal Vortex', hp: 480, speed: 1.6, damage: 130, color: '#d946ef', radius: 114, xp: 10, tier: 10, isRanged: true, spriteImage: loadSprite('703e0a56e_crystal_vortex_sheet.png'), frameCount: 16, animationSpeed: 0.15 },

  // Bosses (spawn anywhere at the end)
  { id: 'boss_shard_leviathan', name: 'Shard Leviathan', hp: 8000, speed: 0.8, damage: 60, color: '#8b5cf6', radius: 165, xp: 800, isBoss: true, spriteImage: loadSprite('005d73c1a_shard_leviathan_mini_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 'boss_horror_eye', name: 'Horror Eye Cluster', hp: 7000, speed: 0.6, damage: 70, color: '#ef4444', radius: 150, xp: 700, isBoss: true, spriteImage: loadSprite('a892b6caf_horror_eye_cluster_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 'boss_ink_shadow', name: 'Ink Shadow', hp: 9000, speed: 1.0, damage: 55, color: '#0f172a', radius: 180, xp: 900, isBoss: true, spriteImage: loadSprite('630af54e6_ink_shadow_sheet.png'), frameCount: 16, animationSpeed: 0.15 },
  { id: 'boss_star_eater', name: 'Star Eater', hp: 10000, speed: 0.5, damage: 80, color: '#f59e0b', radius: 195, xp: 1000, isBoss: true, spriteImage: loadSprite('34b7afc8e_star_eater_sheet.png'), frameCount: 16, animationSpeed: 0.15 }
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