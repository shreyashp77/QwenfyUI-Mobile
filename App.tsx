
import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { BASE_WORKFLOW, BASE_WORKFLOW_2511, GENERATE_WORKFLOW, VIDEO_WORKFLOW, VIDEO_EXTEND_CONCAT_WORKFLOW, STYLES, VIDEO_RESOLUTIONS, VIDEO_MODELS } from './constants';
import { HistoryItem, GenerationStatus, InputImage, LoraSelection, ViewMode } from './types';
import { uploadImage, queuePrompt, checkServerConnection, getHistory, getAvailableLoras, getServerInputImages, interruptGeneration, loadHistoryFromServer, saveHistoryToServer, clearServerHistory, freeMemory, loadPinHash } from './services/comfyService';
import ImageInput from './components/ImageInput';
import HistoryGallery from './components/HistoryGallery';
import ServerImageSelector from './components/ServerImageSelector';
import CompareModal from './components/CompareModal';
import Header from './components/Header';
import SettingsPanel from './components/SettingsPanel';
import HomeScreen from './components/HomeScreen';
import ResultCard from './components/ResultCard';
import VersionSelector from './components/VersionSelector';
import PromptInput from './components/PromptInput';
import AdvancedOptions, { ASPECT_RATIOS } from './components/AdvancedOptions';
import GenerationBottomBar from './components/GenerationBottomBar';
import PinOverlay from './components/PinOverlay'; // NEW
// Hooks & Utils
import { useAppSettings } from './hooks/useAppSettings';
import { generateClientId } from './utils/idUtils';
import { hashPin } from './utils/cryptoUtils';
import { stripImageMetadata } from './utils/imageUtils'; // NEW
// Import heic2any for HEIF conversion
import heic2any from 'heic2any';
import { haptic } from './services/hapticService';
import { sound } from './services/soundService';

const DEFAULT_MODEL = "svdq-fp4_r128-qwen-image-edit-2509-lightning-4steps-251115.safetensors";
const PENDING_GENERATION_KEY = 'pending_generation_state';

