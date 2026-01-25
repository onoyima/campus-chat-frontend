// Sound Manager
// Uses consistent sound effects for the application

const SOUNDS = {
    message: "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3", // Pop
    group: "https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3",   // Double Pop
    announcement: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3", // Bell
    call: "https://assets.mixkit.co/active_storage/sfx/2060/2060-preview.mp3" // Phone Ring
};

class SoundManager {
    private audioCache: Map<string, HTMLAudioElement> = new Map();

    constructor() {
        // Preload sounds
        if (typeof window !== 'undefined') {
            Object.values(SOUNDS).forEach(url => {
                const audio = new Audio(url);
                audio.load();
                this.audioCache.set(url, audio);
            });
        }
    }

    play(type: 'message' | 'group' | 'announcement' | 'call') {
        const url = SOUNDS[type];
        if (!url) return;

        try {
            const audio = this.audioCache.get(url) || new Audio(url);
            audio.currentTime = 0;
            audio.play().catch(e => console.warn("Audio play failed (user interaction required first?)", e));
            
            if (!this.audioCache.has(url)) {
                this.audioCache.set(url, audio);
            }
        } catch (err) {
            console.error("Sound error", err);
        }
    }
}

export const soundManager = new SoundManager();
