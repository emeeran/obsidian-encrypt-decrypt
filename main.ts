/**
 * Note Encryptor - Obsidian Plugin
 * Encrypt individual notes with AES-256-GCM encryption
 * 
 * @version 1.0.0
 * @license MIT
 */

import { App, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder } from 'obsidian';

// ======================================================================
// Constants
// ======================================================================

const CRYPTO_CONSTANTS = {
    ALGORITHM: 'AES-GCM',
    KEY_LENGTH: 256,
    SALT_LENGTH: 16,
    IV_LENGTH: 12,
    PBKDF2_ITERATIONS: 310000,
    ENCRYPTION_HEADER_START: '-----BEGIN ENCRYPTED NOTE-----',
    ENCRYPTION_HEADER_END: '-----END ENCRYPTED NOTE-----',
} as const;

// ======================================================================
// Types & Interfaces
// ======================================================================

interface NoteEncryptorSettings {
    encryptedNotePrefix: string;
    encryptedNoteSuffix: string;
    showPasswordStrength: boolean;
    passwordMinLength: number;
    hideEncryptedContent: boolean;
}

const DEFAULT_SETTINGS: NoteEncryptorSettings = {
    encryptedNotePrefix: '🔒 ',
    encryptedNoteSuffix: '',
    showPasswordStrength: true,
    passwordMinLength: 8,
    hideEncryptedContent: true,
};

interface PasswordStrength {
    score: number;
    percentage: number;
    text: string;
    color: string;
}

// ======================================================================
// Crypto Utilities
// ======================================================================

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

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    const base64 = arrayBufferToBase64(combined.buffer);
    return `${CRYPTO_CONSTANTS.ENCRYPTION_HEADER_START}\n${base64}\n${CRYPTO_CONSTANTS.ENCRYPTION_HEADER_END}`;
}

async function decryptContent(encryptedContent: string, password: string): Promise<string> {
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

function calculatePasswordStrength(password: string): PasswordStrength {
    let score = 0;
    
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 15;
    if (password.length >= 16) score += 15;
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^a-zA-Z0-9]/.test(password)) score += 20;
    
    const types = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter(r => r.test(password)).length;
    if (types >= 3) score += 10;
    if (types === 4) score += 10;
    
    const percentage = Math.min(100, score);
    
    let text: string, color: string;
    if (percentage < 30) { text = 'Weak'; color = '#dc3545'; }
    else if (percentage < 60) { text = 'Fair'; color = '#ffc107'; }
    else if (percentage < 80) { text = 'Good'; color = '#28a745'; }
    else { text = 'Strong'; color = '#20c997'; }
    
    return { score, percentage, text, color };
}

// ======================================================================
// Password Modal
// ======================================================================

class PasswordModal extends Modal {
    private password = '';
    private confirmPassword = '';
    private onSubmit: (password: string) => void;
    private isEncrypting: boolean;
    private showStrength: boolean;
    private minLength: number;

    constructor(app: App, onSubmit: (password: string) => void, isEncrypting: boolean, showStrength = true, minLength = 8) {
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

        contentEl.createEl('h2', { text: this.isEncrypting ? '🔒 Encrypt Note' : '🔓 Decrypt Note' });
        
        const passwordContainer = contentEl.createDiv('password-container');
        passwordContainer.createEl('label', { text: 'Password' });
        const passwordInput = passwordContainer.createEl('input', { type: 'password', placeholder: 'Enter password' });
        passwordInput.addClass('password-input');

        let strengthBar: HTMLElement | null = null;
        let strengthText: HTMLElement | null = null;
        
        if (this.isEncrypting && this.showStrength) {
            const strengthContainer = contentEl.createDiv('strength-container');
            strengthBar = strengthContainer.createDiv('strength-bar');
            strengthText = strengthContainer.createDiv('strength-text');
            strengthText.textContent = 'Enter a password';
        }

        let confirmInput: HTMLInputElement | null = null;
        if (this.isEncrypting) {
            const confirmContainer = contentEl.createDiv('password-container');
            confirmContainer.createEl('label', { text: 'Confirm Password' });
            confirmInput = confirmContainer.createEl('input', { type: 'password', placeholder: 'Confirm password' });
            confirmInput.addClass('password-input');
        }

        const errorEl = contentEl.createDiv('error-message');
        errorEl.style.display = 'none';

        const buttonContainer = contentEl.createDiv('button-container');
        const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
        cancelBtn.onclick = () => this.close();

        const submitBtn = buttonContainer.createEl('button', { text: this.isEncrypting ? 'Encrypt' : 'Decrypt' });
        submitBtn.addClass('mod-cta');

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
            confirmInput.oninput = () => { this.confirmPassword = confirmInput!.value; };
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

        const handleEnter = (e: KeyboardEvent) => { if (e.key === 'Enter') submitBtn.click(); };
        passwordInput.onkeydown = handleEnter;
        if (confirmInput) confirmInput.onkeydown = handleEnter;

        passwordInput.focus();
        this.addStyles();
    }

