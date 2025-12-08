/**
 * Note Encryptor - Obsidian Plugin
 * Encrypt individual notes with AES-256-GCM encryption
 * 
 * @version 1.0.0
 * @license MIT
 */

import { App, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder } from 'obsidian';

// ============================================================================
// Constants
// ============================================================================

const CRYPTO_CONSTANTS = {
    ALGORITHM: 'AES-GCM',
    KEY_LENGTH: 256,
    SALT_LENGTH: 16,
    IV_LENGTH: 12,
    PBKDF2_ITERATIONS: 310000,
    ENCRYPTION_HEADER_START: '-----BEGIN ENCRYPTED NOTE-----',
    ENCRYPTION_HEADER_END: '-----END ENCRYPTED NOTE-----',
} as const;

// ============================================================================
// Types & Interfaces
// ============================================================================

interface NoteEncryptorSettings {
    encryptedNotePrefix: string;
    encryptedNoteSuffix: string;
    showPasswordStrength: boolean;
    passwordMinLength: number;
}

const DEFAULT_SETTINGS: NoteEncryptorSettings = {
    encryptedNotePrefix: '🔒 ',
    encryptedNoteSuffix: '',
    showPasswordStrength: true,
    passwordMinLength: 8,
};

interface PasswordStrength {
    score: number;
    percentage: number;
    text: string;
    color: string;
}

// ============================================================================
// Crypto Utilities
// ============================================================================

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: CRYPTO_CONSTANTS.PBKDF2_ITERATIONS,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: CRYPTO_CONSTANTS.ALGORITHM, length: CRYPTO_CONSTANTS.KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    );
}

async function encryptContent(content: string, password: string): Promise<string> {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(CRYPTO_CONSTANTS.SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(CRYPTO_CONSTANTS.IV_LENGTH));
    const key = await deriveKey(password, salt);

    const encrypted = await crypto.subtle.encrypt(
        { name: CRYPTO_CONSTANTS.ALGORITHM, iv: iv },
        key,
        encoder.encode(content)
    );

    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    const base64 = arrayBufferToBase64(combined.buffer);
    return `${CRYPTO_CONSTANTS.ENCRYPTION_HEADER_START}\n${base64}\n${CRYPTO_CONSTANTS.ENCRYPTION_HEADER_END}`;
}

async function decryptContent(encryptedContent: string, password: string): Promise<string> {
    // Extract base64 data
    const match = encryptedContent.match(
        new RegExp(`${escapeRegex(CRYPTO_CONSTANTS.ENCRYPTION_HEADER_START)}\\n([\\s\\S]+?)\\n${escapeRegex(CRYPTO_CONSTANTS.ENCRYPTION_HEADER_END)}`)
    );
    
    if (!match) {
        throw new Error('Invalid encrypted content format');
    }

    const combined = new Uint8Array(base64ToArrayBuffer(match[1]));
    const salt = combined.slice(0, CRYPTO_CONSTANTS.SALT_LENGTH);
    const iv = combined.slice(CRYPTO_CONSTANTS.SALT_LENGTH, CRYPTO_CONSTANTS.SALT_LENGTH + CRYPTO_CONSTANTS.IV_LENGTH);
    const data = combined.slice(CRYPTO_CONSTANTS.SALT_LENGTH + CRYPTO_CONSTANTS.IV_LENGTH);

    const key = await deriveKey(password, salt);
    
    const decrypted = await crypto.subtle.decrypt(
        { name: CRYPTO_CONSTANTS.ALGORITHM, iv: iv },
        key,
        data
    );

    return new TextDecoder().decode(decrypted);
}

