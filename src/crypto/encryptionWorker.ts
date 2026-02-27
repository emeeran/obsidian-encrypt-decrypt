/**
 * Note Encryptor - Encryption Web Worker
 * Offloads encryption/decryption operations to a separate thread
 */

// =============================================================================
// Worker Message Types
// =============================================================================

export type WorkerMessageType =
    | 'encrypt'
    | 'decrypt'
    | 'encryptInline'
    | 'decryptInline'
    | 'deriveKey'
    | 'ping';

export interface WorkerMessage<T extends WorkerMessageType, P = unknown> {
    type: T;
    id: string;
    payload: P;
}

export interface WorkerResponse<T = unknown> {
    id: string;
    success: boolean;
    result?: T;
    error?: string;
}

// =============================================================================
// Encryption Payloads
// =============================================================================

export interface EncryptPayload {
    content: string;
    password: string;
    iterations: number;
    includeChecksum: boolean;
}

export interface DecryptPayload {
    encryptedContent: string;
    password: string;
    iterations: number;
}

export interface EncryptInlinePayload {
    content: string;
    password: string;
    iterations: number;
}

export interface DecryptInlinePayload {
    encryptedContent: string;
    password: string;
    iterations: number;
}

export interface DeriveKeyPayload {
    password: string;
    saltBase64: string;
    iterations: number;
}

// =============================================================================
// Encryption Results
// =============================================================================

export interface EncryptResult {
    encrypted: string;
    checksum?: string;
}

export interface DecryptResult {
    content: string;
    integrityValid: boolean;
}

export interface DeriveKeyResult {
    // Key cannot be transferred, but we can confirm derivation succeeded
    success: boolean;
}

// =============================================================================
// Worker Code (as string for inline creation)
// =============================================================================

