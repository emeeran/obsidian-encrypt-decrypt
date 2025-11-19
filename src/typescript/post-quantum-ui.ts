/**
 * Post-Quantum Cryptography UI Components
 * Provides user interface for quantum-resistant encryption features
 */

import { App, Modal, Notice, Setting, ButtonComponent, TextAreaComponent } from 'obsidian';
import { PostQuantumCryptoManager, PostQuantumSettings, HybridEncryptionResult, HybridMetadata } from './post-quantum';

export class PostQuantumSetupModal extends Modal {
    private settings: PostQuantumSettings;
    private onSave: (settings: PostQuantumSettings) => void;
    private quantumManager: PostQuantumCryptoManager;

    constructor(
        app: App,
        settings: PostQuantumSettings,
        onSave: (settings: PostQuantumSettings) => void
    ) {
        super(app);
        this.settings = { ...settings };
        this.onSave = onSave;
        this.quantumManager = new PostQuantumCryptoManager(app, settings);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('post-quantum-setup-modal');

        contentEl.createEl('h2', { text: 'Post-Quantum Cryptography Setup' });

        // Compatibility check
        this.createCompatibilityCheck(contentEl);

        // Quantum readiness assessment
        this.createQuantumReadiness(contentEl);

        // Algorithm selection
        this.createAlgorithmSelection(contentEl);

        // Security settings
        this.createSecuritySettings(contentEl);

        // Key management
        this.createKeyManagement(contentEl);

        // Threat assessment
        this.createThreatAssessment(contentEl);

        // Action buttons
        this.createActionButtons(contentEl);
    }

    private createCompatibilityCheck(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Compatibility Check' });

        const supported = PostQuantumCryptoManager.isSupported();
        const checkSection = containerEl.createDiv('compatibility-section');

        const statusEl = checkSection.createEl('p', {
            text: supported ? '✅ Your browser supports post-quantum cryptography' : '❌ Your browser does not support post-quantum cryptography',
            cls: supported ? 'compatibility-supported' : 'compatibility-unsupported'
        });

        if (supported) {
            checkSection.createEl('p', {
                text: 'WebAssembly and modern cryptographic APIs are available for quantum-resistant encryption.',
                cls: 'compatibility-details'
            });
        } else {
            checkSection.createEl('p', {
                text: 'Please update to a modern browser with WebAssembly support to use post-quantum cryptography.',
                cls: 'compatibility-details'
            });
        }

        const requirementsList = checkSection.createEl('ul');
        const requirements = [
            'WebAssembly support',
            'BigInt support',
            'Web Crypto API',
            'Secure random number generation'
        ];

        requirements.forEach(req => {
            const item = requirementsList.createEl('li', { text: req });
            const supported = this.checkRequirement(req);
            item.style.color = supported ? 'var(--text-success)' : 'var(--text-error)';
        });
    }

    private createQuantumReadiness(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Quantum Readiness Assessment' });

        const readiness = this.quantumManager.getQuantumReadiness();
        const readinessSection = containerEl.createDiv('readiness-section');

        // Timeline visualization
        const timelineEl = readinessSection.createDiv('quantum-timeline');
        timelineEl.style.border = '1px solid var(--background-modifier-border)';
        timelineEl.style.borderRadius = '6px';
        timelineEl.style.padding = '12px';
        timelineEl.style.backgroundColor = 'var(--background-secondary)';

        timelineEl.createEl('h4', { text: 'Quantum Computing Timeline' });

        Object.entries(readiness.timeline).forEach(([event, date]) => {
            const eventEl = timelineEl.createDiv('timeline-event');
            eventEl.style.display = 'flex';
            eventEl.style.justifyContent = 'space-between';
            eventEl.style.padding = '4px 0';

            eventEl.createSpan({ text: this.formatEventName(event) });
            eventEl.createSpan({
                text: date,
                cls: 'timeline-date'
            }).style.fontWeight = 'bold';
        });

        // Recommendations
        const recommendationsEl = readinessSection.createDiv('recommendations');
        recommendationsEl.createEl('h4', { text: 'Recommendations' });

        const recList = recommendationsEl.createEl('ul');
        readiness.recommendations.forEach(rec => {
            recList.createEl('li', { text: rec });
        });

        // Threat level indicator
        const threatEl = readinessSection.createDiv('threat-indicator');
        threatEl.style.marginTop = '12px';
        threatEl.style.padding = '8px';
        threatEl.style.borderRadius = '4px';

        const threatColors = {
            'imminent': 'var(--text-error)',
            'future': 'var(--text-warning)',
            'distant': 'var(--text-success)'
        };

        threatEl.style.backgroundColor = `var(--background-modifier-${readiness.threatLevel === 'imminent' ? 'error' : readiness.threatLevel === 'future' ? 'warning' : 'success'})`;
        threatEl.createEl('strong', {
            text: `Current Threat Level: ${readiness.threatLevel.toUpperCase()}`,
            cls: 'threat-level'
        }).style.color = threatColors[readiness.threatLevel];
    }

