

export interface ComfyInput {
  [key: string]: string | number | boolean | (string | number)[] | undefined;
}

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

export type ThemeColor = 'purple' | 'red' | 'yellow' | 'green' | 'cyan' | 'orange';

export interface AppSettings {
  serverAddress: string;
  nsfwMode: boolean;
  theme: ThemeColor;
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
}

export type ModelType = 'gguf' | 'diffusion';

export type ImageSourceType = 'file' | 'server';

export interface InputImage {
    type: ImageSourceType;
    file?: File;       // For local uploads
    filename?: string; // For server-side files
    previewUrl: string;
}