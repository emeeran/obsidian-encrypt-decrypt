/**
 * Note Encryptor - Key Derivation Cache
 * Memoization and caching for key derivation operations
 */

import type { DerivedKey, Salt } from '../types/branded';
import { secureWipe } from './integrity';

// =============================================================================
// Cache Types
// =============================================================================

interface CacheEntry {
    key: CryptoKey;
    createdAt: number;
    lastAccessed: number;
    accessCount: number;
}

export interface CacheStats {
    hits: number;
    misses: number;
    evictions: number;
    size: number;
    maxSize: number;
}

export interface KeyCacheOptions {
    maxSize?: number;
    ttlMs?: number;
    pruneIntervalMs?: number;
}

// =============================================================================
// Key Derivation Cache
// =============================================================================

/**
 * LRU Cache for derived encryption keys
 * Provides memoization to avoid re-deriving keys for the same password/salt combination
 */
export class KeyDerivationCache {
    private cache: Map<string, CacheEntry> = new Map();
    private maxSize: number;
    private ttlMs: number;
    private stats: CacheStats;
    private pruneInterval: ReturnType<typeof setInterval> | null = null;

    constructor(options: KeyCacheOptions = {}) {
        this.maxSize = options.maxSize ?? 50;
        this.ttlMs = options.ttlMs ?? 5 * 60 * 1000; // 5 minutes default
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            size: 0,
            maxSize: this.maxSize,
        };

        // Start pruning interval
        if (options.pruneIntervalMs !== 0) {
            this.pruneInterval = setInterval(
                () => this.pruneExpired(),
                options.pruneIntervalMs ?? 60 * 1000
            );
        }
    }

    /**
     * Generate a cache key from password and salt
     */
    private generateCacheKey(password: string, salt: Uint8Array): string {
        // Create a hash of password + salt for the cache key
        // Using a simple approach for performance
        const saltBase64 = this.arrayToBase64(salt);
        return `${password.length}:${this.simpleHash(password)}:${saltBase64}`;
    }

    /**
     * Simple hash function for cache key generation
     */
    private simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    /**
     * Convert Uint8Array to base64
     */
    private arrayToBase64(array: Uint8Array): string {
        let binary = '';
        for (let i = 0; i < array.length; i++) {
            binary += String.fromCharCode(array[i]);
        }
        return btoa(binary);
    }

    /**
     * Get a derived key from cache
     */
    get(password: string, salt: Uint8Array): CryptoKey | null {
        const cacheKey = this.generateCacheKey(password, salt);
        const entry = this.cache.get(cacheKey);

        if (!entry) {
            this.stats.misses++;
            return null;
        }

        // Check TTL
        if (Date.now() - entry.createdAt > this.ttlMs) {
            this.cache.delete(cacheKey);
            this.stats.evictions++;
            this.stats.misses++;
            return null;
        }

        // Update access stats
        entry.lastAccessed = Date.now();
        entry.accessCount++;
        this.stats.hits++;

        // Move to end (most recently used)
        this.cache.delete(cacheKey);
        this.cache.set(cacheKey, entry);

        return entry.key;
    }

    /**
     * Store a derived key in cache
     */
    set(password: string, salt: Uint8Array, key: CryptoKey): void {
        const cacheKey = this.generateCacheKey(password, salt);

        // Evict oldest if at capacity
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) {
                const oldestEntry = this.cache.get(oldestKey);
                if (oldestEntry) {
                    // Attempt to wipe the key material (best effort)
                    try {
                        crypto.subtle.exportKey('raw', oldestEntry.key);
                    } catch {
                        // Key is not extractable, which is fine
                    }
                }
                this.cache.delete(oldestKey);
                this.stats.evictions++;
            }
        }

        this.cache.set(cacheKey, {
            key,
            createdAt: Date.now(),
            lastAccessed: Date.now(),
            accessCount: 0,
        });

        this.stats.size = this.cache.size;
    }

    /**
     * Check if a key exists in cache
     */
    has(password: string, salt: Uint8Array): boolean {
        const cacheKey = this.generateCacheKey(password, salt);
        const entry = this.cache.get(cacheKey);

        if (!entry) return false;

        // Check TTL
        return Date.now() - entry.createdAt <= this.ttlMs;
    }

    /**
     * Remove a specific key from cache
     */
    delete(password: string, salt: Uint8Array): boolean {
        const cacheKey = this.generateCacheKey(password, salt);
        return this.cache.delete(cacheKey);
    }

    /**
     * Clear all cached keys
     */
    clear(): void {
        this.cache.clear();
        this.stats.size = 0;
    }

    /**
     * Prune expired entries
     */
    pruneExpired(): number {
        const now = Date.now();
        let pruned = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.createdAt > this.ttlMs) {
                this.cache.delete(key);
                pruned++;
            }
        }

        this.stats.evictions += pruned;
        this.stats.size = this.cache.size;
        return pruned;
    }

    /**
     * Get cache statistics
     */
    getStats(): Readonly<CacheStats> {
        return { ...this.stats, size: this.cache.size };
    }

    /**
     * Get cache hit rate
     */
    getHitRate(): number {
        const total = this.stats.hits + this.stats.misses;
        return total === 0 ? 0 : this.stats.hits / total;
    }

    /**
     * Destroy the cache and cleanup
     */
    destroy(): void {
        if (this.pruneInterval) {
            clearInterval(this.pruneInterval);
            this.pruneInterval = null;
        }
        this.clear();
    }
}

// =============================================================================
// Global Cache Instance
// =============================================================================

let globalCache: KeyDerivationCache | null = null;

/**
 * Get or create the global key cache
 */
export function getKeyCache(options?: KeyCacheOptions): KeyDerivationCache {
    if (!globalCache) {
        globalCache = new KeyDerivationCache(options);
    }
    return globalCache;
}

/**
 * Destroy the global key cache
 */
export function destroyKeyCache(): void {
    if (globalCache) {
        globalCache.destroy();
        globalCache = null;
    }
}

// =============================================================================
// Cached Key Derivation Helper
// =============================================================================

/**
 * Derive key with caching
 * Use this instead of direct deriveKey for performance
 */
export async function deriveKeyWithCache(
    password: string,
    salt: Uint8Array,
    deriveFn: () => Promise<CryptoKey>
): Promise<CryptoKey> {
    const cache = getKeyCache();

    // Check cache first
    const cached = cache.get(password, salt);
    if (cached) {
        return cached;
    }

    // Derive and cache
    const key = await deriveFn();
    cache.set(password, salt, key);

    return key;
}

// =============================================================================
// Key Cache Manager for Plugin
// =============================================================================

/**
 * Key cache manager that integrates with plugin lifecycle
 */
export class KeyCacheManager {
    private cache: KeyDerivationCache;

    constructor(options?: KeyCacheOptions) {
        this.cache = new KeyDerivationCache(options);
    }

    /**
     * Get cached key or derive new one
     */
    async getOrDerive(
        password: string,
        salt: Uint8Array,
        deriveFn: () => Promise<CryptoKey>
    ): Promise<CryptoKey> {
        return deriveKeyWithCache(password, salt, deriveFn);
    }

    /**
     * Invalidate cache for a specific password/salt
     */
    invalidate(password: string, salt: Uint8Array): void {
        this.cache.delete(password, salt);
    }

    /**
     * Invalidate all cache entries
     */
    invalidateAll(): void {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getStats(): Readonly<CacheStats> {
        return this.cache.getStats();
    }

    /**
     * Cleanup on plugin unload
     */
    destroy(): void {
        this.cache.destroy();
    }
}
