/**
 * Note Encryptor - Service Container
 * Dependency injection container for better testability and modularity
 */

import type { App } from 'obsidian';
import type { NoteEncryptorSettings } from '../types';
import { RateLimiter } from '../security/rateLimiter';
import { PasswordStore } from '../security/passwordStore';
import { FileEncryptor } from '../core/FileEncryptor';
import { InlineEncryptor } from '../core/InlineEncryptor';
import { FolderProcessor } from '../core/FolderProcessor';
import { BackupManager } from '../core/backupManager';
import { KeyDerivationCache, KeyCacheManager } from '../crypto/keyCache';
import { PasswordGenerator } from '../crypto/passwordGenerator';
import { EncryptionWorkerManager, getWorkerManager } from '../crypto/encryptionWorker';
import { CircuitBreakerManager, getCircuitBreakerManager } from '../utils/circuitBreaker';

// =============================================================================
// Service Types
// =============================================================================

export interface ServiceContainer {
    app: App;
    settings: NoteEncryptorSettings;
    rateLimiter: RateLimiter;
    passwordStore: PasswordStore;
    fileEncryptor: FileEncryptor;
    inlineEncryptor: InlineEncryptor;
    folderProcessor: FolderProcessor;
    backupManager: BackupManager;
    keyCache: KeyCacheManager;
    passwordGenerator: PasswordGenerator;
    workerManager: EncryptionWorkerManager;
    circuitBreakerManager: CircuitBreakerManager;
}

export interface ServiceFactory<T> {
    create(container: Partial<ServiceContainer>): T;
}

// =============================================================================
// Service Factories
// =============================================================================

/**
 * Factory for creating RateLimiter
 */
export const RateLimiterFactory: ServiceFactory<RateLimiter> = {
    create(container: Partial<ServiceContainer>): RateLimiter {
        const settings = container.settings;
        if (!settings) {
            throw new Error('Settings not available');
        }
        return new RateLimiter({
            maxAttempts: settings.rateLimitMaxAttempts,
            lockoutDurationMs: settings.rateLimitLockoutSeconds * 1000,
        });
    },
};

/**
 * Factory for creating PasswordStore
 */
export const PasswordStoreFactory: ServiceFactory<PasswordStore> = {
    create(container: Partial<ServiceContainer>): PasswordStore {
        const settings = container.settings;
        if (!settings) {
            throw new Error('Settings not available');
        }
        return new PasswordStore({
            expiryMinutes: settings.passwordMemoryExpiryMinutes,
        });
    },
};

/**
 * Factory for creating FileEncryptor
 */
export const FileEncryptorFactory: ServiceFactory<FileEncryptor> = {
    create(container: Partial<ServiceContainer>): FileEncryptor {
        const { app, settings } = container;
        if (!app || !settings) {
            throw new Error('App or settings not available');
        }
        return new FileEncryptor(app, settings);
    },
};

/**
 * Factory for creating InlineEncryptor
 */
export const InlineEncryptorFactory: ServiceFactory<InlineEncryptor> = {
    create(container: Partial<ServiceContainer>): InlineEncryptor {
        const settings = container.settings;
        if (!settings) {
            throw new Error('Settings not available');
        }
        return new InlineEncryptor(settings);
    },
};

/**
 * Factory for creating FolderProcessor
 */
export const FolderProcessorFactory: ServiceFactory<FolderProcessor> = {
    create(container: Partial<ServiceContainer>): FolderProcessor {
        const { app, settings } = container;
        if (!app || !settings) {
            throw new Error('App or settings not available');
        }
        return new FolderProcessor(app, settings);
    },
};

/**
 * Factory for creating BackupManager
 */
export const BackupManagerFactory: ServiceFactory<BackupManager> = {
    create(container: Partial<ServiceContainer>): BackupManager {
        const app = container.app;
        if (!app) {
            throw new Error('App not available');
        }
        return new BackupManager(app, '2.0.0');
    },
};

/**
 * Factory for creating KeyCacheManager
 */
