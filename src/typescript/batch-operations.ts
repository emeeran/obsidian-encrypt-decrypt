/**
 * Batch Operations Manager for multiple note encryption/decryption
 * Provides efficient bulk processing with progress tracking and error handling
 */

import { App, TFile, Notice, Modal } from 'obsidian';
import { enhancedEncryptionService } from './enhanced-encryption';

export interface BatchOptions {
    password: string;
    confirmBeforeProcessing?: boolean;
    continueOnError?: boolean;
    skipAlreadyEncrypted?: boolean;
    addEncryptedPrefix?: boolean;
}

export interface BatchOperation {
    file: TFile;
    operation: 'encrypt' | 'decrypt';
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
    error?: string;
    startTime?: number;
    endTime?: number;
    originalSize?: number;
    processedSize?: number;
}

export interface BatchProgress {
    current: number;
    total: number;
    fileName: string;
    operation: 'encrypt' | 'decrypt';
    operationTime: number;
    bytesProcessed: number;
    totalBytes: number;
    errors: number;
    successRate: number;
}

export interface BatchResult {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
    errors: Array<{ file: string; error: string }>;
    totalTime: number;
    totalBytes: number;
    averageTimePerFile: number;
}

export class BatchOperationsManager {
    private app: App;
    private queue: BatchOperation[] = [];
    private _isProcessing = false;
    private progressCallback?: (progress: BatchProgress) => void;
    private abortController: AbortController | null = null;

    constructor(app: App) {
        this.app = app;
    }

    /**
     * Encrypt multiple files
     */
    async encryptMultipleFiles(
        files: TFile[],
        options: BatchOptions,
        progressCallback?: (progress: BatchProgress) => void
    ): Promise<BatchResult> {
        this.progressCallback = progressCallback;
        this.queue = files.map(file => ({
            file,
            operation: 'encrypt' as const,
            status: 'pending' as const
        }));

        // Filter out already encrypted files if requested
        if (options.skipAlreadyEncrypted) {
            const preFiltered = await this.preFilterFiles(this.queue, 'encrypt');
            this.queue = preFiltered.filtered;

            if (preFiltered.skipped > 0) {
                new Notice(`Skipping ${preFiltered.skipped} already encrypted files`);
            }
        }

        // Confirmation dialog
        if (options.confirmBeforeProcessing) {
            const confirmed = await this.showConfirmationDialog(
                'Encrypt Multiple Files',
                `Process ${this.queue.length} files with encryption?`
            );
            if (!confirmed) {
                return { total: 0, successful: 0, failed: 0, skipped: 0, errors: [], totalTime: 0, totalBytes: 0, averageTimePerFile: 0 };
            }
        }

        return this.processQueue(options);
    }

    /**
     * Decrypt multiple files
     */
    async decryptMultipleFiles(
        files: TFile[],
        options: BatchOptions,
        progressCallback?: (progress: BatchProgress) => void
    ): Promise<BatchResult> {
        this.progressCallback = progressCallback;
        this.queue = files.map(file => ({
            file,
            operation: 'decrypt' as const,
            status: 'pending' as const
        }));

        // Filter out non-encrypted files
        const preFiltered = await this.preFilterFiles(this.queue, 'decrypt');
        this.queue = preFiltered.filtered;

        if (preFiltered.skipped > 0) {
            new Notice(`Skipping ${preFiltered.skipped} non-encrypted files`);
        }

        // Confirmation dialog
        if (options.confirmBeforeProcessing) {
            const confirmed = await this.showConfirmationDialog(
                'Decrypt Multiple Files',
                `Process ${this.queue.length} files with decryption?`
            );
            if (!confirmed) {
                return { total: 0, successful: 0, failed: 0, skipped: 0, errors: [], totalTime: 0, totalBytes: 0, averageTimePerFile: 0 };
            }
        }

        return this.processQueue(options);
    }

