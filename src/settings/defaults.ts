/**
 * Note Encryptor - Settings Defaults
 * Default settings values
 */

import type { NoteEncryptorSettings } from '../types';

export const DEFAULT_SETTINGS: NoteEncryptorSettings = {
    // Existing settings
    encryptedNotePrefix: '🔒 ',
    encryptedNoteSuffix: '',
    showPasswordStrength: true,
    passwordMinLength: 8,
    hideEncryptedContent: true,

    // Security settings
    enableRateLimiting: true,
    rateLimitMaxAttempts: 5,
    rateLimitLockoutSeconds: 30,
    enablePasswordMemory: false,
    passwordMemoryExpiryMinutes: 60,
    preserveMetadata: true,
    encryptionProfile: 'standard',
    customIterations: 310000,
    enableIntegrityCheck: true,
    showQuickActions: false,

    // Enhanced settings (v2.1+)
    useHmacIntegrity: false,
    useWebWorker: false,
    useKeyCaching: true,
    keyCacheTtlMinutes: 5,

    // Password generator settings
    passwordGeneratorLength: 20,
    passwordGeneratorIncludeUppercase: true,
    passwordGeneratorIncludeLowercase: true,
    passwordGeneratorIncludeNumbers: true,
    passwordGeneratorIncludeSymbols: true,
    passwordGeneratorExcludeAmbiguous: false,
    passwordGeneratorPreset: 'secure',

    // Backup settings
    backupIncludeUnencrypted: false,
    backupDefaultPath: '',

    // Accessibility settings
    enableAccessibilityMode: false,
    highContrastMode: false,

    // Advanced settings
    circuitBreakerFailureThreshold: 5,
    circuitBreakerResetTimeoutSeconds: 60,
    batchConcurrency: 5,
};