    onClose() {
        this.password = '';
        this.confirmPassword = '';
        this.contentEl.empty();
    }

    private addStyles() {
        if (document.getElementById('note-encryptor-modal-styles')) return;
        const style = document.createElement('style');
        style.id = 'note-encryptor-modal-styles';
        style.textContent = `
            .note-encryptor-modal { padding: 20px; }
            .note-encryptor-modal h2 { margin-bottom: 20px; }
            .password-container { margin-bottom: 16px; }
            .password-container label { display: block; margin-bottom: 6px; font-weight: 500; }
            .password-input { width: 100%; padding: 10px; border: 1px solid var(--background-modifier-border); border-radius: 4px; background: var(--background-primary); color: var(--text-normal); font-size: 14px; }
            .strength-container { margin-bottom: 16px; }
            .strength-bar { height: 4px; width: 0; background: #dc3545; border-radius: 2px; transition: all 0.3s ease; margin-bottom: 4px; }
            .strength-text { font-size: 12px; color: var(--text-muted); }
            .error-message { color: #dc3545; font-size: 13px; margin-bottom: 16px; }
            .button-container { display: flex; justify-content: flex-end; gap: 10px; }
        `;
        document.head.appendChild(style);
    }
}

// ======================================================================
// Folder Selection Modal
// ======================================================================

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
            folderItem.style.cssText = 'padding: 8px 12px; cursor: pointer; border-radius: 4px;';
            folderItem.createSpan({ text: '📁 ' });
            folderItem.createSpan({ text: folder.path || '/' });
            
            folderItem.addEventListener('mouseenter', () => { folderItem.style.backgroundColor = 'var(--background-modifier-hover)'; });
            folderItem.addEventListener('mouseleave', () => { folderItem.style.backgroundColor = ''; });
            folderItem.addEventListener('click', () => { this.close(); this.onChoose(folder); });
        }
    }

    private getAllFolders(): TFolder[] {
        const folders: TFolder[] = [];
        const collectFolders = (folder: TFolder) => {
            folders.push(folder);
            for (const child of folder.children) {
                if (child instanceof TFolder) collectFolders(child);
            }
        };
        collectFolders(this.app.vault.getRoot());
        return folders.sort((a, b) => a.path.localeCompare(b.path));
    }

    onClose() { this.contentEl.empty(); }
}

