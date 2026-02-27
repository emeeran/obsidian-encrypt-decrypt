/**
 * Note Encryptor - Type Definitions
 * All interfaces and types for the plugin
 */

// =============================================================================
// Settings Types
// =============================================================================

export interface NoteEncryptorSettings {
    // Existing settings
    encryptedNotePrefix: string;
    encryptedNoteSuffix: string;
    showPasswordStrength: boolean;
    passwordMinLength: number;
    hideEncryptedContent: boolean;

    // New settings
    enableRateLimiting: boolean;
    rateLimitMaxAttempts: number;
    rateLimitLockoutSeconds: number;
    enablePasswordMemory: boolean;
    passwordMemoryExpiryMinutes: number;
    preserveMetadata: boolean;
    encryptionProfile: 'fast' | 'standard' | 'paranoid';
    customIterations: number;
    enableIntegrityCheck: boolean;
    showQuickActions: boolean;

    // Enhanced settings (v2.1+)
    useHmacIntegrity: boolean;
    useWebWorker: boolean;
    useKeyCaching: boolean;
    keyCacheTtlMinutes: number;

    // Password generator settings
    passwordGeneratorLength: number;
    passwordGeneratorIncludeUppercase: boolean;
    passwordGeneratorIncludeLowercase: boolean;
    passwordGeneratorIncludeNumbers: boolean;
    passwordGeneratorIncludeSymbols: boolean;
    passwordGeneratorExcludeAmbiguous: boolean;
    passwordGeneratorPreset: 'balanced' | 'secure' | 'memorable' | 'paranoid' | 'pin';

    // Backup settings
    backupIncludeUnencrypted: boolean;
    backupDefaultPath: string;

    // Accessibility settings
    enableAccessibilityMode: boolean;
    highContrastMode: boolean;

    // Advanced settings
    circuitBreakerFailureThreshold: number;
    circuitBreakerResetTimeoutSeconds: number;
    batchConcurrency: number;
}

// =============================================================================
// Password Strength Types
// =============================================================================

export interface PasswordStrength {
    score: number;
    percentage: number;
    text: string;
    color: string;
}

// =============================================================================
// Encryption Profile Types
// =============================================================================

export interface EncryptionProfile {
    id: string;
    name: string;
    iterations: number;
    algorithm: 'AES-GCM';
    keyLength: 128 | 256;
}

// =============================================================================
// Inline Encryption Types
// =============================================================================

export interface InlineEncryptedBlock {
    start: number;
    end: number;
    content: string;
    from?: { line: number; ch: number };
    to?: { line: number; ch: number };
}

// =============================================================================
// Rate Limiter Types
// =============================================================================

export interface RateLimiterOptions {
    maxAttempts: number;
    lockoutDurationMs: number;
}

export interface RateLimitState {
    count: number;
    lastAttempt: number;
    lockedUntil?: number;
}

// =============================================================================
// Password Store Types
// =============================================================================

export interface PasswordEntry {
    id: string;
    encryptedPassword: string;
    iv: string;
    salt: string;
    associatedFiles: string[];
    createdAt: number;
    expiresAt: number;
}

export interface PasswordStoreOptions {
    expiryMinutes: number;
    masterKey?: string;
}

// =============================================================================
// Batch Processing Types
// =============================================================================

export interface BatchProgress {
    current: number;
    total: number;
    currentFile: string;
    successCount: number;
    failCount: number;
    status: 'pending' | 'running' | 'completed' | 'cancelled';
}

export interface BatchResult {
    file: string;
    success: boolean;
    error?: string;
}

// =============================================================================
// Metadata Types
// =============================================================================

export interface FrontmatterExtraction {
    frontmatter: string | null;
    body: string;
}

// =============================================================================
// Encrypted Content Types
// =============================================================================

export interface EncryptedContentData {
    salt: Uint8Array;
    iv: Uint8Array;
    data: Uint8Array;
    checksum?: string;
    hmac?: string;
}

export interface DecryptedContentResult {
    content: string;
    integrityValid: boolean;
    integrityMethod?: 'checksum' | 'hmac' | 'none';
}

// =============================================================================
// Modal Callback Types
// =============================================================================

export type PasswordSubmitCallback = (password: string) => void | Promise<void>;
export type FolderSelectCallback = (folder: import('obsidian').TFolder) => void;

// =============================================================================
// Service Types
// =============================================================================

export interface ServiceStatus {
    initialized: boolean;
    type: string;
}

export interface CacheStats {
    hits: number;
    misses: number;
    evictions: number;
    size: number;
    maxSize: number;
}

// =============================================================================
// Backup Types
// =============================================================================

export interface BackupManifest {
    version: string;
    createdAt: string;
    pluginVersion: string;
    vaultName: string;
    totalFiles: number;
    encryptedFiles: string[];
    checksum: string;
}

export interface BackupOptions {
    password: string;
    includeUnencrypted?: boolean;
    includePaths?: string[];
    excludePaths?: string[];
    iterations?: number;
    onProgress?: (progress: BatchProgress) => void;
}

export interface RestoreOptions {
    password: string;
    overwriteExisting?: boolean;
    restorePath?: string;
    iterations?: number;
    onProgress?: (progress: BatchProgress) => void;
}

// =============================================================================
// Password Generator Types
// =============================================================================

export interface PasswordGeneratorOptions {
    length: number;
    includeUppercase: boolean;
    includeLowercase: boolean;
    includeNumbers: boolean;
    includeSymbols: boolean;
    excludeAmbiguous: boolean;
    excludeSimilar: boolean;
    customSymbols?: string;
    minLength?: number;
    maxLength?: number;
}

export interface GeneratedPasswordResult {
    password: string;
    strength: PasswordStrength;
    entropy: number;
    charset: string;
}

// =============================================================================
// Circuit Breaker Types
// =============================================================================

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerStats {
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailureTime: number | null;
    lastSuccessTime: number | null;
    totalCalls: number;
    totalFailures: number;
    totalSuccesses: number;
}

// =============================================================================
// Key Derivation Cache Types
// =============================================================================

export interface KeyCacheOptions {
    maxSize?: number;
    ttlMs?: number;
    pruneIntervalMs?: number;
}

// =============================================================================
// Web Worker Types
// =============================================================================

export type WorkerMessageType =
    | 'encrypt'
    | 'decrypt'
    | 'encryptInline'
    | 'decryptInline'
    | 'deriveKey'
    | 'ping';

export interface WorkerMessage<T extends WorkerMessageType = WorkerMessageType> {
    type: T;
    id: string;
    payload: unknown;
}

export interface WorkerResponse<T = unknown> {
    id: string;
    success: boolean;
    result?: T;
    error?: string;
}

// =============================================================================
// Accessibility Types
// =============================================================================

export interface AccessibilityConfig {
    announceEncryption: boolean;
    announceDecryption: boolean;
    describePasswordStrength: boolean;
    keyboardOnlyMode: boolean;
    highContrastOverlay: boolean;
}
