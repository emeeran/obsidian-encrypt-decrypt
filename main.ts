import { App, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { enhancedEncryptionService } from './src/typescript/enhanced-encryption';
import { BatchOperationsManager } from './src/typescript/batch-operations';
import { BatchOperationModal } from './src/typescript/batch-ui';
import { HardwareSecurityManager, HardwareSecuritySettings } from './src/typescript/hardware-security';
import { HardwareSecuritySetupModal, SecurityStatusDisplay } from './src/typescript/hardware-security-ui';
import { AdvancedErrorRecovery, ErrorRecoverySettings } from './src/typescript/error-recovery';
import { ErrorDiagnosticsModal, ErrorRecoveryStatusDisplay } from './src/typescript/error-recovery-ui';
import { PostQuantumCryptoManager, PostQuantumSettings } from './src/typescript/post-quantum';
import { PostQuantumSetupModal, PostQuantumStatusDisplay } from './src/typescript/post-quantum-ui';
import { AIAnalyzeEngine, AISettings } from './src/typescript/ai-features';
import { AIAssistantModal, AIPasswordGeneratorModal } from './src/typescript/ai-features-ui';
// New imports for directory encryption and utilities
import { DirectoryEncryptionSettings, DEFAULT_DIRECTORY_SETTINGS } from './src/typescript/features/directory-encryption';
import { DirectorySelectionModal, DirectoryEncryptionModal, DirectoryDecryptionModal } from './src/typescript/ui/directory-modal';
import { calculatePasswordStrength as calcStrength } from './src/typescript/utils/password-utils';

// Custom error classes for better error handling
class EncryptionError extends Error {
    constructor(message: string, public cause?: Error) {
        super(message);
        this.name = 'EncryptionError';
    }
}

class PasswordError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PasswordError';
    }
}

class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

// Password strength result interface
interface PasswordStrength {
    score: number; // 0-4
    percentage: number; // 0-100
    text: string;
    color: string;
}

// Enhanced settings interface
interface NoteEncryptorSettings {
    encryptedNotePrefix: string;
    encryptedNoteSuffix: string;
    requireStrongPasswords: boolean;
    showPasswordStrength: boolean;
    confirmOnEncrypt: boolean;
    passwordMinLength: number;
    maxFileSize: number; // in MB
    // New v2.1.0 settings
    enableWebAssembly: boolean;
    performanceMode: boolean;
    showPerformanceMetrics: boolean;
    enableAdvancedFeatures: boolean;
    // New v2.2.0 settings - Hardware Security
    hardwareSecurity: HardwareSecuritySettings;
    hardwareSecurityKeys: Record<string, any>; // For registered keys storage
    // New v2.3.0 settings - Error Recovery
    errorRecovery: ErrorRecoverySettings;
    errorLog: any[]; // Error log storage
    // New v2.4.0 settings - Post-Quantum Cryptography
    postQuantum: PostQuantumSettings;
    postQuantumKeys: Record<string, any>; // For post-quantum key pairs storage
    // New v2.5.0 settings - AI-Powered Features
    aiSettings: AISettings;
    aiLearningData: Record<string, any>; // For AI learning and patterns
    // New v2.6.0 settings - Directory Encryption
    directoryEncryption: DirectoryEncryptionSettings;
}

const DEFAULT_SETTINGS: NoteEncryptorSettings = {
    encryptedNotePrefix: '🔒 ',
    encryptedNoteSuffix: '',
    requireStrongPasswords: true,
    showPasswordStrength: true,
    confirmOnEncrypt: false,
    passwordMinLength: 8,
    maxFileSize: 10, // 10MB default limit
    // New v2.1.0 settings defaults
    enableWebAssembly: true,
    performanceMode: true,
    showPerformanceMetrics: false,
    enableAdvancedFeatures: false,
    // New v2.2.0 hardware security defaults
    hardwareSecurity: {
        enabled: false,
        requireHardwareKey: false,
        fallbackToPassword: true,
        biometricAuth: false,
        keyTimeout: 30000, // 30 seconds
        supportedKeyTypes: ['public-key'],
        autoPrompt: false
    },
    hardwareSecurityKeys: {},
    // New v2.3.0 error recovery defaults
    errorRecovery: {
        enableAutoRecovery: true,
        maxRetryAttempts: 3,
        retryDelay: 2000, // 2 seconds
        enableErrorReporting: false,
        enableErrorLogging: true,
        enableCrashRecovery: true,
        autoBackupEnabled: true,
        backupRetentionDays: 30
    },
    errorLog: [],
    // New v2.4.0 post-quantum defaults
    postQuantum: {
        enablePostQuantum: false,
        hybridMode: true,
        algorithm: 'Kyber',
        keySize: 2048,
        securityLevel: 3,
        experimentalFeatures: false,
        fallbackToClassical: true,
        quantumReadiness: true
    },
    postQuantumKeys: {},
    // New v2.5.0 AI-powered features defaults
    aiSettings: {
        enabled: true,
        autoPasswordGeneration: true,
        contentAnalysis: true,
        sensitiveContentDetection: true,
        securityRecommendations: true,
        patternAnalysis: true,
        breachProtection: true,
        aiAssistance: true,
        privacyMode: false,
        learningMode: true
    },
    aiLearningData: {},
    // New v2.6.0 directory encryption defaults
    directoryEncryption: DEFAULT_DIRECTORY_SETTINGS
}


// Confirmation modal for sensitive operations
class ConfirmModal extends Modal {
    result: boolean = false;
    onSubmit: (confirmed: boolean) => void;

    constructor(app: App, _title: string, _message: string, onSubmit: (confirmed: boolean) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Confirm Operation' });
        contentEl.createEl('p', { text: 'Are you sure you want to proceed? This action will modify your note.' });

        const buttonContainer = contentEl.createDiv('modal-button-container');

        const cancelButton = buttonContainer.createEl('button', { text: 'Cancel', cls: 'mod-cta' });
        const confirmButton = buttonContainer.createEl('button', { text: 'Confirm' });

        cancelButton.onclick = () => {
            this.result = false;
            this.close();
        };

        confirmButton.onclick = () => {
            this.result = true;
            this.close();
        };
    }

    onClose() {
        this.onSubmit(this.result);
        const { contentEl } = this;
        contentEl.empty();
    }
}

export default class NoteEncryptorPlugin extends Plugin {
    settings!: NoteEncryptorSettings;
    private loadingNotice: Notice | null = null;
    private batchManager!: BatchOperationsManager;
    public hardwareSecurityManager: HardwareSecurityManager | null = null;
    public errorRecovery!: AdvancedErrorRecovery;
    // Lazy-loaded modules
    private _postQuantumManager: PostQuantumCryptoManager | null = null;
    private _aiEngine: AIAnalyzeEngine | null = null;

    // Lazy getter for post-quantum manager
    get postQuantumManager(): PostQuantumCryptoManager {
        if (!this._postQuantumManager) {
            this._postQuantumManager = new PostQuantumCryptoManager(this.app, this.settings.postQuantum);
        }
        return this._postQuantumManager;
    }

    // Lazy getter for AI engine
    get aiEngine(): AIAnalyzeEngine {
        if (!this._aiEngine) {
            this._aiEngine = new AIAnalyzeEngine(this.app, this.settings.aiSettings);
        }
        return this._aiEngine;
    }

