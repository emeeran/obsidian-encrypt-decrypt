/**
 * Core Encryption Service
 * Single source of truth for AES-256-GCM encryption/decryption
 */

import { CRYPTO_CONSTANTS } from './constants';
import {
    arrayBufferToBase64,
    base64ToArrayBuffer,
    generateSecureRandomBytes,
    deriveKey,
    encryptAesGcm,
    decryptAesGcm,
    zeroMemory
} from '../utils/crypto-utils';
import { isEncryptedContent, extractEncryptedData, wrapEncryptedData } from '../utils/encryption-utils';

/**
 * Encryption result interface
 */
export interface EncryptionResult {
    success: boolean;
    data: string;
    error?: string;
    metrics?: {
        encryptionTime: number;
        algorithm: string;
        iterations: number;
        dataSize: number;
    };
}

/**
 * Decryption result interface
 */
export interface DecryptionResult {
    success: boolean;
    data: string;
    error?: string;
    metrics?: {
        decryptionTime: number;
        algorithm: string;
        version: number;
        dataSize: number;
    };
}

/**
 * Encryption options
 */
export interface EncryptionOptions {
    iterations?: number;
    saltLength?: number;
    includeMetadata?: boolean;
}

/**
 * Encrypted note metadata
 */
interface EncryptedMetadata {
    v: number;
    alg: string;
    kdf: string;
    iterations: number;
    timestamp: number;
    saltLength: number;
}

/**
 * Encrypt text content with password
 */
export async function encrypt(
    plaintext: string,
    password: string,
    options: EncryptionOptions = {}
): Promise<EncryptionResult> {
    const startTime = performance.now();
    const encoder = new TextEncoder();

    const {
        iterations = CRYPTO_CONSTANTS.PBKDF2_ITERATIONS,
        saltLength = CRYPTO_CONSTANTS.SALT_LENGTH,
        includeMetadata = true
    } = options;

    // Validate inputs
    if (!plaintext) {
        return { success: false, data: '', error: 'No content to encrypt' };
    }

    if (!password) {
        return { success: false, data: '', error: 'Password is required' };
    }

    const data = encoder.encode(plaintext);

    // Check file size
    if (data.length > CRYPTO_CONSTANTS.MAX_FILE_SIZE_BYTES) {
        return {
            success: false,
            data: '',
            error: `Content too large (max ${CRYPTO_CONSTANTS.MAX_FILE_SIZE_MB}MB)`
        };
    }

    try {
        // Generate salt and IV
        const salt = generateSecureRandomBytes(saltLength);
        const iv = generateSecureRandomBytes(CRYPTO_CONSTANTS.IV_LENGTH);

        // Derive key from password
        const key = await deriveKey(password, salt, iterations);

        // Encrypt data
        const encryptedData = await encryptAesGcm(data, key, iv);

        // Create metadata header
        const metadata: EncryptedMetadata = {
            v: CRYPTO_CONSTANTS.ENCRYPTION_VERSION,
            alg: CRYPTO_CONSTANTS.AES_ALGORITHM,
            kdf: 'PBKDF2',
            iterations: iterations,
            timestamp: Date.now(),
            saltLength: saltLength
        };

        // Combine components
        let combined: Uint8Array;

        if (includeMetadata) {
            const metadataBytes = encoder.encode(JSON.stringify(metadata));
            const nullTerminator = new Uint8Array([0]);

            combined = new Uint8Array(
                metadataBytes.length +
                1 + // null terminator
                salt.length +
                iv.length +
                encryptedData.length
            );

            let offset = 0;
            combined.set(metadataBytes, offset);
            offset += metadataBytes.length;
            combined.set(nullTerminator, offset);
            offset += 1;
            combined.set(salt, offset);
            offset += salt.length;
            combined.set(iv, offset);
            offset += iv.length;
            combined.set(encryptedData, offset);
        } else {
            // Legacy format: salt + iv + data
            combined = new Uint8Array(salt.length + iv.length + encryptedData.length);
            combined.set(salt, 0);
            combined.set(iv, salt.length);
            combined.set(encryptedData, salt.length + iv.length);
        }

        // Convert to base64 and wrap with headers
        const base64 = arrayBufferToBase64(combined);
        const wrappedData = wrapEncryptedData(base64);

        const encryptionTime = performance.now() - startTime;

        // Clear sensitive data
        zeroMemory(data);

        return {
            success: true,
            data: wrappedData,
            metrics: {
                encryptionTime,
                algorithm: `${CRYPTO_CONSTANTS.AES_ALGORITHM} (PBKDF2)`,
                iterations,
                dataSize: plaintext.length
            }
        };

    } catch (error) {
        return {
            success: false,
            data: '',
            error: error instanceof Error ? error.message : 'Encryption failed'
        };
    }
}

