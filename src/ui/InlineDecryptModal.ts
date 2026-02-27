/**
 * Note Encryptor - Inline Decrypt Modal
 * Modal for viewing decrypted inline text temporarily
 */

import { App, Modal, Notice } from 'obsidian';
import { decryptInline } from '../crypto';
import { RateLimiter } from '../security';

export interface InlineDecryptModalOptions {
    minLength?: number;
    rateLimiter?: RateLimiter;
    rateLimitId?: string;
}

/**
 * Modal for viewing encrypted inline text
 */
export class InlineDecryptModal extends Modal {
    private encryptedContent: string;
    private decryptedText = '';
    private options: InlineDecryptModalOptions;

    constructor(
        app: App,
        encryptedContent: string,
        options?: InlineDecryptModalOptions
    ) {
        super(app);
        this.encryptedContent = encryptedContent;
        this.options = {
            minLength: 8,
            ...options,
        };
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('note-encryptor-modal');

        contentEl.createEl('h2', { text: '🔓 View Encrypted Text' });

        // Check rate limiting
        const rateLimitId = this.options.rateLimitId || 'inline';
        if (this.options.rateLimiter) {
            const check = this.options.rateLimiter.checkAttempt(rateLimitId);
            if (!check.allowed) {
                const waitTime = RateLimiter.formatWaitTime(check.waitTimeMs);
                contentEl.createEl('p', {
                    text: `Too many failed attempts. Please wait ${waitTime}.`,
                    cls: 'rate-limit-message'
                });
                return;
            }
        }

        // Password input
        const passwordContainer = contentEl.createDiv('password-container');
        passwordContainer.createEl('label', { text: 'Password' });
        const passwordInput = passwordContainer.createEl('input', {
            type: 'password',
            placeholder: 'Enter password',
        });
        passwordInput.addClass('password-input');
        passwordInput.setAttribute('aria-label', 'Password');

        // Error message
        const errorEl = contentEl.createDiv('error-message');
        errorEl.style.display = 'none';
        errorEl.setAttribute('role', 'alert');

        // Decrypted content container
        const decryptedContainer = contentEl.createDiv('decrypted-container');
        decryptedContainer.style.display = 'none';

        // Buttons
        const buttonContainer = contentEl.createDiv('button-container');
        const closeBtn = buttonContainer.createEl('button', { text: 'Close' });
        closeBtn.onclick = () => this.close();

        const decryptBtn = buttonContainer.createEl('button', { text: 'Decrypt' });
        decryptBtn.addClass('mod-cta');

        const copyBtn = buttonContainer.createEl('button', { text: 'Copy' });
        copyBtn.style.display = 'none';

        const handleDecrypt = async () => {
            errorEl.style.display = 'none';
            const password = passwordInput.value;

            if (password.length < this.options.minLength!) {
                errorEl.textContent = `Password must be at least ${this.options.minLength} characters`;
                errorEl.style.display = 'block';
                return;
            }

            try {
                this.decryptedText = await decryptInline(this.encryptedContent, password);
                decryptedContainer.textContent = this.decryptedText;
                decryptedContainer.style.display = 'block';
                passwordContainer.style.display = 'none';
                decryptBtn.style.display = 'none';
                copyBtn.style.display = 'inline-block';

                // Reset rate limiter on success
                if (this.options.rateLimiter) {
                    this.options.rateLimiter.reset(rateLimitId);
                }
            } catch (error) {
                // Record failed attempt
                if (this.options.rateLimiter) {
                    this.options.rateLimiter.recordAttempt(rateLimitId);
                }

                errorEl.textContent = 'Decryption failed. Wrong password?';
                errorEl.style.display = 'block';
            }
        };

        decryptBtn.onclick = handleDecrypt;

        copyBtn.onclick = () => {
            navigator.clipboard.writeText(this.decryptedText);
            new Notice('Copied to clipboard');
        };

        // Handle Enter key
        passwordInput.onkeydown = (e) => {
            if (e.key === 'Enter') handleDecrypt();
        };

        passwordInput.focus();
    }

    onClose() {
        this.decryptedText = '';
        this.contentEl.empty();
    }
}