    private createAlgorithmSelection(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Algorithm Selection' });

        const algorithmSection = containerEl.createDiv('algorithm-section');

        new Setting(algorithmSection)
            .setName('Enable post-quantum cryptography')
            .setDesc('Use quantum-resistant algorithms for enhanced future security')
            .addToggle(toggle => toggle
                .setValue(this.settings.enablePostQuantum)
                .onChange(value => {
                    this.settings.enablePostQuantum = value;
                }));

        new Setting(algorithmSection)
            .setName('Hybrid mode')
            .setDesc('Combine classical and quantum-resistant algorithms for compatibility')
            .addToggle(toggle => toggle
                .setValue(this.settings.hybridMode)
                .onChange(value => {
                    this.settings.hybridMode = value;
                }));

        new Setting(algorithmSection)
            .setName('Quantum-resistant algorithm')
            .setDesc('Select the post-quantum algorithm to use')
            .addDropdown(dropdown => dropdown
                .addOption('Kyber', 'Kyber (Key Encapsulation)')
                .addOption('NTRU', 'NTRU (Lattice-based)')
                .addOption('Dilithium', 'Dilithium (Digital Signatures)')
                .addOption('Falcon', 'Falcon (Lattice-based Signatures)')
                .addOption('SPHINCS+', 'SPHINCS+ (Hash-based)')
                .setValue(this.settings.algorithm)
                .onChange(value => {
                    this.settings.algorithm = value as any;
                }));

        // Algorithm comparison
        const comparisonEl = algorithmSection.createDiv('algorithm-comparison');
        comparisonEl.createEl('h4', { text: 'Algorithm Comparison' });

        const comparisonTable = comparisonEl.createEl('table', { cls: 'comparison-table' });
        comparisonTable.style.width = '100%';
        comparisonTable.style.borderCollapse = 'collapse';

        // Table headers
        const headerRow = comparisonTable.createEl('tr');
        ['Algorithm', 'Type', 'Key Size', 'Security Level', 'Status'].forEach(header => {
            const th = headerRow.createEl('th', { text: header });
            th.style.border = '1px solid var(--background-modifier-border)';
            th.style.padding = '8px';
            th.style.backgroundColor = 'var(--background-secondary)';
        });

        // Algorithm data
        const algorithms = [
            { name: 'Kyber', type: 'KEM', keySize: '1568-3168', security: 'NIST L1/L3/L5', status: 'Standardized' },
            { name: 'NTRU', type: 'Lattice', keySize: '1184-1952', security: 'NIST L1/L3/L5', status: 'Candidate' },
            { name: 'Dilithium', type: 'Signature', keySize: '2420-4595', security: 'NIST L1/L3/L5', status: 'Standardized' },
            { name: 'Falcon', type: 'Signature', keySize: '897-1829', security: 'NIST L1/L5', status: 'Standardized' },
            { name: 'SPHINCS+', type: 'Hash-based', keySize: '32-64 KB', security: 'NIST L1/L5', status: 'Standardized' }
        ];

        algorithms.forEach(algo => {
            const row = comparisonTable.createEl('tr');
            [algo.name, algo.type, algo.keySize, algo.security, algo.status].forEach(cell => {
                const td = row.createEl('td', { text: cell });
                td.style.border = '1px solid var(--background-modifier-border)';
                td.style.padding = '8px';
            });
        });
    }