export const KeyCacheManagerFactory: ServiceFactory<KeyCacheManager> = {
    create(): KeyCacheManager {
        return new KeyCacheManager({
            maxSize: 50,
            ttlMs: 5 * 60 * 1000,
        });
    },
};

/**
 * Factory for creating PasswordGenerator
 */
export const PasswordGeneratorFactory: ServiceFactory<PasswordGenerator> = {
    create(): PasswordGenerator {
        return new PasswordGenerator();
    },
};

// =============================================================================
// Plugin Service Container
// =============================================================================

/**
 * Main service container for the plugin
 * Manages all service instances and their lifecycle
 */
export class PluginServiceContainer implements ServiceContainer {
    private _app: App;
    private _settings: NoteEncryptorSettings;
    private _rateLimiter: RateLimiter | null = null;
    private _passwordStore: PasswordStore | null = null;
    private _fileEncryptor: FileEncryptor | null = null;
    private _inlineEncryptor: InlineEncryptor | null = null;
    private _folderProcessor: FolderProcessor | null = null;
    private _backupManager: BackupManager | null = null;
    private _keyCache: KeyCacheManager | null = null;
    private _passwordGenerator: PasswordGenerator | null = null;
    private _workerManager: EncryptionWorkerManager | null = null;
    private _circuitBreakerManager: CircuitBreakerManager | null = null;

    constructor(app: App, settings: NoteEncryptorSettings) {
        this._app = app;
        this._settings = settings;
    }

    // =========================================================================
    // Property Accessors
    // =========================================================================

    get app(): App {
        return this._app;
    }

    get settings(): NoteEncryptorSettings {
        return this._settings;
    }

    get rateLimiter(): RateLimiter {
        if (!this._rateLimiter) {
            this._rateLimiter = RateLimiterFactory.create(this);
        }
        return this._rateLimiter;
    }

    get passwordStore(): PasswordStore {
        if (!this._passwordStore) {
            this._passwordStore = PasswordStoreFactory.create(this);
        }
        return this._passwordStore;
    }

    get fileEncryptor(): FileEncryptor {
        if (!this._fileEncryptor) {
            this._fileEncryptor = FileEncryptorFactory.create(this);
        }
        return this._fileEncryptor;
    }

    get inlineEncryptor(): InlineEncryptor {
        if (!this._inlineEncryptor) {
            this._inlineEncryptor = InlineEncryptorFactory.create(this);
        }
        return this._inlineEncryptor;
    }

    get folderProcessor(): FolderProcessor {
        if (!this._folderProcessor) {
            this._folderProcessor = FolderProcessorFactory.create(this);
        }
        return this._folderProcessor;
    }

    get backupManager(): BackupManager {
        if (!this._backupManager) {
            this._backupManager = BackupManagerFactory.create(this);
        }
        return this._backupManager;
    }

    get keyCache(): KeyCacheManager {
        if (!this._keyCache) {
            this._keyCache = KeyCacheManagerFactory.create(this);
        }
        return this._keyCache;
    }

    get passwordGenerator(): PasswordGenerator {
        if (!this._passwordGenerator) {
            this._passwordGenerator = PasswordGeneratorFactory.create(this);
        }
        return this._passwordGenerator;
    }

    get workerManager(): EncryptionWorkerManager {
        if (!this._workerManager) {
            this._workerManager = getWorkerManager();
        }
        return this._workerManager;
    }

    get circuitBreakerManager(): CircuitBreakerManager {
        if (!this._circuitBreakerManager) {
            this._circuitBreakerManager = getCircuitBreakerManager();
        }
        return this._circuitBreakerManager;
    }

    // =========================================================================
    // Service Management
    // =========================================================================

    /**
     * Update settings reference
     */
    updateSettings(settings: NoteEncryptorSettings): void {
        this._settings = settings;

        // Update services that depend on settings
        if (this._fileEncryptor) {
            this._fileEncryptor.updateSettings(settings);
        }
        if (this._inlineEncryptor) {
            this._inlineEncryptor.updateSettings(settings);
        }
        if (this._folderProcessor) {
            this._folderProcessor.updateSettings(settings);
        }

        // Recreate rate limiter with new settings
        this._rateLimiter = null;
    }

