/**
 * Note Encryptor - Circuit Breaker
 * Prevents cascading failures in batch operations
 */

import { CircuitBreakerOpenError } from '../errors';

// =============================================================================
// Circuit Breaker Types
// =============================================================================

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
    failureThreshold: number;
    successThreshold: number;
    timeout: number;
    resetTimeout: number;
    onStateChange?: (from: CircuitState, to: CircuitState) => void;
    onFailure?: (error: Error) => void;
    onSuccess?: () => void;
}

export interface CircuitBreakerStats {
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailureTime: number | null;
    lastSuccessTime: number | null;
    totalCalls: number;
    totalFailures: number;
    totalSuccesses: number;
}

// =============================================================================
// Default Options
// =============================================================================

export const DEFAULT_CIRCUIT_BREAKER_OPTIONS: CircuitBreakerOptions = {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 30000,
    resetTimeout: 60000,
};

// =============================================================================
// Circuit Breaker Implementation
// =============================================================================

/**
 * Circuit Breaker pattern implementation
 * Prevents cascading failures by temporarily blocking operations when failures exceed threshold
 */
export class CircuitBreaker {
    private state: CircuitState = 'closed';
    private failures = 0;
    private successes = 0;
    private lastFailureTime: number | null = null;
    private lastSuccessTime: number | null = null;
    private totalCalls = 0;
    private totalFailures = 0;
    private totalSuccesses = 0;
    private options: CircuitBreakerOptions;
    private resetTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(options: Partial<CircuitBreakerOptions> = {}) {
        this.options = { ...DEFAULT_CIRCUIT_BREAKER_OPTIONS, ...options };
    }

