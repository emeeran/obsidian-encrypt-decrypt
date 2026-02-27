/**
 * Note Encryptor - Folder Selection Modal
 * Modal for selecting a folder for batch operations
 */

import { App, Modal, TFolder } from 'obsidian';
import type { FolderSelectCallback } from '../types';

/**
 * Modal for folder selection
 */
export class FolderSelectionModal extends Modal {
    private onChoose: FolderSelectCallback;

    constructor(app: App, onChoose: FolderSelectCallback) {
        super(app);
        this.onChoose = onChoose;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('folder-selection-modal');
        contentEl.createEl('h2', { text: 'Select Folder' });

        const folderList = contentEl.createDiv({ cls: 'folder-list' });

        const folders = this.getAllFolders();

        if (folders.length === 0) {
            folderList.createEl('p', { text: 'No folders found in vault' });
            return;
        }

        for (const folder of folders) {
            const folderItem = folderList.createDiv({ cls: 'folder-item' });
            folderItem.setAttribute('role', 'button');
            folderItem.setAttribute('tabindex', '0');
            folderItem.setAttribute('aria-label', `Select folder ${folder.path || 'root'}`);

            folderItem.createSpan({ text: '📁 ' });
            folderItem.createSpan({ text: folder.path || '/' });

            const selectFolder = () => {
                this.close();
                this.onChoose(folder);
            };

            folderItem.onclick = selectFolder;
            folderItem.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectFolder();
                }
            };
        }
    }

    /**
     * Get all folders in the vault recursively
     */
    private getAllFolders(): TFolder[] {
        const folders: TFolder[] = [];

        const collectFolders = (folder: TFolder) => {
            folders.push(folder);
            for (const child of folder.children) {
                if (child instanceof TFolder) {
                    collectFolders(child);
                }
            }
        };

        collectFolders(this.app.vault.getRoot());
        return folders.sort((a, b) => a.path.localeCompare(b.path));
    }

    onClose() {
        this.contentEl.empty();
    }
}
