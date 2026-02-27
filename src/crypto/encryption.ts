/**
 * Note Encryptor - Encryption/Decryption Functions
 * Core AES-256-GCM encryption for notes and inline text
 */

import { CRYPTO_CONSTANTS } from '../constants';
import {
    arrayBufferToBase64,
    base64ToArrayBuffer,
    deriveKey,
    generateSalt,
    generateIV,
    calculateChecksum,
} from './keyDerivation';

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Encrypt content with password
 * @param content - Plain text content to encrypt
 * @param password - User password
 * @param iterations - Optional custom PBKDF2 iterations
 * @param includeChecksum - Whether to include integrity checksum
 * @returns Encrypted content with headers
 */
export async function encryptContent(
    content: string,
    password: string,
    iterations?: number,
    includeChecksum = true
): Promise<string> {
    const encoder = new TextEncoder();
    const salt = generateSalt();
    const iv = generateIV();
    const key = await deriveKey(password, salt, iterations);

    const encrypted = await crypto.subtle.encrypt(
        { name: CRYPTO_CONSTANTS.ALGORITHM, iv: iv },
        key,
        encoder.encode(content)
    );

    // Calculate checksum of original content for integrity verification
    const checksum = includeChecksum ? await calculateChecksum(content) : null;

    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    const base64 = arrayBufferToBase64(combined.buffer);

    // Format: [checksum line if enabled]\n[base64 data]
    const checksumLine = checksum ? `${CRYPTO_CONSTANTS.CHECKSUM_PREFIX}${checksum}\n` : '';

    return `${CRYPTO_CONSTANTS.ENCRYPTION_HEADER_START}\n${checksumLine}${base64}\n${CRYPTO_CONSTANTS.ENCRYPTION_HEADER_END}`;
}

/**
 * Decrypt content with password
 * @param encryptedContent - Encrypted content with headers
 * @param password - User password
 * @param iterations - Optional custom PBKDF2 iterations
 * @returns Decrypted plain text and integrity status
 */
export async function decryptContent(
    encryptedContent: string,
    password: string,
    iterations?: number
): Promise<{ content: string; integrityValid: boolean }> {
    // Match the encrypted content pattern, with optional checksum line
    const pattern = new RegExp(
        `${escapeRegex(CRYPTO_CONSTANTS.ENCRYPTION_HEADER_START)}\\n` +
        `(?:${escapeRegex(CRYPTO_CONSTANTS.CHECKSUM_PREFIX)}([A-Za-z0-9+/=]+)\\n)?` +
        `([\\s\\S]+?)\\n${escapeRegex(CRYPTO_CONSTANTS.ENCRYPTION_HEADER_END)}`
    );

    const match = encryptedContent.match(pattern);

    if (!match) {
        throw new Error('Invalid encrypted content format');
    }

    const storedChecksum = match[1] || null;
    const base64Data = match[2];

    const combined = new Uint8Array(base64ToArrayBuffer(base64Data));
    const salt = combined.slice(0, CRYPTO_CONSTANTS.SALT_LENGTH);
    const iv = combined.slice(
        CRYPTO_CONSTANTS.SALT_LENGTH,
        CRYPTO_CONSTANTS.SALT_LENGTH + CRYPTO_CONSTANTS.IV_LENGTH
    );
    const data = combined.slice(CRYPTO_CONSTANTS.SALT_LENGTH + CRYPTO_CONSTANTS.IV_LENGTH);

    const key = await deriveKey(password, salt, iterations);

    const decrypted = await crypto.subtle.decrypt(
        { name: CRYPTO_CONSTANTS.ALGORITHM, iv: iv },
        key,
        data
    );

    const content = new TextDecoder().decode(decrypted);

    // Verify integrity if checksum is present
    let integrityValid = true;
    if (storedChecksum) {
        const calculatedChecksum = await calculateChecksum(content);
        integrityValid = calculatedChecksum === storedChecksum;
    }

    return { content, integrityValid };
}

/**
 * Encrypt inline text with password
 * @param content - Plain text to encrypt
 * @param password - User password
 * @param iterations - Optional custom PBKDF2 iterations
 * @returns Encrypted content with inline markers
 */
export async function encryptInline(
    content: string,
    password: string,
    iterations?: number
): Promise<string> {
    const encoder = new TextEncoder();
    const salt = generateSalt();
    const iv = generateIV();
    const key = await deriveKey(password, salt, iterations);

    const encrypted = await crypto.subtle.encrypt(
        { name: CRYPTO_CONSTANTS.ALGORITHM, iv: iv },
        key,
        encoder.encode(content)
    );

    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    const base64 = arrayBufferToBase64(combined.buffer);
    return `${CRYPTO_CONSTANTS.INLINE_ENCRYPTION_START}${base64}${CRYPTO_CONSTANTS.INLINE_ENCRYPTION_END}`;
}

/**
 * Decrypt inline text with password
 * @param encryptedContent - Encrypted inline content with markers
 * @param password - User password
 * @param iterations - Optional custom PBKDF2 iterations
 * @returns Decrypted plain text
 */
export async function decryptInline(
    encryptedContent: string,
    password: string,
    iterations?: number
): Promise<string> {
    // Extract just the base64 content between markers
    const startMarker = CRYPTO_CONSTANTS.INLINE_ENCRYPTION_START;
    const endMarker = CRYPTO_CONSTANTS.INLINE_ENCRYPTION_END;

    const startIdx = encryptedContent.indexOf(startMarker);
    const endIdx = encryptedContent.indexOf(endMarker);

    if (startIdx === -1 || endIdx === -1) {
        throw new Error('Invalid inline encrypted content format');
    }

    // Extract and clean the base64 string
    const base64 = encryptedContent.slice(startIdx + startMarker.length, endIdx).trim();

    if (!base64) {
        throw new Error('Empty encrypted content');
    }

    try {
        const combined = new Uint8Array(base64ToArrayBuffer(base64));

        if (combined.length < CRYPTO_CONSTANTS.SALT_LENGTH + CRYPTO_CONSTANTS.IV_LENGTH + 1) {
            throw new Error('Encrypted data too short');
        }

        const salt = combined.slice(0, CRYPTO_CONSTANTS.SALT_LENGTH);
        const iv = combined.slice(
            CRYPTO_CONSTANTS.SALT_LENGTH,
            CRYPTO_CONSTANTS.SALT_LENGTH + CRYPTO_CONSTANTS.IV_LENGTH
        );
        const data = combined.slice(CRYPTO_CONSTANTS.SALT_LENGTH + CRYPTO_CONSTANTS.IV_LENGTH);

        const key = await deriveKey(password, salt, iterations);

        const decrypted = await crypto.subtle.decrypt(
            { name: CRYPTO_CONSTANTS.ALGORITHM, iv: iv },
            key,
            data
        );

        return new TextDecoder().decode(decrypted);
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Decryption failed - wrong password or corrupted data');
    }
}
