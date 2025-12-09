import React from 'react';
import { Wand2, PenTool, Monitor } from 'lucide-react';
import { ThemeColor } from '../types';
import { haptic } from '../services/hapticService';
import { sound } from '../services/soundService';

type ViewMode = 'home' | 'edit' | 'generate' | 'video';

interface HomeScreenProps {
    theme: ThemeColor | 'custom';
    onSelectView: (view: ViewMode) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ theme, onSelectView }) => {
    const handleSelect = (view: ViewMode) => {
        onSelectView(view);
        haptic.trigger('medium');
        sound.play('click');
    };

    return (
        <main className="p-6 flex flex-col items-center justify-center min-h-[80vh] gap-6">
            <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome</h2>
                <p className="text-gray-500 dark:text-gray-400">Choose a workflow to begin</p>
            </div>

            <button
                onClick={() => handleSelect('generate')}
                className={`w-full max-w-sm group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl border-2 border-transparent hover:border-${theme}-500 transition-all transform hover:scale-[1.02]`}
            >
                <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-${theme}-500`}>
                    <Wand2 size={100} />
                </div>
                <div className="relative z-10 flex flex-col items-start">
                    <div className={`p-3 rounded-xl bg-${theme}-100 dark:bg-${theme}-900/50 text-${theme}-600 dark:text-${theme}-400 mb-4`}>
                        <Wand2 size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Generate Image</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-left">Create new images from text prompts using Z Image Turbo.</p>
                </div>
            </button>

            <button
                onClick={() => handleSelect('edit')}
                className={`w-full max-w-sm group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl border-2 border-transparent hover:border-${theme}-500 transition-all transform hover:scale-[1.02]`}
            >
                <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-${theme}-500`}>
                    <PenTool size={100} />
                </div>
                <div className="relative z-10 flex flex-col items-start">
                    <div className={`p-3 rounded-xl bg-${theme}-100 dark:bg-${theme}-900/50 text-${theme}-600 dark:text-${theme}-400 mb-4`}>
                        <PenTool size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Edit Image</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-left">Modify existing images with Qwen Image Edit.</p>
                </div>
            </button>

            <button
                onClick={() => handleSelect('video')}
                className={`w-full max-w-sm group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl border-2 border-transparent hover:border-${theme}-500 transition-all transform hover:scale-[1.02]`}
            >
                <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-${theme}-500`}>
                    <Monitor size={100} />
                </div>
                <div className="relative z-10 flex flex-col items-start">
                    <div className={`p-3 rounded-xl bg-${theme}-100 dark:bg-${theme}-900/50 text-${theme}-600 dark:text-${theme}-400 mb-4`}>
                        <Monitor size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Generate Video</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-left">Animate images using Wan 2.2 Video Generation.</p>
                </div>
            </button>
        </main>
    );
};

export default HomeScreen;