    /**
     * Cancel current batch operation
     */
    abort(): void {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
            new Notice('Batch operation cancelled');
        }
    }

    /**
     * Check if batch operation is in progress
     */
    get isProcessing(): boolean {
        return this._isProcessing;
    }

    /**
     * Get current queue status
     */
    getQueueStatus(): { pending: number; processing: number; completed: number; failed: number; skipped: number } {
        const status = { pending: 0, processing: 0, completed: 0, failed: 0, skipped: 0 };

        for (const operation of this.queue) {
            status[operation.status]++;
        }

        return status;
    }

    /**
     * Estimate processing time for files
     */
    async estimateProcessingTime(files: TFile[]): Promise<{ estimatedTime: number; fileSize: number }> {
        let totalSize = 0;
        let sampleSize = 0;
        let sampleCount = 0;

        // Sample first 10 files to estimate performance
        const sampleFiles = files.slice(0, Math.min(10, files.length));

        for (const file of sampleFiles) {
            try {
                const content = await this.app.vault.read(file);
                const size = new TextEncoder().encode(content).length;
                totalSize += size;
                sampleSize += size;
                sampleCount++;
            } catch (error) {
                // Skip files that can't be read
            }
        }

        // If we have samples, estimate performance
        if (sampleCount > 0) {
            // Estimate based on average file size and typical performance
            const avgSampleSize = sampleSize / sampleCount;
            const totalFileSize = sampleCount === files.length ? totalSize : (totalSize / sampleCount) * files.length;

            // Estimate time (rough calculation: 10ms per KB + overhead)
            const estimatedTime = (totalFileSize / 1024) * 10 + files.length * 50;

            return { estimatedTime, fileSize: totalFileSize };
        }

        return { estimatedTime: files.length * 100, fileSize: 0 }; // Rough estimate
    }

    /**
     * Process the operation queue
     */
    private async processQueue(options: BatchOptions): Promise<BatchResult> {
        if (this._isProcessing) {
            throw new Error('Batch operation already in progress');
        }

        this._isProcessing = true;
        this.abortController = new AbortController();

        const result: BatchResult = {
            total: this.queue.length,
            successful: 0,
            failed: 0,
            skipped: 0,
            errors: [],
            totalTime: 0,
            totalBytes: 0,
            averageTimePerFile: 0
        };

        const startTime = Date.now();
        let totalBytes = 0;

        try {
            for (let i = 0; i < this.queue.length; i++) {
                // Check for abort
                if (this.abortController?.signal.aborted) {
                    break;
                }

                const operation = this.queue[i];
                operation.status = 'processing';
                operation.startTime = Date.now();

                try {
                    // Read file content
                    const content = await this.app.vault.read(operation.file);
                    operation.originalSize = new TextEncoder().encode(content).length;

                    // Update progress
                    const currentProgress = this.calculateProgress(i, this.queue, totalBytes);
                    this.progressCallback?.(currentProgress);

                    // Process file
                    if (operation.operation === 'encrypt') {
                        await this.encryptFile(operation.file, content, options);
                    } else {
                        await this.decryptFile(operation.file, content, options);
                    }

                    operation.status = 'completed';
                    operation.endTime = Date.now();
                    result.successful++;
                    totalBytes += operation.originalSize;

                } catch (error) {
                    operation.status = 'failed';
                    operation.error = error instanceof Error ? error.message : 'Unknown error';
                    operation.endTime = Date.now();
                    result.failed++;
                    result.errors.push({
                        file: operation.file.path,
                        error: operation.error
                    });

                    if (!options.continueOnError) {
                        break;
                    }
                }
            }
        } finally {
            this._isProcessing = false;
            this.abortController = null;
        }

        result.totalTime = Date.now() - startTime;
        result.totalBytes = totalBytes;
        result.averageTimePerFile = result.total > 0 ? result.totalTime / result.total : 0;

        // Final progress update
        this.progressCallback?.({
            current: this.queue.length,
            total: this.queue.length,
            fileName: 'Complete',
            operation: 'encrypt',
            operationTime: result.totalTime,
            bytesProcessed: totalBytes,
            totalBytes,
            errors: result.errors.length,
            successRate: (result.successful / result.total) * 100
        });

        // Show completion notice
        new Notice(
            `Batch ${this.queue[0]?.operation || 'operation'} complete: ` +
            `${result.successful} successful, ${result.failed} failed, ` +
            `${result.skipped} skipped (${(result.totalTime / 1000).toFixed(1)}s)`
        );

        return result;
    }

    /**
     * Encrypt a single file
     */
    private async encryptFile(file: TFile, content: string, options: BatchOptions): Promise<void> {
        const result = await enhancedEncryptionService.encrypt(content, options.password);

        if (!result.success) {
            throw new Error(result.error || 'Encryption failed');
        }

        // Update file content
        await this.app.vault.modify(file, result.encrypted);

        // Update file name with prefix
        if (options.addEncryptedPrefix !== false) {
            await this.updateFileName(file, true, options.password);
        }
    }

    /**
     * Decrypt a single file
     */
    private async decryptFile(file: TFile, content: string, options: BatchOptions): Promise<void> {
        const result = await enhancedEncryptionService.decrypt(content, options.password);

        if (!result.success) {
            throw new Error(result.error || 'Decryption failed');
        }

        // Update file content
        await this.app.vault.modify(file, result.decrypted);

        // Update file name (remove prefix)
        await this.updateFileName(file, false, options.password);
    }

    /**
     * Update file name based on encryption status
     */
    private async updateFileName(file: TFile, isEncrypting: boolean, password: string): Promise<void> {
        const settings = (this.app as any).plugins?.plugins['note-encryptor']?.settings;
        if (!settings) return;

        const prefix = settings.encryptedNotePrefix || '🔒 ';
        const suffix = settings.encryptedNoteSuffix || '';

        if (isEncrypting) {
            // Add prefix if not already present
            if (!file.basename.startsWith(prefix)) {
                const newName = prefix + file.basename + suffix + '.md';
                const newPath = file.parent ? `${file.parent.path}/${newName}` : newName;
                await this.app.fileManager.renameFile(file, newPath);
            }
        } else {
            // Remove prefix if present
            if (file.basename.startsWith(prefix)) {
                let newBasename = file.basename.slice(prefix.length);
                if (suffix && newBasename.endsWith(suffix)) {
                    newBasename = newBasename.slice(0, -suffix.length);
                }
                const newName = newBasename + '.md';
                const newPath = file.parent ? `${file.parent.path}/${newName}` : newName;
                await this.app.fileManager.renameFile(file, newPath);
            }
        }
    }

    /**
     * Pre-filter files based on operation
     */
    private async preFilterFiles(operations: BatchOperation[], operation: 'encrypt' | 'decrypt'): Promise<{ filtered: BatchOperation[]; skipped: number }> {
        const filtered: BatchOperation[] = [];
        let skipped = 0;

        for (const op of operations) {
            try {
                const content = await this.app.vault.read(op.file);

                if (operation === 'encrypt' && this.isEncrypted(content)) {
                    op.status = 'skipped';
                    skipped++;
                } else if (operation === 'decrypt' && !this.isEncrypted(content)) {
                    op.status = 'skipped';
                    skipped++;
                } else {
                    filtered.push(op);
                }
            } catch (error) {
                op.status = 'skipped';
                skipped++;
            }
        }

        return { filtered, skipped };
    }

    /**
     * Check if content is encrypted
     */
    private isEncrypted(content: string): boolean {
        return content.startsWith('-----BEGIN ENCRYPTED NOTE-----');
    }

    /**
     * Show confirmation dialog
     */
    private async showConfirmationDialog(title: string, message: string): Promise<boolean> {
        return new Promise((resolve) => {
            const modal = new ConfirmationModal(this.app, title, message, resolve);
            modal.open();
        });
    }

    /**
     * Calculate progress metrics
     */
    private calculateProgress(currentIndex: number, queue: BatchOperation[], totalBytes: number): BatchProgress {
        const completed = queue.slice(0, currentIndex).filter(op => op.status === 'completed').length;
        const currentOp = queue[currentIndex];
        const errors = queue.slice(0, currentIndex).filter(op => op.status === 'failed').length;

        return {
            current: currentIndex + 1,
            total: queue.length,
            fileName: currentOp?.file.basename || 'Unknown',
            operation: currentOp?.operation || 'encrypt',
            operationTime: (currentOp?.endTime || Date.now()) - (currentOp?.startTime || Date.now()),
            bytesProcessed: totalBytes,
            totalBytes: totalBytes, // Will be updated in real implementation
            errors,
            successRate: ((completed / (currentIndex + 1)) * 100)
        };
    }
}

/**
 * Simple confirmation modal for batch operations
 */
class ConfirmationModal extends Modal {
    private result: boolean = false;
    private onSubmit: (confirmed: boolean) => void;
    private modalTitle: string;
    private modalMessage: string;

    constructor(app: App, title: string, message: string, onSubmit: (confirmed: boolean) => void) {
        super(app);
        this.modalTitle = title;
        this.modalMessage = message;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: this.modalTitle || 'Confirm Operation' });
        contentEl.createEl('p', { text: this.modalMessage || 'Are you sure you want to proceed?' });

        const buttonContainer = contentEl.createDiv('modal-button-container');

        const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
        cancelButton.onclick = () => {
            this.result = false;
            this.close();
        };

        const confirmButton = buttonContainer.createEl('button', {
            text: 'Confirm',
            cls: 'mod-cta'
        });
        confirmButton.onclick = () => {
            this.result = true;
            this.close();
        };
    }

    onClose() {
        this.onSubmit(this.result);
        const { contentEl } = this;
        contentEl.empty();
    }
}