    async onload() {
        await this.loadSettings();

        // Initialize batch manager
        this.batchManager = new BatchOperationsManager(this.app);

        // Initialize error recovery system
        this.errorRecovery = new AdvancedErrorRecovery(this.app, this.settings.errorRecovery);

        // Post-quantum manager and AI engine are lazy-loaded on first use

        // Initialize hardware security manager if enabled
        if (this.settings.hardwareSecurity?.enabled && HardwareSecurityManager.isSupported()) {
            this.hardwareSecurityManager = new HardwareSecurityManager(this.app, this.settings.hardwareSecurity);
        }

        // Add ribbon icon for single note encryption
        this.addRibbonIcon('lock', 'Encrypt/Decrypt Note', () => {
            this.handleEncryptDecrypt();
        });

        // Add ribbon icon for directory encryption
        this.addRibbonIcon('folder-lock', 'Encrypt Directory', () => {
            this.openDirectoryEncryptModal();
        });

        // Add commands
        this.addCommand({
            id: 'encrypt-note',
            name: 'Encrypt current note',
            editorCallback: (_editor, ctx) => {
                if ('getMode' in ctx) {
                    this.encryptNote(ctx as MarkdownView);
                }
            }
        });

        this.addCommand({
            id: 'decrypt-note',
            name: 'Decrypt current note',
            editorCallback: (_editor, ctx) => {
                if ('getMode' in ctx) {
                    this.decryptNote(ctx as MarkdownView);
                }
            }
        });

        this.addCommand({
            id: 'encrypt-decrypt-note',
            name: 'Encrypt/Decrypt current note',
            editorCallback: () => {
                this.handleEncryptDecrypt();
            }
        });

        // Add batch operations commands
        this.addCommand({
            id: 'batch-encrypt',
            name: 'Batch encrypt multiple notes',
            callback: () => {
                this.openBatchEncryptModal();
            }
        });

        this.addCommand({
            id: 'batch-decrypt',
            name: 'Batch decrypt multiple notes',
            callback: () => {
                this.openBatchDecryptModal();
            }
        });

        // Directory encryption commands
        this.addCommand({
            id: 'encrypt-directory',
            name: 'Encrypt entire directory',
            callback: () => {
                this.openDirectoryEncryptModal();
            }
        });

        this.addCommand({
            id: 'decrypt-directory',
            name: 'Decrypt entire directory',
            callback: () => {
                this.openDirectoryDecryptModal();
            }
        });

        this.addCommand({
            id: 'encrypt-directory-selective',
            name: 'Encrypt directory (selective)',
            callback: () => {
                this.openDirectorySelectionModal();
            }
        });

        // Hardware security commands
        if (HardwareSecurityManager.isSupported()) {
            this.addCommand({
                id: 'hardware-security-setup',
                name: 'Setup hardware security keys',
                callback: () => {
                    this.openHardwareSecuritySetup();
                }
            });

            this.addCommand({
                id: 'hardware-security-auth',
                name: 'Authenticate with hardware key',
                callback: () => {
                    this.authenticateWithHardwareKey();
                }
            });

            this.addCommand({
                id: 'hardware-security-status',
                name: 'Show hardware security status',
                callback: () => {
                    this.showHardwareSecurityStatus();
                }
            });
        }

        // Error recovery commands
        this.addCommand({
            id: 'error-recovery-diagnostics',
            name: 'Open error recovery diagnostics',
            callback: () => {
                this.openErrorRecoveryDiagnostics();
            }
        });

        this.addCommand({
            id: 'error-recovery-test',
            name: 'Test error recovery system',
            callback: () => {
                this.testErrorRecovery();
            }
        });

        // Post-quantum cryptography commands
        if (PostQuantumCryptoManager.isSupported()) {
            this.addCommand({
                id: 'post-quantum-setup',
                name: 'Setup post-quantum cryptography',
                callback: () => {
                    this.openPostQuantumSetup();
                }
            });

            this.addCommand({
                id: 'post-quantum-encrypt',
                name: 'Encrypt with quantum-resistant algorithm',
                callback: () => {
                    this.encryptWithPostQuantum();
                }
            });

            this.addCommand({
                id: 'post-quantum-generate-key',
                name: 'Generate post-quantum key pair',
                callback: () => {
                    this.generatePostQuantumKeyPair();
                }
            });

            this.addCommand({
                id: 'post-quantum-threat-assessment',
                name: 'Show quantum threat assessment',
                callback: () => {
                    this.showQuantumThreatAssessment();
                }
            });
        }

        // AI-powered features commands
        if (this.settings.aiSettings?.enabled) {
            this.addCommand({
                id: 'ai-assistant',
                name: 'Open AI Security Assistant',
                callback: () => {
                    this.openAIAssistant();
                }
            });

            this.addCommand({
                id: 'ai-generate-password',
                name: 'Generate AI-powered password',
                callback: () => {
                    this.openAIPasswordGenerator();
                }
            });

            this.addCommand({
                id: 'ai-analyze-content',
                name: 'Analyze current note with AI',
                callback: () => {
                    this.analyzeCurrentNoteWithAI();
                }
            });

            this.addCommand({
                id: 'ai-security-insights',
                name: 'Get AI security insights',
                callback: () => {
                    this.getAISecurityInsights();
                }
            });
        }

        // Add settings tab
        this.addSettingTab(new NoteEncryptorSettingTab(this.app, this));
    }

    // Input validation methods
    private validatePassword(password: string): { valid: boolean; reason?: string } {
        if (!password || password.length < this.settings.passwordMinLength) {
            return {
                valid: false,
                reason: `Password must be at least ${this.settings.passwordMinLength} characters`
            };
        }
        if (password.length > 1024) {
            return { valid: false, reason: 'Password too long (max 1024 characters)' };
        }
        if (this.settings.requireStrongPasswords && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            return {
                valid: false,
                reason: 'Password should contain uppercase, lowercase, and numbers'
            };
        }
        return { valid: true };
    }

    private calculatePasswordStrength(password: string): PasswordStrength {
        // Use centralized password utility
        return calcStrength(password);
    }

    private sanitizeFilePath(path: string): string {
        // Prevent path traversal attacks
        return path.replace(/\.\./g, '').replace(/[\\/]/g, '_');
    }

    private async validateFileSize(content: string): Promise<void> {
        const maxSizeBytes = this.settings.maxFileSize * 1024 * 1024;
        const size = new TextEncoder().encode(content).length;
        if (size > maxSizeBytes) {
            throw new ValidationError(`File too large for encryption (max ${this.settings.maxFileSize}MB)`);
        }
    }

    private async generateUniqueFileName(baseName: string, extension: string): Promise<string> {
        let counter = 1;
        let fileName = `${baseName}${extension}`;

        while (await this.app.vault.getAbstractFileByPath(fileName)) {
            fileName = `${baseName} (${counter})${extension}`;
            counter++;
        }

        return fileName;
    }

    // Loading state management
    private async withLoading<T>(
        operation: () => Promise<T>,
        loadingMessage: string
    ): Promise<T> {
        this.loadingNotice = new Notice(loadingMessage, 0); // 0 = persistent notice
        try {
            return await operation();
        } finally {
            if (this.loadingNotice) {
                this.loadingNotice.hide();
                this.loadingNotice = null;
            }
        }
    }

    // Confirmation dialog helper
    private async confirmOperation(
        title: string,
        message: string
    ): Promise<boolean> {
        return new Promise((resolve) => {
            new ConfirmModal(this.app, title, message, (confirmed) => {
                resolve(confirmed);
            }).open();
        });
    }

    async handleEncryptDecrypt() {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) {
            new Notice('No active note found');
            return;
        }

