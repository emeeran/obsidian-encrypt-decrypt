/**
 * Settings Tab Component
 * Extracted from main.ts for better code organization
 */

import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import { enhancedEncryptionService } from '../enhanced-encryption';
import { HardwareSecurityManager } from '../hardware-security';
import { SecurityStatusDisplay } from '../hardware-security-ui';
import { ErrorRecoveryStatusDisplay } from '../error-recovery-ui';
import { PostQuantumCryptoManager } from '../post-quantum';
import { PostQuantumStatusDisplay } from '../post-quantum-ui';

// Plugin interface to avoid circular dependency
export interface NoteEncryptorPluginInterface {
    app: App;
    settings: NoteEncryptorSettingsInterface;
    hardwareSecurityManager: HardwareSecurityManager | null;
    postQuantumManager: PostQuantumCryptoManager;
    errorRecovery: { getStoredErrors(): unknown[] };
    saveSettings(): Promise<void>;
    openHardwareSecuritySetup(): void;
    openErrorRecoveryDiagnostics(): void;
    testErrorRecovery(): void;
    openPostQuantumSetup(): void;
    encryptWithPostQuantum(): void;
    generatePostQuantumKeyPair(): void;
    showQuantumThreatAssessment(): void;
    openAIAssistant(): void;
    openAIPasswordGenerator(): void;
    analyzeCurrentNoteWithAI(): void;
    getAISecurityInsights(): void;
}

export interface NoteEncryptorSettingsInterface {
    encryptedNotePrefix: string;
    encryptedNoteSuffix: string;
    requireStrongPasswords: boolean;
    passwordMinLength: number;
    maxFileSize: number;
    showPasswordStrength: boolean;
    confirmOnEncrypt: boolean;
    enableWebAssembly: boolean;
    performanceMode: boolean;
    showPerformanceMetrics: boolean;
    enableAdvancedFeatures: boolean;
    hardwareSecurity: {
        enabled: boolean;
    };
    postQuantum: {
        enablePostQuantum: boolean;
        quantumReadiness: boolean;
    };
    aiSettings: {
        enabled: boolean;
        privacyMode: boolean;
        learningMode: boolean;
        breachProtection: boolean;
    };
    directoryEncryption: {
        includeSubdirectories: boolean;
        skipEncryptedFiles: boolean;
        createManifest: boolean;
        parallelOperations: number;
    };
}

export class NoteEncryptorSettingTab extends PluginSettingTab {
    plugin: NoteEncryptorPluginInterface;

    constructor(app: App, plugin: NoteEncryptorPluginInterface) {
        super(app, plugin as any);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Note Encryptor Settings' });

        // File Naming Settings
        this.displayFileNamingSettings(containerEl);

        // Security Settings
        this.displaySecuritySettings(containerEl);

        // User Experience Settings
        this.displayUserExperienceSettings(containerEl);

        // Advanced Features Settings
        this.displayAdvancedFeaturesSettings(containerEl);

        // Hardware Security Settings
        this.displayHardwareSecuritySettings(containerEl);

        // Error Recovery Settings
        this.displayErrorRecoverySettings(containerEl);

        // Post-Quantum Cryptography Settings
        this.displayPostQuantumSettings(containerEl);

        // AI-Powered Features Settings
        this.displayAISettings(containerEl);

        // Security Information
        this.displaySecurityInformation(containerEl);

        // Directory Encryption Settings
        this.displayDirectoryEncryptionSettings(containerEl);

        // Add styles
        this.addSettingsStyles(containerEl);
    }

    private displayFileNamingSettings(containerEl: HTMLElement): void {
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
    }

    private displaySecuritySettings(containerEl: HTMLElement): void {
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
    }

    private displayUserExperienceSettings(containerEl: HTMLElement): void {
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
    }

