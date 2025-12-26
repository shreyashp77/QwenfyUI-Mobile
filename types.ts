

export interface ComfyInput {
  [key: string]: string | number | boolean | (string | number)[] | undefined;
}

export type ViewMode = 'home' | 'edit' | 'generate' | 'video';


export interface ComfyNode {
  inputs: ComfyInput;
  class_type: string;
  _meta?: {
    title: string;
  };
}

export interface ComfyWorkflow {
  [nodeId: string]: ComfyNode;
}

export interface HistoryItem {
  id: string;
  // Persistence data
  filename: string;
  subfolder: string;
  imageType: string;

  // Tracking input for comparison
  inputFilename?: string; // The filename of the first input image

  // Display data (constructed at runtime)
  imageUrl: string;

  prompt: string;
  seed: number;
  timestamp: number;
  duration?: number;
}

export interface LoraConfig {
  enabled: boolean;
  strength: number;
}

export type ThemeColor =
  | 'purple' | 'red' | 'yellow' | 'green' | 'cyan' | 'orange'
  | 'blue' | 'pink' | 'indigo' | 'teal' | 'lime' | 'rose'
  | 'fuchsia' | 'sky' | 'emerald' | 'violet' | 'amber' | 'slate'
  | 'custom';

export interface AppSettings {
  serverAddress: string;
  nsfwMode: boolean;
  enableRemoteInput: boolean;
  darkMode: boolean;
  theme: ThemeColor;
  customColor?: string; // Hex code for custom theme
  randomizeSeed: boolean;
  enableComparison: boolean;
  enableFeedback: boolean;
  incognito: boolean;
  stripMetadata: boolean;
  comfyUIBasePath: string; // Path to ComfyUI installation (for video extension)
}

export enum GenerationStatus {
  IDLE = 'idle',
  UPLOADING = 'uploading',
  QUEUED = 'queued',
  EXECUTING = 'executing',
  FINISHED = 'finished',
  ERROR = 'error',
}

export interface SavedPrompt {
  id: string;
  name: string;
  text: string;
  timestamp: number;
  workflow?: string;
}

export type ModelType = 'gguf' | 'diffusion';

export type ImageSourceType = 'file' | 'server';

export interface InputImage {
  type: ImageSourceType;
  file?: File;       // For local uploads
  filename?: string; // For server-side files
  previewUrl: string;
  isTemporary?: boolean;
}

export interface LoraSelection {
  id: string;
  name: string;
  strength: number;
  enabled: boolean;
}
