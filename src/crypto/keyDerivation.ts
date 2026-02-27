/**
 * Note Encryptor - Key Derivation Functions
 * PBKDF2 key derivation and buffer conversions
 */

import { CRYPTO_CONSTANTS } from '../constants';

/**
 * Convert ArrayBuffer to Base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
    // Clean the base64 string - remove any whitespace or invalid characters
    const cleanBase64 = base64.replace(/[\s\n\r]/g, '');
    const binary = atob(cleanBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Derive encryption key from password using PBKDF2
 * @param password - User password
 * @param salt - Random salt
 * @param iterations - PBKDF2 iterations (optional, defaults to CRYPTO_CONSTANTS.PBKDF2_ITERATIONS)
 * @returns Derived CryptoKey
 */
export async function deriveKey(
    password: string,
    salt: Uint8Array,
    iterations?: number
): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: iterations ?? CRYPTO_CONSTANTS.PBKDF2_ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: CRYPTO_CONSTANTS.ALGORITHM, length: CRYPTO_CONSTANTS.KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Generate a random salt
 */
export function generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(CRYPTO_CONSTANTS.SALT_LENGTH));
}

/**
 * Generate a random IV (Initialization Vector)
 */
export function generateIV(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(CRYPTO_CONSTANTS.IV_LENGTH));
}

/**
 * Calculate SHA-256 checksum of data
 */
export async function calculateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    return arrayBufferToBase64(hashBuffer);
}
