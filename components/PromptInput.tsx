
import React from 'react';
import { History, Trash2 } from 'lucide-react';
import PromptManager from './PromptManager';
import { AppSettings } from '../types';

interface PromptInputProps {
    prompt: string;
    setPrompt: (prompt: string) => void;
    settings: AppSettings;
    promptHistory: string[];
    view: 'home' | 'edit' | 'generate' | 'video';
}

const PromptInput: React.FC<PromptInputProps> = ({
    prompt,
    setPrompt,
    settings,
    promptHistory,
    view
}) => {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800 relative shadow-sm transition-colors duration-300">
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-gray-500">Positive Prompt</span>
                {settings.enableRemoteInput && (
                    <PromptManager
                        currentPrompt={prompt}
                        serverAddress={settings.serverAddress}
                        onLoadPrompt={setPrompt}
                        theme={settings.theme}
                        workflow={view}
                    />
                )}
            </div>
            {/* Prompt History (Generate Mode Only) */}
            {view === 'generate' && promptHistory.length > 0 && (
                <div className="mb-2 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {promptHistory.map((p, idx) => (
                        <button
                            key={idx}
                            onClick={() => setPrompt(p)}
                            className={`flex-shrink-0 text-[10px] px-2 py-1 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-${settings.theme}-50 dark:hover:bg-${settings.theme}-900/20 hover:text-${settings.theme}-600 dark:hover:text-${settings.theme}-400 hover:border-${settings.theme}-200 dark:hover:border-${settings.theme}-800 transition-all truncate max-w-[150px] flex items-center gap-1`}
                            title={p}
                        >
                            <History size={10} />
                            {p}
                        </button>
                    ))}
                </div>
            )}
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={view === 'edit' ? "Describe your edit..." : view === 'video' ? "Describe the video you want to generate..." : "Describe the image you want to generate..."}
                className={`w-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 rounded p-3 text-sm min-h-[100px] focus:ring-1 focus:ring-${settings.theme}-500 outline-none border border-gray-300 dark:border-gray-800 placeholder-gray-400 dark:placeholder-gray-600 resize-none transition-colors`}
            />
            <div className="flex justify-end mt-2">
                <button
                    onClick={() => setPrompt("")}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                    <Trash2 size={12} /> Clear Prompt
                </button>
            </div>
        </div>
    );
};

export default PromptInput;
