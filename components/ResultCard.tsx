import React from 'react';
import { Check, Clock, PenTool, Monitor, ExternalLink, ChevronDown } from 'lucide-react';
import { ThemeColor } from '../types';

interface ResultCardProps {
    images: string[];
    duration: number;
    nsfwMode: boolean;
    resultRevealed: boolean;
    theme: ThemeColor | 'custom';
    onUseResult: (targetView: 'edit' | 'video') => void;
    onClear: () => void;
    onImageClick: () => void;
}

const ResultCard: React.FC<ResultCardProps> = ({
    images,
    duration,
    nsfwMode,
    resultRevealed,
    theme,
    onUseResult,
    // onClear,
    onImageClick
}) => {
    const [isMinimized, setIsMinimized] = React.useState(false);

    if (!images || images.length === 0) return null;

    const isFirstItemVideo = images[0].match(/\.(mp4|webm|mov)($|\?|&)/i);

    return (
        <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden animate-fade-in transition-colors duration-300">
            <div
                className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                onClick={() => setIsMinimized(!isMinimized)}
            >
                <span className={`text-xs font-medium text-${theme}-600 dark:text-${theme}-400 flex items-center gap-1`}>
                    <Check size={12} /> Generation Complete {images.length > 1 ? `(${images.length})` : ''}
                </span>
                <div className="flex gap-4">
                    {/* Only show "Use as Input" buttons if first image is an image */}
                    {!isFirstItemVideo && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); onUseResult('edit'); }}
                                className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1"
                                title="Use as Edit Input"
                            >
                                <PenTool size={14} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onUseResult('video'); }}
                                className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1"
                                title="Use as Video Input"
                            >
                                <Monitor size={14} />
                            </button>
                        </>
                    )}
                    {isFirstItemVideo && (
                        <button
                            onClick={(e) => { e.stopPropagation(); window.open(images[0], '_blank'); }}
                            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1"
                            title="Open in New Tab"
                        >
                            <ExternalLink size={14} />
                        </button>
                    )}
                    <button
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1"
                        title={isMinimized ? "Maximize Result" : "Minimize Result"}
                    >
                        <ChevronDown size={16} className={`transition-transform duration-200 ${isMinimized ? '' : 'rotate-180'}`} />
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <div className={`relative ${images.length > 1 ? 'grid grid-cols-2 gap-0.5' : 'min-h-[150px] bg-gray-100 dark:bg-black/50'}`}>
                    {images.map((imgUrl, idx) => (
                        <div key={idx} className={`relative ${images.length > 1 ? 'aspect-square h-full' : 'w-full flex justify-center'} bg-gray-100 dark:bg-black/50 group cursor-pointer`} onClick={onImageClick}>
                            {imgUrl.match(/\.(mp4|webm|mov)($|\?|&)/i) ? (
                                <video
                                    src={imgUrl}
                                    className={images.length > 1 ? "w-full h-full object-cover" : "w-full h-auto max-h-[70vh] object-contain"}
                                    autoPlay
                                    loop
                                    muted
                                />
                            ) : (
                                <img
                                    src={imgUrl}
                                    className={images.length > 1
                                        ? `w-full h-full object-cover ${nsfwMode && !resultRevealed ? 'blur-md' : ''}`
                                        : `w-full h-auto max-h-[70vh] object-contain ${nsfwMode && !resultRevealed ? 'blur-md' : ''}`
                                    }
                                    alt={`Result ${idx + 1}`}
                                />
                            )}
                            {/* Duration Badge (Only on first item to avoid clutter) */}
                            {idx === 0 && duration > 0 && (
                                <div className="absolute bottom-2 right-2 bg-white/80 dark:bg-black/60 backdrop-blur text-gray-900 dark:text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                    <Clock size={10} />
                                    {(duration / 1000).toFixed(1)}s
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ResultCard;
