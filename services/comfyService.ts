
import { ComfyWorkflow, SavedPrompt, HistoryItem } from "../types";

export const uploadImage = async (file: File, serverAddress: string, overwrite: boolean = true): Promise<string> => {
    const formData = new FormData();
    formData.append("image", file);
    if (overwrite) {
        formData.append("overwrite", "true");
    }

    const response = await fetch(`${serverAddress}/upload/image`, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        throw new Error("Failed to upload image");
    }

    const data = await response.json();
    // ComfyUI returns { name: "filename.png", subfolder: "", type: "input" }
    return data.name;
};

export const queuePrompt = async (workflow: ComfyWorkflow, serverAddress: string, clientId: string): Promise<string> => {
    const response = await fetch(`${serverAddress}/prompt`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            prompt: workflow,
            client_id: clientId
        }),
    });

    if (!response.ok) {
        throw new Error("Failed to queue prompt");
    }

    const data = await response.json();
    return data.prompt_id;
};

export const interruptGeneration = async (serverAddress: string): Promise<void> => {
    try {
        await fetch(`${serverAddress}/interrupt`, {
            method: "POST",
        });
    } catch (e) {
        console.error("Failed to interrupt generation", e);
    }
};

export const freeMemory = async (serverAddress: string): Promise<void> => {
    try {
        await fetch(`${serverAddress}/free`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ unload_models: true, free_memory: true })
        });
    } catch (e) {
        console.error("Failed to free memory", e);
        // Don't throw, as this is an optimization step
    }
};

export const getImageData = async (filename: string, serverAddress: string): Promise<Blob> => {
    // We assume subfolder is default (empty) and type is output
    // Append a timestamp to bust browser cache
    const response = await fetch(`${serverAddress}/view?filename=${filename}&type=output&t=${Date.now()}`);
    if (!response.ok) throw new Error("Failed to fetch image");
    return await response.blob();
}

export const getHistory = async (promptId: string, serverAddress: string): Promise<any> => {
    const response = await fetch(`${serverAddress}/history/${promptId}`);
    if (!response.ok) {
        throw new Error("Failed to fetch history");
    }
    return await response.json();
};

export const checkServerConnection = async (serverAddress: string): Promise<boolean> => {
    try {
        const res = await fetch(`${serverAddress}/system_stats`);
        return res.ok;
    } catch (e) {
        return false;
    }
}

export const getAvailableNunchakuModels = async (serverAddress: string): Promise<string[]> => {
    try {
        const response = await fetch(`${serverAddress}/object_info/NunchakuQwenImageDiTLoader`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.NunchakuQwenImageDiTLoader?.input?.required?.model_name?.[0] || [];
    } catch (e) {
        console.error("Failed to fetch Nunchaku models", e);
        return [];
    }
}

export const getAvailableLoras = async (serverAddress: string): Promise<string[]> => {
    try {
        const response = await fetch(`${serverAddress}/object_info/LoraLoaderModelOnly`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.LoraLoaderModelOnly?.input?.required?.lora_name?.[0] || [];
    } catch (e) {
        console.error("Failed to fetch LoRAs", e);
        return [];
    }
}

export const getServerInputImages = async (serverAddress: string): Promise<string[]> => {
    try {
        // LoadImage node info contains the list of files in the input directory
        const response = await fetch(`${serverAddress}/object_info/LoadImage`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.LoadImage?.input?.required?.image?.[0] || [];
    } catch (e) {
        console.error("Failed to fetch server input images", e);
        return [];
    }
}

// User Data / Prompts Persistence
const PROMPTS_FILE = "qwen_edit_prompts.json";
const HISTORY_FILE = "qwen_edit_history.json";

export const savePromptsToServer = async (prompts: SavedPrompt[], serverAddress: string): Promise<void> => {
    try {
        await fetch(`${serverAddress}/userdata/${PROMPTS_FILE}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(prompts)
        });
    } catch (e) {
        console.error("Error saving prompts to server", e);
        throw e;
    }
};

export const loadPromptsFromServer = async (serverAddress: string): Promise<SavedPrompt[]> => {
    try {
        const response = await fetch(`${serverAddress}/userdata/${PROMPTS_FILE}`);
        if (response.status === 404) return [];
        if (!response.ok) throw new Error(`Failed to load prompts: ${response.statusText}`);
        return await response.json();
    } catch (e) {
        console.error("Error loading prompts from server", e);
        return [];
    }
};

export const clearSavedPrompts = async (serverAddress: string): Promise<void> => {
    await savePromptsToServer([], serverAddress);
};

export const saveHistoryToServer = async (history: HistoryItem[], serverAddress: string): Promise<void> => {
    try {
        // We strip the transient imageUrl to save space and avoid stale dynamic URLs
        const persistableHistory = history.map(({ imageUrl, ...rest }) => rest);

        await fetch(`${serverAddress}/userdata/${HISTORY_FILE}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(persistableHistory)
        });
    } catch (e) {
        console.error("Error saving history to server", e);
    }
};

export const loadHistoryFromServer = async (serverAddress: string): Promise<HistoryItem[]> => {
    try {
        const response = await fetch(`${serverAddress}/userdata/${HISTORY_FILE}`);
        if (response.status === 404) return [];
        if (!response.ok) throw new Error(`Failed to load history: ${response.statusText}`);
        return await response.json();
    } catch (e) {
        console.error("Error loading history from server", e);
        return [];
    }
};

export const clearServerHistory = async (serverAddress: string): Promise<void> => {
    // Simply clear the JSON history file
    await saveHistoryToServer([], serverAddress);
};

// Favourites Persistence
const FAVOURITES_FILE = "qwen_edit_favourites.json";

export const saveFavouritesToServer = async (favourites: string[], serverAddress: string): Promise<void> => {
    try {
        await fetch(`${serverAddress}/userdata/${FAVOURITES_FILE}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(favourites)
        });
    } catch (e) {
        console.error("Error saving favourites to server", e);
    }
};

export const loadFavouritesFromServer = async (serverAddress: string): Promise<string[]> => {
    try {
        const response = await fetch(`${serverAddress}/userdata/${FAVOURITES_FILE}`);
        if (response.status === 404) return [];
        if (!response.ok) throw new Error(`Failed to load favourites: ${response.statusText}`);
        return await response.json();
    } catch (e) {
        console.error("Error loading favourites from server", e);
        return [];
    }
};
