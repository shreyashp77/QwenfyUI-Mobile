
import React, { useState, useEffect, useRef } from 'react';
import { Settings, History as HistoryIcon, Zap, Loader2, RefreshCw, AlertCircle, EyeOff, ExternalLink, Cpu, Clock, ArrowUpRight, X, Maximize2, ChevronDown, ChevronRight, SlidersHorizontal, Square, Trash2, FileType, Check, Plus, Palette, Moon, Sun, Monitor, Smartphone, Sparkles } from 'lucide-react';
import { BASE_WORKFLOW } from './constants';
import { HistoryItem, GenerationStatus, AppSettings, InputImage, ThemeColor, LoraSelection } from './types';
import { uploadImage, queuePrompt, checkServerConnection, getAvailableNunchakuModels, getHistory, getAvailableLoras, getServerInputImages, interruptGeneration, loadHistoryFromServer, saveHistoryToServer, clearServerHistory, clearSavedPrompts } from './services/comfyService';
import LoraControl from './components/LoraControl';
import ImageInput from './components/ImageInput';
import HistoryGallery from './components/HistoryGallery';
import PromptManager from './components/PromptManager';
import ServerImageSelector from './components/ServerImageSelector';
import CompareModal from './components/CompareModal';
// Import heic2any for HEIF conversion
import heic2any from 'heic2any';

const getHostname = () => window.location.hostname || 'localhost';
const DEFAULT_SERVER = `http://${getHostname()}:8188`;
// Using specific model name to prevent KeyError: 'weight' in Nunchaku node if fetch fails
const DEFAULT_MODEL = "svdq-fp4_r128-qwen-image-edit-2509-lightning-4steps-251115.safetensors";

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

const RESOLUTIONS = [
    { id: '720x1280', width: 720, height: 1280, label: '720x1280', icon: Smartphone },
    { id: '1080x1920', width: 1080, height: 1920, label: '1080x1920', icon: Smartphone },
    { id: '1080x2560', width: 1080, height: 2560, label: '1080x2560', icon: Smartphone }
];

