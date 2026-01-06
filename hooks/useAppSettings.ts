
import { useState, useEffect } from 'react';
import { AppSettings, ThemeColor } from '../types';
import { THEME_OPTIONS } from '../constants';
import { adjustBrightness } from '../utils/colorUtils';

const DEFAULT_SERVER = '/api/comfy';
const DEFAULT_COMFYUI_PATH = import.meta.env.VITE_COMFYUI_PATH || '';

export const useAppSettings = () => {
    const [settings, setSettings] = useState<AppSettings>(() => {
        // Load settings from local storage to persist user preferences across refreshes
        const saved = localStorage.getItem('qwen_settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Ensure darkMode exists if loading old settings
                if (parsed.darkMode === undefined) parsed.darkMode = true;
                if (parsed.enableRemoteInput === undefined) parsed.enableRemoteInput = false;
                if (parsed.randomizeSeed === undefined) parsed.randomizeSeed = true;
                if (parsed.enableComparison === undefined) parsed.enableComparison = false;
                // Migration: If either was enabled, enable feedback
                if (parsed.enableFeedback === undefined) {
                    parsed.enableFeedback = (parsed.enableHaptics !== false) || (parsed.enableSound !== false);
                }

                // Repair invalid server address from bad local storage state
                if (!parsed.serverAddress || parsed.serverAddress.includes('://:')) {
                    parsed.serverAddress = DEFAULT_SERVER;
                }

                // Migration: Add comfyUIBasePath if missing
                if (parsed.comfyUIBasePath === undefined) {
                    parsed.comfyUIBasePath = DEFAULT_COMFYUI_PATH;
                }

                // Migration: Add stripMetadata if missing
                if (parsed.stripMetadata === undefined) {
                    parsed.stripMetadata = false;
                }

                // Migration: Default incognito to true for privacy
                if (parsed.incognito === undefined) {
                    parsed.incognito = true;
                }

                return parsed;
            } catch (e) {
                console.error("Failed to parse settings", e);
            }
        }
        return {
            serverAddress: DEFAULT_SERVER,
            nsfwMode: false,
            enableRemoteInput: false,
            darkMode: true,
            theme: THEME_OPTIONS[Math.floor(Math.random() * THEME_OPTIONS.length)],
            customColor: '#ffffff',
            randomizeSeed: true,
            enableComparison: false,
            enableFeedback: true,
            incognito: true,
            stripMetadata: false,
            comfyUIBasePath: DEFAULT_COMFYUI_PATH
        };
    });

    // Apply Dark Mode to HTML root
    useEffect(() => {
        if (settings.darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [settings.darkMode]);

    // Apply Custom Theme CSS Variables
    useEffect(() => {
        if (settings.theme === 'custom' && settings.customColor) {
            const root = document.documentElement;
            const base = settings.customColor;

            // Generate shades
            root.style.setProperty('--theme-500', base);
            root.style.setProperty('--theme-400', adjustBrightness(base, 15));
            root.style.setProperty('--theme-300', adjustBrightness(base, 30));
            root.style.setProperty('--theme-200', adjustBrightness(base, 50));

            root.style.setProperty('--theme-600', adjustBrightness(base, -10));
            root.style.setProperty('--theme-700', adjustBrightness(base, -20));
            root.style.setProperty('--theme-900', adjustBrightness(base, -40));
        }
    }, [settings.theme, settings.customColor]);

    // Persist settings
    useEffect(() => {
        localStorage.setItem('qwen_settings', JSON.stringify(settings));
    }, [settings]);

    const setTheme = (theme: ThemeColor) => setSettings(prev => ({ ...prev, theme }));
    const setDarkMode = (darkMode: boolean) => setSettings(prev => ({ ...prev, darkMode }));

    return { settings, setSettings, setTheme, setDarkMode };
};
