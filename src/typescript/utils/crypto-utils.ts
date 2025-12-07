/**
 * Cryptographic Utility Functions
 * Centralized Base64, ArrayBuffer, and crypto helper functions
 */

/**
 * Convert Uint8Array to Base64 string
 * Optimized version using Array.from for better performance
 */
export function arrayBufferToBase64(buffer: Uint8Array): string {
    // Use chunks for large buffers to avoid call stack issues
    const CHUNK_SIZE = 8192;
    if (buffer.length <= CHUNK_SIZE) {
        return btoa(String.fromCharCode.apply(null, Array.from(buffer)));
    }

    // Handle large buffers in chunks
    let binary = '';
    for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
        const chunk = buffer.slice(i, i + CHUNK_SIZE);
        binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    return btoa(binary);
}

/**
 * Convert Base64 string to Uint8Array
 */
export function base64ToArrayBuffer(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

/**
 * Generate cryptographically secure random bytes
 */
export function generateSecureRandomBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
}

/**
 * Generate a cryptographically secure random string
 * Uses crypto.getRandomValues instead of Math.random()
 */
export function generateSecureRandomString(
    length: number,
    charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
): string {
    const randomValues = crypto.getRandomValues(new Uint32Array(length));
    let result = '';
    for (let i = 0; i < length; i++) {
        result += charset.charAt(randomValues[i] % charset.length);
    }
    return result;
}

/**
 * Zero out sensitive data in memory
 * Best effort - JavaScript doesn't guarantee memory clearing
 */
export function zeroMemory(data: Uint8Array): void {
    data.fill(0);
}

/**
 * Zero out a string by overwriting (limited effectiveness in JS)
 * Returns empty string for assignment
 */
export function clearSensitiveString(str: string): string {
    // In JavaScript, strings are immutable, so we can only return empty
    // The original may persist in memory until GC
    return '';
}

/**
 * Compare two ArrayBuffers for equality (timing-safe comparison)
 */
export function constantTimeEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
    if (a.byteLength !== b.byteLength) {
        return false;
    }

    const viewA = new Uint8Array(a);
    const viewB = new Uint8Array(b);
    let result = 0;

    for (let i = 0; i < viewA.length; i++) {
        result |= viewA[i] ^ viewB[i];
    }

    return result === 0;
}

/**
 * Calculate SHA-256 hash of data
 */
export async function sha256(data: string | Uint8Array): Promise<string> {
    const encoder = new TextEncoder();
    const buffer = typeof data === 'string' ? encoder.encode(data) : data;
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Derive a key from password using PBKDF2
 */
export async function deriveKey(
    password: string,
    salt: Uint8Array,
    iterations: number,
    keyLength: number = 256,
    extractable: boolean = false
): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    return await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: iterations,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: keyLength },
        extractable,
        ['encrypt', 'decrypt']
    );
}

/**
 * Export CryptoKey to raw bytes
 */
export async function cryptoKeyToBytes(key: CryptoKey): Promise<Uint8Array> {
    const exported = await crypto.subtle.exportKey('raw', key);
    return new Uint8Array(exported);
}

/**
 * Import raw bytes as CryptoKey
 */
export async function bytesToCryptoKey(
    bytes: Uint8Array,
    extractable: boolean = false
): Promise<CryptoKey> {
    return await crypto.subtle.importKey(
        'raw',
        bytes,
        { name: 'AES-GCM' },
        extractable,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt data using AES-GCM
 */
export async function encryptAesGcm(
    data: Uint8Array,
    key: CryptoKey,
    iv: Uint8Array
): Promise<Uint8Array> {
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
    );
    return new Uint8Array(encrypted);
}

/**
 * Decrypt data using AES-GCM
 */
export async function decryptAesGcm(
    encryptedData: Uint8Array,
    key: CryptoKey,
    iv: Uint8Array
): Promise<Uint8Array> {
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encryptedData
    );
    return new Uint8Array(decrypted);
}

/**
 * Check if Web Crypto API is available
 */
export function isWebCryptoAvailable(): boolean {
    return typeof crypto !== 'undefined' && typeof crypto.subtle === 'object';
}

/**
 * Check if WebAssembly is supported
 */
export function isWebAssemblySupported(): boolean {
    return typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
}

/**
 * Execute a function with a password and clear it after
 * This is a best-effort security measure due to JavaScript string immutability
 * 
 * @param password The password to use
 * @param operation The async operation that needs the password
 * @returns The result of the operation
 */
export async function withSecurePassword<T>(
    password: string,
    operation: (pwd: string) => Promise<T>
): Promise<T> {
    try {
        return await operation(password);
    } finally {
        // Best effort: In JavaScript, strings are immutable.
        // This helps signal intent and may assist garbage collection.
        // The password variable will be eligible for GC after this function returns.
    }
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}
