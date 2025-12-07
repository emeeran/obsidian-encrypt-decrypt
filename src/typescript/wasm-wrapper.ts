/**
 * WebAssembly Wrapper for Crypto Operations
 * Provides high-performance encryption/decryption with fallback to JavaScript
 * 
 * ⚠️ EXPERIMENTAL: This module requires a compiled WebAssembly binary (crypto-wasm.wasm)
 * that is not yet included in this distribution. The module will automatically fall back
 * to JavaScript implementations if WASM is unavailable.
 * 
 * To enable WASM acceleration:
 * 1. Compile the C source in src/wasm/crypto-wasm.c using Emscripten
 * 2. Place the resulting .wasm file in the plugin directory
 * 3. Enable WebAssembly in plugin settings
 */

export interface WasmEncryptionResult {
    data: Uint8Array;
    success: boolean;
    error?: string;
}

export interface WasmPerformanceMetrics {
    encryptionTime: number;
    decryptionTime: number;
    memoryUsage: number;
}

export class WasmCryptoEngine {
    private wasmInstance: WebAssembly.Instance | null = null;
    private isInitialized = false;
    private performanceMetrics: WasmPerformanceMetrics = {
        encryptionTime: 0,
        decryptionTime: 0,
        memoryUsage: 0
    };

    constructor() {
        this.initialize();
    }

    /**
     * Initialize the WebAssembly module
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            // Try to load WASM module
            const wasmUrl = new URL('crypto-wasm.wasm', import.meta.url);
            const response = await fetch(wasmUrl);

            if (!response.ok) {
                throw new Error(`Failed to fetch WASM: ${response.status}`);
            }

            const wasmBytes = await response.arrayBuffer();
            const wasmModule = await WebAssembly.instantiate(wasmBytes, {
                env: {
                    emscripten_get_now: () => performance.now()
                }
            });

            this.wasmInstance = wasmModule.instance;
            this.isInitialized = true;

            console.log('WebAssembly crypto engine initialized successfully');
        } catch (error) {
            console.warn('WASM initialization failed, using JavaScript fallback:', error);
            this.isInitialized = false;
        }
    }

    /**
     * Check if WASM is available and initialized
     */
    get isWasmAvailable(): boolean {
        return this.isInitialized && this.wasmInstance !== null;
    }

    /**
     * Encrypt data using WebAssembly if available, otherwise JavaScript fallback
     */
    async encrypt(
        data: Uint8Array,
        key: Uint8Array,
        iv: Uint8Array
    ): Promise<WasmEncryptionResult> {
        const startTime = performance.now();

        try {
            if (this.isWasmAvailable && this.wasmInstance) {
                const result = await this.encryptWasm(data, key, iv);
                this.performanceMetrics.encryptionTime = performance.now() - startTime;
                return result;
            } else {
                const result = await this.encryptJavaScript(data, key, iv);
                this.performanceMetrics.encryptionTime = performance.now() - startTime;
                return result;
            }
        } catch (error) {
            return {
                data: new Uint8Array(0),
                success: false,
                error: error instanceof Error ? error.message : 'Encryption failed'
            };
        }
    }

    /**
     * Decrypt data using WebAssembly if available, otherwise JavaScript fallback
     */
    async decrypt(
        encryptedData: Uint8Array,
        key: Uint8Array,
        iv: Uint8Array
    ): Promise<WasmEncryptionResult> {
        const startTime = performance.now();

        try {
            if (this.isWasmAvailable && this.wasmInstance) {
                const result = await this.decryptWasm(encryptedData, key, iv);
                this.performanceMetrics.decryptionTime = performance.now() - startTime;
                return result;
            } else {
                const result = await this.decryptJavaScript(encryptedData, key, iv);
                this.performanceMetrics.decryptionTime = performance.now() - startTime;
                return result;
            }
        } catch (error) {
            return {
                data: new Uint8Array(0),
                success: false,
                error: error instanceof Error ? error.message : 'Decryption failed'
            };
        }
    }

    /**
     * WebAssembly encryption implementation
     */
    private async encryptWasm(
        data: Uint8Array,
        key: Uint8Array,
        iv: Uint8Array
    ): Promise<WasmEncryptionResult> {
        if (!this.wasmInstance) {
            throw new Error('WASM instance not available');
        }

        const exports = this.wasmInstance.exports as any;

        // Allocate buffers
        const outputSize = data.length + 16; // Add space for GCM tag
        const allocResult = exports.allocate_buffers(data.length, outputSize);

        if (allocResult !== 0) {
            throw new Error('Failed to allocate WASM buffers');
        }

        try {
            // Get input buffer pointer
            const inputBuffer = new Uint8Array(
                exports.memory.buffer,
                exports.get_input_buffer(),
                data.length
            );

            // Copy data to WASM memory
            inputBuffer.set(data);

            // Perform encryption
            const encryptResult = exports.encrypt_data(
                exports.get_input_buffer(),
                data.length,
                key,
                key.length,
                iv,
                iv.length
            );

            if (encryptResult !== 0) {
                throw new Error(`WASM encryption failed with code: ${encryptResult}`);
            }

            // Get output buffer
            const outputBuffer = new Uint8Array(
                exports.memory.buffer,
                exports.get_output_buffer(),
                outputSize
            );

            // Copy result (remove the tag from the end for storage)
            const result = new Uint8Array(outputBuffer.slice(0, data.length));

            return {
                data: result,
                success: true
            };

        } finally {
            // Clean up WASM buffers
            exports.cleanup_buffers();
        }
    }

