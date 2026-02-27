/**
 * Note Encryptor - Password Modal
 * Enhanced modal for password entry with strength indicator and rate limiting
 */

import { App, Modal, Notice } from 'obsidian';
import type { PasswordSubmitCallback } from '../types';
import { calculatePasswordStrength } from '../crypto';
import { RateLimiter } from '../security';

export interface PasswordModalOptions {
    isEncrypting: boolean;
    showStrength?: boolean;
    minLength?: number;
    title?: string;
    rateLimiter?: RateLimiter;
    rateLimitId?: string;
    rememberPassword?: boolean;
    onRememberChange?: (remember: boolean) => void;
}

/**
 * Password Modal for encryption/decryption operations
 */
export class PasswordModal extends Modal {
    private password = '';
    private confirmPassword = '';
    private rememberPassword = false;
    private onSubmit: PasswordSubmitCallback;
    private options: PasswordModalOptions;
    private isSubmitting = false;

    constructor(app: App, onSubmit: PasswordSubmitCallback, options: PasswordModalOptions) {
        super(app);
        this.onSubmit = onSubmit;
        this.options = {
            showStrength: true,
            minLength: 8,
            rememberPassword: false,
            ...options,
        };
        this.rememberPassword = this.options.rememberPassword ?? false;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('note-encryptor-modal');
        contentEl.addClass('password-modal-enhanced');

        // Check rate limiting first
        const rateLimitId = this.options.rateLimitId || 'global';
        if (this.options.rateLimiter) {
            const check = this.options.rateLimiter.checkAttempt(rateLimitId);
            if (!check.allowed) {
                this.renderLockedState(contentEl, check.waitTimeMs);
                return;
            }
        }

        this.renderPasswordForm(contentEl);
    }

    private renderLockedState(contentEl: HTMLElement, waitTimeMs: number) {
        const lockContainer = contentEl.createDiv('lockout-container');

        lockContainer.createDiv({ cls: 'lockout-icon', text: '🔒' });

        const title = lockContainer.createEl('h2', { text: 'Temporarily Locked' });
        title.addClass('lockout-title');

        const message = lockContainer.createDiv('lockout-message');
        message.textContent = `Too many failed attempts. Please wait ${RateLimiter.formatWaitTime(waitTimeMs)} before trying again.`;

        // Countdown timer
        const countdown = lockContainer.createDiv('lockout-countdown');
        let remaining = Math.ceil(waitTimeMs / 1000);

        const updateCountdown = () => {
            if (remaining <= 0) {
                this.onOpen();
                return;
            }
            countdown.textContent = `${remaining}s`;
            remaining--;
            setTimeout(updateCountdown, 1000);
        };
        updateCountdown();

        // Visual progress ring
        const progressRing = lockContainer.createDiv('lockout-progress');
        progressRing.style.setProperty('--progress', `${(waitTimeMs / 30000) * 100}%`);
    }