    private createSecuritySettings(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Security Settings' });

        const securitySection = containerEl.createDiv('security-section');

        new Setting(securitySection)
            .setName('NIST Security Level')
            .setDesc('Select the security level according to NIST recommendations')
            .addDropdown(dropdown => dropdown
                .addOption('1', 'Level 1 (~128-bit security)')
                .addOption('3', 'Level 3 (~192-bit security)')
                .addOption('5', 'Level 5 (~256-bit security)')
                .setValue(this.settings.securityLevel.toString())
                .onChange(value => {
                    this.settings.securityLevel = parseInt(value) as any;
                }));

        new Setting(securitySection)
            .setName('Key size (bytes)')
            .setDesc('Custom key size for the selected algorithm')
            .addSlider(slider => slider
                .setLimits(1024, 8192, 256)
                .setValue(this.settings.keySize)
                .setDynamicTooltip()
                .onChange(value => {
                    this.settings.keySize = value;
                }));

        new Setting(securitySection)
            .setName('Enable experimental features')
            .setDesc('Use cutting-edge post-quantum algorithms (may be less stable)')
            .addToggle(toggle => toggle
                .setValue(this.settings.experimentalFeatures)
                .onChange(value => {
                    this.settings.experimentalFeatures = value;
                }));

        new Setting(securitySection)
            .setName('Fallback to classical')
            .setDesc('Use classical encryption if post-quantum fails')
            .addToggle(toggle => toggle
                .setValue(this.settings.fallbackToClassical)
                .onChange(value => {
                    this.settings.fallbackToClassical = value;
                }));

        new Setting(securitySection)
            .setName('Quantum readiness mode')
            .setDesc('Prepare for quantum computing threats')
            .addToggle(toggle => toggle
                .setValue(this.settings.quantumReadiness)
                .onChange(value => {
                    this.settings.quantumReadiness = value;
                }));
    }

