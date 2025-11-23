
import React, { useState, useEffect, useRef } from 'react';
import { Settings, History as HistoryIcon, Zap, Loader2, Download, RefreshCw, AlertCircle, EyeOff, ExternalLink, Cpu, Clock, ArrowUpRight, X, Maximize2, Palette, ChevronDown, ChevronRight, SlidersHorizontal, Square, Trash2, FileType, Check } from 'lucide-react';
import { BASE_WORKFLOW } from './constants';
import { HistoryItem, GenerationStatus, AppSettings, ModelType, InputImage, ThemeColor } from './types';
import { uploadImage, queuePrompt, checkServerConnection, getAvailableModels, getAvailableDiffusionModels, getHistory, getAvailableLoras, getServerInputImages, interruptGeneration, loadHistoryFromServer, saveHistoryToServer, clearServerHistory, clearSavedPrompts } from './services/comfyService';
import LoraControl from './components/LoraControl';
import ImageInput from './components/ImageInput';
import HistoryGallery from './components/HistoryGallery';
import PromptManager from './components/PromptManager';
import ServerImageSelector from './components/ServerImageSelector';

const DEFAULT_SERVER = `http://${window.location.hostname}:8188`;
const DEFAULT_GGUF_MODEL = "placeholder_model_Q5_1.gguf";
const DEFAULT_DIFFUSION_MODEL = "placeholder_diffusion_fp8.safetensors";

const THEME_OPTIONS: ThemeColor[] = ['purple', 'red', 'yellow', 'green', 'cyan', 'orange'];

