/**
 * Note Encryptor - Backup Manager
 * Encrypted backup and restore functionality
 */

import { App, TFile, TFolder, Notice, TAbstractFile } from 'obsidian';
import { encryptContent, decryptContent } from '../crypto/encryption';
import { BackupError, RestoreError } from '../errors';
import type { BatchProgress, BatchResult } from '../types';

// =============================================================================
// Backup Types
// =============================================================================

export interface BackupManifest {
    version: string;
    createdAt: string;
    pluginVersion: string;
    vaultName: string;
    totalFiles: number;
    encryptedFiles: string[];
    checksum: string;
}

export interface BackupFileEntry {
    path: string;
    content: string;
    encrypted: boolean;
    size: number;
    modified: number;
}

export interface BackupData {
    manifest: BackupManifest;
    files: BackupFileEntry[];
}

export interface BackupOptions {
    password: string;
    includeUnencrypted?: boolean;
    includePaths?: string[];
    excludePaths?: string[];
    iterations?: number;
    onProgress?: (progress: BatchProgress) => void;
}

export interface RestoreOptions {
    password: string;
    overwriteExisting?: boolean;
    restorePath?: string;
    iterations?: number;
    onProgress?: (progress: BatchProgress) => void;
}

export interface BackupResult {
    success: boolean;
    blob?: Blob;
    manifest?: BackupManifest;
    error?: string;
    stats: {
        totalFiles: number;
        encryptedFiles: number;
        skippedFiles: number;
        totalSize: number;
    };
}

export interface RestoreResult {
    success: boolean;
    restoredFiles: string[];
    failedFiles: string[];
    errors: Array<{ file: string; error: string }>;
    stats: {
        totalFiles: number;
        restoredFiles: number;
        skippedFiles: number;
        failedFiles: number;
    };
}

// =============================================================================
// Constants
// =============================================================================

const BACKUP_VERSION = '2.0';
const BACKUP_MAGIC = 'OBSIDIAN-ENCRYPT-BACKUP';
const BACKUP_HEADER_START = `-----BEGIN ${BACKUP_MAGIC}-----`;
const BACKUP_HEADER_END = `-----END ${BACKUP_MAGIC}-----`;

// =============================================================================
// Backup Manager Class
// =============================================================================

/**
 * Manages encrypted backups of notes
 */
export class BackupManager {
    private app: App;
    private pluginVersion: string;

    constructor(app: App, pluginVersion: string = '2.0.0') {
        this.app = app;
        this.pluginVersion = pluginVersion;
    }

    // =========================================================================
    // Backup Creation
    // =========================================================================

    /**
     * Create an encrypted backup of all encrypted notes
     */
    async createBackup(options: BackupOptions): Promise<BackupResult> {
        const stats = {
            totalFiles: 0,
            encryptedFiles: 0,
            skippedFiles: 0,
            totalSize: 0,
        };

        try {
            // Collect files to backup
            const files = await this.collectFiles(options);
            stats.totalFiles = files.length;

            if (files.length === 0) {
                return {
                    success: false,
                    error: 'No files to backup',
                    stats,
                };
            }

            // Prepare backup data
            const backupFiles: BackupFileEntry[] = [];
            const encryptedFilePaths: string[] = [];
            let processedCount = 0;

            for (const file of files) {
                // Report progress
                if (options.onProgress) {
                    options.onProgress({
                        current: processedCount + 1,
                        total: files.length,
                        currentFile: file.path,
                        successCount: backupFiles.length,
                        failCount: 0,
                        status: 'running',
                    });
                }

                try {
                    const content = await this.app.vault.read(file);
                    const isEncrypted = this.isEncryptedContent(content);

                    if (!options.includeUnencrypted && !isEncrypted) {
                        stats.skippedFiles++;
                        processedCount++;
                        continue;
                    }

                    backupFiles.push({
                        path: file.path,
                        content: content,
                        encrypted: isEncrypted,
                        size: content.length,
                        modified: file.stat.mtime,
                    });

                    stats.totalSize += content.length;
                    if (isEncrypted) {
                        stats.encryptedFiles++;
                        encryptedFilePaths.push(file.path);
                    }
                } catch (error) {
                    console.warn(`Failed to read file ${file.path}:`, error);
                    stats.skippedFiles++;
                }

                processedCount++;
            }

            // Create manifest
            const manifest: BackupManifest = {
                version: BACKUP_VERSION,
                createdAt: new Date().toISOString(),
                pluginVersion: this.pluginVersion,
                vaultName: this.app.vault.getName(),
                totalFiles: backupFiles.length,
                encryptedFiles: encryptedFilePaths,
                checksum: await this.calculateManifestChecksum(backupFiles),
            };

            // Create backup data
            const backupData: BackupData = {
                manifest,
                files: backupFiles,
            };

            // Serialize and encrypt
            const serialized = JSON.stringify(backupData);
            const encryptedBackup = await encryptContent(
                serialized,
                options.password,
                options.iterations,
                true
            );

            // Create blob
            const blob = new Blob([encryptedBackup], { type: 'text/plain' });

            return {
                success: true,
                blob,
                manifest,
                stats,
            };
        } catch (error) {
            console.error('Backup creation failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Backup creation failed',
                stats,
            };
        }
    }

