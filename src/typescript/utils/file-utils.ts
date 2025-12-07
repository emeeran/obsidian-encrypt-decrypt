/**
 * File Utility Functions
 * Centralized file operations and path handling
 */

import { App, TFile, TFolder, TAbstractFile } from 'obsidian';
import { DIRECTORY_CONSTANTS, CRYPTO_CONSTANTS } from '../core/constants';

/**
 * File information for encryption operations
 */
export interface FileInfo {
    file: TFile;
    path: string;
    name: string;
    extension: string;
    size: number;
    isEncrypted: boolean;
}

/**
 * Directory scan result
 */
export interface DirectoryScanResult {
    files: FileInfo[];
    totalSize: number;
    encryptedCount: number;
    unencryptedCount: number;
    skippedCount: number;
}

/**
 * Check if content is encrypted
 */
export function isEncryptedContent(content: string): boolean {
    return content.includes(CRYPTO_CONSTANTS.ENCRYPTION_HEADER_START) &&
           content.includes(CRYPTO_CONSTANTS.ENCRYPTION_HEADER_END);
}

/**
 * Extract encrypted data from content
 */
export function extractEncryptedData(content: string): string | null {
    const regex = new RegExp(
        `${escapeRegex(CRYPTO_CONSTANTS.ENCRYPTION_HEADER_START)}\\n([\\s\\S]+?)\\n${escapeRegex(CRYPTO_CONSTANTS.ENCRYPTION_HEADER_END)}`
    );
    const match = content.match(regex);
    return match ? match[1] : null;
}

/**
 * Wrap encrypted data with headers
 */
export function wrapEncryptedData(base64Data: string): string {
    return `${CRYPTO_CONSTANTS.ENCRYPTION_HEADER_START}\n${base64Data}\n${CRYPTO_CONSTANTS.ENCRYPTION_HEADER_END}`;
}

/**
 * Escape string for use in regex
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sanitize file path to prevent path traversal attacks
 */
export function sanitizeFilePath(path: string): string {
    return path
        .replace(/\.\./g, '')
        .replace(/[<>:"|?*]/g, '_')
        .trim();
}

/**
 * Validate file size for encryption
 */
export function validateFileSize(
    content: string,
    maxSizeMB: number = CRYPTO_CONSTANTS.MAX_FILE_SIZE_MB
): { valid: boolean; size: number; maxSize: number; error?: string } {
    const size = new TextEncoder().encode(content).length;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (size > maxSizeBytes) {
        return {
            valid: false,
            size,
            maxSize: maxSizeBytes,
            error: `File too large for encryption (${formatBytes(size)} > ${maxSizeMB}MB)`
        };
    }

    return { valid: true, size, maxSize: maxSizeBytes };
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate unique file name if file already exists
 */
export async function generateUniqueFileName(
    app: App,
    basePath: string,
    baseName: string,
    extension: string
): Promise<string> {
    let counter = 0;
    let fileName = `${basePath}/${baseName}${extension}`;

    while (await app.vault.adapter.exists(fileName)) {
        counter++;
        fileName = `${basePath}/${baseName} (${counter})${extension}`;
    }

    return fileName;
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.slice(lastDot);
}

/**
 * Get file name without extension
 */
export function getFileNameWithoutExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? filename : filename.slice(0, lastDot);
}

/**
 * Add prefix/suffix to filename
 */
export function modifyFileName(
    filename: string,
    prefix: string = '',
    suffix: string = ''
): string {
    const ext = getFileExtension(filename);
    const name = getFileNameWithoutExtension(filename);
    return `${prefix}${name}${suffix}${ext}`;
}

/**
 * Remove prefix/suffix from filename
 */
export function removeFileNameModifiers(
    filename: string,
    prefix: string = '',
    suffix: string = ''
): string {
    const ext = getFileExtension(filename);
    let name = getFileNameWithoutExtension(filename);

    if (prefix && name.startsWith(prefix)) {
        name = name.slice(prefix.length);
    }

    if (suffix && name.endsWith(suffix)) {
        name = name.slice(0, -suffix.length);
    }

    return `${name}${ext}`;
}

/**
 * Check if file matches any pattern
 */
export function matchesPattern(
    filename: string,
    patterns: string[] = DIRECTORY_CONSTANTS.DEFAULT_FILE_PATTERNS
): boolean {
    return patterns.some(pattern => {
        // Convert glob pattern to regex
        const regex = new RegExp(
            '^' + pattern
                .replace(/\./g, '\\.')
                .replace(/\*/g, '.*')
                .replace(/\?/g, '.') + '$',
            'i'
        );
        return regex.test(filename);
    });
}

/**
 * Scan directory for files
 */
export async function scanDirectory(
    app: App,
    folderPath: string,
    options: {
        recursive?: boolean;
        patterns?: string[];
        includeEncrypted?: boolean;
    } = {}
): Promise<DirectoryScanResult> {
    const {
        recursive = true,
        patterns = DIRECTORY_CONSTANTS.DEFAULT_FILE_PATTERNS,
        includeEncrypted = true
    } = options;

    const result: DirectoryScanResult = {
        files: [],
        totalSize: 0,
        encryptedCount: 0,
        unencryptedCount: 0,
        skippedCount: 0
    };

    const folder = app.vault.getAbstractFileByPath(folderPath);
    if (!(folder instanceof TFolder)) {
        return result;
    }

    await scanFolderRecursive(app, folder, result, { recursive, patterns, includeEncrypted });

    return result;
}

/**
 * Recursive folder scanning helper
 */
async function scanFolderRecursive(
    app: App,
    folder: TFolder,
    result: DirectoryScanResult,
    options: {
        recursive: boolean;
        patterns: string[];
        includeEncrypted: boolean;
    }
): Promise<void> {
    for (const child of folder.children) {
        if (child instanceof TFile) {
            // Check if file matches patterns
            if (!matchesPattern(child.name, options.patterns)) {
                result.skippedCount++;
                continue;
            }

            // Read file to check if encrypted
            const content = await app.vault.read(child);
            const isEncrypted = isEncryptedContent(content);

            // Skip encrypted files if not included
            if (isEncrypted && !options.includeEncrypted) {
                result.skippedCount++;
                continue;
            }

            const fileInfo: FileInfo = {
                file: child,
                path: child.path,
                name: child.name,
                extension: getFileExtension(child.name),
                size: content.length,
                isEncrypted
            };

            result.files.push(fileInfo);
            result.totalSize += fileInfo.size;

            if (isEncrypted) {
                result.encryptedCount++;
            } else {
                result.unencryptedCount++;
            }
        } else if (child instanceof TFolder && options.recursive) {
            await scanFolderRecursive(app, child, result, options);
        }
    }
}

/**
 * Get all folders in vault
 */
export function getAllFolders(app: App): TFolder[] {
    const folders: TFolder[] = [];

    function collectFolders(folder: TFolder): void {
        folders.push(folder);
        for (const child of folder.children) {
            if (child instanceof TFolder) {
                collectFolders(child);
            }
        }
    }

    collectFolders(app.vault.getRoot());
    return folders;
}

/**
 * Get parent folder path
 */
export function getParentPath(path: string): string {
    const lastSlash = path.lastIndexOf('/');
    return lastSlash === -1 ? '' : path.slice(0, lastSlash);
}

/**
 * Join path segments
 */
export function joinPath(...segments: string[]): string {
    return segments
        .filter(s => s && s.length > 0)
        .join('/')
        .replace(/\/+/g, '/');
}
