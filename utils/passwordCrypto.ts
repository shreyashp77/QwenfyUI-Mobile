/**
 * Password-based encryption utilities for the Private Gallery feature.
 * Uses PBKDF2 for key derivation and AES-GCM for encryption.
 * This is portable - files can be decrypted on any device with the correct password.
 */

const ALGORITHM = 'AES-GCM';
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

/**
 * Hash a password with a salt for secure storage/verification.
 * Returns both the hash and the salt (salt is random if not provided).
 */
export async function hashPasswordWithSalt(
    password: string,
    existingSalt?: string
): Promise<{ hash: string; salt: string }> {
    const encoder = new TextEncoder();

    // Use existing salt or generate new one
    let salt: Uint8Array;
    if (existingSalt) {
        salt = Uint8Array.from(atob(existingSalt), c => c.charCodeAt(0));
    } else {
        salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    }

    // Combine password and salt
    const passwordData = encoder.encode(password);
    const combined = new Uint8Array(passwordData.length + salt.length);
    combined.set(passwordData);
    combined.set(salt, passwordData.length);

    // Hash with SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Convert salt to base64 for storage
    const saltBase64 = btoa(String.fromCharCode(...salt));

    return { hash, salt: saltBase64 };
}

/**
 * Verify a password against a stored hash and salt.
 */
export async function verifyPassword(
    password: string,
    storedHash: string,
    storedSalt: string
): Promise<boolean> {
    const { hash } = await hashPasswordWithSalt(password, storedSalt);
    return hash === storedHash;
}

/**
 * Derive an AES-GCM key from a password using PBKDF2.
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt.buffer as ArrayBuffer,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256'
        },
        passwordKey,
        { name: ALGORITHM, length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt a file with a password.
 * File format: [16 bytes salt] [12 bytes IV] [encrypted data]
 */
export async function encryptWithPassword(file: File | Blob, password: string): Promise<File> {
    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Derive key from password
    const key = await deriveKey(password, salt);

    // Read file data
    const arrayBuffer = await file.arrayBuffer();

    // Encrypt
    const encryptedContent = await crypto.subtle.encrypt(
        { name: ALGORITHM, iv: iv },
        key,
        arrayBuffer
    );

    // Combine: salt + IV + encrypted data
    const finalBuffer = new Uint8Array(
        SALT_LENGTH + IV_LENGTH + encryptedContent.byteLength
    );
    finalBuffer.set(salt, 0);
    finalBuffer.set(iv, SALT_LENGTH);
    finalBuffer.set(new Uint8Array(encryptedContent), SALT_LENGTH + IV_LENGTH);

    // Create new File with .psave extension
    const originalName = (file as File).name || 'gallery_item';
    const timestamp = Date.now();

    // Generate unique filename: original_timestamp.psave
    const lastDotIndex = originalName.lastIndexOf('.');
    let baseName = lastDotIndex > 0 ? originalName.substring(0, lastDotIndex) : originalName;
    const extension = lastDotIndex > 0 ? originalName.substring(lastDotIndex) : '';

    // Remove any existing .psave or .enc extension
    baseName = baseName.replace(/\.(psave|enc)$/i, '');

    const newName = `${baseName}_${timestamp}${extension}.psave`;

    return new File([finalBuffer], newName, { type: 'application/octet-stream' });
}

/**
 * Decrypt a file with a password.
 * Expects format: [16 bytes salt] [12 bytes IV] [encrypted data]
 */
export async function decryptWithPassword(
    blob: Blob,
    password: string,
    mimeType: string = 'application/octet-stream'
): Promise<Blob> {
    const arrayBuffer = await blob.arrayBuffer();
    const fullData = new Uint8Array(arrayBuffer);

    // Extract salt, IV, and encrypted data
    const salt = fullData.slice(0, SALT_LENGTH);
    const iv = fullData.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const encryptedData = fullData.slice(SALT_LENGTH + IV_LENGTH);

    // Derive key from password
    const key = await deriveKey(password, salt);

    try {
        // Decrypt
        const decryptedContent = await crypto.subtle.decrypt(
            { name: ALGORITHM, iv: iv },
            key,
            encryptedData
        );

        return new Blob([decryptedContent], { type: mimeType });
    } catch (e) {
        console.error('Password decryption failed:', e);
        throw new Error('Incorrect password or corrupted file');
    }
}

/**
 * Get the original file extension from a .psave filename.
 * e.g., "image_123456.png.psave" -> "png"
 */
export function getOriginalExtension(psaveFilename: string): string {
    // Remove .psave extension
    const withoutPsave = psaveFilename.replace(/\.psave$/i, '');
    // Get the remaining extension
    const lastDotIndex = withoutPsave.lastIndexOf('.');
    if (lastDotIndex > 0) {
        return withoutPsave.substring(lastDotIndex + 1).toLowerCase();
    }
    return 'bin';
}

/**
 * Get MIME type from extension.
 */
export function getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'mov': 'video/quicktime'
    };
    return mimeTypes[extension] || 'application/octet-stream';
}