    /**
     * Execute a function with circuit breaker protection
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        this.totalCalls++;

        // Check if circuit is open
        if (this.state === 'open') {
            if (this.shouldAttemptReset()) {
                this.transitionTo('half-open');
            } else {
                throw new CircuitBreakerOpenError(this.totalFailures);
            }
        }

        try {
            const result = await this.executeWithTimeout(fn);
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure(error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }

    /**
     * Execute function with timeout
     */
    private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Operation timed out after ${this.options.timeout}ms`));
            }, this.options.timeout);

            fn()
                .then((result) => {
                    clearTimeout(timeoutId);
                    resolve(result);
                })
                .catch((error) => {
                    clearTimeout(timeoutId);
                    reject(error);
                });
        });
    }

    /**
     * Handle successful operation
     */
    private onSuccess(): void {
        this.successes++;
        this.totalSuccesses++;
        this.lastSuccessTime = Date.now();

        if (this.options.onSuccess) {
            this.options.onSuccess();
        }

        if (this.state === 'half-open') {
            if (this.successes >= this.options.successThreshold) {
                this.transitionTo('closed');
            }
        } else if (this.state === 'closed') {
            // Reset failure count on success
            this.failures = 0;
        }
    }

    /**
     * Handle failed operation
     */
    private onFailure(error: Error): void {
        this.failures++;
        this.totalFailures++;
        this.lastFailureTime = Date.now();

        if (this.options.onFailure) {
            this.options.onFailure(error);
        }

        if (this.state === 'half-open') {
            // Single failure in half-open state opens circuit
            this.transitionTo('open');
        } else if (this.state === 'closed') {
            if (this.failures >= this.options.failureThreshold) {
                this.transitionTo('open');
            }
        }
    }

    /**
     * Check if we should attempt reset from open state
     */
    private shouldAttemptReset(): boolean {
        if (!this.lastFailureTime) return true;
        return Date.now() - this.lastFailureTime >= this.options.resetTimeout;
    }

    /**
     * Transition to a new state
     */
    private transitionTo(newState: CircuitState): void {
        const oldState = this.state;
        this.state = newState;

        // Reset counters on state change
        if (newState === 'closed') {
            this.failures = 0;
            this.successes = 0;
        } else if (newState === 'half-open') {
            this.successes = 0;
        } else if (newState === 'open') {
            this.failures = 0;
            // Schedule reset attempt
            this.scheduleReset();
        }

        if (this.options.onStateChange) {
            this.options.onStateChange(oldState, newState);
        }
    }

    /**
     * Schedule automatic reset attempt
     */
    private scheduleReset(): void {
        if (this.resetTimer) {
            clearTimeout(this.resetTimer);
        }

        this.resetTimer = setTimeout(() => {
            if (this.state === 'open') {
                this.transitionTo('half-open');
            }
        }, this.options.resetTimeout);
    }

    /**
     * Get current state
     */
    getState(): CircuitState {
        return this.state;
    }

    /**
     * Check if circuit is closed (allowing operations)
     */
    isClosed(): boolean {
        return this.state === 'closed';
    }

    /**
     * Check if circuit is open (blocking operations)
     */
    isOpen(): boolean {
        return this.state === 'open';
    }

    /**
     * Check if circuit is in half-open state (testing recovery)
     */
    isHalfOpen(): boolean {
        return this.state === 'half-open';
    }

    /**
     * Get circuit breaker statistics
     */
    getStats(): CircuitBreakerStats {
        return {
            state: this.state,
            failures: this.failures,
            successes: this.successes,
            lastFailureTime: this.lastFailureTime,
            lastSuccessTime: this.lastSuccessTime,
            totalCalls: this.totalCalls,
            totalFailures: this.totalFailures,
            totalSuccesses: this.totalSuccesses,
        };
    }

    /**
     * Manually reset the circuit breaker
     */
    reset(): void {
        if (this.resetTimer) {
            clearTimeout(this.resetTimer);
            this.resetTimer = null;
        }
        this.failures = 0;
        this.successes = 0;
        this.transitionTo('closed');
    }

    /**
     * Manually trip the circuit breaker
     */
    trip(): void {
        this.transitionTo('open');
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        if (this.resetTimer) {
            clearTimeout(this.resetTimer);
            this.resetTimer = null;
        }
    }
}

// =============================================================================
// Circuit Breaker Manager for Multiple Resources
// =============================================================================

/**
 * Manages multiple circuit breakers for different resources
 */
export class CircuitBreakerManager {
    private breakers: Map<string, CircuitBreaker> = new Map();
    private defaultOptions: CircuitBreakerOptions;

    constructor(defaultOptions: Partial<CircuitBreakerOptions> = {}) {
        this.defaultOptions = { ...DEFAULT_CIRCUIT_BREAKER_OPTIONS, ...defaultOptions };
    }

    /**
     * Get or create a circuit breaker for a resource
     */
    getBreaker(name: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
        if (!this.breakers.has(name)) {
            this.breakers.set(
                name,
                new CircuitBreaker({ ...this.defaultOptions, ...options })
            );
        }
        return this.breakers.get(name)!;
    }

    /**
     * Execute a function with circuit breaker protection
     */
    async execute<T>(breakerName: string, fn: () => Promise<T>): Promise<T> {
        const breaker = this.getBreaker(breakerName);
        return breaker.execute(fn);
    }

    /**
     * Check if a circuit breaker is open
     */
    isOpen(breakerName: string): boolean {
        const breaker = this.breakers.get(breakerName);
        return breaker?.isOpen() ?? false;
    }

    /**
     * Reset a specific circuit breaker
     */
    reset(breakerName: string): void {
        const breaker = this.breakers.get(breakerName);
        breaker?.reset();
    }

    /**
     * Reset all circuit breakers
     */
    resetAll(): void {
        for (const breaker of this.breakers.values()) {
            breaker.reset();
        }
    }

    /**
     * Get statistics for all circuit breakers
     */
    getAllStats(): Record<string, CircuitBreakerStats> {
        const stats: Record<string, CircuitBreakerStats> = {};
        for (const [name, breaker] of this.breakers) {
            stats[name] = breaker.getStats();
        }
        return stats;
    }

    /**
     * Remove a circuit breaker
     */
    remove(breakerName: string): void {
        const breaker = this.breakers.get(breakerName);
        if (breaker) {
            breaker.destroy();
            this.breakers.delete(breakerName);
        }
    }

    /**
     * Cleanup all circuit breakers
     */
    destroy(): void {
        for (const breaker of this.breakers.values()) {
            breaker.destroy();
        }
        this.breakers.clear();
    }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let defaultManager: CircuitBreakerManager | null = null;

/**
 * Get the default circuit breaker manager
 */
export function getCircuitBreakerManager(): CircuitBreakerManager {
    if (!defaultManager) {
        defaultManager = new CircuitBreakerManager();
    }
    return defaultManager;
}

/**
 * Destroy the default manager
 */
export function destroyCircuitBreakerManager(): void {
    if (defaultManager) {
        defaultManager.destroy();
        defaultManager = null;
    }
}

// =============================================================================
// Batch Operation Helper
// =============================================================================

export interface BatchOperationOptions<T, R> {
    items: T[];
    operation: (item: T) => Promise<R>;
    concurrency?: number;
    continueOnError?: boolean;
    circuitBreakerName?: string;
    onProgress?: (completed: number, total: number) => void;
}

export interface BatchOperationResult<R> {
    results: Array<{ item: unknown; result?: R; error?: Error }>;
    successful: number;
    failed: number;
    total: number;
}

/**
 * Execute batch operations with circuit breaker protection
 */
export async function executeBatchWithCircuitBreaker<T, R>(
    options: BatchOperationOptions<T, R>
): Promise<BatchOperationResult<R>> {
    const {
        items,
        operation,
        concurrency = 5,
        continueOnError = true,
        circuitBreakerName = 'batch',
        onProgress,
    } = options;

    const manager = getCircuitBreakerManager();
    const breaker = manager.getBreaker(circuitBreakerName);

    const results: Array<{ item: unknown; result?: R; error?: Error }> = [];
    let completed = 0;
    let successful = 0;
    let failed = 0;

    // Process in chunks for concurrency control
    for (let i = 0; i < items.length; i += concurrency) {
        const chunk = items.slice(i, i + concurrency);

        const chunkResults = await Promise.allSettled(
            chunk.map(async (item) => {
                return breaker.execute(() => operation(item));
            })
        );

        for (let j = 0; j < chunkResults.length; j++) {
            const result = chunkResults[j];
            const item = chunk[j];

            completed++;

            if (result.status === 'fulfilled') {
                results.push({ item, result: result.value });
                successful++;
            } else {
                results.push({ item, error: result.reason });
                failed++;

                if (!continueOnError && breaker.isOpen()) {
                    // Circuit is open, stop processing
                    return {
                        results,
                        successful,
                        failed,
                        total: items.length,
                    };
                }
            }

            if (onProgress) {
                onProgress(completed, items.length);
            }
        }

        // Stop if circuit is open and not continuing on error
        if (!continueOnError && breaker.isOpen()) {
            break;
        }
    }

    return {
        results,
        successful,
        failed,
        total: items.length,
    };
}
