/**
 * Directory Encryption Feature
 * Provides batch encryption/decryption for entire directories
 */

import { App, TFile, TFolder, Notice } from 'obsidian';
import { DIRECTORY_CONSTANTS, CRYPTO_CONSTANTS } from '../core/constants';
import { encrypt, decrypt, EncryptionResult, DecryptionResult } from '../core/encryption-service';
import {
    scanDirectory,
    DirectoryScanResult,
    FileInfo,
    isEncryptedContent,
    modifyFileName,
    removeFileNameModifiers,
    formatBytes
} from '../utils/file-utils';

/**
 * Directory encryption settings
 */
export interface DirectoryEncryptionSettings {
    includeSubdirectories: boolean;
    filePatterns: string[];
    skipEncryptedFiles: boolean;
    createManifest: boolean;
    manifestFileName: string;
    parallelOperations: number;
    addPrefixToFiles: boolean;
    filePrefix: string;
    fileSuffix: string;
}

/**
 * Default directory encryption settings
 */
export const DEFAULT_DIRECTORY_SETTINGS: DirectoryEncryptionSettings = {
    includeSubdirectories: true,
    filePatterns: DIRECTORY_CONSTANTS.DEFAULT_FILE_PATTERNS,
    skipEncryptedFiles: true,
    createManifest: true,
    manifestFileName: DIRECTORY_CONSTANTS.MANIFEST_FILENAME,
    parallelOperations: DIRECTORY_CONSTANTS.MAX_PARALLEL_OPERATIONS,
    addPrefixToFiles: true,
    filePrefix: '🔒 ',
    fileSuffix: ''
};

/**
 * Operation result for a single file
 */
export interface FileOperationResult {
    file: TFile;
    success: boolean;
    error?: string;
    skipped: boolean;
    reason?: string;
}

/**
 * Directory operation progress
 */
export interface DirectoryOperationProgress {
    totalFiles: number;
    processedFiles: number;
    successCount: number;
    failedCount: number;
    skippedCount: number;
    currentFile?: string;
    percentage: number;
    estimatedTimeRemaining?: number;
}

/**
 * Directory operation result
 */
export interface DirectoryOperationResult {
    success: boolean;
    totalFiles: number;
    successCount: number;
    failedCount: number;
    skippedCount: number;
    results: FileOperationResult[];
    duration: number;
    manifestPath?: string;
}

/**
 * Encryption manifest for tracking encrypted files
 */
export interface EncryptionManifest {
    version: string;
    createdAt: string;
    updatedAt: string;
    directoryPath: string;
    settings: Partial<DirectoryEncryptionSettings>;
    files: ManifestFileEntry[];
    totalFiles: number;
    encryptedCount: number;
}

/**
 * Manifest entry for a single file
 */
export interface ManifestFileEntry {
    originalPath: string;
    encryptedPath: string;
    encryptedAt: string;
    fileSize: number;
    checksum?: string;
}

/**
 * Progress callback type
 */
export type ProgressCallback = (progress: DirectoryOperationProgress) => void;

/**
 * Directory Encryption Manager
 */
export class DirectoryEncryptionManager {
    private app: App;
    private settings: DirectoryEncryptionSettings;
    private abortController: AbortController | null = null;

    constructor(app: App, settings: Partial<DirectoryEncryptionSettings> = {}) {
        this.app = app;
        this.settings = { ...DEFAULT_DIRECTORY_SETTINGS, ...settings };
    }

    /**
     * Update settings
     */
    updateSettings(settings: Partial<DirectoryEncryptionSettings>): void {
        this.settings = { ...this.settings, ...settings };
    }

