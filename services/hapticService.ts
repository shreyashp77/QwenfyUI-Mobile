
type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

class HapticService {
    private enabled: boolean = true;

    constructor() {
        // Check if vibration is supported
        if (typeof window !== 'undefined' && !window.navigator.vibrate) {
            console.log('Haptic feedback not supported on this device');
        }
    }

    public setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    public isEnabled(): boolean {
        return this.enabled;
    }

    public isSupported(): boolean {
        return typeof window !== 'undefined' && !!window.navigator.vibrate;
    }

    public trigger(pattern: HapticPattern) {
        if (!this.enabled || typeof window === 'undefined' || !window.navigator.vibrate) {
            return;
        }

        try {
            switch (pattern) {
                case 'light':
                    window.navigator.vibrate(10); // Subtle click
                    break;
                case 'medium':
                    window.navigator.vibrate(40); // Mode switch / Toggle
                    break;
                case 'heavy':
                    window.navigator.vibrate(70); // Strong interaction
                    break;
                case 'success':
                    window.navigator.vibrate([50, 50, 50]); // Da-da-da
                    break;
                case 'warning':
                    window.navigator.vibrate([30, 50, 30]); // Short-Long-Short
                    break;
                case 'error':
                    window.navigator.vibrate([50, 100, 50, 100]); // Long buzzes
                    break;
            }
        } catch (e) {
            // Ignore errors (some browsers might block if not user initiated)
            console.warn('Haptic trigger failed', e);
        }
    }
}

export const haptic = new HapticService();
