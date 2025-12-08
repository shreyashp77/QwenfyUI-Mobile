import React from 'react';
import { Check, Trash2 } from 'lucide-react';
import { AppSettings, ThemeColor } from '../types';
import { haptic } from '../services/hapticService';
import { sound } from '../services/soundService';

const THEME_OPTIONS: ThemeColor[] = [
    'purple', 'violet', 'fuchsia', 'pink', 'rose', 'red',
    'orange', 'amber', 'yellow', 'lime', 'green', 'emerald',
    'teal', 'cyan', 'sky', 'blue', 'indigo'
];

const COLOR_HEX: Record<string, string> = {
    purple: '#a855f7',
    violet: '#8b5cf6',
    fuchsia: '#d946ef',
    pink: '#ec4899',
    rose: '#f43f5e',
    red: '#ef4444',
    orange: '#f97316',
    amber: '#f59e0b',
    yellow: '#eab308',
    lime: '#84cc16',
    green: '#22c55e',
    emerald: '#10b981',
    teal: '#14b8a6',
    cyan: '#06b6d4',
    sky: '#0ea5e9',
    blue: '#3b82f6',
    indigo: '#6366f1',
    slate: '#64748b'
};

interface SettingsPanelProps {
    settings: AppSettings;
    onSettingsChange: (newSettings: AppSettings) => void;
    onClearHistory: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
    settings,
    onSettingsChange,
    onClearHistory
}) => {
    return (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 animate-fade-in absolute w-full z-30 shadow-2xl transition-colors duration-300">
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">ComfyUI Server Address</label>
                    <input
                        type="text"
                        value={settings.serverAddress}
                        onChange={(e) => onSettingsChange({ ...settings, serverAddress: e.target.value })}
                        className={`w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 text-sm text-gray-800 dark:text-gray-200 focus:border-${settings.theme}-500 outline-none transition-colors`}
                    />
                </div>

                {/* Theme Selector */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">Interface Color</label>
                    <div className="grid grid-cols-6 gap-2">
                        {THEME_OPTIONS.map(color => (
                            <button
                                key={color}
                                onClick={() => onSettingsChange({ ...settings, theme: color })}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${settings.theme === color ? 'ring-2 ring-gray-400 dark:ring-white scale-110' : 'opacity-60 hover:opacity-100'}`}
                                style={{ backgroundColor: COLOR_HEX[color] }}
                                title={color.charAt(0).toUpperCase() + color.slice(1)}
                            >
                                {settings.theme === color && <Check size={14} className="text-white drop-shadow-sm" />}
                            </button>
                        ))}

                        {/* Custom Color Picker */}
                        <div className="relative w-8 h-8">
                            <div
                                className={`w-full h-full rounded-full flex items-center justify-center transition-all overflow-hidden bg-gradient-to-br from-red-500 via-green-500 to-blue-500 ${settings.theme === 'custom' ? 'ring-2 ring-gray-400 dark:ring-white scale-110' : 'opacity-60 hover:opacity-100'}`}
                                title="Custom Color"
                            >
                                {settings.theme === 'custom' && <Check size={14} className="text-white drop-shadow-md" />}
                            </div>
                            <input
                                type="color"
                                value={settings.customColor || '#ffffff'}
                                onChange={(e) => onSettingsChange({ ...settings, theme: 'custom', customColor: e.target.value })}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                title="Choose custom color"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-800">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">NSFW Blur</span>
                    <button
                        onClick={() => onSettingsChange({ ...settings, nsfwMode: !settings.nsfwMode })}
                        className={`w-12 h-6 rounded-full relative transition-colors ${settings.nsfwMode ? `bg-${settings.theme}-600` : 'bg-gray-300 dark:bg-gray-700'}`}
                    >
                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.nsfwMode ? 'translate-x-6' : ''}`} />
                    </button>
                </div>

                {/* Comparison Slider Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Comparison Slider</span>
                        <span className="text-[10px] text-gray-500">Show Before/After slider for edits</span>
                    </div>
                    <button
                        onClick={() => onSettingsChange({ ...settings, enableComparison: !settings.enableComparison })}
                        className={`w-12 h-6 rounded-full relative transition-colors ${settings.enableComparison ? `bg-${settings.theme}-600` : 'bg-gray-300 dark:bg-gray-700'}`}
                    >
                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.enableComparison ? 'translate-x-6' : ''}`} />
                    </button>
                </div>

                {/* Feedback Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sounds/Haptics</span>
                        <span className="text-[10px] text-gray-500">Vibration (Android) or Sound (iOS)</span>
                    </div>
                    <button
                        onClick={() => {
                            onSettingsChange({ ...settings, enableFeedback: !settings.enableFeedback });
                            if (!settings.enableFeedback) {
                                // Trigger feedback immediately to demonstrate
                                if (haptic.isSupported()) {
                                    haptic.trigger('medium');
                                } else {
                                    sound.play('click');
                                }
                            }
                        }}
                        className={`w-12 h-6 rounded-full relative transition-colors ${settings.enableFeedback ? `bg-${settings.theme}-600` : 'bg-gray-300 dark:bg-gray-700'}`}
                    >
                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.enableFeedback ? 'translate-x-6' : ''}`} />
                    </button>
                </div>

                <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                    <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase">Server Data</h3>
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={onClearHistory}
                            className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 py-2 rounded text-sm transition-colors border border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-800"
                        >
                            <Trash2 size={14} /> Clear History
                        </button>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
