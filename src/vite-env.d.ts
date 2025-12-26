/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_COMFYUI_PATH: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