// ======================================================================
// Settings Tab
// ======================================================================

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

        new Setting(containerEl)
            .setName('Encrypted note prefix')
            .setDesc('Prefix added to encrypted note filenames')
            .addText(text => text.setPlaceholder('🔒 ').setValue(this.plugin.settings.encryptedNotePrefix)
                .onChange(async (value) => { this.plugin.settings.encryptedNotePrefix = value; await this.plugin.saveSettings(); }));

        new Setting(containerEl)
            .setName('Encrypted note suffix')
            .setDesc('Suffix added to encrypted note filenames (optional)')
            .addText(text => text.setPlaceholder('').setValue(this.plugin.settings.encryptedNoteSuffix)
                .onChange(async (value) => { this.plugin.settings.encryptedNoteSuffix = value; await this.plugin.saveSettings(); }));

        containerEl.createEl('h3', { text: 'Security' });

        new Setting(containerEl)
            .setName('Minimum password length')
            .setDesc('Minimum characters required for passwords')
            .addSlider(slider => slider.setLimits(6, 24, 1).setValue(this.plugin.settings.passwordMinLength).setDynamicTooltip()
                .onChange(async (value) => { this.plugin.settings.passwordMinLength = value; await this.plugin.saveSettings(); }));

        new Setting(containerEl)
            .setName('Show password strength')
            .setDesc('Display password strength indicator when encrypting')
            .addToggle(toggle => toggle.setValue(this.plugin.settings.showPasswordStrength)
                .onChange(async (value) => { this.plugin.settings.showPasswordStrength = value; await this.plugin.saveSettings(); }));

        new Setting(containerEl)
            .setName('Hide encrypted content')
            .setDesc('Hide the encrypted content in the editor and show a lock screen instead')
            .addToggle(toggle => toggle.setValue(this.plugin.settings.hideEncryptedContent)
                .onChange(async (value) => { 
                    this.plugin.settings.hideEncryptedContent = value; 
                    await this.plugin.saveSettings(); 
                    this.plugin.updateEncryptedViews(); 
                }));

        containerEl.createEl('h3', { text: 'About' });
        const infoEl = containerEl.createDiv('security-info');
        infoEl.innerHTML = `
            <p><strong>Encryption:</strong> AES-256-GCM with PBKDF2 key derivation</p>
            <p><strong>Iterations:</strong> 310,000 (OWASP recommended)</p>
            <p><strong>Security:</strong> Your password is never stored. Each encryption uses a unique random salt and IV.</p>
            <p style="color: var(--text-warning); margin-top: 12px;">⚠️ <strong>Important:</strong> There is no way to recover an encrypted note without the correct password.</p>
        `;
        infoEl.style.cssText = 'padding: 12px; background: var(--background-secondary); border-radius: 6px; font-size: 13px; line-height: 1.6;';
    }
}

// ======================================================================
// Main Plugin
// ======================================================================

export default class NoteEncryptorPlugin extends Plugin {
    settings: NoteEncryptorSettings = DEFAULT_SETTINGS;