    /**
     * Encrypt all files in a directory
     */
    async encryptDirectory(
        folderPath: string,
        password: string,
        onProgress?: ProgressCallback
    ): Promise<DirectoryOperationResult> {
        const startTime = performance.now();
        this.abortController = new AbortController();

        const results: FileOperationResult[] = [];
        let successCount = 0;
        let failedCount = 0;
        let skippedCount = 0;

        try {
            // Scan directory for files
            const scanResult = await scanDirectory(this.app, folderPath, {
                recursive: this.settings.includeSubdirectories,
                patterns: this.settings.filePatterns,
                includeEncrypted: !this.settings.skipEncryptedFiles
            });

            const filesToProcess = this.settings.skipEncryptedFiles
                ? scanResult.files.filter(f => !f.isEncrypted)
                : scanResult.files;

            const totalFiles = filesToProcess.length;

            if (totalFiles === 0) {
                return {
                    success: true,
                    totalFiles: 0,
                    successCount: 0,
                    failedCount: 0,
                    skippedCount: scanResult.encryptedCount,
                    results: [],
                    duration: performance.now() - startTime
                };
            }

            // Process files with controlled parallelism
            const startTimePerFile = performance.now();

            for (let i = 0; i < filesToProcess.length; i += this.settings.parallelOperations) {
                // Check for abort
                if (this.abortController.signal.aborted) {
                    break;
                }

                const batch = filesToProcess.slice(i, i + this.settings.parallelOperations);
                const batchResults = await Promise.all(
                    batch.map(fileInfo => this.encryptFile(fileInfo.file, password))
                );

                for (const result of batchResults) {
                    results.push(result);
                    if (result.skipped) {
                        skippedCount++;
                    } else if (result.success) {
                        successCount++;
                    } else {
                        failedCount++;
                    }
                }

                // Report progress
                if (onProgress) {
                    const processed = Math.min(i + batch.length, totalFiles);
                    const elapsed = performance.now() - startTimePerFile;
                    const avgTimePerFile = elapsed / processed;
                    const remaining = totalFiles - processed;

                    onProgress({
                        totalFiles,
                        processedFiles: processed,
                        successCount,
                        failedCount,
                        skippedCount,
                        currentFile: batch[batch.length - 1]?.file.path,
                        percentage: (processed / totalFiles) * 100,
                        estimatedTimeRemaining: remaining * avgTimePerFile
                    });
                }
            }

            // Create manifest if enabled
            let manifestPath: string | undefined;
            if (this.settings.createManifest && successCount > 0) {
                manifestPath = await this.createManifest(folderPath, results.filter(r => r.success));
            }

            return {
                success: failedCount === 0,
                totalFiles,
                successCount,
                failedCount,
                skippedCount,
                results,
                duration: performance.now() - startTime,
                manifestPath
            };

        } catch (error) {
            return {
                success: false,
                totalFiles: 0,
                successCount,
                failedCount: failedCount + 1,
                skippedCount,
                results,
                duration: performance.now() - startTime
            };
        } finally {
            this.abortController = null;
        }
    }

    /**
     * Decrypt all files in a directory
     */
    async decryptDirectory(
        folderPath: string,
        password: string,
        onProgress?: ProgressCallback
    ): Promise<DirectoryOperationResult> {
        const startTime = performance.now();
        this.abortController = new AbortController();

        const results: FileOperationResult[] = [];
        let successCount = 0;
        let failedCount = 0;
        let skippedCount = 0;

        try {
            // Scan directory for encrypted files
            const scanResult = await scanDirectory(this.app, folderPath, {
                recursive: this.settings.includeSubdirectories,
                patterns: this.settings.filePatterns,
                includeEncrypted: true
            });

            // Only process encrypted files
            const filesToProcess = scanResult.files.filter(f => f.isEncrypted);
            const totalFiles = filesToProcess.length;

            if (totalFiles === 0) {
                return {
                    success: true,
                    totalFiles: 0,
                    successCount: 0,
                    failedCount: 0,
                    skippedCount: scanResult.unencryptedCount,
                    results: [],
                    duration: performance.now() - startTime
                };
            }

            // Process files with controlled parallelism
            const startTimePerFile = performance.now();

            for (let i = 0; i < filesToProcess.length; i += this.settings.parallelOperations) {
                if (this.abortController.signal.aborted) {
                    break;
                }

                const batch = filesToProcess.slice(i, i + this.settings.parallelOperations);
                const batchResults = await Promise.all(
                    batch.map(fileInfo => this.decryptFile(fileInfo.file, password))
                );

                for (const result of batchResults) {
                    results.push(result);
                    if (result.skipped) {
                        skippedCount++;
                    } else if (result.success) {
                        successCount++;
                    } else {
                        failedCount++;
                    }
                }

                // Report progress
                if (onProgress) {
                    const processed = Math.min(i + batch.length, totalFiles);
                    const elapsed = performance.now() - startTimePerFile;
                    const avgTimePerFile = elapsed / processed;
                    const remaining = totalFiles - processed;

                    onProgress({
                        totalFiles,
                        processedFiles: processed,
                        successCount,
                        failedCount,
                        skippedCount,
                        currentFile: batch[batch.length - 1]?.file.path,
                        percentage: (processed / totalFiles) * 100,
                        estimatedTimeRemaining: remaining * avgTimePerFile
                    });
                }
            }

            // Remove manifest if all files decrypted successfully
            if (this.settings.createManifest && failedCount === 0) {
                await this.removeManifest(folderPath);
            }

            return {
                success: failedCount === 0,
                totalFiles,
                successCount,
                failedCount,
                skippedCount,
                results,
                duration: performance.now() - startTime
            };

        } catch (error) {
            return {
                success: false,
                totalFiles: 0,
                successCount,
                failedCount: failedCount + 1,
                skippedCount,
                results,
                duration: performance.now() - startTime
            };
        } finally {
            this.abortController = null;
        }
    }

