/**
 * Note Encryptor - Custom Error Classes
 * Granular error types for better debugging and error handling
 */

// =============================================================================
// Base Error Class
// =============================================================================

/**
 * Base error class for all plugin errors
 */
export abstract class NoteEncryptorError extends Error {
    public readonly code: string;
    public readonly timestamp: number;
    public readonly context?: Record<string, unknown>;

    constructor(
        message: string,
        code: string,
        options?: { cause?: Error; context?: Record<string, unknown> }
    ) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.timestamp = Date.now();
        this.context = options?.context;

        // Set cause if provided (ES2022 feature, but we handle gracefully)
        if (options?.cause) {
            (this as any).cause = options.cause;
        }

        // Maintains proper stack trace for where error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    /**
     * Convert error to a user-friendly message
     */
    toUserMessage(): string {
        return this.message;
    }

    /**
     * Convert error to JSON for logging
     */
    toJSON(): Record<string, unknown> {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            timestamp: new Date(this.timestamp).toISOString(),
            context: this.context,
            stack: this.stack,
        };
    }
}

// =============================================================================
// Encryption Errors
// =============================================================================

/**
 * Base class for encryption-related errors
 */
export abstract class EncryptionError extends NoteEncryptorError {
    constructor(
        message: string,
        code: string,
        options?: { cause?: Error; context?: Record<string, unknown> }
    ) {
        super(message, `ENC_${code}`, options);
    }
}

/**
 * Error during encryption process
 */
export class EncryptOperationError extends EncryptionError {
    constructor(message: string, options?: { cause?: Error; context?: Record<string, unknown> }) {
        super(message, 'ENCRYPT_FAILED', options);
    }
}

/**
 * Error during decryption process
 */
export class DecryptOperationError extends EncryptionError {
    constructor(message: string, options?: { cause?: Error; context?: Record<string, unknown> }) {
        super(message, 'DECRYPT_FAILED', options);
    }

    toUserMessage(): string {
        return 'Decryption failed - wrong password or corrupted data';
    }
}

/**
 * Error when content is already encrypted
 */
export class AlreadyEncryptedError extends EncryptionError {
    constructor(context?: Record<string, unknown>) {
        super('Content is already encrypted', 'ALREADY_ENCRYPTED', { context });
    }
}

/**
 * Error when content is not encrypted
 */
export class NotEncryptedError extends EncryptionError {
    constructor(context?: Record<string, unknown>) {
        super('Content is not encrypted', 'NOT_ENCRYPTED', { context });
    }
}

/**
 * Error for empty content
 */
export class EmptyContentError extends EncryptionError {
    constructor(operation: 'encrypt' | 'decrypt' = 'encrypt') {
        super(
            `Cannot ${operation} empty content`,
            'EMPTY_CONTENT'
        );
    }
}

// =============================================================================
// Key Derivation Errors
// =============================================================================

/**
 * Base class for key derivation errors
 */
export abstract class KeyDerivationError extends NoteEncryptorError {
    constructor(
        message: string,
        code: string,
        options?: { cause?: Error; context?: Record<string, unknown> }
    ) {
        super(message, `KDF_${code}`, options);
    }
}

/**
 * Error when password is invalid
 */
export class InvalidPasswordError extends KeyDerivationError {
    constructor(reason: string = 'Password does not meet requirements') {
        super(reason, 'INVALID_PASSWORD');
    }
}

/**
 * Error when password is too short
 */
export class PasswordTooShortError extends KeyDerivationError {
    constructor(minLength: number, actualLength: number) {
        super(
            `Password must be at least ${minLength} characters (got ${actualLength})`,
            'PASSWORD_TOO_SHORT',
            { context: { minLength, actualLength } }
        );
    }
}

/**
 * Error when key derivation fails
 */
export class KeyDerivationFailedError extends KeyDerivationError {
    constructor(options?: { cause?: Error }) {
        super('Failed to derive encryption key', 'DERIVATION_FAILED', options);
    }
}

// =============================================================================
// Integrity Errors
// =============================================================================

/**
 * Base class for integrity-related errors
 */
export abstract class IntegrityError extends NoteEncryptorError {
    constructor(
        message: string,
        code: string,
        options?: { cause?: Error; context?: Record<string, unknown> }
    ) {
        super(message, `INTEGRITY_${code}`, options);
    }
}

/**
 * Error when integrity check fails
 */
