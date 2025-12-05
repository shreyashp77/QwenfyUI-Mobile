
import React, { useState, useEffect, useRef } from 'react';
import { HistoryItem, ThemeColor } from '../types';
import { X, ArrowUpRight, ExternalLink, EyeOff, ChevronLeft, ChevronRight, Copy, Check, Clock, FileWarning, ImageOff, SplitSquareHorizontal, Trash2, Monitor } from 'lucide-react';
import CompareModal from './CompareModal';

interface HistoryGalleryProps {
    history: HistoryItem[];
    onSelect: (item: HistoryItem) => void;
    onSelectVideo?: (item: HistoryItem) => void;
    onClose: () => void;
    onDelete: (filename: string) => void;
    nsfwMode: boolean;
    theme: ThemeColor;
    serverAddress: string;
}

// Sub-component to handle individual image loading state
const HistoryThumbnail: React.FC<{
    item: HistoryItem;
    nsfwMode: boolean;
    onClick: () => void;
}> = ({ item, nsfwMode, onClick }) => {
    const [hasError, setHasError] = useState(false);
    const isVideo = item.imageUrl.match(/\.(mp4|webm|mov)($|\?|&)/i);

    if (hasError) {
        return (
            <div
                onClick={onClick}
                className="w-full h-full bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 cursor-pointer border-b border-gray-200 dark:border-gray-800"
            >
                <FileWarning size={32} className="mb-2 opacity-50 text-red-500 dark:text-red-400" />
                <span className="text-xs font-mono">File Missing</span>
            </div>
        );
    }

    if (isVideo) {
        return (
            <video
                src={item.imageUrl}
                className="w-full h-full object-cover"
                muted
                loop
                playsInline
                onMouseOver={(e) => e.currentTarget.play()}
                onMouseOut={(e) => e.currentTarget.pause()}
                onError={() => setHasError(true)}
            />
        );
    }

    return (
        <img
            src={item.imageUrl}
            alt={item.prompt}
            onError={() => setHasError(true)}
            className={`w-full h-full object-cover transition-all duration-300 ${nsfwMode ? 'blur-md' : ''}`}
        />
    );
};

