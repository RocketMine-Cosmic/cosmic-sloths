export const CHARACTERS = [
  { id: 'neobyte', name: 'NeoByte', desc: 'Commander. Uses electrified claws and heavy armor.', hp: 150, speed: 2.9, armor: 3, regen: 0.2, cost: 0, color: '#4169E1' },
  { id: 'pandypaws', name: 'Pandypaws', desc: 'Heavy Armor Mechanic. Frontline powerhouse in a mech suit.', hp: 250, speed: 2.5, armor: 6, regen: 0.5, cost: 500, color: '#FF69B4' },
  { id: 'novabyte', name: 'NovaByte', desc: 'Comms & Demolitions. Specializes in controlled destruction.', hp: 100, speed: 3.1, armor: 1, regen: 0, cost: 1000, color: '#FF4500' },
  { id: 'glitch', name: 'Glitch', desc: 'Stealth Assassin. Silent killer with energy daggers.', hp: 80, speed: 3.7, armor: 0, regen: 0, cost: 1500, color: '#8A2BE2' },
  { id: 'holodrift', name: 'HoloDrift', desc: 'Engineer & Drone Specialist. Brilliant but awkward.', hp: 110, speed: 2.8, armor: 2, regen: 0.1, cost: 2000, color: '#20B2AA' },
  { id: 'codebreaker', name: 'CodeBreaker', desc: 'Cyber Warfare Hacker. Aggressive digital manipulator.', hp: 90, speed: 3.0, armor: 1, regen: 0, cost: 2500, color: '#32CD32' },
  { id: 'dataphantom', name: 'DataPhantom', desc: 'Strategic Hacker. Fights with kinetic pulse gloves.', hp: 120, speed: 3.1, armor: 2, regen: 0.2, cost: 3000, color: '#4682B4' },
  { id: 'neonvortex', name: 'NeonVortex', desc: 'Elite Sniper. Long-range executioner.', hp: 70, speed: 3.3, armor: 0, regen: 0, cost: 3500, color: '#FFD700' },
  { id: 'synthbeats', name: 'SynthBeats', desc: 'Diplomat & Spotter. Calm under pressure.', hp: 100, speed: 3.0, armor: 1, regen: 0.3, cost: 4000, color: '#FF8C00' },
  { id: 'skybyte', name: 'SkyByte', desc: 'Ace Pilot. Precision, control, and dual laser blasters.', hp: 130, speed: 3.5, armor: 2, regen: 0, cost: 5000, color: '#00FFFF' }
];

export const ARENAS = [
  { id: 'station', name: 'Derelict Station', bg: '#1a1a2e', duration: 300 },
  { id: 'asteroid', name: 'Asteroid Belt', bg: '#2d1b19', duration: 300 },
  { id: 'nebula', name: 'Nebula Hall', bg: '#2b103a', duration: 300 },
  { id: 'void', name: 'The Deep Void', bg: '#0a0a0a', duration: 300 },
  { id: 'plasma', name: 'Plasma Core', bg: '#3a001e', duration: 300 },
  { id: 'crystal', name: 'Crystal Caverns', bg: '#002222', duration: 300 },
  { id: 'moon', name: 'Shattered Moon', bg: '#112233', duration: 300 },
  { id: 'blackhole', name: 'Event Horizon', bg: '#000000', duration: 300 },
  { id: 'mothership', name: 'Alien Mothership', bg: '#220022', duration: 300 },
  { id: 'dimension', name: 'Dimension X', bg: '#110033', duration: 300 }
];

export const WEAPONS = {
  napBeam: { id: 'napBeam', name: 'Cosmic Nap Beam', type: 'weapon', desc: 'Fires a piercing beam.', baseDamage: 10, baseCooldown: 60, baseArea: 1 },
  vineWhip: { id: 'vineWhip', name: 'Vine Whip', type: 'weapon', desc: 'Swipes nearby enemies.', baseDamage: 15, baseCooldown: 45, baseArea: 1 },
  slothSwarm: { id: 'slothSwarm', name: 'Sloth Swarm', type: 'weapon', desc: 'Orbiting baby sloths.', baseDamage: 5, baseCooldown: 120, baseArea: 1 },
  napalm: { id: 'napalm', name: 'Zero-G Napalm', type: 'weapon', desc: 'Leaves burning pools.', baseDamage: 3, baseCooldown: 90, baseArea: 1 },
  novaPulse: { id: 'novaPulse', name: 'Nova Pulse', type: 'weapon', desc: 'A massive expanding energy blast.', baseDamage: 25, baseCooldown: 180, baseArea: 1 },
  shieldBubble: { id: 'shieldBubble', name: 'Shield Bubble', type: 'weapon', desc: 'Pushes enemies away and damages them.', baseDamage: 10, baseCooldown: 240, baseArea: 1 },
};

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
  { id: 'drone', name: 'Alien Drone', hp: 10, speed: 2, damage: 5, color: '#00ffff', radius: 8, xp: 1 },
  { id: 'pirate', name: 'Space Pirate', hp: 25, speed: 1.2, damage: 10, color: '#ff00ff', radius: 12, xp: 3 },
  { id: 'worm', name: 'Void Worm', hp: 15, speed: 1.8, damage: 8, color: '#8a2be2', radius: 10, xp: 2 },
  { id: 'asteroid', name: 'Asteroid Frag', hp: 50, speed: 0.5, damage: 15, color: '#a9a9a9', radius: 15, xp: 5 },
  { id: 'jelly', name: 'Space Jelly', hp: 30, speed: 1, damage: 12, color: '#7fffd4', radius: 14, xp: 4 },
  { id: 'elite', name: 'Elite Pirate', hp: 200, speed: 1.5, damage: 20, color: '#ff1493', radius: 20, xp: 50 }
];