// Helper to generate a random client ID
const generateClientId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
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
        theme: 'purple',
        customColor: '#ffffff',
        randomizeSeed: true
    };
  });

  const [clientId] = useState(generateClientId());
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Model
  const [availableModels, setAvailableModels] = useState<string[]>([DEFAULT_MODEL]);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);

  // Inputs
  const [prompt, setPrompt] = useState<string>("");
  const [seed, setSeed] = useState<number>(Math.floor(Math.random() * 1000000000000));
  const [selectedResolution, setSelectedResolution] = useState<string>(RESOLUTIONS[0].id);
  
  // Revised Images State
  const [images, setImages] = useState<(InputImage | null)[]>([null, null, null]);
  
  // Server Image Selection
  const [showServerSelector, setShowServerSelector] = useState<{show: boolean, index: number}>({ show: false, index: -1 });
  const [availableServerImages, setAvailableServerImages] = useState<string[]>([]);

  // LoRAs
  const [availableLoras, setAvailableLoras] = useState<string[]>([]);
  const [showLoraConfig, setShowLoraConfig] = useState(false);
  const [loras, setLoras] = useState<LoraSelection[]>([]); // Dynamic LoRA list

  // Execution
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [progress, setProgress] = useState(0); // 0-100
  const [lastGeneratedImage, setLastGeneratedImage] = useState<string | null>(null);
  const [lastGenerationDuration, setLastGenerationDuration] = useState<number>(0);
  const [resultRevealed, setResultRevealed] = useState(false); // For NSFW blur toggle
  const [showResultPreview, setShowResultPreview] = useState(false); // For full screen preview
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Refs
  const currentPromptIdRef = useRef<string | null>(null);
  const executingPromptRef = useRef<string>(""); 
  const executingSeedRef = useRef<number>(0); 
  const executingInputFilenameRef = useRef<string | undefined>(undefined); // Track input image for history comparison
  const startTimeRef = useRef<number>(0); 
  const wsRef = useRef<WebSocket | null>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const pendingSuccessIds = useRef<Set<string>>(new Set()); // Buffer for race-condition success messages

  // --- Effects ---

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
      if(connected) {
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
                
                if (msg.type === 'execution_start') {
                    if (msg.data.prompt_id === activePromptId) {
                        setStatus(GenerationStatus.EXECUTING);
                        setProgress(0);
                    }
                } else if (msg.type === 'executing') {
                     if (msg.data.node === null && msg.data.prompt_id === activePromptId) {
                     } else if (activePromptId) {
                         setProgress(prev => (prev < 90 ? prev + 5 : 90));
                     }
                } else if (msg.type === 'progress') {
                    if (msg.data.prompt_id === activePromptId) {
                        const { value, max } = msg.data;
                        setProgress(Math.round((value / max) * 100));
                    }
                } else if (msg.type === 'execution_success') {
                    // Buffer the success message in case prompt ID isn't set yet (race condition)
                    pendingSuccessIds.current.add(msg.data.prompt_id);
                    
                    if (msg.data.prompt_id === activePromptId) {
                        setProgress(100);
                        setStatus(GenerationStatus.FINISHED);
                        fetchGenerationResult(msg.data.prompt_id);
                    }
                } else if (msg.type === 'execution_error') {
                    if (msg.data.prompt_id === activePromptId) {
                        setStatus(GenerationStatus.ERROR);
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
      setSettings({...settings, darkMode: !settings.darkMode});
  }

  const handleFileSelect = async (index: number, file: File | null) => {
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
                // IMPORTANT: Do not return here. If client-side conversion fails, 
                // we warn the user but allow them to upload the original file.
                // ComfyUI might support it if they have the right libraries installed on the server.
                setErrorMsg(`HEIC preview conversion failed: ${e.message}. Attempting to use original file.`);
                // processedFile remains the original 'file'
            }
        }

        const newImages = [...images];
        newImages[index] = {
            type: 'file',
            file: processedFile,
            previewUrl: URL.createObjectURL(processedFile)
        };
        setImages(newImages);
    } else {
        const newImages = [...images];
        newImages[index] = null;
        setImages(newImages);
    }
  };

  const openServerSelector = async (index: number) => {
      // Refresh list before opening
      const serverImgs = await getServerInputImages(settings.serverAddress);
      setAvailableServerImages(serverImgs);
      setShowServerSelector({ show: true, index });
  };

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

  const handleUploadToServer = async (index: number) => {
      const img = images[index];
      if (!img || img.type !== 'file' || !img.file) return;

      setStatus(GenerationStatus.UPLOADING);
      try {
          // Use overwrite=false so if file exists, it might be renamed by Comfy, preserving history
          // Comfy returns the actual filename saved
          const filename = await uploadImage(img.file, settings.serverAddress, false);
          
          // Update the state to point to the server file
          const newImages = [...images];
          newImages[index] = {
              type: 'server',
              filename: filename,
              previewUrl: `${settings.serverAddress}/view?filename=${encodeURIComponent(filename)}&type=input`
          };
          setImages(newImages);

          // Refresh the available server images list so it's ready for other inputs
          const serverImgs = await getServerInputImages(settings.serverAddress);
          setAvailableServerImages(serverImgs);
          
          setStatus(GenerationStatus.IDLE);
      } catch (e) {
          console.error("Upload failed", e);
          setErrorMsg("Failed to upload image to server.");
          setStatus(GenerationStatus.IDLE);
      }
  };

  const handleClearImage = (index: number) => {
      const newImages = [...images];
      newImages[index] = null;
      setImages(newImages);
  };

  const randomizeSeed = () => setSeed(Math.floor(Math.random() * 1000000000000));

  const handleHistorySelect = async (item: HistoryItem) => {
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
          // When opening history, reload from server to see cross-device updates
          await loadHistory();
      }
      setShowHistory(!showHistory);
  };

  const handleUseResult = async () => {
    if (!lastGeneratedImage) return;
    try {
        const response = await fetch(lastGeneratedImage);
        if (!response.ok) throw new Error("File missing");
        const blob = await response.blob();
        const file = new File([blob], `generated_${Date.now()}.png`, { type: "image/png" });
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
      setErrorMsg("Generation stopped by user.");
  }

  const handleClearServerHistory = async () => {
      if(confirm("Are you sure you want to clear the shared history from the server? This will remove the history list for all devices.")) {
          try {
              await clearServerHistory(settings.serverAddress);
              setHistory([]);
              setShowHistory(false);
          } catch(e) {
              console.error(e);
              setErrorMsg("Failed to clear server history");
          }
      }
  }

  const handleClearSavedPrompts = async () => {
      if(confirm("Are you sure you want to clear ALL saved prompts from the server? This cannot be undone.")) {
          try {
              await clearSavedPrompts(settings.serverAddress);
              // We don't need to update UI state here as PromptManager reloads on open, 
              // but we could trigger a refresh if we wanted to be perfect.
              alert("All saved prompts have been cleared.");
          } catch(e) {
              console.error(e);
              setErrorMsg("Failed to clear saved prompts");
          }
      }
  }

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

  const handleRemoveLora = (id: string) => {
      setLoras(loras.filter(l => l.id !== id));
  };

  const handleUpdateLora = (id: string, updates: Partial<LoraSelection>) => {
      setLoras(loras.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  // Guard against outdated constants.ts file
  const validateWorkflow = (workflow: any) => {
      // Check key nodes for new workflow structure
      const requiredNodes = ["3", "8", "38", "39", "66", "79", "100", "102", "109", "110", "113", "114", "118", "129"];
      for (const id of requiredNodes) {
          if (!workflow[id]) return id;
      }
      return null;
  };

  const handleGenerate = async () => {
    // Dismiss keyboard on mobile
    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }

    if (!images[0]) {
        setErrorMsg("Please select at least the first image.");
        return;
    }
    if (!isConnected) {
        setErrorMsg("Not connected to ComfyUI server.");
        return;
    }

    // Safety check for stale workflow constants
    if (!BASE_WORKFLOW["129"]) {
        setErrorMsg("Configuration Error: constants.ts file is outdated (Missing Node 129). Please regenerate the project.");
        return;
    }

    // Auto Randomize Seed Logic
    let currentSeed = seed;
    if (settings.randomizeSeed) {
        currentSeed = Math.floor(Math.random() * 1000000000000);
        setSeed(currentSeed);
    }

    executingPromptRef.current = prompt;
    executingSeedRef.current = currentSeed; // Use the (potentially new) seed
    startTimeRef.current = Date.now();
    // Reset input tracking
    executingInputFilenameRef.current = undefined;

    setErrorMsg(null);
    setStatus(GenerationStatus.UPLOADING);
    setProgress(0);
    setLastGeneratedImage(null);
    setResultRevealed(false); 

    try {
        // 2. Process Images (Upload files, keep server filenames)
        const finalFilenames: (string | null)[] = [null, null, null];
        
        for (let i = 0; i < 3; i++) {
            const img = images[i];
            if (img) {
                if (img.type === 'file' && img.file) {
                    // For generation, we overwrite to ensure the file used matches the exact content
                    finalFilenames[i] = await uploadImage(img.file, settings.serverAddress, true);
                } else if (img.type === 'server' && img.filename) {
                    finalFilenames[i] = img.filename;
                }
            }
        }

        // Store the main input filename for history tracking
        if (finalFilenames[0]) {
            executingInputFilenameRef.current = finalFilenames[0];
        }

        // 3. Prepare Workflow
        setStatus(GenerationStatus.QUEUED);
        const workflow = JSON.parse(JSON.stringify(BASE_WORKFLOW)); 

        // Additional Runtime Validation
        const missingNode = validateWorkflow(workflow);
        if (missingNode) {
            throw new Error(`Invalid Workflow Configuration: Missing node ${missingNode}. constants.ts file may be corrupted.`);
        }

        workflow["3"].inputs.seed = currentSeed; // Apply correct seed
        workflow["113"].inputs.prompt = prompt; 
        workflow["110"].inputs.model_name = selectedModel;

        // Apply Resolution Settings
        const resConfig = RESOLUTIONS.find(r => r.id === selectedResolution) || RESOLUTIONS[0];
        workflow["118"].inputs.width = resConfig.width;
        workflow["118"].inputs.height = resConfig.height;
        
        // Adjust scale for input to match quality: Calculate target megapixels
        // (Width * Height) / 1,000,000 -> Round to 1 decimal
        const mpx = Math.round((resConfig.width * resConfig.height) / 100000) / 10; 
        workflow["100"].inputs.megapixels = Math.max(1, mpx);

        // Set Images
        if (finalFilenames[0]) {
            workflow["109"].inputs.image = finalFilenames[0];
        }

        const addImageChain = (imgIndex: number, filename: string) => {
             const loadId = (1000 + imgIndex).toString();
             // Clone LoadImage node
             workflow[loadId] = JSON.parse(JSON.stringify(workflow["109"]));
             workflow[loadId].inputs.image = filename;
             
             // Inject into prompts
             workflow["113"].inputs[`image${imgIndex}`] = [loadId, 0]; 
             workflow["114"].inputs[`image${imgIndex}`] = [loadId, 0];
        };

        // IMPORTANT: BYPASS SCALER NODE (Node 100) for MAIN image to match output resolution exactly
        workflow["113"].inputs.image1 = ["109", 0];
        workflow["114"].inputs.image1 = ["109", 0];

        if (finalFilenames[1]) {
            addImageChain(2, finalFilenames[1]!);
        }
        if (finalFilenames[2]) {
            addImageChain(3, finalFilenames[2]!);
        }

        // Configure LoRA Stack (Node 129)
        // NunchakuQwenImageLoraStack takes inputs: lora_count, lora_name_1...10, lora_strength_1...10
        const activeLoras = loras.filter(l => l.enabled);

        workflow["129"].inputs.lora_count = activeLoras.length;
        
        // Reset all slots to "None" first to be safe (though constant file has defaults)
        for(let i=1; i<=10; i++) {
             workflow["129"].inputs[`lora_name_${i}`] = "None";
             workflow["129"].inputs[`lora_strength_${i}`] = 1.0;
        }

        // Fill active slots
        activeLoras.forEach((lora, index) => {
            const slot = index + 1;
            // Ensure we don't overflow the node's capacity (max 10)
            if (slot <= 10) {
                workflow["129"].inputs[`lora_name_${slot}`] = lora.name;
                workflow["129"].inputs[`lora_strength_${slot}`] = lora.strength;
            }
        });

        // 4. Queue
        const promptId = await queuePrompt(workflow, settings.serverAddress, clientId);
        currentPromptIdRef.current = promptId;

        // Check if we ALREADY received the success message (race condition fix)
        if (pendingSuccessIds.current.has(promptId)) {
            console.log("Instant execution detected via buffer");
            setStatus(GenerationStatus.FINISHED);
            setProgress(100);
            fetchGenerationResult(promptId);
            pendingSuccessIds.current.delete(promptId);
            return;
        }

        // Check history immediately in case it was cached and finished instantly
        try {
            const historyData = await getHistory(promptId, settings.serverAddress);
            if (historyData && historyData[promptId]) {
                console.log("Instant execution detected via history query");
                setStatus(GenerationStatus.FINISHED);
                setProgress(100);
                fetchGenerationResult(promptId);
            }
        } catch (e) {
            // History not ready yet, this is normal for running jobs
        }
        
    } catch (err: any) {
        console.error(err);
        setStatus(GenerationStatus.ERROR);
        setErrorMsg(err.message || "Unknown error occurred");
    }
  };

  const fetchGenerationResult = async (promptId: string) => {
      if (status === GenerationStatus.FINISHED && lastGeneratedImage) return; // Prevent double fetch

      try {
          await new Promise(resolve => setTimeout(resolve, 300));
          const historyData = await getHistory(promptId, settings.serverAddress);
          const promptHistory = historyData[promptId];
          
          if (!promptHistory) throw new Error("History not found for prompt ID");

          const outputs = promptHistory.outputs;
          if (outputs && outputs["79"] && outputs["79"].images && outputs["79"].images.length > 0) {
              const imgInfo = outputs["79"].images[0]; // { filename, subfolder, type }
              
              // Construct URL instead of Blob for persistence
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
                  inputFilename: executingInputFilenameRef.current, // Persist the input used for this result
                  imageUrl: imageUrl, // Transient URL for current session display
                  prompt: executingPromptRef.current, 
                  seed: executingSeedRef.current, 
                  timestamp: Date.now(),
                  duration: duration
              };
              
              // Save to Server using Read-Modify-Write to avoid concurrency issues
              // 1. Load latest from server
              const currentServerHistory = await loadHistoryFromServer(settings.serverAddress);
              // 2. Append new item
              const updatedHistory = [newItem, ...currentServerHistory];
              // 3. Save back
              await saveHistoryToServer(updatedHistory, settings.serverAddress);
              
              // 4. Update local state
               // Reconstruct URLs for display
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

  return (
    <div className={`max-w-md mx-auto min-h-screen bg-gray-50 dark:bg-gray-950 relative shadow-2xl overflow-x-hidden ${lastGeneratedImage && !showResultPreview ? 'pb-96' : 'pb-24'} transition-colors duration-300`}>
      
      {/* Header */}
      <header className={`p-4 bg-white dark:bg-gray-900 flex justify-between items-center border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 transition-colors duration-300`}>
        <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-700 to-gray-900 dark:from-gray-100 dark:to-gray-400">
                QwenfyUI
            </h1>
            <Zap 
                size={18} 
                fill="currentColor"
                className={`transition-all duration-500 ${isConnected ? `text-${settings.theme}-500` : 'text-red-500'}`} 
                style={isConnected ? { filter: `drop-shadow(0 0 3px currentColor)` } : {}}
            />
        </div>
        <div className="flex gap-2">
            <button
                onClick={handleToggleThemeMode}
                className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400`}
                title={settings.darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
                {settings.darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
                onClick={handleToggleHistory}
                className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${showHistory ? `text-${settings.theme}-600 dark:text-${settings.theme}-400` : 'text-gray-600 dark:text-gray-400'}`}
            >
                <HistoryIcon size={20} />
            </button>
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
                        onChange={(e) => setSettings({...settings, serverAddress: e.target.value})}
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
                                onClick={() => setSettings({...settings, theme: color})}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${settings.theme === color ? 'ring-2 ring-gray-400 dark:ring-white scale-110' : 'opacity-60 hover:opacity-100'}`}
                                style={{ backgroundColor: COLOR_HEX[color] }}
                                title={color.charAt(0).toUpperCase() + color.slice(1)}
                            >
                                {settings.theme === color && <Check size={14} className="text-white drop-shadow-sm" />}
                            </button>
                        ))}
                        
                        {/* Custom Color Picker */}
                        <div className="relative w-8 h-8">
                            <button
                                onClick={() => {
                                    setSettings({...settings, theme: 'custom'});
                                    colorInputRef.current?.click();
                                }}
                                className={`w-full h-full rounded-full flex items-center justify-center transition-all overflow-hidden bg-gradient-to-br from-red-500 via-green-500 to-blue-500 ${settings.theme === 'custom' ? 'ring-2 ring-gray-400 dark:ring-white scale-110' : 'opacity-60 hover:opacity-100'}`}
                                title="Custom Color"
                            >
                                {settings.theme === 'custom' && <Check size={14} className="text-white drop-shadow-md" />}
                            </button>
                            <input 
                                ref={colorInputRef}
                                type="color" 
                                value={settings.customColor || '#ffffff'}
                                onChange={(e) => setSettings({...settings, theme: 'custom', customColor: e.target.value})}
                                className="sr-only" 
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-800">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">NSFW Blur</span>
                    <button 
                        onClick={() => setSettings({...settings, nsfwMode: !settings.nsfwMode})}
                        className={`w-12 h-6 rounded-full relative transition-colors ${settings.nsfwMode ? `bg-${settings.theme}-600` : 'bg-gray-300 dark:bg-gray-700'}`}
                    >
                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.nsfwMode ? 'translate-x-6' : ''}`} />
                    </button>
                </div>

                {/* Remote Input Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Remote Input</span>
                        <span className="text-[10px] text-gray-500">Allow selecting files from server folder</span>
                    </div>
                    <button 
                        onClick={() => setSettings({...settings, enableRemoteInput: !settings.enableRemoteInput})}
                        className={`w-12 h-6 rounded-full relative transition-colors ${settings.enableRemoteInput ? `bg-${settings.theme}-600` : 'bg-gray-300 dark:bg-gray-700'}`}
                    >
                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.enableRemoteInput ? 'translate-x-6' : ''}`} />
                    </button>
                </div>
                
                <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                    <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase">Server Data</h3>
                    <div className="flex flex-col gap-2">
                        <button 
                            onClick={handleClearServerHistory}
                            className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 py-2 rounded text-sm transition-colors border border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-800"
                        >
                            <Trash2 size={14} /> Clear Shared History
                        </button>
                         <button 
                            onClick={handleClearSavedPrompts}
                            className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-600 dark:text-orange-400 py-2 rounded text-sm transition-colors border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-800"
                        >
                            <FileType size={14} /> Clear Saved Prompts
                        </button>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2 text-center">This will remove data from the server for all devices.</p>
                </div>
            </div>
        </div>
      )}

      <main className="p-4 space-y-6">
        
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
                    onFileSelect={(f) => handleFileSelect(idx, f)}
                    onServerSelectRequest={() => openServerSelector(idx)}
                    onUpload={() => handleUploadToServer(idx)}
                    onClear={() => handleClearImage(idx)}
                    theme={settings.theme}
                    allowRemote={settings.enableRemoteInput}
                />
            ))}
        </div>

        {/* Prompt Input */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800 relative shadow-sm transition-colors duration-300">
             <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-gray-500">Positive Prompt</span>
                <PromptManager 
                    currentPrompt={prompt} 
                    serverAddress={settings.serverAddress} 
                    onLoadPrompt={setPrompt}
                    theme={settings.theme}
                />
             </div>
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your edit..."
                className={`w-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 rounded p-3 text-sm min-h-[100px] focus:ring-1 focus:ring-${settings.theme}-500 outline-none border border-gray-300 dark:border-gray-800 placeholder-gray-400 dark:placeholder-gray-600 resize-none transition-colors`}
            />
        </div>

        {/* LoRA & Seed Config (Collapsible) */}
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
                    
                    {/* Resolution Control */}
                    <div className="p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-colors">
                        <span className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Resolution</span>
                        <div className="flex gap-2">
                            {RESOLUTIONS.map(res => {
                                const Icon = res.icon;
                                return (
                                    <button
                                        key={res.id}
                                        onClick={() => setSelectedResolution(res.id)}
                                        className={`flex-1 py-2 px-1 flex items-center justify-center gap-1 text-[10px] sm:text-xs rounded-md border transition-all ${
                                            selectedResolution === res.id 
                                            ? `bg-${settings.theme}-100 dark:bg-${settings.theme}-900/30 border-${settings.theme}-500 text-${settings.theme}-700 dark:text-${settings.theme}-300 font-medium shadow-sm`
                                            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <Icon size={12} className="hidden sm:block" />
                                        {res.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Seed Control */}
                    <div className="p-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 transition-colors">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Seed</span>
                            <div className="flex gap-2">
                                 <button 
                                    onClick={() => setSettings({...settings, randomizeSeed: !settings.randomizeSeed})}
                                    className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                                        settings.randomizeSeed 
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

                    <div className="space-y-3">
                        {loras.map((lora, index) => (
                            <LoraControl 
                                key={lora.id}
                                label={`LoRA ${index + 1}`}
                                enabled={lora.enabled}
                                onToggle={() => handleUpdateLora(lora.id, { enabled: !lora.enabled })}
                                strength={lora.strength} 
                                onStrengthChange={(val) => handleUpdateLora(lora.id, { strength: val })}
                                availableLoras={availableLoras}
                                selectedLoraName={lora.name}
                                onLoraNameChange={(name) => handleUpdateLora(lora.id, { name })}
                                onDelete={() => handleRemoveLora(lora.id)}
                                theme={settings.theme}
                            />
                        ))}

                        <button 
                            onClick={handleAddLora}
                            disabled={loras.length >= 10}
                            className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-${settings.theme}-600 dark:hover:text-${settings.theme}-400 hover:border-${settings.theme}-500/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            <Plus size={18} /> Add LoRA
                        </button>
                    </div>
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

      {/* Result Preview Modal (Full Screen) */}
      {showResultPreview && lastGeneratedImage && (
          <CompareModal 
            resultImage={lastGeneratedImage}
            inputImage={images[0]?.previewUrl ? `${images[0].previewUrl}&t=${Date.now()}` : ''}
            onClose={() => setShowResultPreview(false)}
            onUseResult={handleUseResult}
            nsfwMode={settings.nsfwMode}
            theme={settings.theme}
          />
      )}

      {/* Bottom Bar: Generate Button & Status */}
      <div className="fixed bottom-0 w-full max-w-md bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 p-4 flex gap-3 items-center z-40 transition-colors duration-300">
        <button
            onClick={handleGenerate}
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
                        <span>Generate</span>
                    </>
                ) : (
                    <>
                        {status === GenerationStatus.UPLOADING && <span className="animate-pulse">Uploading...</span>}
                        {status === GenerationStatus.QUEUED && <span className="animate-pulse">Queued...</span>}
                        {status === GenerationStatus.EXECUTING && (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                <span>{progress}%</span>
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

       {/* Last Generated Result Card */}
       {lastGeneratedImage && !showResultPreview && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[90%] max-w-[380px] bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden animate-fade-in z-30 transition-colors duration-300">
            <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <span className={`text-xs font-medium text-${settings.theme}-600 dark:text-${settings.theme}-400 flex items-center gap-1`}>
                    <Check size={12} /> Generation Complete
                </span>
                <div className="flex gap-1">
                     <a 
                        href={lastGeneratedImage} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1" 
                        title="Open in New Tab"
                    >
                        <ExternalLink size={14} />
                    </a>
                     <button onClick={handleUseResult} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1" title="Use as Input">
                        <ArrowUpRight size={14} />
                    </button>
                    <button onClick={handleClearResult} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1" title="Close Preview">
                        <X size={14} />
                    </button>
                </div>
            </div>
            <div className="relative h-48 bg-gray-100 dark:bg-black/50 group cursor-pointer" onClick={handleResultClick}>
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
                <div className="absolute inset-0 flex items-center justify-center bg-white/30 dark:bg-black/0 group-hover:bg-white/40 dark:group-hover:bg-black/20 transition-colors">
                     <Maximize2 className="text-gray-900 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" size={24} />
                </div>
                
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

      {/* History Modal */}
      {showHistory && (
        <HistoryGallery 
            history={history} 
            onSelect={handleHistorySelect} 
            onClose={() => setShowHistory(false)}
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
            onClose={() => setShowServerSelector({show: false, index: -1})}
            theme={settings.theme}
          />
      )}

    </div>
  );
}
