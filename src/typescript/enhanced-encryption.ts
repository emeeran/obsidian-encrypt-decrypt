/**
 * Enhanced Encryption Service with WebAssembly Integration
 * Provides high-performance encryption with fallback to JavaScript
 */

import { wasmCryptoEngine, WasmEncryptionResult } from './wasm-wrapper';

export interface EncryptionOptions {
    useWasm?: boolean;
    performanceMode?: boolean;
    memoryOptimization?: boolean;
}

export interface EnhancedEncryptionResult {
    encrypted: string;
    success: boolean;
    error?: string;
    metrics?: {
        encryptionTime: number;
        algorithm: string;
        wasmUsed: boolean;
        memoryUsage: number;
    };
}

export interface DecryptionOptions {
    useWasm?: boolean;
    allowFallback?: boolean;
}

export interface EnhancedDecryptionResult {
    decrypted: string;
    success: boolean;
    error?: string;
    metrics?: {
        decryptionTime: number;
        algorithm: string;
        wasmUsed: boolean;
        memoryUsage: number;
    };
}

export class EnhancedEncryptionService {
    private readonly ENCRYPTION_VERSION = 2; // Updated for v2.0
    private readonly ITERATIONS = 100000;
    private readonly SALT_LENGTH = 16;
    private readonly IV_LENGTH = 12;
    private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit for enhanced version

    private performanceCache = new Map<string, any>();
    private encryptionMetrics: Map<string, number> = new Map();

    constructor() {
        this.initializeWasm();
    }

    private async initializeWasm(): Promise<void> {
        try {
            await wasmCryptoEngine.initialize();
        } catch (error) {
            console.warn('Failed to initialize WASM engine:', error);
        }
    }

    /**
     * Enhanced encrypt method with WebAssembly support
     */
    async encrypt(
        text: string,
        password: string,
        options: EncryptionOptions = {}
    ): Promise<EnhancedEncryptionResult> {
        const startTime = performance.now();
        const encoder = new TextEncoder();
        const data = encoder.encode(text);

        // Validate inputs
        if (data.length > this.MAX_FILE_SIZE) {
            return {
                encrypted: '',
                success: false,
                error: `File too large for encryption (max ${this.MAX_FILE_SIZE / 1024 / 1024}MB)`
            };
        }

        if (!password || password.length === 0) {
            return {
                encrypted: '',
                success: false,
                error: 'Password is required'
            };
        }

        try {
            // Generate salt
            const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));