    /**
     * Encrypt a single file
     */
    private async encryptFile(file: TFile, password: string): Promise<FileOperationResult> {
        try {
            const content = await this.app.vault.read(file);

            // Skip if already encrypted
            if (isEncryptedContent(content)) {
                return {
                    file,
                    success: true,
                    skipped: true,
                    reason: 'Already encrypted'
                };
            }

            // Encrypt content
            const result = await encrypt(content, password);

            if (!result.success) {
                return {
                    file,
                    success: false,
                    error: result.error,
                    skipped: false
                };
            }

            // Write encrypted content
            await this.app.vault.modify(file, result.data);

            // Rename file if prefix/suffix enabled
            if (this.settings.addPrefixToFiles && (this.settings.filePrefix || this.settings.fileSuffix)) {
                const newName = modifyFileName(file.name, this.settings.filePrefix, this.settings.fileSuffix);
                const newPath = file.path.replace(file.name, newName);

                try {
                    await this.app.fileManager.renameFile(file, newPath);
                } catch (renameError) {
                    // File encrypted but rename failed - not critical
                    console.warn('Failed to rename file:', renameError);
                }
            }

            return {
                file,
                success: true,
                skipped: false
            };

        } catch (error) {
            return {
                file,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                skipped: false
            };
        }
    }

    /**
     * Decrypt a single file
     */
    private async decryptFile(file: TFile, password: string): Promise<FileOperationResult> {
        try {
            const content = await this.app.vault.read(file);

            // Skip if not encrypted
            if (!isEncryptedContent(content)) {
                return {
                    file,
                    success: true,
                    skipped: true,
                    reason: 'Not encrypted'
                };
            }

            // Decrypt content
            const result = await decrypt(content, password);

            if (!result.success) {
                return {
                    file,
                    success: false,
                    error: result.error,
                    skipped: false
                };
            }

            // Write decrypted content
            await this.app.vault.modify(file, result.data);

            // Remove prefix/suffix from filename
            if (this.settings.addPrefixToFiles && (this.settings.filePrefix || this.settings.fileSuffix)) {
                const newName = removeFileNameModifiers(file.name, this.settings.filePrefix, this.settings.fileSuffix);
                if (newName !== file.name) {
                    const newPath = file.path.replace(file.name, newName);

                    try {
                        await this.app.fileManager.renameFile(file, newPath);
                    } catch (renameError) {
                        console.warn('Failed to rename file:', renameError);
                    }
                }
            }

            return {
                file,
                success: true,
                skipped: false
            };

        } catch (error) {
            return {
                file,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                skipped: false
            };
        }
    }

