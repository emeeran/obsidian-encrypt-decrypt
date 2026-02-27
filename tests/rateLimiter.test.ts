/**
 * Rate Limiter Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter } from '../src/security/rateLimiter';
import { RATE_LIMIT_CONSTANTS } from '../src/constants';

describe('RateLimiter', () => {
    let limiter: RateLimiter;

    beforeEach(() => {
        limiter = new RateLimiter({
            maxAttempts: 3,
            lockoutDurationMs: 1000, // 1 second for testing
        });
    });

    it('should allow initial attempts', () => {
        const result = limiter.checkAttempt('test-id');
        expect(result.allowed).toBe(true);
        expect(result.remainingAttempts).toBe(3);
        expect(result.waitTimeMs).toBe(0);
    });

    it('should count down remaining attempts', () => {
        limiter.recordAttempt('test-id');
        const result = limiter.checkAttempt('test-id');
        expect(result.remainingAttempts).toBe(2);
    });

    it('should lock out after max attempts', () => {
        limiter.recordAttempt('test-id');
        limiter.recordAttempt('test-id');
        limiter.recordAttempt('test-id');

        const result = limiter.checkAttempt('test-id');
        expect(result.allowed).toBe(false);
        expect(result.waitTimeMs).toBeGreaterThan(0);
    });

    it('should reset after successful attempt', () => {
        limiter.recordAttempt('test-id');
        limiter.recordAttempt('test-id');
        limiter.reset('test-id');

        const result = limiter.checkAttempt('test-id');
        expect(result.allowed).toBe(true);
        expect(result.remainingAttempts).toBe(3);
    });

    it('should track different identifiers separately', () => {
        limiter.recordAttempt('id-1');
        limiter.recordAttempt('id-1');

        const result1 = limiter.checkAttempt('id-1');
        const result2 = limiter.checkAttempt('id-2');

        expect(result1.remainingAttempts).toBe(1);
        expect(result2.remainingAttempts).toBe(3);
    });

    it('should reset all attempts', () => {
        limiter.recordAttempt('id-1');
        limiter.recordAttempt('id-2');
        limiter.resetAll();

        expect(limiter.checkAttempt('id-1').remainingAttempts).toBe(3);
        expect(limiter.checkAttempt('id-2').remainingAttempts).toBe(3);
    });

    it('should format wait time correctly', () => {
        expect(RateLimiter.formatWaitTime(500)).toBe('less than a second');
        expect(RateLimiter.formatWaitTime(1000)).toBe('1 second');
        expect(RateLimiter.formatWaitTime(2000)).toBe('2 seconds');
        expect(RateLimiter.formatWaitTime(60000)).toBe('1 minute');
        expect(RateLimiter.formatWaitTime(120000)).toBe('2 minutes');
    });

    it('should use default options', () => {
        const defaultLimiter = new RateLimiter();
        const result = defaultLimiter.checkAttempt('test');
        expect(result.remainingAttempts).toBe(RATE_LIMIT_CONSTANTS.DEFAULT_MAX_ATTEMPTS);
    });

    it('should return null lockout end time when not locked', () => {
        const endTime = limiter.getLockoutEndTime('test-id');
        expect(endTime).toBeNull();
    });

    it('should return lockout end time when locked', () => {
        limiter.recordAttempt('test-id');
        limiter.recordAttempt('test-id');
        limiter.recordAttempt('test-id');

        const endTime = limiter.getLockoutEndTime('test-id');
        expect(endTime).not.toBeNull();
        expect(endTime).toBeGreaterThan(Date.now());
    });
});