export class IntegrityCheckFailedError extends IntegrityError {
    constructor(expected?: string, actual?: string) {
        super('Integrity verification failed - data may be corrupted or tampered', 'CHECK_FAILED', {
            context: { expected, actual },
        });
    }

    toUserMessage(): string {
        return 'Warning: Integrity check failed. Data may be corrupted or tampered.';
    }
}

/**
 * Error when HMAC verification fails
 */
export class HmacVerificationError extends IntegrityError {
    constructor() {
        super('HMAC verification failed', 'HMAC_FAILED');
    }

    toUserMessage(): string {
        return 'Data integrity verification failed - content may have been modified';
    }
}

/**
 * Error when checksum is missing
 */
export class MissingChecksumError extends IntegrityError {
    constructor() {
        super('No checksum found for verification', 'MISSING_CHECKSUM');
    }
}

// =============================================================================
// Rate Limiting Errors
// =============================================================================

/**
 * Base class for rate limiting errors
 */
export abstract class RateLimitError extends NoteEncryptorError {
    public readonly retryAfterMs: number;

    constructor(
        message: string,
        code: string,
        retryAfterMs: number,
        options?: { context?: Record<string, unknown> }
    ) {
        super(message, `RATELIMIT_${code}`, options);
        this.retryAfterMs = retryAfterMs;
    }
}

/**
 * Error when rate limit is exceeded
 */
export class RateLimitExceededError extends RateLimitError {
    constructor(retryAfterMs: number, attemptsMade: number) {
        super(
            `Too many failed attempts. Locked for ${Math.ceil(retryAfterMs / 1000)} seconds`,
            'EXCEEDED',
            retryAfterMs,
            { context: { attemptsMade } }
        );
    }

    toUserMessage(): string {
        const seconds = Math.ceil(this.retryAfterMs / 1000);
        return `Too many failed attempts. Please wait ${seconds} seconds before trying again.`;
    }
}

// =============================================================================
// Password Store Errors
// =============================================================================

/**
 * Base class for password store errors
 */
export abstract class PasswordStoreError extends NoteEncryptorError {
    constructor(
        message: string,
        code: string,
        options?: { cause?: Error; context?: Record<string, unknown> }
    ) {
        super(message, `STORE_${code}`, options);
    }
}

/**
 * Error when password store is unavailable
 */
export class PasswordStoreUnavailableError extends PasswordStoreError {
    constructor() {
        super('Password store is not available', 'UNAVAILABLE');
    }
}

/**
 * Error when stored password is not found
 */
export class PasswordNotFoundError extends PasswordStoreError {
    constructor(fileId: string) {
        super('No stored password found', 'NOT_FOUND', { context: { fileId } });
    }
}

/**
 * Error when stored password has expired
 */
export class PasswordExpiredError extends PasswordStoreError {
    constructor(fileId: string) {
        super('Stored password has expired', 'EXPIRED', { context: { fileId } });
    }
}

/**
 * Error when master key is not set
 */
export class MasterKeyNotSetError extends PasswordStoreError {
    constructor() {
        super('Master key not set - cannot encrypt/decrypt stored passwords', 'NO_MASTER_KEY');
    }
}

// =============================================================================
// File Operation Errors
// =============================================================================

/**
 * Base class for file operation errors
 */
export abstract class FileOperationError extends NoteEncryptorError {
    public readonly filePath: string;

    constructor(
        message: string,
        code: string,
        filePath: string,
        options?: { cause?: Error; context?: Record<string, unknown> }
    ) {
        super(message, `FILE_${code}`, { ...options, context: { ...options?.context, filePath } });
        this.filePath = filePath;
    }
}

/**
 * Error when file is not found
 */
export class FileNotFoundError extends FileOperationError {
    constructor(filePath: string) {
        super('File not found', 'NOT_FOUND', filePath);
    }
}

/**
 * Error when file cannot be read
 */
export class FileReadError extends FileOperationError {
    constructor(filePath: string, options?: { cause?: Error }) {
        super('Failed to read file', 'READ_FAILED', filePath, options);
    }
}

/**
 * Error when file cannot be written
 */
export class FileWriteError extends FileOperationError {
    constructor(filePath: string, options?: { cause?: Error }) {
        super('Failed to write file', 'WRITE_FAILED', filePath, options);
    }
}

/**
 * Error when file rename fails
 */
export class FileRenameError extends FileOperationError {
    constructor(filePath: string, newName: string, options?: { cause?: Error }) {
        super(`Failed to rename file to ${newName}`, 'RENAME_FAILED', filePath, options);
    }
}

