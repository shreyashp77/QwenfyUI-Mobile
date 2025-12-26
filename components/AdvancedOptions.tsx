
import React, { useState } from 'react';
import { SlidersHorizontal, ChevronDown, ChevronRight, Monitor, Square, Smartphone, Sparkles, RefreshCw, Plus } from 'lucide-react';
import { AppSettings, LoraSelection } from '../types';
import { VIDEO_RESOLUTIONS, SAMPLER_OPTIONS, SCHEDULER_OPTIONS } from '../constants';
import LoraControl from './LoraControl';

export const ASPECT_RATIOS = [
    { id: 'auto', width: 0, height: 0, label: 'Auto', icon: Sparkles },
    { id: '1:1', width: 1024, height: 1024, label: '1:1', icon: Square },
    { id: '9:16', width: 1080, height: 1920, label: '9:16', icon: Smartphone },
    { id: '16:9', width: 1280, height: 720, label: '16:9', icon: Monitor },
    { id: '4:3', width: 1152, height: 864, label: '4:3', icon: Monitor },
];

interface AdvancedOptionsProps {
    view: 'home' | 'edit' | 'generate' | 'video';
    settings: AppSettings;
    onSettingsChange: (settings: AppSettings) => void;

    // Video State
    videoResolution: string;
    setVideoResolution: (res: string) => void;
    videoDuration: number;
    setVideoDuration: (duration: number) => void;
    extendVideo: boolean;
    setExtendVideo: (extend: boolean) => void;
    fastVideoMode: boolean;
    setFastVideoMode: (fast: boolean) => void;
    enhancedVideoMode?: boolean;
    setEnhancedVideoMode?: (enhanced: boolean) => void;

    // Image State
    selectedResolution: string;
    setSelectedResolution: (res: string) => void;
    customDimensions: { width: number | string, height: number | string };
    setCustomDimensions: React.Dispatch<React.SetStateAction<{ width: number | string, height: number | string }>>;

    // Generation State
    seed: number;
    setSeed: (seed: number) => void;
    randomizeSeedFunction: () => void;
    steps: number;
    setSteps: (steps: number) => void;
    selectedSampler: string;
    setSelectedSampler: (sampler: string) => void;
    selectedScheduler: string;
    setSelectedScheduler: (scheduler: string) => void;

    // LoRA State
    loras: LoraSelection[];
    availableLoras: string[];
    handleAddLora: () => void;
    handleUpdateLora: (id: string, updates: Partial<LoraSelection>) => void;
    handleDeleteLora: (id: string) => void;
}

