
import React, { useState, useRef } from 'react';
import { X, MoveHorizontal, ArrowUpRight, EyeOff, ImageOff } from 'lucide-react';
import { ThemeColor } from '../types';

interface CompareModalProps {
    resultImage: string;
    inputImage: string;
    onClose: () => void;
    onUseResult: () => void;
    nsfwMode: boolean;
    theme: ThemeColor;
}

const CompareModal: React.FC<CompareModalProps> = ({ resultImage, inputImage, onClose, onUseResult, nsfwMode, theme }) => {
    const [sliderPosition, setSliderPosition] = useState(50); // 0 to 100 percentage
    const [isDragging, setIsDragging] = useState(false);
    const [resultRevealed, setResultRevealed] = useState(false);
    const [inputError, setInputError] = useState(false);
    const sliderContainerRef = useRef<HTMLDivElement>(null);

    const showComparison = Boolean(inputImage);

    const handleMove = (clientX: number) => {
        if (sliderContainerRef.current) {
            const rect = sliderContainerRef.current.getBoundingClientRect();
            const x = clientX - rect.left;
            const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
            setSliderPosition(percentage);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        handleMove(e.touches[0].clientX);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            handleMove(e.clientX);
        }
    };

    const handleInteractionStart = (clientX: number) => {
        setIsDragging(true);
        handleMove(clientX);
    };

    const handleOverlayClick = () => {
        if (nsfwMode && !resultRevealed) {
            setResultRevealed(true);
        }
    }

    return (
        <div className="fixed inset-0 z-[60] bg-white/95 dark:bg-black/95 flex items-center justify-center animate-fade-in transition-colors duration-300 p-4">
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-800 dark:text-white p-2 hover:bg-gray-200 dark:hover:bg-white/20 rounded-full z-50 transition-colors"
            >
                <X size={32} />
            </button>

            <div
                ref={sliderContainerRef}
                className="relative inline-block overflow-hidden rounded-lg shadow-2xl bg-black pb-20"
                onTouchMove={showComparison ? handleTouchMove : undefined}
                onTouchEnd={showComparison ? () => setIsDragging(false) : undefined}
                onMouseMove={showComparison ? handleMouseMove : undefined}
                onMouseUp={showComparison ? () => setIsDragging(false) : undefined}
                onMouseLeave={showComparison ? () => setIsDragging(false) : undefined}
                style={{ touchAction: 'none' }} // Prevent page scroll while dragging
            >
                {/* 1. Background Layer: Result Image (Acts as the strut/layout definition) */}
                <img
                    src={resultImage}
                    alt="Result"
                    className={`block max-w-full max-h-[85vh] object-contain select-none ${nsfwMode && !resultRevealed ? 'blur-2xl' : ''}`}
                    draggable={false}
                />

                {/* Conditional Comparison Layers */}
                {showComparison && (
                    <>
                        {/* 2. Foreground Layer: Original Image (Clipped & Stretched to match Result frame) */}
                        <div
                            className="absolute inset-0 w-full h-full select-none bg-gray-100 dark:bg-gray-900"
                            style={{
                                clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`
                            }}
                        >
                            {inputError ? (
                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-4 text-center">
                                    <ImageOff size={48} className="mb-2 opacity-50" />
                                    <span className="text-xs font-bold">Preview Unavailable</span>
                                    <span className="text-[10px] opacity-70">Format not supported by browser</span>
                                </div>
                            ) : (
                                <img
                                    src={inputImage}
                                    alt="Original"
                                    onError={() => setInputError(true)}
                                    className="w-full h-full object-contain"
                                    draggable={false}
                                />
                            )}
                        </div>

                        {/* 3. Slider Divider */}
                        <div
                            className="absolute top-0 bottom-0 w-1 bg-white/80 cursor-ew-resize flex items-center justify-center z-10 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                            style={{ left: `${sliderPosition}%` }}
                            onTouchStart={(e) => handleInteractionStart(e.touches[0].clientX)}
                            onMouseDown={(e) => handleInteractionStart(e.clientX)}
                        >
                            <div className={`w-8 h-8 bg-white rounded-full flex items-center justify-center text-black shadow-lg transform transition-transform ${isDragging ? 'scale-110' : ''}`}>
                                <MoveHorizontal size={16} />
                            </div>
                        </div>

                        {/* Labels */}
                        <span className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold bg-white/80 dark:bg-black/60 text-gray-900 dark:text-white backdrop-blur-md pointer-events-none transition-opacity shadow-md ${sliderPosition < 10 ? 'opacity-0' : 'opacity-100'}`}>
                            Original
                        </span>
                        <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold bg-${theme}-100 dark:bg-${theme}-600/90 text-${theme}-900 dark:text-white backdrop-blur-md pointer-events-none transition-opacity shadow-md ${sliderPosition > 90 ? 'opacity-0' : 'opacity-100'}`}>
                            Result
                        </span>
                    </>
                )}

                {nsfwMode && !resultRevealed && (
                    <div className="absolute inset-0 flex items-center justify-center z-20" onClick={handleOverlayClick}>
                        <div className="bg-white/80 dark:bg-black/50 p-4 rounded-full text-gray-900 dark:text-white/90 backdrop-blur-md flex flex-col items-center animate-pulse cursor-pointer shadow-lg">
                            <EyeOff size={48} />
                            <p className="text-sm mt-2 font-medium">Tap to unblur result</p>
                        </div>
                    </div>
                )}

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onUseResult();
                    }}
                    className={`absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-${theme}-600 hover:bg-${theme}-500 text-white px-6 py-3 rounded-full font-semibold shadow-lg backdrop-blur-sm transition-all transform hover:scale-105 z-20 w-max whitespace-nowrap`}
                >
                    Use as Input <ArrowUpRight size={18} />
                </button>
            </div>
        </div>
    );
};

export default CompareModal;
