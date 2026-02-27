/**
 * Note Encryptor - Constants
 * All constant values for the plugin
 */

// ======================================================================
// Crypto Constants
// ======================================================================

export const CRYPTO_CONSTANTS = {
    ALGORITHM: 'AES-GCM' as const,
    KEY_LENGTH: 256 as const,
    SALT_LENGTH: 16 as const,
    IV_LENGTH: 12 as const,
    PBKDF2_ITERATIONS: 310000, // OWASP recommended
    ENCRYPTION_HEADER_START: '-----BEGIN ENCRYPTED NOTE-----',
    ENCRYPTION_HEADER_END: '-----END ENCRYPTED NOTE-----',
    INLINE_ENCRYPTION_START: '🔐«',
    INLINE_ENCRYPTION_END: '»🔐',
    CHECKSUM_PREFIX: 'SHA256:',
} as const;

// ======================================================================
// Default Settings
// ======================================================================

// Re-export from settings/defaults.ts
export { DEFAULT_SETTINGS } from './settings/defaults';
import type { NoteEncryptorSettings } from './types';

// ======================================================================
// Encryption Profiles
// ======================================================================

import type { EncryptionProfile } from './types';

export const ENCRYPTION_PROFILES: Record<string, EncryptionProfile> = {
    fast: {
        id: 'fast',
        name: 'Fast',
        iterations: 100000,
        algorithm: 'AES-GCM',
        keyLength: 256,
    },
    standard: {
        id: 'standard',
        name: 'Standard (OWASP Recommended)',
        iterations: 310000,
        algorithm: 'AES-GCM',
        keyLength: 256,
    },
    paranoid: {
        id: 'paranoid',
        name: 'Paranoid',
        iterations: 500000,
        algorithm: 'AES-GCM',
        keyLength: 256,
    },
};

// ======================================================================
// Rate Limiting Constants
// ======================================================================

export const RATE_LIMIT_CONSTANTS = {
    DEFAULT_MAX_ATTEMPTS: 5,
    DEFAULT_LOCKOUT_MS: 30000, // 30 seconds
    STORAGE_KEY: 'note-encryptor-rate-limits',
} as const;

// ======================================================================
// Password Store Constants
// ======================================================================

export const PASSWORD_STORE_CONSTANTS = {
    DB_NAME: 'note-encryptor-passwords',
    DB_VERSION: 1,
    STORE_NAME: 'passwords',
    DEFAULT_EXPIRY_MS: 3600000, // 1 hour
} as const;

// ======================================================================
// Batch Processing Constants
// ======================================================================

export const BATCH_CONSTANTS = {
    CONCURRENCY: 5,
    PROGRESS_UPDATE_MS: 100,
} as const;

// ======================================================================
// UI Constants
// ======================================================================

export const UI_CONSTANTS = {
    ANIMATION_DURATION_MS: 300,
    OVERLAY_Z_INDEX: 100,
    PROGRESS_MODAL_WIDTH: 500,
} as const;