function isEncrypted(content: string): boolean {
    return content.includes(CRYPTO_CONSTANTS.ENCRYPTION_HEADER_START) &&
           content.includes(CRYPTO_CONSTANTS.ENCRYPTION_HEADER_END);
}

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function calculatePasswordStrength(password: string): PasswordStrength {
    let score = 0;
    
    // Length scoring
    if (password.length >= 8) { score += 20; }
    if (password.length >= 12) { score += 15; }
    if (password.length >= 16) { score += 15; }
    
    // Character variety
    if (/[a-z]/.test(password)) { score += 10; }
    if (/[A-Z]/.test(password)) { score += 15; }
    if (/[0-9]/.test(password)) { score += 15; }
    if (/[^a-zA-Z0-9]/.test(password)) { score += 20; }
    
    // Bonus for mixing
    const types = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter(r => r.test(password)).length;
    if (types >= 3) { score += 10; }
    if (types === 4) { score += 10; }
    
    const percentage = Math.min(100, score);
    
    let text: string;
    let color: string;
    
    if (percentage < 30) {
        text = 'Weak';
        color = '#dc3545';
    } else if (percentage < 60) {
        text = 'Fair';
        color = '#ffc107';
    } else if (percentage < 80) {
        text = 'Good';
        color = '#28a745';
    } else {
        text = 'Strong';
        color = '#20c997';
    }
    
    return { score, percentage, text, color };
}

// ============================================================================
// Password Modal
// ============================================================================

class PasswordModal extends Modal {
    private password: string = '';
    private confirmPassword: string = '';
    private onSubmit: (password: string) => void;
    private isEncrypting: boolean;
    private showStrength: boolean;
    private minLength: number;