/**
 * Decrypt encrypted content with password
 */
export async function decrypt(
    encryptedContent: string,
    password: string
): Promise<DecryptionResult> {
    const startTime = performance.now();

    // Validate inputs
    if (!encryptedContent) {
        return { success: false, data: '', error: 'No content to decrypt' };
    }

    if (!password) {
        return { success: false, data: '', error: 'Password is required' };
    }

    if (!isEncryptedContent(encryptedContent)) {
        return { success: false, data: '', error: 'Content is not encrypted' };
    }

    try {
        // Extract base64 data
        const base64Data = extractEncryptedData(encryptedContent);
        if (!base64Data) {
            return { success: false, data: '', error: 'Invalid encrypted format' };
        }

        const combined = base64ToArrayBuffer(base64Data);

        // Try to parse metadata (v2 format)
        const parseResult = parseEncryptedData(combined);

        if (parseResult.hasMetadata) {
            // Version 2+ format with metadata
            return await decryptV2(
                parseResult.salt,
                parseResult.iv,
                parseResult.encryptedData,
                password,
                parseResult.metadata!,
                startTime
            );
        } else {
            // Legacy format (v1)
            return await decryptLegacy(combined, password, startTime);
        }

    } catch (error) {
        // Check for common decryption errors
        const errorMessage = error instanceof Error ? error.message : 'Decryption failed';

        if (errorMessage.includes('decrypt') || errorMessage.includes('tag')) {
            return {
                success: false,
                data: '',
                error: 'Incorrect password or corrupted data'
            };
        }

        return { success: false, data: '', error: errorMessage };
    }
}

/**
 * Parse encrypted data to extract components
 */
function parseEncryptedData(combined: Uint8Array): {
    hasMetadata: boolean;
    metadata?: EncryptedMetadata;
    salt: Uint8Array;
    iv: Uint8Array;
    encryptedData: Uint8Array;
} {
    const decoder = new TextDecoder();

    // Try to find null terminator (indicates metadata present)
    let headerEnd = -1;
    for (let i = 0; i < Math.min(combined.length, 500); i++) {
        if (combined[i] === 0) {
            headerEnd = i;
            break;
        }
    }

    if (headerEnd > 0) {
        // Try to parse as JSON metadata
        try {
            const headerBytes = combined.slice(0, headerEnd);
            const headerText = decoder.decode(headerBytes);
            const metadata = JSON.parse(headerText) as EncryptedMetadata;

            // Valid metadata found
            const offset = headerEnd + 1;
            const saltLength = metadata.saltLength || CRYPTO_CONSTANTS.SALT_LENGTH_LEGACY;

            return {
                hasMetadata: true,
                metadata,
                salt: combined.slice(offset, offset + saltLength),
                iv: combined.slice(offset + saltLength, offset + saltLength + CRYPTO_CONSTANTS.IV_LENGTH),
                encryptedData: combined.slice(offset + saltLength + CRYPTO_CONSTANTS.IV_LENGTH)
            };
        } catch {
            // Not valid JSON, treat as legacy format
        }
    }

    // Legacy format: salt (16) + iv (12) + data
    return {
        hasMetadata: false,
        salt: combined.slice(0, CRYPTO_CONSTANTS.SALT_LENGTH_LEGACY),
        iv: combined.slice(CRYPTO_CONSTANTS.SALT_LENGTH_LEGACY, CRYPTO_CONSTANTS.SALT_LENGTH_LEGACY + CRYPTO_CONSTANTS.IV_LENGTH),
        encryptedData: combined.slice(CRYPTO_CONSTANTS.SALT_LENGTH_LEGACY + CRYPTO_CONSTANTS.IV_LENGTH)
    };
}

