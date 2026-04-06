class SoundManagerClass {
    constructor() {
        this.audioContext = null;
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
        this.bgm.loop = false; // Use ended event to play next track
        
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
        this.sfxVolume = savedSettings.sfxVolume !== undefined ? savedSettings.sfxVolume : 0.15;
        this.enabled = savedSettings.enabled !== undefined ? savedSettings.enabled : true;
        this.initialized = false;
        
        // Throttle maps to prevent audio overload
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
            localStorage.setItem('cosmic_sloth_settings', JSON.stringify({
                bgmVolume: this.bgm.volume,
                sfxVolume: this.sfxVolume,
                enabled: this.enabled
            }));
        } catch (e) {}
    }

    setBgmVolume(vol) {
        this.bgm.volume = vol;
        this.saveSettings();
    }

    setSfxVolume(vol) {
        this.sfxVolume = vol;
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
        return this.enabled;
    }

    isMuted() {
        return !this.enabled;
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

    playPickup() {
        if (this.throttle('pickup', 50)) return;
        this.playTone(800, 'sine', 0.1, 0.4);
        setTimeout(() => this.playTone(1200, 'sine', 0.15, 0.4), 30);
    }

    playGoldPickup() {
        if (this.throttle('gold', 100)) return;
        this.playTone(1200, 'square', 0.1, 0.3);
        setTimeout(() => this.playTone(1600, 'square', 0.2, 0.3), 50);
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

export const SoundManager = new SoundManagerClass();