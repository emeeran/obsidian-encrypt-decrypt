/**
 * Note Encryptor - Inline Encryptor
 * Handles inline text encryption/decryption operations
 */

import { Editor, Notice } from 'obsidian';
import { encryptInline, decryptInline } from '../crypto';
import { isInlineEncrypted, findInlineEncryptedBlocks } from '../utils';
import type { InlineEncryptedBlock, NoteEncryptorSettings } from '../types';

export interface InlineEncryptorOptions {
    iterations?: number;
}

/**
 * Class for handling inline text encryption/decryption
 */
export class InlineEncryptor {
    private settings: NoteEncryptorSettings;

    constructor(settings: NoteEncryptorSettings) {
        this.settings = settings;
    }

    /**
     * Encrypt selected text
     * @param editor - Editor instance
     * @param password - Encryption password
     * @param options - Encryption options
     */
    async encryptSelection(
        editor: Editor,
        password: string,
        options?: InlineEncryptorOptions
    ): Promise<{ success: boolean; error?: string }> {
        const selection = editor.getSelection();

        if (!selection || selection.length === 0) {
            return { success: false, error: 'No text selected' };
        }

        if (isInlineEncrypted(selection)) {
            return { success: false, error: 'Selection is already encrypted' };
        }

        try {
            const iterations = options?.iterations ?? this.getIterations();
            const encrypted = await encryptInline(selection, password, iterations);
            editor.replaceSelection(encrypted);
            return { success: true };
        } catch (error) {
            console.error('Inline encryption failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Encryption failed',
            };
        }
    }

    /**
     * Decrypt selected text
     * @param editor - Editor instance
     * @param password - Decryption password
     * @param options - Decryption options
     */
    async decryptSelection(
        editor: Editor,
        password: string,
        options?: InlineEncryptorOptions
    ): Promise<{ success: boolean; error?: string }> {
        const selection = editor.getSelection();

        if (!selection || !isInlineEncrypted(selection)) {
            return { success: false, error: 'No encrypted text selected' };
        }

        try {
            const iterations = options?.iterations ?? this.getIterations();
            const decrypted = await decryptInline(selection, password, iterations);
            editor.replaceSelection(decrypted);
            return { success: true };
        } catch (error) {
            console.error('Inline decryption failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Decryption failed',
            };
        }
    }

    /**
     * Find encrypted block at cursor position
     * @param editor - Editor instance
     * @returns Block info if found at cursor
     */
    findBlockAtCursor(editor: Editor): InlineEncryptedBlock | null {
        const cursor = editor.getCursor();
        const lineContent = editor.getLine(cursor.line);

        // Find all encrypted blocks in the current line
        const blocks = findInlineEncryptedBlocks(lineContent);

        for (const block of blocks) {
            // Check if cursor is within this block
            if (cursor.ch >= block.start && cursor.ch <= block.end) {
                return {
                    ...block,
                    from: { line: cursor.line, ch: block.start },
                    to: { line: cursor.line, ch: block.end },
                };
            }
        }

        // Also check if selection spans an encrypted block
        const selection = editor.getSelection();
        if (selection && isInlineEncrypted(selection)) {
            const from = editor.getCursor('from');
            const to = editor.getCursor('to');
            return {
                start: 0,
                end: selection.length,
                content: selection,
                from,
                to,
            };
        }

        return null;
    }

    /**
     * Decrypt inline text at cursor position
     * @param editor - Editor instance
     * @param block - Block to decrypt
     * @param password - Decryption password
     * @param options - Decryption options
     */
    async decryptAtCursor(
        editor: Editor,
        block: InlineEncryptedBlock,
        password: string,
        options?: InlineEncryptorOptions
    ): Promise<{ success: boolean; error?: string }> {
        if (!block.from || !block.to) {
            return { success: false, error: 'Invalid block position' };
        }

        try {
            const iterations = options?.iterations ?? this.getIterations();
            const decrypted = await decryptInline(block.content, password, iterations);
            editor.replaceRange(decrypted, block.from, block.to);
            return { success: true };
        } catch (error) {
            console.error('Inline decryption failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Decryption failed',
            };
        }
    }

    /**
     * Get all inline encrypted blocks in content
     * @param content - Content to search
     * @returns Array of blocks
     */
    getAllBlocks(content: string): InlineEncryptedBlock[] {
        return findInlineEncryptedBlocks(content);
    }

    /**
     * Check if text contains inline encryption
     * @param text - Text to check
     * @returns true if contains inline encryption
     */
    hasInlineEncryption(text: string): boolean {
        return isInlineEncrypted(text);
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
     * Update settings reference
     */
    updateSettings(settings: NoteEncryptorSettings): void {
        this.settings = settings;
    }
}
