import { SFXManager } from './SFXManager';

class SoundManagerClass {
    constructor() {
        this.bgm = new Audio();
        this.bgmTracks = [
            'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=8-bit-background-music-for-arcade-game-come-on-mario-164702.mp3',
            'https://opengameart.org/sites/default/files/8bit-spaceshooter.mp3',
            'https://opengameart.org/sites/default/files/space_quest_looped_section.mp3',
            'https://opengameart.org/sites/default/files/Orbital%20Colossus.mp3',
            'https://opengameart.org/sites/default/files/8Bit%20Title%20Screen.mp3',
            'https://opengameart.org/sites/default/files/Epic.mp3'
        ];
        this.currentTrackIndex = Math.floor(Math.random() * this.bgmTracks.length);
        this.bgm.src = this.bgmTracks[this.currentTrackIndex];
        this.bgm.loop = false;
        
        this.bgm.addEventListener('ended', () => {
            this.currentTrackIndex = (this.currentTrackIndex + 1) % this.bgmTracks.length;
            this.bgm.src = this.bgmTracks[this.currentTrackIndex];
            if (this.enabled) {
                this.bgm.play().catch(e => console.log("Audio play failed:", e));
            }
        });
        
        let savedSettings = {};
        try {
            savedSettings = JSON.parse(localStorage.getItem('cosmic_sloth_settings') || '{}');
        } catch (e) {}

        this.bgm.volume = savedSettings.bgmVolume !== undefined ? savedSettings.bgmVolume : 0.25;
        this.enabled = savedSettings.enabled !== undefined ? savedSettings.enabled : true;
    }

    init() {
        SFXManager.init();
    }

    playBGM() {
        if (!this.enabled) return;
        this.bgm.play().catch(e => console.log("Audio play failed (interaction required):", e));
    }

    stopBGM() {
        this.bgm.pause();
        this.bgm.currentTime = 0;
    }

    saveSettings() {
        try {
            const saved = JSON.parse(localStorage.getItem('cosmic_sloth_settings') || '{}');
            saved.bgmVolume = this.bgm.volume;
            saved.enabled = this.enabled;
            localStorage.setItem('cosmic_sloth_settings', JSON.stringify(saved));
        } catch (e) {}
    }

    setBgmVolume(vol) {
        this.bgm.volume = vol;
        this.saveSettings();
    }

    toggleMute() {
        this.enabled = !this.enabled;
        if (!this.enabled) {
            this.bgm.pause();
        } else {
            this.bgm.play().catch(e => console.log("Audio play failed:", e));
        }
        this.saveSettings();
        SFXManager.toggleMute(this.enabled);
        return this.enabled;
    }

    isMuted() {
        return !this.enabled;
    }

    // Facade for SFXManager to avoid breaking all UI components
    setSfxVolume(vol) { SFXManager.setSfxVolume(vol); }
    get sfxVolume() { return SFXManager.sfxVolume; }
    
    playPickup() { SFXManager.playPickup(); }
    playGoldPickup() { SFXManager.playGoldPickup(); }
    playEnemySpawn() { SFXManager.playEnemySpawn(); }
    playBossSpawn() { SFXManager.playBossSpawn(); }
    playEnemyHit() { SFXManager.playEnemyHit(); }
    playEnemyDeath() { SFXManager.playEnemyDeath(); }
    playPlayerHit() { SFXManager.playPlayerHit(); }
    playLevelUp() { SFXManager.playLevelUp(); }
    playUIClick() { SFXManager.playUIClick(); }
    playWeaponFire(id) { SFXManager.playWeaponFire(id); }
    playGameOver() { SFXManager.playGameOver(); }
    playVictory() { SFXManager.playVictory(); }
}

export const SoundManager = new SoundManagerClass();