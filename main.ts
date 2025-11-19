import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { enhancedEncryptionService, EnhancedEncryptionResult, EnhancedDecryptionResult } from './src/typescript/enhanced-encryption';
import { BatchOperationsManager } from './src/typescript/batch-operations';
import { BatchOperationModal } from './src/typescript/batch-ui';

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
    enableAdvancedFeatures: false
}


// Confirmation modal for sensitive operations
class ConfirmModal extends Modal {
    result: boolean = false;
    onSubmit: (confirmed: boolean) => void;

    constructor(app: App, title: string, message: string, onSubmit: (confirmed: boolean) => void) {
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
    settings: NoteEncryptorSettings;
    private loadingNotice: Notice | null = null;
    private batchManager: BatchOperationsManager;

    async onload() {
        await this.loadSettings();

        // Initialize batch manager
        this.batchManager = new BatchOperationsManager(this.app);

        // Add ribbon icon
        this.addRibbonIcon('lock', 'Encrypt/Decrypt Note', () => {
            this.handleEncryptDecrypt();
        });

        // Add commands
        this.addCommand({
            id: 'encrypt-note',
            name: 'Encrypt current note',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.encryptNote(view);
            }
        });

        this.addCommand({
            id: 'decrypt-note',
            name: 'Decrypt current note',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                this.decryptNote(view);
            }
        });

        this.addCommand({
            id: 'encrypt-decrypt-note',
            name: 'Encrypt/Decrypt current note',
            editorCallback: (editor: Editor, view: MarkdownView) => {
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
        if (this.settings.requireStrongPasswords) {
            if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
                return {
                    valid: false,
                    reason: 'Password should contain uppercase, lowercase, and numbers'
                };
            }
        }
        return { valid: true };
    }

    private calculatePasswordStrength(password: string): PasswordStrength {
        if (!password) return { score: 0, percentage: 0, text: 'Very Weak', color: '#ff4444' };

        let score = 0;
        let feedback = [];

        // Length
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;

        // Complexity
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^a-zA-Z\d]/.test(password)) score++;

        // Strength mapping
        const strengthLevels = [
            { score: 0, text: 'Very Weak', color: '#ff4444' },
            { score: 1, text: 'Weak', color: '#ff8800' },
            { score: 2, text: 'Fair', color: '#ffcc00' },
            { score: 3, text: 'Good', color: '#88cc00' },
            { score: 4, text: 'Strong', color: '#00cc88' },
            { score: 5, text: 'Very Strong', color: '#0088ff' }
        ];

        const strength = strengthLevels[Math.min(score, 5)];
        return {
            score: strength.score,
            percentage: (strength.score / 5) * 100,
            text: strength.text,
            color: strength.color
        };
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
            const result = await operation();
            return result;
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
                    const file = view.file;
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
                    const file = view.file;
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
    private handleError(error: any): void {
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
    password: string;
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
            new Notice('Error validating password: ' + error.message);
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
                        const buttonEl = button.buttonEl;
                        buttonEl.textContent = 'Running...';
                        buttonEl.disabled = true;

                        try {
                            const benchmark = await enhancedEncryptionService.benchmarkPerformance(1024 * 1024); // 1MB
                            new Notice(`Benchmark complete: ${benchmark.improvement.toFixed(1)}% improvement with WASM`);
                        } catch (error) {
                            new Notice('Benchmark failed: ' + error.message);
                        } finally {
                            buttonEl.textContent = 'Run Benchmark';
                            buttonEl.disabled = false;
                        }
                    }));
        }

        // Security Information
        containerEl.createEl('h3', { text: 'Security Information' });

        const securityInfo = containerEl.createDiv('security-info');
        securityInfo.createEl('p', {
            text: 'This plugin uses AES-256-GCM encryption with PBKDF2 key derivation (100,000 iterations). Your password is never stored and cannot be recovered if lost.'
        });

        securityInfo.createEl('p', {
            cls: 'warning-text',
            text: '⚠️ Important: Make sure to remember your passwords. There is no way to recover an encrypted note without the correct password.'
        });

        securityInfo.createEl('h4', { text: 'Encryption Details:' });
        const encryptionDetails = securityInfo.createDiv('encryption-details');
        encryptionDetails.createEl('div', { text: '• Algorithm: AES-256-GCM (Galois/Counter Mode)' });
        encryptionDetails.createEl('div', { text: '• Key Derivation: PBKDF2 with SHA-256' });
        encryptionDetails.createEl('div', { text: '• Iterations: 100,000' });
        encryptionDetails.createEl('div', { text: '• Salt: 128-bit random salt per encryption' });
        encryptionDetails.createEl('div', { text: '• IV: 96-bit random initialization vector per encryption' });

        // Add some basic styling
        this.addSettingsStyles(containerEl);
    }

    private addSettingsStyles(containerEl: HTMLElement): void {
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
