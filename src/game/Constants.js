export const CHARACTERS = [
  { id: 'neobyte', name: 'NeoByte', desc: 'Commander. Balanced all-rounder.', hp: 120, speed: 3.0, armor: 2, regen: 0.1, cost: 0, color: '#4169E1', damageMult: 1.0, cooldownMult: 1.0, areaMult: 1.0, magnetRange: 60, luck: 0, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 1.0 },
  { id: 'pandypaws', name: 'Pandypaws', desc: 'Heavy Armor Mechanic. Tanky but slow, low damage.', hp: 200, speed: 2.4, armor: 5, regen: 0.5, cost: 1000, color: '#FF69B4', damageMult: 0.8, cooldownMult: 1.2, areaMult: 1.2, magnetRange: 50, luck: 0, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 0.8 },
  { id: 'novabyte', name: 'NovaByte', desc: 'Comms & Demolitions. High area and damage, low HP.', hp: 80, speed: 3.0, armor: 0, regen: 0, cost: 2000, color: '#FF4500', damageMult: 1.3, cooldownMult: 1.1, areaMult: 1.5, magnetRange: 60, luck: 0, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 1.0 },
  { id: 'glitch', name: 'Glitch', desc: 'Stealth Assassin. Very fast, high damage, fragile.', hp: 60, speed: 3.6, armor: 0, regen: 0, cost: 4000, color: '#8A2BE2', damageMult: 1.4, cooldownMult: 0.8, areaMult: 0.8, magnetRange: 40, luck: 1, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 1.2 },
  { id: 'holodrift', name: 'HoloDrift', desc: 'Engineer. High magnet range and XP gain.', hp: 100, speed: 2.9, armor: 1, regen: 0.1, cost: 6000, color: '#20B2AA', damageMult: 0.9, cooldownMult: 1.0, areaMult: 1.0, magnetRange: 120, luck: 0, goldMult: 1.0, xpMult: 1.3, projSpeedMult: 1.0 },
  { id: 'codebreaker', name: 'CodeBreaker', desc: 'Cyber Warfare Hacker. Fast cooldowns, high luck.', hp: 90, speed: 3.1, armor: 1, regen: 0, cost: 8000, color: '#32CD32', damageMult: 0.7, cooldownMult: 0.6, areaMult: 1.0, magnetRange: 60, luck: 3, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 1.0 },
  { id: 'dataphantom', name: 'DataPhantom', desc: 'Strategic Hacker. High projectile speed, good armor.', hp: 110, speed: 3.0, armor: 3, regen: 0.2, cost: 10000, color: '#4682B4', damageMult: 1.0, cooldownMult: 1.0, areaMult: 1.0, magnetRange: 60, luck: 0, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 1.5 },
  { id: 'neonvortex', name: 'NeonVortex', desc: 'Elite Sniper. Extreme damage, very slow cooldowns.', hp: 50, speed: 3.2, armor: 0, regen: 0, cost: 15000, color: '#FFD700', damageMult: 2.0, cooldownMult: 1.5, areaMult: 0.7, magnetRange: 60, luck: 0, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 2.0 },
  { id: 'synthbeats', name: 'SynthBeats', desc: 'Diplomat. High gold gain and luck.', hp: 100, speed: 3.0, armor: 1, regen: 0.2, cost: 20000, color: '#FF8C00', damageMult: 0.9, cooldownMult: 1.0, areaMult: 1.0, magnetRange: 70, luck: 2, goldMult: 1.5, xpMult: 1.0, projSpeedMult: 1.0 },
  { id: 'skybyte', name: 'SkyByte', desc: 'Ace Pilot. Very fast, good damage and area.', hp: 90, speed: 3.5, armor: 0, regen: 0, cost: 25000, color: '#00FFFF', damageMult: 1.2, cooldownMult: 0.9, areaMult: 1.2, magnetRange: 60, luck: 0, goldMult: 1.0, xpMult: 1.0, projSpeedMult: 1.3 }
];