// Helper to generate a random client ID
const generateClientId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export default function App() {
  // --- State ---
  const [settings, setSettings] = useState<AppSettings>(() => {
    // Load settings from local storage to persist user preferences across refreshes
    const saved = localStorage.getItem('qwen_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
    return { 
        serverAddress: DEFAULT_SERVER,
        nsfwMode: false,
        theme: 'purple'
    };
  });

  const [clientId] = useState(generateClientId());
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Model
  const [modelType, setModelType] = useState<ModelType>('gguf');
  const [availableGgufModels, setAvailableGgufModels] = useState<string[]>([DEFAULT_GGUF_MODEL]);
  const [availableDiffusionModels, setAvailableDiffusionModels] = useState<string[]>([DEFAULT_DIFFUSION_MODEL]);
  
  const [selectedGgufModel, setSelectedGgufModel] = useState<string>(DEFAULT_GGUF_MODEL);
  const [selectedDiffusionModel, setSelectedDiffusionModel] = useState<string>(DEFAULT_DIFFUSION_MODEL);

  // Inputs
  const [prompt, setPrompt] = useState<string>("");
  const [seed, setSeed] = useState<number>(Math.floor(Math.random() * 1000000000000));
  
  // Revised Images State
  const [images, setImages] = useState<(InputImage | null)[]>([null, null, null]);
  
  // Server Image Selection
  const [showServerSelector, setShowServerSelector] = useState<{show: boolean, index: number}>({ show: false, index: -1 });
  const [availableServerImages, setAvailableServerImages] = useState<string[]>([]);

  // LoRAs
  const [availableLoras, setAvailableLoras] = useState<string[]>([]);
  const [showLoraConfig, setShowLoraConfig] = useState(false);
  
  const [lora2Enabled, setLora2Enabled] = useState(false);
  const [lora2Name, setLora2Name] = useState("placeholder_detail_lora.safetensors");
  const [lora2Strength, setLora2Strength] = useState(0.6);
  
  const [lora3Enabled, setLora3Enabled] = useState(false);
  const [lora3Name, setLora3Name] = useState("placeholder_style_lora.safetensors");
  const [lora3Strength, setLora3Strength] = useState(1.0);

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
  const startTimeRef = useRef<number>(0); 
  const wsRef = useRef<WebSocket | null>(null);

  // --- Effects ---

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

  const fetchModels = async () => {
      // Fetch GGUF Models
      const ggufModels = await getAvailableModels(settings.serverAddress);
      if (ggufModels && ggufModels.length > 0) {
          setAvailableGgufModels(ggufModels);
          setSelectedGgufModel(prev => {
              if (ggufModels.includes(prev)) return prev;
              if (ggufModels.includes(DEFAULT_GGUF_MODEL)) return DEFAULT_GGUF_MODEL;
              return ggufModels[0];
          });
      }

      // Fetch Diffusion Models
      const diffusionModels = await getAvailableDiffusionModels(settings.serverAddress);
      if (diffusionModels && diffusionModels.length > 0) {
          setAvailableDiffusionModels(diffusionModels);
          setSelectedDiffusionModel(prev => {
            if (diffusionModels.includes(prev)) return prev;
            if (diffusionModels.includes(DEFAULT_DIFFUSION_MODEL)) return DEFAULT_DIFFUSION_MODEL;
            return diffusionModels[0];
          });
      }

      // Fetch LoRAs
      const loras = await getAvailableLoras(settings.serverAddress);
      if (loras && loras.length > 0) {
          setAvailableLoras(loras);
          const updateLoraName = (currentName: string) => {
             if (loras.includes(currentName)) return currentName;
             return loras[0];
          };
          setLora2Name(prev => updateLoraName(prev));
          setLora3Name(prev => updateLoraName(prev));
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

  const handleFileSelect = (index: number, file: File | null) => {
    const newImages = [...images];
    if (file) {
        newImages[index] = {
            type: 'file',
            file: file,
            previewUrl: URL.createObjectURL(file)
        };
    } else {
        newImages[index] = null;
    }
    setImages(newImages);
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

    executingPromptRef.current = prompt;
    executingSeedRef.current = seed;
    startTimeRef.current = Date.now();

    setErrorMsg(null);
    setStatus(GenerationStatus.UPLOADING);
    setProgress(0);
    setLastGeneratedImage(null);
    setResultRevealed(false); 

    try {
        // 1. Process Images (Upload files, keep server filenames)
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

        // 2. Prepare Workflow
        setStatus(GenerationStatus.QUEUED);
        const workflow = JSON.parse(JSON.stringify(BASE_WORKFLOW)); 

        workflow["3"].inputs.seed = seed;
        workflow["111"].inputs.prompt = prompt;

        // Model Selection
        let modelSourceNodeId: string;
        if (modelType === 'gguf') {
            workflow["389"].inputs.unet_name = selectedGgufModel;
            modelSourceNodeId = "389";
            delete workflow["37"]; 
        } else {
            workflow["37"].inputs.unet_name = selectedDiffusionModel;
            modelSourceNodeId = "37";
            delete workflow["389"];
        }

        // Set Images
        if (finalFilenames[0]) {
            workflow["78"].inputs.image = finalFilenames[0];
        }

        const addImageChain = (imgIndex: number, filename: string, targetNodeId: string) => {
             const loadId = (1000 + imgIndex).toString();
             const scaleId = (2000 + imgIndex).toString();
             workflow[loadId] = JSON.parse(JSON.stringify(workflow["78"]));
             workflow[loadId].inputs.image = filename;
             workflow[scaleId] = JSON.parse(JSON.stringify(workflow["93"]));
             workflow[scaleId].inputs.image = [loadId, 0];
             workflow[targetNodeId].inputs[`image${imgIndex}`] = [scaleId, 0];
        };

        if (finalFilenames[1]) {
            addImageChain(2, finalFilenames[1]!, "111");
        }
        if (finalFilenames[2]) {
            addImageChain(3, finalFilenames[2]!, "111");
        }

        // LoRAs
        let lastNodeId = modelSourceNodeId; 
        workflow["89"].inputs.model = [lastNodeId, 0];
        lastNodeId = "89";

        if (lora2Enabled) {
            workflow["390"].inputs.lora_name = lora2Name;
            workflow["390"].inputs.strength_model = lora2Strength;
            workflow["390"].inputs.model = [lastNodeId, 0];
            lastNodeId = "390";
        } else {
            delete workflow["390"];
        }

        if (lora3Enabled) {
            workflow["391"].inputs.lora_name = lora3Name;
            workflow["391"].inputs.strength_model = lora3Strength;
            workflow["391"].inputs.model = [lastNodeId, 0]; 
            lastNodeId = "391";
        } else {
            delete workflow["391"];
        }

        workflow["66"].inputs.model = [lastNodeId, 0];

        // 3. Queue
        const promptId = await queuePrompt(workflow, settings.serverAddress, clientId);
        currentPromptIdRef.current = promptId;
        
    } catch (err: any) {
        console.error(err);
        setStatus(GenerationStatus.ERROR);
        setErrorMsg(err.message || "Unknown error occurred");
    }
  };

  const fetchGenerationResult = async (promptId: string) => {
      try {
          await new Promise(resolve => setTimeout(resolve, 300));
          const historyData = await getHistory(promptId, settings.serverAddress);
          const promptHistory = historyData[promptId];
          
          if (!promptHistory) throw new Error("History not found for prompt ID");

          const outputs = promptHistory.outputs;
          if (outputs && outputs["60"] && outputs["60"].images && outputs["60"].images.length > 0) {
              const imgInfo = outputs["60"].images[0]; // { filename, subfolder, type }
              
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
    <div className={`max-w-md mx-auto min-h-screen bg-gray-950 relative shadow-2xl overflow-x-hidden ${lastGeneratedImage && !showResultPreview ? 'pb-96' : 'pb-24'}`}>
      
      {/* Header */}
      <header className={`p-4 bg-gray-900 flex justify-between items-center border-b border-gray-800 sticky top-0 z-40`}>
        <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400">
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
                onClick={handleToggleHistory}
                className={`p-2 rounded-full hover:bg-gray-800 transition-colors ${showHistory ? `text-${settings.theme}-400` : 'text-gray-400'}`}
            >
                <HistoryIcon size={20} />
            </button>
            <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-full hover:bg-gray-800 transition-colors ${showSettings ? `text-${settings.theme}-400` : 'text-gray-400'}`}
            >
                <Settings size={20} />
            </button>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="bg-gray-900 border-b border-gray-800 p-4 animate-fade-in absolute w-full z-30 shadow-2xl">
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">ComfyUI Server Address</label>
                    <input 
                        type="text" 
                        value={settings.serverAddress}
                        onChange={(e) => setSettings({...settings, serverAddress: e.target.value})}
                        className={`w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-gray-200 focus:border-${settings.theme}-500 outline-none transition-colors`}
                    />
                </div>
                
                {/* Theme Selector */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">Interface Color</label>
                    <div className="flex gap-2 flex-wrap">
                        {THEME_OPTIONS.map(color => (
                            <button
                                key={color}
                                onClick={() => setSettings({...settings, theme: color})}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${settings.theme === color ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'}`}
                                style={{ backgroundColor: color === 'purple' ? '#a855f7' : color === 'red' ? '#ef4444' : color === 'yellow' ? '#eab308' : color === 'green' ? '#22c55e' : color === 'cyan' ? '#06b6d4' : '#f97316' }}
                            >
                                {settings.theme === color && <Check size={14} className="text-black/60" />}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                    <span className="text-sm font-medium text-gray-300">NSFW Blur</span>
                    <button 
                        onClick={() => setSettings({...settings, nsfwMode: !settings.nsfwMode})}
                        className={`w-12 h-6 rounded-full relative transition-colors ${settings.nsfwMode ? `bg-${settings.theme}-600` : 'bg-gray-700'}`}
                    >
                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.nsfwMode ? 'translate-x-6' : ''}`} />
                    </button>
                </div>
                
                <div className="pt-2 border-t border-gray-800">
                    <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase">Server Data</h3>
                    <div className="flex flex-col gap-2">
                        <button 
                            onClick={handleClearServerHistory}
                            className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-red-900/30 text-red-400 hover:text-red-300 py-2 rounded text-sm transition-colors border border-gray-700 hover:border-red-800"
                        >
                            <Trash2 size={14} /> Clear Shared History
                        </button>
                         <button 
                            onClick={handleClearSavedPrompts}
                            className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-orange-900/30 text-orange-400 hover:text-orange-300 py-2 rounded text-sm transition-colors border border-gray-700 hover:border-orange-800"
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
        <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800">
            <div className="flex gap-2 mb-2">
                <button 
                    onClick={() => setModelType('gguf')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${modelType === 'gguf' ? `bg-${settings.theme}-600 text-white` : 'bg-gray-800 text-gray-400'}`}
                >
                    GGUF (Fast)
                </button>
                <button 
                    onClick={() => setModelType('diffusion')}
                    className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${modelType === 'diffusion' ? `bg-${settings.theme}-600 text-white` : 'bg-gray-800 text-gray-400'}`}
                >
                    Diffusion (Quality)
                </button>
            </div>
            
            <div className="relative">
                <Cpu size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <select 
                    value={modelType === 'gguf' ? selectedGgufModel : selectedDiffusionModel}
                    onChange={(e) => modelType === 'gguf' ? setSelectedGgufModel(e.target.value) : setSelectedDiffusionModel(e.target.value)}
                    className={`w-full bg-gray-800 border border-gray-700 rounded text-xs text-gray-200 py-2 pl-8 pr-8 appearance-none focus:border-${settings.theme}-500 outline-none`}
                >
                    {(modelType === 'gguf' ? availableGgufModels : availableDiffusionModels).map(m => (
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
                />
            ))}
        </div>

        {/* Prompt Input */}
        <div className="bg-gray-900 rounded-lg p-3 border border-gray-800 relative">
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
                className={`w-full bg-gray-950 text-gray-100 rounded p-3 text-sm min-h-[100px] focus:ring-1 focus:ring-${settings.theme}-500 outline-none border border-gray-800 placeholder-gray-600 resize-none`}
            />
        </div>

        {/* LoRA & Seed Config (Collapsible) */}
        <div className="border border-gray-800 rounded-lg bg-gray-900/50 overflow-hidden">
            <button 
                onClick={() => setShowLoraConfig(!showLoraConfig)}
                className="w-full flex items-center justify-between p-3 bg-gray-900 hover:bg-gray-800 transition-colors"
            >
                <div className="flex items-center gap-2 text-gray-300">
                    <SlidersHorizontal size={16} />
                    <span className="text-sm font-medium">Advanced Configuration</span>
                </div>
                {showLoraConfig ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronRight size={16} className="text-gray-500" />}
            </button>

            {showLoraConfig && (
                <div className="p-4 space-y-4 animate-fade-in border-t border-gray-800">
                    {/* Seed Control */}
                    <div className="p-4 rounded-lg border border-gray-700 bg-gray-800">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-300">Seed</span>
                            <button onClick={randomizeSeed} className={`text-${settings.theme}-400 hover:text-${settings.theme}-300`}>
                                <RefreshCw size={16} />
                            </button>
                        </div>
                        <input
                            type="number"
                            value={seed}
                            onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                            className={`w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-center font-mono focus:border-${settings.theme}-500 outline-none`}
                        />
                    </div>

                    <div className="space-y-3">
                        <LoraControl 
                            label="Detail LoRA" 
                            enabled={lora2Enabled}
                            onToggle={() => setLora2Enabled(!lora2Enabled)}
                            strength={lora2Strength} 
                            onStrengthChange={setLora2Strength}
                            availableLoras={availableLoras}
                            selectedLoraName={lora2Name}
                            onLoraNameChange={setLora2Name}
                            theme={settings.theme}
                        />

                        <LoraControl 
                            label="Style LoRA" 
                            enabled={lora3Enabled}
                            onToggle={() => setLora3Enabled(!lora3Enabled)}
                            strength={lora3Strength} 
                            onStrengthChange={setLora3Strength}
                            availableLoras={availableLoras}
                            selectedLoraName={lora3Name}
                            onLoraNameChange={setLora3Name}
                            theme={settings.theme}
                        />
                    </div>
                </div>
            )}
        </div>

        {/* Error Message */}
        {errorMsg && (
            <div className="bg-red-900/20 border border-red-900/50 text-red-200 p-3 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{errorMsg}</span>
            </div>
        )}

      </main>

      {/* Result Preview Modal (Full Screen) */}
      {showResultPreview && lastGeneratedImage && (
          <div className="fixed inset-0 z-50 bg-black flex items-center justify-center animate-fade-in">
                <button 
                    onClick={() => setShowResultPreview(false)} 
                    className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full z-50 transition-colors"
                >
                    <X size={32} />
                </button>
                <div className="relative w-full h-full p-4 flex items-center justify-center">
                    <img 
                        src={lastGeneratedImage} 
                        alt="Result Full Screen" 
                        className={`max-w-full max-h-[90vh] object-contain animate-zoom-in ${settings.nsfwMode && !resultRevealed ? 'blur-2xl' : ''}`}
                        onClick={(e) => {
                             if(settings.nsfwMode) {
                                 e.stopPropagation();
                                 setResultRevealed(!resultRevealed);
                             }
                        }}
                    />
                    
                     {settings.nsfwMode && !resultRevealed && (
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
                            handleUseResult();
                        }}
                        className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-${settings.theme}-600/90 hover:bg-${settings.theme}-500 text-white px-6 py-3 rounded-full font-semibold shadow-lg backdrop-blur-sm transition-all transform hover:scale-105`}
                    >
                        Use as Input <ArrowUpRight size={18}/>
                    </button>
                </div>
          </div>
      )}

      {/* Bottom Bar: Generate Button & Status */}
      <div className="fixed bottom-0 w-full max-w-md bg-gray-900/80 backdrop-blur-lg border-t border-gray-800 p-4 flex gap-3 items-center z-40">
        <button
            onClick={handleGenerate}
            disabled={status !== GenerationStatus.IDLE && status !== GenerationStatus.FINISHED && status !== GenerationStatus.ERROR}
            className={`flex-1 relative h-12 rounded-xl font-bold text-white shadow-lg overflow-hidden transition-all
                ${(status === GenerationStatus.IDLE || status === GenerationStatus.FINISHED || status === GenerationStatus.ERROR) 
                    ? `bg-${settings.theme}-600 hover:bg-${settings.theme}-500 hover:scale-[1.02] active:scale-[0.98]` 
                    : 'bg-gray-800 cursor-not-allowed'}`}
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
                className="h-12 w-12 flex items-center justify-center bg-red-900/50 hover:bg-red-900 text-red-200 rounded-xl border border-red-800 transition-colors"
                title="Stop Generation"
             >
                 <Square size={20} fill="currentColor" />
             </button>
        )}
      </div>

       {/* Last Generated Result Card */}
       {lastGeneratedImage && !showResultPreview && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[90%] max-w-[380px] bg-gray-800 rounded-xl border border-gray-700 shadow-2xl overflow-hidden animate-fade-in z-30">
            <div className="flex justify-between items-center p-2 bg-gray-900/50 border-b border-gray-700">
                <span className={`text-xs font-medium text-${settings.theme}-400 flex items-center gap-1`}>
                    <Check size={12} /> Generation Complete
                </span>
                <div className="flex gap-1">
                     <a 
                        href={lastGeneratedImage} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-white p-1" 
                        title="Open in New Tab"
                    >
                        <ExternalLink size={14} />
                    </a>
                     <button onClick={handleUseResult} className="text-gray-400 hover:text-white p-1" title="Use as Input">
                        <ArrowUpRight size={14} />
                    </button>
                    <button onClick={handleClearResult} className="text-gray-400 hover:text-white p-1" title="Close Preview">
                        <X size={14} />
                    </button>
                </div>
            </div>
            <div className="relative h-48 bg-black/50 group cursor-pointer" onClick={handleResultClick}>
                <img 
                    src={lastGeneratedImage} 
                    className={`w-full h-full object-contain ${settings.nsfwMode && !resultRevealed ? 'blur-md' : ''}`} 
                    alt="Result" 
                />
                 {settings.nsfwMode && !resultRevealed && (
                    <div className="absolute inset-0 flex items-center justify-center">
                         <EyeOff className="text-white opacity-80" size={24} />
                    </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                     <Maximize2 className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" size={24} />
                </div>
                
                 {/* Duration Badge */}
                 {lastGenerationDuration > 0 && (
                     <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
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
