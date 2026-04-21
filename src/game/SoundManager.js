import { SFXManager } from './SFXManager';

class SoundManagerClass {
    constructor() {
        this.bgm = new Audio();
        this.bgmTracks = [
            'https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3',
            'https://cdn.pixabay.com/audio/2025/07/28/audio_29231d4e9b.mp3',
            'https://cdn.pixabay.com/audio/2025/08/04/audio_749c34be55.mp3',
            'https://cdn.pixabay.com/audio/2025/07/28/audio_5a182bdc96.mp3',
            'https://cdn.pixabay.com/audio/2025/08/04/audio_94c12a9e7f.mp3',
            'https://cdn.pixabay.com/audio/2025/08/04/audio_124a05d23a.mp3',
            'https://cdn.pixabay.com/audio/2025/08/04/audio_6304a0f398.mp3',
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