        try {
            const content = view.editor.getValue();
            await this.validateFileSize(content);

            if (this.isEncrypted(content)) {
                await this.decryptNote(view);
            } else {
                await this.encryptNote(view);
            }
        } catch (error) {
            this.handleError(error);
        }
    }

    isEncrypted(content: string): boolean {
        return content.startsWith('-----BEGIN ENCRYPTED NOTE-----');
    }

    async encryptNote(view: MarkdownView) {
        const content = view.editor.getValue();

        if (this.isEncrypted(content)) {
            new Notice('Note is already encrypted');
            return;
        }

        try {
            await this.validateFileSize(content);

            // Show confirmation dialog if enabled
            if (this.settings.confirmOnEncrypt) {
                const confirmed = await this.confirmOperation(
                    'Encrypt Note',
                    'Are you sure you want to encrypt this note? Make sure you remember the password as it cannot be recovered.'
                );
                if (!confirmed) return;
            }

            new EnhancedPasswordModal(this.app, true, this.settings, async (password: string) => {
                try {
                    const result = await this.withLoading(
                        () => enhancedEncryptionService.encrypt(content, password, {
                            useWasm: this.settings.enableWebAssembly,
                            performanceMode: this.settings.performanceMode
                        }),
                        'Encrypting note...'
                    );

                    if (!result.success) {
                        throw new EncryptionError(result.error || 'Encryption failed');
                    }

                    view.editor.setValue(result.encrypted);

                    // Update file name with prefix
                    const { file } = view;
                    if (file && !file.basename.startsWith(this.settings.encryptedNotePrefix)) {
                        const newBaseName = this.settings.encryptedNotePrefix + file.basename + this.settings.encryptedNoteSuffix;
                        const sanitizedName = this.sanitizeFilePath(newBaseName);
                        const uniqueName = await this.generateUniqueFileName(sanitizedName, '.md');
                        const newPath = file.parent ? `${file.parent.path}/${uniqueName}` : uniqueName;
                        await this.app.fileManager.renameFile(file, newPath);
                    }

                    new Notice('Note encrypted successfully');
                } catch (error) {
                    this.handleError(error);
                }
            }).open();
        } catch (error) {
            this.handleError(error);
        }
    }

    async decryptNote(view: MarkdownView) {
        const content = view.editor.getValue();

        if (!this.isEncrypted(content)) {
            new Notice('Note is not encrypted');
            return;
        }

        try {
            new EnhancedPasswordModal(this.app, false, this.settings, async (password: string) => {
                try {
                    const result = await this.withLoading(
                        () => enhancedEncryptionService.decrypt(content, password, {
                            useWasm: this.settings.enableWebAssembly,
                            allowFallback: true
                        }),
                        'Decrypting note...'
                    );

                    if (!result.success) {
                        throw new PasswordError(result.error || 'Decryption failed');
                    }

                    view.editor.setValue(result.decrypted);

                    // Remove prefix from file name
                    const { file } = view;
                    if (file && file.basename.startsWith(this.settings.encryptedNotePrefix)) {
                        let newBasename = file.basename.slice(this.settings.encryptedNotePrefix.length);
                        if (this.settings.encryptedNoteSuffix && newBasename.endsWith(this.settings.encryptedNoteSuffix)) {
                            newBasename = newBasename.slice(0, -this.settings.encryptedNoteSuffix.length);
                        }
                        const sanitizedName = this.sanitizeFilePath(newBasename);
                        const uniqueName = await this.generateUniqueFileName(sanitizedName, '.md');
                        const newPath = file.parent ? `${file.parent.path}/${uniqueName}` : uniqueName;
                        await this.app.fileManager.renameFile(file, newPath);
                    }

                    new Notice('Note decrypted successfully');
                } catch (error) {
                    this.handleError(error);
                }
            }).open();
        } catch (error) {
            this.handleError(error);
        }
    }

    // Centralized error handling
    private async handleError(error: any, context: any = {}): Promise<void> {
        try {
            // Use the advanced error recovery system
            const recoveryResult = await this.errorRecovery.handleError(
                error instanceof Error ? error : new Error(String(error)),
                {
                    operation: context.operation || 'unknown',
                    file: context.file?.path,
                    recoverable: context.recoverable !== false,
                    timestamp: new Date(),
                    ...context
                }
            );

            if (recoveryResult.success) {
                new Notice('Error recovered: ' + recoveryResult.message);

                // Handle different recovery actions
                switch (recoveryResult.nextAction) {
                    case 'retry':
                        if (context.retryAction) {
                            await context.retryAction(recoveryResult.data);
                        }
                        break;
                    case 'fallback':
                        if (context.fallbackAction) {
                            await context.fallbackAction(recoveryResult.data);
                        }
                        break;
                    case 'skip':
                        new Notice('Operation skipped due to error');
                        break;
                }
            } else {
                // Fallback to basic error handling
                this.showBasicError(error);
            }
        } catch (recoveryError) {
            // If error recovery itself fails, show basic error
            console.warn('Error recovery failed:', recoveryError);
            this.showBasicError(error);
        }
    }

    private showBasicError(error: any): void {
        if (error instanceof PasswordError) {
            new Notice('Password error: ' + error.message);
        } else if (error instanceof EncryptionError) {
            new Notice('Encryption error: ' + error.message);
            console.error('Encryption error:', error.cause);
        } else if (error instanceof ValidationError) {
            new Notice('Validation error: ' + error.message);
        } else {
            new Notice('Unexpected error occurred');
            console.error('Unexpected error:', error);
        }
    }

    // Batch operations methods
    openBatchEncryptModal(): void {
        new BatchOperationModal(this.app, 'encrypt').open();
    }

    openBatchDecryptModal(): void {
        new BatchOperationModal(this.app, 'decrypt').open();
    }

    // Directory Encryption Methods
    openDirectoryEncryptModal(): void {
        // First show directory selection, then encrypt
        new DirectorySelectionModal(
            this.app,
            (folderPath: string) => {
                new DirectoryEncryptionModal(
                    this.app,
                    folderPath,
                    this.settings.directoryEncryption
                ).open();
            }
        ).open();
    }

    openDirectoryDecryptModal(): void {
        // First show directory selection, then decrypt
        new DirectorySelectionModal(
            this.app,
            (folderPath: string) => {
                new DirectoryDecryptionModal(
                    this.app,
                    folderPath,
                    this.settings.directoryEncryption
                ).open();
            }
        ).open();
    }

    openDirectorySelectionModal(): void {
        new DirectorySelectionModal(
            this.app,
            async (folderPath: string) => {
                // Show encryption modal for the selected folder
                new DirectoryEncryptionModal(
                    this.app,
                    folderPath,
                    this.settings.directoryEncryption
                ).open();
            }
        ).open();
    }

    // Hardware Security Methods
    openHardwareSecuritySetup(): void {
        new HardwareSecuritySetupModal(
            this.app,
            this.settings.hardwareSecurity,
            (newSettings) => {
                this.settings.hardwareSecurity = newSettings;
                this.saveSettings();

                // Reinitialize hardware security manager if needed
                if (newSettings.enabled && HardwareSecurityManager.isSupported()) {
                    this.hardwareSecurityManager = new HardwareSecurityManager(this.app, newSettings);
                } else {
                    this.hardwareSecurityManager = null;
                }
            }
        ).open();
    }

    async authenticateWithHardwareKey(): Promise<void> {
        if (!this.hardwareSecurityManager) {
            new Notice('Hardware security is not enabled or supported');
            return;
        }

        const success = await this.hardwareSecurityManager.authenticate();
        if (success) {
            new Notice('Hardware authentication successful');
        } else {
            new Notice('Hardware authentication failed');
        }
    }

    showHardwareSecurityStatus(): void {
        if (!this.hardwareSecurityManager) {
            new Notice('Hardware security is not enabled');
            return;
        }

        // Status is retrieved by the StatusDisplay component
        const modal = new Modal(this.app);
        modal.contentEl.createEl('h2', { text: 'Hardware Security Status' });

        const statusDisplay = new SecurityStatusDisplay(modal.contentEl, this.hardwareSecurityManager);
        statusDisplay.update();

        const button = modal.contentEl.createEl('button', {
            text: 'Close',
            cls: 'mod-cta'
        });
        button.onclick = () => modal.close();
        button.style.marginTop = '20px';

        modal.open();
    }

    // Error Recovery Methods
    openErrorRecoveryDiagnostics(): void {
        new ErrorDiagnosticsModal(
            this.app,
            this.errorRecovery,
            this.settings.errorRecovery,
            (newSettings) => {
                this.settings.errorRecovery = newSettings;
                this.saveSettings();
                new Notice('Error recovery settings saved');
            }
        ).open();
    }

    async testErrorRecovery(): Promise<void> {
        try {
            const testError = new Error('This is a test error for validating the recovery system');
            const result = await this.errorRecovery.handleError(testError, {
                operation: 'test',
                recoverable: true,
                timestamp: new Date()
            });

            if (result.success) {
                new Notice('Error recovery test passed');
            } else {
                new Notice(`Error recovery test failed: ${result.message}`);
            }
        } catch (error) {
            const errorResult = await this.errorRecovery.handleError(
                error instanceof Error ? error : new Error(String(error)),
                {
                    operation: 'error-recovery-test',
                    recoverable: false
                }
            );

            if (!errorResult.success) {
                new Notice('Error recovery system encountered an issue during testing');
            }
        }
    }

    // Post-Quantum Cryptography Methods
    openPostQuantumSetup(): void {
        new PostQuantumSetupModal(
            this.app,
            this.settings.postQuantum,
            (newSettings) => {
                this.settings.postQuantum = newSettings;
                this.saveSettings();

                // Reinitialize post-quantum manager with new settings
                this._postQuantumManager = new PostQuantumCryptoManager(this.app, newSettings);
                new Notice('Post-quantum settings saved');
            }
        ).open();
    }

    async encryptWithPostQuantum(): Promise<void> {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            new Notice('No active note to encrypt');
            return;
        }

        const content = activeView.editor.getValue();
        if (this.isEncrypted(content)) {
            new Notice('Note is already encrypted');
            return;
        }

        new EnhancedPasswordModal(this.app, true, this.settings, async (password: string) => {
            const loadingNotice = new Notice('Encrypting with quantum-resistant algorithm...', 0);

            try {
                // Generate a temporary key pair for this encryption
                const keyPair = await this.postQuantumManager.generateKeyPair();

                const result = await this.postQuantumManager.hybridEncrypt(content, password, keyPair.publicKey);

                // Store the hybrid result with metadata
                activeView.editor.setValue(result.combined.ciphertext);

                // Update file name
                const { file } = activeView;
                if (file) {
                    const newBaseName = this.settings.encryptedNotePrefix + file.basename + ' [Post-Quantum]' + this.settings.encryptedNoteSuffix;
                    const sanitizedName = this.sanitizeFilePath(newBaseName);
                    const uniqueName = await this.generateUniqueFileName(sanitizedName, '.md');
                    const newPath = file.parent ? `${file.parent.path}/${uniqueName}` : uniqueName;
                    await this.app.fileManager.renameFile(file, newPath);
                }

                loadingNotice.hide();
                new Notice('Note encrypted with quantum-resistant algorithm successfully');

            } catch (error) {
                loadingNotice.hide();
                await this.handleError(error, {
                    operation: 'post-quantum-encrypt',
                    file: activeView.file?.path
                });
            }
        }).open();
    }

    async generatePostQuantumKeyPair(): Promise<void> {
        const loadingNotice = new Notice('Generating post-quantum key pair...', 0);

        try {
            const keyPair = await this.postQuantumManager.generateKeyPair();
            // Key ID could be stored for future reference: `pq_${Date.now()}`

            loadingNotice.hide();
            new Notice(`Post-quantum key pair generated: ${keyPair.algorithm}`);

        } catch (error) {
            loadingNotice.hide();
            await this.handleError(error, {
                operation: 'generate-pq-key'
            });
        }
    }

    showQuantumThreatAssessment(): void {
        const assessment = this.postQuantumManager.getThreatAssessment();

        const modal = new Modal(this.app);
        modal.contentEl.createEl('h2', { text: 'Quantum Computing Threat Assessment' });

        // Threat status
        const threatStatus = modal.contentEl.createDiv('threat-status');
        threatStatus.style.padding = '12px';
        threatStatus.style.borderRadius = '6px';
        threatStatus.style.marginBottom = '16px';

        const threatColors = {
            'none': 'var(--text-success)',
            'theoretical': 'var(--text-warning)',
            'practical': 'var(--text-error)'
        };

        threatStatus.style.backgroundColor = `var(--background-modifier-${assessment.currentThreat === 'practical' ? 'error' : assessment.currentThreat === 'theoretical' ? 'warning' : 'success'})`;
        threatStatus.createEl('h3', {
            text: `Current Threat Level: ${assessment.currentThreat.toUpperCase()}`,
            cls: 'threat-current'
        }).style.color = threatColors[assessment.currentThreat];

        // Time to break algorithms
        const breakSection = modal.contentEl.createDiv('break-times');
        breakSection.createEl('h3', { text: 'Estimated Time to Break with Quantum Computer' });

        const breakList = breakSection.createEl('ul');
        Object.entries(assessment.timeToBreak).forEach(([algo, time]) => {
            breakList.createEl('li', { text: `${algo}: ${time}` });
        });

        // Migration readiness
        const readinessSection = modal.contentEl.createDiv('migration-readiness');
        readinessSection.createEl('h3', { text: 'Migration Readiness' });

        const readinessBar = readinessSection.createDiv('readiness-bar');
        readinessBar.style.width = '100%';
        readinessBar.style.height = '20px';
        readinessBar.style.backgroundColor = 'var(--background-modifier-border)';
        readinessBar.style.borderRadius = '10px';
        readinessBar.style.overflow = 'hidden';

        const readinessFill = readinessBar.createDiv('readiness-fill');
        readinessFill.style.width = `${assessment.migrationReadiness}%`;
        readinessFill.style.height = '100%';
        readinessFill.style.backgroundColor = assessment.migrationReadiness >= 80 ? 'var(--text-success)' : assessment.migrationReadiness >= 60 ? 'var(--text-warning)' : 'var(--text-error)';

        readinessSection.createEl('p', {
            text: `Migration Readiness: ${assessment.migrationReadiness}%`,
            cls: 'readiness-text'
        });

        // Recommendations
        const recSection = modal.contentEl.createDiv('recommendations');
        recSection.createEl('h3', { text: 'Recommendations' });

        const recList = recSection.createEl('ul');
        assessment.recommendations.forEach(rec => {
            recList.createEl('li', { text: rec });
        });

        const button = modal.contentEl.createEl('button', {
            text: 'Close',
            cls: 'mod-cta'
        });
        button.onclick = () => modal.close();
        button.style.marginTop = '20px';

        modal.open();
    }

    // AI-Powered Features Methods
    openAIAssistant(): void {
        new AIAssistantModal(
            this.app,
            this.aiEngine,
            this.settings.aiSettings,
            (newSettings) => {
                this.settings.aiSettings = newSettings;
                this.saveSettings();

                // Reinitialize AI engine with new settings
                this._aiEngine = new AIAnalyzeEngine(this.app, newSettings);
                new Notice('AI settings saved');
            }
        ).open();
    }

    openAIPasswordGenerator(context: any = {}): void {
        new AIPasswordGeneratorModal(this.app, this.aiEngine, context).open();
    }

    async analyzeCurrentNoteWithAI(): Promise<void> {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            new Notice('No active note to analyze');
            return;
        }

        try {
            const content = activeView.editor.getValue();
            const filePath = activeView.file?.path;

            new Notice('AI analyzing content...', 0);
            const analysis = await this.aiEngine.analyzeContent(content, filePath);

            this.showContentAnalysisResults(analysis);

            // Learn from this analysis
            await this.aiEngine.learnFromBehavior('encrypt', {
                contentLength: content.length,
                timeOfDay: Date.now()
            });

        } catch (error) {
            new Notice('AI analysis failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    }

    async getAISecurityInsights(): Promise<void> {
        try {
            const insights = await this.aiEngine.getSecurityRecommendations({
                recentActivity: [], // Would gather from recent operations
                contentAnalysis: undefined,
                passwordAnalysis: undefined,
                userPatterns: [] // Would load from stored patterns
            });

            this.showAIInsightsModal(insights);
        } catch (error) {
            new Notice('Failed to get AI insights: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    }

    private showContentAnalysisResults(analysis: any): void {
        const modal = new Modal(this.app);
        modal.contentEl.createEl('h2', { text: 'AI Content Analysis' });

        // Sensitivity assessment
        const sensitivitySection = modal.contentEl.createDiv('sensitivity-section');
        const sensitivityBadge = sensitivitySection.createDiv('sensitivity-badge');
        sensitivityBadge.style.padding = '8px 16px';
        sensitivityBadge.style.borderRadius = '20px';
        sensitivityBadge.style.display = 'inline-block';
        sensitivityBadge.style.fontWeight = 'bold';
        sensitivityBadge.style.marginBottom = '16px';

        const colors = {
            'low': 'var(--text-success)',
            'medium': 'var(--text-warning)',
            'high': 'var(--text-error)',
            'critical': '#8B0000'
        };

        sensitivityBadge.style.backgroundColor = colors[analysis.sensitivity as keyof typeof colors];
        sensitivityBadge.style.color = 'white';
        sensitivityBadge.textContent = `${analysis.sensitivity.toUpperCase()} (${analysis.confidence}% confidence)`;

        // Recommendations
        if (analysis.recommendations.length > 0) {
            const recSection = modal.contentEl.createDiv('recommendations');
            recSection.createEl('h3', { text: 'AI Recommendations' });

            const recList = recSection.createEl('ul');
            analysis.recommendations.forEach((rec: string) => {
                recList.createEl('li', { text: rec });
            });
        }

        // Suggest encryption if needed
        if (analysis.shouldEncrypt) {
            const actionSection = modal.contentEl.createDiv('action-suggestion');
            actionSection.style.padding = '16px';
            actionSection.style.border = '1px solid var(--interactive-accent)';
            actionSection.style.borderRadius = '8px';
            actionSection.style.marginTop = '16px';

            actionSection.createEl('p', {
                text: '🔒 AI recommends encrypting this note for security.',
                cls: 'encryption-recommendation'
            }).style.fontWeight = 'bold';

            const encryptButton = actionSection.createEl('button', {
                text: 'Encrypt Now',
                cls: 'mod-cta'
            });
            encryptButton.onclick = () => {
                modal.close();
                this.handleEncryptDecrypt(); // Call existing encrypt method
            };
        }

        const button = modal.contentEl.createEl('button', {
            text: 'Close',
            cls: 'mod-cta'
        });
        button.onclick = () => modal.close();
        button.style.marginTop = '20px';

        modal.open();
    }

    private showAIInsightsModal(insights: string[]): void {
        const modal = new Modal(this.app);
        modal.contentEl.createEl('h2', { text: 'AI Security Insights' });

        const insightsSection = modal.contentEl.createDiv('insights-section');
        insightsSection.createEl('h3', { text: 'Personalized Security Recommendations' });

        if (insights.length === 0) {
            insightsSection.createEl('p', {
                text: 'AI is still learning your patterns. Continue using the plugin to receive personalized insights.',
                cls: 'learning-status'
            });
        } else {
            const insightsList = insightsSection.createEl('ul');
            insights.forEach(insight => {
                insightsList.createEl('li', { text: insight });
            });
        }

        const button = modal.contentEl.createEl('button', {
            text: 'Close',
            cls: 'mod-cta'
        });
        button.onclick = () => modal.close();
        button.style.marginTop = '20px';

        modal.open();
    }

    /**
     * Quick batch encrypt selected files
     */
    async quickBatchEncrypt(files?: TFile[]): Promise<void> {
        if (!files) {
            // If no files provided, show selection modal
            this.openBatchEncryptModal();
            return;
        }

        new BatchOperationModal(this.app, 'encrypt', files).open();
    }

    /**
     * Quick batch decrypt selected files
     */
    async quickBatchDecrypt(files?: TFile[]): Promise<void> {
        if (!files) {
            // If no files provided, show selection modal
            this.openBatchDecryptModal();
            return;
        }

        new BatchOperationModal(this.app, 'decrypt', files).open();
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

// Enhanced password modal with strength indicator and validation
class EnhancedPasswordModal extends Modal {
    password: string = '';
    onSubmit: (password: string) => void;
    isEncrypting: boolean;
    settings: NoteEncryptorSettings;
    strengthEl: HTMLElement | null = null;
    confirmInput: HTMLInputElement | null = null;
    plugin?: NoteEncryptorPlugin;

    constructor(app: App, isEncrypting: boolean, settings: NoteEncryptorSettings, onSubmit: (password: string) => void, plugin?: NoteEncryptorPlugin) {
        super(app);
        this.onSubmit = onSubmit;
        this.isEncrypting = isEncrypting;
        this.settings = settings;
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('password-modal');

        contentEl.createEl('h2', { text: this.isEncrypting ? 'Encrypt Note' : 'Decrypt Note' });

        new Setting(contentEl)
            .setName('Password')
            .setDesc(this.isEncrypting ? 'Enter a strong password to encrypt the note' : 'Enter the password to decrypt the note')
            .addText(text => text
                .setPlaceholder('Enter password')
                .onChange(value => {
                    this.password = value;
                    this.updatePasswordStrength(value);
                })
                .inputEl.setAttribute('type', 'password'));

        // Add password strength indicator for encryption
        if (this.isEncrypting && this.settings.showPasswordStrength) {
            this.strengthEl = contentEl.createDiv('password-strength-indicator');
            this.updatePasswordStrength('');
        }

        if (this.isEncrypting) {
            new Setting(contentEl)
                .setName('Confirm Password')
                .setDesc('Re-enter your password to confirm')
                .addText(text => {
                    text.setPlaceholder('Confirm password')
                        .inputEl.setAttribute('type', 'password');
                    this.confirmInput = text.inputEl;
                });

            this.createPasswordRequirements(contentEl);

            new Setting(contentEl)
                .addButton(btn => btn
                    .setButtonText('Encrypt')
                    .setCta()
                    .onClick(async () => {
                        await this.handleEncryptSubmit();
                    }));
        } else {
            new Setting(contentEl)
                .addButton(btn => btn
                    .setButtonText('Decrypt')
                    .setCta()
                    .onClick(async () => {
                        await this.handleDecryptSubmit();
                    }));
        }

        // Add some basic styling
        this.addModalStyles();
    }

    private createPasswordRequirements(containerEl: HTMLElement): void {
        const requirementsEl = containerEl.createDiv('password-requirements');
        requirementsEl.createEl('h4', { text: 'Password Requirements:' });

        const requirements = [
            `At least ${this.settings.passwordMinLength} characters`,
            this.settings.requireStrongPasswords ? 'Contains uppercase, lowercase, and numbers' : null,
            'Maximum 1024 characters'
        ].filter(Boolean);

        requirements.forEach(req => {
            if (req) {
                requirementsEl.createEl('div', {
                    text: `• ${req}`,
                    cls: 'requirement-item'
                });
            }
        });
    }

    private updatePasswordStrength(password: string): void {
        if (!this.strengthEl || !this.plugin) return;

        const strength = this.plugin['calculatePasswordStrength'](password);

        this.strengthEl.innerHTML = `
            <div class="strength-container">
                <div class="strength-label">Password Strength:</div>
                <div class="strength-bar">
                    <div class="strength-fill" style="width: ${strength.percentage}%; background-color: ${strength.color}"></div>
                </div>
                <div class="strength-text" style="color: ${strength.color}">${strength.text}</div>
            </div>
        `;
    }

    private async handleEncryptSubmit(): Promise<void> {
        try {
            if (!this.password) {
                new Notice('Please enter a password');
                return;
            }

            if (!this.confirmInput) {
                throw new Error('Confirm input not found');
            }

            if (this.password !== this.confirmInput.value) {
                new Notice('Passwords do not match');
                return;
            }

            // Validate password
            if (this.plugin) {
                const validation = this.plugin['validatePassword'](this.password);
                if (!validation.valid) {
                    new Notice(validation.reason || 'Invalid password');
                    return;
                }
            }

            this.close();
            this.onSubmit(this.password);
        } catch (error) {
            new Notice('Error validating password: ' + (error instanceof Error ? error.message : String(error)));
        }
    }

    private async handleDecryptSubmit(): Promise<void> {
        if (!this.password) {
            new Notice('Please enter a password');
            return;
        }

        this.close();
        this.onSubmit(this.password);
    }

    private addModalStyles(): void {
        const style = document.createElement('style');
        style.textContent = `
            .password-modal .password-strength-indicator {
                margin: 16px 0;
                padding: 12px;
                border: 1px solid var(--background-modifier-border);
                border-radius: 6px;
                background-color: var(--background-secondary);
            }

            .password-modal .strength-container {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .password-modal .strength-label {
                min-width: 120px;
                font-size: 14px;
                font-weight: 500;
            }

            .password-modal .strength-bar {
                flex: 1;
                height: 8px;
                background-color: var(--background-modifier-border);
                border-radius: 4px;
                overflow: hidden;
            }

            .password-modal .strength-fill {
                height: 100%;
                transition: width 0.3s ease, background-color 0.3s ease;
                border-radius: 4px;
            }

            .password-modal .strength-text {
                min-width: 80px;
                font-size: 12px;
                font-weight: 600;
                text-align: right;
            }

            .password-modal .password-requirements {
                margin: 16px 0;
                padding: 12px;
                background-color: var(--background-secondary-alt);
                border-radius: 6px;
                border-left: 3px solid var(--interactive-accent);
            }

            .password-modal .password-requirements h4 {
                margin: 0 0 8px 0;
                font-size: 14px;
                color: var(--text-normal);
            }

            .password-modal .requirement-item {
                font-size: 12px;
                color: var(--text-muted);
                margin: 4px 0;
            }

            .modal-button-container {
                display: flex;
                gap: 8px;
                justify-content: flex-end;
                margin-top: 16px;
            }

            .modal-button-container button {
                padding: 8px 16px;
                border-radius: 4px;
                border: 1px solid var(--background-modifier-border);
                background-color: var(--interactive-normal);
                color: var(--text-normal);
                cursor: pointer;
            }

            .modal-button-container button:hover {
                background-color: var(--interactive-hover);
            }

            .modal-button-container button.mod-cta {
                background-color: var(--interactive-accent);
                color: var(--text-on-accent);
                border-color: var(--interactive-accent);
            }
        `;
        document.head.appendChild(style);
    }

    onClose() {
        // Security: Clear password from memory
        this.password = '';
        if (this.confirmInput) {
            this.confirmInput.value = '';
        }
        
        const { contentEl } = this;
        contentEl.empty();
    }
}

class NoteEncryptorSettingTab extends PluginSettingTab {
    plugin: NoteEncryptorPlugin;

    constructor(app: App, plugin: NoteEncryptorPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Note Encryptor Settings' });

        // File Naming Settings
        containerEl.createEl('h3', { text: 'File Naming' });

        new Setting(containerEl)
            .setName('Encrypted note prefix')
            .setDesc('Prefix to add to encrypted note filenames (e.g., 🔒 or [ENCRYPTED])')
            .addText(text => text
                .setPlaceholder('🔒 ')
                .setValue(this.plugin.settings.encryptedNotePrefix)
                .onChange(async (value) => {
                    this.plugin.settings.encryptedNotePrefix = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Encrypted note suffix')
            .setDesc('Suffix to add to encrypted note filenames (optional)')
            .addText(text => text
                .setPlaceholder('')
                .setValue(this.plugin.settings.encryptedNoteSuffix)
                .onChange(async (value) => {
                    this.plugin.settings.encryptedNoteSuffix = value;
                    await this.plugin.saveSettings();
                }));

        // Security Settings
        containerEl.createEl('h3', { text: 'Security Settings' });

        new Setting(containerEl)
            .setName('Require strong passwords')
            .setDesc('Enforce password complexity requirements (uppercase, lowercase, and numbers)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.requireStrongPasswords)
                .onChange(async (value) => {
                    this.plugin.settings.requireStrongPasswords = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Minimum password length')
            .setDesc('Minimum number of characters required for passwords')
            .addSlider(slider => slider
                .setLimits(4, 32, 1)
                .setValue(this.plugin.settings.passwordMinLength)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.passwordMinLength = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Maximum file size')
            .setDesc('Maximum file size for encryption (in MB)')
            .addSlider(slider => slider
                .setLimits(1, 50, 1)
                .setValue(this.plugin.settings.maxFileSize)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.maxFileSize = value;
                    await this.plugin.saveSettings();
                }));

        // User Experience Settings
        containerEl.createEl('h3', { text: 'User Experience' });

        new Setting(containerEl)
            .setName('Show password strength indicator')
            .setDesc('Display a visual indicator showing password strength during encryption')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showPasswordStrength)
                .onChange(async (value) => {
                    this.plugin.settings.showPasswordStrength = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Confirm before encryption')
            .setDesc('Show a confirmation dialog before encrypting notes')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.confirmOnEncrypt)
                .onChange(async (value) => {
                    this.plugin.settings.confirmOnEncrypt = value;
                    await this.plugin.saveSettings();
                }));

        // Advanced Features Settings
        containerEl.createEl('h3', { text: 'Advanced Features (v2.1.0)' });

        new Setting(containerEl)
            .setName('Enable WebAssembly acceleration')
            .setDesc('Use WebAssembly for faster encryption/decryption (300-500% improvement for large files)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableWebAssembly)
                .onChange(async (value) => {
                    this.plugin.settings.enableWebAssembly = value;
                    await this.plugin.saveSettings();
                }));

        const capabilities = enhancedEncryptionService.getSystemCapabilities();
        new Setting(containerEl)
            .setName('WebAssembly Status')
            .setDesc(`Supported: ${capabilities.wasmSupported}, Initialized: ${capabilities.wasmInitialized}`)
            .addText(text => text
                .setPlaceholder(capabilities.wasmInitialized ? 'Ready' : 'Not Available')
                .setValue(capabilities.wasmInitialized ? 'Ready' : 'Not Available')
                .setDisabled(true));

        new Setting(containerEl)
            .setName('Performance mode')
            .setDesc('Optimize for speed over memory usage')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.performanceMode)
                .onChange(async (value) => {
                    this.plugin.settings.performanceMode = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Show performance metrics')
            .setDesc('Display encryption/decryption timing and performance data')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showPerformanceMetrics)
                .onChange(async (value) => {
                    this.plugin.settings.showPerformanceMetrics = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Enable advanced features')
            .setDesc('Enable experimental and advanced encryption features')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableAdvancedFeatures)
                .onChange(async (value) => {
                    this.plugin.settings.enableAdvancedFeatures = value;
                    await this.plugin.saveSettings();
                }));

        if (this.plugin.settings.showPerformanceMetrics) {
            const metrics = enhancedEncryptionService.getMetrics();
            const metricsEl = containerEl.createDiv('performance-metrics');
            metricsEl.createEl('h4', { text: 'Performance Metrics' });

            const metricsInfo = metricsEl.createDiv('metrics-info');
            metricsInfo.createEl('div', { text: `Last Encryption: ${metrics.encryptionMetrics.lastEncryption?.toFixed(2) || 'N/A'}ms` });
            metricsInfo.createEl('div', { text: `WASM Used: ${metrics.encryptionMetrics.wasmUsed ? 'Yes' : 'No'}` });

            // Add benchmark button
            new Setting(containerEl)
                .setName('Run Performance Benchmark')
                .setDesc('Test WASM vs JavaScript performance')
                .addButton(button => button
                    .setButtonText('Run Benchmark')
                    .onClick(async () => {
                        const { buttonEl } = button;
                        buttonEl.textContent = 'Running...';
                        buttonEl.disabled = true;

                        try {
                            const benchmark = await enhancedEncryptionService.benchmarkPerformance(1024 * 1024); // 1MB
                            new Notice(`Benchmark complete: ${benchmark.improvement.toFixed(1)}% improvement with WASM`);
                        } catch (error) {
                            new Notice('Benchmark failed: ' + (error instanceof Error ? error.message : String(error)));
                        } finally {
                            buttonEl.textContent = 'Run Benchmark';
                            buttonEl.disabled = false;
                        }
                    }));
        }

        // Hardware Security Settings
        containerEl.createEl('h3', { text: 'Hardware Security' });

        if (HardwareSecurityManager.isSupported()) {
            containerEl.createEl('p', {
                text: 'Your device supports hardware security keys (WebAuthn/FIDO2) for enhanced authentication.',
                cls: 'support-info'
            });

            new Setting(containerEl)
                .setName('Enable hardware security')
                .setDesc('Use hardware security keys for enhanced authentication of encrypted notes')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.hardwareSecurity?.enabled ?? false)
                    .onChange(async (value) => {
                        this.plugin.settings.hardwareSecurity.enabled = value;
                        await this.plugin.saveSettings();
                        this.display(); // Refresh to show/hide additional options
                    }));

            if (this.plugin.settings.hardwareSecurity?.enabled) {
                // Hardware security setup button
                const hardwareSection = containerEl.createDiv('hardware-security-section');

                new Setting(hardwareSection)
                    .setName('Setup security keys')
                    .setDesc('Register and manage your hardware security keys')
                    .addButton(button => button
                        .setButtonText('Configure Hardware Security')
                        .setCta()
                        .onClick(() => {
                            this.plugin.openHardwareSecuritySetup();
                        }));

                // Show current status
                if (this.plugin.hardwareSecurityManager) {
                    const statusDisplay = new SecurityStatusDisplay(
                        hardwareSection.createDiv('status-container'),
                        this.plugin.hardwareSecurityManager
                    );
                    statusDisplay.update();
                }
            }
        } else {
            containerEl.createEl('p', {
                text: 'Hardware security keys are not supported on this device. Please use a modern browser with WebAuthn support (Chrome, Firefox, Safari, Edge).',
                cls: 'unsupported-info'
            });
        }

        // Error Recovery Settings
        containerEl.createEl('h3', { text: 'Error Recovery' });

        const recoveryStatus = containerEl.createDiv('recovery-status');
        const statusDisplay = new ErrorRecoveryStatusDisplay(recoveryStatus, this.plugin.errorRecovery);
        statusDisplay.update();

        new Setting(containerEl)
            .setName('Open error diagnostics')
            .setDesc('View error statistics, manage recovery settings, and export error reports')
            .addButton(button => button
                .setButtonText('Open Diagnostics')
                .setCta()
                .onClick(() => {
                    this.plugin.openErrorRecoveryDiagnostics();
                }));

        new Setting(containerEl)
            .setName('Test error recovery')
            .setDesc('Test the error recovery system with a simulated error')
            .addButton(button => button
                .setButtonText('Test System')
                .onClick(() => {
                    this.plugin.testErrorRecovery();
                }));

        // Post-Quantum Cryptography Settings
        containerEl.createEl('h3', { text: 'Post-Quantum Cryptography' });

        if (PostQuantumCryptoManager.isSupported()) {
            containerEl.createEl('p', {
                text: 'Your device supports post-quantum cryptography for future-proofing against quantum computing threats.',
                cls: 'support-info'
            });

            // Post-quantum status
            const pqStatus = containerEl.createDiv('pq-status');
            const statusDisplay = new PostQuantumStatusDisplay(pqStatus, this.plugin.postQuantumManager);
            statusDisplay.update();

            // Settings
            new Setting(containerEl)
                .setName('Enable post-quantum cryptography')
                .setDesc('Use quantum-resistant algorithms for enhanced future security')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.postQuantum?.enablePostQuantum ?? false)
                    .onChange(async (value) => {
                        this.plugin.settings.postQuantum.enablePostQuantum = value;
                        await this.plugin.saveSettings();
                        this.display(); // Refresh to show/hide additional options
                    }));

            if (this.plugin.settings.postQuantum?.enablePostQuantum) {
                // Post-quantum setup button
                const pqSection = containerEl.createDiv('post-quantum-section');

                new Setting(pqSection)
                    .setName('Configure post-quantum settings')
                    .setDesc('Set up quantum-resistant algorithms and key management')
                    .addButton(button => button
                        .setButtonText('Post-Quantum Setup')
                        .setCta()
                        .onClick(() => {
                            this.plugin.openPostQuantumSetup();
                        }));

                // Quick actions
                const actionsSection = pqSection.createDiv('quick-actions');
                actionsSection.createEl('h4', { text: 'Quick Actions' });

                const actionsGrid = actionsSection.createDiv('actions-grid');
                actionsGrid.style.display = 'grid';
                actionsGrid.style.gridTemplateColumns = '1fr 1fr';
                actionsGrid.style.gap = '8px';

                const encryptButton = actionsGrid.createEl('button', {
                    text: 'Quantum Encrypt Current',
                    cls: 'mod-cta'
                });
                encryptButton.onclick = () => {
                    this.plugin.encryptWithPostQuantum();
                };

                const keyGenButton = actionsGrid.createEl('button', {
                    text: 'Generate PQ Keys',
                    cls: ''
                });
                keyGenButton.onclick = () => {
                    this.plugin.generatePostQuantumKeyPair();
                };

                const threatButton = actionsGrid.createEl('button', {
                    text: 'Threat Assessment',
                    cls: ''
                });
                threatButton.onclick = () => {
                    this.plugin.showQuantumThreatAssessment();
                };

                const threatStatus = actionsGrid.createEl('div');
                threatStatus.textContent = 'Quantum Ready: ' + (
                    this.plugin.settings.postQuantum.quantumReadiness ? 'Yes' : 'No'
                );
                threatStatus.style.textAlign = 'center';
                threatStatus.style.padding = '8px';
                threatStatus.style.border = '1px solid var(--background-modifier-border)';
                threatStatus.style.borderRadius = '4px';
                threatStatus.style.backgroundColor = this.plugin.settings.postQuantum.quantumReadiness ?
                    'var(--background-modifier-success)' : 'var(--background-modifier-warning)';
            }
        } else {
            containerEl.createEl('p', {
                text: 'Post-quantum cryptography requires a modern browser with WebAssembly and BigInt support. Please update your browser to access quantum-resistant encryption features.',
                cls: 'unsupported-info'
            });
        }

        // AI-Powered Features Settings
        containerEl.createEl('h3', { text: 'AI-Powered Security Features' });

        // AI status and controls
        const aiStatus = containerEl.createDiv('ai-status');
        aiStatus.createEl('h4', { text: 'AI Security Assistant Status' });

        const statusText = this.plugin.settings.aiSettings?.enabled ? '🟢 AI features enabled' : '🔴 AI features disabled';
        aiStatus.createEl('p', {
            text: statusText,
            cls: this.plugin.settings.aiSettings?.enabled ? 'ai-status-enabled' : 'ai-status-disabled'
        });

        // AI Assistant button
        new Setting(containerEl)
            .setName('Open AI Security Assistant')
            .setDesc('Configure AI-powered security features and analysis tools')
            .addButton(button => button
                .setButtonText('AI Assistant')
                .setCta()
                .onClick(() => {
                    this.plugin.openAIAssistant();
                }));

        // AI Password Generator
        new Setting(containerEl)
            .setName('AI Password Generator')
            .setDesc('Generate intelligent passwords based on content analysis')
            .addButton(button => button
                .setButtonText('Generate AI Password')
                .onClick(() => {
                    this.plugin.openAIPasswordGenerator();
                }));

        // Content Analysis
        new Setting(containerEl)
            .setName('Analyze Current Note')
            .setDesc('Use AI to analyze the current note for sensitive information')
            .addButton(button => button
                .setButtonText('Analyze with AI')
                .onClick(() => {
                    this.plugin.analyzeCurrentNoteWithAI();
                }));

        // Privacy and Learning settings
        if (this.plugin.settings.aiSettings?.enabled) {
            const privacySection = containerEl.createDiv('ai-privacy-settings');
            privacySection.createEl('h4', { text: 'Privacy & Learning Settings' });

            new Setting(containerEl)
                .setName('Privacy mode')
                .setDesc('Disable all AI analysis for maximum privacy')
                .addToggle((toggle: any) => toggle
                    .setValue(this.plugin.settings.aiSettings?.privacyMode ?? false)
                    .onChange(async (value: any) => {
                        this.plugin.settings.aiSettings.privacyMode = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Learning mode')
                .setDesc('Allow AI to learn from your security patterns for better recommendations')
                .addToggle((toggle: any) => toggle
                    .setValue(this.plugin.settings.aiSettings?.learningMode ?? true)
                    .onChange(async (value: any) => {
                        this.plugin.settings.aiSettings.learningMode = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Breach protection')
                .setDesc('Check passwords against known data breaches')
                .addToggle((toggle: any) => toggle
                    .setValue(this.plugin.settings.aiSettings?.breachProtection ?? true)
                    .onChange(async (value: any) => {
                        this.plugin.settings.aiSettings.breachProtection = value;
                        await this.plugin.saveSettings();
                    }));

            // AI Insights button
            new Setting(containerEl)
                .setName('Get AI security insights')
                .setDesc('View personalized security recommendations based on your usage patterns')
                .addButton((button: any) => button
                    .setButtonText('View Insights')
                    .onClick(() => {
                        this.plugin.getAISecurityInsights();
                    }));
        }

        // Security Information
        containerEl.createEl('h3', { text: 'Security Information' });

        const securityInfo = containerEl.createDiv('security-info');
        securityInfo.createEl('p', {
            text: 'This plugin uses AES-256-GCM encryption with PBKDF2 key derivation (310,000 iterations). Your password is never stored and cannot be recovered if lost.'
        });

        securityInfo.createEl('p', {
            cls: 'warning-text',
            text: '⚠️ Important: Make sure to remember your passwords. There is no way to recover an encrypted note without the correct password.'
        });

        securityInfo.createEl('h4', { text: 'Encryption Details:' });
        const encryptionDetails = securityInfo.createDiv('encryption-details');
        encryptionDetails.createEl('div', { text: '• Algorithm: AES-256-GCM (Galois/Counter Mode)' });
        encryptionDetails.createEl('div', { text: '• Key Derivation: PBKDF2 with SHA-256' });
        encryptionDetails.createEl('div', { text: '• Iterations: 310,000' });
        encryptionDetails.createEl('div', { text: '• Salt: 256-bit random salt per encryption' });
        encryptionDetails.createEl('div', { text: '• IV: 96-bit random initialization vector per encryption' });

        // Directory Encryption Settings
        containerEl.createEl('h2', { text: 'Directory Encryption' });

        new Setting(containerEl)
            .setName('Include subdirectories')
            .setDesc('Encrypt files in subdirectories when encrypting a directory')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.directoryEncryption.includeSubdirectories)
                .onChange(async (value) => {
                    this.plugin.settings.directoryEncryption.includeSubdirectories = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Skip already encrypted')
            .setDesc('Skip files that are already encrypted when batch encrypting')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.directoryEncryption.skipEncryptedFiles)
                .onChange(async (value) => {
                    this.plugin.settings.directoryEncryption.skipEncryptedFiles = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Create manifest file')
            .setDesc('Create a manifest file tracking encrypted files in the directory')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.directoryEncryption.createManifest)
                .onChange(async (value) => {
                    this.plugin.settings.directoryEncryption.createManifest = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Parallel operations')
            .setDesc('Number of files to encrypt/decrypt in parallel (1-10)')
            .addSlider(slider => slider
                .setLimits(1, 10, 1)
                .setValue(this.plugin.settings.directoryEncryption.parallelOperations)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.directoryEncryption.parallelOperations = value;
                    await this.plugin.saveSettings();
                }));

        // Add some basic styling
        this.addSettingsStyles(containerEl);
    }

    private addSettingsStyles(_containerEl: HTMLElement): void {
        const existingStyle = document.getElementById('note-encryptor-settings-styles');
        if (existingStyle) return;

        const style = document.createElement('style');
        style.id = 'note-encryptor-settings-styles';
        style.textContent = `
            .security-info {
                margin: 16px 0;
                padding: 16px;
                border: 1px solid var(--background-modifier-border);
                border-radius: 8px;
                background-color: var(--background-secondary);
            }

            .security-info p {
                margin: 8px 0;
                line-height: 1.5;
            }

            .security-info .warning-text {
                color: var(--text-warning);
                font-weight: 500;
                border-left: 3px solid var(--text-warning);
                padding-left: 12px;
            }

            .security-info h4 {
                margin: 16px 0 8px 0;
                color: var(--text-normal);
                font-size: 16px;
            }

            .encryption-details {
                margin-left: 12px;
            }

            .encryption-details div {
                margin: 4px 0;
                font-size: 13px;
                color: var(--text-muted);
                font-family: var(--font-monospace);
            }

            .setting-item-info {
                color: var(--text-muted);
                font-size: 12px;
                margin-top: 4px;
            }
        `;
        document.head.appendChild(style);
    }
}