const AdvancedOptions: React.FC<AdvancedOptionsProps> = ({
    view,
    settings,
    onSettingsChange,
    videoResolution,
    setVideoResolution,
    videoDuration,
    setVideoDuration,
    extendVideo,
    setExtendVideo,
    fastVideoMode,
    setFastVideoMode,
    enhancedVideoMode,
    setEnhancedVideoMode,
    selectedResolution,
    setSelectedResolution,
    customDimensions,
    setCustomDimensions,
    seed,
    setSeed,
    randomizeSeedFunction,
    steps,
    setSteps,
    selectedSampler,
    setSelectedSampler,
    selectedScheduler,
    setSelectedScheduler,
    loras,
    availableLoras,
    handleAddLora,
    handleUpdateLora,
    handleDeleteLora
}) => {
    const [showLoraConfig, setShowLoraConfig] = useState(false);

    return (
        <div className="border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900/50 overflow-hidden shadow-sm transition-colors duration-300">
            <button
                onClick={() => setShowLoraConfig(!showLoraConfig)}
                className="w-full flex items-center justify-between p-3 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <SlidersHorizontal size={16} />
                    <span className="text-sm font-medium">Advanced Configuration</span>
                </div>
                {showLoraConfig ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronRight size={16} className="text-gray-500" />}
            </button>

            {showLoraConfig && (
                <div className="p-4 space-y-4 animate-fade-in border-t border-gray-200 dark:border-gray-800">

                    {/* VIDEO MODE: Advanced Options */}
                    {view === 'video' && (
                        <>
                            {/* Resolution Control */}
                            <div className="p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-colors">
                                <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Resolution</span>
                                <div className="grid grid-cols-2 gap-2">
                                    {VIDEO_RESOLUTIONS.map(res => (
                                        <button
                                            key={res.id}
                                            onClick={() => setVideoResolution(res.id)}
                                            className={`py-2 px-1 flex items-center justify-center gap-1 text-[10px] sm:text-xs rounded-md border transition-all ${videoResolution === res.id
                                                ? `bg-${settings.theme}-100 dark:bg-${settings.theme}-900/30 border-${settings.theme}-500 text-${settings.theme}-700 dark:text-${settings.theme}-300 font-medium shadow-sm`
                                                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            {res.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Length Control */}
                            <div className="p-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-colors">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Length (Seconds)</span>
                                    <span className="text-xs font-mono bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">{videoDuration}s</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    step="1"
                                    value={videoDuration}
                                    onChange={(e) => setVideoDuration(parseInt(e.target.value))}
                                    className={`w-full accent-${settings.theme}-600 cursor-pointer`}
                                />
                                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                                    <span>1s</span>
                                    <span>2s</span>
                                    <span>3s</span>
                                    <span>4s</span>
                                    <span>5s</span>
                                </div>
                            </div>

                            {/* Extend Toggle */}
                            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-colors">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Extend Video</span>
                                    <span className="text-[10px] text-gray-500">Enable RIFE VFI interpolation</span>
                                </div>
                                <button
                                    onClick={() => setExtendVideo(!extendVideo)}
                                    className={`w-12 h-6 rounded-full relative transition-colors ${extendVideo ? `bg-${settings.theme}-600` : 'bg-gray-300 dark:bg-gray-700'}`}
                                >
                                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${extendVideo ? 'translate-x-6' : ''}`} />
                                </button>
                            </div>

                            {/* Fast Mode Toggle */}
                            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-colors">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Fast Mode (Q4)</span>
                                    <span className="text-[10px] text-gray-500">Reduced VRAM usage, faster</span>
                                </div>
                                <button
                                    onClick={() => setFastVideoMode(!fastVideoMode)}
                                    className={`w-12 h-6 rounded-full relative transition-colors ${fastVideoMode ? `bg-${settings.theme}-600` : 'bg-gray-300 dark:bg-gray-700'}`}
                                >
                                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${fastVideoMode ? 'translate-x-6' : ''}`} />
                                </button>
                            </div>

                            {/* Enhanced Mode Toggle (Easter Egg) */}
                            {settings.enableRemoteInput && setEnhancedVideoMode && (
                                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-colors mt-2">
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">NSFW Mode</span>
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-red-500 to-rose-600 text-white">18+</span>
                                        </div>
                                        <span className="text-[10px] text-gray-500">Uncensored DSW V8 GGUF (No LoRA)</span>
                                    </div>
                                    <button
                                        onClick={() => setEnhancedVideoMode && setEnhancedVideoMode(!enhancedVideoMode)}
                                        className={`w-12 h-6 rounded-full relative transition-colors ${enhancedVideoMode ? `bg-${settings.theme}-600` : 'bg-gray-300 dark:bg-gray-700'}`}
                                    >
                                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${enhancedVideoMode ? 'translate-x-6' : ''}`} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {/* Resolution Control (Generate/Edit) */}
                    {view !== 'video' && (
                        <div className="p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-colors">
                            <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Aspect Ratio</span>
                            <div className="flex gap-2 flex-wrap">
                                {ASPECT_RATIOS.filter(res => view === 'edit' || res.id !== 'auto').map(res => {
                                    const Icon = res.icon;
                                    return (
                                        <button
                                            key={res.id}
                                            onClick={() => setSelectedResolution(res.id)}
                                            className={`flex-1 py-2 px-1 flex items-center justify-center gap-1 text-[10px] sm:text-xs rounded-md border transition-all ${selectedResolution === res.id
                                                ? `bg-${settings.theme}-100 dark:bg-${settings.theme}-900/30 border-${settings.theme}-500 text-${settings.theme}-700 dark:text-${settings.theme}-300 font-medium shadow-sm`
                                                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            <Icon size={12} className="hidden sm:block" />
                                            {res.label}
                                        </button>
                                    );
                                })}
                                {/* Custom Button */}
                                <button
                                    onClick={() => setSelectedResolution('custom')}
                                    className={`flex-1 py-2 px-1 flex items-center justify-center gap-1 text-[10px] sm:text-xs rounded-md border transition-all ${selectedResolution === 'custom'
                                        ? `bg-${settings.theme}-100 dark:bg-${settings.theme}-900/30 border-${settings.theme}-500 text-${settings.theme}-700 dark:text-${settings.theme}-300 font-medium shadow-sm`
                                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <Monitor size={12} className="hidden sm:block" />
                                    Custom
                                </button>
                            </div>

                            {selectedResolution === 'custom' && (
                                <div className="flex gap-3 mt-3 animate-fade-in">
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">Width</label>
                                        <input
                                            type="number"
                                            value={customDimensions.width}
                                            onChange={(e) => setCustomDimensions(prev => ({ ...prev, width: e.target.value === '' ? '' : parseInt(e.target.value) }))}
                                            className={`w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded p-2 text-sm text-center font-mono focus:border-${settings.theme}-500 outline-none text-gray-800 dark:text-gray-200 transition-colors`}
                                        />
                                    </div>
                                    <div className="flex items-end pb-2 text-gray-400">x</div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">Height</label>
                                        <input
                                            type="number"
                                            value={customDimensions.height}
                                            onChange={(e) => setCustomDimensions(prev => ({ ...prev, height: e.target.value === '' ? '' : parseInt(e.target.value) }))}
                                            className={`w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded p-2 text-sm text-center font-mono focus:border-${settings.theme}-500 outline-none text-gray-800 dark:text-gray-200 transition-colors`}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}


                    {/* Seed Control */}
                    <div className="p-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-colors">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Seed</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onSettingsChange({ ...settings, randomizeSeed: !settings.randomizeSeed })}
                                    className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${settings.randomizeSeed
                                        ? `bg-${settings.theme}-100 dark:bg-${settings.theme}-900/30 text-${settings.theme}-600 dark:text-${settings.theme}-300 font-medium`
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                        }`}
                                    title="Auto-randomize seed on generate"
                                >
                                    <Sparkles size={12} /> Auto
                                </button>
                                <button onClick={randomizeSeedFunction} className={`text-${settings.theme}-500 dark:text-${settings.theme}-400 hover:text-${settings.theme}-600 dark:hover:text-${settings.theme}-300`}>
                                    <RefreshCw size={16} />
                                </button>
                            </div>
                        </div>
                        <input
                            type="number"
                            value={seed}
                            onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                            className={`w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded p-2 text-sm text-center font-mono focus:border-${settings.theme}-500 outline-none text-gray-800 dark:text-gray-200 transition-colors`}
                        />
                    </div>

                    {/* Steps Control (Generate Mode Only) */}
                    {view === 'generate' && (
                        <div className="p-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-colors">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Steps</span>
                                <span className="text-xs font-mono bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">{steps}</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="50"
                                value={steps}
                                onChange={(e) => setSteps(parseInt(e.target.value))}
                                className={`w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-${settings.theme}-500`}
                            />
                        </div>
                    )}

                    {/* Sampler & Scheduler Control */}
                    {view !== 'video' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-colors">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Sampler</label>
                                <div className="relative">
                                    <select
                                        value={selectedSampler}
                                        onChange={(e) => setSelectedSampler(e.target.value)}
                                        className={`w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-800 dark:text-gray-200 py-2 pl-2 pr-6 appearance-none focus:border-${settings.theme}-500 outline-none transition-colors`}
                                    >
                                        {SAMPLER_OPTIONS.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                </div>
                            </div>

                            <div className="p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-colors">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Scheduler</label>
                                <div className="relative">
                                    <select
                                        value={selectedScheduler}
                                        onChange={(e) => setSelectedScheduler(e.target.value)}
                                        className={`w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-xs text-gray-800 dark:text-gray-200 py-2 pl-2 pr-6 appearance-none focus:border-${settings.theme}-500 outline-none transition-colors`}
                                    >
                                        {SCHEDULER_OPTIONS.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* LoRAs (Edit/Generate Mode) */}
                    {(view === 'edit' || view === 'generate') && (
                        <div className="space-y-3">
                            {loras.length > 0 && (
                                <div className="space-y-3">
                                    {loras.map((lora, index) => (
                                        <LoraControl
                                            key={lora.id}
                                            id={lora.id}
                                            label={`LoRA ${index + 1}`}
                                            enabled={lora.enabled}
                                            strength={lora.strength}
                                            availableLoras={availableLoras}
                                            selectedLoraName={lora.name}
                                            onUpdate={handleUpdateLora}
                                            onDelete={handleDeleteLora}
                                            theme={settings.theme}
                                        />
                                    ))}
                                </div>
                            )}
                            <button
                                onClick={handleAddLora}
                                disabled={loras.length >= 10}
                                className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-${settings.theme}-600 dark:hover:text-${settings.theme}-400 hover:border-${settings.theme}-500/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                <Plus size={18} /> Add LoRA
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdvancedOptions;
