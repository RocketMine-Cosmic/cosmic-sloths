export const CHARACTERS = [
  { id: 'neobyte', name: 'NeoByte', desc: 'Commander. Balanced all-rounder.', hp: 120, speed: 3.0, armor: 2, regen: 0.1, cost: 0, color: '#4169E1', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/beab0f249_NeoByteF.png', damageMult: 1.0, cooldownMult: 1.0, areaMult: 1.0, magnetRange: 60, luck: 0, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 1.0 },
  { id: 'pandypaws', name: 'Pandypaws', desc: 'Heavy Armor Mechanic. Tanky but slow, low damage.', hp: 200, speed: 2.4, armor: 5, regen: 0.5, cost: 1000, color: '#FF69B4', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/82f3642e6_PandyPawsF.png', spriteSheet: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/5e376a00f_PandyPawsRun.png', damageMult: 0.8, cooldownMult: 1.2, areaMult: 1.2, magnetRange: 50, luck: 0, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 0.8 },
  { id: 'novabyte', name: 'NovaByte', desc: 'Comms & Demolitions. High area and damage, low HP.', hp: 80, speed: 3.0, armor: 0, regen: 0, cost: 2000, color: '#FF4500', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/9db3cfc07_NovaByteF.png', damageMult: 1.3, cooldownMult: 1.1, areaMult: 1.5, magnetRange: 60, luck: 0, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 1.0 },
  { id: 'glitch', name: 'Glitch', desc: 'Stealth Assassin. Very fast, high damage, fragile.', hp: 60, speed: 3.6, armor: 0, regen: 0, cost: 4000, color: '#8A2BE2', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/2469b9070_GlitchF.png', damageMult: 1.4, cooldownMult: 0.8, areaMult: 0.8, magnetRange: 40, luck: 1, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 1.2 },
  { id: 'holodrift', name: 'HoloDrift', desc: 'Engineer. High magnet range and XP gain.', hp: 100, speed: 2.9, armor: 1, regen: 0.1, cost: 6000, color: '#20B2AA', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/553fe0f67_HoloDriftF.png', damageMult: 0.9, cooldownMult: 1.0, areaMult: 1.0, magnetRange: 120, luck: 0, goldMult: 1.0, xpMult: 1.3, projSpeedMult: 1.0 },
  { id: 'codebreaker', name: 'CodeBreaker', desc: 'Cyber Warfare Hacker. Fast cooldowns, high luck.', hp: 90, speed: 3.1, armor: 1, regen: 0, cost: 8000, color: '#32CD32', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/d7c90aaac_CodeBreakerF.png', spriteSheet: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/88cfd1906_CodeBreakerRun.png', damageMult: 0.7, cooldownMult: 0.6, areaMult: 1.0, magnetRange: 60, luck: 3, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 1.0 },
  { id: 'dataphantom', name: 'DataPhantom', desc: 'Strategic Hacker. High projectile speed, good armor.', hp: 110, speed: 3.0, armor: 3, regen: 0.2, cost: 10000, color: '#4682B4', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/197092c32_DataPhantomF.png', damageMult: 1.0, cooldownMult: 1.0, areaMult: 1.0, magnetRange: 60, luck: 0, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 1.5 },
  { id: 'neonvortex', name: 'NeonVortex', desc: 'Elite Sniper. Extreme damage, very slow cooldowns.', hp: 50, speed: 3.2, armor: 0, regen: 0, cost: 15000, color: '#FFD700', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/467861605_NeonVortexF.png', damageMult: 2.0, cooldownMult: 1.5, areaMult: 0.7, magnetRange: 60, luck: 0, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 2.0 },
  { id: 'synthbeats', name: 'SynthBeats', desc: 'Diplomat. High gold gain and luck.', hp: 100, speed: 3.0, armor: 1, regen: 0.2, cost: 20000, color: '#FF8C00', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/9eb5364ba_SynthBeatsF.png', damageMult: 0.9, cooldownMult: 1.0, areaMult: 1.0, magnetRange: 70, luck: 2, goldMult: 1.5, xpMult: 1.0, projSpeedMult: 1.0 },
  { id: 'skybyte', name: 'SkyByte', desc: 'Ace Pilot. Very fast, good damage and area.', hp: 90, speed: 3.5, armor: 0, regen: 0, cost: 25000, color: '#00FFFF', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/3cbfa8254_SkyByteF.png', spriteSheet: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/04a8fb2b9_SkyByteRun.png', damageMult: 1.2, cooldownMult: 0.9, areaMult: 1.2, magnetRange: 60, luck: 0, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 1.3 }
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
  vineWhip: { id: 'vineWhip', name: 'Vine Whip', type: 'weapon', desc: 'Swipes nearby enemies.', masteryDesc: 'MASTERY: Heals player for 5% of damage dealt. (Red Whip)', baseDamage: 15, baseCooldown: 45, baseArea: 1 },
  slothSwarm: { id: 'slothSwarm', name: 'Sloth Swarm', type: 'weapon', desc: 'Orbiting baby sloths.', masteryDesc: 'MASTERY: Sloths move faster and shoot lasers. (Red Sloths)', baseDamage: 5, baseCooldown: 120, baseArea: 1 },
  napalm: { id: 'napalm', name: 'Zero-G Napalm', type: 'weapon', desc: 'Leaves burning pools.', masteryDesc: 'MASTERY: Blue fire that slows enemies by 50%.', baseDamage: 3, baseCooldown: 90, baseArea: 1 },
  novaPulse: { id: 'novaPulse', name: 'Nova Pulse', type: 'weapon', desc: 'A massive expanding energy blast.', masteryDesc: 'MASTERY: Triggers a second echo pulse. (Purple Blast)', baseDamage: 25, baseCooldown: 180, baseArea: 1 },
  shieldBubble: { id: 'shieldBubble', name: 'Shield Bubble', type: 'weapon', desc: 'Pushes enemies away and damages them.', masteryDesc: 'MASTERY: Fires retaliatory lasers at enemies. (Golden Shield)', baseDamage: 10, baseCooldown: 240, baseArea: 1 },
  // Synergies
  burningBarrier: { id: 'burningBarrier', name: 'Burning Barrier', type: 'weapon', desc: 'SYNERGY: A fiery shield that burns and pushes enemies.', baseDamage: 8, baseCooldown: 180, baseArea: 1.5, isSynergy: true },
  laserNova: { id: 'laserNova', name: 'Laser Nova', type: 'weapon', desc: 'SYNERGY: An expanding blast of piercing lasers.', baseDamage: 30, baseCooldown: 150, baseArea: 1.2, isSynergy: true },
  thornySwarm: { id: 'thornySwarm', name: 'Thorny Swarm', type: 'weapon', desc: 'SYNERGY: Orbiting sloths armed with vine whips.', baseDamage: 12, baseCooldown: 90, baseArea: 1.5, isSynergy: true },
};

export const SYNERGIES = [
  { weapon1: 'napalm', weapon2: 'shieldBubble', result: 'burningBarrier' },
  { weapon1: 'napBeam', weapon2: 'novaPulse', result: 'laserNova' },
  { weapon1: 'vineWhip', weapon2: 'slothSwarm', result: 'thornySwarm' }
];

export const UPGRADES = [
  { id: 'dmg_up', name: 'Muscle Mass', desc: '+10% Damage', type: 'passive', stat: 'damageMult', value: 0.1 },
  { id: 'spd_up', name: 'Morning Coffee', desc: '+10% Move Speed', type: 'passive', stat: 'speedMult', value: 0.1 },
  { id: 'hp_up', name: 'Thick Fur', desc: '+20 Max HP', type: 'passive', stat: 'maxHp', value: 20 },
  { id: 'area_up', name: 'Wide Reach', desc: '+10% Area of Effect', type: 'passive', stat: 'areaMult', value: 0.1 },
  { id: 'cd_down', name: 'Quick Naps', desc: '-5% Cooldowns', type: 'passive', stat: 'cooldownMult', value: -0.05 },
  { id: 'magnet_up', name: 'Gravity Boots', desc: '+25% Pickup Range', type: 'passive', stat: 'magnetRange', value: 25 },
  { id: 'regen_up', name: 'Photosynthesis', desc: '+0.5 HP/sec', type: 'passive', stat: 'regen', value: 0.5 },
  { id: 'armor_up', name: 'Titanium Helmet', desc: '+2 Armor', type: 'passive', stat: 'armor', value: 2 },
  { id: 'gold_up', name: 'Bounty Hunter', desc: '+20% Gold Drops', type: 'passive', stat: 'goldMult', value: 0.2 },
  { id: 'proj_spd', name: 'Thrusters', desc: '+15% Projectile Speed', type: 'passive', stat: 'projSpeedMult', value: 0.15 },
  { id: 'xp_up', name: 'Fast Learner', desc: '+15% XP Gain', type: 'passive', stat: 'xpMult', value: 0.15 },
  { id: 'dmg_up2', name: 'Protein Shake', desc: '+15% Damage', type: 'passive', stat: 'damageMult', value: 0.15 },
  { id: 'spd_up2', name: 'Energy Drink', desc: '+15% Move Speed', type: 'passive', stat: 'speedMult', value: 0.15 },
  { id: 'area_up2', name: 'Long Arms', desc: '+15% Area of Effect', type: 'passive', stat: 'areaMult', value: 0.15 },
  { id: 'cd_down2', name: 'Alarm Clock', desc: '-10% Cooldowns', type: 'passive', stat: 'cooldownMult', value: -0.1 },
  { id: 'magnet_up2', name: 'Black Hole Pocket', desc: '+50% Pickup Range', type: 'passive', stat: 'magnetRange', value: 50 },
  { id: 'w_napBeam', name: 'Cosmic Nap Beam', desc: 'Fires a piercing beam.', type: 'weapon', weaponId: 'napBeam' },
  { id: 'w_vineWhip', name: 'Vine Whip', desc: 'Swipes nearby enemies.', type: 'weapon', weaponId: 'vineWhip' },
  { id: 'w_slothSwarm', name: 'Sloth Swarm', desc: 'Orbiting baby sloths.', type: 'weapon', weaponId: 'slothSwarm' },
  { id: 'w_napalm', name: 'Zero-G Napalm', desc: 'Leaves burning pools.', type: 'weapon', weaponId: 'napalm' },
  { id: 'w_novaPulse', name: 'Nova Pulse', desc: 'A massive expanding energy blast.', type: 'weapon', weaponId: 'novaPulse' },
  { id: 'w_shieldBubble', name: 'Shield Bubble', desc: 'Pushes enemies away and damages them.', type: 'weapon', weaponId: 'shieldBubble' },
];

export const ENEMIES = [
  // Tier 1
  { id: 't1_drone', name: 'Scrap Drone', hp: 8, speed: 2.2, damage: 5, color: '#e0ffff', radius: 12, xp: 1, emoji: '🛸', tier: 1 },
  { id: 't1_mite', name: 'Dust Mite', hp: 10, speed: 2.0, damage: 6, color: '#8b7355', radius: 10, xp: 1, emoji: '🪨', tier: 1 },
  { id: 't1_tick', name: 'Space Tick', hp: 12, speed: 2.5, damage: 8, color: '#dddddd', radius: 10, xp: 1, emoji: '🕷️', tier: 1 },
  { id: 't1_bat', name: 'Cave Bat', hp: 10, speed: 2.6, damage: 7, color: '#ff00ff', radius: 12, xp: 1, emoji: '🦇', tier: 1 },
  { id: 't1_parasite', name: 'Hull Parasite', hp: 14, speed: 1.8, damage: 8, color: '#ff1493', radius: 12, xp: 1, emoji: '🦟', tier: 1 },

  // Tier 2
  { id: 't2_cyborg', name: 'Broken Cyborg', hp: 18, speed: 1.5, damage: 10, color: '#ff00ff', radius: 14, xp: 2, emoji: '🤖', tier: 2 },
  { id: 't2_jelly', name: 'Plasma Jelly', hp: 16, speed: 1.2, damage: 9, color: '#00ffff', radius: 14, xp: 2, emoji: '🦑', tier: 2 },
  { id: 't2_eye', name: 'Wandering Eye', hp: 20, speed: 1.6, damage: 12, color: '#ffffff', radius: 14, xp: 2, emoji: '👁️', tier: 2 },
  { id: 't2_flare', name: 'Ember Flare', hp: 18, speed: 2.4, damage: 15, color: '#ff4500', radius: 14, xp: 2, emoji: '☄️', tier: 2 },
  { id: 't2_scout', name: 'Recon Fish', hp: 22, speed: 2.2, damage: 11, color: '#c0c0c0', radius: 16, xp: 2, emoji: '🛸', tier: 2 },
  { id: 't2_sniper', name: 'Void Sniper', hp: 14, speed: 1.0, damage: 8, color: '#00ffcc', radius: 12, xp: 2, emoji: '🎯', tier: 2, isRanged: true },
  { id: 't2_tank', name: 'Ironclad Beetle', hp: 50, speed: 0.6, damage: 15, color: '#888888', radius: 20, xp: 3, emoji: '🪲', tier: 2, isTank: true },

  // Tier 3
  { id: 't3_turret', name: 'Auto Turret', hp: 35, speed: 0.6, damage: 18, color: '#aaaaaa', radius: 16, xp: 3, emoji: '🔫', tier: 3 },
  { id: 't3_crawler', name: 'Crystal Crawler', hp: 30, speed: 1.3, damage: 14, color: '#00ffff', radius: 15, xp: 3, emoji: '🦂', tier: 3 },
  { id: 't3_floater', name: 'Toxic Floater', hp: 28, speed: 1.1, damage: 16, color: '#dda0dd', radius: 18, xp: 3, emoji: '🐡', tier: 3 },
  { id: 't3_stalker', name: 'Void Stalker', hp: 32, speed: 2.1, damage: 18, color: '#4b0082', radius: 16, xp: 3, emoji: '👾', tier: 3 },
  { id: 't3_wraith', name: 'Frost Wraith', hp: 26, speed: 1.6, damage: 15, color: '#add8e6', radius: 16, xp: 3, emoji: '👻', tier: 3 },

  // Tier 4
  { id: 't4_worm', name: 'Crater Worm', hp: 45, speed: 1.6, damage: 20, color: '#aaaaaa', radius: 16, xp: 4, emoji: '🐛', tier: 4 },
  { id: 't4_grunt', name: 'Alien Grunt', hp: 40, speed: 1.9, damage: 18, color: '#32cd32', radius: 14, xp: 4, emoji: '👽', tier: 4 },
  { id: 't4_entity', name: 'Glitch Entity', hp: 38, speed: 2.3, damage: 17, color: '#00fa9a', radius: 14, xp: 4, emoji: '👾', tier: 4 },
  { id: 't4_elemental', name: 'Fire Elemental', hp: 50, speed: 1.3, damage: 22, color: '#ff0000', radius: 18, xp: 4, emoji: '🔥', tier: 4 },
  { id: 't4_spawn', name: 'Dark Spawn', hp: 55, speed: 1.8, damage: 20, color: '#483d8b', radius: 15, xp: 4, emoji: '🌀', tier: 4 },
  { id: 't4_artillery', name: 'Plasma Artillery', hp: 35, speed: 0.8, damage: 15, color: '#ff00ff', radius: 16, xp: 4, emoji: '☄️', tier: 4, isRanged: true },
  { id: 't4_juggernaut', name: 'Cosmic Juggernaut', hp: 120, speed: 0.5, damage: 25, color: '#555555', radius: 25, xp: 5, emoji: '🛡️', tier: 4, isTank: true },

  // Tier 5
  { id: 't5_brute', name: 'Asteroid Brute', hp: 70, speed: 0.8, damage: 25, color: '#8b7355', radius: 20, xp: 5, emoji: '🦍', tier: 5 },
  { id: 't5_fiend', name: 'Shadow Fiend', hp: 65, speed: 1.9, damage: 24, color: '#191970', radius: 18, xp: 5, emoji: '🦇', tier: 5 },
  { id: 't5_shambler', name: 'Dimension Shambler', hp: 60, speed: 1.6, damage: 26, color: '#ff00ff', radius: 16, xp: 5, emoji: '🐙', tier: 5 },
  { id: 't5_golem', name: 'Shard Golem', hp: 75, speed: 0.9, damage: 28, color: '#00ffff', radius: 22, xp: 5, emoji: '🧊', tier: 5 },
  { id: 't5_horror', name: 'Event Horror', hp: 85, speed: 1.1, damage: 30, color: '#800080', radius: 20, xp: 5, emoji: '👁️‍🗨️', tier: 5 },

  // Tier 6
  { id: 't6_dragon', name: 'Space Dragon', hp: 110, speed: 1.6, damage: 35, color: '#ff4500', radius: 25, xp: 6, emoji: '🐉', tier: 6 },
  { id: 't6_whale', name: 'Pulsar Whale', hp: 120, speed: 1.4, damage: 32, color: '#e0ffff', radius: 24, xp: 6, emoji: '🐋', tier: 6 },
  { id: 't6_slug', name: 'Gravity Slug', hp: 130, speed: 1.0, damage: 38, color: '#483d8b', radius: 22, xp: 6, emoji: '🐌', tier: 6 },
  { id: 't6_wasp', name: 'Nebula Wasp', hp: 90, speed: 2.5, damage: 30, color: '#00ff00', radius: 18, xp: 6, emoji: '🐝', tier: 6 },
  { id: 't6_ray', name: 'Cosmic Ray', hp: 100, speed: 2.2, damage: 28, color: '#ff1493', radius: 20, xp: 6, emoji: '🪼', tier: 6 },
  { id: 't6_launcher', name: 'Missile Silo', hp: 80, speed: 0.4, damage: 40, color: '#ffaa00', radius: 22, xp: 6, emoji: '🚀', tier: 6, isRanged: true },
  { id: 't6_goliath', name: 'Void Goliath', hp: 300, speed: 0.4, damage: 45, color: '#222222', radius: 35, xp: 8, emoji: '🧱', tier: 6, isTank: true },

  // Tier 7
  { id: 't7_behemoth', name: 'Iron Behemoth', hp: 160, speed: 0.7, damage: 45, color: '#2f4f4f', radius: 26, xp: 7, emoji: '🦏', tier: 7 },
  { id: 't7_phantom', name: 'Ice Phantom', hp: 140, speed: 1.7, damage: 40, color: '#add8e6', radius: 22, xp: 7, emoji: '👻', tier: 7 },
  { id: 't7_seraph', name: 'Solar Seraph', hp: 150, speed: 2.0, damage: 48, color: '#ffd700', radius: 24, xp: 7, emoji: '👼', tier: 7 },
  { id: 't7_weaver', name: 'Reality Weaver', hp: 135, speed: 1.8, damage: 42, color: '#ff00ff', radius: 20, xp: 7, emoji: '🕷️', tier: 7 },
  { id: 't7_kraken', name: 'Star Kraken', hp: 170, speed: 1.2, damage: 50, color: '#8b7355', radius: 28, xp: 7, emoji: '🦑', tier: 7 },

  // Tier 8
  { id: 't8_titan', name: 'Obsidian Titan', hp: 220, speed: 0.6, damage: 60, color: '#000000', radius: 30, xp: 8, emoji: '🗿', tier: 8 },
  { id: 't8_leviathan', name: 'Void Leviathan', hp: 200, speed: 1.5, damage: 55, color: '#1a0033', radius: 28, xp: 8, emoji: '🦕', tier: 8 },
  { id: 't8_wyrm', name: 'Abyssal Wyrm', hp: 190, speed: 1.9, damage: 58, color: '#1a0b2e', radius: 26, xp: 8, emoji: '🐍', tier: 8 },
  { id: 't8_overlord', name: 'Shadow Overlord', hp: 180, speed: 2.2, damage: 65, color: '#191970', radius: 24, xp: 8, emoji: '👑', tier: 8 },
  { id: 't8_monolith', name: 'Crystal Monolith', hp: 250, speed: 0.5, damage: 70, color: '#00ced1', radius: 32, xp: 8, emoji: '💎', tier: 8 },

  // Tier 9
  { id: 't9_apex_drone', name: 'Apex Drone', hp: 260, speed: 2.6, damage: 75, color: '#00ff00', radius: 22, xp: 9, emoji: '🛸', tier: 9 },
  { id: 't9_apex_fiend', name: 'Apex Fiend', hp: 280, speed: 2.1, damage: 80, color: '#000000', radius: 26, xp: 9, emoji: '🦇', tier: 9 },
  { id: 't9_apex_horror', name: 'Apex Horror', hp: 320, speed: 1.4, damage: 90, color: '#800080', radius: 30, xp: 9, emoji: '👁️‍🗨️', tier: 9 },
  { id: 't9_apex_dragon', name: 'Apex Dragon', hp: 300, speed: 1.8, damage: 85, color: '#ff4500', radius: 34, xp: 9, emoji: '🐉', tier: 9 },
  { id: 't9_apex_elemental', name: 'Apex Elemental', hp: 290, speed: 1.6, damage: 88, color: '#ff0000', radius: 28, xp: 9, emoji: '🔥', tier: 9 },

  // Tier 10
  { id: 't10_god', name: 'Cosmic God', hp: 450, speed: 1.5, damage: 120, color: '#ffffff', radius: 36, xp: 10, emoji: '✨', tier: 10 },
  { id: 't10_terror', name: 'Void Terror', hp: 500, speed: 1.2, damage: 130, color: '#000000', radius: 40, xp: 10, emoji: '🕳️', tier: 10 },
  { id: 't10_eater', name: 'Star Eater', hp: 480, speed: 1.4, damage: 125, color: '#e0ffff', radius: 38, xp: 10, emoji: '🌌', tier: 10 },
  { id: 't10_ripper', name: 'Dimension Ripper', hp: 420, speed: 1.8, damage: 140, color: '#ff00ff', radius: 32, xp: 10, emoji: '⚡', tier: 10 },
  { id: 't10_swarm', name: 'Omega Swarm', hp: 400, speed: 2.8, damage: 110, color: '#32cd32', radius: 28, xp: 10, emoji: '🦠', tier: 10 },

  // Bosses (spawn anywhere at the end)
  { id: 'boss_nebula_lord', name: 'Nebula Overlord', hp: 6000, speed: 0.9, damage: 40, color: '#800080', radius: 50, xp: 600, isBoss: true, emoji: '🦑' },
  { id: 'boss_supernova', name: 'Supernova Core', hp: 8000, speed: 0.7, damage: 50, color: '#ff8c00', radius: 55, xp: 800, isBoss: true, emoji: '🌞' },
  { id: 'boss_blackhole', name: 'Event Horizon Entity', hp: 10000, speed: 0.5, damage: 80, color: '#000000', radius: 65, xp: 1000, isBoss: true, emoji: '🕳️' },
  { id: 'boss_alien_queen', name: 'Alien Queen', hp: 7000, speed: 0.8, damage: 45, color: '#32cd32', radius: 60, xp: 700, isBoss: true, emoji: '👑' }
];

export const CHARACTER_TALENTS = {
  neobyte: [
    { id: 'neo_1', name: 'Commander Aura', desc: '+10% Area', cost: 1000, stat: 'areaMult', value: 0.1 },
    { id: 'neo_2', name: 'Tactical Reload', desc: '-10% Cooldown', cost: 2500, stat: 'cooldownMult', value: -0.1 },
    { id: 'neo_3', name: 'Orbital Strike', desc: '+25% Damage', cost: 5000, stat: 'damageMult', value: 0.25 }
  ],
  pandypaws: [
    { id: 'pan_1', name: 'Extra Plating', desc: '+3 Armor', cost: 1000, stat: 'armor', value: 3 },
    { id: 'pan_2', name: 'Bear Hug', desc: '+20% Area', cost: 2500, stat: 'areaMult', value: 0.2 },
    { id: 'pan_3', name: 'Juggernaut', desc: '+50 Max HP', cost: 5000, stat: 'maxHp', value: 50 }
  ],
  novabyte: [
    { id: 'nova_1', name: 'Blast Shield', desc: '+20 Max HP', cost: 1000, stat: 'maxHp', value: 20 },
    { id: 'nova_2', name: 'Volatile Mix', desc: '+15% Damage', cost: 2500, stat: 'damageMult', value: 0.15 },
    { id: 'nova_3', name: 'Chain Reaction', desc: '+30% Area', cost: 5000, stat: 'areaMult', value: 0.3 }
  ],
  glitch: [
    { id: 'gli_1', name: 'Overclock', desc: '+10% Speed', cost: 1000, stat: 'speedMult', value: 0.1 },
    { id: 'gli_2', name: 'Critical Error', desc: '+1 Luck', cost: 2500, stat: 'luck', value: 1 },
    { id: 'gli_3', name: 'System Wipe', desc: '+30% Damage', cost: 5000, stat: 'damageMult', value: 0.3 }
  ],
  holodrift: [
    { id: 'holo_1', name: 'Data Mining', desc: '+10% XP', cost: 1000, stat: 'xpMult', value: 0.1 },
    { id: 'holo_2', name: 'Wider Net', desc: '+30 Magnet', cost: 2500, stat: 'magnetRange', value: 30 },
    { id: 'holo_3', name: 'Holographic Decoy', desc: '+20% Speed', cost: 5000, stat: 'speedMult', value: 0.2 }
  ],
  codebreaker: [
    { id: 'code_1', name: 'Bypass', desc: '-5% Cooldown', cost: 1000, stat: 'cooldownMult', value: -0.05 },
    { id: 'code_2', name: 'Root Access', desc: '+15% Gold', cost: 2500, stat: 'goldMult', value: 0.15 },
    { id: 'code_3', name: 'God Mode', desc: '+2 Luck', cost: 5000, stat: 'luck', value: 2 }
  ],
  dataphantom: [
    { id: 'data_1', name: 'Ghost Protocol', desc: '+10% Speed', cost: 1000, stat: 'speedMult', value: 0.1 },
    { id: 'data_2', name: 'Firewall', desc: '+2 Armor', cost: 2500, stat: 'armor', value: 2 },
    { id: 'data_3', name: 'DDoS', desc: '+20% Proj Speed', cost: 5000, stat: 'projSpeedMult', value: 0.2 }
  ],
  neonvortex: [
    { id: 'neon_1', name: 'Focus', desc: '+10% Proj Speed', cost: 1000, stat: 'projSpeedMult', value: 0.1 },
    { id: 'neon_2', name: 'Dead Eye', desc: '+20% Damage', cost: 2500, stat: 'damageMult', value: 0.2 },
    { id: 'neon_3', name: 'Singularity', desc: '+30% Area', cost: 5000, stat: 'areaMult', value: 0.3 }
  ],
  synthbeats: [
    { id: 'syn_1', name: 'Crowd Control', desc: '+10% Area', cost: 1000, stat: 'areaMult', value: 0.1 },
    { id: 'syn_2', name: 'Merch Sales', desc: '+20% Gold', cost: 2500, stat: 'goldMult', value: 0.2 },
    { id: 'syn_3', name: 'Encore', desc: '-15% Cooldown', cost: 5000, stat: 'cooldownMult', value: -0.15 }
  ],
  skybyte: [
    { id: 'sky_1', name: 'Aerodynamics', desc: '+10% Speed', cost: 1000, stat: 'speedMult', value: 0.1 },
    { id: 'sky_2', name: 'Evasive Maneuvers', desc: '+2 Armor', cost: 2500, stat: 'armor', value: 2 },
    { id: 'sky_3', name: 'Carpet Bomb', desc: '+25% Area', cost: 5000, stat: 'areaMult', value: 0.25 }
  ]
};