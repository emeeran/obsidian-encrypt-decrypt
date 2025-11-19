/**
 * Batch Operations UI Components
 * Provides user interface for batch encryption/decryption operations
 */

import { App, TFile, Modal, Notice, Setting, SuggestModal } from 'obsidian';
import { BatchOperationsManager, BatchOptions, BatchProgress } from './batch-operations';

export class BatchOperationModal extends Modal {
    private batchManager: BatchOperationsManager;
    private mode: 'encrypt' | 'decrypt';
    private selectedFiles: TFile[] = [];
    private password: string = '';
    private confirmPassword: string = '';
    private options: BatchOptions;

    constructor(
        app: App,
        mode: 'encrypt' | 'decrypt',
        initialFiles: TFile[] = []
    ) {
        super(app);
        this.mode = mode;
        this.batchManager = new BatchOperationsManager(app);
        this.selectedFiles = [...initialFiles];
        this.options = {
            password: '',
            confirmBeforeProcessing: true,
            continueOnError: true,
            skipAlreadyEncrypted: true,
            addEncryptedPrefix: true
        };
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('batch-operation-modal');

        // Title
        contentEl.createEl('h2', {
            text: this.mode === 'encrypt' ? 'Batch Encrypt Files' : 'Batch Decrypt Files'
        });

        // File selection
        this.createFileSelectionSection(contentEl);

        // Password input
        this.createPasswordSection(contentEl);

        // Options
        this.createOptionsSection(contentEl);

        // Progress section
        const progressSection = contentEl.createDiv('progress-section');
        progressSection.createEl('h3', { text: 'Progress' });
        const progressEl = progressSection.createDiv('progress-display');
        this.createProgressDisplay(progressEl);

        // Actions
        this.createActionButtons(contentEl);
    }

    private createFileSelectionSection(containerEl: HTMLElement): void {
        const fileSection = containerEl.createDiv('file-selection-section');

        fileSection.createEl('h3', { text: 'Selected Files' });

        const fileCountEl = fileSection.createEl('p', {
            text: `${this.selectedFiles.length} files selected`,
            cls: 'file-count'
        });

        // File list
        const fileListEl = fileSection.createDiv('file-list');
        fileListEl.style.maxHeight = '200px';
        fileListEl.style.overflowY = 'auto';
        fileListEl.style.border = '1px solid var(--background-modifier-border)';
        fileListEl.style.borderRadius = '4px';
        fileListEl.style.padding = '8px';

        if (this.selectedFiles.length === 0) {
            fileListEl.createEl('p', {
                text: 'No files selected. Select files from the file browser.',
                cls: 'empty-state'
            });
        } else {
            for (const file of this.selectedFiles) {
                const fileItem = fileListEl.createDiv('file-item');
                fileItem.style.display = 'flex';
                fileItem.style.justifyContent = 'space-between';
                fileItem.style.alignItems = 'center';
                fileItem.style.padding = '4px 0';

                const fileName = fileItem.createSpan({
                    text: file.basename,
                    cls: 'file-name'
                });

                const removeButton = fileItem.createEl('button', {
                    text: 'Remove',
                    cls: 'remove-button'
                });
                removeButton.onclick = () => {
                    this.removeFile(file);
                };
            }
        }

        // Add/Select files button
        const selectButton = fileSection.createEl('button', {
            text: this.selectedFiles.length === 0 ? 'Select Files' : 'Add More Files',
            cls: 'mod-cta'
        });
        selectButton.onclick = () => {
            this.showFileSelectionModal();
        };
    }