    /**
     * Reset a specific service (forces recreation on next access)
     */
    resetService(serviceName: keyof ServiceContainer): void {
        switch (serviceName) {
            case 'rateLimiter':
                this._rateLimiter = null;
                break;
            case 'passwordStore':
                this._passwordStore = null;
                break;
            case 'fileEncryptor':
                this._fileEncryptor = null;
                break;
            case 'inlineEncryptor':
                this._inlineEncryptor = null;
                break;
            case 'folderProcessor':
                this._folderProcessor = null;
                break;
            case 'backupManager':
                this._backupManager = null;
                break;
            case 'keyCache':
                this._keyCache = null;
                break;
            case 'passwordGenerator':
                this._passwordGenerator = null;
                break;
        }
    }

    /**
     * Reset all services
     */
    resetAll(): void {
        this._rateLimiter = null;
        this._passwordStore = null;
        this._fileEncryptor = null;
        this._inlineEncryptor = null;
        this._folderProcessor = null;
        this._backupManager = null;
        this._keyCache = null;
        this._passwordGenerator = null;
    }

    /**
     * Cleanup all services on plugin unload
     */
    destroy(): void {
        // Cleanup password store
        if (this._passwordStore) {
            this._passwordStore.clearAll();
        }

        // Cleanup key cache
        if (this._keyCache) {
            this._keyCache.destroy();
        }

        // Cleanup worker manager
        if (this._workerManager) {
            this._workerManager.terminate();
        }

        // Cleanup circuit breaker manager
        if (this._circuitBreakerManager) {
            this._circuitBreakerManager.destroy();
        }
    }

    // =========================================================================
    // Service Status
    // =========================================================================

    /**
     * Get status of all services
     */
    getStatus(): Record<string, { initialized: boolean; type: string }> {
        return {
            rateLimiter: {
                initialized: this._rateLimiter !== null,
                type: 'RateLimiter',
            },
            passwordStore: {
                initialized: this._passwordStore !== null,
                type: 'PasswordStore',
            },
            fileEncryptor: {
                initialized: this._fileEncryptor !== null,
                type: 'FileEncryptor',
            },
            inlineEncryptor: {
                initialized: this._inlineEncryptor !== null,
                type: 'InlineEncryptor',
            },
            folderProcessor: {
                initialized: this._folderProcessor !== null,
                type: 'FolderProcessor',
            },
            backupManager: {
                initialized: this._backupManager !== null,
                type: 'BackupManager',
            },
            keyCache: {
                initialized: this._keyCache !== null,
                type: 'KeyCacheManager',
            },
            passwordGenerator: {
                initialized: this._passwordGenerator !== null,
                type: 'PasswordGenerator',
            },
            workerManager: {
                initialized: this._workerManager !== null,
                type: 'EncryptionWorkerManager',
            },
            circuitBreakerManager: {
                initialized: this._circuitBreakerManager !== null,
                type: 'CircuitBreakerManager',
            },
        };
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): Record<string, unknown> {
        return {
            keyCache: this._keyCache?.getStats() ?? null,
            circuitBreakers: this._circuitBreakerManager?.getAllStats() ?? null,
        };
    }
}

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Create a mock service container for testing
 */
export function createMockServiceContainer(
    overrides: Partial<ServiceContainer> = {}
): ServiceContainer {
    const mockApp = {
        vault: {
            read: async () => '',
            modify: async () => {},
            create: async () => {},
            getMarkdownFiles: () => [],
            getName: () => 'Test Vault',
        },
        workspace: {
            getActiveFile: () => null,
            on: () => {},
        },
    } as unknown as App;

    const mockSettings: NoteEncryptorSettings = {
        // Existing settings
        encryptedNotePrefix: '🔒 ',
        encryptedNoteSuffix: '',
        showPasswordStrength: true,
        passwordMinLength: 8,
        hideEncryptedContent: true,
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

    const container = new PluginServiceContainer(mockApp, mockSettings);

    return {
        ...container,
        ...overrides,
    } as ServiceContainer;
}
