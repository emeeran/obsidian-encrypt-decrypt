/**
 * Note Encryptor - Password Generator Modal
 * UI for generating secure passwords
 */

import { App, Modal, Setting } from 'obsidian';
import { PasswordGenerator, PASSWORD_PRESETS, analyzePassword } from '../crypto/passwordGenerator';
import type { PasswordGeneratorOptions, GeneratedPasswordResult } from '../types';

export interface PasswordGeneratorModalOptions {
    onPasswordSelected: (password: string) => void;
    initialOptions?: Partial<PasswordGeneratorOptions>;
}

/**
 * Modal for generating and selecting passwords
 */
export class PasswordGeneratorModal extends Modal {
    private generator: PasswordGenerator;
    private options: PasswordGeneratorModalOptions;
    private currentResult: GeneratedPasswordResult | null = null;
    private passwordDisplay: HTMLElement | null = null;
    private strengthDisplay: HTMLElement | null = null;
    private entropyDisplay: HTMLElement | null = null;
    private copyButton: HTMLButtonElement | null = null;
    private useButton: HTMLButtonElement | null = null;

    private generatorOptions: PasswordGeneratorOptions = {
        length: 20,
        includeUppercase: true,
        includeLowercase: true,
        includeNumbers: true,
        includeSymbols: true,
        excludeAmbiguous: false,
        excludeSimilar: false,
    };