    private createPasswordSection(containerEl: HTMLElement): void {
        const passwordSection = containerEl.createDiv('password-section');

        passwordSection.createEl('h3', { text: 'Encryption Password' });

        new Setting(passwordSection)
            .setName('Password')
            .setDesc(`Password used to ${this.mode} the selected files`)
            .addText(text => text
                .setPlaceholder('Enter password')
                .onChange(value => {
                    this.password = value;
                })
                .inputEl.setAttribute('type', 'password'));

        if (this.mode === 'encrypt') {
            new Setting(passwordSection)
                .setName('Confirm Password')
                .setDesc('Re-enter password to confirm')
                .addText(text => text
                    .setPlaceholder('Confirm password')
                    .onChange(value => {
                        this.confirmPassword = value;
                    })
                    .inputEl.setAttribute('type', 'password'));
        }

        // Password strength indicator
        const strengthEl = passwordSection.createDiv('password-strength');
        this.updatePasswordStrength('', strengthEl);

        // Update strength on password change
        const passwordInput = passwordSection.querySelector('input[type="password"]') as HTMLInputElement;
        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => {
                const value = (e.target as HTMLInputElement).value;
                this.updatePasswordStrength(value, strengthEl);
            });
        }
    }

    private createOptionsSection(containerEl: HTMLElement): void {
        const optionsSection = containerEl.createDiv('options-section');

        optionsSection.createEl('h3', { text: 'Options' });

        new Setting(optionsSection)
            .setName('Confirm before processing')
            .setDesc('Show confirmation dialog before starting batch operation')
            .addToggle(toggle => toggle
                .setValue(this.options.confirmBeforeProcessing ?? true)
                .onChange(value => {
                    this.options.confirmBeforeProcessing = value;
                }));

        new Setting(optionsSection)
            .setName('Continue on error')
            .setDesc('Continue processing other files if one fails')
            .addToggle(toggle => toggle
                .setValue(this.options.continueOnError ?? true)
                .onChange(value => {
                    this.options.continueOnError = value;
                }));

        if (this.mode === 'encrypt') {
            new Setting(optionsSection)
                .setName('Skip already encrypted files')
                .setDesc('Skip files that are already encrypted')
                .addToggle(toggle => toggle
                    .setValue(this.options.skipAlreadyEncrypted ?? true)
                    .onChange(value => {
                        this.options.skipAlreadyEncrypted = value;
                    }));
        }

        new Setting(optionsSection)
            .setName('Add encrypted prefix')
            .setDesc('Add prefix to encrypted file names')
            .addToggle(toggle => toggle
                .setValue(this.options.addEncryptedPrefix ?? true)
                .onChange(value => {
                    this.options.addEncryptedPrefix = value;
                }));
    }

    private createProgressDisplay(containerEl: HTMLElement): void {
        containerEl.createEl('div', { text: 'Ready to process files', cls: 'progress-status' });

        const progressBar = containerEl.createDiv('progress-bar-container');
        const progressFill = progressBar.createDiv('progress-fill');
        progressFill.style.width = '0%';

        const progressText = containerEl.createDiv('progress-text');
        progressText.style.marginTop = '8px';
        progressText.style.fontSize = '12px';
        progressText.style.color = 'var(--text-muted)';
    }

    private createActionButtons(containerEl: HTMLElement): void {
        const buttonContainer = containerEl.createDiv('button-container');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '8px';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.marginTop = '16px';

        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel',
            cls: ''
        });
        cancelButton.onclick = () => {
            this.close();
        };

        const processButton = buttonContainer.createEl('button', {
            text: `${this.mode === 'encrypt' ? 'Encrypt' : 'Decrypt'} Files`,
            cls: 'mod-cta'
        });
        processButton.onclick = () => {
            this.startBatchOperation();
        };

        // Disable process button if no files or no password
        if (this.selectedFiles.length === 0 || !this.password) {
            processButton.disabled = true;
        }
    }

    private updatePasswordStrength(password: string, containerEl: HTMLElement): void {
        containerEl.empty();

        if (!password) {
            containerEl.createEl('div', { text: 'Enter a password to see strength' });
            return;
        }

        // Calculate password strength
        let score = 0;
        let feedback = [];

        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (password.length >= 16) score++;

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
            { score: 5, text: 'Very Strong', color: '#0088ff' },
            { score: 6, text: 'Excellent', color: '#0066ff' },
            { score: 7, text: 'Outstanding', color: '#4444ff' }
        ];

        const strength = strengthLevels[Math.min(score, 7)];

        const strengthContainer = containerEl.createDiv('strength-container');
        strengthContainer.style.display = 'flex';
        strengthContainer.style.alignItems = 'center';
        strengthContainer.style.gap = '8px';

        const strengthLabel = strengthContainer.createSpan({ text: 'Strength: ' });
        const strengthBar = strengthContainer.createDiv('strength-bar');
        strengthBar.style.flex = '1';
        strengthBar.style.height = '6px';
        strengthBar.style.backgroundColor = 'var(--background-modifier-border)';
        strengthBar.style.borderRadius = '3px';
        strengthBar.style.overflow = 'hidden';

        const strengthFill = strengthBar.createDiv('strength-fill');
        strengthFill.style.height = '100%';
        strengthFill.style.width = `${(score / 7) * 100}%`;
        strengthFill.style.backgroundColor = strength.color;
        strengthFill.style.borderRadius = '3px';
        strengthFill.style.transition = 'width 0.3s ease';

        const strengthText = strengthContainer.createSpan({
            text: strength.text,
            cls: 'strength-text'
        });
        strengthText.style.color = strength.color;
        strengthText.style.fontWeight = '600';
        strengthText.style.fontSize = '12px';
    }

    private removeFile(file: TFile): void {
        const index = this.selectedFiles.indexOf(file);
        if (index > -1) {
            this.selectedFiles.splice(index, 1);
            this.onOpen(); // Refresh the modal
        }
    }

    private showFileSelectionModal(): void {
        new FileSelectionModal(this.app, (selectedFiles) => {
            this.selectedFiles.push(...selectedFiles);
            this.onOpen(); // Refresh the modal
        }).open();
    }

    private async startBatchOperation(): Promise<void> {
        // Validate inputs
        if (this.selectedFiles.length === 0) {
            new Notice('No files selected');
            return;
        }

        if (!this.password) {
            new Notice('Password is required');
            return;
        }

        if (this.mode === 'encrypt' && this.password !== this.confirmPassword) {
            new Notice('Passwords do not match');
            return;
        }

        // Close this modal
        this.close();

        // Set password in options
        this.options.password = this.password;

        // Create progress modal
        const progressModal = new BatchProgressModal(
            this.app,
            `${this.mode === 'encrypt' ? 'Encrypting' : 'Decrypting'} Files`,
            this.selectedFiles.length
        );
        progressModal.open();

        try {
            // Start batch operation
            const result = this.mode === 'encrypt'
                ? await this.batchManager.encryptMultipleFiles(
                    this.selectedFiles,
                    this.options,
                    (progress) => progressModal.updateProgress(progress)
                )
                : await this.batchManager.decryptMultipleFiles(
                    this.selectedFiles,
                    this.options,
                    (progress) => progressModal.updateProgress(progress)
                );

            progressModal.complete(result);

        } catch (error) {
            progressModal.error(error instanceof Error ? error.message : 'Unknown error');
        }
    }
}

