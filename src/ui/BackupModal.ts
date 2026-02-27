/**
 * Note Encryptor - Backup Modal
 * UI for creating and restoring encrypted backups
 */

import { App, Modal, Notice, Setting } from 'obsidian';
import { BackupManager, createBackupFileInput, BackupResult, RestoreResult } from '../core/backupManager';
import { PasswordModal } from './PasswordModal';
import { ProgressModal } from './ProgressModal';

export type BackupModalMode = 'backup' | 'restore';

export interface BackupModalOptions {
    mode: BackupModalMode;
    backupManager: BackupManager;
    onComplete?: () => void;
}

/**
 * Modal for backup and restore operations
 */
export class BackupModal extends Modal {
    private options: BackupModalOptions;
    private selectedFile: File | null = null;

    constructor(app: App, options: BackupModalOptions) {
        super(app);
        this.options = options;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('note-encryptor-modal', 'backup-modal');

        if (this.options.mode === 'backup') {
            this.renderBackupUI(contentEl);
        } else {
            this.renderRestoreUI(contentEl);
        }

        this.addStyles();
    }

    private renderBackupUI(contentEl: HTMLElement): void {
        // Header
        contentEl.createEl('h2', { text: 'Create Encrypted Backup' });

        // Description
        const description = contentEl.createDiv('backup-description');
        description.innerHTML = `
            <p>Create an encrypted backup of your encrypted notes.</p>
            <p>The backup will be protected with a password and can be restored later.</p>
        `;

        // Options
        let includeUnencrypted = false;

        new Setting(contentEl)
            .setName('Include unencrypted notes')
            .setDesc('Also include unencrypted markdown files in the backup')
            .addToggle((toggle) => {
                toggle.setValue(includeUnencrypted).onChange((value) => {
                    includeUnencrypted = value;
                });
            });

        // Info box
        const infoBox = contentEl.createDiv('backup-info-box');
        infoBox.createEl('h4', { text: 'What will be backed up?' });
        const infoList = infoBox.createEl('ul');
        infoList.createEl('li', { text: 'All encrypted notes in your vault' });
        infoList.createEl('li', { text: 'File metadata (paths, modification dates)' });
        infoList.createEl('li', { text: 'Vault information' });
        if (includeUnencrypted) {
            infoList.createEl('li', { text: 'Unencrypted markdown files (if enabled)' });
        }

        // Warning box
        const warningBox = contentEl.createDiv('backup-warning-box');
        warningBox.createSpan({ cls: 'warning-icon', text: '⚠️' });
        warningBox.createSpan({
            text: ' Make sure to remember your backup password. There is no way to recover it!',
        });

        // Action buttons
        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText('Cancel')
                    .onClick(() => this.close())
            )
            .addButton((btn) =>
                btn
                    .setButtonText('Create Backup')
                    .setCta()
                    .onClick(() => this.createBackup(includeUnencrypted))
            );
    }

    private renderRestoreUI(contentEl: HTMLElement): void {
        // Header
        contentEl.createEl('h2', { text: 'Restore from Backup' });

        // Description
        const description = contentEl.createDiv('backup-description');
        description.innerHTML = `
            <p>Restore your notes from an encrypted backup file.</p>
            <p>Select a backup file created by this plugin.</p>
        `;

        // File selection
        let selectedFilePath = '';

        const fileSetting = new Setting(contentEl)
            .setName('Backup file')
            .setDesc('Select a .enc backup file')
            .addButton((btn) =>
                btn
                    .setButtonText('Choose File')
                    .onClick(() => {
                        const input = createBackupFileInput((file) => {
                            this.selectedFile = file;
                            selectedFilePath = file.name;
                            fileSetting.setDesc(`Selected: ${file.name}`);
                        });
                        input.click();
                    })
            );

        // Options
        let overwriteExisting = false;

        new Setting(contentEl)
            .setName('Overwrite existing files')
            .setDesc('Replace existing files with the same name')
            .addToggle((toggle) => {
                toggle.setValue(overwriteExisting).onChange((value) => {
                    overwriteExisting = value;
                });
            });

        // Warning box
        const warningBox = contentEl.createDiv('backup-warning-box');
        warningBox.createSpan({ cls: 'warning-icon', text: '⚠️' });
        warningBox.createSpan({
            text: ' Restoring will create or replace files in your vault. Make sure you have a current backup!',
        });

        // Action buttons
        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText('Cancel')
                    .onClick(() => this.close())
            )
            .addButton((btn) =>
                btn
                    .setButtonText('Restore Backup')
                    .setCta()
                    .onClick(() => this.restoreBackup(overwriteExisting))
            );
    }

    private async createBackup(includeUnencrypted: boolean): Promise<void> {
        new PasswordModal(
            this.app,
            async (password) => {
                const progressModal = new ProgressModal(this.app, 'encrypt', 0);
                progressModal.open();
                progressModal.updateProgress({
                    current: 0,
                    total: 100,
                    currentFile: 'Preparing backup...',
                    successCount: 0,
                    failCount: 0,
                    status: 'running',
                });

                try {
                    const result = await this.options.backupManager.createBackup({
                        password,
                        includeUnencrypted,
                        onProgress: (progress) => {
                            progressModal.updateProgress(progress);
                        },
                    });

                    progressModal.complete();

                    if (result.success && result.blob) {
                        // Download the backup
                        const url = URL.createObjectURL(result.blob);
                        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                        const filename = `obsidian-backup-${timestamp}.enc`;

                        const link = document.createElement('a');
                        link.href = url;
                        link.download = filename;
                        link.click();

                        URL.revokeObjectURL(url);

                        new Notice(
                            `Backup created: ${result.stats.encryptedFiles} encrypted notes, ${result.stats.totalSize} bytes`
                        );
                        this.close();

                        if (this.options.onComplete) {
                            this.options.onComplete();
                        }
                    } else {
                        new Notice(`Backup failed: ${result.error || 'Unknown error'}`);
                    }
                } catch (error) {
                    progressModal.complete();
                    console.error('Backup error:', error);
                    new Notice(`Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            },
            {
                isEncrypting: true,
                title: 'Set Backup Password',
                showStrength: true,
            }
        ).open();
    }

    private async restoreBackup(overwriteExisting: boolean): Promise<void> {
        if (!this.selectedFile) {
            new Notice('Please select a backup file first');
            return;
        }

        new PasswordModal(
            this.app,
            async (password) => {
                // First validate the backup
                const validation = await this.options.backupManager.validateBackup(
                    this.selectedFile!,
                    password
                );

                if (!validation.valid) {
                    new Notice(`Invalid backup: ${validation.error || 'Wrong password'}`);
                    return;
                }

                // Show backup info
                if (validation.manifest) {
                    const info = `Backup from: ${new Date(validation.manifest.createdAt).toLocaleString()}
Files: ${validation.manifest.totalFiles}
Vault: ${validation.manifest.vaultName}`;

                    new Notice(info, 8000);
                }

                const progressModal = new ProgressModal(this.app, 'decrypt', 0);
                progressModal.open();

                try {
                    const result = await this.options.backupManager.restoreBackup(this.selectedFile!, {
                        password,
                        overwriteExisting,
                        onProgress: (progress) => {
                            progressModal.updateProgress(progress);
                        },
                    });

                    progressModal.complete();

                    if (result.success) {
                        new Notice(
                            `Restored ${result.stats.restoredFiles} files${result.stats.failedFiles > 0 ? `, ${result.stats.failedFiles} failed` : ''}`
                        );
                        this.close();

                        if (this.options.onComplete) {
                            this.options.onComplete();
                        }
                    } else {
                        new Notice(`Restore failed: ${result.errors[0]?.error || 'Unknown error'}`);
                    }
                } catch (error) {
                    progressModal.complete();
                    console.error('Restore error:', error);
                    new Notice(`Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            },
            {
                isEncrypting: false,
                title: 'Enter Backup Password',
            }
        ).open();
    }

    private addStyles(): void {
        if (document.getElementById('backup-modal-styles')) return;

        const style = document.createElement('style');
        style.id = 'backup-modal-styles';
        style.textContent = `
            .backup-modal .backup-description {
                margin-bottom: 20px;
                color: var(--text-muted);
            }

            .backup-modal .backup-description p {
                margin: 8px 0;
            }

            .backup-modal .backup-info-box {
                background: var(--background-secondary);
                border-radius: 8px;
                padding: 12px 16px;
                margin-bottom: 16px;
            }

            .backup-modal .backup-info-box h4 {
                margin: 0 0 8px 0;
                font-size: 0.95em;
            }

            .backup-modal .backup-info-box ul {
                margin: 0;
                padding-left: 20px;
            }

            .backup-modal .backup-info-box li {
                margin: 4px 0;
                font-size: 0.9em;
                color: var(--text-muted);
            }

            .backup-modal .backup-warning-box {
                background: var(--background-modifier-warning);
                border-radius: 8px;
                padding: 12px 16px;
                margin-bottom: 20px;
                font-size: 0.9em;
            }

            .backup-modal .backup-warning-box .warning-icon {
                font-size: 1.2em;
            }
        `;
        document.head.appendChild(style);
    }

    onClose(): void {
        this.selectedFile = null;
        this.contentEl.empty();
    }
}

/**
 * Show backup modal
 */
export function showBackupModal(
    app: App,
    backupManager: BackupManager,
    mode: BackupModalMode,
    onComplete?: () => void
): void {
    new BackupModal(app, { mode, backupManager, onComplete }).open();
}