    async onload() {
        await this.loadSettings();
        this.addEncryptedOverlayStyles();

        // Context menu for files and folders
        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                if (file instanceof TFile && file.extension === 'md') {
                    menu.addItem((item) => item.setTitle('🔐 Encrypt note').setIcon('lock')
                        .onClick(() => this.encryptFile(file)));
                    menu.addItem((item) => item.setTitle('🔓 Decrypt note').setIcon('unlock')
                        .onClick(() => this.decryptFile(file)));
                }
                if (file instanceof TFolder) {
                    menu.addItem((item) => item.setTitle('🔐 Encrypt folder').setIcon('lock')
                        .onClick(() => this.processFolder(file, true)));
                    menu.addItem((item) => item.setTitle('🔓 Decrypt folder').setIcon('unlock')
                        .onClick(() => this.processFolder(file, false)));
                }
            })
        );

        // Commands
        this.addCommand({
            id: 'encrypt-note',
            name: 'Encrypt current note',
            checkCallback: (checking) => {
                const file = this.app.workspace.getActiveFile();
                if (file) { if (!checking) this.encryptFile(file); return true; }
                return false;
            }
        });

        this.addCommand({
            id: 'decrypt-note',
            name: 'Decrypt current note',
            checkCallback: (checking) => {
                const file = this.app.workspace.getActiveFile();
                if (file) { if (!checking) this.decryptFile(file); return true; }
                return false;
            }
        });

        this.addCommand({
            id: 'toggle-encryption',
            name: 'Toggle encryption (encrypt or decrypt)',
            checkCallback: (checking) => {
                const file = this.app.workspace.getActiveFile();
                if (file) { if (!checking) this.toggleEncryption(file); return true; }
                return false;
            }
        });

        this.addCommand({
            id: 'encrypt-directory',
            name: 'Encrypt all notes in a folder',
            callback: () => new FolderSelectionModal(this.app, (folder) => this.processFolder(folder, true)).open()
        });

        this.addCommand({
            id: 'decrypt-directory',
            name: 'Decrypt all notes in a folder',
            callback: () => new FolderSelectionModal(this.app, (folder) => this.processFolder(folder, false)).open()
        });

        this.addSettingTab(new NoteEncryptorSettingTab(this.app, this));

        // Register event to check for encrypted content when switching files
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', () => {
                this.updateEncryptedViews();
            })
        );

        // Also check when file is modified
        this.registerEvent(
            this.app.vault.on('modify', (file) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile && file.path === activeFile.path) {
                    setTimeout(() => this.updateEncryptedViews(), 100);
                }
            })
        );

        // Initial check when layout is ready
        this.app.workspace.onLayoutReady(() => {
            this.updateEncryptedViews();
        });
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    // ======================================================================
    // Encrypted Content Overlay
    // ======================================================================

    private addEncryptedOverlayStyles() {
        if (document.getElementById('note-encryptor-overlay-styles')) return;
        const style = document.createElement('style');
        style.id = 'note-encryptor-overlay-styles';
        style.textContent = `
            .encrypted-content-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: var(--background-primary);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 100;
                gap: 16px;
            }
            .encrypted-lock-icon {
                color: var(--text-muted);
                opacity: 0.6;
            }
            .encrypted-lock-icon svg {
                width: 64px;
                height: 64px;
            }
            .encrypted-message {
                font-size: 1.4em;
                font-weight: 600;
                color: var(--text-normal);
            }
            .encrypted-filename {
                font-size: 0.95em;
                color: var(--text-muted);
                max-width: 80%;
                text-align: center;
                word-break: break-word;
            }
            .encrypted-decrypt-btn {
                margin-top: 16px;
                padding: 10px 24px;
                font-size: 14px;
                font-weight: 500;
                background: var(--interactive-accent);
                color: var(--text-on-accent);
                border: none;
                border-radius: 6px;
                cursor: pointer;
                transition: background 0.15s ease;
            }
            .encrypted-decrypt-btn:hover {
                background: var(--interactive-accent-hover);
            }
        `;
        document.head.appendChild(style);
    }

    updateEncryptedViews() {
        const leaves = this.app.workspace.getLeavesOfType('markdown');
        
        for (const leaf of leaves) {
            const view = leaf.view as MarkdownView;
            const container = view.containerEl;
            const contentContainer = container.querySelector('.cm-editor') as HTMLElement || 
                                     container.querySelector('.markdown-preview-view') as HTMLElement;
            
            if (!contentContainer) continue;
            
            const parentEl = contentContainer.parentElement;
            if (!parentEl) continue;
            
            const existingOverlay = parentEl.querySelector('.encrypted-content-overlay');
            
            if (!this.settings.hideEncryptedContent) {
                existingOverlay?.remove();
                continue;
            }

            const file = view.file;
            if (!file) {
                existingOverlay?.remove();
                continue;
            }

            // Read file content to check if encrypted
            this.app.vault.read(file).then(content => {
                const encrypted = isEncrypted(content);
                
                if (encrypted && !existingOverlay) {
                    this.addEncryptedOverlay(parentEl as HTMLElement, file);
                } else if (!encrypted && existingOverlay) {
                    existingOverlay.remove();
                }
            });
        }
    }

    private addEncryptedOverlay(container: HTMLElement, file: TFile) {
        // Remove any existing overlay first
        container.querySelector('.encrypted-content-overlay')?.remove();

        const overlay = document.createElement('div');
        overlay.className = 'encrypted-content-overlay';
        
        const lockIcon = document.createElement('div');
        lockIcon.className = 'encrypted-lock-icon';
        lockIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
        overlay.appendChild(lockIcon);
        
        const message = document.createElement('div');
        message.className = 'encrypted-message';
        message.textContent = 'This note is encrypted';
        overlay.appendChild(message);
        
        const filename = document.createElement('div');
        filename.className = 'encrypted-filename';
        filename.textContent = file.basename;
        overlay.appendChild(filename);
        
        const decryptBtn = document.createElement('button');
        decryptBtn.className = 'encrypted-decrypt-btn';
        decryptBtn.textContent = '🔓 Decrypt to view';
        decryptBtn.onclick = () => {
            this.decryptFile(file);
        };
        overlay.appendChild(decryptBtn);

        container.style.position = 'relative';
        container.appendChild(overlay);
    }

    // ======================================================================
    // Core Methods
    // ======================================================================

    private async toggleEncryption(file: TFile) {
        const content = await this.app.vault.read(file);
        if (isEncrypted(content)) {
            this.decryptFile(file);
        } else {
            this.encryptFile(file);
        }
    }

    private async encryptFile(file: TFile) {
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
            async (password) => {
                try {
                    const encrypted = await encryptContent(content, password);
                    await this.app.vault.modify(file, encrypted);
                    await this.renameFile(file, true);
                    new Notice('Note encrypted successfully');
                    setTimeout(() => this.updateEncryptedViews(), 100);
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

    private async decryptFile(file: TFile) {
        const content = await this.app.vault.read(file);
        
        if (!isEncrypted(content)) {
            new Notice('Note is not encrypted');
            return;
        }

        new PasswordModal(
            this.app,
            async (password) => {
                try {
                    const decrypted = await decryptContent(content, password);
                    await this.app.vault.modify(file, decrypted);
                    await this.renameFile(file, false);
                    new Notice('Note decrypted successfully');
                    setTimeout(() => this.updateEncryptedViews(), 100);
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

    private async processFolder(folder: TFolder, encrypting: boolean) {
        const files = this.getMarkdownFiles(folder);
        const targetFiles: TFile[] = [];
        
        for (const file of files) {
            const content = await this.app.vault.read(file);
            const encrypted = isEncrypted(content);
            if (encrypting ? !encrypted : encrypted) {
                targetFiles.push(file);
            }
        }
        
        if (targetFiles.length === 0) {
            new Notice(`No ${encrypting ? 'unencrypted' : 'encrypted'} notes found in this folder`);
            return;
        }

        new PasswordModal(
            this.app,
            async (password) => {
                let success = 0, fail = 0;
                
                for (const file of targetFiles) {
                    try {
                        const content = await this.app.vault.read(file);
                        // Double-check state hasn't changed
                        if (encrypting === isEncrypted(content)) continue;
                        
                        const result = encrypting 
                            ? await encryptContent(content, password)
                            : await decryptContent(content, password);
                        
                        await this.app.vault.modify(file, result);
                        await this.renameFile(file, encrypting);
                        success++;
                    } catch (error) {
                        console.error(`Failed to ${encrypting ? 'encrypt' : 'decrypt'} ${file.path}:`, error);
                        fail++;
                    }
                }
                
                new Notice(`${encrypting ? 'Encrypted' : 'Decrypted'} ${success} notes${fail > 0 ? `, ${fail} failed` : ''}`);
                setTimeout(() => this.updateEncryptedViews(), 100);
            },
            encrypting,
            encrypting && this.settings.showPasswordStrength,
            this.settings.passwordMinLength
        ).open();
    }

    // ======================================================================
    // Helpers
    // ======================================================================

    private getMarkdownFiles(folder: TFolder): TFile[] {
        const files: TFile[] = [];
        const collect = (f: TFolder) => {
            for (const child of f.children) {
                if (child instanceof TFile && child.extension === 'md') files.push(child);
                else if (child instanceof TFolder) collect(child);
            }
        };
        collect(folder);
        return files;
    }

    private async renameFile(file: TFile, encrypting: boolean) {
        const { encryptedNotePrefix: prefix, encryptedNoteSuffix: suffix } = this.settings;
        if (!prefix && !suffix) return;

        let newName = file.basename;
        
        if (encrypting) {
            newName = `${prefix}${newName}${suffix}`;
        } else {
            if (prefix && newName.startsWith(prefix)) newName = newName.slice(prefix.length);
            if (suffix && newName.endsWith(suffix)) newName = newName.slice(0, -suffix.length);
        }

        const newPath = file.parent?.path 
            ? `${file.parent.path}/${newName}.${file.extension}` 
            : `${newName}.${file.extension}`;
        
        if (newPath !== file.path) {
            try {
                await this.app.fileManager.renameFile(file, newPath);
            } catch (error) {
                console.error('Failed to rename file:', error);
            }
        }
    }
}