/**
 * File selection modal for choosing files to process
 */
class FileSelectionModal extends SuggestModal<TFile> {
    private files: TFile[] = [];
    private selectedFiles: TFile[] = [];
    private onSelect: (files: TFile[]) => void;

    constructor(app: App, onSelect: (files: TFile[]) => void) {
        super(app);
        this.onSelect = onSelect;
        this.loadFiles();
    }

    private loadFiles(): void {
        // Get all markdown files
        this.files = this.app.vault.getMarkdownFiles()
            .filter(file => file.extension === 'md');
    }

    getSuggestions(query: string): TFile[] {
        return this.files.filter(file =>
            file.basename.toLowerCase().includes(query.toLowerCase())
        );
    }

    renderSuggestion(file: TFile, el: HTMLElement): void {
        el.createEl('div', { text: file.basename });
        el.createEl('small', { text: file.path, cls: 'file-path' });
    }

    onChooseSuggestion(item: TFile, evt: MouseEvent | KeyboardEvent): void {
        if (!this.selectedFiles.includes(item)) {
            this.selectedFiles.push(item);
            this.selectedFiles = [...new Set(this.selectedFiles)]; // Remove duplicates
        }
    }

    onClose(): void {
        this.onSelect(this.selectedFiles);
    }
}

/**
 * Progress modal for batch operations
 */
