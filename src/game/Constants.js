export const CHARACTERS = [
  { id: 'rookie', name: 'Rookie Sloth', desc: 'A well-rounded sleepy astronaut.', hp: 100, speed: 1.5, armor: 0, regen: 0, cost: 0, color: '#8B4513' },
  { id: 'tank', name: 'Tank Sloth', desc: 'Thick spacesuit. Very slow, very tough.', hp: 200, speed: 1.0, armor: 5, regen: 0.5, cost: 500, color: '#556B2F' },
  { id: 'speedy', name: 'Speedy Sloth', desc: 'Relatively fast for a sloth.', hp: 75, speed: 2.2, armor: 0, regen: 0, cost: 1000, color: '#D2691E' },
  { id: 'engineer', name: 'Engineer Sloth', desc: 'Starts with advanced tech.', hp: 100, speed: 1.4, armor: 2, regen: 0, cost: 2000, color: '#A0522D' }
];

export const ARENAS = [
  { id: 'station', name: 'Derelict Station', bg: '#1a1a2e' },
  { id: 'asteroid', name: 'Asteroid Belt', bg: '#2d1b19' },
  { id: 'nebula', name: 'Nebula Hall', bg: '#2b103a' }
];

export const WEAPONS = {
  napBeam: { id: 'napBeam', name: 'Cosmic Nap Beam', type: 'weapon', desc: 'Fires a piercing beam.', baseDamage: 10, baseCooldown: 60, baseArea: 1 },
  vineWhip: { id: 'vineWhip', name: 'Vine Whip', type: 'weapon', desc: 'Swipes nearby enemies.', baseDamage: 15, baseCooldown: 45, baseArea: 1 },
  slothSwarm: { id: 'slothSwarm', name: 'Sloth Swarm', type: 'weapon', desc: 'Orbiting baby sloths.', baseDamage: 5, baseCooldown: 120, baseArea: 1 },
  napalm: { id: 'napalm', name: 'Zero-G Napalm', type: 'weapon', desc: 'Leaves burning pools.', baseDamage: 3, baseCooldown: 90, baseArea: 1 },
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
];

export const ENEMIES = [
  { id: 'drone', name: 'Alien Drone', hp: 10, speed: 2, damage: 5, color: '#00ffff', radius: 8, xp: 1 },
  { id: 'pirate', name: 'Space Pirate', hp: 25, speed: 1.2, damage: 10, color: '#ff00ff', radius: 12, xp: 3 },
  { id: 'worm', name: 'Void Worm', hp: 15, speed: 1.8, damage: 8, color: '#8a2be2', radius: 10, xp: 2 },
  { id: 'asteroid', name: 'Asteroid Frag', hp: 50, speed: 0.5, damage: 15, color: '#a9a9a9', radius: 15, xp: 5 },
  { id: 'jelly', name: 'Space Jelly', hp: 30, speed: 1, damage: 12, color: '#7fffd4', radius: 14, xp: 4 },
  { id: 'elite', name: 'Elite Pirate', hp: 200, speed: 1.5, damage: 20, color: '#ff1493', radius: 20, xp: 50 }
];