// =============================================================================
// Batch Operation Errors
// =============================================================================

/**
 * Base class for batch operation errors
 */
export abstract class BatchOperationError extends NoteEncryptorError {
    constructor(
        message: string,
        code: string,
        options?: { cause?: Error; context?: Record<string, unknown> }
    ) {
        super(message, `BATCH_${code}`, options);
    }
}

/**
 * Error when batch operation is cancelled
 */
export class BatchCancelledError extends BatchOperationError {
    constructor(processedCount: number, totalCount: number) {
        super('Batch operation was cancelled', 'CANCELLED', {
            context: { processedCount, totalCount },
        });
    }
}

/**
 * Error when circuit breaker is open
 */
export class CircuitBreakerOpenError extends BatchOperationError {
    constructor(failureCount: number) {
        super(
            'Too many failures - circuit breaker is open',
            'CIRCUIT_OPEN',
            { context: { failureCount } }
        );
    }

    toUserMessage(): string {
        return 'Too many failures occurred. Please try again later.';
    }
}

// =============================================================================
// Format Errors
// =============================================================================

/**
 * Error for invalid encrypted content format
 */
export class InvalidFormatError extends NoteEncryptorError {
    constructor(expectedFormat: string, details?: string) {
        super(
            `Invalid encrypted content format${details ? `: ${details}` : ''}`,
            'FORMAT_INVALID',
            { context: { expectedFormat } }
        );
    }
}

/**
 * Error for corrupted data
 */
export class CorruptedDataError extends NoteEncryptorError {
    constructor(details?: string) {
        super(
            `Encrypted data appears to be corrupted${details ? `: ${details}` : ''}`,
            'DATA_CORRUPTED'
        );
    }
}

// =============================================================================
// Web Crypto Errors
// =============================================================================

/**
 * Error when Web Crypto API is not available
 */
export class WebCryptoUnavailableError extends NoteEncryptorError {
    constructor() {
        super(
            'Web Crypto API is not available. Please use a modern browser with HTTPS.',
            'CRYPTO_UNAVAILABLE'
        );
    }
}

/**
 * Error for unsupported algorithm
 */
export class UnsupportedAlgorithmError extends NoteEncryptorError {
    constructor(algorithm: string) {
        super(`Unsupported algorithm: ${algorithm}`, 'UNSUPPORTED_ALGORITHM', {
            context: { algorithm },
        });
    }
}

// =============================================================================
// Worker Errors
// =============================================================================

/**
 * Error when Web Worker is not available
 */
export class WorkerUnavailableError extends NoteEncryptorError {
    constructor() {
        super('Web Workers are not available', 'WORKER_UNAVAILABLE');
    }
}

/**
 * Error when worker operation fails
 */
export class WorkerOperationError extends NoteEncryptorError {
    constructor(operation: string, options?: { cause?: Error }) {
        super(`Worker operation failed: ${operation}`, 'WORKER_FAILED', options);
    }
}

// =============================================================================
// Backup/Restore Errors
// =============================================================================

/**
 * Error during backup creation
 */
export class BackupError extends NoteEncryptorError {
    constructor(message: string, options?: { cause?: Error; context?: Record<string, unknown> }) {
        super(message, 'BACKUP_ERROR', options);
    }
}

/**
 * Error during restore operation
 */
export class RestoreError extends NoteEncryptorError {
    constructor(message: string, options?: { cause?: Error; context?: Record<string, unknown> }) {
        super(message, 'RESTORE_ERROR', options);
    }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if error is a NoteEncryptorError
 */
export function isNoteEncryptorError(error: unknown): error is NoteEncryptorError {
    return error instanceof NoteEncryptorError;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
    if (error instanceof RateLimitExceededError) return true;
    if (error instanceof CircuitBreakerOpenError) return true;
    if (error instanceof WorkerOperationError) return true;
    return false;
}

/**
 * Get user-friendly error message
 */
export function getUserErrorMessage(error: unknown): string {
    if (isNoteEncryptorError(error)) {
        return error.toUserMessage();
    }
    if (error instanceof Error) {
        return error.message;
    }
    return 'An unexpected error occurred';
}

/**
 * Convert unknown error to NoteEncryptorError
 */
export function toNoteEncryptorError(error: unknown, fallbackMessage: string): NoteEncryptorError {
    if (isNoteEncryptorError(error)) {
        return error;
    }
    if (error instanceof Error) {
        return new EncryptOperationError(error.message, { cause: error });
    }
    return new EncryptOperationError(fallbackMessage);
}