    /**
     * Download backup as file
     */
    async downloadBackup(options: BackupOptions): Promise<void> {
        const result = await this.createBackup(options);

        if (!result.success || !result.blob) {
            throw new BackupError(result.error || 'Backup creation failed');
        }

        // Create download link
        const url = URL.createObjectURL(result.blob);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `obsidian-backup-${timestamp}.enc`;

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();

        URL.revokeObjectURL(url);

        new Notice(`Backup created: ${result.stats.encryptedFiles} encrypted notes`);
    }

    // =========================================================================
    // Backup Restoration
    // =========================================================================

    /**
     * Restore from an encrypted backup
     */
    async restoreBackup(blob: Blob, options: RestoreOptions): Promise<RestoreResult> {
        const result: RestoreResult = {
            success: false,
            restoredFiles: [],
            failedFiles: [],
            errors: [],
            stats: {
                totalFiles: 0,
                restoredFiles: 0,
                skippedFiles: 0,
                failedFiles: 0,
            },
        };

        try {
            // Read and decrypt backup
            const encryptedContent = await blob.text();
            const decryptedResult = await decryptContent(
                encryptedContent,
                options.password,
                options.iterations
            );

            // Verify integrity
            if (!decryptedResult.integrityValid) {
                throw new RestoreError('Backup integrity check failed');
            }

            // Parse backup data
            const backupData: BackupData = JSON.parse(decryptedResult.content);

            // Verify manifest
            const checksumValid = await this.verifyManifestChecksum(
                backupData.files,
                backupData.manifest.checksum
            );

            if (!checksumValid) {
                console.warn('Manifest checksum mismatch - backup may be corrupted');
            }

            result.stats.totalFiles = backupData.files.length;

            // Restore files
            for (let i = 0; i < backupData.files.length; i++) {
                const fileEntry = backupData.files[i];

                // Report progress
                if (options.onProgress) {
                    options.onProgress({
                        current: i + 1,
                        total: backupData.files.length,
                        currentFile: fileEntry.path,
                        successCount: result.stats.restoredFiles,
                        failCount: result.stats.failedFiles,
                        status: 'running',
                    });
                }

                try {
                    await this.restoreFile(fileEntry, options);
                    result.restoredFiles.push(fileEntry.path);
                    result.stats.restoredFiles++;
                } catch (error) {
                    result.failedFiles.push(fileEntry.path);
                    result.errors.push({
                        file: fileEntry.path,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                    result.stats.failedFiles++;
                }
            }

            result.success = result.stats.restoredFiles > 0;

            if (result.success) {
                new Notice(
                    `Restored ${result.stats.restoredFiles} files${result.stats.failedFiles > 0 ? `, ${result.stats.failedFiles} failed` : ''}`
                );
            }

            return result;
        } catch (error) {
            console.error('Restore failed:', error);
            result.errors.push({
                file: '',
                error: error instanceof Error ? error.message : 'Restore failed',
            });
            return result;
        }
    }

    /**
     * Restore a single file from backup
     */
    private async restoreFile(
        fileEntry: BackupFileEntry,
        options: RestoreOptions
    ): Promise<void> {
        // Determine target path
        let targetPath = fileEntry.path;
        if (options.restorePath) {
            const fileName = fileEntry.path.split('/').pop() || '';
            targetPath = `${options.restorePath}/${fileName}`;
        }

        // Check if file exists
        const existingFile = this.app.vault.getAbstractFileByPath(targetPath);

        if (existingFile instanceof TFile) {
            if (!options.overwriteExisting) {
                throw new Error('File exists and overwrite is disabled');
            }

            // Update existing file
            await this.app.vault.modify(existingFile, fileEntry.content);
        } else {
            // Create parent folders if needed
            const parentPath = targetPath.substring(0, targetPath.lastIndexOf('/'));
            if (parentPath) {
                await this.ensureFolderExists(parentPath);
            }

            // Create new file
            await this.app.vault.create(targetPath, fileEntry.content);
        }
    }

    /**
     * Ensure a folder exists, creating it if necessary
     */
    private async ensureFolderExists(path: string): Promise<void> {
        const parts = path.split('/');
        let currentPath = '';

        for (const part of parts) {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            const existing = this.app.vault.getAbstractFileByPath(currentPath);

            if (!existing) {
                await this.app.vault.createFolder(currentPath);
            }
        }
    }

    // =========================================================================
    // Utility Methods
    // =========================================================================

    /**
     * Collect files for backup
     */
    private async collectFiles(options: BackupOptions): Promise<TFile[]> {
        const files: TFile[] = [];
        const markdownFiles = this.app.vault.getMarkdownFiles();

        for (const file of markdownFiles) {
            // Check include paths
            if (options.includePaths && options.includePaths.length > 0) {
                const isIncluded = options.includePaths.some((p) =>
                    file.path.startsWith(p)
                );
                if (!isIncluded) continue;
            }

            // Check exclude paths
            if (options.excludePaths && options.excludePaths.length > 0) {
                const isExcluded = options.excludePaths.some((p) =>
                    file.path.startsWith(p)
                );
                if (isExcluded) continue;
            }

            files.push(file);
        }

        return files;
    }

    /**
     * Check if content is encrypted
     */
    private isEncryptedContent(content: string): boolean {
        return (
            content.includes('-----BEGIN ENCRYPTED NOTE-----') &&
            content.includes('-----END ENCRYPTED NOTE-----')
        );
    }

    /**
     * Calculate checksum for manifest
     */
    private async calculateManifestChecksum(files: BackupFileEntry[]): Promise<string> {
        const data = files
            .map((f) => `${f.path}:${f.size}:${f.modified}`)
            .join('|');

        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));

        // Convert to hex string
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Verify manifest checksum
     */
    private async verifyManifestChecksum(
        files: BackupFileEntry[],
        expectedChecksum: string
    ): Promise<boolean> {
        const calculated = await this.calculateManifestChecksum(files);
        return calculated === expectedChecksum;
    }

    /**
     * Validate a backup file without restoring
     */
    async validateBackup(
        blob: Blob,
        password: string,
        iterations?: number
    ): Promise<{ valid: boolean; manifest?: BackupManifest; error?: string }> {
        try {
            const encryptedContent = await blob.text();
            const decryptedResult = await decryptContent(
                encryptedContent,
                password,
                iterations
            );

            if (!decryptedResult.integrityValid) {
                return { valid: false, error: 'Integrity check failed' };
            }

            const backupData: BackupData = JSON.parse(decryptedResult.content);

            return {
                valid: true,
                manifest: backupData.manifest,
            };
        } catch (error) {
            return {
                valid: false,
                error: error instanceof Error ? error.message : 'Validation failed',
            };
        }
    }

    /**
     * Get backup info from blob (without decryption)
     */
    async getBackupInfo(blob: Blob): Promise<{ size: number; type: string }> {
        return {
            size: blob.size,
            type: blob.type || 'application/octet-stream',
        };
    }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Read a file from input element
 */
export function readFileFromInput(input: HTMLInputElement): Promise<File> {
    return new Promise((resolve, reject) => {
        if (!input.files || input.files.length === 0) {
            reject(new Error('No file selected'));
            return;
        }

        const file = input.files[0];
        resolve(file);
    });
}

/**
 * Create a file input for backup selection
 */
export function createBackupFileInput(
    onFileSelected: (file: File) => void
): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.enc,.backup';

    input.onchange = () => {
        if (input.files && input.files.length > 0) {
            onFileSelected(input.files[0]);
        }
    };

    return input;
}
