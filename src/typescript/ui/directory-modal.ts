/**
 * Directory Encryption UI
 * Modals and UI components for directory encryption operations
 */

import { App, Modal, Setting, Notice, TFolder } from 'obsidian';
import {
    DirectoryEncryptionManager,
    DirectoryEncryptionSettings,
    DirectoryOperationProgress,
    DirectoryOperationResult,
    DEFAULT_DIRECTORY_SETTINGS
} from '../features/directory-encryption';
import { getAllFolders, formatBytes } from '../utils/file-utils';
import { injectDirectoryModalStyles } from './style-manager';

/**
 * Directory Selection Modal
 */
export class DirectorySelectionModal extends Modal {
    private onSelect: (folderPath: string) => void;
    private selectedFolder: string | null = null;

    constructor(app: App, onSelect: (folderPath: string) => void) {
        super(app);
        this.onSelect = onSelect;
    }

    onOpen(): void {
        injectDirectoryModalStyles();

        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('directory-modal');

        contentEl.createEl('h2', { text: 'Select Directory' });
        contentEl.createEl('p', {
            text: 'Choose a directory to encrypt or decrypt all notes within.',
            cls: 'setting-item-description'
        });

        // Folder list
        const folderListEl = contentEl.createDiv('folder-list');
        const folders = getAllFolders(this.app);

        for (const folder of folders) {
            const folderItem = folderListEl.createDiv('folder-item');
            folderItem.createSpan({ text: '📁', cls: 'folder-icon' });
            folderItem.createSpan({ text: folder.path || '/' });

            folderItem.addEventListener('click', () => {
                // Remove selection from all items
                folderListEl.querySelectorAll('.folder-item').forEach(el => {
                    el.removeClass('selected');
                });
                folderItem.addClass('selected');
                this.selectedFolder = folder.path;
            });
        }

        // Buttons
        const buttonContainer = contentEl.createDiv('modal-button-container');

        buttonContainer.createEl('button', { text: 'Cancel' })
            .addEventListener('click', () => this.close());

        const selectButton = buttonContainer.createEl('button', {
            text: 'Select',
            cls: 'mod-cta'
        });
        selectButton.addEventListener('click', () => {
            if (this.selectedFolder !== null) {
                this.onSelect(this.selectedFolder);
                this.close();
            } else {
                new Notice('Please select a directory');
            }
        });
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * Directory Encryption Modal
 */
export class DirectoryEncryptionModal extends Modal {
    private folderPath: string;
    private manager: DirectoryEncryptionManager;
    private settings: DirectoryEncryptionSettings;
    private password: string = '';
    private confirmPassword: string = '';
    private isProcessing: boolean = false;

    constructor(
        app: App,
        folderPath: string,
        settings: Partial<DirectoryEncryptionSettings> = {}
    ) {
        super(app);
        this.folderPath = folderPath;
        this.settings = { ...DEFAULT_DIRECTORY_SETTINGS, ...settings };
        this.manager = new DirectoryEncryptionManager(app, this.settings);
    }

    async onOpen(): Promise<void> {
        injectDirectoryModalStyles();

        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('directory-modal');

        contentEl.createEl('h2', { text: 'Encrypt Directory' });
        contentEl.createEl('p', { text: `Directory: ${this.folderPath || 'Root'}` });

        // Get preview
        const preview = await this.manager.getEncryptionPreview(this.folderPath);

        // Preview section
        const previewEl = contentEl.createDiv('summary-section');
        previewEl.createEl('h4', { text: 'Preview' });

        const previewRows = [
            { label: 'Files to encrypt', value: preview.filesToEncrypt.length.toString() },
            { label: 'Already encrypted', value: preview.alreadyEncrypted.length.toString(), cls: 'skipped' },
            { label: 'Total size', value: formatBytes(preview.totalSize) },
            { label: 'Estimated time', value: `~${Math.ceil(preview.estimatedTime / 1000)}s` }
        ];

        for (const row of previewRows) {
            const rowEl = previewEl.createDiv('summary-row');
            if (row.cls) rowEl.addClass(row.cls);
            rowEl.createSpan({ text: row.label });
            rowEl.createSpan({ text: row.value });
        }

        if (preview.filesToEncrypt.length === 0) {
            contentEl.createEl('p', {
                text: '⚠️ No files to encrypt in this directory.',
                cls: 'setting-item-description'
            });

            const buttonContainer = contentEl.createDiv('modal-button-container');
            buttonContainer.createEl('button', { text: 'Close', cls: 'mod-cta' })
                .addEventListener('click', () => this.close());
            return;
        }

        // Password input
        new Setting(contentEl)
            .setName('Password')
            .setDesc('Enter a strong password for encryption')
            .addText(text => {
                text.setPlaceholder('Enter password')
                    .inputEl.setAttribute('type', 'password');
                text.onChange(value => this.password = value);
            });

        new Setting(contentEl)
            .setName('Confirm Password')
            .addText(text => {
                text.setPlaceholder('Confirm password')
                    .inputEl.setAttribute('type', 'password');
                text.onChange(value => this.confirmPassword = value);
            });

        // Options
        new Setting(contentEl)
            .setName('Include subdirectories')
            .addToggle(toggle => toggle
                .setValue(this.settings.includeSubdirectories)
                .onChange(value => this.settings.includeSubdirectories = value));

        new Setting(contentEl)
            .setName('Skip already encrypted')
            .addToggle(toggle => toggle
                .setValue(this.settings.skipEncryptedFiles)
                .onChange(value => this.settings.skipEncryptedFiles = value));

        // Progress container (hidden initially)
        const progressContainer = contentEl.createDiv('progress-container');
        progressContainer.style.display = 'none';

        const progressBar = progressContainer.createDiv('progress-bar');
        const progressFill = progressBar.createDiv('progress-fill');
        const progressText = progressContainer.createDiv('progress-text');

        // Buttons
        const buttonContainer = contentEl.createDiv('modal-button-container');

        const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
        cancelButton.addEventListener('click', () => {
            if (this.isProcessing) {
                this.manager.abort();
            }
            this.close();
        });

        const encryptButton = buttonContainer.createEl('button', {
            text: 'Encrypt All',
            cls: 'mod-cta'
        });

        encryptButton.addEventListener('click', async () => {
            if (!this.password) {
                new Notice('Please enter a password');
                return;
            }

            if (this.password !== this.confirmPassword) {
                new Notice('Passwords do not match');
                return;
            }

            if (this.password.length < 8) {
                new Notice('Password must be at least 8 characters');
                return;
            }

            this.isProcessing = true;
            encryptButton.disabled = true;
            encryptButton.textContent = 'Encrypting...';
            progressContainer.style.display = 'block';

            this.manager.updateSettings(this.settings);

            const result = await this.manager.encryptDirectory(
                this.folderPath,
                this.password,
                (progress) => {
                    progressFill.style.width = `${progress.percentage}%`;
                    progressText.textContent = `${progress.processedFiles}/${progress.totalFiles} files processed`;
                }
            );

            this.isProcessing = false;
            this.showResult(result, 'encryption');
        });
    }

    private showResult(result: DirectoryOperationResult, operation: string): void {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: result.success ? '✅ Success' : '⚠️ Completed with errors' });

        const summaryEl = contentEl.createDiv('summary-section');

        const rows = [
            { label: 'Total files', value: result.totalFiles.toString() },
            { label: 'Successful', value: result.successCount.toString(), cls: 'success' },
            { label: 'Failed', value: result.failedCount.toString(), cls: result.failedCount > 0 ? 'error' : '' },
            { label: 'Skipped', value: result.skippedCount.toString(), cls: 'skipped' },
            { label: 'Duration', value: `${(result.duration / 1000).toFixed(2)}s` }
        ];

        for (const row of rows) {
            const rowEl = summaryEl.createDiv('summary-row');
            if (row.cls) rowEl.addClass(row.cls);
            rowEl.createSpan({ text: row.label });
            rowEl.createSpan({ text: row.value });
        }

        // Show failed files if any
        if (result.failedCount > 0) {
            const failedEl = contentEl.createDiv();
            failedEl.createEl('h4', { text: 'Failed files:' });
            const failedList = failedEl.createEl('ul');

            result.results
                .filter(r => !r.success && !r.skipped)
                .slice(0, 10) // Show max 10
                .forEach(r => {
                    failedList.createEl('li', {
                        text: `${r.file.path}: ${r.error || 'Unknown error'}`
                    });
                });

            if (result.failedCount > 10) {
                failedEl.createEl('p', {
                    text: `...and ${result.failedCount - 10} more`,
                    cls: 'setting-item-description'
                });
            }
        }

        const buttonContainer = contentEl.createDiv('modal-button-container');
        buttonContainer.createEl('button', { text: 'Close', cls: 'mod-cta' })
            .addEventListener('click', () => this.close());
    }

