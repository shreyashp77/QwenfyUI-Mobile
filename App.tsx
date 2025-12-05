
import React, { useState, useEffect, useRef } from 'react';
import { Settings, History as HistoryIcon, Zap, Loader2, RefreshCw, AlertCircle, EyeOff, ExternalLink, Cpu, Clock, X, Maximize2, ChevronDown, ChevronRight, SlidersHorizontal, Square, Trash2, Check, Plus, Moon, Sun, Monitor, Smartphone, Sparkles, Wand2, PenTool, ArrowLeft, Tablet, History } from 'lucide-react';
import { BASE_WORKFLOW, GENERATE_WORKFLOW, VIDEO_WORKFLOW, SAMPLER_OPTIONS, SCHEDULER_OPTIONS, STYLES, VIDEO_RESOLUTIONS } from './constants';
import { HistoryItem, GenerationStatus, AppSettings, InputImage, ThemeColor, LoraSelection } from './types';
import { uploadImage, queuePrompt, checkServerConnection, getAvailableNunchakuModels, getHistory, getAvailableLoras, getServerInputImages, interruptGeneration, loadHistoryFromServer, saveHistoryToServer, clearServerHistory, freeMemory } from './services/comfyService';
import LoraControl from './components/LoraControl';
import ImageInput from './components/ImageInput';
import HistoryGallery from './components/HistoryGallery';
import PromptManager from './components/PromptManager';
import ServerImageSelector from './components/ServerImageSelector';
import CompareModal from './components/CompareModal';
// Import heic2any for HEIF conversion
import heic2any from 'heic2any';
import { haptic } from './services/hapticService';
import { sound } from './services/soundService';

const getHostname = () => window.location.hostname || 'localhost';
const DEFAULT_SERVER = `http://${getHostname()}:8188`;
// Using specific model name to prevent KeyError: 'weight' in Nunchaku node if fetch fails
const DEFAULT_MODEL = "svdq-fp4_r128-qwen-image-edit-2509-lightning-4steps-251115.safetensors";

type ViewMode = 'home' | 'edit' | 'generate' | 'video';

const THEME_OPTIONS: ThemeColor[] = [
    'purple', 'violet', 'fuchsia', 'pink', 'rose', 'red',
    'orange', 'amber', 'yellow', 'lime', 'green', 'emerald',
    'teal', 'cyan', 'sky', 'blue', 'indigo'
];

const COLOR_HEX: Record<string, string> = {
    purple: '#a855f7',
    violet: '#8b5cf6',
    fuchsia: '#d946ef',
    pink: '#ec4899',
    rose: '#f43f5e',
    red: '#ef4444',
    orange: '#f97316',
    amber: '#f59e0b',
    yellow: '#eab308',
    lime: '#84cc16',
    green: '#22c55e',
    emerald: '#10b981',
    teal: '#14b8a6',
    cyan: '#06b6d4',
    sky: '#0ea5e9',
    blue: '#3b82f6',
    indigo: '#6366f1',
    slate: '#64748b'
};

const ASPECT_RATIOS = [
    { id: '1:1', width: 1024, height: 1024, label: '1:1', icon: Square },
    { id: '9:16', width: 720, height: 1280, label: '9:16', icon: Smartphone },
    { id: '16:9', width: 1280, height: 720, label: '16:9', icon: Monitor },
    { id: '4:3', width: 1152, height: 864, label: '4:3', icon: Monitor },
    { id: '3:4', width: 864, height: 1152, label: '3:4', icon: Tablet },
];

// Helper to generate a random client ID
const generateClientId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

// Color manipulation helpers
const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};

const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

const adjustBrightness = (hex: string, percent: number) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    // Linear interpolation towards black (negative percent) or white (positive percent)
    const target = percent > 0 ? 255 : 0;
    const p = Math.abs(percent / 100);

    const newR = Math.round(rgb.r + (target - rgb.r) * p);
    const newG = Math.round(rgb.g + (target - rgb.g) * p);
    const newB = Math.round(rgb.b + (target - rgb.b) * p);

    return rgbToHex(newR, newG, newB);
};