    private createKeyManagement(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Key Management' });

        const keySection = containerEl.createDiv('key-management-section');

        const keyPairList = keySection.createDiv('key-pair-list');
        keyPairList.style.maxHeight = '200px';
        keyPairList.style.overflowY = 'auto';
        keyPairList.style.border = '1px solid var(--background-modifier-border)';
        keyPairList.style.borderRadius = '4px';
        keyPairList.style.padding = '8px';
        keyPairList.style.marginBottom = '12px';

        // Refresh key list
        const refreshKeyList = () => {
            keyPairList.empty();
            const keyPairs = this.quantumManager.getKeyPairs();

            if (keyPairs.size === 0) {
                keyPairList.createEl('p', {
                    text: 'No post-quantum key pairs generated',
                    cls: 'empty-key-list'
                });
            } else {
                keyPairs.forEach((keyPair, keyId) => {
                    const keyItem = keyPairList.createDiv('key-item');
                    keyItem.style.display = 'flex';
                    keyItem.style.justifyContent = 'space-between';
                    keyItem.style.alignItems = 'center';
                    keyItem.style.padding = '8px 0';

                    const keyInfo = keyItem.createDiv('key-info');
                    keyInfo.createSpan({ text: `${keyId} - ${keyPair.algorithm}`, cls: 'key-name' });
                    keyInfo.createEl('br');
                    keyInfo.createEl('small', {
                        text: `Security Level: ${keyPair.securityLevel} | Created: ${keyPair.timestamp.toLocaleDateString()}`,
                        cls: 'key-details'
                    });

                    const keyActions = keyItem.createDiv('key-actions');
                    keyActions.style.display = 'flex';
                    keyActions.style.gap = '8px';

                    const exportButton = keyActions.createEl('button', {
                        text: 'Export',
                        cls: 'export-key-button'
                    });
                    exportButton.onclick = () => {
                        this.exportKeyPair(keyId);
                    };

                    const removeButton = keyActions.createEl('button', {
                        text: 'Remove',
                        cls: 'remove-key-button'
                    });
                    removeButton.onclick = () => {
                        if (this.quantumManager.removeKeyPair(keyId)) {
                            new Notice(`Key pair ${keyId} removed`);
                            refreshKeyList();
                        }
                    };
                });
            }
        };

        refreshKeyList();

        // Generate key pair button
        new Setting(keySection)
            .setName('Generate new key pair')
            .setDesc('Create a new post-quantum key pair for encryption')
            .addButton(button => button
                .setButtonText('Generate Key Pair')
                .setCta()
                .onClick(async () => {
                    const keyId = `pq_${Date.now()}`;
                    try {
                        await this.quantumManager.generateKeyPair();
                        new Notice('Post-quantum key pair generated successfully');
                        refreshKeyList();
                    } catch (error) {
                        new Notice(`Failed to generate key pair: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    }
                }));

        // Import key pair button
        new Setting(keySection)
            .setName('Import key pair')
            .setDesc('Import a previously exported post-quantum key pair')
            .addButton(button => button
                .setButtonText('Import Key Pair')
                .onClick(() => {
                    this.showImportKeyModal(refreshKeyList);
                }));
    }

    private createThreatAssessment(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Threat Assessment' });

        const threatSection = containerEl.createDiv('threat-assessment-section');
        const assessment = this.quantumManager.getThreatAssessment();

        // Current threat status
        const threatStatus = threatSection.createDiv('threat-status');
        threatStatus.style.padding = '12px';
        threatStatus.style.borderRadius = '6px';
        threatStatus.style.marginBottom = '16px';

        const threatColors = {
            'none': 'var(--text-success)',
            'theoretical': 'var(--text-warning)',
            'practical': 'var(--text-error)'
        };

        threatStatus.style.backgroundColor = `var(--background-modifier-${assessment.currentThreat === 'practical' ? 'error' : assessment.currentThreat === 'theoretical' ? 'warning' : 'success'})`;
        threatStatus.createEl('h4', {
            text: `Current Quantum Threat: ${assessment.currentThreat.toUpperCase()}`,
            cls: 'threat-current'
        }).style.color = threatColors[assessment.currentThreat];

        // Time to break different algorithms
        const timeToBreak = threatSection.createDiv('time-to-break');
        timeToBreak.createEl('h4', { text: 'Estimated Time to Break with Quantum Computer' });

        const breakTable = timeToBreak.createEl('table');
        breakTable.style.width = '100%';

        Object.entries(assessment.timeToBreak).forEach(([algorithm, time]) => {
            const row = breakTable.createEl('tr');
            row.style.borderBottom = '1px solid var(--background-modifier-border)';

            const algoCell = row.createEl('td', { text: algorithm });
            algoCell.style.fontWeight = 'bold';
            algoCell.style.padding = '8px';

            const timeCell = row.createEl('td', { text: time });
            timeCell.style.padding = '8px';
            timeCell.style.textAlign = 'right';
        });

        // Migration readiness
        const readinessSection = threatSection.createDiv('migration-readiness');
        readinessSection.createEl('h4', { text: 'Migration Readiness' });

        const readinessBar = readinessSection.createDiv('readiness-bar');
        readinessBar.style.width = '100%';
        readinessBar.style.height = '20px';
        readinessBar.style.backgroundColor = 'var(--background-modifier-border)';
        readinessBar.style.borderRadius = '10px';
        readinessBar.style.overflow = 'hidden';

        const readinessFill = readinessBar.createDiv('readiness-fill');
        readinessFill.style.width = `${assessment.migrationReadiness}%`;
        readinessFill.style.height = '100%';
        readinessFill.style.backgroundColor = this.getReadinessColor(assessment.migrationReadiness);

        const readinessText = readinessSection.createEl('p', {
            text: `Migration Readiness: ${assessment.migrationReadiness}%`,
            cls: 'readiness-text'
        });

        // Recommendations
        const recommendations = threatSection.createDiv('threat-recommendations');
        recommendations.createEl('h4', { text: 'Security Recommendations' });

        const recList = recommendations.createEl('ul');
        assessment.recommendations.forEach(rec => {
            recList.createEl('li', { text: rec });
        });
    }

    private createActionButtons(containerEl: HTMLElement): void {
        const buttonContainer = containerEl.createDiv('button-container');
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

        const testButton = buttonContainer.createEl('button', {
            text: 'Test Post-Quantum',
            cls: ''
        });
        testButton.onclick = () => {
            this.testPostQuantumEncryption();
        };
    }

    private checkRequirement(requirement: string): boolean {
        switch (requirement) {
            case 'WebAssembly support':
                return typeof WebAssembly !== 'undefined';
            case 'BigInt support':
                return typeof BigInt !== 'undefined';
            case 'Web Crypto API':
                return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
            case 'Secure random number generation':
                return typeof crypto !== 'undefined' && typeof crypto.getRandomValues !== 'undefined';
            default:
                return false;
        }
    }

    private formatEventName(event: string): string {
        return event.split(/(?=[A-Z])/).join(' ').replace(/^\w/, c => c.toUpperCase());
    }

    private getReadinessColor(readiness: number): string {
        if (readiness >= 80) return 'var(--text-success)';
        if (readiness >= 60) return 'var(--text-warning)';
        return 'var(--text-error)';
    }

    private async exportKeyPair(keyId: string): Promise<void> {
        try {
            const exported = this.quantumManager.exportKeyPair(keyId);
            if (!exported) {
                new Notice('Failed to export key pair');
                return;
            }

            const blob = new Blob([exported], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `post-quantum-key-${keyId}-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            new Notice('Key pair exported successfully');
        } catch (error) {
            new Notice(`Failed to export key pair: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private showImportKeyModal(onSuccess: () => void): void {
        const modal = new Modal(this.app);
        modal.contentEl.createEl('h2', { text: 'Import Post-Quantum Key Pair' });

        const textArea = modal.contentEl.createEl('textarea', {
            placeholder: 'Paste the exported key pair data here...'
        });
        textArea.style.width = '100%';
        textArea.style.height = '200px';
        textArea.style.margin = '12px 0';

        const buttonContainer = modal.contentEl.createDiv('button-container');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '12px';
        buttonContainer.style.justifyContent = 'flex-end';

        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel',
            cls: ''
        });
        cancelButton.onclick = () => modal.close();

        const importButton = buttonContainer.createEl('button', {
            text: 'Import',
            cls: 'mod-cta'
        });
        importButton.onclick = () => {
            const keyId = `imported_${Date.now()}`;
            if (this.quantumManager.importKeyPair(keyId, textArea.value)) {
                new Notice('Key pair imported successfully');
                onSuccess();
                modal.close();
            } else {
                new Notice('Failed to import key pair - invalid format');
            }
        };

        modal.open();
    }

    private async testPostQuantumEncryption(): Promise<void> {
        try {
            const testData = "This is a test of post-quantum encryption capabilities.";
            const testPassword = "test-password-123";

            // Generate test key pair
            const keyPair = await this.quantumManager.generateKeyPair();

            // Test hybrid encryption
            const result = await this.quantumManager.hybridEncrypt(testData, testPassword, keyPair.publicKey);

            // Test hybrid decryption
            const decrypted = await this.quantumManager.hybridDecrypt(
                result.combined.ciphertext,
                testPassword,
                keyPair.privateKey
            );

            if (decrypted === testData) {
                new Notice('Post-quantum encryption test successful!');
            } else {
                new Notice('Post-quantum encryption test failed - data mismatch');
            }
        } catch (error) {
            new Notice(`Post-quantum test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * Post-quantum status display component
 */
export class PostQuantumStatusDisplay {
    private containerEl: HTMLElement;
    private quantumManager: PostQuantumCryptoManager;

    constructor(containerEl: HTMLElement, quantumManager: PostQuantumCryptoManager) {
        this.containerEl = containerEl;
        this.quantumManager = quantumManager;
    }

    update(): void {
        this.containerEl.empty();
        this.containerEl.addClass('post-quantum-status');

        const readiness = this.quantumManager.getQuantumReadiness();

        // Status indicator
        const statusContainer = this.containerEl.createDiv('quantum-status');
        statusContainer.style.display = 'flex';
        statusContainer.style.alignItems = 'center';
        statusContainer.style.gap = '8px';
        statusContainer.style.marginBottom = '12px';

        const statusIcon = statusContainer.createSpan();
        const statusText = statusContainer.createSpan();

        if (readiness.supported) {
            statusIcon.textContent = '🔐';
            statusText.textContent = 'Post-quantum ready';
            statusText.style.color = 'var(--text-success)';
        } else {
            statusIcon.textContent = '⚠️';
            statusText.textContent = 'Post-quantum not supported';
            statusText.style.color = 'var(--text-warning)';
        }

        // Quick stats
        const quickStats = this.containerEl.createDiv('quick-stats');
        quickStats.style.display = 'grid';
        quickStats.style.gridTemplateColumns = 'repeat(2, 1fr)';
        quickStats.style.gap = '8px';
        quickStats.style.fontSize = '12px';

        const keyPairs = this.quantumManager.getKeyPairs();
        quickStats.createDiv().createSpan({ text: `Key Pairs: ${keyPairs.size}` });
        quickStats.createDiv().createSpan({ text: `Algorithm: ${this.quantumManager.getQuantumReadiness().threatLevel}` });
        quickStats.createDiv().createSpan({ text: `Threat Level: ${readiness.threatLevel}` });
        quickStats.createDiv().createSpan({ text: `Supported: ${readiness.supported ? 'Yes' : 'No'}` });
    }
}