/**
 * Decrypt v2 format with metadata
 */
async function decryptV2(
    salt: Uint8Array,
    iv: Uint8Array,
    encryptedData: Uint8Array,
    password: string,
    metadata: EncryptedMetadata,
    startTime: number
): Promise<DecryptionResult> {
    const decoder = new TextDecoder();

    // Check version compatibility
    if (metadata.v > CRYPTO_CONSTANTS.ENCRYPTION_VERSION) {
        return {
            success: false,
            data: '',
            error: `Unsupported encryption version: ${metadata.v}. Please update the plugin.`
        };
    }

    // Derive key with stored iterations
    const key = await deriveKey(password, salt, metadata.iterations);

    // Decrypt
    const decryptedData = await decryptAesGcm(encryptedData, key, iv);
    const plaintext = decoder.decode(decryptedData);

    const decryptionTime = performance.now() - startTime;

    return {
        success: true,
        data: plaintext,
        metrics: {
            decryptionTime,
            algorithm: metadata.alg,
            version: metadata.v,
            dataSize: plaintext.length
        }
    };
}

/**
 * Decrypt legacy v1 format
 */
async function decryptLegacy(
    combined: Uint8Array,
    password: string,
    startTime: number
): Promise<DecryptionResult> {
    const decoder = new TextDecoder();

    // Legacy format: salt (16) + iv (12) + data
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encryptedData = combined.slice(28);

    // Derive key with legacy iterations
    const key = await deriveKey(password, salt, CRYPTO_CONSTANTS.PBKDF2_ITERATIONS_LEGACY);

    // Decrypt
    const decryptedData = await decryptAesGcm(encryptedData, key, iv);
    const plaintext = decoder.decode(decryptedData);

    const decryptionTime = performance.now() - startTime;

    return {
        success: true,
        data: plaintext,
        metrics: {
            decryptionTime,
            algorithm: 'AES-256-GCM (Legacy)',
            version: 1,
            dataSize: plaintext.length
        }
    };
}

/**
 * Re-encrypt content with new password or settings
 */
export async function reEncrypt(
    encryptedContent: string,
    oldPassword: string,
    newPassword: string,
    newOptions?: EncryptionOptions
): Promise<EncryptionResult> {
    // First decrypt with old password
    const decryptResult = await decrypt(encryptedContent, oldPassword);

    if (!decryptResult.success) {
        return {
            success: false,
            data: '',
            error: decryptResult.error || 'Failed to decrypt with old password'
        };
    }

    // Re-encrypt with new password
    return await encrypt(decryptResult.data, newPassword, newOptions);
}

/**
 * Validate encrypted content structure
 */
export function validateEncryptedContent(content: string): {
    valid: boolean;
    version?: number;
    error?: string;
} {
    if (!isEncryptedContent(content)) {
        return { valid: false, error: 'Not an encrypted note' };
    }

    const base64Data = extractEncryptedData(content);
    if (!base64Data) {
        return { valid: false, error: 'Could not extract encrypted data' };
    }

    try {
        const combined = base64ToArrayBuffer(base64Data);

        // Minimum size check (salt + iv + some data)
        if (combined.length < 30) {
            return { valid: false, error: 'Encrypted data too short' };
        }

        const parseResult = parseEncryptedData(combined);

        return {
            valid: true,
            version: parseResult.metadata?.v || 1
        };
    } catch {
        return { valid: false, error: 'Invalid encrypted data format' };
    }
}
