
import React from 'react';
import { Zap, Loader2, Square } from 'lucide-react';
import { GenerationStatus, AppSettings } from '../types';
import { haptic } from '../services/hapticService';
import { sound } from '../services/soundService';

interface GenerationBottomBarProps {
    view: 'home' | 'edit' | 'generate' | 'video';
    status: GenerationStatus;
    progress: number;
    statusMessage: string;
    handleGenerateClick: () => void;
    handleInterrupt: (e: React.MouseEvent) => void;
    settings: AppSettings;
}

const GenerationBottomBar: React.FC<GenerationBottomBarProps> = ({
    view,
    status,
    progress,
    statusMessage,
    handleGenerateClick,
    handleInterrupt,
    settings
}) => {
    return (
        <div className="fixed bottom-0 w-full max-w-md bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 p-4 flex gap-3 items-center z-40 transition-colors duration-300">
            <button
                onClick={() => {
                    handleGenerateClick();
                    haptic.trigger('heavy');
                    sound.play('click');
                }}
                disabled={status !== GenerationStatus.IDLE && status !== GenerationStatus.FINISHED && status !== GenerationStatus.ERROR}
                className={`flex-1 relative h-12 rounded-xl font-bold text-white shadow-lg overflow-hidden transition-all
                    ${(status === GenerationStatus.IDLE || status === GenerationStatus.FINISHED || status === GenerationStatus.ERROR)
                        ? `bg-${settings.theme}-600 hover:bg-${settings.theme}-500 hover:scale-[1.02] active:scale-[0.98]`
                        : 'bg-gray-400 dark:bg-gray-800 cursor-not-allowed'}`}
            >
                {/* Progress Bar Background */}
                {(status === GenerationStatus.EXECUTING || status === GenerationStatus.UPLOADING || status === GenerationStatus.QUEUED) && (
                    <div
                        className={`absolute left-0 top-0 h-full bg-${settings.theme}-700 transition-all duration-300 ease-out`}
                        style={{ width: `${progress}%` }}
                    />
                )}

                <div className="relative z-10 flex items-center justify-center gap-2 w-full h-full">
                    {status === GenerationStatus.IDLE || status === GenerationStatus.FINISHED || status === GenerationStatus.ERROR ? (
                        <>
                            <Zap size={20} className={status === GenerationStatus.FINISHED ? "text-yellow-300" : ""} />
                            <span>{view === 'edit' ? 'Edit Image' : 'Generate'}</span>
                        </>
                    ) : (
                        <>
                            {status === GenerationStatus.UPLOADING && <span className="animate-pulse">{statusMessage || "Uploading..."}</span>}
                            {status === GenerationStatus.QUEUED && <span className="animate-pulse">{statusMessage || "Queued..."}</span>}
                            {status === GenerationStatus.EXECUTING && (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    <span>
                                        {/* Show percentage if generating, otherwise show granular status message */}
                                        {progress > 0 ? `${progress}%` : (statusMessage || "Processing...")}
                                    </span>
                                </>
                            )}
                        </>
                    )}
                </div>
            </button>

            {/* Stop Button - Only visible when busy */}
            {(status === GenerationStatus.EXECUTING || status === GenerationStatus.QUEUED) && (
                <button
                    onClick={handleInterrupt}
                    className="h-12 w-12 flex items-center justify-center bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900 text-red-600 dark:text-red-200 rounded-xl border border-red-200 dark:border-red-800 transition-colors"
                    title="Stop Generation"
                >
                    <Square size={20} fill="currentColor" />
                </button>
            )}
        </div>
    );
};

export default GenerationBottomBar;