export default function App() {
    // --- State ---
    const [view, setView] = useState<ViewMode>('home');
    const viewRef = useRef<ViewMode>('home'); // Ref to track view for stale closures

    // Extracted Settings Logic
    const { settings, setSettings } = useAppSettings();

    const [clientId] = useState(() => generateClientId());
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // PIN State
    const [isLocked, setIsLocked] = useState(false);
    const [serverPinHash, setServerPinHash] = useState<string | null>(null);

    // Model
    const [selectedModel] = useState<string>(DEFAULT_MODEL); // Fixed r128 model for 2509
    const [editModelVersion, setEditModelVersion] = useState<'2509' | '2511'>('2509');

    // Handler for version switching with auto VRAM clear
    const handleVersionChange = async (newVersion: '2509' | '2511') => {
        if (newVersion !== editModelVersion) {
            console.log(`Switching from ${editModelVersion} to ${newVersion}, clearing VRAM...`);
            try {
                await freeMemory(settings.serverAddress);
            } catch (e) {
                console.warn('Failed to clear VRAM on version switch:', e);
            }
            setEditModelVersion(newVersion);
        }
    };

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
    const [loras, setLoras] = useState<LoraSelection[]>([]); // Dynamic LoRA list


    // Video Generation State
    const [extendVideo, setExtendVideo] = useState(false);
    const [fastVideoMode, setFastVideoMode] = useState(true);
    const [enhancedVideoMode, setEnhancedVideoMode] = useState(false);
    const [videoDuration, setVideoDuration] = useState(4);
    const [videoResolution, setVideoResolution] = useState('480x832');
    // Track original video path for concatenation workflow
    const [originalVideoPath, setOriginalVideoPath] = useState<string | null>(null);





    // Execution
    const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
    const [progress, setProgress] = useState(0); // 0-100
    const [statusMessage, setStatusMessage] = useState<string>(""); // Granular status text
    const [lastGeneratedImage, setLastGeneratedImage] = useState<string[] | null>(null);
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
    const executionPhaseRef = useRef<number>(0);
    const lastProgressValueRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);
    const wsRef = useRef<WebSocket | null>(null);

    const pendingSuccessIds = useRef<Set<string>>(new Set()); // Buffer for race-condition success messages
    const historySaveQueue = useRef<Promise<void>>(Promise.resolve()); // Sequential queue for history saves
    const tempFilesToDelete = useRef<Set<string>>(new Set()); // Track temp files for deferred cleanup


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

    // Color manipulation and ID generation logic moved to utils/
    // Persistence and Theme Effects moved to useAppSettings hook

    // Check connection on mount and when server address changes
    useEffect(() => {
        const check = async () => {
            const connected = await checkServerConnection(settings.serverAddress);
            setIsConnected(connected);
            if (connected) {
                // PIN Check
                const pinHash = await loadPinHash(settings.serverAddress);
                if (pinHash) {
                    setServerPinHash(pinHash);
                    setIsLocked(true);
                } else {
                    setServerPinHash(null);
                    setIsLocked(false);
                }

                setupWebSocket();
                fetchModels();
                loadHistory(); // Load history from server
                checkPendingGeneration(); // Check for pending generation
            }
        };
        check();

        // Cleanup WS
        return () => {
            if (wsRef.current) wsRef.current.close();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings.serverAddress]);

    const checkPendingGeneration = () => {
        try {
            const savedState = localStorage.getItem(PENDING_GENERATION_KEY);
            if (savedState) {
                const parsedState = JSON.parse(savedState);
                console.log("Restoring pending generation state:", parsedState);

                if (parsedState.promptId) {
                    // Restore Refs
                    currentPromptIdRef.current = parsedState.promptId;
                    executingPromptRef.current = parsedState.prompt || "";
                    executingSeedRef.current = parsedState.seed || 0;
                    executingInputFilenameRef.current = parsedState.inputFilename;
                    startTimeRef.current = parsedState.startTime || Date.now();

                    // Recover View (if stored, otherwise guess or stay)
                    // (Optional: could store view in pending state too)

                    // Recover View
                    if (parsedState.view) {
                        setView(parsedState.view);
                        // Update ref immediately just in case of race conditions
                        viewRef.current = parsedState.view;
                    }

                    // Set Status to enable Polling/WS listeners
                    setStatus(GenerationStatus.EXECUTING);
                    setStatusMessage("Resuming...");
                }
            }
        } catch (e) {
            console.error("Failed to restore pending generation", e);
        }
    };





    // Polling fallback for flaky WS or missed messages
    useEffect(() => {
        let interval: any;
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
        // Model selection removed - using fixed r128 model for 2509

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

            // Deduplicate items based on ID to ensure UI is clean
            const uniqueItems = itemsWithUrls.filter((item, index, self) =>
                index === self.findIndex((t) => t.id === item.id)
            );

            setHistory(uniqueItems);
        } catch (e) {
            console.error("Failed to load history from server", e);
        }
    }

    const setupWebSocket = () => {
        if (wsRef.current) wsRef.current.close();

        // Convert http/https to ws/wss and append clientId
        // Determine WebSocket URL
        let wsUrl = '';
        if (settings.serverAddress.startsWith('/')) {
            // Relative path (Proxy mode)
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            wsUrl = `${protocol}//${window.location.host}/ws?clientId=${clientId}`;
        } else {
            // Absolute path (Direct mode)
            // Check for explicit http:// or https:// prefix
            const isHttps = settings.serverAddress.startsWith('https://');
            const wsProtocol = isHttps ? 'wss' : 'ws';
            const wsHost = settings.serverAddress.replace(/^https?:\/\//, '');
            wsUrl = `${wsProtocol}://${wsHost}/ws?clientId=${clientId}`;
        }

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
                            // Reset progress tracking
                            executionPhaseRef.current = 0;
                            lastProgressValueRef.current = 0;
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
                        }
                    } else if (msg.type === 'progress') {
                        // Accept progress messages if:
                        // 1. prompt_id matches activePromptId, OR
                        // 2. No activePromptId set yet (message arrived before queuePrompt returned)
                        const messagePromptId = msg.data?.prompt_id;
                        const shouldProcessProgress = (messagePromptId === activePromptId) ||
                            (!activePromptId && messagePromptId);

                        if (shouldProcessProgress) {
                            const { value, max, node } = msg.data;
                            let percentage = Math.floor((value / max) * 100);

                            // Special handling for Video generation
                            // We use specific Node IDs from VIDEO_WORKFLOW to map progress ranges
                            const isVideoView = viewRef.current === 'video';
                            if (isVideoView && node) {
                                // Video Extension preprocessing nodes - map to 0-10%
                                if (node === "89") {
                                    // VHS_LoadVideoPath - loading original video
                                    percentage = Math.floor((value / max) * 8);
                                    setStatusMessage("Loading original video...");
                                }
                                else if (node === "91") {
                                    // ImageBatch - merging frames, small step
                                    percentage = 8 + Math.floor((value / max) * 2);
                                }
                                // Node 57: First KSampler (Steps 0-2) -> 10% - 35%
                                else if (node === "57") {
                                    percentage = 10 + Math.floor((value / max) * 25);
                                }
                                // Node 58: Second KSampler (Steps 2-End) -> 35% - 70%
                                else if (node === "58") {
                                    percentage = 35 + Math.floor((value / max) * 35);
                                }
                                // Node 83: RIFE VFI -> 70% - 92%
                                else if (node === "83") {
                                    percentage = 70 + Math.floor((value / max) * 22);
                                }
                                // Node 8: VAEDecode -> 92% - 95%
                                else if (node === "8") {
                                    percentage = 92 + Math.floor((value / max) * 3);
                                    setStatusMessage("Decoding video...");
                                }
                                // Node 63 or 82: Video Combine -> 95-100%
                                else if (node === "63" || node === "82") {
                                    percentage = 95 + Math.floor((value / max) * 5);
                                    setStatusMessage("Combining video...");
                                }
                                // Fallback: Use global 0-100 for any other node but ensure monotonic increase
                                else {
                                    // Keep progress at whatever was last set, or use global percentage
                                    // Don't let unknown nodes reset progress to lower value
                                }
                            } else if (isVideoView) {
                                // Fallback for video if no node ID
                                // Detect phase reset (current value less than last value)
                                if (value < lastProgressValueRef.current) {
                                    executionPhaseRef.current++;
                                }
                                lastProgressValueRef.current = value;

                                // Calculate 2-phase progress (0-50%, 50-100%)
                                const phase = executionPhaseRef.current;
                                if (phase <= 1) {
                                    percentage = Math.floor((phase * 50) + ((value / max) * 50));
                                } else {
                                    percentage = 99;
                                }
                            }

                            setProgress(prev => Math.max(prev, percentage));
                            setStatusMessage("Generating...");
                        }
                    } else if (msg.type === 'execution_success') {
                        // Buffer the success message in case prompt ID isn't set yet (race condition)
                        pendingSuccessIds.current.add(msg.data.prompt_id);

                        if (msg.data.prompt_id === activePromptId) {
                            setProgress(100);
                            setStatus(GenerationStatus.FINISHED);
                            setStatusMessage("Finished");
                            haptic.trigger('success');
                            sound.play('success');
                            fetchGenerationResult(msg.data.prompt_id);
                        }
                    } else if (msg.type === 'execution_error') {
                        if (msg.data.prompt_id === activePromptId) {
                            setStatus(GenerationStatus.ERROR);
                            setStatusMessage("Error");
                            setErrorMsg(msg.data.exception_message || "Execution error on server");
                            cleanupTempFiles();
                            localStorage.removeItem(PENDING_GENERATION_KEY);
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

    const handleFileSelect = React.useCallback(async (index: number, file: File | null, isTemporary: boolean = false) => {
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
                    previewUrl: URL.createObjectURL(processedFile),
                    isTemporary: isTemporary
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
            const filename = await uploadImage(img.file, settings.serverAddress, false, 'input');

            // If Incognito, mark for deletion after generation
            if (settings.incognito) {
                tempFilesToDelete.current.add(filename);
            }

            setImages(prev => {
                const newImages = [...prev];
                newImages[index] = {
                    type: 'server',
                    filename: filename,
                    previewUrl: `${settings.serverAddress}/view?filename=${encodeURIComponent(filename)}&type=input`,
                    isTemporary: settings.incognito // Mark visually or logically if needed
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

    const handleHistorySelect = async (item: HistoryItem, targetView: 'edit' | 'video' = 'edit') => {
        // Switch to the mode that created this item, if we can infer it, or stay in edit
        // For now, if we use as input, we likely want to Edit it.
        if (view !== targetView) setView(targetView);

        try {
            const res = await fetch(item.imageUrl);
            if (!res.ok) throw new Error("Failed to fetch image from history");
            const blob = await res.blob();
            const file = new File([blob], `history_${Date.now()}.png`, { type: "image/png" });

            // Pass true for isTemporary to mark this as a temporary input
            handleFileSelect(0, file, true);

            setPrompt(item.prompt);
            if (item.seed) setSeed(item.seed);

            setShowHistory(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            console.error("Failed to load history item", e);
            setErrorMsg("Failed to load image from history.");
        }
    };

    // Handler for extending a video from history - similar to handleExtendVideo but uses history item URL
    const handleHistoryExtendVideo = async (item: HistoryItem) => {
        const videoUrl = item.imageUrl;

        // Check if it's actually a video
        if (!videoUrl.match(/\.(mp4|webm|mov)($|\?|&)/i)) {
            setErrorMsg("Cannot extend non-video content.");
            return;
        }

        try {
            setStatusMessage("Extracting last frame...");

            // Create a video element to load the video and extract the last frame
            const extractLastFrame = (): Promise<File> => {
                return new Promise((resolve, reject) => {
                    const video = document.createElement('video');
                    video.crossOrigin = 'anonymous';
                    video.muted = true;
                    video.playsInline = true;

                    video.onloadedmetadata = () => {
                        // Seek to the last frame (duration - small offset)
                        video.currentTime = Math.max(0, video.duration - 0.05);
                    };

                    video.onseeked = () => {
                        // Create canvas and draw the frame
                        const canvas = document.createElement('canvas');
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;

                        const ctx = canvas.getContext('2d');
                        if (!ctx) {
                            reject(new Error("Could not create canvas context"));
                            return;
                        }

                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                        // Convert to blob, then to File
                        canvas.toBlob((blob) => {
                            if (!blob) {
                                reject(new Error("Could not capture frame"));
                                return;
                            }

                            const file = new File([blob], `last_frame_${Date.now()}.png`, { type: 'image/png' });
                            resolve(file);
                        }, 'image/png');
                    };

                    video.onerror = () => {
                        reject(new Error("Failed to load video"));
                    };

                    video.src = videoUrl;
                    video.load();
                });
            };

            const lastFrameFile = await extractLastFrame();
            console.log("Extracted last frame from history:", lastFrameFile.name, lastFrameFile.size, "bytes");

            // Extract video path for concatenation workflow
            // URL format: /view?filename=xxx&type=output&subfolder=yyy
            try {
                const url = new URL(videoUrl, window.location.origin);
                const filename = url.searchParams.get('filename');
                const subfolder = url.searchParams.get('subfolder') || '';
                if (filename) {
                    const vidPath = subfolder ? `output/${subfolder}/${filename}` : `output/${filename}`;
                    setOriginalVideoPath(vidPath);
                    console.log("Stored original video path for concat (from history):", vidPath);
                }
            } catch (urlError) {
                console.warn("Could not parse video URL for concat:", urlError);
                setOriginalVideoPath(null);
            }

            // Free memory before loading new models
            await freeMemory(settings.serverAddress);
            await new Promise(resolve => setTimeout(resolve, 500));

            // Navigate to video view
            setView('video');

            // Use the extracted frame as the video input
            handleFileSelect(0, lastFrameFile, true);

            // Optionally copy the prompt from the original video
            if (item.prompt) setPrompt(item.prompt);

            setShowHistory(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Show toast to confirm
            setToastMessage("Last frame extracted - configure and generate");
            setTimeout(() => setToastMessage(null), 3000);
            setStatusMessage("");

        } catch (e) {
            console.error("Failed to extract last frame from history", e);
            setErrorMsg("Failed to extract last frame from video: " + (e as Error).message);
            setStatusMessage("");
        }
    };

    const handleToggleHistory = async () => {
        if (!showHistory) {
            await loadHistory();
        }
        setShowHistory(!showHistory);
    };

    const handleUseResult = async (targetView: 'edit' | 'video' = 'edit') => {
        if (!lastGeneratedImage || lastGeneratedImage.length === 0) return;

        // Use the first image for now
        const targetUrl = lastGeneratedImage[0];

        try {
            const response = await fetch(targetUrl);
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
            handleFileSelect(0, file, true);

            setShowResultPreview(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            console.error("Failed to use image", e);
            setErrorMsg("Failed to load result image. It may have been deleted.");
        }
    };

    // Handler for extending a video - extracts last frame CLIENT-SIDE and uses for new video generation
    const handleExtendVideo = async () => {
        if (!lastGeneratedImage || lastGeneratedImage.length === 0) return;

        const videoUrl = lastGeneratedImage[0];

        // Check if it's actually a video
        if (!videoUrl.match(/\.(mp4|webm|mov)($|\?|&)/i)) {
            setErrorMsg("Cannot extend non-video content.");
            return;
        }

        try {
            setStatusMessage("Extracting last frame...");

            // Create a video element to load the video and extract the last frame
            const extractLastFrame = (): Promise<File> => {
                return new Promise((resolve, reject) => {
                    const video = document.createElement('video');
                    video.crossOrigin = 'anonymous';
                    video.muted = true;
                    video.playsInline = true;

                    video.onloadedmetadata = () => {
                        // Seek to the last frame (duration - small offset)
                        video.currentTime = Math.max(0, video.duration - 0.05);
                    };

                    video.onseeked = () => {
                        // Create canvas and draw the frame
                        const canvas = document.createElement('canvas');
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;

                        const ctx = canvas.getContext('2d');
                        if (!ctx) {
                            reject(new Error("Could not create canvas context"));
                            return;
                        }

                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                        // Convert to blob, then to File
                        canvas.toBlob((blob) => {
                            if (!blob) {
                                reject(new Error("Could not capture frame"));
                                return;
                            }

                            const file = new File([blob], `last_frame_${Date.now()}.png`, { type: 'image/png' });
                            resolve(file);
                        }, 'image/png');
                    };

                    video.onerror = () => {
                        reject(new Error("Failed to load video"));
                    };

                    video.src = videoUrl;
                    video.load();
                });
            };

            const lastFrameFile = await extractLastFrame();
            console.log("Extracted last frame:", lastFrameFile.name, lastFrameFile.size, "bytes");

            // Extract video path for concatenation workflow
            // URL format: /view?filename=xxx&type=output&subfolder=yyy
            try {
                const url = new URL(videoUrl, window.location.origin);
                const filename = url.searchParams.get('filename');
                const subfolder = url.searchParams.get('subfolder') || '';
                if (filename) {
                    const vidPath = subfolder ? `output/${subfolder}/${filename}` : `output/${filename}`;
                    setOriginalVideoPath(vidPath);
                    console.log("Stored original video path for concat:", vidPath);
                }
            } catch (urlError) {
                console.warn("Could not parse video URL for concat, will generate without merge:", urlError);
                setOriginalVideoPath(null);
            }

            // Free memory before loading new models
            await freeMemory(settings.serverAddress);
            await new Promise(resolve => setTimeout(resolve, 500));

            // Navigate to video view
            setView('video');

            // Use the extracted frame as the video input (marked as temporary so it cleans up)
            handleFileSelect(0, lastFrameFile, true);

            setShowResultPreview(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Show toast to confirm
            setToastMessage("Last frame extracted - configure and generate");
            setTimeout(() => setToastMessage(null), 3000);
            setStatusMessage("");

        } catch (e) {
            console.error("Failed to extract last frame", e);
            setErrorMsg("Failed to extract last frame from video: " + (e as Error).message);
            setStatusMessage("");
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
        setStatusMessage("Stopped");
        setErrorMsg("Generation stopped by user.");
        cleanupTempFiles();
        localStorage.removeItem(PENDING_GENERATION_KEY);
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

    const handleFreeMemory = async () => {
        try {
            await freeMemory(settings.serverAddress);
            setToastMessage("VRAM Cleared successfully 🧹");
            setTimeout(() => setToastMessage(null), 3000);
            if (haptic.isSupported()) haptic.trigger('light');
            else sound.play('click');
        } catch (e) {
            console.error(e);
            setErrorMsg("Failed to clear VRAM");
        }
    };

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

                    // If it was a video, also try to delete the corresponding thumbnail
                    if (filename.match(/\.(mp4|webm|mov)$/i)) {
                        const thumbFilename = filename.replace(/\.(mp4|webm|mov)$/i, ".png");
                        try {
                            await fetch('/api/delete-image', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ filename: thumbFilename })
                            });
                        } catch (e) {
                            console.warn("Failed to delete thumbnail", e);
                        }
                    }

                    // If we deleted the last generated image, clear the preview
                    // If we deleted the last generated image, remove it from view
                    if (lastGeneratedImage && lastGeneratedImage.length > 0) {
                        const newLast = lastGeneratedImage.filter(img => !img.includes(filename));
                        setLastGeneratedImage(newLast.length > 0 ? newLast : null);
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

    const handleDeleteInputImage = async (filename: string) => {
        try {
            const res = await fetch(`/api/delete-input-image`, {
                method: 'POST',
                body: JSON.stringify({ filename })
            });
            const data = await res.json();

            if (data.success) {
                setAvailableServerImages(prev => prev.filter(img => img !== filename));
                setToastMessage("Image deleted 🗑️");
                setTimeout(() => setToastMessage(null), 3000);
            } else {
                setErrorMsg(data.error || "Failed to delete input image.");
            }
        } catch (e) {
            console.error(e);
            setErrorMsg("Failed to delete input image.");
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

    const validateWorkflow = (workflow: any, requiredNodes: string[]) => {
        for (const id of requiredNodes) {
            if (!workflow[id]) return id;
        }
        return null;
    };

    const cleanupTempFiles = async () => {
        // Delete all files that were marked for cleanup
        // Files are added to this set when: isTemporary (AI-generated input) OR incognito mode was on at upload time

        if (tempFilesToDelete.current.size === 0) return;
        const files = Array.from(tempFilesToDelete.current);
        console.log("Cleaning up temporary input files:", files);

        // Helper to wait
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        for (const filename of files) {
            let deleted = false;
            const maxRetries = 3;

            for (let i = 0; i < maxRetries; i++) {
                try {
                    const res = await fetch(`/api/delete-input-image`, {
                        method: 'POST',
                        body: JSON.stringify({ filename })
                    });
                    const data = await res.json();

                    if (data.success) {
                        console.log(`Deleted ${filename} successfully.`);
                        deleted = true;
                        tempFilesToDelete.current.delete(filename);
                        break;
                    } else {
                        // warning
                    }
                } catch (e) {
                    // error
                }
                if (i < maxRetries - 1) await delay(1000);
            }
            if (!deleted) {
                console.warn(`Failed to delete ${filename} after retries.`);
            }
        }
    };

    const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.width, height: img.height });
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    };

    const handleGenerateClick = () => {
        executeGeneration();
    };

    const executeGeneration = async () => {
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
        // setLastGeneratedImage(null); // Keep previous result
        setResultRevealed(false);

        // Track temporary files for cleanup


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
            } else if (selectedResolution === 'auto' && view === 'edit') {
                // Auto Mode Logic (Preserve Input Dimensions)
                if (images[0]) {
                    try {
                        if (images[0].type === 'file' && images[0].file) {
                            const dims = await getImageDimensions(images[0].file);
                            width = dims.width;
                            height = dims.height;
                        } else if (images[0].previewUrl) {
                            // Try to get dims from preview URL
                            const img = new Image();
                            await new Promise((resolve, reject) => {
                                img.onload = resolve;
                                img.onerror = reject;
                                img.src = images[0]?.previewUrl || '';
                            });
                            width = img.width;
                            height = img.height;
                        }
                    } catch (e) {
                        console.error("Failed to determine auto dimensions", e);
                        // Fallback already set to 720x1280
                    }
                }
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
                if (editModelVersion === '2509' && !BASE_WORKFLOW["129"]) {
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
                            // Metadata Stripping
                            let fileToUpload = img.file;
                            if (settings.stripMetadata) {
                                try {
                                    fileToUpload = await stripImageMetadata(fileToUpload);
                                } catch (e) {
                                    console.error("Failed to strip metadata", e);
                                }
                            }

                            const filename = await uploadImage(fileToUpload, settings.serverAddress, true, 'input');
                            finalFilenames[i] = filename;

                            // If temporary (history item) OR Incognito, mark for deletion
                            if (img.isTemporary || settings.incognito) {
                                tempFilesToDelete.current.add(filename);
                            }
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

                if (editModelVersion === '2509') {
                    // --- 2509 (Nunchaku) Workflow ---
                    workflow = JSON.parse(JSON.stringify(BASE_WORKFLOW));
                    const missingNode = validateWorkflow(workflow, ["3", "8", "38", "39", "66", "79", "100", "102", "109", "110", "113", "114", "118", "129"]);
                    if (missingNode) throw new Error(`Invalid Edit Workflow (2509): Missing node ${missingNode}.`);

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

                    // Connect text encoders directly to LoadImage
                    workflow["113"].inputs.image1 = ["109", 0];
                    workflow["114"].inputs.image1 = ["109", 0];

                    const addImageChain = (imgIndex: number, filename: string) => {
                        const loadId = (1000 + imgIndex).toString();
                        workflow[loadId] = JSON.parse(JSON.stringify(workflow["109"]));
                        workflow[loadId].inputs.image = filename;
                        workflow["113"].inputs[`image${imgIndex}`] = [loadId, 0];
                        workflow["114"].inputs[`image${imgIndex}`] = [loadId, 0];
                    };

                    if (finalFilenames[1]) addImageChain(2, finalFilenames[1]!);
                    if (finalFilenames[2]) addImageChain(3, finalFilenames[2]!);

                    // LoRA Stack - Always activate with at least 1 to properly initialize model
                    const activeLoras = loras.filter(l => l.enabled);
                    // IMPORTANT: Set lora_count to minimum 1 to force proper model initialization
                    // This fixes the issue when switching from 2511 GGUF to 2509 Nunchaku
                    workflow["129"].inputs.lora_count = Math.max(1, activeLoras.length);
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


                } else {
                    // --- 2511 (GGUF) Workflow ---
                    workflow = JSON.parse(JSON.stringify(BASE_WORKFLOW_2511));
                    const missingNode = validateWorkflow(workflow, ["8", "9", "10", "41", "61", "64", "65", "67", "68", "69", "70", "71", "74", "75", "88"]);
                    if (missingNode) throw new Error(`Invalid Edit Workflow (2511): Missing node ${missingNode}.`);

                    // Set seed, sampler, scheduler on KSampler (node 65)
                    workflow["65"].inputs.seed = currentSeed;
                    workflow["65"].inputs.sampler_name = selectedSampler;
                    workflow["65"].inputs.scheduler = selectedScheduler;
                    workflow["68"].inputs.prompt = currentPrompt;

                    // Set input image
                    if (finalFilenames[0]) workflow["41"].inputs.image = finalFilenames[0];

                    // LoRA Chaining for 2511
                    // The mandatory Lightning LoRA is node 74, which connects to node 88 (GGUF loader)
                    // We chain additional LoRAs BEFORE the mandatory one (between GGUF and Lightning)
                    const activeLoras = loras.filter(l => l.enabled);

                    if (activeLoras.length > 0) {
                        let previousModelNode = "88"; // Start from GGUF loader

                        activeLoras.forEach((lora, index) => {
                            const loraNodeId = `user_lora_${index}`;
                            workflow[loraNodeId] = {
                                inputs: {
                                    lora_name: lora.name,
                                    strength_model: lora.strength,
                                    model: [previousModelNode, 0]
                                },
                                class_type: "LoraLoaderModelOnly",
                                _meta: { title: `User LoRA: ${lora.name}` }
                            };
                            previousModelNode = loraNodeId;
                        });

                        // Connect the mandatory Lightning LoRA (node 74) to the last user LoRA
                        workflow["74"].inputs.model = [previousModelNode, 0];
                    }
                    // If no user LoRAs, the Lightning LoRA already connects to node 88 (GGUF loader)
                }

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

                workflow["13"].inputs.width = width;
                workflow["13"].inputs.height = height;

                // Apply Style
                const style = STYLES.find(s => s.id === selectedStyle);
                const stylePrompt = style ? style.prompt : "";
                workflow["6"].inputs.text = currentPrompt + stylePrompt;

                workflow["7"].inputs.text = negativePrompt;

                // Dynamic LoRA Loading (Chaining)
                const activeLoras = loras.filter(l => l.enabled);
                let currentModelNode = "16"; // Start with the UNETLoader

                activeLoras.forEach((lora, index) => {
                    const loraNodeId = `lora_${index}`;
                    workflow[loraNodeId] = {
                        inputs: {
                            lora_name: lora.name,
                            strength_model: lora.strength,
                            model: [currentModelNode, 0]
                        },
                        class_type: "LoraLoaderModelOnly",
                        _meta: { title: `Lora: ${lora.name}` }
                    };
                    currentModelNode = loraNodeId;
                });

                // Connect the final model node to the KSampler
                workflow["3"].inputs.model = [currentModelNode, 0];

            } else if (view === 'video') {
                // --- VIDEO MODE LOGIC ---
                const isExtendingWithConcat = originalVideoPath !== null;

                if (isExtendingWithConcat) {
                    // VIDEO EXTENSION MODE WITH CONCATENATION
                    // Uses VIDEO_EXTEND_CONCAT_WORKFLOW to merge original + new video
                    console.log("Video Extension Mode (Concat) - original video:", originalVideoPath);

                    if (!images[0] || (images[0].type === 'file' && !images[0].file)) {
                        setErrorMsg("Missing extracted frame for extension.");
                        setStatus(GenerationStatus.IDLE);
                        setStatusMessage("");
                        return;
                    }

                    setStatus(GenerationStatus.QUEUED);
                    setStatusMessage("Queued (Extension + Merge)...");
                    workflow = JSON.parse(JSON.stringify(VIDEO_EXTEND_CONCAT_WORKFLOW));

                    // Validate concat workflow nodes (includes 89, 90, 91 for merge)
                    const missingNode = validateWorkflow(workflow, ["6", "7", "8", "38", "39", "50", "57", "58", "61", "62", "63", "64", "66", "67", "68", "89", "90", "91"]);
                    if (missingNode) throw new Error(`Invalid Video Extend Concat Workflow: Missing node ${missingNode}.`);

                    // Construct absolute video path for VHS_LoadVideoPath (node 89)
                    // originalVideoPath is like "output/wan22_00001.mp4"
                    // We need full path like "D:/GenAI/imagen/comfy-nunchaku/ComfyUI/output/wan22_00001.mp4"
                    const comfyBase = settings.comfyUIBasePath || import.meta.env.VITE_COMFYUI_PATH || '';
                    if (!comfyBase) {
                        throw new Error("ComfyUI path not configured. Set VITE_COMFYUI_PATH in .env file or configure in settings.");
                    }
                    const absoluteVideoPath = `${comfyBase}/${originalVideoPath}`;
                    console.log("Video extension - absolute path:", absoluteVideoPath);
                    workflow["89"].inputs.video = absoluteVideoPath;

                    // Note: Node 90 (ImageFromBatch) extracts last frame from node 89 for WanImageToVideo
                    // Node 91 (VHS_MergeImages) combines frames from node 89 + node 8 (VAEDecode output)
                    // Node 63 (VHS_VideoCombine) uses merged frames from node 91

                    // Set prompt
                    workflow["6"].inputs.text = currentPrompt;

                    // Clear the original video path after using it
                    setOriginalVideoPath(null);
                } else {
                    // NORMAL VIDEO GENERATION FROM IMAGE
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
                        console.log("Uploaded video input:", filename, "isTemporary:", images[0].isTemporary);
                        if (images[0].isTemporary) {
                            tempFilesToDelete.current.add(filename);
                        }
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
                }

                // Handle Fast Mode (Swap Models)
                if (fastVideoMode) {
                    console.log("Using Fast Mode (Q4 Models)");
                    workflow["61"].inputs.unet_name = VIDEO_MODELS.HIGH_NOISE.FAST;
                    workflow["62"].inputs.unet_name = VIDEO_MODELS.LOW_NOISE.FAST;
                } else {
                    console.log("Using Standard Mode (Q5 Models)");
                    workflow["61"].inputs.unet_name = VIDEO_MODELS.HIGH_NOISE.STANDARD;
                    workflow["62"].inputs.unet_name = VIDEO_MODELS.LOW_NOISE.STANDARD;
                }

                // Enhanced Mode (Easter Egg) - Overrides Fast/Standard
                if (settings.enableRemoteInput && enhancedVideoMode) {
                    console.log("Using Enhanced Mode (DSW Models, No LoRA)");

                    // 1. Set Models
                    workflow["61"].inputs.unet_name = VIDEO_MODELS.HIGH_NOISE.ENHANCED;
                    workflow["62"].inputs.unet_name = VIDEO_MODELS.LOW_NOISE.ENHANCED;

                    // 2. Bypass LoRA Nodes
                    // Standard High: Unet(61) -> LoRA(64) -> Sampling(67)
                    // Enhanced High: Unet(61) -> Sampling(67)
                    workflow["67"].inputs.model = ["61", 0];

                    // Standard Low: Unet(62) -> LoRA(66) -> Sampling(68)
                    // Enhanced Low: Unet(62) -> Sampling(68)
                    workflow["68"].inputs.model = ["62", 0];
                }

                // Resolution
                if (videoResolution === 'auto') {
                    // Calculate from input image
                    let w = 720;
                    let h = 1280;

                    // Only try to get dimensions from images[0] if it exists (not in extension mode)
                    if (images[0] && images[0].type === 'file' && images[0].file) {
                        try {
                            const dims = await getImageDimensions(images[0].file);
                            w = dims.width;
                            h = dims.height;
                        } catch (e) {
                            console.error("Failed to get image dims", e);
                        }
                    } else if (images[0] && images[0].previewUrl) {
                        // Try to get dims from preview URL (if preloaded) or fallback
                        // It's harder to get dims from server file without loading it. 
                        // For now, let's load the previewUrl in an invisible Image
                        try {
                            const img = new Image();
                            await new Promise((resolve, reject) => {
                                img.onload = resolve;
                                img.onerror = reject;
                                img.src = images[0]?.previewUrl || '';
                            });
                            w = img.width;
                            h = img.height;
                        } catch (e) {
                            console.error("Failed to load server image for dims", e);
                        }
                    }

                    // Minimum Resolution Strategy
                    // If height is small (<= 832), default to 480x832
                    if (h <= 832) {
                        w = 480;
                        h = 832;
                    } else {
                        // Max limit and Alignment for larger images
                        const MAX_DIM = 1280;
                        if (w > MAX_DIM || h > MAX_DIM) {
                            const ratio = w / h;
                            if (w > h) {
                                w = MAX_DIM;
                                h = Math.round(MAX_DIM / ratio);
                            } else {
                                h = MAX_DIM;
                                w = Math.round(MAX_DIM * ratio);
                            }
                        }
                    }

                    // Align to 16
                    w = Math.round(w / 16) * 16;
                    h = Math.round(h / 16) * 16;

                    workflow["50"].inputs.width = w;
                    workflow["50"].inputs.height = h;

                } else {
                    const resConfig = VIDEO_RESOLUTIONS.find(r => r.id === videoResolution);
                    if (resConfig) {
                        workflow["50"].inputs.width = resConfig.width;
                        workflow["50"].inputs.height = resConfig.height;
                    }
                }

                // Length
                workflow["50"].inputs.length = 16 * videoDuration + 1;

                // Seed
                workflow["57"].inputs.noise_seed = currentSeed;

                // Extend Logic
                if (!extendVideo) {
                    // Disable RIFE and second Video Combine by removing them or disconnecting
                    delete workflow["82"];
                    delete workflow["83"];
                }
            }

            // 4. Queue Loop
            const promptId = await queuePrompt(workflow, settings.serverAddress, clientId);
            currentPromptIdRef.current = promptId;

            // Save to Prompt History (only once)
            if (view === 'generate' && currentPrompt.trim() && !settings.incognito) {
                setPromptHistory(prev => {
                    const newHistory = [currentPrompt, ...prev.filter(p => p !== currentPrompt)].slice(0, 10);
                    return newHistory;
                });
            }

            // Save Pending State
            const pendingState = {
                promptId,
                prompt: currentPrompt,
                seed: currentSeed,
                inputFilename: executingInputFilenameRef.current,
                startTime: startTimeRef.current,
                view: view
            };
            localStorage.setItem(PENDING_GENERATION_KEY, JSON.stringify(pendingState));

            // Check if we already received success message (race condition)
            if (pendingSuccessIds.current.has(promptId)) {
                fetchGenerationResult(promptId);
                pendingSuccessIds.current.delete(promptId);
            }

        } catch (err: any) {
            console.error(err);
            setStatus(GenerationStatus.ERROR);
            setStatusMessage("Error");
            setErrorMsg(err.message || "Unknown error occurred");
            setErrorMsg(err.message || "Unknown error occurred");
            cleanupTempFiles(); // Clean up immediately on error
            localStorage.removeItem(PENDING_GENERATION_KEY);
        }
    };

    const fetchGenerationResult = async (promptId: string) => {

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
                // Replace existing images (to clear previous generation)
                setLastGeneratedImage([imageUrl]);
                setResultRevealed(false);

                setStatus(GenerationStatus.FINISHED);
                setStatusMessage("Finished");
                setProgress(100);

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


                setHistory(prev => {
                    // Prevent duplicate entries for the same promptId
                    if (prev.some(item => item.id === newItem.id)) {
                        return prev;
                    }

                    const newHistory = [newItem, ...prev];

                    // Queue the save operation to run sequentially
                    // This prevents race conditions where parallel saves overwrite each other on the server
                    historySaveQueue.current = historySaveQueue.current.then(async () => {
                        try {
                            await saveHistoryToServer(newHistory, settings.serverAddress);
                        } catch (e) {
                            console.error("Failed to save history to server", e);
                        }
                    });

                    return newHistory;
                });

            } else {
                throw new Error("No output images found in history");
            }
        } catch (e: any) {
            console.error("Failed to fetch result image", e);
            setErrorMsg("Generated successfully, but failed to retrieve image: " + e.message);
        } finally {
            cleanupTempFiles();
            localStorage.removeItem(PENDING_GENERATION_KEY);
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

    // PIN Handlers
    const handleUnlock = async (pin: string): Promise<boolean> => {
        if (!serverPinHash) return false;
        const hashed = await hashPin(pin);
        if (hashed === serverPinHash) {
            setIsLocked(false);
            return true;
        }
        return false;
    };

    // Callback for when PIN changes in Settings
    const handleRefreshPin = async () => {
        const pinHash = await loadPinHash(settings.serverAddress);
        setServerPinHash(pinHash || null);
    };

    return (
        <div className={`max-w-md mx-auto min-h-screen bg-gray-50 dark:bg-gray-950 relative shadow-2xl overflow-x-hidden ${lastGeneratedImage && !showResultPreview ? 'pb-96' : 'pb-24'} transition-colors duration-300`}>
            {/* Security Overlay */}
            {isLocked && (
                <PinOverlay
                    onUnlock={handleUnlock}
                    title="Locked"
                    subtitle="Enter PIN to access"
                />
            )}

            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium z-[100] animate-fade-in backdrop-blur-md shadow-lg border border-white/10">
                    {toastMessage}
                </div>
            )}

            {/* Header */}
            <Header
                view={view}
                isConnected={isConnected}
                theme={settings.theme}
                darkMode={settings.darkMode}
                showSettings={showSettings}
                showHistory={showHistory}
                incognito={settings.incognito}
                onBack={() => {
                    setView('home');
                    setLastGeneratedImage(null);
                }}
                onToggleThemeMode={() => {
                    handleToggleThemeMode();
                    haptic.trigger('medium');
                    sound.play('click');
                }}
                onToggleHistory={handleToggleHistory}
                onToggleSettings={() => setShowSettings(!showSettings)}
                onLightningClick={handleLightningClick}
            />

            {/* Settings Modal */}
            {showSettings && (
                <SettingsPanel
                    settings={settings}
                    onSettingsChange={setSettings}
                    onClearHistory={handleClearHistory}
                    onFreeMemory={handleFreeMemory}
                    isPinSet={!!serverPinHash}
                    onUpdatePin={handleRefreshPin}
                />
            )}

            {
                view === 'home' ? (
                    <HomeScreen theme={settings.theme} onSelectView={setView} />
                ) : (
                    <main className="p-4 space-y-6 pb-24">

                        {/* EDIT MODE: Model & Images */}
                        {view === 'edit' && (
                            <>
                                <VersionSelector
                                    selectedVersion={editModelVersion}
                                    onVersionChange={handleVersionChange}
                                    theme={settings.theme}
                                />


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

                        {/* GENERATE MODE: Batch Count Slider */}


                        {/* Prompt Input (Common) */}
                        <PromptInput
                            prompt={prompt}
                            setPrompt={setPrompt}
                            settings={settings}
                            promptHistory={promptHistory}
                            view={view}
                        />



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

                        {/* Last Generated Result Card */}
                        {lastGeneratedImage && lastGeneratedImage.length > 0 && !showResultPreview && (
                            <ResultCard
                                images={lastGeneratedImage}
                                duration={lastGenerationDuration}
                                nsfwMode={settings.nsfwMode}
                                resultRevealed={resultRevealed}
                                theme={settings.theme}
                                onUseResult={handleUseResult}
                                onExtendVideo={handleExtendVideo}
                                onClear={handleClearResult}
                                onImageClick={() => setShowResultPreview(true)}
                            />
                        )}

                        {/* Config (Collapsible) */}
                        <AdvancedOptions
                            view={view}
                            settings={settings}
                            onSettingsChange={setSettings}
                            videoResolution={videoResolution}
                            setVideoResolution={setVideoResolution}
                            videoDuration={videoDuration}
                            setVideoDuration={setVideoDuration}
                            extendVideo={extendVideo}
                            setExtendVideo={setExtendVideo}
                            fastVideoMode={fastVideoMode}
                            setFastVideoMode={(val) => {
                                setFastVideoMode(val);
                                if (val) setEnhancedVideoMode(false);
                            }}
                            enhancedVideoMode={enhancedVideoMode}
                            setEnhancedVideoMode={(val) => {
                                setEnhancedVideoMode(val);
                                if (val) setFastVideoMode(false);
                            }}
                            selectedResolution={selectedResolution}
                            setSelectedResolution={setSelectedResolution}
                            customDimensions={customDimensions}
                            setCustomDimensions={setCustomDimensions}
                            seed={seed}
                            setSeed={setSeed}
                            randomizeSeedFunction={randomizeSeed}
                            steps={steps}
                            setSteps={setSteps}
                            selectedSampler={selectedSampler}
                            setSelectedSampler={setSelectedSampler}
                            selectedScheduler={selectedScheduler}
                            setSelectedScheduler={setSelectedScheduler}
                            loras={loras}
                            availableLoras={availableLoras}
                            handleAddLora={handleAddLora}
                            handleUpdateLora={handleUpdateLora}
                            handleDeleteLora={handleDeleteLora}
                        />

                        {/* Error Message */}
                        {errorMsg && (
                            <div className="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-200 p-3 rounded-lg text-sm flex items-start gap-2">
                                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                    </main>
                )
            }

            {/* Result Preview Modal (Full Screen) */}
            {
                showResultPreview && lastGeneratedImage && (
                    <CompareModal
                        resultImage={Array.isArray(lastGeneratedImage) ? lastGeneratedImage[0] : lastGeneratedImage}
                        inputImage={getComparisonInputUrl()}
                        onClose={() => setShowResultPreview(false)}
                        onUseResult={handleUseResult}
                        nsfwMode={settings.nsfwMode}
                        theme={settings.theme}
                        isVideo={view === 'video'}
                    />
                )
            }

            {/* Bottom Bar: Generate Button & Status */}
            {
                view !== 'home' && (
                    <GenerationBottomBar
                        view={view}
                        status={status}
                        progress={progress}
                        statusMessage={statusMessage}
                        handleGenerateClick={handleGenerateClick}
                        handleInterrupt={handleInterrupt}
                        settings={settings}
                    />
                )
            }
            {/* History Modal */}
            {
                showHistory && (
                    <HistoryGallery
                        history={history}
                        onSelect={(item) => handleHistorySelect(item, 'edit')}
                        onSelectVideo={(item) => handleHistorySelect(item, 'video')}
                        onExtendVideo={handleHistoryExtendVideo}
                        onClose={() => setShowHistory(false)}
                        onDelete={handleDeleteImage}
                        nsfwMode={settings.nsfwMode}
                        theme={settings.theme}
                        serverAddress={settings.serverAddress}
                    />
                )
            }

            {/* Server Image Selector Modal */}
            {
                showServerSelector.show && (
                    <ServerImageSelector
                        serverAddress={settings.serverAddress}
                        images={availableServerImages}
                        onSelect={handleServerImageSelect}
                        onClose={() => setShowServerSelector({ show: false, index: -1 })}
                        theme={settings.theme}
                        onDelete={handleDeleteInputImage}
                    />
                )
            }

        </div >
    );
}
