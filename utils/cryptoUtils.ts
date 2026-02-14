
const ALGORITHM = 'AES-GCM';

// IndexedDB constants for secure key storage
const DB_NAME = 'incognito_keys_db';
const DB_VERSION = 1;
const STORE_NAME = 'keys';
const KEY_ID = 'device_key';

// Legacy localStorage key name (for migration only)
const LEGACY_KEY_STORAGE = 'incognito_device_key';

export class DeviceEncryption {
    private static key: CryptoKey | null = null;
    private static initializationPromise: Promise<void> | null = null;

    // --- IndexedDB Helpers ---

    private static openDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    private static async loadKeyFromDB(): Promise<CryptoKey | null> {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(KEY_ID);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
            tx.oncomplete = () => db.close();
        });
    }

    private static async saveKeyToDB(key: CryptoKey): Promise<void> {
        const db = await this.openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(key, KEY_ID);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
            tx.oncomplete = () => db.close();
        });
    }

    // --- Init ---

    static async init() {
        if (this.initializationPromise) return this.initializationPromise;

        this.initializationPromise = (async () => {
            if (!window.crypto || !window.crypto.subtle) {
                throw new Error("Incognito encryption requires a secure context (HTTPS or localhost). Client-side encryption is unavailable.");
            }

            // 1. Try loading from IndexedDB (secure storage)
            try {
                const dbKey = await this.loadKeyFromDB();
                if (dbKey) {
                    this.key = dbKey;
                    console.log("Encryption key loaded from IndexedDB.");
                    return;
                }
            } catch (e) {
                console.warn("Failed to load key from IndexedDB:", e);
            }

            // 2. Migration: check for legacy localStorage key
            const legacyJwk = localStorage.getItem(LEGACY_KEY_STORAGE);
            if (legacyJwk) {
                try {
                    const jwk = JSON.parse(legacyJwk);
                    // Re-import with extractable: false so the key material becomes opaque
                    this.key = await window.crypto.subtle.importKey(
                        "jwk",
                        jwk,
                        ALGORITHM,
                        false, // non-extractable
                        ["encrypt", "decrypt"]
                    );
                    // Persist to IndexedDB
                    await this.saveKeyToDB(this.key);
                    // Remove the insecure localStorage copy
                    localStorage.removeItem(LEGACY_KEY_STORAGE);
                    console.log("Encryption key migrated from localStorage to IndexedDB (non-extractable).");
                    return;
                } catch (e) {
                    console.error("Failed to migrate legacy encryption key, generating new one:", e);
                    // Remove broken legacy key
                    localStorage.removeItem(LEGACY_KEY_STORAGE);
                }
            }

            // 3. No key found anywhere — generate a new one
            console.log("No encryption key found, generating new one.");
            await this.generateAndStoreKey();
        })();

        return this.initializationPromise;
    }

    private static async generateAndStoreKey() {
        this.key = await window.crypto.subtle.generateKey(
            {
                name: ALGORITHM,
                length: 256
            },
            false, // non-extractable — key material cannot be read by JavaScript
            ["encrypt", "decrypt"]
        );

        await this.saveKeyToDB(this.key);
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

        // Create new File with .enc extension and timestamp for uniqueness
        // e.g., "wan22_00001.mp4" -> "wan22_00001_1736451234567.mp4.enc"
        const originalName = (file as File).name || 'encrypted_content';
        const timestamp = Date.now();

        let newName: string;
        if (originalName.endsWith('.enc')) {
            newName = originalName;
        } else {
            const lastDotIndex = originalName.lastIndexOf('.');
            if (lastDotIndex > 0) {
                const baseName = originalName.substring(0, lastDotIndex);
                const extension = originalName.substring(lastDotIndex);
                newName = `${baseName}_${timestamp}${extension}.enc`;
            } else {
                newName = `${originalName}_${timestamp}.enc`;
            }
        }

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
    // DEPRECATED: Legacy unsalted SHA-256 hash. Kept only for migration checks.
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};

// --- Secure PIN Hashing (PBKDF2) ---

const PIN_PBKDF2_ITERATIONS = 100000;
const PIN_SALT_LENGTH = 16;

/**
 * Hash a PIN with PBKDF2 and a random salt.
 * Returns both the hex hash and base64-encoded salt for storage.
 */
export const hashPinWithSalt = async (pin: string, existingSalt?: string): Promise<{ hash: string; salt: string }> => {
    const encoder = new TextEncoder();

    // Use existing salt or generate a new random one
    let salt: Uint8Array;
    if (existingSalt) {
        salt = Uint8Array.from(atob(existingSalt), c => c.charCodeAt(0));
    } else {
        salt = crypto.getRandomValues(new Uint8Array(PIN_SALT_LENGTH));
    }

    // Import PIN as a PBKDF2 key
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(pin),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    // Derive 256 bits using PBKDF2
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt.buffer as ArrayBuffer,
            iterations: PIN_PBKDF2_ITERATIONS,
            hash: 'SHA-256'
        },
        keyMaterial,
        256
    );

    const hash = Array.from(new Uint8Array(derivedBits))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    const saltBase64 = btoa(String.fromCharCode(...salt));

    return { hash, salt: saltBase64 };
};

/**
 * Verify a PIN against a stored hash and salt.
 */
export const verifyPin = async (pin: string, storedHash: string, storedSalt: string): Promise<boolean> => {
    const { hash } = await hashPinWithSalt(pin, storedSalt);
    return hash === storedHash;
};

