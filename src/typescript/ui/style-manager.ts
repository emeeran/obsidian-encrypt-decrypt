/**
 * Style Manager
 * Centralized style injection to prevent duplicate style tags
 */

import { UI_CONSTANTS } from '../core/constants';

/**
 * Inject styles only if not already present
 */
export function injectStyles(styleId: string, css: string): void {
    if (document.getElementById(styleId)) {
        return; // Already injected
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
}

/**
 * Remove injected styles
 */
export function removeStyles(styleId: string): void {
    const style = document.getElementById(styleId);
    if (style) {
        style.remove();
    }
}

/**
 * Password modal styles
 */
export function injectPasswordModalStyles(): void {
    injectStyles(UI_CONSTANTS.STYLE_IDS.PASSWORD_MODAL, `
        .password-modal .password-strength-indicator {
            margin: 16px 0;
            padding: 12px;
            border: 1px solid var(--background-modifier-border);
            border-radius: 6px;
            background-color: var(--background-secondary);
        }

        .password-modal .strength-container {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .password-modal .strength-label {
            min-width: 120px;
            font-size: 14px;
            font-weight: 500;
        }

        .password-modal .strength-bar {
            flex: 1;
            height: 8px;
            background-color: var(--background-modifier-border);
            border-radius: 4px;
            overflow: hidden;
        }

        .password-modal .strength-fill {
            height: 100%;
            transition: width 0.3s ease, background-color 0.3s ease;
            border-radius: 4px;
        }

        .password-modal .strength-text {
            min-width: 80px;
            font-size: 12px;
            font-weight: 600;
            text-align: right;
        }

        .password-modal .password-requirements {
            margin: 16px 0;
            padding: 12px;
            background-color: var(--background-secondary-alt);
            border-radius: 6px;
            border-left: 3px solid var(--interactive-accent);
        }

        .password-modal .password-requirements h4 {
            margin: 0 0 8px 0;
            font-size: 14px;
            color: var(--text-normal);
        }

        .password-modal .requirement-item {
            font-size: 12px;
            color: var(--text-muted);
            margin: 4px 0;
        }

        .modal-button-container {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            margin-top: 16px;
        }

        .modal-button-container button {
            padding: 8px 16px;
            border-radius: 4px;
            border: 1px solid var(--background-modifier-border);
            background-color: var(--interactive-normal);
            color: var(--text-normal);
            cursor: pointer;
        }

        .modal-button-container button:hover {
            background-color: var(--interactive-hover);
        }

        .modal-button-container button.mod-cta {
            background-color: var(--interactive-accent);
            color: var(--text-on-accent);
            border-color: var(--interactive-accent);
        }
    `);
}

/**
 * Settings tab styles
 */
export function injectSettingsStyles(): void {
    injectStyles(UI_CONSTANTS.STYLE_IDS.SETTINGS, `
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
            padding: 8px;
            background: var(--background-modifier-success);
            border-radius: 4px;
            margin-bottom: 12px;
        }

        .unsupported-info {
            color: var(--text-warning);
            padding: 8px;
            background: var(--background-modifier-warning);
            border-radius: 4px;
            margin-bottom: 12px;
        }

        .performance-metrics {
            margin: 16px 0;
            padding: 12px;
            background: var(--background-secondary);
            border-radius: 6px;
        }

        .metrics-info div {
            margin: 4px 0;
            font-size: 13px;
            font-family: var(--font-monospace);
        }
    `);
}

/**
 * Directory modal styles
 */
export function injectDirectoryModalStyles(): void {
    injectStyles(UI_CONSTANTS.STYLE_IDS.DIRECTORY_MODAL, `
        .directory-modal .folder-list {
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid var(--background-modifier-border);
            border-radius: 6px;
            margin: 12px 0;
        }

        .directory-modal .folder-item {
            padding: 8px 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            border-bottom: 1px solid var(--background-modifier-border);
        }

        .directory-modal .folder-item:last-child {
            border-bottom: none;
        }

        .directory-modal .folder-item:hover {
            background-color: var(--background-modifier-hover);
        }

        .directory-modal .folder-item.selected {
            background-color: var(--interactive-accent);
            color: var(--text-on-accent);
        }

        .directory-modal .folder-icon {
            width: 16px;
            height: 16px;
        }

        .directory-modal .progress-container {
            margin: 16px 0;
        }

        .directory-modal .progress-bar {
            height: 8px;
            background-color: var(--background-modifier-border);
            border-radius: 4px;
            overflow: hidden;
        }

        .directory-modal .progress-fill {
            height: 100%;
            background-color: var(--interactive-accent);
            transition: width 0.3s ease;
        }

        .directory-modal .progress-text {
            margin-top: 8px;
            font-size: 12px;
            color: var(--text-muted);
            text-align: center;
        }

        .directory-modal .summary-section {
            margin-top: 16px;
            padding: 12px;
            background: var(--background-secondary);
            border-radius: 6px;
        }

        .directory-modal .summary-row {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
            font-size: 13px;
        }

        .directory-modal .summary-row.success {
            color: var(--text-success);
        }

        .directory-modal .summary-row.error {
            color: var(--text-error);
        }

        .directory-modal .summary-row.skipped {
            color: var(--text-muted);
        }
    `);
}

/**
 * Error modal styles
 */
export function injectErrorModalStyles(): void {
    injectStyles(UI_CONSTANTS.STYLE_IDS.ERROR_MODAL, `
        .error-modal .error-message {
            color: var(--text-error);
            padding: 12px;
            background: var(--background-modifier-error);
            border-radius: 6px;
            margin: 12px 0;
        }

        .error-modal .suggestions-list {
            margin: 12px 0;
            padding-left: 20px;
        }

        .error-modal .suggestions-list li {
            margin: 6px 0;
            color: var(--text-muted);
        }

        .error-modal .button-container {
            display: flex;
            gap: 8px;
            justify-content: center;
            margin-top: 16px;
        }

        .password-retry-modal .error-message {
            color: var(--text-error);
            padding: 12px;
            background: var(--background-modifier-error);
            border-radius: 6px;
            margin: 12px 0;
        }
    `);
}

/**
 * Inject all plugin styles
 */
export function injectAllStyles(): void {
    injectPasswordModalStyles();
    injectSettingsStyles();
    injectDirectoryModalStyles();
    injectErrorModalStyles();
}

/**
 * Remove all plugin styles
 */
export function removeAllStyles(): void {
    Object.values(UI_CONSTANTS.STYLE_IDS).forEach(removeStyles);
}