    private renderPasswordForm(contentEl: HTMLElement) {
        const isEncrypting = this.options.isEncrypting;
        const title = this.options.title || (isEncrypting ? '🔒 Encrypt Note' : '🔓 Decrypt Note');

        // Header
        const header = contentEl.createDiv('modal-header');
        header.createEl('h2', { text: title });

        // Mode indicator
        const modeIndicator = header.createDiv('mode-indicator');
        modeIndicator.createSpan({ cls: 'mode-icon', text: isEncrypting ? '🔐' : '🔓' });
        modeIndicator.createSpan({ text: isEncrypting ? 'Encryption Mode' : 'Decryption Mode' });

        // Form container
        const formContainer = contentEl.createDiv('form-container');

        // Password input group
        const passwordGroup = formContainer.createDiv('input-group');
        const passwordLabel = passwordGroup.createDiv('input-label');
        passwordLabel.createSpan({ text: 'Password' });

        const passwordInputWrapper = passwordGroup.createDiv('input-wrapper');
        const passwordInput = passwordInputWrapper.createEl('input', {
            type: 'password',
            placeholder: 'Enter your password',
        });
        passwordInput.addClass('password-input');
        passwordInput.setAttribute('aria-label', 'Password');
        passwordInput.spellcheck = false;

        // Password visibility toggle
        const visibilityToggle = passwordInputWrapper.createDiv('visibility-toggle');
        visibilityToggle.createSpan({ cls: 'eye-icon', text: '👁' });
        visibilityToggle.createSpan({ cls: 'eye-off-icon', text: '🙈' });
        visibilityToggle.addClass('show-password');

        let passwordVisible = false;
        visibilityToggle.addEventListener('click', () => {
            passwordVisible = !passwordVisible;
            passwordInput.type = passwordVisible ? 'text' : 'password';
            visibilityToggle.toggleClass('show-password', !passwordVisible);
            visibilityToggle.toggleClass('hide-password', passwordVisible);
        });

        // Strength indicator (for encryption)
        let strengthContainer: HTMLElement | null = null;
        let strengthBar: HTMLElement | null = null;
        let strengthText: HTMLElement | null = null;
        let strengthDetails: HTMLElement | null = null;

        if (isEncrypting && this.options.showStrength) {
            strengthContainer = formContainer.createDiv('strength-container');

            const strengthHeader = strengthContainer.createDiv('strength-header');
            strengthHeader.createSpan({ cls: 'strength-label', text: 'Password Strength' });
            strengthText = strengthHeader.createSpan({ cls: 'strength-text', text: '—' });

            strengthBar = strengthContainer.createDiv('strength-bar');
            const strengthFill = strengthBar.createDiv('strength-fill');
            strengthFill.addClass('strength-fill');

            strengthDetails = strengthContainer.createDiv('strength-details');
            const criteria = [
                { id: 'length', text: '8+ characters', check: (p: string) => p.length >= 8 },
                { id: 'uppercase', text: 'Uppercase', check: (p: string) => /[A-Z]/.test(p) },
                { id: 'lowercase', text: 'Lowercase', check: (p: string) => /[a-z]/.test(p) },
                { id: 'number', text: 'Number', check: (p: string) => /[0-9]/.test(p) },
                { id: 'special', text: 'Special char', check: (p: string) => /[^a-zA-Z0-9]/.test(p) },
            ];

            for (const c of criteria) {
                const criterion = strengthDetails.createDiv('strength-criterion');
                criterion.setAttribute('data-criterion', c.id);
                criterion.createSpan({ cls: 'criterion-check', text: '○' });
                criterion.createSpan({ cls: 'criterion-text', text: c.text });
            }
        }

        // Confirm password (for encryption)
        let confirmInput: HTMLInputElement | null = null;
        let confirmGroup: HTMLElement | null = null;

        if (isEncrypting) {
            confirmGroup = formContainer.createDiv('input-group');
            const confirmLabel = confirmGroup.createDiv('input-label');
            confirmLabel.createSpan({ text: 'Confirm Password' });

            const confirmWrapper = confirmGroup.createDiv('input-wrapper');
            confirmInput = confirmWrapper.createEl('input', {
                type: 'password',
                placeholder: 'Confirm your password',
            });
            confirmInput.addClass('password-input');
            confirmInput.setAttribute('aria-label', 'Confirm password');
            confirmInput.spellcheck = false;

            // Match indicator
            const matchIndicator = confirmGroup.createDiv('match-indicator');
            matchIndicator.createSpan({ cls: 'match-icon match-yes', text: '✓' });
            matchIndicator.createSpan({ cls: 'match-icon match-no', text: '✗' });
            matchIndicator.createSpan({ cls: 'match-text', text: 'Passwords match' });
        }

        // Remember password option (for decryption)
        let rememberToggle: HTMLInputElement | null = null;
        if (!isEncrypting) {
            const rememberGroup = formContainer.createDiv('remember-group');
            rememberToggle = rememberGroup.createEl('input', { type: 'checkbox' });
            rememberToggle.id = 'remember-password';
            rememberToggle.checked = this.rememberPassword;

            const rememberLabel = rememberGroup.createEl('label', { text: 'Remember password for this session' });
            rememberLabel.setAttribute('for', 'remember-password');

            rememberToggle.addEventListener('change', () => {
                this.rememberPassword = rememberToggle!.checked;
                if (this.options.onRememberChange) {
                    this.options.onRememberChange(this.rememberPassword);
                }
            });
        }

        // Error message
        const errorEl = contentEl.createDiv('error-message');
        errorEl.style.display = 'none';
        errorEl.setAttribute('role', 'alert');

        // Buttons
        const buttonContainer = contentEl.createDiv('button-container');

        const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
        cancelBtn.addClass('btn-secondary');

        const submitBtn = buttonContainer.createEl('button', {
            text: isEncrypting ? 'Encrypt' : 'Decrypt',
        });
        submitBtn.addClass('mod-cta');
        submitBtn.addClass('btn-primary');

        // Loading state element
        const loadingSpinner = submitBtn.createSpan('loading-spinner');
        loadingSpinner.style.display = 'none';

        // Event handlers
        passwordInput.oninput = () => {
            this.password = passwordInput.value;
            this.updateStrengthIndicator(strengthBar, strengthText, strengthDetails);
            this.updateMatchIndicator(confirmGroup, confirmInput);
        };

        if (confirmInput) {
            confirmInput.oninput = () => {
                this.confirmPassword = confirmInput!.value;
                this.updateMatchIndicator(confirmGroup, confirmInput);
            };
        }

        const handleSubmit = async () => {
            if (this.isSubmitting) return;

            errorEl.style.display = 'none';

            // Validate length
            if (this.password.length < this.options.minLength!) {
                this.showError(errorEl, `Password must be at least ${this.options.minLength} characters`);
                return;
            }

            // Validate confirmation
            if (isEncrypting && this.password !== this.confirmPassword) {
                this.showError(errorEl, 'Passwords do not match');
                return;
            }

            // Show loading state
            this.isSubmitting = true;
            submitBtn.addClass('loading');
            submitBtn.disabled = true;
            loadingSpinner.style.display = 'inline';

            try {
                await this.onSubmit(this.password);
                this.close();
            } catch (error) {
                this.showError(errorEl, error instanceof Error ? error.message : 'Operation failed');
                this.isSubmitting = false;
                submitBtn.removeClass('loading');
                submitBtn.disabled = false;
                loadingSpinner.style.display = 'none';
            }
        };

        submitBtn.onclick = handleSubmit;
        cancelBtn.onclick = () => this.close();

        // Handle Enter key
        const handleEnter = (e: KeyboardEvent) => {
            if (e.key === 'Enter') handleSubmit();
        };
        passwordInput.onkeydown = handleEnter;
        if (confirmInput) confirmInput.onkeydown = handleEnter;

        // Focus password input
        setTimeout(() => passwordInput.focus(), 50);
    }

