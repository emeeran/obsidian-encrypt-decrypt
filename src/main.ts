/**
 * Note Encryptor - Obsidian Plugin
 * Encrypt entire notes or selected text inline with AES-256-GCM encryption
 *
 * @version 2.0.0
 * @author emeeran
 * @license MIT
 * @see https://github.com/emeeran/obsidian-encrypt-decrypt
 */

import {
    App,
    Editor,
    MarkdownView,
    Notice,
    Plugin,
    TFile,
    TFolder,
} from 'obsidian';

// Types
import type { NoteEncryptorSettings, InlineEncryptedBlock } from './types';

// Constants
import { DEFAULT_SETTINGS } from './settings';

// Crypto
import { decryptInline } from './crypto';

// Security
import { RateLimiter } from './security';
import { PasswordStore } from './security';

// UI
import {
    PasswordModal,
    InlineDecryptModal,
    FolderSelectionModal,
    EncryptedOverlay,
    ProgressModal,
} from './ui';

// Core
import { FileEncryptor, InlineEncryptor, FolderProcessor } from './core';

// Utils
import { isEncrypted, isInlineEncrypted, findInlineEncryptedBlocks } from './utils';

// Settings
import { NoteEncryptorSettingTab } from './settings';

// ======================================================================
// Main Plugin Class
// ======================================================================

export default class NoteEncryptorPlugin extends Plugin {
    settings!: NoteEncryptorSettings;
    private rateLimiter!: RateLimiter;
    private passwordStore!: PasswordStore;
    private fileEncryptor!: FileEncryptor;
    private inlineEncryptor!: InlineEncryptor;
    private folderProcessor!: FolderProcessor;

    async onload() {
        // Check Web Crypto API availability
        if (!window.crypto || !window.crypto.subtle) {
            new Notice('Note Encryptor: Web Crypto API not supported. Plugin disabled.');
            console.error('Note Encryptor: Web Crypto API (crypto.subtle) is not available.');
            return;
        }

        await this.loadSettings();
        this.initializeComponents();
        this.addStyles();
        this.registerCommands();
        this.registerEvents();
        this.addSettingTab(new NoteEncryptorSettingTab(this.app, this));

        // Initial overlay check
        this.app.workspace.onLayoutReady(() => {
            this.updateEncryptedViews();
        });
    }

    // ======================================================================
    // Initialization
    // ======================================================================

    private async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    private initializeComponents() {
        this.rateLimiter = new RateLimiter({
            maxAttempts: this.settings.rateLimitMaxAttempts,
            lockoutDurationMs: this.settings.rateLimitLockoutSeconds * 1000,
        });

        this.passwordStore = new PasswordStore({
            expiryMinutes: this.settings.passwordMemoryExpiryMinutes,
        });

        this.fileEncryptor = new FileEncryptor(this.app, this.settings);
        this.inlineEncryptor = new InlineEncryptor(this.settings);
        this.folderProcessor = new FolderProcessor(this.app, this.settings);
    }

    private addStyles() {
        EncryptedOverlay.addStyles();
    }

    // ======================================================================
    // Commands Registration
    // ======================================================================

