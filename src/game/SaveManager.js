export const SaveManager = {
  load: () => {
    try {
      const data = localStorage.getItem('cosmic_sloth_save');
      if (data) {
        const parsed = JSON.parse(data);
        const allChars = ['neobyte', 'pandypaws', 'novabyte', 'glitch', 'holodrift', 'codebreaker', 'dataphantom', 'neonvortex', 'synthbeats', 'skybyte'];
        parsed.unlockedCharacters = [...new Set([...(parsed.unlockedCharacters || []), ...allChars])];
        if (!parsed.unlockedArenas) parsed.unlockedArenas = ['station'];
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load save', e);
    }
    return {
      gold: 0,
      unlockedCharacters: ['neobyte', 'pandypaws', 'novabyte', 'glitch', 'holodrift', 'codebreaker', 'dataphantom', 'neonvortex', 'synthbeats', 'skybyte'],
      unlockedArenas: ['station'],
      permanentUpgrades: {
        damage: 0,
        health: 0,
        speed: 0,
        magnet: 0,
        regen: 0,
        cooldown: 0,
        luck: 0
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