            // Derive key using PBKDF2
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                encoder.encode(password),
                'PBKDF2',
                false,
                ['deriveBits', 'deriveKey']
            );

            const key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: this.ITERATIONS,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );

            // Generate IV
            const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

            // Choose encryption method
            const useWasm = options.useWasm !== false && wasmCryptoEngine.isWasmAvailable;
            let encryptedData: Uint8Array;

            if (useWasm && options.performanceMode) {
                // Use WebAssembly for better performance
                const keyBytes = await this.cryptoKeyToBytes(key);
                const wasmResult = await wasmCryptoEngine.encrypt(data, keyBytes, iv);

                if (!wasmResult.success) {
                    throw new Error(wasmResult.error || 'WASM encryption failed');
                }

                encryptedData = wasmResult.data;
            } else {
                // Use JavaScript Web Crypto API
                const webCryptoResult = await crypto.subtle.encrypt(
                    { name: 'AES-GCM', iv },
                    key,
                    data
                );
                encryptedData = new Uint8Array(webCryptoResult);
            }

            // Create enhanced header with version and metadata
            const header = JSON.stringify({
                v: this.ENCRYPTION_VERSION,
                alg: 'AES-256-GCM',
                kdf: 'PBKDF2',
                iterations: this.ITERATIONS,
                wasm: useWasm,
                timestamp: Date.now()
            });

            const headerBytes = encoder.encode(header);
            const nullTerminator = new Uint8Array([0]);

            // Combine all components
            const combined = new Uint8Array(
                headerBytes.length +
                1 + // null terminator
                salt.length +
                iv.length +
                encryptedData.length
            );

            let offset = 0;
            combined.set(headerBytes, offset);
            offset += headerBytes.length;
            combined.set(nullTerminator, offset);
            offset += 1;
            combined.set(salt, offset);
            offset += salt.length;
            combined.set(iv, offset);
            offset += iv.length;
            combined.set(encryptedData, offset);

            // Convert to base64
            const base64 = this.arrayBufferToBase64(combined);

            const encryptionTime = performance.now() - startTime;

            // Cache encryption metrics
            this.encryptionMetrics.set('lastEncryption', encryptionTime);
            this.encryptionMetrics.set('wasmUsed', useWasm ? 1 : 0);

            return {
                encrypted: `-----BEGIN ENCRYPTED NOTE-----\n${base64}\n-----END ENCRYPTED NOTE-----`,
                success: true,
                metrics: {
                    encryptionTime,
                    algorithm: useWasm ? 'AES-256-GCM (WASM)' : 'AES-256-GCM (Web Crypto)',
                    wasmUsed: useWasm,
                    memoryUsage: data.length
                }
            };

        } catch (error) {
            return {
                encrypted: '',
                success: false,
                error: error instanceof Error ? error.message : 'Encryption failed'
            };
        } finally {
            // Clear sensitive data
            this.zeroMemory(data);
        }
    }

    /**
     * Enhanced decrypt method with WebAssembly support
     */
    async decrypt(
        encryptedText: string,
        password: string,
        options: DecryptionOptions = {}
    ): Promise<EnhancedDecryptionResult> {
        const startTime = performance.now();

        try {
            // Extract base64 data
            const match = encryptedText.match(/-----BEGIN ENCRYPTED NOTE-----\n([\s\S]+?)\n-----END ENCRYPTED NOTE-----/);
            if (!match) {
                return {
                    decrypted: '',
                    success: false,
                    error: 'Invalid encrypted note format'
                };
            }

            const base64 = match[1];
            const combined = this.base64ToArrayBuffer(base64);

            // Extract header
            const encoder = new TextEncoder();
            const decoder = new TextDecoder();

            // Find header length
            let headerEnd = 0;
            for (let i = 0; i < combined.length; i++) {
                if (combined[i] === 0) {
                    headerEnd = i;
                    break;
                }
            }

            if (headerEnd === 0) {
                return {
                    decrypted: '',
                    success: false,
                    error: 'Invalid encrypted note format: missing header'
                };
            }

            const headerBytes = combined.slice(0, headerEnd);
            const headerText = decoder.decode(headerBytes);

            let header;
            try {
                header = JSON.parse(headerText);
            } catch (e) {
                return {
                    decrypted: '',
                    success: false,
                    error: 'Invalid encrypted note format: corrupted header'
                };
            }

            // Check encryption version
            if (header.v > this.ENCRYPTION_VERSION) {
                return {
                    decrypted: '',
                    success: false,
                    error: `Unsupported encryption version: ${header.v}. Please update the plugin.`
                };
            }

            // Fallback for version 1.x
            if (header.v === 1) {
                return this.decryptLegacy(combined, password, startTime);
            }

            // Extract components for v2.x
            const offset = headerEnd + 1;
            const salt = combined.slice(offset, offset + this.SALT_LENGTH);
            const iv = combined.slice(offset + this.SALT_LENGTH, offset + this.SALT_LENGTH + this.IV_LENGTH);
            const encryptedData = combined.slice(offset + this.SALT_LENGTH + this.IV_LENGTH);

            // Derive key from password
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                encoder.encode(password),
                'PBKDF2',
                false,
                ['deriveBits', 'deriveKey']
            );

            const key = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: this.ITERATIONS,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );

            // Choose decryption method
            const useWasm = options.useWasm !== false && header.wasm && wasmCryptoEngine.isWasmAvailable;
            let decryptedData: Uint8Array;

            if (useWasm) {
                // Use WebAssembly for decryption
                const keyBytes = await this.cryptoKeyToBytes(key);
                const wasmResult = await wasmCryptoEngine.decrypt(encryptedData, keyBytes, iv);

                if (!wasmResult.success) {
                    throw new Error(wasmResult.error || 'WASM decryption failed');
                }

                decryptedData = wasmResult.data;
            } else {
                // Use JavaScript Web Crypto API
                const webCryptoResult = await crypto.subtle.decrypt(
                    { name: 'AES-GCM', iv },
                    key,
                    encryptedData
                );
                decryptedData = new Uint8Array(webCryptoResult);
            }

            const decryptionTime = performance.now() - startTime;
            const decryptedText = decoder.decode(decryptedData);

            return {
                decrypted: decryptedText,
                success: true,
                metrics: {
                    decryptionTime,
                    algorithm: useWasm ? 'AES-256-GCM (WASM)' : 'AES-256-GCM (Web Crypto)',
                    wasmUsed: useWasm,
                    memoryUsage: encryptedData.length
                }
            };

        } catch (error) {
            return {
                decrypted: '',
                success: false,
                error: error instanceof Error ? error.message : 'Decryption failed'
            };
        }
    }

    /**
     * Decrypt legacy v1.x format for backward compatibility
     */
    private async decryptLegacy(
        combined: Uint8Array,
        password: string,
        startTime: number
    ): Promise<EnhancedDecryptionResult> {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        // Legacy format: salt + iv + encrypted data
        const salt = combined.slice(0, 16);
        const iv = combined.slice(16, 28);
        const encryptedData = combined.slice(28);

        // Derive key
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );

        // Decrypt
        const decryptedData = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            encryptedData
        );

        const decryptionTime = performance.now() - startTime;
        const decryptedText = decoder.decode(decryptedData);

        return {
            decrypted: decryptedText,
            success: true,
            metrics: {
                decryptionTime,
                algorithm: 'AES-256-GCM (Legacy)',
                wasmUsed: false,
                memoryUsage: encryptedData.length
            }
        };
    }

    /**
     * Convert CryptoKey to bytes for WASM operations
     */
    private async cryptoKeyToBytes(key: CryptoKey): Promise<Uint8Array> {
        const exported = await crypto.subtle.exportKey('raw', key);
        return new Uint8Array(exported);
    }

    /**
     * Performance benchmark for comparison
     */
    async benchmarkPerformance(testSize: number = 1024 * 1024): Promise<{
        wasm: { avgTime: number; totalTime: number };
        javascript: { avgTime: number; totalTime: number };
        improvement: number;
    }> {
        const testData = new Array(testSize).fill(0).map(() => Math.random().toString(36)).join('');
        const password = 'benchmarkPassword123!';

        // Benchmark WASM
        let wasmTimes: number[] = [];
        if (wasmCryptoEngine.isWasmAvailable) {
            for (let i = 0; i < 5; i++) {
                const result = await this.encrypt(testData, password, { useWasm: true, performanceMode: true });
                if (result.success && result.metrics) {
                    wasmTimes.push(result.metrics.encryptionTime);
                }
            }
        }

        // Benchmark JavaScript
        let jsTimes: number[] = [];
        for (let i = 0; i < 5; i++) {
            const result = await this.encrypt(testData, password, { useWasm: false });
            if (result.success && result.metrics) {
                jsTimes.push(result.metrics.encryptionTime);
            }
        }

        const wasmAvg = wasmTimes.length > 0 ? wasmTimes.reduce((a, b) => a + b, 0) / wasmTimes.length : 0;
        const jsAvg = jsTimes.reduce((a, b) => a + b, 0) / jsTimes.length;
        const improvement = jsAvg > 0 ? ((jsAvg - wasmAvg) / jsAvg) * 100 : 0;

        return {
            wasm: {
                avgTime: wasmAvg,
                totalTime: wasmTimes.reduce((a, b) => a + b, 0)
            },
            javascript: {
                avgTime: jsAvg,
                totalTime: jsTimes.reduce((a, b) => a + b, 0)
            },
            improvement
        };
    }

    /**
     * Get system capabilities
     */
    getSystemCapabilities(): {
        wasmSupported: boolean;
        wasmInitialized: boolean;
        webCryptoSupported: boolean;
        performanceMode: boolean;
        memoryLimit: number;
    } {
        return {
            wasmSupported: typeof WebAssembly === 'object',
            wasmInitialized: wasmCryptoEngine.isWasmAvailable,
            webCryptoSupported: typeof crypto !== 'undefined' && typeof crypto.subtle === 'object',
            performanceMode: true,
            memoryLimit: this.MAX_FILE_SIZE
        };
    }

    /**
     * Clear sensitive data from memory
     */
    private zeroMemory(data: Uint8Array): void {
        data.fill(0);
    }

    /**
     * Convert array buffer to base64
     */
    private arrayBufferToBase64(buffer: Uint8Array): string {
        let binary = '';
        const len = buffer.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(buffer[i]);
        }
        return btoa(binary);
    }

    /**
     * Convert base64 to array buffer
     */
    private base64ToArrayBuffer(base64: string): Uint8Array {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    /**
     * Get encryption metrics
     */
    getMetrics(): Record<string, any> {
        return {
            encryptionMetrics: Object.fromEntries(this.encryptionMetrics),
            systemCapabilities: this.getSystemCapabilities(),
            wasmMetrics: wasmCryptoEngine.getMetrics()
        };
    }

    /**
     * Reset all metrics and caches
     */
    resetMetrics(): void {
        this.performanceCache.clear();
        this.encryptionMetrics.clear();
        wasmCryptoEngine.resetMetrics();
    }
}

// Singleton instance
export const enhancedEncryptionService = new EnhancedEncryptionService();