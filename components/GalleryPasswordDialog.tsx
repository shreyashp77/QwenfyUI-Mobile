import React, { useState, useEffect, useRef } from 'react';
import { X, Eye, EyeOff, Lock, KeyRound } from 'lucide-react';

interface GalleryPasswordDialogProps {
    isOpen: boolean;
    mode: 'setup' | 'unlock';
    onClose: () => void;
    onSubmit: (password: string) => Promise<boolean>;
    error?: string | null;
    theme?: string;
}

export default function GalleryPasswordDialog({
    isOpen,
    mode,
    onClose,
    onSubmit,
    error,
    theme = 'indigo'
}: GalleryPasswordDialogProps) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setPassword('');
            setConfirmPassword('');
            setLocalError(null);
            setShowPassword(false);
            // Focus input after dialog opens
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError(null);

        if (!password) {
            setLocalError('Password is required');
            return;
        }

        if (mode === 'setup') {
            if (password.length < 4) {
                setLocalError('Password must be at least 4 characters');
                return;
            }
            if (password !== confirmPassword) {
                setLocalError('Passwords do not match');
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const success = await onSubmit(password);
            if (!success && mode === 'unlock') {
                setLocalError('Incorrect password');
            }
        } catch (err: any) {
            setLocalError(err.message || 'An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const displayError = localError || error;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                {/* Header */}
                <div className={`bg-gradient-to-r from-${theme}-600 to-${theme}-500 p-4 flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                        {mode === 'setup' ? (
                            <KeyRound className="text-white" size={24} />
                        ) : (
                            <Lock className="text-white" size={24} />
                        )}
                        <h2 className="text-lg font-semibold text-white">
                            {mode === 'setup' ? 'Set Gallery Password' : 'Unlock Gallery'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-white/20 transition-colors"
                    >
                        <X className="text-white" size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {mode === 'setup' && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Choose a password to protect your private gallery. You'll need this password to view saved items.
                        </p>
                    )}

                    {/* Password Field */}
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={mode === 'setup' ? 'Enter new password' : 'Enter password'}
                            className={`w-full p-3 pr-10 rounded-xl border ${displayError
                                ? 'border-red-500 focus:ring-red-500'
                                : `border-gray-300 dark:border-gray-700 focus:ring-${theme}-500`
                                } bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2`}
                            autoComplete="new-password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    {/* Confirm Password (Setup only) */}
                    {mode === 'setup' && (
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm password"
                                className={`w-full p-3 pr-10 rounded-xl border ${displayError && password !== confirmPassword
                                    ? 'border-red-500 focus:ring-red-500'
                                    : `border-gray-300 dark:border-gray-700 focus:ring-${theme}-500`
                                    } bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2`}
                                autoComplete="new-password"
                            />
                        </div>
                    )}

                    {/* Error Message */}
                    {displayError && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                            {displayError}
                        </p>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`w-full py-3 rounded-xl font-medium text-white transition-all ${isSubmitting
                            ? 'bg-gray-400 cursor-not-allowed'
                            : `bg-gradient-to-r from-${theme}-600 to-${theme}-500 hover:from-${theme}-700 hover:to-${theme}-600 active:scale-[0.98]`
                            }`}
                    >
                        {isSubmitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                {mode === 'setup' ? 'Setting up...' : 'Unlocking...'}
                            </span>
                        ) : (
                            mode === 'setup' ? 'Set Password' : 'Unlock'
                        )}
                    </button>

                    {mode === 'setup' && (
                        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                            ⚠️ This password cannot be recovered. Remember it!
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
}