    onClose(): void {
        if (this.isProcessing) {
            this.manager.abort();
        }
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * Directory Decryption Modal
 */
export class DirectoryDecryptionModal extends Modal {
    private folderPath: string;
    private manager: DirectoryEncryptionManager;
    private settings: DirectoryEncryptionSettings;
    private password: string = '';
    private isProcessing: boolean = false;

    constructor(
        app: App,
        folderPath: string,
        settings: Partial<DirectoryEncryptionSettings> = {}
    ) {
        super(app);
        this.folderPath = folderPath;
        this.settings = { ...DEFAULT_DIRECTORY_SETTINGS, ...settings };
        this.manager = new DirectoryEncryptionManager(app, this.settings);
    }

    async onOpen(): Promise<void> {
        injectDirectoryModalStyles();

        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('directory-modal');

        contentEl.createEl('h2', { text: 'Decrypt Directory' });
        contentEl.createEl('p', { text: `Directory: ${this.folderPath || 'Root'}` });

        // Get preview
        const preview = await this.manager.getDecryptionPreview(this.folderPath);

        // Preview section
        const previewEl = contentEl.createDiv('summary-section');
        previewEl.createEl('h4', { text: 'Preview' });

        const previewRows = [
            { label: 'Files to decrypt', value: preview.filesToDecrypt.length.toString() },
            { label: 'Not encrypted', value: preview.notEncrypted.length.toString(), cls: 'skipped' },
            { label: 'Total size', value: formatBytes(preview.totalSize) },
            { label: 'Estimated time', value: `~${Math.ceil(preview.estimatedTime / 1000)}s` }
        ];

        for (const row of previewRows) {
            const rowEl = previewEl.createDiv('summary-row');
            if (row.cls) rowEl.addClass(row.cls);
            rowEl.createSpan({ text: row.label });
            rowEl.createSpan({ text: row.value });
        }

        if (preview.filesToDecrypt.length === 0) {
            contentEl.createEl('p', {
                text: '⚠️ No encrypted files found in this directory.',
                cls: 'setting-item-description'
            });

            const buttonContainer = contentEl.createDiv('modal-button-container');
            buttonContainer.createEl('button', { text: 'Close', cls: 'mod-cta' })
                .addEventListener('click', () => this.close());
            return;
        }

        // Password input
        new Setting(contentEl)
            .setName('Password')
            .setDesc('Enter the password used to encrypt these files')
            .addText(text => {
                text.setPlaceholder('Enter password')
                    .inputEl.setAttribute('type', 'password');
                text.onChange(value => this.password = value);
            });

        // Options
        new Setting(contentEl)
            .setName('Include subdirectories')
            .addToggle(toggle => toggle
                .setValue(this.settings.includeSubdirectories)
                .onChange(value => this.settings.includeSubdirectories = value));

        // Progress container
        const progressContainer = contentEl.createDiv('progress-container');
        progressContainer.style.display = 'none';

        const progressBar = progressContainer.createDiv('progress-bar');
        const progressFill = progressBar.createDiv('progress-fill');
        const progressText = progressContainer.createDiv('progress-text');

        // Buttons
        const buttonContainer = contentEl.createDiv('modal-button-container');

        const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
        cancelButton.addEventListener('click', () => {
            if (this.isProcessing) {
                this.manager.abort();
            }
            this.close();
        });

        const decryptButton = buttonContainer.createEl('button', {
            text: 'Decrypt All',
            cls: 'mod-cta'
        });

        decryptButton.addEventListener('click', async () => {
            if (!this.password) {
                new Notice('Please enter a password');
                return;
            }

            this.isProcessing = true;
            decryptButton.disabled = true;
            decryptButton.textContent = 'Decrypting...';
            progressContainer.style.display = 'block';

            this.manager.updateSettings(this.settings);

            const result = await this.manager.decryptDirectory(
                this.folderPath,
                this.password,
                (progress) => {
                    progressFill.style.width = `${progress.percentage}%`;
                    progressText.textContent = `${progress.processedFiles}/${progress.totalFiles} files processed`;
                }
            );

            this.isProcessing = false;
            this.showResult(result);
        });
    }

    private showResult(result: DirectoryOperationResult): void {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: result.success ? '✅ Success' : '⚠️ Completed with errors' });

        const summaryEl = contentEl.createDiv('summary-section');

        const rows = [
            { label: 'Total files', value: result.totalFiles.toString() },
            { label: 'Successful', value: result.successCount.toString(), cls: 'success' },
            { label: 'Failed', value: result.failedCount.toString(), cls: result.failedCount > 0 ? 'error' : '' },
            { label: 'Skipped', value: result.skippedCount.toString(), cls: 'skipped' },
            { label: 'Duration', value: `${(result.duration / 1000).toFixed(2)}s` }
        ];

        for (const row of rows) {
            const rowEl = summaryEl.createDiv('summary-row');
            if (row.cls) rowEl.addClass(row.cls);
            rowEl.createSpan({ text: row.label });
            rowEl.createSpan({ text: row.value });
        }

        if (result.failedCount > 0) {
            contentEl.createEl('p', {
                text: '⚠️ Some files failed to decrypt. This may be due to an incorrect password or corrupted files.',
                cls: 'setting-item-description'
            });
        }

        const buttonContainer = contentEl.createDiv('modal-button-container');
        buttonContainer.createEl('button', { text: 'Close', cls: 'mod-cta' })
            .addEventListener('click', () => this.close());
    }

    onClose(): void {
        if (this.isProcessing) {
            this.manager.abort();
        }
        const { contentEl } = this;
        contentEl.empty();
    }
}
