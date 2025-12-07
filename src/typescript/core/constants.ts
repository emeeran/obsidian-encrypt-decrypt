/**
 * Core Constants for Note Encryptor
 * Single source of truth for all cryptographic and application constants
 */

// Cryptographic Constants
export const CRYPTO_CONSTANTS = {
    // PBKDF2 Configuration
    PBKDF2_ITERATIONS: 310000, // OWASP 2023 recommendation
    PBKDF2_ITERATIONS_LEGACY: 100000, // For backward compatibility
    PBKDF2_HASH: 'SHA-256',

    // Salt and IV
    SALT_LENGTH: 32, // 256 bits
    SALT_LENGTH_LEGACY: 16, // 128 bits (v1 compatibility)
    IV_LENGTH: 12, // 96 bits for AES-GCM

    // AES Configuration
    AES_KEY_LENGTH: 256,
    AES_ALGORITHM: 'AES-GCM',

    // Encryption Format
    ENCRYPTION_VERSION: 2,
    ENCRYPTION_HEADER_START: '-----BEGIN ENCRYPTED NOTE-----',
    ENCRYPTION_HEADER_END: '-----END ENCRYPTED NOTE-----',

    // Limits
    MAX_PASSWORD_LENGTH: 1024,
    MAX_FILE_SIZE_MB: 50,
    MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024,
} as const;

// Password Validation Constants
export const PASSWORD_CONSTANTS = {
    MIN_LENGTH_DEFAULT: 8,
    MIN_LENGTH_STRONG: 12,
    MAX_LENGTH: 1024,

    // Strength thresholds
    STRENGTH_LEVELS: [
        { score: 0, text: 'Very Weak', color: '#ff4444', percentage: 0 },
        { score: 1, text: 'Weak', color: '#ff8800', percentage: 20 },
        { score: 2, text: 'Fair', color: '#ffcc00', percentage: 40 },
        { score: 3, text: 'Good', color: '#88cc00', percentage: 60 },
        { score: 4, text: 'Strong', color: '#00cc88', percentage: 80 },
        { score: 5, text: 'Very Strong', color: '#0088ff', percentage: 100 },
    ] as const,

    // Regex patterns for validation
    PATTERNS: {
        LOWERCASE: /[a-z]/,
        UPPERCASE: /[A-Z]/,
        DIGITS: /\d/,
        SPECIAL: /[^a-zA-Z\d]/,
        SEQUENTIAL: /^(123|abc|qwer|asdf)/i,
        REPEATED: /^(.)\1+$/,
    } as const,
} as const;

// UI Constants
export const UI_CONSTANTS = {
    // Debounce delays (ms)
    DEBOUNCE_PASSWORD_STRENGTH: 150,
    DEBOUNCE_SEARCH: 300,

    // Timeouts
    NOTICE_TIMEOUT: 5000,
    LOADING_TIMEOUT: 0, // Persistent

    // Modal IDs for style management
    STYLE_IDS: {
        PASSWORD_MODAL: 'note-encryptor-password-modal-styles',
        SETTINGS: 'note-encryptor-settings-styles',
        DIRECTORY_MODAL: 'note-encryptor-directory-modal-styles',
        ERROR_MODAL: 'note-encryptor-error-modal-styles',
    } as const,
} as const;

// Directory Encryption Constants
export const DIRECTORY_CONSTANTS = {
    MANIFEST_FILENAME: '.encrypted-manifest.json',
    DEFAULT_FILE_PATTERNS: ['*.md'] as string[],
    MAX_PARALLEL_OPERATIONS: 5,
    SUPPORTED_EXTENSIONS: ['.md', '.txt', '.markdown'] as string[],
};

// Error Recovery Constants
export const ERROR_CONSTANTS = {
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 2000,
    ERROR_LOG_MAX_SIZE: 1000,
    ERROR_LOG_RETENTION_DAYS: 30,
    CHALLENGE_TIMEOUT_MS: 300000, // 5 minutes
} as const;

// Type exports for type-safe usage
export type StrengthLevel = typeof PASSWORD_CONSTANTS.STRENGTH_LEVELS[number];
export type StyleId = typeof UI_CONSTANTS.STYLE_IDS[keyof typeof UI_CONSTANTS.STYLE_IDS];
