
type SoundPattern = 'click' | 'success' | 'error' | 'delete';

class SoundService {
    private enabled: boolean = true;

    constructor() {
        if (typeof window !== 'undefined') {
            // Preload sounds (using base64 to avoid external dependencies for now, or simple oscillator if preferred)
            // For simplicity and zero-dependency, we'll use the Web Audio API to generate simple beeps/clicks
        }
    }

    public setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    public isEnabled(): boolean {
        return this.enabled;
    }

    private playTone(frequency: number, type: OscillatorType, duration: number, volume: number = 0.1) {
        if (!this.enabled || typeof window === 'undefined') return;

        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(frequency, ctx.currentTime);

            gain.gain.setValueAtTime(volume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (e) {
            console.warn('Sound playback failed', e);
        }
    }

    public play(pattern: SoundPattern) {
        if (!this.enabled) return;

        switch (pattern) {
            case 'click':
                // High pitched short click
                this.playTone(800, 'sine', 0.05, 0.05);
                break;
            case 'success':
                // Ascending chime
                this.playTone(600, 'sine', 0.1, 0.05);
                setTimeout(() => this.playTone(800, 'sine', 0.1, 0.05), 100);
                break;
            case 'error':
                // Low buzz
                this.playTone(150, 'sawtooth', 0.2, 0.05);
                break;
            case 'delete':
                // Descending
                this.playTone(400, 'sine', 0.1, 0.05);
                setTimeout(() => this.playTone(200, 'sine', 0.1, 0.05), 100);
                break;
        }
    }
}

export const sound = new SoundService();
