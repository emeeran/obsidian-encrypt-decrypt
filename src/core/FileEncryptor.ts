/**
 * Note Encryptor - File Encryptor
 * Handles single file encryption/decryption operations
 */

import { App, Notice, TFile } from 'obsidian';
import { encryptContent, decryptContent } from '../crypto';
import { isEncrypted } from '../utils';
import { extractFrontmatter, reinsertFrontmatter } from '../utils/metadata';
import type { NoteEncryptorSettings } from '../types';

export interface EncryptFileOptions {
    preserveMetadata: boolean;
    includeChecksum: boolean;
    iterations?: number;
}

export interface DecryptFileOptions {
    iterations?: number;
}

export interface EncryptFileResult {
    success: boolean;
    error?: string;
    integrityValid?: boolean;
}

/**
 * Class for handling file encryption/decryption operations
 */
export class FileEncryptor {
    private app: App;
    private settings: NoteEncryptorSettings;

    constructor(app: App, settings: NoteEncryptorSettings) {
        this.app = app;
        this.settings = settings;
    }

    /**
     * Encrypt a file's content
     * @param file - File to encrypt
     * @param password - Encryption password
     * @param options - Encryption options
     */
    async encryptFile(
        file: TFile,
        password: string,
        options?: Partial<EncryptFileOptions>
    ): Promise<EncryptFileResult> {
        try {
            const content = await this.app.vault.read(file);

            // Check if already encrypted
            if (isEncrypted(content)) {
                return { success: false, error: 'Note is already encrypted' };
            }

            // Check for empty content
            if (!content.trim()) {
                return { success: false, error: 'Cannot encrypt empty note' };
            }

            const preserveMetadata = options?.preserveMetadata ?? this.settings.preserveMetadata;
            const includeChecksum = options?.includeChecksum ?? this.settings.enableIntegrityCheck;
            const iterations = options?.iterations ?? this.getIterations();

            let contentToEncrypt = content;
            let frontmatter: string | null = null;

            // Extract frontmatter if preservation is enabled
            if (preserveMetadata) {
                const extraction = extractFrontmatter(content);
                frontmatter = extraction.frontmatter;
                contentToEncrypt = extraction.body;
            }

            // Encrypt the content
            const encrypted = await encryptContent(
                contentToEncrypt,
                password,
                iterations,
                includeChecksum
            );

            // Re-insert frontmatter if it was extracted
            const finalContent = frontmatter
                ? reinsertFrontmatter(encrypted, frontmatter)
                : encrypted;

            // Write encrypted content
            await this.app.vault.modify(file, finalContent);

            // Rename file with prefix/suffix
            await this.renameFile(file, true);

            return { success: true };
        } catch (error) {
            console.error('Encryption failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Encryption failed',
            };
        }
    }

    /**
     * Decrypt a file's content
     * @param file - File to decrypt
     * @param password - Decryption password
     * @param options - Decryption options
     */
    async decryptFile(
        file: TFile,
        password: string,
        options?: Partial<DecryptFileOptions>
    ): Promise<EncryptFileResult> {
        try {
            const content = await this.app.vault.read(file);

            // Check if encrypted
            if (!isEncrypted(content)) {
                return { success: false, error: 'Note is not encrypted' };
            }

            const iterations = options?.iterations ?? this.getIterations();
            const preserveMetadata = this.settings.preserveMetadata;

            let contentToDecrypt = content;
            let frontmatter: string | null = null;

            // Extract frontmatter if preservation is enabled
            if (preserveMetadata) {
                const extraction = extractFrontmatter(content);
                frontmatter = extraction.frontmatter;
                contentToDecrypt = extraction.body;
            }

            // Decrypt the content
            const result = await decryptContent(contentToDecrypt, password, iterations);

            // Re-insert frontmatter if it was extracted
            const finalContent = frontmatter
                ? reinsertFrontmatter(result.content, frontmatter)
                : result.content;

            // Write decrypted content
            await this.app.vault.modify(file, finalContent);

            // Rename file to remove prefix/suffix
            await this.renameFile(file, false);

            return {
                success: true,
                integrityValid: result.integrityValid,
            };
        } catch (error) {
            console.error('Decryption failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Decryption failed',
            };
        }
    }

    /**
     * Check if a file is encrypted
     */
    async isEncrypted(file: TFile): Promise<boolean> {
        const content = await this.app.vault.read(file);
        return isEncrypted(content);
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
