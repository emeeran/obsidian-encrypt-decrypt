/**
 * Enhanced Password Modal
 * A feature-rich password modal with strength indicator and validation
 */

import { App, Modal, Notice, Setting } from 'obsidian';
import { calculatePasswordStrength, PasswordStrength } from '../../utils/password-utils';
import { injectPasswordModalStyles } from '../style-manager';

/**
 * Password settings interface
 */
export interface PasswordModalSettings {
    passwordMinLength: number;
    requireStrongPasswords: boolean;
    showPasswordStrength: boolean;
}

/**
 * Password validation result
 */
export interface PasswordValidation {
    valid: boolean;
    reason?: string;
}

/**
 * Password validator function type
 */
export type PasswordValidator = (password: string) => PasswordValidation;

/**
 * Enhanced password modal with strength indicator and validation
 */
export class EnhancedPasswordModal extends Modal {
    password: string = '';
    onSubmit: (password: string) => void;
    isEncrypting: boolean;
    settings: PasswordModalSettings;
    strengthEl: HTMLElement | null = null;
    confirmInput: HTMLInputElement | null = null;
    private validator?: PasswordValidator;

    constructor(
        app: App,
        isEncrypting: boolean,
        settings: PasswordModalSettings,
        onSubmit: (password: string) => void,
        validator?: PasswordValidator
    ) {
        super(app);
        this.onSubmit = onSubmit;
        this.isEncrypting = isEncrypting;
        this.settings = settings;
        this.validator = validator;
    }

    onOpen(): void {
        injectPasswordModalStyles();
        
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('password-modal');

        contentEl.createEl('h2', { 
            text: this.isEncrypting ? 'Encrypt Note' : 'Decrypt Note' 
        });

        new Setting(contentEl)
            .setName('Password')
            .setDesc(this.isEncrypting 
                ? 'Enter a strong password to encrypt the note' 
                : 'Enter the password to decrypt the note')
            .addText(text => {
                text.setPlaceholder('Enter password')
                    .onChange(value => {
                        this.password = value;
                        this.updatePasswordStrength(value);
                    });
                text.inputEl.setAttribute('type', 'password');
                text.inputEl.focus();
            });

        // Add password strength indicator for encryption
        if (this.isEncrypting && this.settings.showPasswordStrength) {
            this.strengthEl = contentEl.createDiv('password-strength-indicator');
            this.updatePasswordStrength('');
        }

        if (this.isEncrypting) {
            new Setting(contentEl)
                .setName('Confirm Password')
                .setDesc('Re-enter your password to confirm')
                .addText(text => {
                    text.setPlaceholder('Confirm password');
                    text.inputEl.setAttribute('type', 'password');
                    this.confirmInput = text.inputEl;
                });

            this.createPasswordRequirements(contentEl);

            new Setting(contentEl)
                .addButton(btn => btn
                    .setButtonText('Encrypt')
                    .setCta()
                    .onClick(async () => {
                        await this.handleEncryptSubmit();
                    }));
        } else {
            new Setting(contentEl)
                .addButton(btn => btn
                    .setButtonText('Decrypt')
                    .setCta()
                    .onClick(async () => {
                        await this.handleDecryptSubmit();
                    }));
        }

        // Add keyboard shortcuts
        this.scope.register([], 'Enter', () => {
            if (this.isEncrypting) {
                this.handleEncryptSubmit();
            } else {
                this.handleDecryptSubmit();
            }
            return false;
        });
    }

    private createPasswordRequirements(containerEl: HTMLElement): void {
        const requirementsEl = containerEl.createDiv('password-requirements');
        requirementsEl.createEl('h4', { text: 'Password Requirements:' });

        const requirements = [
            `At least ${this.settings.passwordMinLength} characters`,
            this.settings.requireStrongPasswords 
                ? 'Contains uppercase, lowercase, and numbers' 
                : null,
            'Maximum 1024 characters'
        ].filter(Boolean);

        requirements.forEach(req => {
            if (req) {
                requirementsEl.createEl('div', {
                    text: `• ${req}`,
                    cls: 'requirement-item'
                });
            }
        });
    }

    private updatePasswordStrength(password: string): void {
        if (!this.strengthEl) return;

        const strength: PasswordStrength = calculatePasswordStrength(password);

        this.strengthEl.innerHTML = `
            <div class="strength-container">
                <div class="strength-label">Password Strength:</div>
                <div class="strength-bar">
                    <div class="strength-fill" style="width: ${strength.percentage}%; background-color: ${strength.color}"></div>
                </div>
                <div class="strength-text" style="color: ${strength.color}">${strength.text}</div>
            </div>
        `;
    }

    private async handleEncryptSubmit(): Promise<void> {
        try {
            if (!this.password) {
                new Notice('Please enter a password');
                return;
            }

            if (!this.confirmInput) {
                throw new Error('Confirm input not found');
            }

            if (this.password !== this.confirmInput.value) {
                new Notice('Passwords do not match');
                return;
            }

            // Validate password
            if (this.validator) {
                const validation = this.validator(this.password);
                if (!validation.valid) {
                    new Notice(validation.reason || 'Invalid password');
                    return;
                }
            }

            this.close();
            this.onSubmit(this.password);
        } catch (error) {
            new Notice('Error validating password: ' + (error instanceof Error ? error.message : String(error)));
        }
    }

    private async handleDecryptSubmit(): Promise<void> {
        if (!this.password) {
            new Notice('Please enter a password');
            return;
        }

        this.close();
        this.onSubmit(this.password);
    }

    onClose(): void {
        // Security: Clear password from memory
        this.password = '';
        if (this.confirmInput) {
            this.confirmInput.value = '';
        }
        
        const { contentEl } = this;
        contentEl.empty();
    }
}
