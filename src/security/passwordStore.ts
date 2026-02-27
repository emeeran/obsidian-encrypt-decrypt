/**
 * Note Encryptor - Password Store
 * Secure password storage using IndexedDB with encryption
 */

import type { PasswordEntry, PasswordStoreOptions } from '../types';
import { PASSWORD_STORE_CONSTANTS } from '../constants';
import { arrayBufferToBase64, base64ToArrayBuffer, deriveKey, generateSalt, generateIV } from '../crypto';

/**
 * Password Store class for secure password memory
 */
export class PasswordStore {
    private db: IDBDatabase | null = null;
    private expiryMinutes: number;
    private masterKey: CryptoKey | null = null;
    private initPromise: Promise<void> | null = null;

    constructor(options?: Partial<PasswordStoreOptions>) {
        this.expiryMinutes = options?.expiryMinutes ?? (PASSWORD_STORE_CONSTANTS.DEFAULT_EXPIRY_MS / 60000);
        if (options?.masterKey) {
            this.deriveMasterKey(options.masterKey);
        }
    }

    /**
     * Initialize the IndexedDB database
     */
    private async initDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(
                PASSWORD_STORE_CONSTANTS.DB_NAME,
                PASSWORD_STORE_CONSTANTS.DB_VERSION
            );

            request.onerror = () => reject(request.error);

            request.onsuccess = () => {
                this.db = request.result;
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                if (!db.objectStoreNames.contains(PASSWORD_STORE_CONSTANTS.STORE_NAME)) {
                    const store = db.createObjectStore(PASSWORD_STORE_CONSTANTS.STORE_NAME, {
                        keyPath: 'id',
                    });
                    store.createIndex('associatedFiles', 'associatedFiles', { multiEntry: true });
                    store.createIndex('expiresAt', 'expiresAt');
                }
            };
        });
    }

    /**
     * Ensure database is initialized
     */
    private async ensureDB(): Promise<IDBDatabase> {
        if (!this.initPromise) {
            this.initPromise = this.initDB().then(() => {});
        }
        await this.initPromise;
        if (!this.db) throw new Error('Failed to initialize database');
        return this.db;
    }

    /**
     * Derive master key from a master password
     */
    private async deriveMasterKey(masterPassword: string): Promise<void> {
        // Use a fixed salt for the master key (derived from app identifier)
        const encoder = new TextEncoder();
        const masterSalt = encoder.encode('note-encryptor-master-key-salt');
        this.masterKey = await deriveKey(masterPassword, new Uint8Array(masterSalt), 100000);
    }

    /**
     * Set the master password for encrypting stored passwords
     */
    async setMasterPassword(masterPassword: string): Promise<void> {
        await this.deriveMasterKey(masterPassword);
    }

    /**
     * Encrypt a password for storage
     */
    private async encryptPassword(password: string): Promise<{ encrypted: string; iv: string; salt: string }> {
        if (!this.masterKey) {
            throw new Error('Master key not set - call setMasterPassword first');
        }

        const encoder = new TextEncoder();
        const salt = generateSalt();
        const iv = generateIV();

        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            this.masterKey,
            encoder.encode(password)
        );

        return {
            encrypted: arrayBufferToBase64(encrypted),
            iv: arrayBufferToBase64(iv),
            salt: arrayBufferToBase64(salt),
        };
    }

    /**
     * Decrypt a password from storage
     */
    private async decryptPassword(encrypted: string, iv: string): Promise<string> {
        if (!this.masterKey) {
            throw new Error('Master key not set');
        }

        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: new Uint8Array(base64ToArrayBuffer(iv)) },
            this.masterKey,
            new Uint8Array(base64ToArrayBuffer(encrypted))
        );

        return new TextDecoder().decode(decrypted);
    }

    /**
     * Store a password associated with a file
     * @param fileId - Unique identifier (e.g., file path)
     * @param password - Password to store
     */
    async storePassword(fileId: string, password: string): Promise<void> {
        const db = await this.ensureDB();

        const now = Date.now();
        const expiresAt = now + this.expiryMinutes * 60 * 1000;

        // Check if entry already exists
        const existing = await this.getPasswordEntry(fileId);
        let encryptedData: { encrypted: string; iv: string; salt: string };

        if (this.masterKey) {
            encryptedData = await this.encryptPassword(password);
        } else {
            // If no master key, store plaintext (less secure but functional)
            encryptedData = {
                encrypted: btoa(password),
                iv: '',
                salt: '',
            };
        }

        const entry: PasswordEntry = {
            id: fileId,
            encryptedPassword: encryptedData.encrypted,
            iv: encryptedData.iv,
            salt: encryptedData.salt,
            associatedFiles: existing?.associatedFiles ? [...existing.associatedFiles, fileId] : [fileId],
            createdAt: existing?.createdAt ?? now,
            expiresAt,
        };

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(PASSWORD_STORE_CONSTANTS.STORE_NAME, 'readwrite');
            const store = transaction.objectStore(PASSWORD_STORE_CONSTANTS.STORE_NAME);
            const request = store.put(entry);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    /**
     * Retrieve a stored password
     * @param fileId - File identifier
     * @returns Decrypted password or null if not found/expired
     */
    async getPassword(fileId: string): Promise<string | null> {
        const entry = await this.getPasswordEntry(fileId);

        if (!entry) return null;

        // Check expiration
        if (Date.now() > entry.expiresAt) {
            await this.deletePassword(fileId);
            return null;
        }

        try {
            if (this.masterKey && entry.iv) {
                return await this.decryptPassword(entry.encryptedPassword, entry.iv);
            } else {
                return atob(entry.encryptedPassword);
            }
        } catch (error) {
            console.error('Failed to decrypt stored password:', error);
            return null;
        }
    }

    /**
     * Get the raw password entry
     */
    private async getPasswordEntry(fileId: string): Promise<PasswordEntry | null> {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(PASSWORD_STORE_CONSTANTS.STORE_NAME, 'readonly');
            const store = transaction.objectStore(PASSWORD_STORE_CONSTANTS.STORE_NAME);
            const request = store.get(fileId);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result || null);
        });
    }

    /**
     * Delete a stored password
     */
    async deletePassword(fileId: string): Promise<void> {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(PASSWORD_STORE_CONSTANTS.STORE_NAME, 'readwrite');
            const store = transaction.objectStore(PASSWORD_STORE_CONSTANTS.STORE_NAME);
            const request = store.delete(fileId);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    /**
     * Clear all stored passwords
     */
    async clearAll(): Promise<void> {
        const db = await this.ensureDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(PASSWORD_STORE_CONSTANTS.STORE_NAME, 'readwrite');
            const store = transaction.objectStore(PASSWORD_STORE_CONSTANTS.STORE_NAME);
            const request = store.clear();

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    }

    /**
     * Clean up expired entries
     */
    async cleanupExpired(): Promise<void> {
        const db = await this.ensureDB();
        const now = Date.now();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(PASSWORD_STORE_CONSTANTS.STORE_NAME, 'readwrite');
            const store = transaction.objectStore(PASSWORD_STORE_CONSTANTS.STORE_NAME);
            const index = store.index('expiresAt');
            const range = IDBKeyRange.upperBound(now);
            const request = index.openCursor(range);

            request.onerror = () => reject(request.error);
            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve();
                }
            };
        });
    }

    /**
     * Check if password store is available
     */
    isAvailable(): boolean {
        return typeof indexedDB !== 'undefined';
    }

    /**
     * Check if master key is set
     */
    hasMasterKey(): boolean {
        return this.masterKey !== null;
    }
}
