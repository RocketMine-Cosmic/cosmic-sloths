export const SaveManager = {
  load: () => {
    try {
      const data = localStorage.getItem('cosmic_sloth_save');
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load save', e);
    }
    return {
      gold: 0,
      unlockedCharacters: ['neobyte'],
      unlockedArenas: ['station'],
      permanentUpgrades: {
        damage: 0,
        health: 0,
        speed: 0,
        magnet: 0,
        regen: 0
      }
    };
  },
  save: (data) => {
    try {
      localStorage.setItem('cosmic_sloth_save', JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save', e);
    }
  }
};