

import React, { useState, useEffect, useRef } from 'react';
import { HistoryItem, ThemeColor } from '../types';
import { X, ArrowUpRight, ExternalLink, EyeOff, ChevronLeft, ChevronRight, Copy, Check, Clock, FileWarning, ImageOff } from 'lucide-react';

interface HistoryGalleryProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onClose: () => void;
  nsfwMode: boolean;
  theme: ThemeColor;
}

// Sub-component to handle individual image loading state
const HistoryThumbnail: React.FC<{ 
    item: HistoryItem; 
    nsfwMode: boolean; 
    onClick: () => void; 
}> = ({ item, nsfwMode, onClick }) => {
    const [hasError, setHasError] = useState(false);

    if (hasError) {
        return (
            <div 
                onClick={onClick}
                className="w-full h-full bg-gray-900 flex flex-col items-center justify-center text-gray-500 cursor-pointer border-b border-gray-800"
            >
                <FileWarning size={32} className="mb-2 opacity-50 text-red-400" />
                <span className="text-xs font-mono">File Missing</span>
            </div>
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

const HistoryGallery: React.FC<HistoryGalleryProps> = ({ history, onSelect, onClose, nsfwMode, theme }) => {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [previewRevealed, setPreviewRevealed] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);

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

  const copyToClipboard = (text: string, id: string) => {
      navigator.clipboard.writeText(text).then(() => {
          setCopiedId(id);
          setTimeout(() => setCopiedId(null), 2000);
      });
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
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col">
            <div className="p-4 flex justify-between items-center border-b border-gray-800 bg-gray-900">
                <h2 className="text-xl font-bold text-white">Generation History</h2>
                <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
                    <X size={24} />
                </button>
            </div>

            {history.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                    <p>No images generated yet.</p>
                </div>
            ) : (
                <div className="flex-1 flex items-center overflow-x-auto p-4 md:p-8 space-x-4 snap-x snap-mandatory">
                    {history.map((item, index) => (
                        <div 
                            key={item.id} 
                            className="flex-shrink-0 w-72 md:w-80 bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden snap-center flex flex-col"
                        >
                            <div 
                                className="relative cursor-pointer h-72 w-full bg-gray-900 overflow-hidden group"
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
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                            </div>
                            
                            <div className="p-4 flex-1 flex flex-col gap-2">
                                {/* Prompt Section */}
                                <div className="flex justify-between items-start gap-2">
                                     <p className="text-xs text-gray-300 line-clamp-2 italic flex-1" title={item.prompt}>
                                        "{item.prompt}"
                                    </p>
                                    <button 
                                        onClick={() => copyToClipboard(item.prompt, `prompt-${item.id}`)}
                                        className="text-gray-500 hover:text-white transition-colors"
                                        title="Copy Prompt"
                                    >
                                        {copiedId === `prompt-${item.id}` ? <Check size={14} className="text-green-500"/> : <Copy size={14} />}
                                    </button>
                                </div>

                                {/* Seed Section */}
                                <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-700">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono">Seed: {item.seed}</span>
                                        <button 
                                            onClick={() => copyToClipboard(item.seed.toString(), `seed-${item.id}`)}
                                            className="text-gray-500 hover:text-white transition-colors"
                                            title="Copy Seed"
                                        >
                                            {copiedId === `seed-${item.id}` ? <Check size={12} className="text-green-500"/> : <Copy size={12} />}
                                        </button>
                                    </div>
                                    {item.duration && (
                                        <span className="flex items-center gap-1 text-[10px] text-gray-600">
                                            <Clock size={10} /> {(item.duration / 1000).toFixed(1)}s
                                        </span>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end items-center gap-3 pt-2">
                                    <a 
                                        href={item.imageUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-gray-400 hover:text-white"
                                        title="Open in new tab"
                                    >
                                        <ExternalLink size={16} />
                                    </a>
                                    <button 
                                        onClick={() => onSelect(item)}
                                        className={`flex items-center gap-1 text-${theme}-400 hover:text-${theme}-300 font-medium text-xs`}
                                    >
                                        Use <ArrowUpRight size={16}/>
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
            <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center" onClick={handleClosePreview}>
                <button 
                    onClick={handleClosePreview} 
                    className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full z-[70] transition-colors"
                >
                    <X size={32} />
                </button>
                
                {/* Navigation Buttons - Visible on all screens */}
                {previewIndex > 0 && (
                    <button 
                        onClick={handlePrev}
                        className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 text-white/80 p-3 hover:bg-white/10 rounded-full z-[70] transition-colors"
                    >
                        <ChevronLeft size={48} />
                    </button>
                )}

                {previewIndex < history.length - 1 && (
                    <button 
                        onClick={handleNext}
                        className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 text-white/80 p-3 hover:bg-white/10 rounded-full z-[70] transition-colors"
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
                        <div className="flex flex-col items-center justify-center text-gray-500 p-8 bg-gray-900 rounded-xl">
                            <ImageOff size={64} className="mb-4 opacity-50 text-red-500" />
                            <p className="text-xl font-semibold mb-2">Image Not Found</p>
                            <p className="text-sm">The file may have been deleted from the server.</p>
                        </div>
                    ) : (
                        <>
                            <img 
                                src={history[previewIndex].imageUrl} 
                                alt="Preview" 
                                onError={() => setPreviewError(true)}
                                className={`max-w-full max-h-[90vh] object-contain transition-all duration-500 ${nsfwMode && !previewRevealed ? 'blur-2xl' : 'blur-0'}`}
                            />
                            
                            {nsfwMode && !previewRevealed && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="bg-black/50 p-4 rounded-full text-white/90 backdrop-blur-md flex flex-col items-center animate-pulse">
                                        <EyeOff size={48} />
                                        <p className="text-sm mt-2 font-medium">Click to reveal</p>
                                    </div>
                                </div>
                            )}
                            
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelect(history[previewIndex]);
                                }}
                                className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-${theme}-600/90 hover:bg-${theme}-500 text-white px-6 py-3 rounded-full font-semibold shadow-lg backdrop-blur-sm transition-all transform hover:scale-105`}
                            >
                                Use as Input <ArrowUpRight size={18}/>
                            </button>
                        </>
                    )}
                </div>
            </div>
        )}
    </>
  );
};

export default HistoryGallery;
