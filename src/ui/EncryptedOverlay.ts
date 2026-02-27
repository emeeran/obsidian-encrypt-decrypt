/**
 * Note Encryptor - Encrypted Overlay
 * Enhanced overlay component for hiding encrypted content in the editor
 */

import { TFile, MarkdownView } from 'obsidian';

/**
 * Class managing the encrypted content overlay
 */
export class EncryptedOverlay {
    /**
     * Add overlay styles to the document
     */
    static addStyles(): void {
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
                background: linear-gradient(135deg, var(--background-primary) 0%, var(--background-secondary) 100%);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 100;
                gap: 20px;
                animation: overlayFadeIn 0.3s ease;
            }

            @keyframes overlayFadeIn {
                from {
                    opacity: 0;
                    transform: scale(0.98);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }

            .overlay-card {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 40px 50px;
                background: var(--background-primary);
                border-radius: 16px;
                box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1), 0 0 0 1px var(--background-modifier-border);
                animation: cardSlideUp 0.4s ease;
            }

            @keyframes cardSlideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .overlay-icon-container {
                position: relative;
                width: 80px;
                height: 80px;
                margin-bottom: 16px;
            }

            .overlay-lock-icon {
                width: 80px;
                height: 80px;
                color: var(--text-muted);
                animation: lockPulse 2.5s ease-in-out infinite;
            }

            @keyframes lockPulse {
                0%, 100% {
                    transform: scale(1);
                    opacity: 0.7;
                }
                50% {
                    transform: scale(1.08);
                    opacity: 1;
                }
            }

            .overlay-shield {
                position: absolute;
                top: -8px;
                right: -8px;
                width: 28px;
                height: 28px;
                background: var(--interactive-accent);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: shieldBounce 2s ease-in-out infinite;
            }

            @keyframes shieldBounce {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }

            .overlay-shield svg {
                width: 16px;
                height: 16px;
                color: var(--text-on-accent);
            }

            .overlay-title {
                font-size: 1.5em;
                font-weight: 600;
                color: var(--text-normal);
                margin-bottom: 8px;
            }

            .overlay-subtitle {
                font-size: 0.95em;
                color: var(--text-muted);
                margin-bottom: 4px;
            }

            .overlay-filename {
                font-size: 0.9em;
                color: var(--text-faint);
                padding: 6px 16px;
                background: var(--background-secondary);
                border-radius: 6px;
                margin-bottom: 24px;
                max-width: 300px;
                text-align: center;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .overlay-info {
                display: flex;
                gap: 24px;
                margin-bottom: 24px;
                padding: 12px 20px;
                background: var(--background-secondary);
                border-radius: 10px;
            }

            .overlay-info-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
            }

            .overlay-info-icon {
                font-size: 18px;
            }

            .overlay-info-label {
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: var(--text-faint);
            }

            .overlay-info-value {
                font-size: 12px;
                font-weight: 500;
                color: var(--text-muted);
            }

            .overlay-actions {
                display: flex;
                gap: 12px;
            }

