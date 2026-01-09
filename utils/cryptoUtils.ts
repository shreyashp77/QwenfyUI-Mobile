
const ALGORITHM = 'AES-GCM';
const KEY_STORAGE_NAME = 'incognito_device_key';

export class DeviceEncryption {
    private static key: CryptoKey | null = null;
    private static initializationPromise: Promise<void> | null = null;

    static async init() {
        if (this.initializationPromise) return this.initializationPromise;

        this.initializationPromise = (async () => {
            if (!window.crypto || !window.crypto.subtle) {
                throw new Error("Incognito encryption requires a secure context (HTTPS or localhost). Client-side encryption is unavailable.");
            }
            const storedKey = localStorage.getItem(KEY_STORAGE_NAME);
            if (storedKey) {
                try {
                    const jwk = JSON.parse(storedKey);
                    this.key = await window.crypto.subtle.importKey(
                        "jwk",
                        jwk,
                        ALGORITHM,
                        true,
                        ["encrypt", "decrypt"]
                    );
                    console.log("Encryption key loaded from local storage.");
                } catch (e) {
                    console.error("Failed to load encryption key, generating new one:", e);
                    await this.generateAndStoreKey();
                }
            } else {
                console.log("No encryption key found, generating new one.");
                await this.generateAndStoreKey();
            }
        })();

        return this.initializationPromise;
    }

    private static async generateAndStoreKey() {
        this.key = await window.crypto.subtle.generateKey(
            {
                name: ALGORITHM,
                length: 256
            },
            true,
            ["encrypt", "decrypt"]
        );

        const jwk = await window.crypto.subtle.exportKey("jwk", this.key);
        localStorage.setItem(KEY_STORAGE_NAME, JSON.stringify(jwk));
    }

    static async encryptFile(file: File | Blob): Promise<File> {
        await this.init();
        if (!this.key) throw new Error("Encryption key not initialized");

        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const arrayBuffer = await file.arrayBuffer();

        const encryptedContent = await window.crypto.subtle.encrypt(
            {
                name: ALGORITHM,
                iv: iv
            },
            this.key,
            arrayBuffer
        );

        // Combine IV and Encrypted Data
        const finalBuffer = new Uint8Array(iv.length + encryptedContent.byteLength);
        finalBuffer.set(iv);
        finalBuffer.set(new Uint8Array(encryptedContent), iv.length);

        // Create new File with .enc extension
        const originalName = (file as File).name || 'encrypted_content';
        const newName = originalName.endsWith('.enc') ? originalName : `${originalName}.enc`;

        return new File([finalBuffer], newName, { type: 'application/octet-stream' });
    }

    static async decryptFile(blob: Blob, mimeType: string = 'image/png'): Promise<Blob> {
        await this.init();
        if (!this.key) throw new Error("Encryption key not initialized");

        const arrayBuffer = await blob.arrayBuffer();
        const fullData = new Uint8Array(arrayBuffer);

        // Extract IV (first 12 bytes)
        const iv = fullData.slice(0, 12);
        const data = fullData.slice(12);

        try {
            const decryptedContent = await window.crypto.subtle.decrypt(
                {
                    name: ALGORITHM,
                    iv: iv
                },
                this.key,
                data
            );

            return new Blob([decryptedContent], { type: mimeType });
        } catch (e) {
            console.error("Decryption failed:", e);
            throw new Error("Failed to decrypt file. It may be corrupted or from another device.");
        }
    }
}

export const hashPin = async (pin: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};
