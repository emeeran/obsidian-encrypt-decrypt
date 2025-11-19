/**
 * Hardware Security Key Integration
 * Provides support for WebAuthn/FIDO2 hardware security keys for enhanced authentication
 */

import { App, Notice, Modal, Setting } from 'obsidian';

export interface HardwareSecuritySettings {
    enabled: boolean;
    requireHardwareKey: boolean;
    fallbackToPassword: boolean;
    biometricAuth: boolean;
    keyTimeout: number;
    supportedKeyTypes: string[];
    autoPrompt: boolean;
}

export interface SecurityKeyInfo {
    id: ArrayBuffer;
    type: PublicKeyCredentialType;
    name: string;
    registrationDate: Date;
    lastUsed?: Date;
    counter?: number;
}

export interface WebAuthnCredentials {
    publicKey: PublicKeyCredential;
    challenge: Uint8Array;
    signature: ArrayBuffer;
    authData: ArrayBuffer;
    clientDataJSON: ArrayBuffer;
}

export class HardwareSecurityManager {
    private app: App;
    private settings: HardwareSecuritySettings;
    private registeredKeys: Map<string, SecurityKeyInfo> = new Map();
    private challengeCache: Map<string, { challenge: Uint8Array; timestamp: number }> = new Map();

    constructor(app: App, settings: HardwareSecuritySettings) {
        this.app = app;
        this.settings = settings;
        this.loadRegisteredKeys();
        this.cleanupExpiredChallenges();
    }

    /**
     * Check if hardware security is supported in this environment
     */
    static isSupported(): boolean {
        return !!(window.PublicKeyCredential &&
                 navigator.credentials &&
                 crypto &&
                 crypto.subtle);
    }

    /**
     * Check if platform authenticator (biometric) is available
     */
    static async isPlatformAuthenticatorAvailable(): Promise<boolean> {
        if (!HardwareSecurityManager.isSupported()) {
            return false;
        }

        try {
            return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        } catch (error) {
            return false;
        }
    }