    /**
     * Create encryption manifest
     */
    private async createManifest(
        folderPath: string,
        successfulResults: FileOperationResult[]
    ): Promise<string> {
        const manifestPath = `${folderPath}/${this.settings.manifestFileName}`;

        const manifest: EncryptionManifest = {
            version: '1.0.0',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            directoryPath: folderPath,
            settings: {
                includeSubdirectories: this.settings.includeSubdirectories,
                filePatterns: this.settings.filePatterns,
                filePrefix: this.settings.filePrefix,
                fileSuffix: this.settings.fileSuffix
            },
            files: successfulResults.map(r => ({
                originalPath: r.file.path,
                encryptedPath: r.file.path,
                encryptedAt: new Date().toISOString(),
                fileSize: 0 // Could calculate if needed
            })),
            totalFiles: successfulResults.length,
            encryptedCount: successfulResults.length
        };

        const manifestContent = JSON.stringify(manifest, null, 2);

        // Check if manifest already exists
        const existingFile = this.app.vault.getAbstractFileByPath(manifestPath);
        if (existingFile instanceof TFile) {
            await this.app.vault.modify(existingFile, manifestContent);
        } else {
            await this.app.vault.create(manifestPath, manifestContent);
        }

        return manifestPath;
    }

    /**
     * Remove encryption manifest
     */
    private async removeManifest(folderPath: string): Promise<void> {
        const manifestPath = `${folderPath}/${this.settings.manifestFileName}`;
        const manifestFile = this.app.vault.getAbstractFileByPath(manifestPath);

        if (manifestFile instanceof TFile) {
            await this.app.vault.delete(manifestFile);
        }
    }

    /**
     * Load manifest from directory
     */
    async loadManifest(folderPath: string): Promise<EncryptionManifest | null> {
        const manifestPath = `${folderPath}/${this.settings.manifestFileName}`;
        const manifestFile = this.app.vault.getAbstractFileByPath(manifestPath);

        if (!(manifestFile instanceof TFile)) {
            return null;
        }

        try {
            const content = await this.app.vault.read(manifestFile);
            return JSON.parse(content) as EncryptionManifest;
        } catch {
            return null;
        }
    }

    /**
     * Abort ongoing operation
     */
    abort(): void {
        if (this.abortController) {
            this.abortController.abort();
        }
    }

    /**
     * Check if operation is in progress
     */
    isOperationInProgress(): boolean {
        return this.abortController !== null;
    }

    /**
     * Get directory encryption preview (files that would be affected)
     */
    async getEncryptionPreview(folderPath: string): Promise<{
        filesToEncrypt: FileInfo[];
        alreadyEncrypted: FileInfo[];
        totalSize: number;
        estimatedTime: number;
    }> {
        const scanResult = await scanDirectory(this.app, folderPath, {
            recursive: this.settings.includeSubdirectories,
            patterns: this.settings.filePatterns,
            includeEncrypted: true
        });

        const filesToEncrypt = scanResult.files.filter(f => !f.isEncrypted);
        const alreadyEncrypted = scanResult.files.filter(f => f.isEncrypted);
        const totalSize = filesToEncrypt.reduce((sum, f) => sum + f.size, 0);

        // Rough estimate: ~50ms per KB for encryption
        const estimatedTime = (totalSize / 1024) * 50;

        return {
            filesToEncrypt,
            alreadyEncrypted,
            totalSize,
            estimatedTime
        };
    }

    /**
     * Get decryption preview
     */
    async getDecryptionPreview(folderPath: string): Promise<{
        filesToDecrypt: FileInfo[];
        notEncrypted: FileInfo[];
        totalSize: number;
        estimatedTime: number;
    }> {
        const scanResult = await scanDirectory(this.app, folderPath, {
            recursive: this.settings.includeSubdirectories,
            patterns: this.settings.filePatterns,
            includeEncrypted: true
        });

        const filesToDecrypt = scanResult.files.filter(f => f.isEncrypted);
        const notEncrypted = scanResult.files.filter(f => !f.isEncrypted);
        const totalSize = filesToDecrypt.reduce((sum, f) => sum + f.size, 0);

        const estimatedTime = (totalSize / 1024) * 30; // Decryption is usually faster

        return {
            filesToDecrypt,
            notEncrypted,
            totalSize,
            estimatedTime
        };
    }
}
