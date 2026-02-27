/**
 * Note Encryptor - Rate Limiter
 * Prevents brute-force password attacks
 */

import type { RateLimiterOptions, RateLimitState } from '../types';
import { RATE_LIMIT_CONSTANTS } from '../constants';

/**
 * Rate Limiter class for password attempt limiting
 */
export class RateLimiter {
    private attempts: Map<string, RateLimitState>;
    private maxAttempts: number;
    private lockoutDurationMs: number;

    constructor(options?: Partial<RateLimiterOptions>) {
        this.attempts = new Map();
        this.maxAttempts = options?.maxAttempts ?? RATE_LIMIT_CONSTANTS.DEFAULT_MAX_ATTEMPTS;
        this.lockoutDurationMs = options?.lockoutDurationMs ?? RATE_LIMIT_CONSTANTS.DEFAULT_LOCKOUT_MS;
    }

    /**
     * Check if an attempt is allowed for the given identifier
     * @param identifier - Unique identifier (e.g., file path or 'global')
     * @returns Object with allowed status and wait time if locked out
     */
    checkAttempt(identifier: string): { allowed: boolean; waitTimeMs: number; remainingAttempts: number } {
        const now = Date.now();
        const state = this.attempts.get(identifier);

        // No previous attempts
        if (!state) {
            return { allowed: true, waitTimeMs: 0, remainingAttempts: this.maxAttempts };
        }

        // Check if locked out
        if (state.lockedUntil && state.lockedUntil > now) {
            const waitTimeMs = state.lockedUntil - now;
            return { allowed: false, waitTimeMs, remainingAttempts: 0 };
        }

        // Lockout expired, reset counter
        if (state.lockedUntil && state.lockedUntil <= now) {
            this.attempts.delete(identifier);
            return { allowed: true, waitTimeMs: 0, remainingAttempts: this.maxAttempts };
        }

        // Check attempt count
        const remainingAttempts = Math.max(0, this.maxAttempts - state.count);
        return { allowed: remainingAttempts > 0, waitTimeMs: 0, remainingAttempts };
    }

    /**
     * Record a failed attempt
     * @param identifier - Unique identifier
     */
    recordAttempt(identifier: string): void {
        const now = Date.now();
        const state = this.attempts.get(identifier);

        if (!state) {
            this.attempts.set(identifier, { count: 1, lastAttempt: now });
            return;
        }

        // Reset if lockout has expired
        if (state.lockedUntil && state.lockedUntil <= now) {
            this.attempts.set(identifier, { count: 1, lastAttempt: now });
            return;
        }

        const newCount = state.count + 1;
        const newState: RateLimitState = {
            count: newCount,
            lastAttempt: now,
        };

        // Lock out if max attempts reached
        if (newCount >= this.maxAttempts) {
            newState.lockedUntil = now + this.lockoutDurationMs;
        }

        this.attempts.set(identifier, newState);
    }

    /**
     * Reset the attempt counter for an identifier (on successful decryption)
     * @param identifier - Unique identifier
     */
    reset(identifier: string): void {
        this.attempts.delete(identifier);
    }

    /**
     * Reset all attempt counters
     */
    resetAll(): void {
        this.attempts.clear();
    }

    /**
     * Get the lockout end time for an identifier
     * @param identifier - Unique identifier
     * @returns Lockout end timestamp or null if not locked
     */
    getLockoutEndTime(identifier: string): number | null {
        const state = this.attempts.get(identifier);
        if (!state || !state.lockedUntil) return null;
        return state.lockedUntil > Date.now() ? state.lockedUntil : null;
    }

    /**
     * Format wait time for display
     * @param waitTimeMs - Wait time in milliseconds
     * @returns Human-readable string
     */
    static formatWaitTime(waitTimeMs: number): string {
        if (waitTimeMs < 1000) return 'less than a second';
        if (waitTimeMs < 60000) {
            const seconds = Math.ceil(waitTimeMs / 1000);
            return `${seconds} second${seconds !== 1 ? 's' : ''}`;
        }
        const minutes = Math.ceil(waitTimeMs / 60000);
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
}