const HistoryGallery: React.FC<HistoryGalleryProps> = ({ history, onSelect, onSelectVideo, onClose, onDelete, nsfwMode, theme, serverAddress }) => {
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);
    const [previewRevealed, setPreviewRevealed] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [previewError, setPreviewError] = useState(false);
    const [interactionLocked, setInteractionLocked] = useState(false);
    const [comparingItem, setComparingItem] = useState<HistoryItem | null>(null);

    // Swipe refs
    const touchStartX = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);

    useEffect(() => {
        // Reset error state when index changes
        setPreviewError(false);
    }, [previewIndex]);

    const handleOpenPreview = (index: number) => {
        setPreviewIndex(index);
        setPreviewRevealed(false);
    };

    const handleClosePreview = () => {
        setPreviewIndex(null);
        // Lock interaction briefly to prevent ghost clicks on underlying elements
        setInteractionLocked(true);
        setTimeout(() => setInteractionLocked(false), 300);
    };

    const handleNext = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (previewIndex !== null && previewIndex < history.length - 1) {
            setPreviewIndex(previewIndex + 1);
            setPreviewRevealed(false);
        }
    };

    const handlePrev = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (previewIndex !== null && previewIndex > 0) {
            setPreviewIndex(previewIndex - 1);
            setPreviewRevealed(false);
        }
    };

    // Touch handlers for swipe
    const onTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.targetTouches[0].clientX;
        touchEndX.current = null;
    };

    const onTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.targetTouches[0].clientX;
    };

    const onTouchEnd = () => {
        if (touchStartX.current === null || touchEndX.current === null) return;

        const distance = touchStartX.current - touchEndX.current;
        const minSwipeDistance = 50;

        if (distance > minSwipeDistance) {
            // Swiped Left -> Next Image
            handleNext();
        } else if (distance < -minSwipeDistance) {
            // Swiped Right -> Previous Image
            handlePrev();
        }
    };

    const copyToClipboard = async (text: string, id: string) => {
        try {
            // Modern API (Requires Secure Context: HTTPS or Localhost)
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for HTTP/LAN access
                const textArea = document.createElement("textarea");
                textArea.value = text;

                // Make it invisible but part of the DOM to satisfy iOS
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "0";
                document.body.appendChild(textArea);

                textArea.focus();
                textArea.select();
                textArea.setSelectionRange(0, 99999); // Extra support for mobile

                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);

                if (!successful) throw new Error("Fallback copy failed");
            }

            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const handleCompare = (e: React.MouseEvent, item: HistoryItem) => {
        e.stopPropagation();
        setComparingItem(item);
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (previewIndex === null) return;
            if (e.key === 'ArrowRight') {
                if (previewIndex < history.length - 1) {
                    setPreviewIndex(prev => (prev !== null ? prev + 1 : prev));
                    setPreviewRevealed(false);
                }
            } else if (e.key === 'ArrowLeft') {
                if (previewIndex > 0) {
                    setPreviewIndex(prev => (prev !== null ? prev - 1 : prev));
                    setPreviewRevealed(false);
                }
            } else if (e.key === 'Escape') {
                handleClosePreview();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [previewIndex, history.length]);

    return (
        <>
            <div className="fixed inset-0 z-50 bg-white/95 dark:bg-black/95 backdrop-blur-md flex flex-col transition-colors duration-300">
                <div className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Generation History</h2>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onClose();
                        }}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {history.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-500">
                        <p>No images generated yet.</p>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center overflow-x-auto p-4 md:p-8 space-x-4 snap-x snap-mandatory">
                        {history.map((item, index) => (
                            <div
                                key={item.id}
                                className="flex-shrink-0 w-72 md:w-80 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden snap-center flex flex-col"
                            >
                                <div
                                    className="relative cursor-pointer h-72 w-full bg-gray-100 dark:bg-gray-900 overflow-hidden group"
                                    onClick={() => handleOpenPreview(index)}
                                >
                                    <HistoryThumbnail
                                        item={item}
                                        nsfwMode={nsfwMode}
                                        onClick={() => handleOpenPreview(index)}
                                    />
                                    {nsfwMode && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <EyeOff className="text-white opacity-70" size={32} />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-black/20 transition-colors" />
                                </div>

                                <div className="p-4 flex-1 flex flex-col gap-2">
                                    {/* Prompt Section */}
                                    <div className="flex justify-between items-start gap-2">
                                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 italic flex-1" title={item.prompt}>
                                            "{item.prompt}"
                                        </p>
                                        <button
                                            onClick={() => copyToClipboard(item.prompt, `prompt-${item.id}`)}
                                            className="text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-white transition-colors"
                                            title="Copy Prompt"
                                        >
                                            {copiedId === `prompt-${item.id}` ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                        </button>
                                    </div>

                                    {/* Delete Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (interactionLocked) return;
                                            onDelete(item.filename);
                                        }}
                                        className="absolute top-2 right-2 p-1.5 bg-white/90 dark:bg-black/60 hover:bg-red-100 dark:hover:bg-red-900/50 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                                        title="Delete Image"
                                    >
                                        <Trash2 size={14} />
                                    </button>

                                    {/* Seed Section */}
                                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-gray-600 dark:text-gray-400">Seed: {item.seed}</span>
                                            <button
                                                onClick={() => copyToClipboard(item.seed.toString(), `seed-${item.id}`)}
                                                className="text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-white transition-colors"
                                                title="Copy Seed"
                                            >
                                                {copiedId === `seed-${item.id}` ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                                            </button>
                                        </div>
                                        {item.duration && (
                                            <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-600">
                                                <Clock size={10} /> {(item.duration / 1000).toFixed(1)}s
                                            </span>
                                        )}
                                    </div>

                                    {/* Compare Button (if input exists) */}
                                    {item.inputFilename && (
                                        <div className="pt-1">
                                            <button
                                                onClick={(e) => handleCompare(e, item)}
                                                className="w-full flex items-center justify-center gap-1.5 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white py-1.5 rounded text-xs transition-colors border border-gray-200 dark:border-gray-600/50"
                                            >
                                                <SplitSquareHorizontal size={14} /> Compare
                                            </button>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex justify-end items-center gap-3 pt-2 mt-auto">
                                        <a
                                            href={item.imageUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-gray-400 hover:text-gray-700 dark:hover:text-white"
                                            title="Open in new tab"
                                        >
                                            <ExternalLink size={16} />
                                        </a>
                                        <button
                                            onClick={() => onSelect(item)}
                                            className={`flex items-center gap-1 text-${theme}-600 dark:text-${theme}-400 hover:text-${theme}-500 dark:hover:text-${theme}-300 font-medium text-xs`}
                                        >
                                            Use <ArrowUpRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {/* Spacer for scrolling */}
                        <div className="w-4 flex-shrink-0"></div>
                    </div>
                )}
            </div>

            {/* Full Screen Preview Modal */}
            {previewIndex !== null && (
                <div className="fixed inset-0 z-[60] bg-white dark:bg-black flex items-center justify-center" onClick={handleClosePreview}>
                    <button
                        onClick={handleClosePreview}
                        className="absolute top-4 right-4 text-gray-800 dark:text-white p-2 hover:bg-gray-200 dark:hover:bg-white/20 rounded-full z-[70] transition-colors"
                    >
                        <X size={32} />
                    </button>

                    {/* Navigation Buttons */}
                    {previewIndex > 0 && (
                        <button
                            onClick={handlePrev}
                            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-white/80 p-3 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full z-[70] transition-colors"
                        >
                            <ChevronLeft size={48} />
                        </button>
                    )}

                    {previewIndex < history.length - 1 && (
                        <button
                            onClick={handleNext}
                            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-white/80 p-3 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full z-[70] transition-colors"
                        >
                            <ChevronRight size={48} />
                        </button>
                    )}

                    <div
                        className="relative max-w-full max-h-full w-full h-full p-4 flex items-center justify-center"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (nsfwMode && !previewError) setPreviewRevealed(!previewRevealed);
                        }}
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onTouchEnd}
                    >
                        {previewError ? (
                            <div className="flex flex-col items-center justify-center text-gray-500 p-8 bg-gray-100 dark:bg-gray-900 rounded-xl">
                                <ImageOff size={64} className="mb-4 opacity-50 text-red-500" />
                                <p className="text-xl font-semibold mb-2">File Not Found</p>
                                <p className="text-sm">The file may have been deleted from the server.</p>
                            </div>
                        ) : (
                            <>
                                {history[previewIndex].imageUrl.match(/\.(mp4|webm|mov)($|\?|&)/i) ? (
                                    <video
                                        src={history[previewIndex].imageUrl}
                                        controls
                                        autoPlay
                                        loop
                                        className="max-w-full max-h-[90vh] object-contain"
                                        onError={() => setPreviewError(true)}
                                    />
                                ) : (
                                    <img
                                        src={history[previewIndex].imageUrl}
                                        alt="Preview"
                                        onError={() => setPreviewError(true)}
                                        className={`max-w-full max-h-[90vh] object-contain transition-all duration-500 ${nsfwMode && !previewRevealed ? 'blur-2xl' : 'blur-0'}`}
                                    />
                                )}

                                {nsfwMode && !previewRevealed && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="bg-white/80 dark:bg-black/50 p-4 rounded-full text-gray-900 dark:text-white/90 backdrop-blur-md flex flex-col items-center animate-pulse shadow-lg">
                                            <EyeOff size={48} />
                                            <p className="text-sm mt-2 font-medium">Click to reveal</p>
                                        </div>
                                    </div>
                                )}

                                {history[previewIndex].imageUrl.match(/\.(mp4|webm|mov)($|\?|&)/i) ? (
                                    <a
                                        href={history[previewIndex].imageUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-${theme}-600/90 hover:bg-${theme}-500 text-white px-6 py-3 rounded-full font-semibold shadow-lg backdrop-blur-sm transition-all transform hover:scale-105`}
                                    >
                                        Open in New Tab <ExternalLink size={18} />
                                    </a>
                                ) : (
                                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 w-full justify-center px-4">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelect(history[previewIndex]);
                                            }}
                                            className={`flex items-center gap-2 bg-${theme}-600/90 hover:bg-${theme}-500 text-white px-6 py-3 rounded-full font-semibold shadow-lg backdrop-blur-sm transition-all transform hover:scale-105`}
                                        >
                                            Use as Input <ArrowUpRight size={18} />
                                        </button>
                                        {onSelectVideo && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelectVideo(history[previewIndex]);
                                                }}
                                                className={`flex items-center gap-2 bg-white/90 hover:bg-white text-gray-900 px-6 py-3 rounded-full font-semibold shadow-lg backdrop-blur-sm transition-all transform hover:scale-105`}
                                            >
                                                Use for Video <Monitor size={18} />
                                            </button>
                                        )}
                                    </div>
                                )}

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(history[previewIndex].filename);
                                        handleClosePreview();
                                    }}
                                    className="absolute top-4 left-4 p-3 bg-black/20 hover:bg-red-500/80 text-white/70 hover:text-white rounded-full backdrop-blur-sm transition-all z-[70]"
                                    title="Delete Image"
                                >
                                    <Trash2 size={24} />
                                </button>
                            </>
                        )}
                    </div >
                </div >
            )}

            {/* Comparison Modal */}
            {
                comparingItem && comparingItem.inputFilename && (
                    <CompareModal
                        resultImage={comparingItem.imageUrl}
                        inputImage={`${serverAddress}/view?filename=${encodeURIComponent(comparingItem.inputFilename)}&type=input`}
                        onClose={() => setComparingItem(null)}
                        onUseResult={() => {
                            onSelect(comparingItem);
                            setComparingItem(null);
                        }}
                        nsfwMode={nsfwMode}
                        theme={theme}
                    />
                )
            }
        </>
    );
};

export default HistoryGallery;
