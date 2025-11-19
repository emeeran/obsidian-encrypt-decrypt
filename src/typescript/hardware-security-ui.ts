/**
 * Hardware Security UI Components
 * Provides user interface for hardware security key management
 */

import { App, Modal, Notice, Setting, SuggestModal } from 'obsidian';
import { HardwareSecurityManager, HardwareSecuritySettings, SecurityKeyInfo } from './hardware-security';

export class HardwareSecuritySetupModal extends Modal {
    private settings: HardwareSecuritySettings;
    private hardwareManager: HardwareSecurityManager;
    private onSave: (settings: HardwareSecuritySettings) => void;

    constructor(
        app: App,
        settings: HardwareSecuritySettings,
        onSave: (settings: HardwareSecuritySettings) => void
    ) {
        super(app);
        this.settings = { ...settings };
        this.hardwareManager = new HardwareSecurityManager(app, this.settings);
        this.onSave = onSave;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('hardware-security-setup-modal');

        contentEl.createEl('h2', { text: 'Hardware Security Settings' });

        // Compatibility check
        const compatibilitySection = contentEl.createDiv('compatibility-section');
        this.createCompatibilityCheck(compatibilitySection);

        // General settings
        const generalSection = contentEl.createDiv('general-settings-section');
        this.createGeneralSettings(generalSection);

        // Key management
        const keyManagementSection = contentEl.createDiv('key-management-section');
        this.createKeyManagement(keyManagementSection);

        // Biometric settings
        const biometricSection = contentEl.createDiv('biometric-settings-section');
        this.createBiometricSettings(biometricSection);

        // Action buttons
        const buttonContainer = contentEl.createDiv('button-container');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '12px';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.marginTop = '20px';

        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel',
            cls: ''
        });
        cancelButton.onclick = () => {
            this.close();
        };

        const saveButton = buttonContainer.createEl('button', {
            text: 'Save Settings',
            cls: 'mod-cta'
        });
        saveButton.onclick = () => {
            this.onSave(this.settings);
            this.close();
        };
    }

    private createCompatibilityCheck(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Compatibility Check' });

        const supported = HardwareSecurityManager.isSupported();
        const supportText = containerEl.createEl('p', {
            text: supported ? '✅ Hardware security is supported on this device' : '❌ Hardware security is not supported on this device',
            cls: supported ? 'support-status-supported' : 'support-status-unsupported'
        });

        if (supported) {
            this.checkPlatformAuthenticator(containerEl);
        } else {
            containerEl.createEl('p', {
                text: 'To use hardware security, please use a modern browser with WebAuthn support (Chrome, Firefox, Safari, Edge).',
                cls: 'compatibility-note'
            });
        }
    }

    private async checkPlatformAuthenticator(containerEl: HTMLElement): Promise<void> {
        try {
            const platformAuth = await HardwareSecurityManager.isPlatformAuthenticatorAvailable();
            const authText = containerEl.createEl('p', {
                text: platformAuth ? '✅ Biometric authentication (Face ID, Touch ID, Windows Hello) is available' : '❌ Biometric authentication not available',
                cls: platformAuth ? 'auth-status-available' : 'auth-status-unavailable'
            });
        } catch (error) {
            containerEl.createEl('p', {
                text: '⚠️ Could not check biometric authentication availability',
                cls: 'auth-status-unknown'
            });
        }
    }

    private createGeneralSettings(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'General Settings' });

        new Setting(containerEl)
            .setName('Enable hardware security')
            .setDesc('Use hardware security keys for enhanced authentication')
            .addToggle(toggle => toggle
                .setValue(this.settings.enabled)
                .onChange(value => {
                    this.settings.enabled = value;
                }));

        new Setting(containerEl)
            .setName('Require hardware key')
            .setDesc('Always require hardware key for sensitive operations')
            .addToggle(toggle => toggle
                .setValue(this.settings.requireHardwareKey)
                .onChange(value => {
                    this.settings.requireHardwareKey = value;
                }));

        new Setting(containerEl)
            .setName('Fallback to password')
            .setDesc('Allow password authentication if hardware key fails')
            .addToggle(toggle => toggle
                .setValue(this.settings.fallbackToPassword)
                .onChange(value => {
                    this.settings.fallbackToPassword = value;
                }));

        new Setting(containerEl)
            .setName('Auto-prompt authentication')
            .setDesc('Automatically prompt for hardware key when required')
            .addToggle(toggle => toggle
                .setValue(this.settings.autoPrompt)
                .onChange(value => {
                    this.settings.autoPrompt = value;
                }));

        new Setting(containerEl)
            .setName('Key timeout (seconds)')
            .setDesc('Timeout for hardware key operations')
            .addSlider(slider => slider
                .setLimits(10, 120, 5)
                .setValue(this.settings.keyTimeout / 1000)
                .setDynamicTooltip()
                .onChange(value => {
                    this.settings.keyTimeout = value * 1000;
                }));
    }

    private createKeyManagement(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Security Keys' });

        const keysList = containerEl.createDiv('keys-list');
        keysList.style.maxHeight = '200px';
        keysList.style.overflowY = 'auto';
        keysList.style.border = '1px solid var(--background-modifier-border)';
        keysList.style.borderRadius = '4px';
        keysList.style.padding = '8px';

        const refreshKeysList = () => {
            keysList.empty();
            const keys = this.hardwareManager.getRegisteredKeys();

            if (keys.length === 0) {
                keysList.createEl('p', {
                    text: 'No registered security keys',
                    cls: 'empty-keys-list'
                });
            } else {
                for (const key of keys) {
                    const keyItem = keysList.createDiv('key-item');
                    keyItem.style.display = 'flex';
                    keyItem.style.justifyContent = 'space-between';
                    keyItem.style.alignItems = 'center';
                    keyItem.style.padding = '8px 0';

                    const keyInfo = keyItem.createDiv('key-info');
                    keyInfo.createSpan({ text: key.name, cls: 'key-name' });
                    keyInfo.createEl('br');
                    keyInfo.createEl('small', {
                        text: `Type: ${key.type} | Registered: ${key.registrationDate.toLocaleDateString()}`,
                        cls: 'key-details'
                    });
                    if (key.lastUsed) {
                        keyInfo.createEl('br');
                        keyInfo.createEl('small', {
                            text: `Last used: ${key.lastUsed.toLocaleString()}`,
                            cls: 'key-last-used'
                        });
                    }

                    const keyActions = keyItem.createDiv('key-actions');
                    keyActions.style.display = 'flex';
                    keyActions.style.gap = '8px';

                    const testButton = keyActions.createEl('button', {
                        text: 'Test',
                        cls: 'test-key-button'
                    });
                    testButton.onclick = async () => {
                        testButton.disabled = true;
                        testButton.textContent = 'Testing...';
                        const success = await this.hardwareManager.authenticate();
                        if (success) {
                            new Notice(`Key "${key.name}" authentication successful`);
                        } else {
                            new Notice(`Key "${key.name}" authentication failed`);
                        }
                        testButton.disabled = false;
                        testButton.textContent = 'Test';
                    };

                    const removeButton = keyActions.createEl('button', {
                        text: 'Remove',
                        cls: 'remove-key-button'
                    });
                    removeButton.onclick = async () => {
                        const confirmed = await this.showConfirmDialog(
                            'Remove Security Key',
                            `Are you sure you want to remove the security key "${key.name}"?`
                        );
                        if (confirmed) {
                            const success = await this.hardwareManager.removeSecurityKey(key.name);
                            if (success) {
                                refreshKeysList();
                            }
                        }
                    };
                }
            }
        };

        refreshKeysList();

        // Add new key button
        const addKeyContainer = containerEl.createDiv('add-key-container');
        addKeyContainer.style.marginTop = '12px';

        const addKeyButton = addKeyContainer.createEl('button', {
            text: 'Add Security Key',
            cls: 'mod-cta'
        });
        addKeyButton.onclick = () => {
            this.showAddKeyModal((keyName) => {
                this.hardwareManager.registerSecurityKey(keyName).then(success => {
                    if (success) {
                        refreshKeysList();
                    }
                });
            });
        };
    }

    private createBiometricSettings(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Biometric Authentication' });

        new Setting(containerEl)
            .setName('Enable biometric authentication')
            .setDesc('Use Face ID, Touch ID, or Windows Hello for authentication')
            .addToggle(toggle => toggle
                .setValue(this.settings.biometricAuth)
                .onChange(value => {
                    this.settings.biometricAuth = value;
                }));

        containerEl.createEl('p', {
            text: 'Note: Biometric authentication requires a device with built-in security features and may not be available on all systems.',
            cls: 'biometric-note'
        });
    }

    private showAddKeyModal(onRegister: (keyName: string) => void): void {
        new AddSecurityKeyModal(this.app, onRegister).open();
    }

    private async showConfirmDialog(title: string, message: string): Promise<boolean> {
        return new Promise((resolve) => {
            const modal = new ConfirmActionModal(this.app, title, message, resolve);
            modal.open();
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * Add security key modal
 */
class AddSecurityKeyModal extends Modal {
    private onRegister: (keyName: string) => void;

    constructor(app: App, onRegister: (keyName: string) => void) {
        super(app);
        this.onRegister = onRegister;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('add-security-key-modal');

        contentEl.createEl('h2', { text: 'Add Security Key' });
        contentEl.createEl('p', {
            text: 'Please give your security key a name for easy identification.',
        });

        const nameInput = contentEl.createEl('input', {
            type: 'text',
            placeholder: 'Enter key name (e.g., "YubiKey 5C", "Titan Key")'
        });
        nameInput.style.width = '100%';
        nameInput.style.padding = '8px';
        nameInput.style.marginBottom = '16px';

        const buttonContainer = contentEl.createDiv('button-container');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '12px';
        buttonContainer.style.justifyContent = 'flex-end';

        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel',
            cls: ''
        });
        cancelButton.onclick = () => {
            this.close();
        };

        const registerButton = buttonContainer.createEl('button', {
            text: 'Register Key',
            cls: 'mod-cta'
        });
        registerButton.onclick = () => {
            const keyName = nameInput.value.trim();
            if (!keyName) {
                new Notice('Please enter a name for the security key');
                return;
            }

            this.onRegister(keyName);
            this.close();
        };

        // Focus on input
        setTimeout(() => nameInput.focus(), 100);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * Generic confirmation modal
 */
class ConfirmActionModal extends Modal {
    private onConfirm: (confirmed: boolean) => void;
    private title: string;
    private message: string;

    constructor(app: App, title: string, message: string, onConfirm: (confirmed: boolean) => void) {
        super(app);
        this.title = title;
        this.message = message;
        this.onConfirm = onConfirm;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('confirm-action-modal');

        contentEl.createEl('h2', { text: this.title });
        contentEl.createEl('p', { text: this.message });

        const buttonContainer = contentEl.createDiv('button-container');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '12px';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.marginTop = '20px';

        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel',
            cls: ''
        });
        cancelButton.onclick = () => {
            this.onConfirm(false);
            this.close();
        };

        const confirmButton = buttonContainer.createEl('button', {
            text: 'Confirm',
            cls: 'mod-cta'
        });
        confirmButton.onclick = () => {
            this.onConfirm(true);
            this.close();
        };
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * Security status display component
 */
export class SecurityStatusDisplay {
    private containerEl: HTMLElement;
    private hardwareManager: HardwareSecurityManager;

    constructor(containerEl: HTMLElement, hardwareManager: HardwareSecurityManager) {
        this.containerEl = containerEl;
        this.hardwareManager = hardwareManager;
    }

    update(): void {
        const status = this.hardwareManager.getSecurityStatus();
        this.containerEl.empty();

        this.containerEl.createEl('h3', { text: 'Security Status' });

        const statusGrid = this.containerEl.createDiv('security-status-grid');
        statusGrid.style.display = 'grid';
        statusGrid.style.gridTemplateColumns = '1fr 1fr';
        statusGrid.style.gap = '12px';

        // Hardware support
        this.addStatusItem(statusGrid, 'Hardware Support', status.supported, 'Hardware security is supported');

        // Platform authenticator
        this.addStatusItem(statusGrid, 'Biometric Auth', status.platformAuthenticator, 'Biometric authentication available');

        // Registered keys
        const keysItem = statusGrid.createDiv('status-item');
        keysItem.createSpan({ text: 'Registered Keys: ' });
        keysItem.createSpan({
            text: status.registeredKeys.toString(),
            cls: status.registeredKeys > 0 ? 'status-good' : 'status-warning'
        });

        // Last used
        if (status.lastUsed) {
            const lastUsedItem = statusGrid.createDiv('status-item');
            lastUsedItem.createSpan({ text: 'Last Used: ' });
            lastUsedItem.createSpan({
                text: this.formatRelativeTime(status.lastUsed),
                cls: 'status-info'
            });
        }

        // Overall status
        const overallItem = this.containerEl.createDiv('overall-status');
        overallItem.style.marginTop = '16px';
        overallItem.style.padding = '12px';
        overallItem.style.borderRadius = '4px';
        overallItem.style.backgroundColor = status.enabled && status.supported ?
            'var(--background-success)' : 'var(--background-warning)';

        const isSecure = status.enabled && status.supported && status.registeredKeys > 0;
        overallItem.createEl('h4', {
            text: isSecure ? '🔒 Secure' : '⚠️ Not Fully Protected',
            cls: isSecure ? 'secure-status' : 'insecure-status'
        });

        overallItem.createEl('p', {
            text: this.getSecurityRecommendation(status),
            cls: 'security-recommendation'
        });
    }

    private addStatusItem(container: HTMLElement, label: string, value: boolean, description: string): void {
        const item = container.createDiv('status-item');
        item.createSpan({ text: `${label}: ` });
        item.createSpan({
            text: value ? '✅ Available' : '❌ Not Available',
            cls: value ? 'status-good' : 'status-bad'
        });
    }

    private formatRelativeTime(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else if (diffDays < 30) {
            const weeks = Math.floor(diffDays / 7);
            return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    private getSecurityRecommendation(status: any): string {
        if (!status.supported) {
            return 'Hardware security is not supported on this device. Please use a modern browser.';
        }

        if (!status.enabled) {
            return 'Enable hardware security for enhanced protection of your encrypted notes.';
        }

        if (status.registeredKeys === 0) {
            return 'Register at least one security key to enable hardware authentication.';
        }

        return 'Your notes are protected with hardware security. Ensure you keep backup access to your keys.';
    }
}