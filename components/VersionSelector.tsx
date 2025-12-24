import React from 'react';
import { ThemeColor } from '../types';

interface VersionSelectorProps {
    selectedVersion: '2509' | '2511';
    onVersionChange: (version: '2509' | '2511') => void;
    theme: ThemeColor;
}

// Theme color map for proper Tailwind styling
const themeColorMap: Record<ThemeColor, { bg: string; text: string; border: string }> = {
    violet: { bg: 'bg-violet-600', text: 'text-white', border: 'border-violet-600' },
    purple: { bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-600' },
    fuchsia: { bg: 'bg-fuchsia-600', text: 'text-white', border: 'border-fuchsia-600' },
    pink: { bg: 'bg-pink-600', text: 'text-white', border: 'border-pink-600' },
    rose: { bg: 'bg-rose-600', text: 'text-white', border: 'border-rose-600' },
    red: { bg: 'bg-red-600', text: 'text-white', border: 'border-red-600' },
    orange: { bg: 'bg-orange-600', text: 'text-white', border: 'border-orange-600' },
    amber: { bg: 'bg-amber-600', text: 'text-white', border: 'border-amber-600' },
    yellow: { bg: 'bg-yellow-600', text: 'text-white', border: 'border-yellow-600' },
    lime: { bg: 'bg-lime-600', text: 'text-white', border: 'border-lime-600' },
    green: { bg: 'bg-green-600', text: 'text-white', border: 'border-green-600' },
    emerald: { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-600' },
    teal: { bg: 'bg-teal-600', text: 'text-white', border: 'border-teal-600' },
    cyan: { bg: 'bg-cyan-600', text: 'text-white', border: 'border-cyan-600' },
    sky: { bg: 'bg-sky-600', text: 'text-white', border: 'border-sky-600' },
    blue: { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-600' },
    indigo: { bg: 'bg-indigo-600', text: 'text-white', border: 'border-indigo-600' },
    slate: { bg: 'bg-slate-600', text: 'text-white', border: 'border-slate-600' },
    custom: { bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-600' },
};

const VersionSelector: React.FC<VersionSelectorProps> = ({ selectedVersion, onVersionChange, theme }) => {
    const colors = themeColorMap[theme] || themeColorMap.violet;

    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Model Version
            </label>
            <div className="flex gap-2">
                <button
                    onClick={() => onVersionChange('2509')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedVersion === '2509'
                        ? `${colors.bg} ${colors.text} shadow-md`
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                >
                    2509 (Nunchaku)
                </button>
                <button
                    onClick={() => onVersionChange('2511')}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedVersion === '2511'
                        ? `${colors.bg} ${colors.text} shadow-md`
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                >
                    2511 (GGUF)
                </button>
            </div>
        </div>
    );
};

export default VersionSelector;