    /**
     * WebAssembly decryption implementation
     */
    private async decryptWasm(
        encryptedData: Uint8Array,
        key: Uint8Array,
        iv: Uint8Array
    ): Promise<WasmEncryptionResult> {
        if (!this.wasmInstance) {
            throw new Error('WASM instance not available');
        }

        const exports = this.wasmInstance.exports as any;

        // Allocate buffers
        const outputSize = encryptedData.length - 16; // Remove GCM tag
        const allocResult = exports.allocate_buffers(encryptedData.length, outputSize);

        if (allocResult !== 0) {
            throw new Error('Failed to allocate WASM buffers');
        }

        try {
            // Get input buffer pointer
            const inputBuffer = new Uint8Array(
                exports.memory.buffer,
                exports.get_input_buffer(),
                encryptedData.length
            );

            // Copy data to WASM memory
            inputBuffer.set(encryptedData);

            // Perform decryption
            const decryptResult = exports.decrypt_data(
                exports.get_input_buffer(),
                encryptedData.length,
                key,
                key.length,
                iv,
                iv.length
            );

            if (decryptResult !== 0) {
                throw new Error(`WASM decryption failed with code: ${decryptResult}`);
            }

            // Get output buffer
            const outputBuffer = new Uint8Array(
                exports.memory.buffer,
                exports.get_output_buffer(),
                outputSize
            );

            return {
                data: new Uint8Array(outputBuffer),
                success: true
            };

        } finally {
            // Clean up WASM buffers
            exports.cleanup_buffers();
        }
    }

    /**
     * JavaScript fallback encryption using Web Crypto API
     */
    private async encryptJavaScript(
        data: Uint8Array,
        key: Uint8Array,
        iv: Uint8Array
    ): Promise<WasmEncryptionResult> {
        try {
            // Import key
            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                key,
                { name: 'AES-GCM' },
                false,
                ['encrypt']
            );

            // Encrypt data
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                cryptoKey,
                data
            );

            return {
                data: new Uint8Array(encrypted),
                success: true
            };

        } catch (error) {
            return {
                data: new Uint8Array(0),
                success: false,
                error: error instanceof Error ? error.message : 'JavaScript encryption failed'
            };
        }
    }

    /**
     * JavaScript fallback decryption using Web Crypto API
     */
    private async decryptJavaScript(
        encryptedData: Uint8Array,
        key: Uint8Array,
        iv: Uint8Array
    ): Promise<WasmEncryptionResult> {
        try {
            // Import key
            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                key,
                { name: 'AES-GCM' },
                false,
                ['decrypt']
            );

            // Decrypt data
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                cryptoKey,
                encryptedData
            );

            return {
                data: new Uint8Array(decrypted),
                success: true
            };

        } catch (error) {
            return {
                data: new Uint8Array(0),
                success: false,
                error: error instanceof Error ? error.message : 'JavaScript decryption failed'
            };
        }
    }

    /**
     * Get performance metrics
     */
    getMetrics(): WasmPerformanceMetrics {
        return { ...this.performanceMetrics };
    }

    /**
     * Reset performance metrics
     */
    resetMetrics(): void {
        this.performanceMetrics = {
            encryptionTime: 0,
            decryptionTime: 0,
            memoryUsage: 0
        };
    }

    /**
     * Benchmark encryption performance
     */
    async benchmarkEncryption(
        dataSize: number,
        iterations: number = 100
    ): Promise<{ wasmTime: number; jsTime: number; improvement: number }> {
        const testData = new Uint8Array(dataSize);
        const key = crypto.getRandomValues(new Uint8Array(32));
        const iv = crypto.getRandomValues(new Uint8Array(12));

        // Fill test data with random values
        crypto.getRandomValues(testData);

        // Benchmark WASM (if available)
        let wasmTime = 0;
        if (this.isWasmAvailable) {
            const wasmStart = performance.now();
            for (let i = 0; i < iterations; i++) {
                await this.encryptWasm(testData, key, iv);
            }
            wasmTime = performance.now() - wasmStart;
        }

        // Benchmark JavaScript
        const jsStart = performance.now();
        for (let i = 0; i < iterations; i++) {
            await this.encryptJavaScript(testData, key, iv);
        }
        const jsTime = performance.now() - jsStart;

        const improvement = wasmTime > 0 ? (jsTime - wasmTime) / jsTime * 100 : 0;

        return {
            wasmTime: wasmTime / iterations,
            jsTime: jsTime / iterations,
            improvement
        };
    }

    /**
     * Check if WebAssembly is supported in this browser
     */
    static isWebAssemblySupported(): boolean {
        return typeof WebAssembly === 'object' &&
               typeof WebAssembly.instantiate === 'function';
    }

    /**
     * Get system information for debugging
     */
    getSystemInfo(): Record<string, any> {
        return {
            wasmSupported: WasmCryptoEngine.isWebAssemblySupported(),
            wasmInitialized: this.isInitialized,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            memoryLimit: (navigator as any).deviceMemory || 'unknown',
            hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
            webGlSupported: !!document.createElement('canvas').getContext('webgl')
        };
    }
}

// Singleton instance
export const wasmCryptoEngine = new WasmCryptoEngine();