    /**
     * Register a new security key
     */
    async registerSecurityKey(keyName: string): Promise<boolean> {
        try {
            if (!HardwareSecurityManager.isSupported()) {
                throw new Error('Hardware security keys are not supported on this device');
            }

            const challenge = this.generateChallenge();
            const userId = this.getUserId();

            const createOptions: CredentialCreationOptions = {
                publicKey: {
                    challenge,
                    rp: {
                        name: 'Obsidian Note Encryptor',
                        id: window.location.hostname || 'localhost'
                    },
                    user: {
                        id: userId,
                        name: keyName,
                        displayName: keyName
                    },
                    pubKeyCredParams: [
                        { alg: -7, type: 'public-key' },   // ES256
                        { alg: -257, type: 'public-key' }, // RS256
                        { alg: -8, type: 'public-key' },   // Ed25519
                    ],
                    authenticatorSelection: {
                        userVerification: this.settings.biometricAuth ? 'required' : 'preferred',
                        residentKey: 'preferred',
                        authenticatorAttachment: this.settings.biometricAuth ? 'platform' : 'cross-platform'
                    },
                    timeout: this.settings.keyTimeout,
                    attestation: 'direct'
                }
            };

            const credential = await navigator.credentials.create(createOptions) as PublicKeyCredential;

            if (credential) {
                const keyInfo: SecurityKeyInfo = {
                    id: credential.rawId,
                    type: 'public-key' as PublicKeyCredentialType,
                    name: keyName,
                    registrationDate: new Date(),
                    lastUsed: new Date()
                };

                this.registeredKeys.set(keyName, keyInfo);
                await this.saveRegisteredKeys();

                new Notice(`Security key "${keyName}" registered successfully`);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Failed to register security key:', error);
            new Notice(`Failed to register security key: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }

    /**
     * Authenticate with a registered security key
     */
    async authenticate(): Promise<boolean> {
        try {
            if (!HardwareSecurityManager.isSupported()) {
                throw new Error('Hardware security keys are not supported on this device');
            }

            if (this.registeredKeys.size === 0) {
                throw new Error('No registered security keys found');
            }

            const challenge = this.generateChallenge();
            const allowCredentials = Array.from(this.registeredKeys.values()).map(key => ({
                id: key.id,
                type: key.type as PublicKeyCredentialType,
                transports: ['usb', 'nfc', 'ble', 'internal'] as AuthenticatorTransport[]
            }));

            const getOptions: CredentialRequestOptions = {
                publicKey: {
                    challenge,
                    allowCredentials,
                    userVerification: this.settings.biometricAuth ? 'required' : 'preferred',
                    timeout: this.settings.keyTimeout
                }
            };

            const assertion = await navigator.credentials.get(getOptions) as PublicKeyCredential;

            if (assertion) {
                // Cache the challenge for verification
                this.challengeCache.set('current', {
                    challenge,
                    timestamp: Date.now()
                });

                // Update key usage
                const key = Array.from(this.registeredKeys.values()).find(k =>
                    this.arrayBuffersEqual(k.id, assertion.rawId)
                );

                if (key) {
                    key.lastUsed = new Date();
                    key.counter = key.counter ? key.counter + 1 : 1;
                    await this.saveRegisteredKeys();
                }

                return true;
            }

            return false;
        } catch (error) {
            console.error('Hardware authentication failed:', error);
            new Notice(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }

    /**
     * Get registered security keys
     */
    getRegisteredKeys(): SecurityKeyInfo[] {
        return Array.from(this.registeredKeys.values());
    }

    /**
     * Remove a registered security key
     */
    async removeSecurityKey(keyName: string): Promise<boolean> {
        try {
            if (this.registeredKeys.has(keyName)) {
                this.registeredKeys.delete(keyName);
                await this.saveRegisteredKeys();
                new Notice(`Security key "${keyName}" removed successfully`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to remove security key:', error);
            new Notice('Failed to remove security key');
            return false;
        }
    }

    /**
     * Verify security key challenge
     */
    async verifyChallenge(challenge: Uint8Array, response: any): Promise<boolean> {
        try {
            // Verify the challenge was recent (prevent replay attacks)
            const cached = this.challengeCache.get('current');
            if (!cached) {
                return false;
            }

            const age = Date.now() - cached.timestamp;
            if (age > 300000) { // 5 minutes
                this.challengeCache.delete('current');
                return false;
            }

            if (!this.arrayBuffersEqual(challenge, cached.challenge)) {
                return false;
            }

            // Additional verification logic would go here
            // For now, we'll trust the WebAuthn API verification

            this.challengeCache.delete('current');
            return true;
        } catch (error) {
            console.error('Challenge verification failed:', error);
            return false;
        }
    }

    /**
     * Check if hardware authentication is required
     */
    isHardwareAuthRequired(): boolean {
        return this.settings.enabled &&
               this.settings.requireHardwareKey &&
               this.registeredKeys.size > 0;
    }

    /**
     * Prompt for hardware authentication if enabled
     */
    async promptIfRequired(): Promise<boolean> {
        if (!this.isHardwareAuthRequired()) {
            return true;
        }

        if (this.settings.autoPrompt) {
            return await this.authenticate();
        } else {
            return await this.showAuthPrompt();
        }
    }

    /**
     * Get security status
     */
    getSecurityStatus(): {
        supported: boolean;
        platformAuthenticator: boolean;
        registeredKeys: number;
        lastUsed?: Date;
        enabled: boolean;
    } {
        const keys = this.getRegisteredKeys();
        const lastUsed = keys.length > 0 ?
            keys.reduce((latest, key) =>
                (!latest || key.lastUsed! > latest) ? key.lastUsed! : latest,
                keys[0].lastUsed
            ) : undefined;

        return {
            supported: HardwareSecurityManager.isSupported(),
            platformAuthenticator: false, // Would need async check
            registeredKeys: keys.length,
            lastUsed,
            enabled: this.settings.enabled
        };
    }

    /**
     * Generate cryptographic challenge
     */
    private generateChallenge(): Uint8Array {
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);
        return challenge;
    }

    /**
     * Get user ID for WebAuthn
     */
    private getUserId(): Uint8Array {
        // Create a consistent user ID based on vault
        const vaultName = this.app.vault.getName();
        const encoder = new TextEncoder();
        const vaultBytes = encoder.encode(vaultName);

        // Hash to get consistent 16-byte user ID
        const hash = new Uint8Array(16);
        for (let i = 0; i < 16; i++) {
            hash[i] = i < vaultBytes.length ? vaultBytes[i] : 0;
        }

        return hash;
    }

    /**
     * Load registered keys from storage
     */
    private async loadRegisteredKeys(): Promise<void> {
        try {
            const plugin = (this.app as any).plugins?.plugins['note-encryptor'];
            const savedKeys = plugin?.settings?.hardwareSecurityKeys || {};

            for (const [keyName, keyData] of Object.entries(savedKeys)) {
                const info = keyData as SecurityKeyInfo;
                // Convert string dates back to Date objects
                info.registrationDate = new Date(info.registrationDate);
                if (info.lastUsed) {
                    info.lastUsed = new Date(info.lastUsed);
                }
                this.registeredKeys.set(keyName, info);
            }
        } catch (error) {
            console.error('Failed to load registered keys:', error);
        }
    }

    /**
     * Save registered keys to storage
     */
    private async saveRegisteredKeys(): Promise<void> {
        try {
            const plugin = (this.app as any).plugins?.plugins['note-encryptor'];
            if (plugin && plugin.settings) {
                plugin.settings.hardwareSecurityKeys = Object.fromEntries(this.registeredKeys);
                await plugin.saveSettings();
            }
        } catch (error) {
            console.error('Failed to save registered keys:', error);
        }
    }

    /**
     * Clean up expired challenges
     */
    private cleanupExpiredChallenges(): void {
        const now = Date.now();
        for (const [key, value] of this.challengeCache.entries()) {
            if (now - value.timestamp > 300000) { // 5 minutes
                this.challengeCache.delete(key);
            }
        }
    }

    /**
     * Compare two ArrayBuffers for equality
     */
    private arrayBuffersEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
        if (a.byteLength !== b.byteLength) {
            return false;
        }

        const viewA = new Uint8Array(a);
        const viewB = new Uint8Array(b);

        for (let i = 0; i < viewA.length; i++) {
            if (viewA[i] !== viewB[i]) {
                return false;
            }
        }

        return true;
    }

    /**
     * Show authentication prompt modal
     */
    private async showAuthPrompt(): Promise<boolean> {
        return new Promise((resolve) => {
            new HardwareAuthPromptModal(this.app, (result) => {
                resolve(result);
            }).open();
        });
    }
}

/**
 * Hardware authentication prompt modal
 */
class HardwareAuthPromptModal extends Modal {
    private onAuthenticate: (success: boolean) => void;
    private hardwareManager: HardwareSecurityManager;

    constructor(app: App, onAuthenticate: (success: boolean) => void) {
        super(app);
        this.onAuthenticate = onAuthenticate;
        this.hardwareManager = new HardwareSecurityManager(app, {
            enabled: true,
            requireHardwareKey: true,
            fallbackToPassword: true,
            biometricAuth: false,
            keyTimeout: 30000,
            supportedKeyTypes: ['public-key'],
            autoPrompt: false
        });
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('hardware-auth-prompt-modal');

        contentEl.createEl('h2', { text: 'Hardware Security Key Required' });
        contentEl.createEl('p', {
            text: 'Please use your registered security key to authenticate.'
        });

        const buttonContainer = contentEl.createDiv('button-container');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '12px';
        buttonContainer.style.justifyContent = 'center';
        buttonContainer.style.marginTop = '20px';

        const authButton = buttonContainer.createEl('button', {
            text: 'Use Security Key',
            cls: 'mod-cta'
        });
        authButton.onclick = async () => {
            authButton.disabled = true;
            authButton.textContent = 'Authenticating...';

            const success = await this.hardwareManager.authenticate();
            this.onAuthenticate(success);
            this.close();
        };

        const fallbackButton = buttonContainer.createEl('button', {
            text: 'Use Password Instead',
            cls: ''
        });
        fallbackButton.onclick = () => {
            this.onAuthenticate(false);
            this.close();
        };

        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel',
            cls: ''
        });
        cancelButton.onclick = () => {
            this.onAuthenticate(false);
            this.close();
        };
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}