    private registerCommands() {
        // File commands
        this.addCommand({
            id: 'encrypt-note',
            name: 'Encrypt current note',
            hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'e' }],
            checkCallback: (checking) => {
                const file = this.app.workspace.getActiveFile();
                if (file) {
                    if (!checking) this.encryptFile(file);
                    return true;
                }
                return false;
            },
        });

        this.addCommand({
            id: 'decrypt-note',
            name: 'Decrypt current note',
            hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'd' }],
            checkCallback: (checking) => {
                const file = this.app.workspace.getActiveFile();
                if (file) {
                    if (!checking) this.decryptFile(file);
                    return true;
                }
                return false;
            },
        });

        this.addCommand({
            id: 'toggle-encryption',
            name: 'Toggle encryption (encrypt or decrypt)',
            hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 't' }],
            checkCallback: (checking) => {
                const file = this.app.workspace.getActiveFile();
                if (file) {
                    if (!checking) this.toggleEncryption(file);
                    return true;
                }
                return false;
            },
        });

        // Inline commands
        this.addCommand({
            id: 'encrypt-selection',
            name: 'Encrypt selection (inline)',
            editorCheckCallback: (checking, editor) => {
                const selection = editor.getSelection();
                if (selection && selection.length > 0 && !isInlineEncrypted(selection)) {
                    if (!checking) this.encryptSelection(editor);
                    return true;
                }
                return false;
            },
        });

        this.addCommand({
            id: 'decrypt-selection',
            name: 'Decrypt selection (inline)',
            editorCheckCallback: (checking, editor) => {
                const selection = editor.getSelection();
                if (selection && isInlineEncrypted(selection)) {
                    if (!checking) this.decryptSelection(editor);
                    return true;
                }
                return false;
            },
        });

        this.addCommand({
            id: 'decrypt-at-cursor',
            name: 'Decrypt at cursor (view encrypted text)',
            editorCheckCallback: (checking, editor) => {
                const block = this.findEncryptedBlockAtCursor(editor);
                if (block) {
                    if (!checking) this.viewEncryptedAtCursor(block);
                    return true;
                }
                return false;
            },
        });

        this.addCommand({
            id: 'decrypt-inline-in-place',
            name: 'Decrypt at cursor (replace with decrypted text)',
            editorCheckCallback: (checking, editor) => {
                const block = this.findEncryptedBlockAtCursor(editor);
                if (block) {
                    if (!checking) this.decryptInlineAtCursor(editor, block);
                    return true;
                }
                return false;
            },
        });

        // Folder commands
        this.addCommand({
            id: 'encrypt-directory',
            name: 'Encrypt all notes in a folder',
            callback: () => {
                new FolderSelectionModal(this.app, (folder) =>
                    this.processFolder(folder, true)
                ).open();
            },
        });

        this.addCommand({
            id: 'decrypt-directory',
            name: 'Decrypt all notes in a folder',
            callback: () => {
                new FolderSelectionModal(this.app, (folder) =>
                    this.processFolder(folder, false)
                ).open();
            },
        });

    }

    // ======================================================================
    // Events Registration
    // ======================================================================

    private registerEvents() {
        // File/folder context menu
        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                if (file instanceof TFile && file.extension === 'md') {
                    menu.addItem((item) =>
                        item
                            .setTitle('🔐 Encrypt note')
                            .setIcon('lock')
                            .onClick(() => this.encryptFile(file))
                    );
                    menu.addItem((item) =>
                        item
                            .setTitle('🔓 Decrypt note')
                            .setIcon('unlock')
                            .onClick(() => this.decryptFile(file))
                    );
                }
                if (file instanceof TFolder) {
                    menu.addItem((item) =>
                        item
                            .setTitle('🔐 Encrypt folder')
                            .setIcon('lock')
                            .onClick(() => this.processFolder(file, true))
                    );
                    menu.addItem((item) =>
                        item
                            .setTitle('🔓 Decrypt folder')
                            .setIcon('unlock')
                            .onClick(() => this.processFolder(file, false))
                    );
                }
            })
        );

        // Editor context menu
        this.registerEvent(
            this.app.workspace.on('editor-menu', (menu, editor) => {
                const selection = editor.getSelection();

                if (selection && selection.length > 0) {
                    if (isInlineEncrypted(selection)) {
                        menu.addItem((item) =>
                            item
                                .setTitle('🔓 Decrypt selection')
                                .setIcon('unlock')
                                .onClick(() => this.decryptSelection(editor))
                        );
                    } else {
                        menu.addItem((item) =>
                            item
                                .setTitle('🔐 Encrypt selection')
                                .setIcon('lock')
                                .onClick(() => this.encryptSelection(editor))
                        );
                    }
                }
            })
        );

        // View updates
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', () => {
                this.updateEncryptedViews();
            })
        );

        this.registerEvent(
            this.app.vault.on('modify', (file) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile && file.path === activeFile.path) {
                    setTimeout(() => this.updateEncryptedViews(), 100);
                }
            })
        );
    }

    // ======================================================================
    // File Operations
    // ======================================================================

    private async encryptFile(file: TFile) {
        const content = await this.app.vault.read(file);

        if (isEncrypted(content)) {
            new Notice('Note is already encrypted');
            return;
        }

        new PasswordModal(
            this.app,
            async (password) => {
                const result = await this.fileEncryptor.encryptFile(file, password);
                if (result.success) {
                    new Notice('Note encrypted successfully');
                    this.rateLimiter.reset(file.path);
                    setTimeout(() => this.updateEncryptedViews(), 100);
                } else {
                    new Notice(`Encryption failed: ${result.error}`);
                }
            },
            {
                isEncrypting: true,
                showStrength: this.settings.showPasswordStrength,
                minLength: this.settings.passwordMinLength,
                rateLimiter: this.settings.enableRateLimiting ? this.rateLimiter : undefined,
                rateLimitId: file.path,
            }
        ).open();
    }

    private async decryptFile(file: TFile) {
        const content = await this.app.vault.read(file);

        if (!isEncrypted(content)) {
            new Notice('Note is not encrypted');
            return;
        }

        // Check for stored password
        if (this.settings.enablePasswordMemory) {
            const storedPassword = await this.passwordStore.getPassword(file.path);
            if (storedPassword) {
                const result = await this.fileEncryptor.decryptFile(file, storedPassword);
                if (result.success) {
                    new Notice('Note decrypted successfully');
                    if (result.integrityValid === false) {
                        new Notice('Warning: Integrity check failed');
                    }
                    setTimeout(() => this.updateEncryptedViews(), 100);
                    return;
                }
            }
        }

        new PasswordModal(
            this.app,
            async (password) => {
                const result = await this.fileEncryptor.decryptFile(file, password);
                if (result.success) {
                    this.rateLimiter.reset(file.path);

                    // Store password if memory enabled
                    if (this.settings.enablePasswordMemory) {
                        await this.passwordStore.storePassword(file.path, password);
                    }

                    new Notice('Note decrypted successfully');
                    if (result.integrityValid === false) {
                        new Notice('Warning: Integrity check failed');
                    }
                    setTimeout(() => this.updateEncryptedViews(), 100);
                } else {
                    if (this.settings.enableRateLimiting) {
                        this.rateLimiter.recordAttempt(file.path);
                    }
                    new Notice(`Decryption failed: ${result.error}`);
                }
            },
            {
                isEncrypting: false,
                minLength: this.settings.passwordMinLength,
                rateLimiter: this.settings.enableRateLimiting ? this.rateLimiter : undefined,
                rateLimitId: file.path,
            }
        ).open();
    }

    private async toggleEncryption(file: TFile) {
        const content = await this.app.vault.read(file);
        if (isEncrypted(content)) {
            this.decryptFile(file);
        } else {
            this.encryptFile(file);
        }
    }

    // ======================================================================
    // Inline Operations
    // ======================================================================

    private async encryptSelection(editor: Editor) {
        new PasswordModal(
            this.app,
            async (password) => {
                const result = await this.inlineEncryptor.encryptSelection(editor, password);
                if (result.success) {
                    new Notice('Text encrypted');
                } else {
                    new Notice(`Encryption failed: ${result.error}`);
                }
            },
            {
                isEncrypting: true,
                showStrength: this.settings.showPasswordStrength,
                minLength: this.settings.passwordMinLength,
                title: '🔐 Encrypt Selection',
            }
        ).open();
    }

    private async decryptSelection(editor: Editor) {
        new PasswordModal(
            this.app,
            async (password) => {
                const result = await this.inlineEncryptor.decryptSelection(editor, password);
                if (result.success) {
                    new Notice('Text decrypted');
                    this.rateLimiter.reset('inline');
                } else {
                    if (this.settings.enableRateLimiting) {
                        this.rateLimiter.recordAttempt('inline');
                    }
                    new Notice(`Decryption failed: ${result.error}`);
                }
            },
            {
                isEncrypting: false,
                minLength: this.settings.passwordMinLength,
                title: '🔓 Decrypt Selection',
                rateLimiter: this.settings.enableRateLimiting ? this.rateLimiter : undefined,
                rateLimitId: 'inline',
            }
        ).open();
    }

    private findEncryptedBlockAtCursor(editor: Editor): InlineEncryptedBlock | null {
        return this.inlineEncryptor.findBlockAtCursor(editor);
    }

    private viewEncryptedAtCursor(block: InlineEncryptedBlock) {
        new InlineDecryptModal(this.app, block.content, {
            minLength: this.settings.passwordMinLength,
            rateLimiter: this.settings.enableRateLimiting ? this.rateLimiter : undefined,
            rateLimitId: 'inline',
        }).open();
    }

    private async decryptInlineAtCursor(editor: Editor, block: InlineEncryptedBlock) {
        new PasswordModal(
            this.app,
            async (password) => {
                const result = await this.inlineEncryptor.decryptAtCursor(editor, block, password);
                if (result.success) {
                    new Notice('Text decrypted');
                    this.rateLimiter.reset('inline');
                } else {
                    if (this.settings.enableRateLimiting) {
                        this.rateLimiter.recordAttempt('inline');
                    }
                    new Notice(`Decryption failed: ${result.error}`);
                }
            },
            {
                isEncrypting: false,
                minLength: this.settings.passwordMinLength,
                title: '🔓 Decrypt Text',
                rateLimiter: this.settings.enableRateLimiting ? this.rateLimiter : undefined,
                rateLimitId: 'inline',
            }
        ).open();
    }

    // ======================================================================
    // Folder Operations
    // ======================================================================

    private async processFolder(folder: TFolder, encrypting: boolean) {
        const count = await this.folderProcessor.countFilesToProcess(folder, encrypting);

        if (count === 0) {
            new Notice(
                `No ${encrypting ? 'unencrypted' : 'encrypted'} notes found in this folder`
            );
            return;
        }

        new PasswordModal(
            this.app,
            async (password) => {
                const progressModal = new ProgressModal(this.app, encrypting ? 'encrypt' : 'decrypt', count);
                progressModal.open();
                progressModal.start();

                const results = await this.folderProcessor.processFolder(
                    folder,
                    encrypting,
                    password,
                    {
                        onProgress: (progress) => {
                            progressModal.updateProgress(progress);
                            if (progressModal.isCancelled()) {
                                return;
                            }
                        },
                    }
                );

                // Add results to modal
                for (const result of results) {
                    progressModal.addResult(result);
                }

                progressModal.complete();

                const successCount = results.filter((r) => r.success).length;
                const failCount = results.filter((r) => !r.success).length;

                new Notice(
                    `${encrypting ? 'Encrypted' : 'Decrypted'} ${successCount} notes${failCount > 0 ? `, ${failCount} failed` : ''}`
                );

                setTimeout(() => this.updateEncryptedViews(), 100);
            },
            {
                isEncrypting: encrypting,
                showStrength: encrypting && this.settings.showPasswordStrength,
                minLength: this.settings.passwordMinLength,
            }
        ).open();
    }

    // ======================================================================
    // Overlay Management
    // ======================================================================

    updateEncryptedViews() {
        const leaves = this.app.workspace.getLeavesOfType('markdown');

        for (const leaf of leaves) {
            const view = leaf.view as MarkdownView;
            const file = view.file;

            if (!this.settings.hideEncryptedContent) {
                EncryptedOverlay.removeFromView(view);
                continue;
            }

            if (!file) {
                EncryptedOverlay.removeFromView(view);
                continue;
            }

            // Read file content to check if encrypted
            this.app.vault.read(file).then((content) => {
                const encrypted = isEncrypted(content);

                if (encrypted && !EncryptedOverlay.hasOverlay(view)) {
                    EncryptedOverlay.addToView(view, file, () => this.decryptFile(file));
                } else if (!encrypted && EncryptedOverlay.hasOverlay(view)) {
                    EncryptedOverlay.removeFromView(view);
                }
            });
        }
    }

    // ======================================================================
    // Settings Update Handler
    // ======================================================================

    onunload() {
        // Clean up
        if (this.passwordStore) {
            this.passwordStore.clearAll();
        }
    }
}