    constructor(app: App, options: PasswordGeneratorModalOptions) {
        super(app);
        this.options = options;
        this.generator = new PasswordGenerator(this.generatorOptions);

        if (options.initialOptions) {
            this.generatorOptions = { ...this.generatorOptions, ...options.initialOptions };
            this.generator.setOptions(this.generatorOptions);
        }
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('note-encryptor-modal', 'password-generator-modal');

        // Header
        contentEl.createEl('h2', { text: 'Password Generator' });

        // Password display area
        const displayContainer = contentEl.createDiv('password-display-container');

        this.passwordDisplay = displayContainer.createDiv('password-display');
        this.passwordDisplay.setAttribute('aria-live', 'polite');
        this.passwordDisplay.setAttribute('aria-label', 'Generated password');

        // Strength and entropy display
        const statsContainer = displayContainer.createDiv('password-stats');
        this.strengthDisplay = statsContainer.createDiv('strength-indicator');
        this.entropyDisplay = statsContainer.createDiv('entropy-indicator');

        // Action buttons
        const actionContainer = displayContainer.createDiv('password-actions');

        const regenerateBtn = actionContainer.createEl('button', { text: 'Generate' });
        regenerateBtn.addEventListener('click', () => this.generatePassword());

        this.copyButton = actionContainer.createEl('button', { text: 'Copy' });
        this.copyButton.addEventListener('click', () => this.copyPassword());

        this.useButton = actionContainer.createEl('button', { text: 'Use Password', cls: 'mod-cta' });
        this.useButton.addEventListener('click', () => this.usePassword());
        this.useButton.disabled = true;

        // Preset selection
        const presetSection = contentEl.createDiv('preset-section');
        presetSection.createEl('h3', { text: 'Presets' });

        const presetContainer = presetSection.createDiv('preset-buttons');
        for (const [key, preset] of Object.entries(PASSWORD_PRESETS)) {
            const btn = presetContainer.createEl('button', {
                text: preset.name,
                attr: { 'aria-label': preset.description },
            });
            btn.addEventListener('click', () => this.applyPreset(key as keyof typeof PASSWORD_PRESETS));
        }

        // Length slider
        new Setting(contentEl)
            .setName('Password Length')
            .setDesc(`${this.generatorOptions.length} characters`)
            .addSlider((slider) =>
                slider
                    .setLimits(8, 64, 1)
                    .setValue(this.generatorOptions.length)
                    .setDynamicTooltip()
                    .onChange((value) => {
                        this.generatorOptions.length = value;
                        this.generator.setOptions({ length: value });
                        slider.sliderEl
                            .closest('.setting-item')
                            ?.querySelector('.setting-item-description')
                            ?.setText(`${value} characters`);
                        this.generatePassword();
                    })
            );

        // Character options
        const charOptionsSection = contentEl.createDiv('character-options');
        charOptionsSection.createEl('h3', { text: 'Character Types' });

        new Setting(charOptionsSection)
            .setName('Uppercase (A-Z)')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.generatorOptions.includeUppercase)
                    .onChange((value) => {
                        this.generatorOptions.includeUppercase = value;
                        this.generator.setOptions({ includeUppercase: value });
                        this.generatePassword();
                    })
            );

        new Setting(charOptionsSection)
            .setName('Lowercase (a-z)')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.generatorOptions.includeLowercase)
                    .onChange((value) => {
                        this.generatorOptions.includeLowercase = value;
                        this.generator.setOptions({ includeLowercase: value });
                        this.generatePassword();
                    })
            );

        new Setting(charOptionsSection)
            .setName('Numbers (0-9)')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.generatorOptions.includeNumbers)
                    .onChange((value) => {
                        this.generatorOptions.includeNumbers = value;
                        this.generator.setOptions({ includeNumbers: value });
                        this.generatePassword();
                    })
            );

        new Setting(charOptionsSection)
            .setName('Symbols (!@#$%...)')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.generatorOptions.includeSymbols)
                    .onChange((value) => {
                        this.generatorOptions.includeSymbols = value;
                        this.generator.setOptions({ includeSymbols: value });
                        this.generatePassword();
                    })
            );

        // Additional options
        const additionalSection = contentEl.createDiv('additional-options');
        additionalSection.createEl('h3', { text: 'Additional Options' });

        new Setting(additionalSection)
            .setName('Exclude ambiguous characters')
            .setDesc('Remove characters like 0, O, l, 1, I')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.generatorOptions.excludeAmbiguous)
                    .onChange((value) => {
                        this.generatorOptions.excludeAmbiguous = value;
                        this.generator.setOptions({ excludeAmbiguous: value });
                        this.generatePassword();
                    })
            );

        // Close button
        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText('Cancel')
                    .onClick(() => this.close())
            );

        // Generate initial password
        this.generatePassword();

        // Add styles
        this.addStyles();
    }

    private generatePassword(): void {
        this.currentResult = this.generator.generate(this.generatorOptions);

        // Update password display
        if (this.passwordDisplay) {
            this.passwordDisplay.textContent = this.currentResult.password;
            this.passwordDisplay.setAttribute(
                'aria-label',
                `Generated password: ${this.currentResult.password}`
            );
        }

        // Update strength display
        if (this.strengthDisplay) {
            this.strengthDisplay.empty();
            this.strengthDisplay.createSpan({ text: 'Strength: ' });
            const strengthText = this.strengthDisplay.createSpan({
                text: this.currentResult.strength.text,
                attr: { style: `color: ${this.currentResult.strength.color}` },
            });
            this.strengthDisplay.createSpan({ text: ` (${this.currentResult.strength.percentage}%)` });

            // Add strength bar
            const strengthBar = this.strengthDisplay.createDiv('strength-bar');
            const strengthFill = strengthBar.createDiv('strength-fill');
            strengthFill.style.width = `${this.currentResult.strength.percentage}%`;
            strengthFill.style.backgroundColor = this.currentResult.strength.color;
        }

        // Update entropy display
        if (this.entropyDisplay) {
            this.entropyDisplay.textContent = `Entropy: ${this.currentResult.entropy} bits`;
        }

        // Enable use button
        if (this.useButton) {
            this.useButton.disabled = false;
        }
    }

    private applyPreset(preset: keyof typeof PASSWORD_PRESETS): void {
        const presetOptions = PASSWORD_PRESETS[preset].options;
        this.generatorOptions = { ...this.generatorOptions, ...presetOptions };
        this.generator.setOptions(this.generatorOptions);
        this.generatePassword();
    }

    private async copyPassword(): Promise<void> {
        if (!this.currentResult) return;

        try {
            await navigator.clipboard.writeText(this.currentResult.password);
            if (this.copyButton) {
                const originalText = this.copyButton.textContent;
                this.copyButton.textContent = 'Copied!';
                setTimeout(() => {
                    if (this.copyButton) {
                        this.copyButton.textContent = originalText;
                    }
                }, 1500);
            }
        } catch (error) {
            console.error('Failed to copy password:', error);
        }
    }

    private usePassword(): void {
        if (!this.currentResult) return;
        this.options.onPasswordSelected(this.currentResult.password);
        this.close();
    }

    private addStyles(): void {
        if (document.getElementById('password-generator-styles')) return;

        const style = document.createElement('style');
        style.id = 'password-generator-styles';
        style.textContent = `
            .password-generator-modal .password-display-container {
                background: var(--background-secondary);
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
            }

            .password-generator-modal .password-display {
                font-family: var(--font-monospace);
                font-size: 1.2em;
                letter-spacing: 0.05em;
                word-break: break-all;
                padding: 12px;
                background: var(--background-primary);
                border-radius: 4px;
                margin-bottom: 12px;
                min-height: 50px;
                display: flex;
                align-items: center;
            }

            .password-generator-modal .password-stats {
                display: flex;
                gap: 20px;
                margin-bottom: 12px;
                font-size: 0.9em;
            }

            .password-generator-modal .strength-bar {
                width: 100%;
                height: 4px;
                background: var(--background-modifier-border);
                border-radius: 2px;
                margin-top: 4px;
                overflow: hidden;
            }

            .password-generator-modal .strength-fill {
                height: 100%;
                transition: width 0.3s ease, background-color 0.3s ease;
            }

            .password-generator-modal .password-actions {
                display: flex;
                gap: 8px;
            }

            .password-generator-modal .preset-section h3,
            .password-generator-modal .character-options h3,
            .password-generator-modal .additional-options h3 {
                font-size: 1em;
                margin-bottom: 8px;
            }

            .password-generator-modal .preset-buttons {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-bottom: 16px;
            }

            .password-generator-modal .preset-buttons button {
                padding: 6px 12px;
                font-size: 0.9em;
            }
        `;
        document.head.appendChild(style);
    }

    onClose(): void {
        this.currentResult = null;
        this.contentEl.empty();
    }
}