    private updateStrengthIndicator(
        strengthBar: HTMLElement | null,
        strengthText: HTMLElement | null,
        strengthDetails: HTMLElement | null
    ) {
        if (!this.options.showStrength || !strengthBar || !strengthText) return;

        const strength = calculatePasswordStrength(this.password);
        const fill = strengthBar.querySelector('.strength-fill') as HTMLElement;

        if (fill) {
            fill.style.width = `${strength.percentage}%`;
            fill.style.backgroundColor = strength.color;
        }

        strengthText.textContent = this.password ? strength.text : '—';
        strengthText.style.color = this.password ? strength.color : 'var(--text-muted)';

        // Update criterion checks
        if (strengthDetails) {
            const criteria = [
                { id: 'length', check: (p: string) => p.length >= 8 },
                { id: 'uppercase', check: (p: string) => /[A-Z]/.test(p) },
                { id: 'lowercase', check: (p: string) => /[a-z]/.test(p) },
                { id: 'number', check: (p: string) => /[0-9]/.test(p) },
                { id: 'special', check: (p: string) => /[^a-zA-Z0-9]/.test(p) },
            ];

            for (const c of criteria) {
                const el = strengthDetails.querySelector(`[data-criterion="${c.id}"]`);
                if (el) {
                    const passed = c.check(this.password);
                    el.toggleClass('passed', passed);
                    const check = el.querySelector('.criterion-check');
                    if (check) {
                        check.textContent = passed ? '●' : '○';
                    }
                }
            }
        }
    }

    private updateMatchIndicator(confirmGroup: HTMLElement | null, confirmInput: HTMLInputElement | null) {
        if (!confirmGroup || !confirmInput) return;

        const matchIndicator = confirmGroup.querySelector('.match-indicator');
        if (!matchIndicator) return;

        const hasValue = confirmInput.value.length > 0;
        const matches = this.password === confirmInput.value;

        matchIndicator.toggleClass('visible', hasValue);
        matchIndicator.toggleClass('matching', hasValue && matches);
        matchIndicator.toggleClass('mismatch', hasValue && !matches);

        const matchText = matchIndicator.querySelector('.match-text');
        if (matchText) {
            matchText.textContent = matches ? 'Passwords match' : 'Passwords do not match';
        }
    }

    private showError(errorEl: HTMLElement, message: string) {
        errorEl.empty();
        errorEl.createSpan({ cls: 'error-icon', text: '⚠️ ' });
        errorEl.appendText(message);
        errorEl.style.display = 'block';

        // Shake animation
        errorEl.removeClass('shake');
        void errorEl.offsetWidth; // Trigger reflow
        errorEl.addClass('shake');
    }

    onClose() {
        this.password = '';
        this.confirmPassword = '';
        this.isSubmitting = false;
        this.contentEl.empty();
    }
}