const WORKER_CODE = `
// Constants
const CRYPTO_CONSTANTS = {
    ALGORITHM: 'AES-GCM',
    KEY_LENGTH: 256,
    SALT_LENGTH: 16,
    IV_LENGTH: 12,
    PBKDF2_ITERATIONS: 310000,
    ENCRYPTION_HEADER_START: '-----BEGIN ENCRYPTED NOTE-----',
    ENCRYPTION_HEADER_END: '-----END ENCRYPTED NOTE-----',
    INLINE_ENCRYPTION_START: '\\u{1F510}\\u00AB',
    INLINE_ENCRYPTION_END: '\\u00BB\\u{1F510}',
    CHECKSUM_PREFIX: 'SHA256:',
};

// Utility functions
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const cleanBase64 = base64.replace(/\\s/g, '');
    const binary = atob(cleanBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

async function deriveKey(password, salt, iterations) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: iterations || CRYPTO_CONSTANTS.PBKDF2_ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: CRYPTO_CONSTANTS.ALGORITHM, length: CRYPTO_CONSTANTS.KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
    );
}

function generateSalt() {
    return crypto.getRandomValues(new Uint8Array(CRYPTO_CONSTANTS.SALT_LENGTH));
}

function generateIV() {
    return crypto.getRandomValues(new Uint8Array(CRYPTO_CONSTANTS.IV_LENGTH));
}

async function calculateChecksum(data) {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    return arrayBufferToBase64(hashBuffer);
}

// Encryption operations
async function encryptContent(content, password, iterations, includeChecksum) {
    const encoder = new TextEncoder();
    const salt = generateSalt();
    const iv = generateIV();
    const key = await deriveKey(password, salt, iterations);

    const encrypted = await crypto.subtle.encrypt(
        { name: CRYPTO_CONSTANTS.ALGORITHM, iv: iv },
        key,
        encoder.encode(content)
    );

    const checksum = includeChecksum ? await calculateChecksum(content) : null;

    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    const base64 = arrayBufferToBase64(combined.buffer);
    const checksumLine = checksum ? CRYPTO_CONSTANTS.CHECKSUM_PREFIX + checksum + '\\n' : '';

    return {
        encrypted: CRYPTO_CONSTANTS.ENCRYPTION_HEADER_START + '\\n' + checksumLine + base64 + '\\n' + CRYPTO_CONSTANTS.ENCRYPTION_HEADER_END,
        checksum: checksum
    };
}

async function decryptContent(encryptedContent, password, iterations) {
    const headerStart = CRYPTO_CONSTANTS.ENCRYPTION_HEADER_START;
    const headerEnd = CRYPTO_CONSTANTS.ENCRYPTION_HEADER_END;
    const checksumPrefix = CRYPTO_CONSTANTS.CHECKSUM_PREFIX;

    const startIdx = encryptedContent.indexOf(headerStart);
    const endIdx = encryptedContent.indexOf(headerEnd);

    if (startIdx === -1 || endIdx === -1) {
        throw new Error('Invalid encrypted content format');
    }

    const innerContent = encryptedContent.slice(startIdx + headerStart.length, endIdx).trim();
    const lines = innerContent.split('\\n');

    let storedChecksum = null;
    let base64Data;

    if (lines.length > 1 && lines[0].startsWith(checksumPrefix)) {
        storedChecksum = lines[0].slice(checksumPrefix.length);
        base64Data = lines.slice(1).join('');
    } else {
        base64Data = lines.join('');
    }

    const combined = new Uint8Array(base64ToArrayBuffer(base64Data));
    const salt = combined.slice(0, CRYPTO_CONSTANTS.SALT_LENGTH);
    const iv = combined.slice(CRYPTO_CONSTANTS.SALT_LENGTH, CRYPTO_CONSTANTS.SALT_LENGTH + CRYPTO_CONSTANTS.IV_LENGTH);
    const data = combined.slice(CRYPTO_CONSTANTS.SALT_LENGTH + CRYPTO_CONSTANTS.IV_LENGTH);

    const key = await deriveKey(password, salt, iterations);

    const decrypted = await crypto.subtle.decrypt(
        { name: CRYPTO_CONSTANTS.ALGORITHM, iv: iv },
        key,
        data
    );

    const content = new TextDecoder().decode(decrypted);

    let integrityValid = true;
    if (storedChecksum) {
        const calculatedChecksum = await calculateChecksum(content);
        integrityValid = calculatedChecksum === storedChecksum;
    }

    return { content, integrityValid };
}

async function encryptInline(content, password, iterations) {
    const encoder = new TextEncoder();
    const salt = generateSalt();
    const iv = generateIV();
    const key = await deriveKey(password, salt, iterations);

    const encrypted = await crypto.subtle.encrypt(
        { name: CRYPTO_CONSTANTS.ALGORITHM, iv: iv },
        key,
        encoder.encode(content)
    );

    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    const base64 = arrayBufferToBase64(combined.buffer);
    return CRYPTO_CONSTANTS.INLINE_ENCRYPTION_START + base64 + CRYPTO_CONSTANTS.INLINE_ENCRYPTION_END;
}

async function decryptInline(encryptedContent, password, iterations) {
    const startMarker = CRYPTO_CONSTANTS.INLINE_ENCRYPTION_START;
    const endMarker = CRYPTO_CONSTANTS.INLINE_ENCRYPTION_END;

    const startIdx = encryptedContent.indexOf(startMarker);
    const endIdx = encryptedContent.indexOf(endMarker);

    if (startIdx === -1 || endIdx === -1) {
        throw new Error('Invalid inline encrypted content format');
    }

    const base64 = encryptedContent.slice(startIdx + startMarker.length, endIdx).trim();

    if (!base64) {
        throw new Error('Empty encrypted content');
    }

    const combined = new Uint8Array(base64ToArrayBuffer(base64));

    if (combined.length < CRYPTO_CONSTANTS.SALT_LENGTH + CRYPTO_CONSTANTS.IV_LENGTH + 1) {
        throw new Error('Encrypted data too short');
    }

    const salt = combined.slice(0, CRYPTO_CONSTANTS.SALT_LENGTH);
    const iv = combined.slice(CRYPTO_CONSTANTS.SALT_LENGTH, CRYPTO_CONSTANTS.SALT_LENGTH + CRYPTO_CONSTANTS.IV_LENGTH);
    const data = combined.slice(CRYPTO_CONSTANTS.SALT_LENGTH + CRYPTO_CONSTANTS.IV_LENGTH);

    const key = await deriveKey(password, salt, iterations);

    const decrypted = await crypto.subtle.decrypt(
        { name: CRYPTO_CONSTANTS.ALGORITHM, iv: iv },
        key,
        data
    );

    return new TextDecoder().decode(decrypted);
}

// Message handler
self.onmessage = async function(e) {
    const { type, id, payload } = e.data;

    try {
        let result;

        switch (type) {
            case 'ping':
                result = { pong: true };
                break;

            case 'encrypt':
                result = await encryptContent(
                    payload.content,
                    payload.password,
                    payload.iterations,
                    payload.includeChecksum
                );
                break;

            case 'decrypt':
                result = await decryptContent(
                    payload.encryptedContent,
                    payload.password,
                    payload.iterations
                );
                break;

            case 'encryptInline':
                result = await encryptInline(
                    payload.content,
                    payload.password,
                    payload.iterations
                );
                break;

            case 'decryptInline':
                result = await decryptInline(
                    payload.encryptedContent,
                    payload.password,
                    payload.iterations
                );
                break;

            case 'deriveKey':
                // Just test key derivation
                const salt = new Uint8Array(base64ToArrayBuffer(payload.saltBase64));
                await deriveKey(payload.password, salt, payload.iterations);
                result = { success: true };
                break;

            default:
                throw new Error('Unknown message type: ' + type);
        }

        self.postMessage({ id, success: true, result });
    } catch (error) {
        self.postMessage({
            id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
`;

// =============================================================================
// Worker Manager
// =============================================================================

/**
 * Manager for encryption Web Worker
 */
