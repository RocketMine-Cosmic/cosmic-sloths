// NFT-based perk system
// Maps NFT metadata to passive bonuses

export const NFT_PERK_MAPPINGS = {
  // Mapping NFT collection/name patterns to perk types
  // Adjust patterns based on your actual OmenX NFT names/metadata
};

export const PERKS = {
  GOLD_MULTIPLIER: { id: 'gold_mult', name: 'Gold Multiplier', baseValue: 1.1 }, // 10% bonus
  UPGRADE_COST_REDUCTION: { id: 'upgrade_cost', name: 'Reduced Upgrade Costs', baseValue: 0.9 }, // 10% discount
  RELIC_FRAGMENT_BONUS: { id: 'relic_bonus', name: 'Relic Fragment Bonus', baseValue: 1.15 }, // 15% more fragments
};

// Default perks (will be enhanced by NFT ownership)
const DEFAULT_PERKS = {
  goldMultiplier: 1.0,
  upgradeCostMultiplier: 1.0,
  relicFragmentMultiplier: 1.0,
};

export class NFTPerkManager {
  static perks = { ...DEFAULT_PERKS };

  static applyNFTPerks(nftData) {
    // Reset to defaults
    this.perks = { ...DEFAULT_PERKS };

    if (!nftData || !Array.isArray(nftData)) return;

    // Check for specific NFT patterns and apply perks
    const nftNames = nftData.map(nft => 
      (typeof nft === 'string' ? nft : nft.name || '').toLowerCase().trim()
    );

    console.log('[NFTPerkManager] Applying perks for NFTs:', nftNames);

    // Example: Any NFT owner gets gold bonus
    if (nftNames.length > 0) {
      this.perks.goldMultiplier = 1.1; // +10% gold
      this.perks.upgradeCostMultiplier = 0.9; // -10% upgrade costs
      console.log('[NFTPerkManager] Holder perks applied');
    }

    // You can add more sophisticated mapping here:
    // if (nftNames.includes('rare_sloth')) { this.perks.goldMultiplier = 1.2; }
    // if (nftNames.includes('legendary_sloth')) { this.perks.upgradeCostMultiplier = 0.8; this.perks.relicFragmentMultiplier = 1.2; }

    return this.perks;
  }

  static getGoldMultiplier() {
    return this.perks.goldMultiplier;
  }

  static getUpgradeCostMultiplier() {
    return this.perks.upgradeCostMultiplier;
  }

  static getRelicFragmentMultiplier() {
    return this.perks.relicFragmentMultiplier;
  }

  static getActivePerks() {
    const active = [];
    if (this.perks.goldMultiplier > 1.0) {
      active.push({ ...PERKS.GOLD_MULTIPLIER, value: this.perks.goldMultiplier });
    }
    if (this.perks.upgradeCostMultiplier < 1.0) {
      active.push({ ...PERKS.UPGRADE_COST_REDUCTION, value: this.perks.upgradeCostMultiplier });
    }
    if (this.perks.relicFragmentMultiplier > 1.0) {
      active.push({ ...PERKS.RELIC_FRAGMENT_BONUS, value: this.perks.relicFragmentMultiplier });
    }
    return active;
  }
}