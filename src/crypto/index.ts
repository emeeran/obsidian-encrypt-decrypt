/**
 * Note Encryptor - Crypto Module Index
 * Re-exports all crypto-related functions
 */

// Key derivation
export {
    arrayBufferToBase64,
    base64ToArrayBuffer,
    deriveKey,
    generateSalt,
    generateIV,
    calculateChecksum,
} from './keyDerivation';

// Encryption/Decryption
export {
    encryptContent,
    decryptContent,
    encryptInline,
    decryptInline,
} from './encryption';

// Password strength
export {
    calculatePasswordStrength,
    isPasswordValid,
    getPasswordRequirements,
} from './passwordStrength';

// Password generator
export {
    PasswordGenerator,
    generatePassword,
    generatePasswordWithResult,
    generatePasswordFromPreset,
    generatePassphrase,
    analyzePassword,
    DEFAULT_PASSWORD_OPTIONS,
    PASSWORD_PRESETS,
} from './passwordGenerator';

export type {
    PasswordGeneratorOptions,
    PasswordGeneratorPreset,
    GeneratedPasswordResult,
} from './passwordGenerator';

// Key derivation cache
export {
    KeyDerivationCache,
    getKeyCache,
    destroyKeyCache,
    deriveKeyWithCache,
    KeyCacheManager,
} from './keyCache';

export type { KeyCacheOptions, CacheStats } from './keyCache';

// Integrity verification
export {
    HMAC_CONFIG,
    deriveHmacKey,
    calculateHmac,
    verifyHmac,
    encodeHmacTag,
    decodeHmacTag,
    timingSafeEqual,
    timingSafeStringEqual,
    timingSafeBase64Equal,
    secureWipe,
    secureWipeString,
    SecureBuffer,
    verifyIntegrity,
} from './integrity';

export type { IntegrityData, IntegrityResult } from './integrity';

// Web Worker
export {
    EncryptionWorkerManager,
    getWorkerManager,
    destroyWorkerManager,
} from './encryptionWorker';

export type {
    WorkerMessageType,
    WorkerMessage,
    WorkerResponse,
    EncryptPayload,
    DecryptPayload,
    EncryptInlinePayload,
    DecryptInlinePayload,
    EncryptResult,
    DecryptResult,
} from './encryptionWorker';