    private displayAdvancedFeaturesSettings(containerEl: HTMLElement): void {
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
                            const benchmark = await enhancedEncryptionService.benchmarkPerformance(1024 * 1024);
                            new Notice(`Benchmark complete: ${benchmark.improvement.toFixed(1)}% improvement with WASM`);
                        } catch (error) {
                            new Notice('Benchmark failed: ' + (error instanceof Error ? error.message : String(error)));
                        } finally {
                            buttonEl.textContent = 'Run Benchmark';
                            buttonEl.disabled = false;
                        }
                    }));
        }
    }

    private displayHardwareSecuritySettings(containerEl: HTMLElement): void {
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
                        this.display();
                    }));

            if (this.plugin.settings.hardwareSecurity?.enabled) {
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
    }

    private displayErrorRecoverySettings(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Error Recovery' });

        const recoveryStatus = containerEl.createDiv('recovery-status');
        const statusDisplay = new ErrorRecoveryStatusDisplay(recoveryStatus, this.plugin.errorRecovery as any);
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
    }

    private displayPostQuantumSettings(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Post-Quantum Cryptography' });

        if (PostQuantumCryptoManager.isSupported()) {
            containerEl.createEl('p', {
                text: 'Your device supports post-quantum cryptography for future-proofing against quantum computing threats.',
                cls: 'support-info'
            });

            const pqStatus = containerEl.createDiv('pq-status');
            const statusDisplay = new PostQuantumStatusDisplay(pqStatus, this.plugin.postQuantumManager);
            statusDisplay.update();

            new Setting(containerEl)
                .setName('Enable post-quantum cryptography')
                .setDesc('Use quantum-resistant algorithms for enhanced future security')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.postQuantum?.enablePostQuantum ?? false)
                    .onChange(async (value) => {
                        this.plugin.settings.postQuantum.enablePostQuantum = value;
                        await this.plugin.saveSettings();
                        this.display();
                    }));

            if (this.plugin.settings.postQuantum?.enablePostQuantum) {
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
    }

    private displayAISettings(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'AI-Powered Security Features' });

        const aiStatus = containerEl.createDiv('ai-status');
        aiStatus.createEl('h4', { text: 'AI Security Assistant Status' });

        const statusText = this.plugin.settings.aiSettings?.enabled ? '🟢 AI features enabled' : '🔴 AI features disabled';
        aiStatus.createEl('p', {
            text: statusText,
            cls: this.plugin.settings.aiSettings?.enabled ? 'ai-status-enabled' : 'ai-status-disabled'
        });

        new Setting(containerEl)
            .setName('Open AI Security Assistant')
            .setDesc('Configure AI-powered security features and analysis tools')
            .addButton(button => button
                .setButtonText('AI Assistant')
                .setCta()
                .onClick(() => {
                    this.plugin.openAIAssistant();
                }));

        new Setting(containerEl)
            .setName('AI Password Generator')
            .setDesc('Generate intelligent passwords based on content analysis')
            .addButton(button => button
                .setButtonText('Generate AI Password')
                .onClick(() => {
                    this.plugin.openAIPasswordGenerator();
                }));

        new Setting(containerEl)
            .setName('Analyze Current Note')
            .setDesc('Use AI to analyze the current note for sensitive information')
            .addButton(button => button
                .setButtonText('Analyze with AI')
                .onClick(() => {
                    this.plugin.analyzeCurrentNoteWithAI();
                }));

        if (this.plugin.settings.aiSettings?.enabled) {
            const privacySection = containerEl.createDiv('ai-privacy-settings');
            privacySection.createEl('h4', { text: 'Privacy & Learning Settings' });

            new Setting(containerEl)
                .setName('Privacy mode')
                .setDesc('Disable all AI analysis for maximum privacy')
                .addToggle((toggle) => toggle
                    .setValue(this.plugin.settings.aiSettings?.privacyMode ?? false)
                    .onChange(async (value) => {
                        this.plugin.settings.aiSettings.privacyMode = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Learning mode')
                .setDesc('Allow AI to learn from your security patterns for better recommendations')
                .addToggle((toggle) => toggle
                    .setValue(this.plugin.settings.aiSettings?.learningMode ?? true)
                    .onChange(async (value) => {
                        this.plugin.settings.aiSettings.learningMode = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Breach protection')
                .setDesc('Check passwords against known data breaches')
                .addToggle((toggle) => toggle
                    .setValue(this.plugin.settings.aiSettings?.breachProtection ?? true)
                    .onChange(async (value) => {
                        this.plugin.settings.aiSettings.breachProtection = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Get AI security insights')
                .setDesc('View personalized security recommendations based on your usage patterns')
                .addButton((button) => button
                    .setButtonText('View Insights')
                    .onClick(() => {
                        this.plugin.getAISecurityInsights();
                    }));
        }
    }

    private displaySecurityInformation(containerEl: HTMLElement): void {
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
    }

    private displayDirectoryEncryptionSettings(containerEl: HTMLElement): void {
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
    }

    private addSettingsStyles(_containerEl: HTMLElement): void {
        const existingStyle = document.getElementById('note-encryptor-settings-styles');
        if (existingStyle) { return; }

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

            .support-info {
                color: var(--text-success);
                font-style: italic;
            }

            .unsupported-info {
                color: var(--text-muted);
                font-style: italic;
            }

            .performance-metrics {
                margin: 12px 0;
                padding: 12px;
                background: var(--background-secondary);
                border-radius: 6px;
            }

            .metrics-info div {
                font-family: var(--font-monospace);
                font-size: 12px;
                margin: 4px 0;
            }

            .quick-actions {
                margin-top: 12px;
            }

            .actions-grid button {
                width: 100%;
                padding: 8px;
            }

            .ai-status-enabled {
                color: var(--text-success);
            }

            .ai-status-disabled {
                color: var(--text-muted);
            }

            .ai-privacy-settings {
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid var(--background-modifier-border);
            }
        `;
        document.head.appendChild(style);
    }
}