            .overlay-decrypt-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 28px;
                font-size: 14px;
                font-weight: 500;
                background: var(--interactive-accent);
                color: var(--text-on-accent);
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 2px 8px rgba(var(--interactive-accent-rgb), 0.3);
            }

            .overlay-decrypt-btn:hover {
                background: var(--interactive-accent-hover);
                transform: translateY(-2px);
                box-shadow: 0 4px 16px rgba(var(--interactive-accent-rgb), 0.4);
            }

            .overlay-decrypt-btn:active {
                transform: translateY(0);
            }

            .overlay-decrypt-btn:focus {
                outline: 2px solid var(--interactive-accent);
                outline-offset: 2px;
            }

            .overlay-secondary-btn {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 12px 20px;
                font-size: 14px;
                font-weight: 500;
                background: var(--background-modifier-border);
                color: var(--text-normal);
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .overlay-secondary-btn:hover {
                background: var(--background-modifier-hover);
            }

            .overlay-hint {
                font-size: 11px;
                color: var(--text-faint);
                margin-top: 16px;
            }

            .overlay-hint kbd {
                padding: 2px 6px;
                background: var(--background-modifier-border);
                border-radius: 4px;
                font-family: var(--font-monospace);
                font-size: 10px;
            }

            /* Decorative background pattern */
            .overlay-bg-pattern {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                opacity: 0.03;
                pointer-events: none;
                background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
                background-size: 30px 30px;
            }

            /* Theme adaptations */
            .theme-dark .overlay-card {
                box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3), 0 0 0 1px var(--background-modifier-border);
            }

            .theme-dark .overlay-bg-pattern {
                opacity: 0.02;
            }

            /* Settings V2 - Compact Drawer Styles */
            .note-encryptor-settings-v2 h2 {
                margin: 0 0 4px 0;
                font-size: 1.2em;
            }

            .settings-header-v2 {
                margin-bottom: 12px;
            }

            .shortcuts-inline {
                font-size: 0.8em;
                color: var(--text-muted);
                margin-bottom: 8px;
            }

            .shortcuts-inline .kb {
                font-family: var(--font-monospace);
                background: var(--background-modifier-border);
                padding: 1px 5px;
                border-radius: 3px;
                font-size: 0.9em;
            }

            .drawer-v2 {
                margin-bottom: 2px;
                border-radius: 4px;
                overflow: hidden;
            }

            .drawer-head {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: var(--background-secondary);
                cursor: pointer;
                font-size: 0.9em;
                transition: background 0.15s;
            }

            .drawer-head:hover {
                background: var(--background-modifier-hover);
            }

            .dr-icon {
                font-size: 1em;
            }

            .dr-title {
                flex: 1;
                font-weight: 500;
            }

            .dr-arrow {
                font-size: 0.7em;
                color: var(--text-faint);
                transition: transform 0.2s;
            }

            .drawer-body {
                padding: 4px 0;
                background: var(--background-primary);
                border-top: 1px solid var(--background-modifier-border);
            }

            .drawer-body .setting-item {
                padding: 6px 12px;
            }

            .drawer-body .setting-item-name {
                font-size: 0.85em;
            }

            .drawer-body .setting-item-description {
                font-size: 0.75em;
            }

            .profile-row {
                display: flex;
                gap: 6px;
                padding: 8px 12px;
            }

            .profile-btn {
                flex: 1;
                padding: 8px;
                text-align: center;
                background: var(--background-secondary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.8em;
                transition: all 0.15s;
            }

            .profile-btn:hover {
                background: var(--background-modifier-hover);
            }

            .profile-btn.active {
                border-color: var(--interactive-accent);
                background: var(--interactive-accent-hover);
                color: var(--text-on-accent);
            }

            .char-toggles .setting-item {
                padding: 4px 12px;
            }

            .settings-footer-v2 {
                margin-top: 16px;
                padding-top: 12px;
                border-top: 1px solid var(--background-modifier-border);
                font-size: 0.75em;
                color: var(--text-faint);
            }

            .settings-footer-v2 a {
                color: var(--text-accent);
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Create an overlay element for an encrypted file
     */
    static create(
        file: TFile,
        onDecrypt: () => void,
        onView?: () => void
    ): HTMLElement {
        const overlay = document.createElement('div');
        overlay.className = 'encrypted-content-overlay';

        // Background pattern
        const bgPattern = document.createElement('div');
        bgPattern.className = 'overlay-bg-pattern';
        overlay.appendChild(bgPattern);

        // Card container
        const card = document.createElement('div');
        card.className = 'overlay-card';

        // Icon container with shield
        const iconContainer = document.createElement('div');
        iconContainer.className = 'overlay-icon-container';

        const lockIcon = document.createElement('div');
        lockIcon.className = 'overlay-lock-icon';
        lockIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
        `;
        iconContainer.appendChild(lockIcon);

        const shield = document.createElement('div');
        shield.className = 'overlay-shield';
        shield.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
        `;
        shield.setAttribute('aria-hidden', 'true');
        iconContainer.appendChild(shield);

        card.appendChild(iconContainer);

        // Title
        const title = document.createElement('div');
        title.className = 'overlay-title';
        title.textContent = 'Note Encrypted';
        card.appendChild(title);

        // Subtitle
        const subtitle = document.createElement('div');
        subtitle.className = 'overlay-subtitle';
        subtitle.textContent = 'This note is protected with AES-256 encryption';
        card.appendChild(subtitle);

        // Filename
        const filename = document.createElement('div');
        filename.className = 'overlay-filename';
        filename.textContent = file.basename;
        filename.title = file.path;
        card.appendChild(filename);

        // Info badges
        const info = document.createElement('div');
        info.className = 'overlay-info';

        const infoItems = [
            { icon: '🔐', label: 'Algorithm', value: 'AES-256' },
            { icon: '🛡️', label: 'Mode', value: 'GCM' },
            { icon: '🔑', label: 'KDF', value: 'PBKDF2' },
        ];

        for (const item of infoItems) {
            const infoItem = document.createElement('div');
            infoItem.className = 'overlay-info-item';

            const icon = document.createElement('span');
            icon.className = 'overlay-info-icon';
            icon.textContent = item.icon;

            const label = document.createElement('span');
            label.className = 'overlay-info-label';
            label.textContent = item.label;

            const value = document.createElement('span');
            value.className = 'overlay-info-value';
            value.textContent = item.value;

            infoItem.appendChild(icon);
            infoItem.appendChild(label);
            infoItem.appendChild(value);
            info.appendChild(infoItem);
        }
        card.appendChild(info);

        // Actions
        const actions = document.createElement('div');
        actions.className = 'overlay-actions';

        const decryptBtn = document.createElement('button');
        decryptBtn.className = 'overlay-decrypt-btn';
        decryptBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
            </svg>
            Decrypt to View
        `;
        decryptBtn.setAttribute('aria-label', 'Decrypt this note to view contents');
        decryptBtn.onclick = onDecrypt;

        actions.appendChild(decryptBtn);
        card.appendChild(actions);

        // Keyboard hint
        const hint = document.createElement('div');
        hint.className = 'overlay-hint';
        hint.innerHTML = 'Press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>D</kbd> to decrypt';
        card.appendChild(hint);

        overlay.appendChild(card);
        return overlay;
    }

    /**
     * Add overlay to a view container
     */
    static addToView(
        view: MarkdownView,
        file: TFile,
        onDecrypt: () => void
    ): void {
        const container = view.containerEl;
        const contentContainer =
            container.querySelector('.cm-editor') as HTMLElement ||
            container.querySelector('.markdown-preview-view') as HTMLElement;

        if (!contentContainer) return;

        const parentEl = contentContainer.parentElement;
        if (!parentEl) return;

        // Remove any existing overlay first
        EncryptedOverlay.removeFromView(view);

        // Add new overlay
        const overlay = EncryptedOverlay.create(file, onDecrypt);
        parentEl.style.position = 'relative';
        parentEl.appendChild(overlay);
    }

    /**
     * Remove overlay from a view
     */
    static removeFromView(view: MarkdownView): void {
        const container = view.containerEl;
        const overlay = container.querySelector('.encrypted-content-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    /**
     * Check if a view has an overlay
     */
    static hasOverlay(view: MarkdownView): boolean {
        const container = view.containerEl;
        return !!container.querySelector('.encrypted-content-overlay');
    }
}
