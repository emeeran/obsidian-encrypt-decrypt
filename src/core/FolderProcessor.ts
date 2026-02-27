/**
 * Note Encryptor - Folder Processor
 * Handles batch folder encryption/decryption operations
 */

import { App, Notice, TFile, TFolder } from 'obsidian';
import { encryptContent, decryptContent } from '../crypto';
import { isEncrypted } from '../utils';
import { BATCH_CONSTANTS } from '../constants';
import type { BatchProgress, BatchResult, NoteEncryptorSettings } from '../types';

export interface FolderProcessorOptions {
    iterations?: number;
    includeChecksum?: boolean;
    concurrency?: number;
    onProgress?: (progress: BatchProgress) => void;
}

/**
 * Class for handling batch folder operations
 */
export class FolderProcessor {
    private app: App;
    private settings: NoteEncryptorSettings;

    constructor(app: App, settings: NoteEncryptorSettings) {
        this.app = app;
        this.settings = settings;
    }

    /**
     * Get all markdown files in a folder recursively
     * @param folder - Folder to scan
     * @returns Array of markdown files
     */
    getMarkdownFiles(folder: TFolder): TFile[] {
        const files: TFile[] = [];

        const collect = (f: TFolder) => {
            for (const child of f.children) {
                if (child instanceof TFile && child.extension === 'md') {
                    files.push(child);
                } else if (child instanceof TFolder) {
                    collect(child);
                }
            }
        };

        collect(folder);
        return files;
    }

    /**
     * Process a folder (encrypt or decrypt)
     * @param folder - Folder to process
     * @param encrypting - True to encrypt, false to decrypt
     * @param password - Password for operation
     * @param options - Processing options
     * @returns Results of the batch operation
     */
    async processFolder(
        folder: TFolder,
        encrypting: boolean,
        password: string,
        options?: FolderProcessorOptions
    ): Promise<BatchResult[]> {
        const files = this.getMarkdownFiles(folder);
        const targetFiles: TFile[] = [];

        // Filter files that need processing
        for (const file of files) {
            const content = await this.app.vault.read(file);
            const encrypted = isEncrypted(content);
            if (encrypting ? !encrypted : encrypted) {
                targetFiles.push(file);
            }
        }

        if (targetFiles.length === 0) {
            return [];
        }

        const results: BatchResult[] = [];
        const concurrency = options?.concurrency ?? BATCH_CONSTANTS.CONCURRENCY;
        const iterations = options?.iterations ?? this.getIterations();
        const includeChecksum = options?.includeChecksum ?? this.settings.enableIntegrityCheck;

        const progress: BatchProgress = {
            current: 0,
            total: targetFiles.length,
            currentFile: '',
            successCount: 0,
            failCount: 0,
            status: 'running',
        };

        // Process files with concurrency limit
        const processFile = async (file: TFile): Promise<BatchResult> => {
            progress.currentFile = file.path;

            try {
                const content = await this.app.vault.read(file);

                // Double-check state hasn't changed
                const isCurrentlyEncrypted = isEncrypted(content);
                if (encrypting === isCurrentlyEncrypted) {
                    return {
                        file: file.path,
                        success: false,
                        error: 'File state changed during processing',
                    };
                }

                const result = encrypting
                    ? await encryptContent(content, password, iterations, includeChecksum)
                    : (await decryptContent(content, password, iterations)).content;

                await this.app.vault.modify(file, result);
                await this.renameFile(file, encrypting);

                progress.successCount++;
                return { file: file.path, success: true };
            } catch (error) {
                progress.failCount++;
                return {
                    file: file.path,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
            } finally {
                progress.current++;
                if (options?.onProgress) {
                    options.onProgress({ ...progress });
                }
            }
        };

        // Run with concurrency limit
        const limiter = <T>(fn: () => Promise<T>): Promise<T> => fn();

        // Process in batches
        for (let i = 0; i < targetFiles.length; i += concurrency) {
            const batch = targetFiles.slice(i, i + concurrency);
            const batchResults = await Promise.all(
                batch.map((file) => limiter(() => processFile(file)))
            );
            results.push(...batchResults);
        }

        progress.status = 'completed';
        progress.currentFile = '';
        if (options?.onProgress) {
            options.onProgress(progress);
        }

        return results;
    }

    /**
     * Count files to be processed
     * @param folder - Folder to scan
     * @param encrypting - True to count unencrypted, false for encrypted
     * @returns Count of files that would be processed
     */
    async countFilesToProcess(folder: TFolder, encrypting: boolean): Promise<number> {
        const files = this.getMarkdownFiles(folder);
        let count = 0;

        for (const file of files) {
            const content = await this.app.vault.read(file);
            const encrypted = isEncrypted(content);
            if (encrypting ? !encrypted : encrypted) {
                count++;
            }
        }

        return count;
    }

    /**
     * Get iterations based on settings
     */
    private getIterations(): number {
        if (this.settings.customIterations > 0) {
            return this.settings.customIterations;
        }

        switch (this.settings.encryptionProfile) {
            case 'fast':
                return 100000;
            case 'paranoid':
                return 500000;
            case 'standard':
            default:
                return 310000;
        }
    }

    /**
     * Rename file with prefix/suffix based on encryption state
     */
    private async renameFile(file: TFile, encrypting: boolean): Promise<void> {
        const { encryptedNotePrefix: prefix, encryptedNoteSuffix: suffix } = this.settings;
        if (!prefix && !suffix) return;

        let newName = file.basename;

        if (encrypting) {
            newName = `${prefix}${newName}${suffix}`;
        } else {
            if (prefix && newName.startsWith(prefix)) {
                newName = newName.slice(prefix.length);
            }
            if (suffix && newName.endsWith(suffix)) {
                newName = newName.slice(0, -suffix.length);
            }
        }

        const newPath = file.parent?.path
            ? `${file.parent.path}/${newName}.${file.extension}`
            : `${newName}.${file.extension}`;

        if (newPath !== file.path) {
            try {
                await this.app.fileManager.renameFile(file, newPath);
            } catch (error) {
                console.error('Failed to rename file:', error);
            }
        }
    }

    /**
     * Update settings reference
     */
    updateSettings(settings: NoteEncryptorSettings): void {
        this.settings = settings;
    }
}
