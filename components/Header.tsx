import React from 'react';
import { Settings, History as HistoryIcon, Zap, Moon, Sun, ArrowLeft } from 'lucide-react';
import { ThemeColor } from '../types';

type ViewMode = 'home' | 'edit' | 'generate' | 'video';

interface HeaderProps {
    view: ViewMode;
    isConnected: boolean;
    theme: ThemeColor | 'custom';
    darkMode: boolean;
    showSettings: boolean;
    showHistory: boolean;
    onBack: () => void;
    onToggleThemeMode: () => void;
    onToggleHistory: () => void;
    onToggleSettings: () => void;
    onLightningClick: () => void;
}

const Header: React.FC<HeaderProps> = ({
    view,
    isConnected,
    theme,
    darkMode,
    showSettings,
    showHistory,
    onBack,
    onToggleThemeMode,
    onToggleHistory,
    onToggleSettings,
    onLightningClick
}) => {
    return (
        <header className={`p-4 bg-white dark:bg-gray-900 flex justify-between items-center border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 transition-colors duration-300`}>
            <div className="flex items-center gap-2">
                {view !== 'home' && (
                    <button
                        onClick={onBack}
                        className="mr-1 p-1 -ml-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                    >
                        <ArrowLeft size={20} />
                    </button>
                )}
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-700 to-gray-900 dark:from-gray-100 dark:to-gray-400">
                    QwenfyUI
                </h1>
                <div onClick={onLightningClick} className="cursor-pointer">
                    <Zap
                        size={18}
                        fill="currentColor"
                        className={`transition-all duration-500 ${isConnected ? `text-${theme}-500` : 'text-red-500'}`}
                        style={isConnected ? { filter: `drop-shadow(0 0 3px currentColor)` } : {}}
                    />
                </div>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={onToggleThemeMode}
                    className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400`}
                >
                    {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                {view !== 'home' && (
                    <button
                        onClick={onToggleHistory}
                        className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${showHistory ? `text-${theme}-600 dark:text-${theme}-400` : 'text-gray-600 dark:text-gray-400'}`}
                    >
                        <HistoryIcon size={20} />
                    </button>
                )}
                <button
                    onClick={onToggleSettings}
                    className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${showSettings ? `text-${theme}-600 dark:text-${theme}-400` : 'text-gray-600 dark:text-gray-400'}`}
                >
                    <Settings size={20} />
                </button>
            </div>
        </header>
    );
};

export default Header;
