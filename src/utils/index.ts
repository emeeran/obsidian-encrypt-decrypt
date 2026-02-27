/**
 * Note Encryptor - Utils Module Index
 * Re-exports all utility functions
 */

// Metadata utilities
export {
    extractFrontmatter,
    reinsertFrontmatter,
    hasFrontmatter,
    parseFrontmatter,
    createFrontmatter,
    setFrontmatterField,
    removeFrontmatterField,
} from './metadata';

// Helper utilities
export {
    isEncrypted,
    isInlineEncrypted,
    findInlineEncryptedBlocks,
    countInlineEncryptedBlocks,
    escapeRegex,
    formatFileSize,
    generateUniqueId,
    debounce,
    throttle,
    sleep,
    isCryptoAvailable,
    getNestedProperty,
    isDevelopment,
    truncate,
} from './helpers';