    constructor(
        app: App, 
        onSubmit: (password: string) => void, 
        isEncrypting: boolean,
        showStrength: boolean = true,
        minLength: number = 8
    ) {
        super(app);
        this.onSubmit = onSubmit;
        this.isEncrypting = isEncrypting;
        this.showStrength = showStrength;
        this.minLength = minLength;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('note-encryptor-modal');

        contentEl.createEl('h2', { 
            text: this.isEncrypting ? '🔒 Encrypt Note' : '🔓 Decrypt Note' 
        });

        // Password input
        const passwordContainer = contentEl.createDiv('password-container');
        passwordContainer.createEl('label', { text: 'Password' });
        
        const passwordInput = passwordContainer.createEl('input', {
            type: 'password',
            placeholder: 'Enter password'
        });
        passwordInput.addClass('password-input');

        // Strength indicator (for encryption only)
        let strengthBar: HTMLElement | null = null;
        let strengthText: HTMLElement | null = null;
        
        if (this.isEncrypting && this.showStrength) {
            const strengthContainer = contentEl.createDiv('strength-container');
            strengthBar = strengthContainer.createDiv('strength-bar');
            strengthText = strengthContainer.createDiv('strength-text');
            strengthText.textContent = 'Enter a password';
        }

        // Confirm password (for encryption only)
        let confirmInput: HTMLInputElement | null = null;
        if (this.isEncrypting) {
            const confirmContainer = contentEl.createDiv('password-container');
            confirmContainer.createEl('label', { text: 'Confirm Password' });
            confirmInput = confirmContainer.createEl('input', {
                type: 'password',
                placeholder: 'Confirm password'
            });
            confirmInput.addClass('password-input');
        }

        // Error message
        const errorEl = contentEl.createDiv('error-message');
        errorEl.style.display = 'none';

        // Buttons
        const buttonContainer = contentEl.createDiv('button-container');
        
        const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
        cancelBtn.onclick = () => this.close();

        const submitBtn = buttonContainer.createEl('button', { 
            text: this.isEncrypting ? 'Encrypt' : 'Decrypt' 
        });
        submitBtn.addClass('mod-cta');

        // Event handlers
        passwordInput.oninput = () => {
            this.password = passwordInput.value;
            if (strengthBar && strengthText && this.showStrength) {
                const strength = calculatePasswordStrength(this.password);
                strengthBar.style.width = `${strength.percentage}%`;
                strengthBar.style.backgroundColor = strength.color;
                strengthText.textContent = this.password ? strength.text : 'Enter a password';
                strengthText.style.color = strength.color;
            }
        };

        if (confirmInput) {
            confirmInput.oninput = () => {
                this.confirmPassword = confirmInput!.value;
            };
        }

        submitBtn.onclick = () => {
            errorEl.style.display = 'none';

            if (this.password.length < this.minLength) {
                errorEl.textContent = `Password must be at least ${this.minLength} characters`;
                errorEl.style.display = 'block';
                return;
            }

            if (this.isEncrypting && this.password !== this.confirmPassword) {
                errorEl.textContent = 'Passwords do not match';
                errorEl.style.display = 'block';
                return;
            }

            this.onSubmit(this.password);
            this.close();
        };

        // Enter key support
        const handleEnter = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                submitBtn.click();
            }
        };
        passwordInput.onkeydown = handleEnter;
        if (confirmInput) {
            confirmInput.onkeydown = handleEnter;
        }

        passwordInput.focus();
        this.addStyles();
    }

    onClose() {
        // Clear password from memory
        this.password = '';
        this.confirmPassword = '';
        this.contentEl.empty();
    }

    private addStyles() {
        const styleId = 'note-encryptor-modal-styles';
        if (document.getElementById(styleId)) { return; }

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .note-encryptor-modal {
                padding: 20px;
            }
            .note-encryptor-modal h2 {
                margin-bottom: 20px;
            }
            .password-container {
                margin-bottom: 16px;
            }
            .password-container label {
                display: block;
                margin-bottom: 6px;
                font-weight: 500;
            }
            .password-input {
                width: 100%;
                padding: 10px;
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
                background: var(--background-primary);
                color: var(--text-normal);
                font-size: 14px;
            }
            .strength-container {
                margin-bottom: 16px;
            }
            .strength-bar {
                height: 4px;
                width: 0;
                background: #dc3545;
                border-radius: 2px;
                transition: all 0.3s ease;
                margin-bottom: 4px;
            }
            .strength-text {
                font-size: 12px;
                color: var(--text-muted);
            }
            .error-message {
                color: #dc3545;
                font-size: 13px;
                margin-bottom: 16px;
            }
            .button-container {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
            }
        `;
        document.head.appendChild(style);
    }
}

// ============================================================================
// Folder Selection Modal
// ============================================================================

class FolderSelectionModal extends Modal {
    private onChoose: (folder: TFolder) => void;

    constructor(app: App, onChoose: (folder: TFolder) => void) {
        super(app);
        this.onChoose = onChoose;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('folder-selection-modal');

        contentEl.createEl('h2', { text: 'Select Folder' });

        const folderList = contentEl.createDiv({ cls: 'folder-list' });
        folderList.style.maxHeight = '400px';
        folderList.style.overflowY = 'auto';

        const folders = this.getAllFolders();
        
        if (folders.length === 0) {
            folderList.createEl('p', { text: 'No folders found in vault' });
            return;
        }

        for (const folder of folders) {
            const folderItem = folderList.createDiv({ cls: 'folder-item' });
            folderItem.style.padding = '8px 12px';
            folderItem.style.cursor = 'pointer';
            folderItem.style.borderRadius = '4px';
            
            folderItem.createSpan({ text: '📁 ' });
            folderItem.createSpan({ text: folder.path || '/' });
            
            folderItem.addEventListener('mouseenter', () => {
                folderItem.style.backgroundColor = 'var(--background-modifier-hover)';
            });
            folderItem.addEventListener('mouseleave', () => {
                folderItem.style.backgroundColor = '';
            });
            folderItem.addEventListener('click', () => {
                this.close();
                this.onChoose(folder);
            });
        }
    }

    private getAllFolders(): TFolder[] {
        const folders: TFolder[] = [];
        const rootFolder = this.app.vault.getRoot();
        
        const collectFolders = (folder: TFolder) => {
            folders.push(folder);
            for (const child of folder.children) {
                if (child instanceof TFolder) {
                    collectFolders(child);
                }
            }
        };
        
        collectFolders(rootFolder);
        return folders.sort((a, b) => a.path.localeCompare(b.path));
    }

    onClose() {
        this.contentEl.empty();
    }
}

// ============================================================================
// Settings Tab
// ============================================================================

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

        // Visual Settings
        new Setting(containerEl)
            .setName('Encrypted note prefix')
            .setDesc('Prefix added to encrypted note filenames')
            .addText(text => text
                .setPlaceholder('🔒 ')
                .setValue(this.plugin.settings.encryptedNotePrefix)
                .onChange(async (value) => {
                    this.plugin.settings.encryptedNotePrefix = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Encrypted note suffix')
            .setDesc('Suffix added to encrypted note filenames (optional)')
            .addText(text => text
                .setPlaceholder('')
                .setValue(this.plugin.settings.encryptedNoteSuffix)
                .onChange(async (value) => {
                    this.plugin.settings.encryptedNoteSuffix = value;
                    await this.plugin.saveSettings();
                }));

        // Security Settings
        containerEl.createEl('h3', { text: 'Security' });

        new Setting(containerEl)
            .setName('Minimum password length')
            .setDesc('Minimum characters required for passwords')
            .addSlider(slider => slider
                .setLimits(6, 24, 1)
                .setValue(this.plugin.settings.passwordMinLength)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.passwordMinLength = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Show password strength')
            .setDesc('Display password strength indicator when encrypting')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showPasswordStrength)
                .onChange(async (value) => {
                    this.plugin.settings.showPasswordStrength = value;
                    await this.plugin.saveSettings();
                }));

        // Security Info
        containerEl.createEl('h3', { text: 'About' });
        
        const infoEl = containerEl.createDiv('security-info');
        infoEl.innerHTML = `
            <p><strong>Encryption:</strong> AES-256-GCM with PBKDF2 key derivation</p>
            <p><strong>Iterations:</strong> 310,000 (OWASP recommended)</p>
            <p><strong>Security:</strong> Your password is never stored. Each encryption uses a unique random salt and IV.</p>
            <p style="color: var(--text-warning); margin-top: 12px;">
                ⚠️ <strong>Important:</strong> There is no way to recover an encrypted note without the correct password.
            </p>
        `;
        infoEl.style.cssText = 'padding: 12px; background: var(--background-secondary); border-radius: 6px; font-size: 13px; line-height: 1.6;';
    }
}

// ============================================================================
// Main Plugin
// ============================================================================

export default class NoteEncryptorPlugin extends Plugin {
    settings: NoteEncryptorSettings = DEFAULT_SETTINGS;

    async onload() {
        await this.loadSettings();

        // Right-click context menu for files
        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                if (file instanceof TFile && file.extension === 'md') {
                    menu.addItem((item) => {
                        item.setTitle('🔐 Encrypt note')
                            .setIcon('lock')
                            .onClick(async () => {
                                const content = await this.app.vault.read(file);
                                if (isEncrypted(content)) {
                                    new Notice('Note is already encrypted');
                                    return;
                                }
                                this.encryptFile(file);
                            });
                    });
                    
                    menu.addItem((item) => {
                        item.setTitle('🔓 Decrypt note')
                            .setIcon('unlock')
                            .onClick(async () => {
                                const content = await this.app.vault.read(file);
                                if (!isEncrypted(content)) {
                                    new Notice('Note is not encrypted');
                                    return;
                                }
                                this.decryptFile(file);
                            });
                    });
                }
                
                if (file instanceof TFolder) {
                    menu.addItem((item) => {
                        item.setTitle('🔐 Encrypt folder')
                            .setIcon('lock')
                            .onClick(() => this.encryptSpecificDirectory(file));
                    });
                    
                    menu.addItem((item) => {
                        item.setTitle('🔓 Decrypt folder')
                            .setIcon('unlock')
                            .onClick(() => this.decryptSpecificDirectory(file));
                    });
                }
            })
        );

        // Commands
        this.addCommand({
            id: 'encrypt-note',
            name: 'Encrypt current note',
            checkCallback: (checking: boolean) => {
                const file = this.app.workspace.getActiveFile();
                if (file) {
                    if (!checking) {
                        this.encryptCurrentNote();
                    }
                    return true;
                }
                return false;
            }
        });

        this.addCommand({
            id: 'decrypt-note',
            name: 'Decrypt current note',
            checkCallback: (checking: boolean) => {
                const file = this.app.workspace.getActiveFile();
                if (file) {
                    if (!checking) {
                        this.decryptCurrentNote();
                    }
                    return true;
                }
                return false;
            }
        });

        this.addCommand({
            id: 'toggle-encryption',
            name: 'Toggle encryption (encrypt or decrypt)',
            checkCallback: (checking: boolean) => {
                const file = this.app.workspace.getActiveFile();
                if (file) {
                    if (!checking) {
                        this.toggleEncryption();
                    }
                    return true;
                }
                return false;
            }
        });

        this.addCommand({
            id: 'encrypt-directory',
            name: 'Encrypt all notes in a folder',
            callback: () => this.encryptDirectory()
        });

        this.addCommand({
            id: 'decrypt-directory',
            name: 'Decrypt all notes in a folder',
            callback: () => this.decryptDirectory()
        });

        // Settings tab
        this.addSettingTab(new NoteEncryptorSettingTab(this.app, this));
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async toggleEncryption() {
        const file = this.app.workspace.getActiveFile();
        if (!file) {
            new Notice('No active note');
            return;
        }

        const content = await this.app.vault.read(file);
        
        if (isEncrypted(content)) {
            this.decryptCurrentNote();
        } else {
            this.encryptCurrentNote();
        }
    }

    async encryptCurrentNote() {
        const file = this.app.workspace.getActiveFile();
        if (!file) {
            new Notice('No active note');
            return;
        }

        const content = await this.app.vault.read(file);
        
        if (isEncrypted(content)) {
            new Notice('Note is already encrypted');
            return;
        }

        if (!content.trim()) {
            new Notice('Cannot encrypt empty note');
            return;
        }

        new PasswordModal(
            this.app,
            async (password: string) => {
                try {
                    const encrypted = await encryptContent(content, password);
                    await this.app.vault.modify(file, encrypted);
                    
                    // Rename file with prefix/suffix
                    await this.renameEncryptedFile(file, true);
                    
                    new Notice('Note encrypted successfully');
                } catch (error) {
                    console.error('Encryption failed:', error);
                    new Notice('Encryption failed. Please try again.');
                }
            },
            true,
            this.settings.showPasswordStrength,
            this.settings.passwordMinLength
        ).open();
    }

    async decryptCurrentNote() {
        const file = this.app.workspace.getActiveFile();
        if (!file) {
            new Notice('No active note');
            return;
        }

        const content = await this.app.vault.read(file);
        
        if (!isEncrypted(content)) {
            new Notice('Note is not encrypted');
            return;
        }

        new PasswordModal(
            this.app,
            async (password: string) => {
                try {
                    const decrypted = await decryptContent(content, password);
                    await this.app.vault.modify(file, decrypted);
                    
                    // Rename file without prefix/suffix
                    await this.renameEncryptedFile(file, false);
                    
                    new Notice('Note decrypted successfully');
                } catch (error) {
                    console.error('Decryption failed:', error);
                    new Notice('Decryption failed. Wrong password?');
                }
            },
            false,
            false,
            this.settings.passwordMinLength
        ).open();
    }

    async encryptDirectory() {
        new FolderSelectionModal(this.app, async (folder: TFolder) => {
            const files = this.getMarkdownFiles(folder);
            const unencryptedFiles: TFile[] = [];
            
            for (const file of files) {
                const content = await this.app.vault.read(file);
                if (!isEncrypted(content)) {
                    unencryptedFiles.push(file);
                }
            }
            
            if (unencryptedFiles.length === 0) {
                new Notice('No unencrypted notes found in this folder');
                return;
            }
            
            new PasswordModal(
                this.app,
                async (password: string) => {
                    let successCount = 0;
                    let failCount = 0;
                    
                    for (const file of unencryptedFiles) {
                        try {
                            const content = await this.app.vault.read(file);
                            const encrypted = await encryptContent(content, password);
                            
                            await this.app.vault.modify(file, encrypted);
                            await this.renameEncryptedFile(file, true);
                            successCount++;
                        } catch (error) {
                            console.error(`Failed to encrypt ${file.path}:`, error);
                            failCount++;
                        }
                    }
                    
                    new Notice(`Encrypted ${successCount} notes` + (failCount > 0 ? `, ${failCount} failed` : ''));
                },
                true,
                this.settings.showPasswordStrength,
                this.settings.passwordMinLength
            ).open();
        }).open();
    }

    async decryptDirectory() {
        new FolderSelectionModal(this.app, async (folder: TFolder) => {
            const files = this.getMarkdownFiles(folder);
            const encryptedFiles: TFile[] = [];
            
            for (const file of files) {
                const content = await this.app.vault.read(file);
                if (isEncrypted(content)) {
                    encryptedFiles.push(file);
                }
            }
            
            if (encryptedFiles.length === 0) {
                new Notice('No encrypted notes found in this folder');
                return;
            }
            
            new PasswordModal(
                this.app,
                async (password: string) => {
                    let successCount = 0;
                    let failCount = 0;
                    
                    for (const file of encryptedFiles) {
                        try {
                            const content = await this.app.vault.read(file);
                            const decrypted = await decryptContent(content, password);
                            await this.app.vault.modify(file, decrypted);
                            await this.renameEncryptedFile(file, false);
                            successCount++;
                        } catch (error) {
                            console.error(`Failed to decrypt ${file.path}:`, error);
                            failCount++;
                        }
                    }
                    
                    new Notice(`Decrypted ${successCount} notes` + (failCount > 0 ? `, ${failCount} failed` : ''));
                },
                false,
                false,
                this.settings.passwordMinLength
            ).open();
        }).open();
    }

    // Encrypt a specific file (from context menu)
    private encryptFile(file: TFile) {
        new PasswordModal(
            this.app,
            async (password: string) => {
                try {
                    const content = await this.app.vault.read(file);
                    const encrypted = await encryptContent(content, password);
                    await this.app.vault.modify(file, encrypted);
                    await this.renameEncryptedFile(file, true);
                    new Notice('Note encrypted successfully');
                } catch (error) {
                    console.error('Encryption failed:', error);
                    new Notice('Encryption failed');
                }
            },
            true,
            this.settings.showPasswordStrength,
            this.settings.passwordMinLength
        ).open();
    }

    // Decrypt a specific file (from context menu)
    private decryptFile(file: TFile) {
        new PasswordModal(
            this.app,
            async (password: string) => {
                try {
                    const content = await this.app.vault.read(file);
                    const decrypted = await decryptContent(content, password);
                    await this.app.vault.modify(file, decrypted);
                    await this.renameEncryptedFile(file, false);
                    new Notice('Note decrypted successfully');
                } catch (error) {
                    console.error('Decryption failed:', error);
                    new Notice('Decryption failed. Wrong password?');
                }
            },
            false,
            false,
            this.settings.passwordMinLength
        ).open();
    }

    // Encrypt a specific folder (from context menu)
    private encryptSpecificDirectory(folder: TFolder) {
        const files = this.getMarkdownFiles(folder);
        const unencryptedFiles: TFile[] = [];
        
        (async () => {
            for (const file of files) {
                const content = await this.app.vault.read(file);
                if (!isEncrypted(content)) {
                    unencryptedFiles.push(file);
                }
            }
            
            if (unencryptedFiles.length === 0) {
                new Notice('No unencrypted notes found in this folder');
                return;
            }
            
            new PasswordModal(
                this.app,
                async (password: string) => {
                    let successCount = 0;
                    let failCount = 0;
                    
                    for (const file of unencryptedFiles) {
                        try {
                            const content = await this.app.vault.read(file);
                            const encrypted = await encryptContent(content, password);
                            
                            await this.app.vault.modify(file, encrypted);
                            await this.renameEncryptedFile(file, true);
                            successCount++;
                        } catch (error) {
                            console.error(`Failed to encrypt ${file.path}:`, error);
                            failCount++;
                        }
                    }
                    
                    new Notice(`Encrypted ${successCount} notes` + (failCount > 0 ? `, ${failCount} failed` : ''));
                },
                true,
                this.settings.showPasswordStrength,
                this.settings.passwordMinLength
            ).open();
        })();
    }

    // Decrypt a specific folder (from context menu)
    private decryptSpecificDirectory(folder: TFolder) {
        const files = this.getMarkdownFiles(folder);
        const encryptedFiles: TFile[] = [];
        
        (async () => {
            for (const file of files) {
                const content = await this.app.vault.read(file);
                if (isEncrypted(content)) {
                    encryptedFiles.push(file);
                }
            }
            
            if (encryptedFiles.length === 0) {
                new Notice('No encrypted notes found in this folder');
                return;
            }
            
            new PasswordModal(
                this.app,
                async (password: string) => {
                    let successCount = 0;
                    let failCount = 0;
                    
                    for (const file of encryptedFiles) {
                        try {
                            const content = await this.app.vault.read(file);
                            const decrypted = await decryptContent(content, password);
                            await this.app.vault.modify(file, decrypted);
                            await this.renameEncryptedFile(file, false);
                            successCount++;
                        } catch (error) {
                            console.error(`Failed to decrypt ${file.path}:`, error);
                            failCount++;
                        }
                    }
                    
                    new Notice(`Decrypted ${successCount} notes` + (failCount > 0 ? `, ${failCount} failed` : ''));
                },
                false,
                false,
                this.settings.passwordMinLength
            ).open();
        })();
    }

    private getMarkdownFiles(folder: TFolder): TFile[] {
        const files: TFile[] = [];
        
        const processFolder = (f: TFolder) => {
            for (const child of f.children) {
                if (child instanceof TFile && child.extension === 'md') {
                    files.push(child);
                } else if (child instanceof TFolder) {
                    processFolder(child);
                }
            }
        };
        
        processFolder(folder);
        return files;
    }

    private async renameEncryptedFile(file: TFile, encrypting: boolean) {
        const prefix = this.settings.encryptedNotePrefix;
        const suffix = this.settings.encryptedNoteSuffix;
        
        if (!prefix && !suffix) { return; }

        const baseName = file.basename;
        const extension = file.extension;
        const folder = file.parent?.path || '';
        
        let newName: string;
        
        if (encrypting) {
            newName = `${prefix}${baseName}${suffix}`;
        } else {
            newName = baseName;
            if (prefix && newName.startsWith(prefix)) {
                newName = newName.slice(prefix.length);
            }
            if (suffix && newName.endsWith(suffix)) {
                newName = newName.slice(0, -suffix.length);
            }
        }

        const newPath = folder ? `${folder}/${newName}.${extension}` : `${newName}.${extension}`;
        
        if (newPath !== file.path) {
            try {
                await this.app.fileManager.renameFile(file, newPath);
            } catch (error) {
                console.error('Failed to rename file:', error);
            }
        }
    }
}
