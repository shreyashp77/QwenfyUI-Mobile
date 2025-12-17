import React, { useState, useEffect } from 'react';
import { Lock, Delete, Unlock } from 'lucide-react';
import { haptic } from '../services/hapticService';
import { sound } from '../services/soundService';

interface PinOverlayProps {
    onUnlock: (pin: string) => Promise<boolean>; // Returns true if unlock successful
    isSetupMode?: boolean;
    onCancel?: () => void;
    title?: string;
    subtitle?: string;
}

const PinOverlay: React.FC<PinOverlayProps> = ({
    onUnlock,
    isSetupMode = false,
    onCancel,
    title = "Enter PIN",
    subtitle = "Secure Access"
}) => {
    const [pin, setPin] = useState("");
    const [isError, setIsError] = useState(false);
    // isLoading removed if unused, but check if it was used in code logic?
    // It was used in handleSubmit: setIsLoading(true). 
    // If I keep it, I must use it in render.
    // Let's keep it and use it to disable buttons?
    const [isLoading, setIsLoading] = useState(false);

    const [confirmPin, setConfirmPin] = useState<string | null>(null); // For setup mode

    const handleDigit = (digit: string) => {
        if (pin.length < 4) {
            haptic.trigger('light');
            sound.play('click');
            setPin(prev => prev + digit);
        }
    };

    const handleDelete = () => {
        if (pin.length > 0) {
            haptic.trigger('light');
            sound.play('click');
            setPin(prev => prev.slice(0, -1));
        }
    };

    // Auto-submit on 4 digits
    useEffect(() => {
        if (pin.length === 4) {
            handleSubmit();
        }
    }, [pin]);

    const handleSubmit = async () => {
        setIsLoading(true);

        if (isSetupMode) {
            // Setup Logic
            if (!confirmPin) {
                // First entry done, ask for confirm
                haptic.trigger('success');
                setConfirmPin(pin);
                setPin("");
                setIsLoading(false);
            } else {
                // Verification
                if (pin === confirmPin) {
                    await onUnlock(pin); // This will save the PIN
                } else {
                    handleError();
                    setConfirmPin(null); // Reset confirmation
                    setPin("");
                }
            }
        } else {
            // Unlock Logic
            const success = await onUnlock(pin);
            if (!success) {
                handleError();
            }
        }
        setIsLoading(false);
    };

    const handleError = () => {
        haptic.trigger('error');
        sound.play('error');
        setIsError(true);
        setTimeout(() => {
            setIsError(false);
            setPin("");
        }, 500);
    };

    // Text overrides for Setup
    let displayTitle = title;
    let displaySubtitle = subtitle;
    if (isSetupMode) {
        if (!confirmPin) {
            displayTitle = "Set New PIN";
            displaySubtitle = "Create a 4-digit code";
        } else {
            displayTitle = "Confirm PIN";
            displaySubtitle = "Re-enter to verify";
        }
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center animate-fade-in touch-none">
            <div className={`flex flex-col items-center mb-8 transition-transform duration-200 ${isError ? 'translate-x-[5px]' : ''} ${isError ? 'animate-shake' : ''}`}>
                <div className={`p-4 rounded-full mb-4 ${isError ? 'bg-red-500/20 text-red-500' : 'bg-gray-800 text-white'}`}>
                    {isError ? <Lock size={32} /> : (isSetupMode && !confirmPin ? <Lock size={32} /> : <Unlock size={32} />)}
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">{displayTitle}</h2>
                <p className="text-gray-400 text-sm">{displaySubtitle}</p>
            </div>

            {/* PIN Dots */}
            <div className="flex gap-4 mb-12">
                {[0, 1, 2, 3].map(i => (
                    <div
                        key={i}
                        className={`w-4 h-4 rounded-full transition-all duration-300 ${i < pin.length
                            ? 'bg-white scale-110 shadow-glowbox'
                            : 'bg-gray-700'
                            } ${isError ? 'bg-red-500' : ''}`}
                    />
                ))}
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-6 mb-8">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button
                        key={num}
                        onClick={() => handleDigit(num.toString())}
                        disabled={isLoading}
                        className="w-16 h-16 rounded-full bg-gray-800/50 hover:bg-gray-700 active:bg-gray-600 border border-gray-700/50 text-2xl font-medium text-white transition-colors flex items-center justify-center disabled:opacity-50"
                    >
                        {num}
                    </button>
                ))}
                {onCancel && isSetupMode ? (
                    <button
                        onClick={onCancel}
                        className="w-16 h-16 rounded-full text-xs font-semibold text-gray-400 hover:text-white flex items-center justify-center"
                    >
                        CANCEL
                    </button>
                ) : <div />} {/* Spacer */}
                <button
                    onClick={() => handleDigit("0")}
                    disabled={isLoading}
                    className="w-16 h-16 rounded-full bg-gray-800/50 hover:bg-gray-700 active:bg-gray-600 border border-gray-700/50 text-2xl font-medium text-white transition-colors flex items-center justify-center disabled:opacity-50"
                >
                    0
                </button>
                <button
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="w-16 h-16 rounded-full bg-transparent hover:bg-white/5 active:bg-white/10 text-white flex items-center justify-center transition-colors disabled:opacity-50"
                >
                    <Delete size={24} />
                </button>
            </div>
        </div>
    );
};

export default PinOverlay;
