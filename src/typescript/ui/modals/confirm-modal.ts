/**
 * Confirmation Modal
 * A reusable modal for confirming sensitive operations
 */

import { App, Modal } from 'obsidian';

/**
 * Modal for confirming sensitive operations
 */
export class ConfirmModal extends Modal {
    result: boolean = false;
    onSubmit: (confirmed: boolean) => void;
    private title: string;
    private message: string;

    constructor(
        app: App,
        title: string,
        message: string,
        onSubmit: (confirmed: boolean) => void
    ) {
        super(app);
        this.title = title;
        this.message = message;
        this.onSubmit = onSubmit;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: this.title });
        contentEl.createEl('p', { text: this.message });

        const buttonContainer = contentEl.createDiv('modal-button-container');

        const cancelButton = buttonContainer.createEl('button', { 
            text: 'Cancel', 
            cls: 'mod-cta' 
        });
        const confirmButton = buttonContainer.createEl('button', { 
            text: 'Confirm' 
        });

        cancelButton.onclick = () => {
            this.result = false;
            this.close();
        };

        confirmButton.onclick = () => {
            this.result = true;
            this.close();
        };

        // Add keyboard shortcuts
        this.scope.register([], 'Escape', () => {
            this.result = false;
            this.close();
            return false;
        });

        this.scope.register([], 'Enter', () => {
            this.result = true;
            this.close();
            return false;
        });
    }

    onClose(): void {
        this.onSubmit(this.result);
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * Utility function to show a confirmation dialog
 * @returns Promise that resolves to true if confirmed, false if cancelled
 */
export function showConfirmation(
    app: App,
    title: string,
    message: string
): Promise<boolean> {
    return new Promise((resolve) => {
        new ConfirmModal(app, title, message, (confirmed) => {
            resolve(confirmed);
        }).open();
    });
}
