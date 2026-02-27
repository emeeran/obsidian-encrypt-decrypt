/**
 * Note Encryptor - Security Utilities
 * HMAC integrity verification and timing-safe comparison
 */

import { HmacVerificationError } from '../errors';
import type { HmacTag, DerivedKey } from '../types/branded';
import { arrayBufferToBase64, base64ToArrayBuffer } from './keyDerivation';

// =============================================================================
// HMAC Integrity Verification
// =============================================================================

/**
 * HMAC configuration
 */
export const HMAC_CONFIG = {
    ALGORITHM: 'SHA-256' as const,
    KEY_LENGTH: 256 as const,
    TAG_LENGTH: 32 as const, // 256 bits
} as const;

/**
 * Derive an HMAC key from the encryption key
 */
export async function deriveHmacKey(encryptionKey: CryptoKey): Promise<CryptoKey> {
    // Import the encryption key as raw bytes to derive HMAC key
    const rawKey = await crypto.subtle.exportKey('raw', encryptionKey);

    // Use a different salt for HMAC key derivation
    const hmacSalt = new TextEncoder().encode('note-encryptor-hmac-key-v1');

    // Derive a separate key for HMAC
    const baseKey = await crypto.subtle.importKey(
        'raw',
        rawKey,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: hmacSalt,
            iterations: 1, // Just one iteration since we're deriving from already-derived key
            hash: 'SHA-256',
        },
        baseKey,
        { name: 'HMAC', hash: 'SHA-256', length: HMAC_CONFIG.KEY_LENGTH },
        false,
        ['sign', 'verify']
    );
}

/**
 * Calculate HMAC for data
 * @param data - Data to authenticate
 * @param hmacKey - HMAC key (derived from encryption key)
 * @returns HMAC tag
 */
export async function calculateHmac(
    data: string | Uint8Array,
    hmacKey: CryptoKey
): Promise<HmacTag> {
    const encoder = new TextEncoder();
    const dataBytes = typeof data === 'string' ? encoder.encode(data) : data;

    const signature = await crypto.subtle.sign(
        'HMAC',
        hmacKey,
        dataBytes
    );

    return new Uint8Array(signature) as unknown as HmacTag;
}

/**
 * Verify HMAC for data
 * @param data - Data to verify
 * @param tag - Expected HMAC tag
 * @param hmacKey - HMAC key
 * @returns true if HMAC is valid
 */
export async function verifyHmac(
    data: string | Uint8Array,
    tag: HmacTag | Uint8Array,
    hmacKey: CryptoKey
): Promise<boolean> {
    const encoder = new TextEncoder();
    const dataBytes = typeof data === 'string' ? encoder.encode(data) : data;
    const tagBytes = tag instanceof Uint8Array ? tag : (tag as unknown as Uint8Array);

    return crypto.subtle.verify(
        'HMAC',
        hmacKey,
        tagBytes,
        dataBytes
    );
}

/**
 * Encode HMAC tag as base64 string
 */
export function encodeHmacTag(tag: HmacTag): string {
    return arrayBufferToBase64((tag as unknown as Uint8Array).buffer);
}

/**
 * Decode base64 string to HMAC tag
 */
export function decodeHmacTag(encoded: string): HmacTag {
    const bytes = new Uint8Array(base64ToArrayBuffer(encoded));
    if (bytes.length !== HMAC_CONFIG.TAG_LENGTH) {
        throw new HmacVerificationError();
    }
    return bytes as unknown as HmacTag;
}

// =============================================================================
// Timing-Safe Comparison
// =============================================================================

/**
 * Timing-safe comparison of two Uint8Arrays
 * Uses constant-time comparison to prevent timing attacks
 * @param a - First array
 * @param b - Second array
 * @returns true if arrays are equal
 */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) {
        // Still perform comparison to maintain constant time
        // but result will be false
        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a[i] ^ (b[i % b.length] || 0);
        }
        return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a[i] ^ b[i];
    }

    return result === 0;
}

/**
 * Timing-safe comparison of two strings
 * Converts strings to byte arrays and performs constant-time comparison
 * @param a - First string
 * @param b - Second string
 * @returns true if strings are equal
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
    const encoder = new TextEncoder();
    return timingSafeEqual(encoder.encode(a), encoder.encode(b));
}

/**
 * Timing-safe comparison of two base64 strings
 * @param a - First base64 string
 * @param b - Second base64 string
 * @returns true if decoded values are equal
 */
export function timingSafeBase64Equal(a: string, b: string): boolean {
    try {
        const bytesA = new Uint8Array(base64ToArrayBuffer(a));
        const bytesB = new Uint8Array(base64ToArrayBuffer(b));
        return timingSafeEqual(bytesA, bytesB);
    } catch {
        return false;
    }
}

// =============================================================================
// Secure Memory Operations
// =============================================================================

/**
 * Securely wipe a Uint8Array (best effort in JavaScript)
 * Overwrites the array with zeros
 * @param array - Array to wipe
 */
export function secureWipe(array: Uint8Array): void {
    // In JavaScript, we can't truly wipe memory due to immutability
    // But we can overwrite the typed array
    array.fill(0);
}

/**
 * Securely wipe a string from memory (best effort)
 * Note: In JavaScript, strings are immutable, so this is symbolic
 * @param str - String to wipe (passed by reference for documentation)
 */
export function secureWipeString(str: string): void {
    // JavaScript strings are immutable, so we can't actually wipe them
    // This function exists for documentation and future-proofing
    // In production, consider using Uint8Array for sensitive data
}

/**
 * Create a secure buffer that wipes itself when done
 */
export class SecureBuffer {
    private buffer: Uint8Array;
    private wiped = false;

    constructor(size: number) {
        this.buffer = new Uint8Array(size);
    }

    get data(): Uint8Array {
        if (this.wiped) {
            throw new Error('Buffer has been wiped');
        }
        return this.buffer;
    }

    get length(): number {
        return this.buffer.length;
    }

    wipe(): void {
        if (!this.wiped) {
            secureWipe(this.buffer);
            this.wiped = true;
        }
    }

    isWiped(): boolean {
        return this.wiped;
    }
}

// =============================================================================
// Integrity Verification Helper
// =============================================================================

export interface IntegrityData {
    checksum?: string;
    hmac?: string;
}

/**
 * Combined integrity verification result
 */
export interface IntegrityResult {
    valid: boolean;
    method: 'checksum' | 'hmac' | 'none';
    error?: string;
}

/**
 * Verify integrity using the best available method
 */
export async function verifyIntegrity(
    content: string,
    integrityData: IntegrityData,
    hmacKey?: CryptoKey
): Promise<IntegrityResult> {
    // Prefer HMAC if available and key is provided
    if (integrityData.hmac && hmacKey) {
        try {
            const tag = decodeHmacTag(integrityData.hmac);
            const isValid = await verifyHmac(content, tag, hmacKey);
            return {
                valid: isValid,
                method: 'hmac',
                error: isValid ? undefined : 'HMAC verification failed',
            };
        } catch (error) {
            return {
                valid: false,
                method: 'hmac',
                error: error instanceof Error ? error.message : 'HMAC error',
            };
        }
    }

    // Fall back to checksum
    if (integrityData.checksum) {
        const { calculateChecksum } = await import('./keyDerivation');
        const calculatedChecksum = await calculateChecksum(content);
        const isValid = timingSafeBase64Equal(calculatedChecksum, integrityData.checksum);
        return {
            valid: isValid,
            method: 'checksum',
            error: isValid ? undefined : 'Checksum mismatch',
        };
    }

    // No integrity data available
    return {
        valid: true,
        method: 'none',
    };
}