export const ARENAS = [
  { id: 'station', name: 'Derelict Station', bg: '#1a1a2e', duration: 180 },
  { id: 'asteroid', name: 'Asteroid Belt', bg: '#2d1b19', duration: 210 },
  { id: 'nebula', name: 'Nebula Hall', bg: '#2b103a', duration: 240 },
  { id: 'void', name: 'The Deep Void', bg: '#0a0a0a', duration: 270 },
  { id: 'plasma', name: 'Plasma Core', bg: '#3a001e', duration: 300 },
  { id: 'crystal', name: 'Crystal Caverns', bg: '#002222', duration: 330 },
  { id: 'moon', name: 'Shattered Moon', bg: '#112233', duration: 360 },
  { id: 'blackhole', name: 'Event Horizon', bg: '#000000', duration: 390 },
  { id: 'mothership', name: 'Alien Mothership', bg: '#220022', duration: 420 },
  { id: 'dimension', name: 'Dimension X', bg: '#110033', duration: 450 }
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
  { id: 'stardust_mite', name: 'Stardust Mite', hp: 10, speed: 2.2, damage: 5, color: '#e0ffff', radius: 10, xp: 1, pixels: [
    " 11 ",
    "1221",
    "1111",
    "1  1"
  ]},
  { id: 'nebula_jelly', name: 'Nebula Jelly', hp: 20, speed: 1.2, damage: 8, color: '#ff00ff', radius: 14, xp: 2, pixels: [
    "  1111  ",
    " 122221 ",
    "11111111",
    "11 11 11",
    "1  1  1 "
  ]},
  { id: 'plasma_wraith', name: 'Plasma Wraith', hp: 35, speed: 1.5, damage: 12, color: '#00ffff', radius: 16, xp: 4, pixels: [
    "  111  ",
    " 12121 ",
    " 11111 ",
    "  111  ",
    " 1   1 "
  ]},
  { id: 'asteroid_brute', name: 'Asteroid Brute', hp: 80, speed: 0.6, damage: 20, color: '#8b7355', radius: 20, xp: 6, pixels: [
    "  1111  ",
    " 131131 ",
    "11111111",
    "13111131",
    " 113311 ",
    "  1111  "
  ]},
  { id: 'void_stalker', name: 'Void Stalker', hp: 45, speed: 2.0, damage: 15, color: '#4b0082', radius: 16, xp: 5, pixels: [
    "1    1",
    "11  11",
    " 1111 ",
    " 1221 ",
    "  11  "
  ]},
  { id: 'solar_flare', name: 'Solar Flare', hp: 25, speed: 2.5, damage: 18, color: '#ff4500', radius: 14, xp: 4, pixels: [
    "  1  ",
    " 121 ",
    "12321",
    " 121 ",
    "  1  "
  ]},
  { id: 'elite_dark_matter', name: 'Dark Matter Anomaly', hp: 300, speed: 1.2, damage: 25, color: '#191970', radius: 26, xp: 60, pixels: [
    "  111111  ",
    " 13311331 ",
    "1311111131",
    "1112222111",
    "1112222111",
    "1311111131",
    " 13311331 ",
    "  111111  "
  ]},
  { id: 'elite_pulsar', name: 'Pulsar Sentinel', hp: 250, speed: 1.8, damage: 30, color: '#00ced1', radius: 24, xp: 60, pixels: [
    "   11   ",
    "  1221  ",
    " 123321 ",
    "12311321",
    "12311321",
    " 123321 ",
    "  1221  ",
    "   11   "
  ]},
  { id: 'boss_nebula_lord', name: 'Nebula Overlord', hp: 6000, speed: 0.9, damage: 40, color: '#800080', radius: 50, xp: 600, isBoss: true, pixels: [
    "    111111    ",
    "  1122222211  ",
    " 122333333221 ",
    "12331111113321",
    "12312211221321",
    "12312211221321",
    "12331111113321",
    " 122333333221 ",
    "  1122222211  ",
    "    111111    ",
    "   11    11   ",
    "  11      11  "
  ]},
  { id: 'boss_supernova', name: 'Supernova Core', hp: 8000, speed: 0.7, damage: 50, color: '#ff8c00', radius: 55, xp: 800, isBoss: true, pixels: [
    "      11      ",
    "    112211    ",
    "   12233221   ",
    "  1233333321  ",
    " 123311113321 ",
    " 123122221321 ",
    "12331233213321",
    "12331233213321",
    " 123122221321 ",
    " 123311113321 ",
    "  1233333321  ",
    "   12233221   ",
    "    112211    ",
    "      11      "
  ]},
  { id: 'boss_blackhole', name: 'Event Horizon Entity', hp: 10000, speed: 0.5, damage: 80, color: '#000000', radius: 65, xp: 1000, isBoss: true, pixels: [
    "      3333      ",
    "    33111133    ",
    "   3113333113   ",
    "  313300003313  ",
    " 31300222200313 ",
    " 31302000020313 ",
    "3130200000020313",
    "3130200000020313",
    " 31302000020313 ",
    " 31300222200313 ",
    "  313300003313  ",
    "   3113333113   ",
    "    33111133    ",
    "      3333      "
  ]}
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