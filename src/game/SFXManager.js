export class SFXManagerClass {
    constructor() {
        this.audioContext = null;
        let savedSettings = {};
        try {
            savedSettings = JSON.parse(localStorage.getItem('cosmic_sloth_settings') || '{}');
        } catch (e) {}

        this.sfxVolume = savedSettings.sfxVolume !== undefined ? savedSettings.sfxVolume : 0.15;
        this.enabled = savedSettings.enabled !== undefined ? savedSettings.enabled : true;
        this.initialized = false;
        this.lastPlayed = {};
    }

    init() {
        if (this.initialized) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.error("Web Audio API not supported");
        }
    }

    saveSettings() {
        try {
            const saved = JSON.parse(localStorage.getItem('cosmic_sloth_settings') || '{}');
            saved.sfxVolume = this.sfxVolume;
            saved.enabled = this.enabled;
            localStorage.setItem('cosmic_sloth_settings', JSON.stringify(saved));
        } catch (e) {}
    }

    setSfxVolume(vol) {
        this.sfxVolume = vol;
        this.saveSettings();
    }

    toggleMute(enabled) {
        this.enabled = enabled;
        this.saveSettings();
    }

    throttle(key, delayMs) {
        const now = Date.now();
        if (this.lastPlayed[key] && now - this.lastPlayed[key] < delayMs) {
            return true;
        }
        this.lastPlayed[key] = now;
        return false;
    }

    playTone(freq, type, duration, vol = 1) {
        if (!this.enabled || !this.audioContext) return;
        
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(vol * this.sfxVolume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
        
        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        osc.start();
        osc.stop(this.audioContext.currentTime + duration);
    }

    // XP pickup — pitch & richness scale with gem value
    // Small (<5): quick high blip. Medium (5-19): two-note. Large (20+): three-note ascending chord with a sub-bass thump.
    playPickup(value = 1) {
        if (this.throttle('pickup', 50)) return;
        if (value >= 20) {
            this.playTone(600, 'sine', 0.12, 0.45);
            setTimeout(() => this.playTone(900, 'sine', 0.14, 0.45), 35);
            setTimeout(() => this.playTone(1400, 'sine', 0.18, 0.5), 80);
            // Sub-bass for "weight"
            this.playTone(180, 'triangle', 0.15, 0.3);
        } else if (value >= 5) {
            this.playTone(800, 'sine', 0.1, 0.4);
            setTimeout(() => this.playTone(1200, 'sine', 0.15, 0.4), 30);
        } else {
            this.playTone(1100, 'sine', 0.06, 0.3);
        }
    }

    // Gold pickup — coin chime that gets richer with value.
    // Small (<10): single short coin. Medium (10-49): two-note. Large (50+): cascading three-note with sparkle.
    playGoldPickup(value = 1) {
        if (this.throttle('gold', 100)) return;
        if (value >= 50) {
            this.playTone(900, 'square', 0.08, 0.35);
            setTimeout(() => this.playTone(1300, 'square', 0.1, 0.35), 40);
            setTimeout(() => this.playTone(1800, 'square', 0.18, 0.4), 90);
            setTimeout(() => this.playTone(2400, 'sine', 0.12, 0.3), 140);
        } else if (value >= 10) {
            this.playTone(1200, 'square', 0.1, 0.3);
            setTimeout(() => this.playTone(1600, 'square', 0.2, 0.3), 50);
        } else {
            this.playTone(1500, 'square', 0.07, 0.25);
        }
    }

    playEnemySpawn() {
        if (this.throttle('spawn', 500)) return;
        this.playTone(150, 'sawtooth', 0.3, 0.2);
    }
    
    playBossSpawn() {
        this.playTone(100, 'sawtooth', 1.0, 0.8);
        setTimeout(() => this.playTone(80, 'sawtooth', 1.0, 0.8), 200);
        setTimeout(() => this.playTone(60, 'sawtooth', 1.5, 0.8), 400);
    }

    playEnemyHit() {
        if (this.throttle('hit', 30)) return;
        this.playTone(200, 'square', 0.05, 0.1);
    }

    playEnemyDeath() {
        if (this.throttle('death', 50)) return;
        this.playTone(100, 'sawtooth', 0.1, 0.15);
    }

    playPlayerHit() {
        if (this.throttle('playerHit', 200)) return;
        this.playTone(150, 'sawtooth', 0.3, 0.8);
        setTimeout(() => this.playTone(100, 'square', 0.4, 0.8), 100);
    }

    playLevelUp() {
        [440, 554, 659, 880].forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 'square', 0.4, 0.5), i * 120);
        });
    }

    playUIClick() {
        this.playTone(600, 'sine', 0.1, 0.5);
    }

    playWeaponFire(weaponId) {
        if (this.throttle(`weapon_${weaponId}`, 100)) return;
        
        if (weaponId === 'napBeam' || weaponId === 'laserNova') {
            this.playTone(400, 'square', 0.1, 0.2);
        } else if (weaponId === 'vineWhip' || weaponId === 'thornySwarm') {
            this.playTone(300, 'sawtooth', 0.15, 0.2);
        } else if (weaponId === 'novaPulse') {
            this.playTone(200, 'sine', 0.3, 0.3);
        } else if (weaponId === 'napalm') {
            this.playTone(150, 'triangle', 0.2, 0.2);
        } else {
            this.playTone(500, 'sine', 0.1, 0.1);
        }
    }
    
    playGameOver() {
        [300, 250, 200, 150].forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 'sawtooth', 0.5, 0.6), i * 300);
        });
    }
    
    playVictory() {
        [440, 554, 659, 880, 1108].forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 'square', 0.3, 0.6), i * 150);
        });
    }
}

export const SFXManager = new SFXManagerClass();