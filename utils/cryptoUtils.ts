// Crypto utilities for PIN hashing and file encryption

const MASTER_KEY_STORAGE_KEY = 'qwenfy_master_key';
const MASTER_KEY_SALT_KEY = 'qwenfy_master_salt';

/**
 * Hash a PIN using SHA-256 (for verification)
 */
export const hashPin = async (pin: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
};

/**
 * Derive an AES key from PIN using PBKDF2
 */
export const deriveKeyFromPin = async (pin: string, salt: Uint8Array): Promise<CryptoKey> => {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(pin),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt as BufferSource,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true, // extractable for export
        ['encrypt', 'decrypt']
    );
};

/**
 * Generate a random 256-bit master key
 */
export const generateMasterKey = async (): Promise<CryptoKey> => {
    return crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true, // extractable
        ['encrypt', 'decrypt']
    );
};

/**
 * Export CryptoKey to raw bytes
 */
export const exportKey = async (key: CryptoKey): Promise<Uint8Array> => {
    const exported = await crypto.subtle.exportKey('raw', key);
    return new Uint8Array(exported);
};

/**
 * Import raw bytes as CryptoKey
 */
export const importKey = async (keyData: Uint8Array): Promise<CryptoKey> => {
    return crypto.subtle.importKey(
        'raw',
        keyData as BufferSource,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
};

/**
 * Encrypt data with AES-GCM
 */
export const encryptData = async (
    data: Uint8Array,
    key: CryptoKey,
    iv: Uint8Array
): Promise<Uint8Array> => {
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv as BufferSource },
        key,
        data as BufferSource
    );
    return new Uint8Array(encrypted);
};

/**
 * Decrypt data with AES-GCM
 */
export const decryptData = async (
    encryptedData: Uint8Array,
    key: CryptoKey,
    iv: Uint8Array
): Promise<Uint8Array> => {
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv as BufferSource },
        key,
        encryptedData as BufferSource
    );
    return new Uint8Array(decrypted);
};

/**
 * Generate a random IV (12 bytes for AES-GCM)
 */
export const generateIV = (): Uint8Array => {
    return crypto.getRandomValues(new Uint8Array(12));
};

/**
 * Generate a random salt (16 bytes)
 */
export const generateSalt = (): Uint8Array => {
    return crypto.getRandomValues(new Uint8Array(16));
};

/**
 * Convert Uint8Array to base64 string
 */
export const toBase64 = (data: Uint8Array): string => {
    return btoa(String.fromCharCode(...data));
};

/**
 * Convert base64 string to Uint8Array
 */
export const fromBase64 = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

/**
 * Encrypt the master key with a PIN-derived key and store in localStorage
 */
export const storeMasterKey = async (masterKey: CryptoKey, pin: string): Promise<void> => {
    const salt = generateSalt();
    const pinKey = await deriveKeyFromPin(pin, salt);
    const iv = generateIV();

    const masterKeyBytes = await exportKey(masterKey);
    const encryptedMasterKey = await encryptData(masterKeyBytes, pinKey, iv);

    // Store: salt + iv + encrypted_master_key
    const storedData = {
        salt: toBase64(salt),
        iv: toBase64(iv),
        encryptedKey: toBase64(encryptedMasterKey)
    };

    localStorage.setItem(MASTER_KEY_STORAGE_KEY, JSON.stringify(storedData));
};

/**
 * Retrieve and decrypt the master key from localStorage using PIN
 * Returns null if no master key stored or decryption fails
 */
export const retrieveMasterKey = async (pin: string): Promise<CryptoKey | null> => {
    const storedJson = localStorage.getItem(MASTER_KEY_STORAGE_KEY);
    if (!storedJson) return null;

    try {
        const storedData = JSON.parse(storedJson);
        const salt = fromBase64(storedData.salt);
        const iv = fromBase64(storedData.iv);
        const encryptedKey = fromBase64(storedData.encryptedKey);

        const pinKey = await deriveKeyFromPin(pin, salt);
        const masterKeyBytes = await decryptData(encryptedKey, pinKey, iv);

        return importKey(masterKeyBytes);
    } catch (e) {
        console.error('Failed to retrieve master key:', e);
        return null;
    }
};

/**
 * Check if a master key is stored
 */
export const hasMasterKey = (): boolean => {
    return localStorage.getItem(MASTER_KEY_STORAGE_KEY) !== null;
};

/**
 * Get or create master key
 * If no master key exists, generates a new one and stores it encrypted with PIN
 */
export const getOrCreateMasterKey = async (pin: string): Promise<CryptoKey> => {
    // Try to retrieve existing
    const existing = await retrieveMasterKey(pin);
    if (existing) return existing;

    // Generate new master key
    const newKey = await generateMasterKey();
    await storeMasterKey(newKey, pin);

    return newKey;
};

/**
 * Clear stored master key (for testing or reset)
 */
export const clearMasterKey = (): void => {
    localStorage.removeItem(MASTER_KEY_STORAGE_KEY);
    localStorage.removeItem(MASTER_KEY_SALT_KEY);
};
