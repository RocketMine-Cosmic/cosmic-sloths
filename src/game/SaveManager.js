export const SaveManager = {
  load: () => {
    const defaultChars = ['neobyte', 'pandypaws', 'novabyte'];
    const defaultSave = {
      gold: 0,
      rerollTokens: 0,
      unlockedCharacters: [...defaultChars],
      foundCharacters: [],
      unlockedArenasByCharacter: {},
      permanentUpgrades: {
        damage: 0, health: 0, speed: 0, magnet: 0, regen: 0, cooldown: 0, luck: 0
      }
    };

    try {
      const data = localStorage.getItem('cosmic_sloth_save');
      if (data) {
        const parsed = JSON.parse(data);
        if (!parsed.foundCharacters) parsed.foundCharacters = [];
        
        const last7 = ['glitch', 'holodrift', 'codebreaker', 'dataphantom', 'neonvortex', 'synthbeats', 'skybyte'];
        
        if (parsed.unlockedCharacters) {
            parsed.unlockedCharacters = parsed.unlockedCharacters.filter(c => !last7.includes(c) || parsed.foundCharacters.includes(c));
        } else {
            parsed.unlockedCharacters = [...defaultChars];
        }

        if (!parsed.unlockedArenasByCharacter) {
            parsed.unlockedArenasByCharacter = {};
            parsed.unlockedCharacters.forEach(c => {
                parsed.unlockedArenasByCharacter[c] = parsed.unlockedArenas || ['station'];
            });
        }
        
        return { ...defaultSave, ...parsed };
      }
    } catch (e) {
      console.error('Failed to load save', e);
    }
    return defaultSave;
  },
  save: (data) => {
    try {
      localStorage.setItem('cosmic_sloth_save', JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save', e);
    }
  }
};