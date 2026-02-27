/**
 * Note Encryptor - Helper Utilities
 * Common utility functions
 */

import { CRYPTO_CONSTANTS } from '../constants';
import type { InlineEncryptedBlock } from '../types';

/**
 * Check if content is fully encrypted (note encryption)
 * @param content - Content to check
 * @returns true if content contains full note encryption markers
 */
export function isEncrypted(content: string): boolean {
    return (
        content.includes(CRYPTO_CONSTANTS.ENCRYPTION_HEADER_START) &&
        content.includes(CRYPTO_CONSTANTS.ENCRYPTION_HEADER_END)
    );
}

/**
 * Check if content contains inline encryption
 * @param content - Content to check
 * @returns true if content contains inline encryption markers
 */
export function isInlineEncrypted(content: string): boolean {
    return (
        content.includes(CRYPTO_CONSTANTS.INLINE_ENCRYPTION_START) &&
        content.includes(CRYPTO_CONSTANTS.INLINE_ENCRYPTION_END)
    );
}

/**
 * Find all inline encrypted blocks in content
 * @param content - Content to search
 * @returns Array of block positions and content
 */
export function findInlineEncryptedBlocks(content: string): InlineEncryptedBlock[] {
    const blocks: InlineEncryptedBlock[] = [];
    const startMarker = CRYPTO_CONSTANTS.INLINE_ENCRYPTION_START;
    const endMarker = CRYPTO_CONSTANTS.INLINE_ENCRYPTION_END;

    let searchStart = 0;
    while (true) {
        const startIdx = content.indexOf(startMarker, searchStart);
        if (startIdx === -1) break;

        const endIdx = content.indexOf(endMarker, startIdx);
        if (endIdx === -1) break;

        const fullEnd = endIdx + endMarker.length;
        blocks.push({
            start: startIdx,
            end: fullEnd,
            content: content.slice(startIdx, fullEnd),
        });

        searchStart = fullEnd;
    }

    return blocks;
}

/**
 * Count inline encrypted blocks in content
 * @param content - Content to search
 * @returns Number of encrypted blocks
 */
export function countInlineEncryptedBlocks(content: string): number {
    return findInlineEncryptedBlocks(content).length;
}

/**
 * Escape special regex characters
 * @param str - String to escape
 * @returns Escaped string safe for regex
 */
export function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Format file size for display
 * @param bytes - Size in bytes
 * @returns Human-readable size string
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Generate a unique ID
 * @returns Random unique string
 */
export function generateUniqueId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Debounce a function
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<T>) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            fn(...args);
            timeoutId = null;
        }, delay);
    };
}

/**
 * Throttle a function
 * @param fn - Function to throttle
 * @param limit - Minimum time between calls in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
    fn: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle = false;

    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}

/**
 * Sleep for a specified duration
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if Web Crypto API is available
 * @returns true if crypto.subtle is available
 */
export function isCryptoAvailable(): boolean {
    return !!(window.crypto && window.crypto.subtle);
}

/**
 * Safely get a nested property
 * @param obj - Object to access
 * @param path - Dot-separated path
 * @param defaultValue - Default if path doesn't exist
 * @returns Value at path or default
 */
export function getNestedProperty<T>(
    obj: Record<string, unknown>,
    path: string,
    defaultValue: T
): T {
    const keys = path.split('.');
    let result: unknown = obj;

    for (const key of keys) {
        if (result && typeof result === 'object' && key in result) {
            result = (result as Record<string, unknown>)[key];
        } else {
            return defaultValue;
        }
    }

    return result as T;
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
}

/**
 * Truncate string with ellipsis
 * @param str - String to truncate
 * @param maxLength - Maximum length
 * @returns Truncated string
 */
export function truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
}