export default function App() {
    // --- State ---
    const [view, setView] = useState<ViewMode>('home');
    const viewRef = useRef<ViewMode>('home'); // Ref to track view for stale closures

    const [settings, setSettings] = useState<AppSettings>(() => {
        // Load settings from local storage to persist user preferences across refreshes
        const saved = localStorage.getItem('qwen_settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Ensure darkMode exists if loading old settings
                if (parsed.darkMode === undefined) parsed.darkMode = true;
                if (parsed.enableRemoteInput === undefined) parsed.enableRemoteInput = false;
                if (parsed.randomizeSeed === undefined) parsed.randomizeSeed = true;
                if (parsed.enableComparison === undefined) parsed.enableComparison = false;
                // Migration: If either was enabled, enable feedback
                if (parsed.enableFeedback === undefined) {
                    parsed.enableFeedback = (parsed.enableHaptics !== false) || (parsed.enableSound !== false);
                }

                // Repair invalid server address from bad local storage state
                if (!parsed.serverAddress || parsed.serverAddress.includes('://:')) {
                    parsed.serverAddress = DEFAULT_SERVER;
                }

                return parsed;
            } catch (e) {
                console.error("Failed to parse settings", e);
            }
        }
        return {
            serverAddress: DEFAULT_SERVER,
            nsfwMode: false,
            enableRemoteInput: false,
            darkMode: true,
            theme: THEME_OPTIONS[Math.floor(Math.random() * THEME_OPTIONS.length)],
            customColor: '#ffffff',
            randomizeSeed: true,
            enableComparison: false,
            enableFeedback: true,
        };
    });

    const [clientId] = useState(() => generateClientId());
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // Model
    const [availableModels, setAvailableModels] = useState<string[]>([DEFAULT_MODEL]);
    const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);

    // Inputs
    const [prompt, setPrompt] = useState<string>("");
    const [negativePrompt, setNegativePrompt] = useState<string>("blurry, ugly, bad quality, distortion");
    const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 1000000000000));
    const [promptHistory, setPromptHistory] = useState<string[]>([]);
    const [selectedStyle, setSelectedStyle] = useState<string>('none');
    const [selectedResolution, setSelectedResolution] = useState<string>('9:16');
    // Use number | string to allow empty state for inputs
    const [customDimensions, setCustomDimensions] = useState<{ width: number | string, height: number | string }>({ width: 720, height: 1280 });

    // Sampler & Scheduler
    const [selectedSampler, setSelectedSampler] = useState<string>('euler');
    const [selectedScheduler, setSelectedScheduler] = useState<string>('simple');
    const [steps, setSteps] = useState<number>(8);

    // Revised Images State (Only for Edit Mode)
    const [images, setImages] = useState<(InputImage | null)[]>([null, null, null]);

    // Server Image Selection
    const [showServerSelector, setShowServerSelector] = useState<{ show: boolean, index: number }>({ show: false, index: -1 });
    const [availableServerImages, setAvailableServerImages] = useState<string[]>([]);

    // LoRAs
    const [availableLoras, setAvailableLoras] = useState<string[]>([]);
    const [showLoraConfig, setShowLoraConfig] = useState(false);
    const [loras, setLoras] = useState<LoraSelection[]>([]); // Dynamic LoRA list

    // Video Generation State
    const [extendVideo, setExtendVideo] = useState(false);
    const [videoDuration, setVideoDuration] = useState(3);
    const [videoResolution, setVideoResolution] = useState('480x832');

    // Execution
    const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
    const [progress, setProgress] = useState(0); // 0-100
    const [statusMessage, setStatusMessage] = useState<string>(""); // Granular status text
    const [lastGeneratedImage, setLastGeneratedImage] = useState<string | null>(null);
    const [lastGenerationDuration, setLastGenerationDuration] = useState<number>(0);
    const [resultRevealed, setResultRevealed] = useState(false); // For NSFW blur toggle
    const [showResultPreview, setShowResultPreview] = useState(false); // For full screen preview
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);


    // Easter Egg State
    const [, setLightningClickCount] = useState(0);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Refs
    const currentPromptIdRef = useRef<string | null>(null);
    const executingPromptRef = useRef<string>("");
    const executingSeedRef = useRef<number>(0);
    const executingInputFilenameRef = useRef<string | undefined>(undefined); // Track input image for history comparison
    const startTimeRef = useRef<number>(0);
    const wsRef = useRef<WebSocket | null>(null);

    const pendingSuccessIds = useRef<Set<string>>(new Set()); // Buffer for race-condition success messages


    // Sync feedback services with settings
    useEffect(() => {
        const hapticsSupported = haptic.isSupported();
        // Enable haptics if supported and feedback is enabled
        haptic.setEnabled(settings.enableFeedback && hapticsSupported);
        // Enable sound if feedback is enabled AND (haptics not supported OR sound preferred)
        // Logic: If haptics are supported, we ONLY use haptics. If not (iOS), we use sound.
        sound.setEnabled(settings.enableFeedback && !hapticsSupported);
    }, [settings.enableFeedback]);

    // --- Effects ---

    // Sync view ref
    useEffect(() => {
        viewRef.current = view;
    }, [view]);

    // Apply Dark Mode to HTML root
    useEffect(() => {
        if (settings.darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [settings.darkMode]);

    // Apply Custom Theme CSS Variables
    useEffect(() => {
        if (settings.theme === 'custom' && settings.customColor) {
            const root = document.documentElement;
            const base = settings.customColor;

            // Generate shades
            root.style.setProperty('--theme-500', base);
            root.style.setProperty('--theme-400', adjustBrightness(base, 15));
            root.style.setProperty('--theme-300', adjustBrightness(base, 30));
            root.style.setProperty('--theme-200', adjustBrightness(base, 50));

            root.style.setProperty('--theme-600', adjustBrightness(base, -10));
            root.style.setProperty('--theme-700', adjustBrightness(base, -20));
            root.style.setProperty('--theme-900', adjustBrightness(base, -40));
        }
    }, [settings.theme, settings.customColor]);

    // Persist settings
    useEffect(() => {
        localStorage.setItem('qwen_settings', JSON.stringify(settings));
    }, [settings]);

    // Check connection on mount and when server address changes
    useEffect(() => {
        const check = async () => {
            const connected = await checkServerConnection(settings.serverAddress);
            setIsConnected(connected);
            if (connected) {
                setupWebSocket();
                fetchModels();
                loadHistory(); // Load history from server
            }
        };
        check();

        // Cleanup WS
        return () => {
            if (wsRef.current) wsRef.current.close();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings.serverAddress]);





    // Polling fallback for flaky WS or missed messages
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (status === GenerationStatus.QUEUED || status === GenerationStatus.EXECUTING) {
            interval = setInterval(async () => {
                if (currentPromptIdRef.current) {
                    try {
                        const historyData = await getHistory(currentPromptIdRef.current, settings.serverAddress);
                        if (historyData && historyData[currentPromptIdRef.current]) {
                            console.log("Detected completion via polling");
                            setStatus(GenerationStatus.FINISHED);
                            setStatusMessage("Finished");
                            setProgress(100);
                            fetchGenerationResult(currentPromptIdRef.current);
                        }
                    } catch (e) {
                        // Ignore polling errors
                    }
                }
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [status, settings.serverAddress]);

    const fetchModels = async () => {
        // Fetch Models
        const models = await getAvailableNunchakuModels(settings.serverAddress);
        if (models && models.length > 0) {
            setAvailableModels(models);
            setSelectedModel(prev => {
                if (models.includes(prev)) return prev;
                if (models.includes(DEFAULT_MODEL)) return DEFAULT_MODEL;
                return models[0];
            });
        }

        // Fetch LoRAs
        const loras = await getAvailableLoras(settings.serverAddress);
        if (loras && loras.length > 0) {
            setAvailableLoras(loras);
        }

        // Fetch Server Images
        const serverImgs = await getServerInputImages(settings.serverAddress);
        setAvailableServerImages(serverImgs);
    };

    const loadHistory = async () => {
        try {
            // Load shared history from Server
            const items = await loadHistoryFromServer(settings.serverAddress);

            // Reconstruct URLs dynamically based on current server settings
            const itemsWithUrls = items.map(item => ({
                ...item,
                imageUrl: `${settings.serverAddress}/view?filename=${encodeURIComponent(item.filename)}&type=${item.imageType}&subfolder=${encodeURIComponent(item.subfolder || '')}&t=${item.timestamp}`
            }));
            setHistory(itemsWithUrls);
        } catch (e) {
            console.error("Failed to load history from server", e);
        }
    }

    const setupWebSocket = () => {
        if (wsRef.current) wsRef.current.close();

        // Convert http/https to ws/wss and append clientId
        const wsProtocol = settings.serverAddress.startsWith('https') ? 'wss' : 'ws';
        const wsHost = settings.serverAddress.replace(/^https?:\/\//, '');
        const wsUrl = `${wsProtocol}://${wsHost}/ws?clientId=${clientId}`;

        try {
            const ws = new WebSocket(wsUrl);
            ws.onopen = () => console.log("Connected to ComfyUI WS with ID:", clientId);
            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    const activePromptId = currentPromptIdRef.current;

                    // Only process messages for the current prompt to avoid noise
                    if (msg.data && msg.data.prompt_id && activePromptId && msg.data.prompt_id !== activePromptId) {
                        return;
                    }

                    if (msg.type === 'execution_start') {
                        if (msg.data.prompt_id === activePromptId) {
                            setStatus(GenerationStatus.EXECUTING);
                            setStatusMessage("Loading Model...");
                            setProgress(0);
                        }
                    } else if (msg.type === 'executing') {
                        // Node execution started
                        const nodeId = msg.data.node;

                        if (nodeId === null) {
                            // Execution finished (handled by execution_success usually)
                        } else if (activePromptId) {
                            // Check for specific nodes to update status text
                            // KSampler ID is "3" in both workflows
                            if (nodeId === "3") {
                                setStatusMessage("Generating...");
                            }
                            // SaveImage ID is "9" (Generate) or "79" (Edit)
                            else if (nodeId === "9" || nodeId === "79") {
                                setStatusMessage("Saving...");
                                setProgress(99);
                            }
                            // We DO NOT blindly increment progress here anymore to avoid fluctuation.
                            // Progress is strictly controlled by 'progress' events or specific node milestones.
                        }
                    } else if (msg.type === 'progress') {
                        if (msg.data.prompt_id === activePromptId) {
                            const { value, max } = msg.data;
                            const percentage = Math.floor((value / max) * 100);
                            setProgress(percentage);
                            // Ensure status says generating when actual progress events come in
                            setStatusMessage("Generating...");
                        }
                    } else if (msg.type === 'execution_success') {
                        // Buffer the success message in case prompt ID isn't set yet (race condition)
                        pendingSuccessIds.current.add(msg.data.prompt_id);

                        if (msg.data.prompt_id === activePromptId) {
                            setProgress(100);
                            setStatus(GenerationStatus.FINISHED);
                            setStatusMessage("Finished");
                            fetchGenerationResult(msg.data.prompt_id);
                        }
                    } else if (msg.type === 'execution_error') {
                        if (msg.data.prompt_id === activePromptId) {
                            setStatus(GenerationStatus.ERROR);
                            setStatusMessage("Error");
                            setErrorMsg(msg.data.exception_message || "Execution error on server");
                        }
                    }
                } catch (e) {
                    console.error("Error parsing WS message", e);
                }
            };
            wsRef.current = ws;
        } catch (e) {
            console.error("WS Error", e);
        }
    };

    // --- Handlers ---

    const handleToggleThemeMode = () => {
        setSettings({ ...settings, darkMode: !settings.darkMode });
    }

    const handleLightningClick = () => {
        setLightningClickCount(prev => {
            const newCount = prev + 1;
            if (newCount >= 7) {
                const newVal = !settings.enableRemoteInput;
                setSettings(s => ({ ...s, enableRemoteInput: newVal }));
                setToastMessage(newVal ? "Remote Input Enabled 🔓" : "Remote Input Disabled 🔒");
                setTimeout(() => setToastMessage(null), 3000);
                return 0;
            }
            return newCount;
        });
    };

    const handleFileSelect = React.useCallback(async (index: number, file: File | null) => {
        if (file) {
            let processedFile = file;

            // HEIC/HEIF Conversion
            if (file.type === 'image/heic' || file.type === 'image/heif' ||
                file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {

                try {
                    // Safely access default export for heic2any to handle different build environments
                    // @ts-ignore
                    const converter = heic2any.default || heic2any;

                    const blob = await converter({
                        blob: file,
                        toType: "image/png",
                        quality: 0.8
                    });

                    const conversionResult = Array.isArray(blob) ? blob[0] : blob;
                    processedFile = new File(
                        [conversionResult],
                        file.name.replace(/\.(heic|heif)$/i, ".png"),
                        { type: "image/png" }
                    );
                } catch (e: any) {
                    console.error("HEIC conversion error", e);
                    setErrorMsg(`HEIC preview conversion failed: ${e.message}. Attempting to use original file.`);
                }
            }

            setImages(prev => {
                const newImages = [...prev];
                newImages[index] = {
                    type: 'file',
                    file: processedFile,
                    previewUrl: URL.createObjectURL(processedFile)
                };
                return newImages;
            });
        } else {
            setImages(prev => {
                const newImages = [...prev];
                newImages[index] = null;
                return newImages;
            });
        }
    }, []);

    const openServerSelector = React.useCallback(async (index: number) => {
        // Refresh list before opening
        const serverImgs = await getServerInputImages(settings.serverAddress);
        setAvailableServerImages(serverImgs);
        setShowServerSelector({ show: true, index });
    }, [settings.serverAddress]);

    const handleServerImageSelect = (filename: string) => {
        const index = showServerSelector.index;
        if (index === -1) return;

        const newImages = [...images];
        newImages[index] = {
            type: 'server',
            filename: filename,
            previewUrl: `${settings.serverAddress}/view?filename=${encodeURIComponent(filename)}&type=input`
        };
        setImages(newImages);
        setShowServerSelector({ show: false, index: -1 });
    };

    const handleUploadToServer = React.useCallback(async (index: number) => {
        setImages(currentImages => {
            const img = currentImages[index];
            if (!img || img.type !== 'file' || !img.file) return currentImages;

            // We can't easily wait for async in setState, so we trigger side effect here
            // This pattern is slightly tricky with async callbacks in functional updates.
            // Instead, we'll just read the current state from the closure if we assume this callback 
            // is recreated when images change, OR we use a ref for images.
            // However, since we want to optimize, let's stick to the original logic but wrapped.
            // Actually, to be truly stable, we shouldn't depend on `images` in the dependency array if possible.
            // But `images` is needed to get the file.
            // Let's rely on the fact that `images` changes less frequently than other things.
            return currentImages;
        });

        // Re-implementing to access state correctly without stale closures if we want stability
        // For now, let's just wrap the original logic but be mindful of dependencies.
        const img = images[index];
        if (!img || img.type !== 'file' || !img.file) return;

        setStatus(GenerationStatus.UPLOADING);
        setStatusMessage("Uploading Image...");
        try {
            const filename = await uploadImage(img.file, settings.serverAddress, false);

            setImages(prev => {
                const newImages = [...prev];
                newImages[index] = {
                    type: 'server',
                    filename: filename,
                    previewUrl: `${settings.serverAddress}/view?filename=${encodeURIComponent(filename)}&type=input`
                };
                return newImages;
            });

            const serverImgs = await getServerInputImages(settings.serverAddress);
            setAvailableServerImages(serverImgs);

            setStatus(GenerationStatus.IDLE);
            setStatusMessage("");
        } catch (e) {
            console.error("Upload failed", e);
            setErrorMsg("Failed to upload image to server.");
            setStatus(GenerationStatus.IDLE);
            setStatusMessage("");
        }
    }, [images, settings.serverAddress]);

    const handleClearImage = React.useCallback((index: number) => {
        setImages(prev => {
            const newImages = [...prev];
            newImages[index] = null;
            return newImages;
        });
    }, []);

    const randomizeSeed = () => setSeed(Math.floor(Math.random() * 1000000000000));

    const handleHistorySelect = async (item: HistoryItem) => {
        // Switch to the mode that created this item, if we can infer it, or stay in edit
        // For now, if we use as input, we likely want to Edit it.
        if (view !== 'edit') setView('edit');

        try {
            const res = await fetch(item.imageUrl);
            if (!res.ok) {
                throw new Error("File not found on server");
            }
            const blob = await res.blob();
            const file = new File([blob], "from_history.png", { type: "image/png" });
            handleFileSelect(0, file);
            setPrompt(item.prompt);
            setShowHistory(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            console.error("Failed to load history image", e);
            setErrorMsg("Failed to load image: The file may have been deleted from the server.");
        }
    };

    const handleToggleHistory = async () => {
        if (!showHistory) {
            await loadHistory();
        }
        setShowHistory(!showHistory);
    };

    const handleUseResult = async (targetView: 'edit' | 'video' = 'edit') => {
        if (!lastGeneratedImage) return;
        try {
            const response = await fetch(lastGeneratedImage);
            if (!response.ok) throw new Error("File missing");
            const blob = await response.blob();

            // If it's a video, we can't use it as input for edit/video (yet) unless we extract a frame
            // But the requirement says "when an image is generated... use as input for video generation"
            // So we assume the result is an image.
            if (blob.type.startsWith('video')) {
                setErrorMsg("Cannot use video as input.");
                return;
            }

            const file = new File([blob], `generated_${Date.now()}.png`, { type: "image/png" });

            // Free memory on server to prevent OOM when switching models
            await freeMemory(settings.serverAddress);

            // Add a small delay to ensure backend cleans up fully
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Auto-switch to target mode
            setView(targetView);
            handleFileSelect(0, file);

            setShowResultPreview(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            console.error("Failed to use image", e);
            setErrorMsg("Failed to load result image. It may have been deleted.");
        }
    };

    const handleResultClick = () => {
        if (settings.nsfwMode && !resultRevealed) {
            setResultRevealed(true);
        } else {
            setShowResultPreview(true);
        }
    };

    const handleClearResult = () => {
        setLastGeneratedImage(null);
        setLastGenerationDuration(0);
    };

    const handleInterrupt = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await interruptGeneration(settings.serverAddress);
        setStatus(GenerationStatus.IDLE);
        setProgress(0);
        setStatusMessage("Stopped");
        setErrorMsg("Generation stopped by user.");
    }

    const handleClearHistory = async () => {
        if (confirm("Are you sure you want to clear shared history AND delete all output images? This cannot be undone.")) {
            let error = null;

            // 1. Clear Server History
            try {
                await clearServerHistory(settings.serverAddress);
                setHistory([]);
                setShowHistory(false);
            } catch (e) {
                console.error(e);
                error = "Failed to clear server history";
            }

            // 2. Clear Output Images
            try {
                const response = await fetch('/api/clear-output', { method: 'POST' });
                const data = await response.json();
                if (!data.success) {
                    throw new Error(data.error || "Unknown error");
                }
            } catch (e) {
                console.error(e);
                error = error ? `${error} | Failed to clear output` : "Failed to clear output folder";
            }

        }
    }

    const handleDeleteImage = async (filename: string) => {
        if (confirm("Are you sure you want to delete this image? This cannot be undone.")) {
            try {
                const response = await fetch('/api/delete-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename })
                });
                const data = await response.json();
                if (data.success) {
                    setHistory(prev => prev.filter(item => item.filename !== filename));
                    setToastMessage("Image deleted 🗑️");
                    setTimeout(() => setToastMessage(null), 3000);

                    // If we deleted the last generated image, clear the preview
                    if (lastGeneratedImage && lastGeneratedImage.includes(filename)) {
                        setLastGeneratedImage(null);
                    }
                } else {
                    throw new Error(data.error || "Unknown error");
                }
            } catch (e) {
                console.error(e);
                setErrorMsg("Failed to delete image. Ensure you are running in dev mode.");
            }
        }
    };





    // --- Dynamic LoRA Handlers ---
    const handleAddLora = () => {
        if (loras.length >= 10) {
            setErrorMsg("Maximum 10 LoRAs allowed.");
            return;
        }
        const newLora: LoraSelection = {
            id: Date.now().toString(),
            name: availableLoras.length > 0 ? availableLoras[0] : "None",
            strength: 1.0,
            enabled: true
        };
        setLoras([...loras, newLora]);
    };

    const handleUpdateLora = React.useCallback((id: string, updates: Partial<LoraSelection>) => {
        setLoras(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    }, []);

    const handleDeleteLora = React.useCallback((id: string) => {
        setLoras(prev => prev.filter(l => l.id !== id));
    }, []);

    // Guard against outdated constants.ts file
    const validateWorkflow = (workflow: any, requiredNodes: string[]) => {
        for (const id of requiredNodes) {
            if (!workflow[id]) return id;
        }
        return null;
    };

    const handleGenerateClick = () => {
        executeGeneration();
    }

    const executeGeneration = async () => {
        // Dismiss keyboard on mobile
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        if (!isConnected) {
            setErrorMsg("Not connected to ComfyUI server.");
            return;
        }

        // Determine Seed and Prompt based on retry status
        let currentSeed = seed;
        let currentPrompt = prompt;

        // New generation
        if (settings.randomizeSeed) {
            currentSeed = Math.floor(Math.random() * 1000000000000);
            setSeed(currentSeed);
        }
        currentPrompt = prompt;

        // Update refs for tracking
        executingPromptRef.current = currentPrompt;
        executingSeedRef.current = currentSeed;
        startTimeRef.current = Date.now();
        executingInputFilenameRef.current = undefined;

        setErrorMsg(null);
        setStatus(GenerationStatus.UPLOADING);
        setStatusMessage("Uploading Images...");
        setProgress(0);
        setLastGeneratedImage(null);
        setResultRevealed(false);

        try {
            let workflow: any;

            // Resolution Logic
            let width = 720;
            let height = 1280;

            if (selectedResolution === 'custom') {
                width = Number(customDimensions.width);
                height = Number(customDimensions.height);
                // Fallback if empty or invalid
                if (!width || width <= 0) width = 720;
                if (!height || height <= 0) height = 1280;
            } else {
                const resConfig = ASPECT_RATIOS.find(r => r.id === selectedResolution);
                if (resConfig) {
                    width = resConfig.width;
                    height = resConfig.height;
                }
            }

            if (view === 'edit') {
                // --- EDIT MODE LOGIC ---
                if (!images[0]) {
                    setErrorMsg("Please select at least the first image.");
                    setStatus(GenerationStatus.IDLE);
                    setStatusMessage("");
                    return;
                }

                // Safety check for Edit workflow
                if (!BASE_WORKFLOW["129"]) {
                    setErrorMsg("Configuration Error: constants.ts file is outdated (Missing Node 129).");
                    setStatus(GenerationStatus.IDLE);
                    setStatusMessage("");
                    return;
                }

                // Upload Images
                const finalFilenames: (string | null)[] = [null, null, null];
                for (let i = 0; i < 3; i++) {
                    const img = images[i];
                    if (img) {
                        if (img.type === 'file' && img.file) {
                            finalFilenames[i] = await uploadImage(img.file, settings.serverAddress, true);
                        } else if (img.type === 'server' && img.filename) {
                            finalFilenames[i] = img.filename;
                        }
                    }
                }

                if (finalFilenames[0]) {
                    executingInputFilenameRef.current = finalFilenames[0];
                }

                setStatus(GenerationStatus.QUEUED);
                setStatusMessage("Queued...");
                workflow = JSON.parse(JSON.stringify(BASE_WORKFLOW));
                const missingNode = validateWorkflow(workflow, ["3", "8", "38", "39", "66", "79", "100", "102", "109", "110", "113", "114", "118", "129"]);
                if (missingNode) throw new Error(`Invalid Edit Workflow: Missing node ${missingNode}.`);

                workflow["3"].inputs.seed = currentSeed;
                workflow["3"].inputs.sampler_name = selectedSampler;
                workflow["3"].inputs.scheduler = selectedScheduler;
                workflow["113"].inputs.prompt = currentPrompt;
                workflow["110"].inputs.model_name = selectedModel;

                workflow["118"].inputs.width = width;
                workflow["118"].inputs.height = height;
                const mpx = Math.round((width * height) / 100000) / 10;
                workflow["100"].inputs.megapixels = Math.max(1, mpx);

                if (finalFilenames[0]) workflow["109"].inputs.image = finalFilenames[0];

                const addImageChain = (imgIndex: number, filename: string) => {
                    const loadId = (1000 + imgIndex).toString();
                    workflow[loadId] = JSON.parse(JSON.stringify(workflow["109"]));
                    workflow[loadId].inputs.image = filename;
                    workflow["113"].inputs[`image${imgIndex}`] = [loadId, 0];
                    workflow["114"].inputs[`image${imgIndex}`] = [loadId, 0];
                };

                workflow["113"].inputs.image1 = ["109", 0];
                workflow["114"].inputs.image1 = ["109", 0];

                if (finalFilenames[1]) addImageChain(2, finalFilenames[1]!);
                if (finalFilenames[2]) addImageChain(3, finalFilenames[2]!);

                // LoRA Stack
                const activeLoras = loras.filter(l => l.enabled);
                workflow["129"].inputs.lora_count = activeLoras.length;
                for (let i = 1; i <= 10; i++) {
                    workflow["129"].inputs[`lora_name_${i}`] = "None";
                    workflow["129"].inputs[`lora_strength_${i}`] = 1.0;
                }
                activeLoras.forEach((lora, index) => {
                    const slot = index + 1;
                    if (slot <= 10) {
                        workflow["129"].inputs[`lora_name_${slot}`] = lora.name;
                        workflow["129"].inputs[`lora_strength_${slot}`] = lora.strength;
                    }
                });

            } else if (view === 'generate') {
                // --- GENERATE MODE LOGIC ---
                setStatus(GenerationStatus.QUEUED);
                setStatusMessage("Queued...");
                workflow = JSON.parse(JSON.stringify(GENERATE_WORKFLOW));

                const missingNode = validateWorkflow(workflow, ["3", "6", "7", "8", "9", "13", "16", "17", "18"]);
                if (missingNode) throw new Error(`Invalid Generate Workflow: Missing node ${missingNode}.`);

                workflow["3"].inputs.seed = currentSeed;
                workflow["3"].inputs.sampler_name = selectedSampler;
                workflow["3"].inputs.scheduler = selectedScheduler;
                workflow["3"].inputs.steps = steps;

                // Apply Style
                const style = STYLES.find(s => s.id === selectedStyle);
                const stylePrompt = style ? style.prompt : "";
                workflow["6"].inputs.text = currentPrompt + stylePrompt;

                workflow["7"].inputs.text = negativePrompt;

                workflow["13"].inputs.width = width;
                workflow["13"].inputs.height = height;

            } else if (view === 'video') {
                // --- VIDEO MODE LOGIC ---
                if (!images[0] || (images[0].type === 'file' && !images[0].file) || (images[0].type === 'server' && !images[0].filename)) {
                    setErrorMsg("Please select an input image.");
                    setStatus(GenerationStatus.IDLE);
                    setStatusMessage("");
                    return;
                }

                // Upload Image if needed
                let filename = "";
                if (images[0].type === 'file' && images[0].file) {
                    filename = await uploadImage(images[0].file, settings.serverAddress, true);
                } else if (images[0].type === 'server' && images[0].filename) {
                    filename = images[0].filename;
                }
                executingInputFilenameRef.current = filename;

                setStatus(GenerationStatus.QUEUED);
                setStatusMessage("Queued...");
                workflow = JSON.parse(JSON.stringify(VIDEO_WORKFLOW));

                const missingNode = validateWorkflow(workflow, ["6", "7", "8", "38", "39", "50", "52", "57", "58", "61", "62", "63", "64", "66", "67", "68"]);
                if (missingNode) throw new Error(`Invalid Video Workflow: Missing node ${missingNode}.`);

                // Inputs
                workflow["52"].inputs.image = filename;
                workflow["6"].inputs.text = currentPrompt;

                // Resolution
                const resConfig = VIDEO_RESOLUTIONS.find(r => r.id === videoResolution);
                if (resConfig) {
                    workflow["50"].inputs.width = resConfig.width;
                    workflow["50"].inputs.height = resConfig.height;
                }

                // Length
                // Length
                workflow["50"].inputs.length = 16 * videoDuration + 1;

                // Seed
                workflow["57"].inputs.noise_seed = currentSeed;

                // Extend Logic
                if (!extendVideo) {
                    // Disable RIFE and second Video Combine by removing them or disconnecting
                    // The easiest way is to remove them and ensure nothing depends on them (nothing does)
                    delete workflow["82"];
                    delete workflow["83"];
                }
            }

            // 4. Queue
            const promptId = await queuePrompt(workflow, settings.serverAddress, clientId);
            currentPromptIdRef.current = promptId;

            // Save to Prompt History
            if (view === 'generate' && currentPrompt.trim()) {
                setPromptHistory(prev => {
                    const newHistory = [currentPrompt, ...prev.filter(p => p !== currentPrompt)].slice(0, 10);
                    return newHistory;
                });
            }

            // Check if we ALREADY received the success message (race condition fix)
            if (pendingSuccessIds.current.has(promptId)) {
                setStatus(GenerationStatus.FINISHED);
                setStatusMessage("Finished");
                setProgress(100);
                fetchGenerationResult(promptId);
                pendingSuccessIds.current.delete(promptId);
                return;
            }

            // Check history immediately in case it was cached
            try {
                const historyData = await getHistory(promptId, settings.serverAddress);
                if (historyData && historyData[promptId]) {
                    setStatus(GenerationStatus.FINISHED);
                    setStatusMessage("Finished");
                    setProgress(100);
                    fetchGenerationResult(promptId);
                }
            } catch (e) {
                // History not ready yet
            }

        } catch (err: any) {
            console.error(err);
            setStatus(GenerationStatus.ERROR);
            setStatusMessage("Error");
            setErrorMsg(err.message || "Unknown error occurred");
        }
    };

    const fetchGenerationResult = async (promptId: string) => {
        if (status === GenerationStatus.FINISHED && lastGeneratedImage) return;

        try {
            await new Promise(resolve => setTimeout(resolve, 300));
            const historyData = await getHistory(promptId, settings.serverAddress);
            const promptHistory = historyData[promptId];

            if (!promptHistory) throw new Error("History not found for prompt ID");

            const outputs = promptHistory.outputs;

            // Helper to get output files (images or gifs)
            const getOutputFiles = (nodeOutput: any) => {
                if (!nodeOutput) return [];
                return nodeOutput.images || nodeOutput.gifs || [];
            };

            // Determine output node based on viewRef to avoid stale closures in WebSocket callback
            let outputNodeId = viewRef.current === 'generate' ? "9" : "79";

            if (viewRef.current === 'video') {
                // If extendVideo is true (we can't easily check state inside async callback without ref, 
                // but we can check if node 82 exists in outputs)
                if (outputs["82"] && getOutputFiles(outputs["82"]).length > 0) {
                    outputNodeId = "82";
                } else {
                    outputNodeId = "63";
                }
            }

            // Robust fallback: If the expected node ID has no images, search for ANY node with images.
            // This handles cases where node IDs shift or where the view state might still be mismatched.
            if (getOutputFiles(outputs[outputNodeId]).length === 0) {
                const foundNodeId = Object.keys(outputs).find(key => getOutputFiles(outputs[key]).length > 0);
                if (foundNodeId) {
                    outputNodeId = foundNodeId;
                }
            }

            const outputFiles = getOutputFiles(outputs[outputNodeId]);
            if (outputFiles.length > 0) {
                const imgInfo = outputFiles[0];

                const imageUrl = `${settings.serverAddress}/view?filename=${encodeURIComponent(imgInfo.filename)}&type=${imgInfo.type}&subfolder=${encodeURIComponent(imgInfo.subfolder || '')}&t=${Date.now()}`;

                const duration = Date.now() - startTimeRef.current;
                setLastGenerationDuration(duration);
                setLastGeneratedImage(imageUrl);
                setResultRevealed(false);

                const newItem: HistoryItem = {
                    id: promptId,
                    filename: imgInfo.filename,
                    subfolder: imgInfo.subfolder || '',
                    imageType: imgInfo.type,
                    inputFilename: executingInputFilenameRef.current,
                    imageUrl: imageUrl,
                    prompt: executingPromptRef.current,
                    seed: executingSeedRef.current,
                    timestamp: Date.now(),
                    duration: duration
                };

                const currentServerHistory = await loadHistoryFromServer(settings.serverAddress);
                const updatedHistory = [newItem, ...currentServerHistory];
                await saveHistoryToServer(updatedHistory, settings.serverAddress);

                const displayHistory = updatedHistory.map(item => ({
                    ...item,
                    imageUrl: `${settings.serverAddress}/view?filename=${encodeURIComponent(item.filename)}&type=${item.imageType}&subfolder=${encodeURIComponent(item.subfolder || '')}&t=${item.timestamp}`
                }));
                setHistory(displayHistory);

            } else {
                throw new Error("No output images found in history");
            }
        } catch (e: any) {
            console.error("Failed to fetch result image", e);
            setErrorMsg("Generated successfully, but failed to retrieve image: " + e.message);
        }
    };

    // Helper to determine the input preview URL correctly handling blob URLs
    const getComparisonInputUrl = () => {
        if (!settings.enableComparison || view !== 'edit' || !images[0]?.previewUrl) return '';

        const url = images[0].previewUrl;
        // If it's a blob URL, don't append query params as it invalidates the blob reference
        if (url.startsWith('blob:')) return url;

        return `${url}&t=${Date.now()}`;
    };

    return (
        <div className={`max-w-md mx-auto min-h-screen bg-gray-50 dark:bg-gray-950 relative shadow-2xl overflow-x-hidden ${lastGeneratedImage && !showResultPreview ? 'pb-96' : 'pb-24'} transition-colors duration-300`}>

            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium z-[100] animate-fade-in backdrop-blur-md shadow-lg border border-white/10">
                    {toastMessage}
                </div>
            )}

            {/* Header */}
            <header className={`p-4 bg-white dark:bg-gray-900 flex justify-between items-center border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 transition-colors duration-300`}>
                <div className="flex items-center gap-2">
                    {view !== 'home' && (
                        <button
                            onClick={() => {
                                setView('home');
                                setLastGeneratedImage(null);
                            }}
                            className="mr-1 p-1 -ml-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    )}
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-700 to-gray-900 dark:from-gray-100 dark:to-gray-400">
                        QwenfyUI
                    </h1>
                    <div onClick={handleLightningClick} className="cursor-pointer">
                        <Zap
                            size={18}
                            fill="currentColor"
                            className={`transition-all duration-500 ${isConnected ? `text-${settings.theme}-500` : 'text-red-500'}`}
                            style={isConnected ? { filter: `drop-shadow(0 0 3px currentColor)` } : {}}
                        />
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            handleToggleThemeMode();
                            haptic.trigger('medium');
                            sound.play('click');
                        }}
                        className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400`}
                    >
                        {settings.darkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    {view !== 'home' && (
                        <button
                            onClick={handleToggleHistory}
                            className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${showHistory ? `text-${settings.theme}-600 dark:text-${settings.theme}-400` : 'text-gray-600 dark:text-gray-400'}`}
                        >
                            <HistoryIcon size={20} />
                        </button>
                    )}
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${showSettings ? `text-${settings.theme}-600 dark:text-${settings.theme}-400` : 'text-gray-600 dark:text-gray-400'}`}
                    >
                        <Settings size={20} />
                    </button>
                </div>
            </header>

            {/* Settings Modal */}
            {showSettings && (
                <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 animate-fade-in absolute w-full z-30 shadow-2xl transition-colors duration-300">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">ComfyUI Server Address</label>
                            <input
                                type="text"
                                value={settings.serverAddress}
                                onChange={(e) => setSettings({ ...settings, serverAddress: e.target.value })}
                                className={`w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded p-2 text-sm text-gray-800 dark:text-gray-200 focus:border-${settings.theme}-500 outline-none transition-colors`}
                            />
                        </div>

                        {/* Theme Selector */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-2">Interface Color</label>
                            <div className="grid grid-cols-6 gap-2">
                                {THEME_OPTIONS.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setSettings({ ...settings, theme: color })}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${settings.theme === color ? 'ring-2 ring-gray-400 dark:ring-white scale-110' : 'opacity-60 hover:opacity-100'}`}
                                        style={{ backgroundColor: COLOR_HEX[color] }}
                                        title={color.charAt(0).toUpperCase() + color.slice(1)}
                                    >
                                        {settings.theme === color && <Check size={14} className="text-white drop-shadow-sm" />}
                                    </button>
                                ))}

                                {/* Custom Color Picker */}
                                <div className="relative w-8 h-8">
                                    <div
                                        className={`w-full h-full rounded-full flex items-center justify-center transition-all overflow-hidden bg-gradient-to-br from-red-500 via-green-500 to-blue-500 ${settings.theme === 'custom' ? 'ring-2 ring-gray-400 dark:ring-white scale-110' : 'opacity-60 hover:opacity-100'}`}
                                        title="Custom Color"
                                    >
                                        {settings.theme === 'custom' && <Check size={14} className="text-white drop-shadow-md" />}
                                    </div>
                                    <input
                                        type="color"
                                        value={settings.customColor || '#ffffff'}
                                        onChange={(e) => setSettings({ ...settings, theme: 'custom', customColor: e.target.value })}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        title="Choose custom color"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-800">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">NSFW Blur</span>
                            <button
                                onClick={() => setSettings({ ...settings, nsfwMode: !settings.nsfwMode })}
                                className={`w-12 h-6 rounded-full relative transition-colors ${settings.nsfwMode ? `bg-${settings.theme}-600` : 'bg-gray-300 dark:bg-gray-700'}`}
                            >
                                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.nsfwMode ? 'translate-x-6' : ''}`} />
                            </button>
                        </div>

                        {/* Comparison Slider Toggle */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-800">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Comparison Slider</span>
                                <span className="text-[10px] text-gray-500">Show Before/After slider for edits</span>
                            </div>
                            <button
                                onClick={() => setSettings({ ...settings, enableComparison: !settings.enableComparison })}
                                className={`w-12 h-6 rounded-full relative transition-colors ${settings.enableComparison ? `bg-${settings.theme}-600` : 'bg-gray-300 dark:bg-gray-700'}`}
                            >
                                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.enableComparison ? 'translate-x-6' : ''}`} />
                            </button>
                        </div>

                        {/* Feedback Toggle */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-800">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sounds/Haptics</span>
                                <span className="text-[10px] text-gray-500">Vibration (Android) or Sound (iOS)</span>
                            </div>
                            <button
                                onClick={() => {
                                    setSettings({ ...settings, enableFeedback: !settings.enableFeedback });
                                    if (!settings.enableFeedback) {
                                        // Trigger feedback immediately to demonstrate
                                        if (haptic.isSupported()) {
                                            haptic.trigger('medium');
                                        } else {
                                            sound.play('click');
                                        }
                                    }
                                }}
                                className={`w-12 h-6 rounded-full relative transition-colors ${settings.enableFeedback ? `bg-${settings.theme}-600` : 'bg-gray-300 dark:bg-gray-700'}`}
                            >
                                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.enableFeedback ? 'translate-x-6' : ''}`} />
                            </button>
                        </div>

                        <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                            <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase">Server Data</h3>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={handleClearHistory}
                                    className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 py-2 rounded text-sm transition-colors border border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-800"
                                >
                                    <Trash2 size={14} /> Clear History
                                </button>

                            </div>
                        </div>
                    </div>
                </div>
            )}

            {view === 'home' ? (
                <main className="p-6 flex flex-col items-center justify-center min-h-[80vh] gap-6">
                    <div className="text-center mb-4">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome</h2>
                        <p className="text-gray-500 dark:text-gray-400">Choose a workflow to begin</p>
                    </div>

                    <button
                        onClick={() => {
                            setView('generate');
                            haptic.trigger('medium');
                            sound.play('click');
                        }}
                        className={`w-full max-w-sm group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl border-2 border-transparent hover:border-${settings.theme}-500 transition-all transform hover:scale-[1.02]`}
                    >
                        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-${settings.theme}-500`}>
                            <Wand2 size={100} />
                        </div>
                        <div className="relative z-10 flex flex-col items-start">
                            <div className={`p-3 rounded-xl bg-${settings.theme}-100 dark:bg-${settings.theme}-900/50 text-${settings.theme}-600 dark:text-${settings.theme}-400 mb-4`}>
                                <Wand2 size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Generate Image</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-left">Create new images from text prompts using Turbo Diffusion.</p>
                        </div>
                    </button>

                    <button
                        onClick={() => {
                            setView('edit');
                            haptic.trigger('medium');
                            sound.play('click');
                        }}
                        className={`w-full max-w-sm group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl border-2 border-transparent hover:border-${settings.theme}-500 transition-all transform hover:scale-[1.02]`}
                    >
                        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-${settings.theme}-500`}>
                            <PenTool size={100} />
                        </div>
                        <div className="relative z-10 flex flex-col items-start">
                            <div className={`p-3 rounded-xl bg-${settings.theme}-100 dark:bg-${settings.theme}-900/50 text-${settings.theme}-600 dark:text-${settings.theme}-400 mb-4`}>
                                <PenTool size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Edit Image</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-left">Modify existing images with Qwen Image Edit.</p>
                        </div>
                    </button>

                    <button
                        onClick={() => {
                            setView('video');
                            haptic.trigger('medium');
                            sound.play('click');
                        }}
                        className={`w-full max-w-sm group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl border-2 border-transparent hover:border-${settings.theme}-500 transition-all transform hover:scale-[1.02]`}
                    >
                        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-${settings.theme}-500`}>
                            <Monitor size={100} />
                        </div>
                        <div className="relative z-10 flex flex-col items-start">
                            <div className={`p-3 rounded-xl bg-${settings.theme}-100 dark:bg-${settings.theme}-900/50 text-${settings.theme}-600 dark:text-${settings.theme}-400 mb-4`}>
                                <Monitor size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Generate Video</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-left">Animate images using Wan2.1 Video Generation.</p>
                        </div>
                    </button>
                </main>
            ) : (
                <main className="p-4 space-y-6 pb-24">

                    {/* EDIT MODE: Model & Images */}
                    {view === 'edit' && (
                        <>
                            {/* Model Selection */}
                            <div className="bg-white dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-800 transition-colors duration-300 shadow-sm">
                                <label className="block text-xs font-medium text-gray-500 mb-2">Model</label>
                                <div className="relative">
                                    <Cpu size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                    <select
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                        className={`w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-xs text-gray-800 dark:text-gray-200 py-2 pl-8 pr-8 appearance-none focus:border-${settings.theme}-500 outline-none transition-colors`}
                                    >
                                        {availableModels.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                </div>
                            </div>

                            {/* Image Inputs */}
                            <div className="grid grid-cols-3 gap-3">
                                {images.map((img, idx) => (
                                    <ImageInput
                                        key={idx}
                                        index={idx}
                                        image={img}
                                        disabled={idx > 0 && !images[0]}
                                        onFileSelect={handleFileSelect}
                                        onServerSelectRequest={openServerSelector}
                                        onUpload={handleUploadToServer}
                                        onClear={handleClearImage}
                                        theme={settings.theme}
                                        allowRemote={settings.enableRemoteInput}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    {/* VIDEO MODE: Image Input */}
                    {view === 'video' && (
                        <div className="grid grid-cols-1 gap-3">
                            <ImageInput
                                index={0}
                                image={images[0]}
                                disabled={false}
                                onFileSelect={handleFileSelect}
                                onServerSelectRequest={openServerSelector}
                                onUpload={handleUploadToServer}
                                onClear={handleClearImage}
                                theme={settings.theme}
                                allowRemote={settings.enableRemoteInput}
                            />
                        </div>
                    )}

                    {/* Prompt Input (Common) */}
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800 relative shadow-sm transition-colors duration-300">



                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-medium text-gray-500">Positive Prompt</span>
                            {settings.enableRemoteInput && (
                                <PromptManager
                                    currentPrompt={prompt}
                                    serverAddress={settings.serverAddress}
                                    onLoadPrompt={setPrompt}
                                    theme={settings.theme}
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



                    {/* GENERATE MODE: Negative Prompt */}
                    {view === 'generate' && (
                        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800 relative shadow-sm transition-colors duration-300">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-medium text-gray-500">Negative Prompt</span>
                            </div>
                            <textarea
                                value={negativePrompt}
                                onChange={(e) => setNegativePrompt(e.target.value)}
                                placeholder="Things to avoid..."
                                className={`w-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 rounded p-3 text-sm min-h-[60px] focus:ring-1 focus:ring-${settings.theme}-500 outline-none border border-gray-300 dark:border-gray-800 placeholder-gray-400 dark:placeholder-gray-600 resize-none transition-colors`}
                            />
                        </div>
                    )}

                    {/* GENERATE MODE: Styles */}
                    {view === 'generate' && (
                        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800 relative shadow-sm transition-colors duration-300">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-medium text-gray-500">Styles</span>
                            </div>
                            <div className="overflow-x-auto no-scrollbar p-1">
                                <div className="flex gap-2">
                                    {STYLES.map(style => (
                                        <button
                                            key={style.id}
                                            onClick={() => setSelectedStyle(style.id)}
                                            className={`flex-shrink-0 relative overflow-hidden rounded-lg w-20 h-12 flex items-center justify-center transition-all ${selectedStyle === style.id ? 'ring-2 ring-offset-1 ring-offset-white dark:ring-offset-gray-900 ring-' + settings.theme + '-500 scale-105' : 'opacity-80 hover:opacity-100'}`}
                                        >
                                            <div className={`absolute inset-0 ${style.color}`} />
                                            <span className={`relative z-10 text-[10px] font-bold ${style.id === 'none' ? 'text-gray-800 dark:text-gray-200' : (style.id === 'watercolor' || style.id === 'vintage' ? 'text-gray-800' : 'text-white')} drop-shadow-sm`}>{style.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Last Generated Result Card (Non-Sticky) */}
                    {lastGeneratedImage && !showResultPreview && (
                        <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden animate-fade-in transition-colors duration-300">
                            <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                                <span className={`text-xs font-medium text-${settings.theme}-600 dark:text-${settings.theme}-400 flex items-center gap-1`}>
                                    <Check size={12} /> Generation Complete
                                </span>
                                <div className="flex gap-4">
                                    <a
                                        href={lastGeneratedImage}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1"
                                        title="Open in New Tab"
                                    >
                                        <ExternalLink size={14} />
                                    </a>
                                    {/* Only show "Use as Input" buttons if it's an image */}
                                    {!lastGeneratedImage.match(/\.(mp4|webm|mov)($|\?|&)/i) && (
                                        <>
                                            <button onClick={() => handleUseResult('edit')} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1" title="Use as Edit Input">
                                                <PenTool size={14} />
                                            </button>
                                            <button onClick={() => handleUseResult('video')} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1" title="Use as Video Input">
                                                <Monitor size={14} />
                                            </button>
                                        </>
                                    )}
                                    <button onClick={handleClearResult} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1" title="Close Preview">
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                            <div className="relative h-64 bg-gray-100 dark:bg-black/50 group cursor-pointer" onClick={handleResultClick}>
                                {lastGeneratedImage.match(/\.(mp4|webm|mov)($|\?|&)/i) ? (
                                    <video
                                        src={lastGeneratedImage}
                                        className="w-full h-full object-contain"
                                        controls
                                        autoPlay
                                        loop
                                        muted
                                    />
                                ) : (
                                    <>
                                        <img
                                            src={lastGeneratedImage}
                                            className={`w-full h-full object-contain ${settings.nsfwMode && !resultRevealed ? 'blur-md' : ''}`}
                                            alt="Result"
                                        />
                                        {settings.nsfwMode && !resultRevealed && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <EyeOff className="text-gray-800 dark:text-white opacity-80" size={24} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/30 dark:bg-black/0 group-hover:bg-white/40 dark:group-hover:bg-black/20 transition-colors pointer-events-none">
                                            <Maximize2 className="text-gray-900 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" size={24} />
                                        </div>
                                    </>
                                )}

                                {/* Duration Badge */}
                                {lastGenerationDuration > 0 && (
                                    <div className="absolute bottom-2 right-2 bg-white/80 dark:bg-black/60 backdrop-blur text-gray-900 dark:text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                        <Clock size={10} />
                                        {(lastGenerationDuration / 1000).toFixed(1)}s
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Config (Collapsible) */}
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
                                    </>
                                )}

                                {/* Resolution Control (Generate/Edit) */}
                                {view !== 'video' && (
                                    <div className="p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-colors">
                                        <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Aspect Ratio</span>
                                        <div className="flex gap-2 flex-wrap">
                                            {ASPECT_RATIOS.map(res => {
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
                                                onClick={() => setSettings({ ...settings, randomizeSeed: !settings.randomizeSeed })}
                                                className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${settings.randomizeSeed
                                                    ? `bg-${settings.theme}-100 dark:bg-${settings.theme}-900/30 text-${settings.theme}-600 dark:text-${settings.theme}-300 font-medium`
                                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                                    }`}
                                                title="Auto-randomize seed on generate"
                                            >
                                                <Sparkles size={12} /> Auto
                                            </button>
                                            <button onClick={randomizeSeed} className={`text-${settings.theme}-500 dark:text-${settings.theme}-400 hover:text-${settings.theme}-600 dark:hover:text-${settings.theme}-300`}>
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

                                {/* LoRAs (Only in Edit Mode) */}
                                {view === 'edit' && (
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

                                        {settings.enableRemoteInput && (
                                            <button
                                                onClick={handleAddLora}
                                                disabled={loras.length >= 10}
                                                className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-${settings.theme}-600 dark:hover:text-${settings.theme}-400 hover:border-${settings.theme}-500/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                <Plus size={18} /> Add LoRA
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Error Message */}
                    {errorMsg && (
                        <div className="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-200 p-3 rounded-lg text-sm flex items-start gap-2">
                            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                </main>
            )}

            {/* Result Preview Modal (Full Screen) */}
            {showResultPreview && lastGeneratedImage && (
                <CompareModal
                    resultImage={lastGeneratedImage}
                    inputImage={getComparisonInputUrl()}
                    onClose={() => setShowResultPreview(false)}
                    onUseResult={handleUseResult}
                    nsfwMode={settings.nsfwMode}
                    theme={settings.theme}
                />
            )}

            {/* Bottom Bar: Generate Button & Status */}
            {view !== 'home' && (
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
            )}



            {/* History Modal */}
            {showHistory && (
                <HistoryGallery
                    history={history}
                    onSelect={handleHistorySelect}
                    onClose={() => setShowHistory(false)}
                    onDelete={handleDeleteImage}
                    nsfwMode={settings.nsfwMode}
                    theme={settings.theme}
                    serverAddress={settings.serverAddress}
                />
            )}

            {/* Server Image Selector Modal */}
            {showServerSelector.show && (
                <ServerImageSelector
                    serverAddress={settings.serverAddress}
                    images={availableServerImages}
                    onSelect={handleServerImageSelect}
                    onClose={() => setShowServerSelector({ show: false, index: -1 })}
                    theme={settings.theme}
                />
            )}

        </div>
    );
}