export class EncryptionWorkerManager {
    private worker: Worker | null = null;
    private pendingRequests: Map<
        string,
        { resolve: (value: unknown) => void; reject: (error: Error) => void }
    > = new Map();
    private messageIdCounter = 0;
    private isAvailable: boolean | null = null;

    /**
     * Check if Web Workers are available
     */
    checkAvailability(): boolean {
        if (this.isAvailable !== null) {
            return this.isAvailable;
        }

        try {
            this.isAvailable = typeof Worker !== 'undefined';
            return this.isAvailable;
        } catch {
            this.isAvailable = false;
            return false;
        }
    }

    /**
     * Initialize the worker
     */
    private initWorker(): Worker {
        if (this.worker) {
            return this.worker;
        }

        // Create worker from inline code
        const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        this.worker = new Worker(workerUrl);

        // Handle messages from worker
        this.worker.onmessage = (event) => {
            const response: WorkerResponse = event.data;
            const pending = this.pendingRequests.get(response.id);

            if (pending) {
                this.pendingRequests.delete(response.id);

                if (response.success) {
                    pending.resolve(response.result);
                } else {
                    pending.reject(new Error(response.error || 'Worker operation failed'));
                }
            }
        };

        // Handle errors
        this.worker.onerror = (error) => {
            console.error('Encryption worker error:', error);
            // Reject all pending requests
            for (const [id, pending] of this.pendingRequests) {
                pending.reject(new Error('Worker error'));
                this.pendingRequests.delete(id);
            }
        };

        return this.worker;
    }

    /**
     * Send a message to the worker and wait for response
     */
    private async sendMessage<T extends WorkerMessageType, R>(
        type: T,
        payload: T extends 'encrypt' ? EncryptPayload :
                  T extends 'decrypt' ? DecryptPayload :
                  T extends 'encryptInline' ? EncryptInlinePayload :
                  T extends 'decryptInline' ? DecryptInlinePayload :
                  T extends 'deriveKey' ? DeriveKeyPayload :
                  never
    ): Promise<R> {
        if (!this.checkAvailability()) {
            throw new Error('Web Workers are not available');
        }

        const worker = this.initWorker();
        const id = `msg_${++this.messageIdCounter}`;

        return new Promise<R>((resolve, reject) => {
            this.pendingRequests.set(id, {
                resolve: resolve as (value: unknown) => void,
                reject,
            });

            const message: WorkerMessage<T> = {
                type,
                id,
                payload: payload as unknown as never,
            };

            worker.postMessage(message);
        });
    }

    /**
     * Encrypt content using worker
     */
    async encrypt(
        content: string,
        password: string,
        iterations: number,
        includeChecksum: boolean = true
    ): Promise<EncryptResult> {
        return this.sendMessage<'encrypt', EncryptResult>('encrypt', {
            content,
            password,
            iterations,
            includeChecksum,
        });
    }

    /**
     * Decrypt content using worker
     */
    async decrypt(
        encryptedContent: string,
        password: string,
        iterations: number
    ): Promise<DecryptResult> {
        return this.sendMessage<'decrypt', DecryptResult>('decrypt', {
            encryptedContent,
            password,
            iterations,
        });
    }

    /**
     * Encrypt inline content using worker
     */
    async encryptInline(
        content: string,
        password: string,
        iterations: number
    ): Promise<string> {
        return this.sendMessage<'encryptInline', string>('encryptInline', {
            content,
            password,
            iterations,
        });
    }

    /**
     * Decrypt inline content using worker
     */
    async decryptInline(
        encryptedContent: string,
        password: string,
        iterations: number
    ): Promise<string> {
        return this.sendMessage<'decryptInline', string>('decryptInline', {
            encryptedContent,
            password,
            iterations,
        });
    }

    /**
     * Test if worker is responsive
     */
    async ping(): Promise<boolean> {
        if (!this.checkAvailability()) {
            return false;
        }

        try {
            const result = await this.sendMessage<'ping', { pong: boolean }>('ping', {} as never);
            return result.pong === true;
        } catch {
            return false;
        }
    }

    /**
     * Terminate the worker
     */
    terminate(): void {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }

        // Reject all pending requests
        for (const [id, pending] of this.pendingRequests) {
            pending.reject(new Error('Worker terminated'));
        }
        this.pendingRequests.clear();
    }

    /**
     * Get pending request count (for debugging)
     */
    getPendingCount(): number {
        return this.pendingRequests.size;
    }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let workerManagerInstance: EncryptionWorkerManager | null = null;

/**
 * Get the singleton worker manager instance
 */
export function getWorkerManager(): EncryptionWorkerManager {
    if (!workerManagerInstance) {
        workerManagerInstance = new EncryptionWorkerManager();
    }
    return workerManagerInstance;
}

/**
 * Destroy the worker manager
 */
export function destroyWorkerManager(): void {
    if (workerManagerInstance) {
        workerManagerInstance.terminate();
        workerManagerInstance = null;
    }
}
