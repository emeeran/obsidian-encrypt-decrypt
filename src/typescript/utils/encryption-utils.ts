/**
 * Encryption Utility Functions
 * Pure functions for encryption content handling (no Obsidian dependencies)
 */

import { CRYPTO_CONSTANTS } from '../core/constants';

/**
 * Escape string for use in regex
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check if content is encrypted
 */
export function isEncryptedContent(content: string): boolean {
    return content.includes(CRYPTO_CONSTANTS.ENCRYPTION_HEADER_START) &&
           content.includes(CRYPTO_CONSTANTS.ENCRYPTION_HEADER_END);
}

/**
 * Extract encrypted data from content
 */
export function extractEncryptedData(content: string): string | null {
    const regex = new RegExp(
        `${escapeRegex(CRYPTO_CONSTANTS.ENCRYPTION_HEADER_START)}\\n([\\s\\S]+?)\\n${escapeRegex(CRYPTO_CONSTANTS.ENCRYPTION_HEADER_END)}`
    );
    const match = content.match(regex);
    return match ? match[1] : null;
}

/**
 * Wrap encrypted data with headers
 */
export function wrapEncryptedData(base64Data: string): string {
    return `${CRYPTO_CONSTANTS.ENCRYPTION_HEADER_START}\n${base64Data}\n${CRYPTO_CONSTANTS.ENCRYPTION_HEADER_END}`;
}