class BatchProgressModal extends Modal {
    private title: string;
    private totalFiles: number;
    private progressText: HTMLElement;
    private progressBar: HTMLElement;
    private progressFill: HTMLElement;
    private statusText: HTMLElement;

    constructor(app: App, title: string, totalFiles: number) {
        super(app);
        this.title = title;
        this.totalFiles = totalFiles;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('batch-progress-modal');

        contentEl.createEl('h2', { text: this.title });

        const progressContainer = contentEl.createDiv('progress-container');

        // Status text
        this.statusText = progressContainer.createEl('div', {
            text: 'Preparing...',
            cls: 'progress-status'
        });

        // Progress bar
        const progressBar = progressContainer.createDiv('progress-bar');
        progressBar.style.width = '100%';
        progressBar.style.height = '20px';
        progressBar.style.backgroundColor = 'var(--background-modifier-border)';
        progressBar.style.borderRadius = '10px';
        progressBar.style.overflow = 'hidden';
        progressBar.style.margin = '16px 0';

        this.progressFill = progressBar.createDiv('progress-fill');
        this.progressFill.style.height = '100%';
        this.progressFill.style.backgroundColor = 'var(--interactive-accent)';
        this.progressFill.style.width = '0%';
        this.progressFill.style.transition = 'width 0.3s ease';

        // Progress text
        this.progressText = progressContainer.createEl('div', {
            text: '0 / 0 files processed',
            cls: 'progress-text'
        });
        this.progressText.style.fontSize = '14px';
        this.progressText.style.color = 'var(--text-muted)';

        // Action buttons
        const buttonContainer = contentEl.createDiv('button-container');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.gap = '8px';
        buttonContainer.style.marginTop = '16px';

        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel',
            cls: ''
        });
        cancelButton.onclick = () => {
            this.close();
        };
    }

    updateProgress(progress: any): void {
        const percentage = (progress.current / progress.total) * 100;

        this.progressFill.style.width = `${percentage}%`;
        this.progressText.textContent = `${progress.current} / ${progress.total} files processed`;

        this.statusText.textContent = `Processing: ${progress.fileName}`;

        if (progress.errors > 0) {
            this.statusText.textContent += ` (${progress.errors} errors)`;
        }
    }

    complete(result: any): void {
        this.progressFill.style.width = '100%';
        this.progressFill.style.backgroundColor = 'var(--text-success)';
        this.progressText.textContent = `Complete: ${result.successful} successful, ${result.failed} failed`;
        this.statusText.textContent = `Operation completed in ${(result.totalTime / 1000).toFixed(1)}s`;

        // Update button
        const buttonContainer = this.contentEl.querySelector('.button-container');
        if (buttonContainer) {
            buttonContainer.innerHTML = '';
            const closeButton = buttonContainer.createEl('button', {
                text: 'Close',
                cls: 'mod-cta'
            });
            closeButton.onclick = () => {
                this.close();
            };
        }
    }

    error(error: string): void {
        this.progressFill.style.backgroundColor = 'var(--text-error)';
        this.statusText.textContent = `Error: ${error}`;
        this.progressText.textContent = 'Operation failed';

        // Update button
        const buttonContainer = this.contentEl.querySelector('.button-container');
        if (buttonContainer) {
            buttonContainer.innerHTML = '';
            const closeButton = buttonContainer.createEl('button', {
                text: 'Close',
                cls: ''
            });
            closeButton.onclick = () => {
                this.close();
            };
        }
    }
}