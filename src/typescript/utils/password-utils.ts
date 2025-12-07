/**
 * Password Utility Functions
 * Centralized password validation, strength calculation, and generation
 */

import { PASSWORD_CONSTANTS, CRYPTO_CONSTANTS } from '../core/constants';
import { generateSecureRandomString } from './crypto-utils';

/**
 * Password strength result interface
 */
export interface PasswordStrength {
    score: number;
    percentage: number;
    text: string;
    color: string;
}

/**
 * Password validation result interface
 */
export interface PasswordValidation {
    valid: boolean;
    reason?: string;
    suggestions?: string[];
}

/**
 * Validate a password against security requirements
 */
export function validatePassword(
    password: string,
    options: {
        minLength?: number;
        maxLength?: number;
        requireStrong?: boolean;
    } = {}
): PasswordValidation {
    const {
        minLength = PASSWORD_CONSTANTS.MIN_LENGTH_DEFAULT,
        maxLength = PASSWORD_CONSTANTS.MAX_LENGTH,
        requireStrong = false
    } = options;

    const suggestions: string[] = [];

    // Check if password exists
    if (!password) {
        return {
            valid: false,
            reason: 'Password is required',
            suggestions: ['Enter a password']
        };
    }

    // Check minimum length
    if (password.length < minLength) {
        return {
            valid: false,
            reason: `Password must be at least ${minLength} characters`,
            suggestions: [`Add ${minLength - password.length} more characters`]
        };
    }

    // Check maximum length
    if (password.length > maxLength) {
        return {
            valid: false,
            reason: `Password too long (max ${maxLength} characters)`,
            suggestions: ['Shorten your password']
        };
    }

    // Check strength requirements if enabled
    if (requireStrong) {
        const { PATTERNS } = PASSWORD_CONSTANTS;

        if (!PATTERNS.LOWERCASE.test(password)) {
            suggestions.push('Add lowercase letters');
        }
        if (!PATTERNS.UPPERCASE.test(password)) {
            suggestions.push('Add uppercase letters');
        }
        if (!PATTERNS.DIGITS.test(password)) {
            suggestions.push('Add numbers');
        }

        const hasLower = PATTERNS.LOWERCASE.test(password);
        const hasUpper = PATTERNS.UPPERCASE.test(password);
        const hasDigit = PATTERNS.DIGITS.test(password);

        if (!hasLower || !hasUpper || !hasDigit) {
            return {
                valid: false,
                reason: 'Password should contain uppercase, lowercase, and numbers',
                suggestions
            };
        }
    }

    return { valid: true };
}

/**
 * Calculate password strength score
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
    if (!password) {
        return {
            score: 0,
            percentage: 0,
            text: 'Very Weak',
            color: '#ff4444'
        };
    }

    let score = 0;
    const { PATTERNS } = PASSWORD_CONSTANTS;

    // Length scoring
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;

    // Character variety scoring
    if (PATTERNS.LOWERCASE.test(password)) score++;
    if (PATTERNS.UPPERCASE.test(password)) score++;
    if (PATTERNS.DIGITS.test(password)) score++;
    if (PATTERNS.SPECIAL.test(password)) score++;

    // Penalties for weak patterns
    if (PATTERNS.SEQUENTIAL.test(password)) score = Math.max(0, score - 2);
    if (PATTERNS.REPEATED.test(password)) score = Math.max(0, score - 2);

    // Check for common patterns
    if (containsCommonWord(password)) score = Math.max(0, score - 1);

    // Normalize score to 0-5 range
    const normalizedScore = Math.min(Math.floor(score * 5 / 7), 5);

    const strengthLevel = PASSWORD_CONSTANTS.STRENGTH_LEVELS[normalizedScore];

    return {
        score: strengthLevel.score,
        percentage: strengthLevel.percentage,
        text: strengthLevel.text,
        color: strengthLevel.color
    };
}

/**
 * Calculate password entropy
 */
export function calculateEntropy(password: string): number {
    if (!password) return 0;

    const charsetSize = getCharsetSize(password);
    return password.length * Math.log2(charsetSize);
}

/**
 * Estimate time to crack password
 */
export function estimateCrackTime(entropy: number): string {
    if (entropy < 30) return 'Instant';
    if (entropy < 40) return 'Minutes';
    if (entropy < 50) return 'Hours';
    if (entropy < 60) return 'Days';
    if (entropy < 70) return 'Years';
    if (entropy < 80) return 'Centuries';
    return 'Millennia+';
}

/**
 * Get the character set size based on characters used
 */
function getCharsetSize(password: string): number {
    let size = 0;
    const { PATTERNS } = PASSWORD_CONSTANTS;

    if (PATTERNS.LOWERCASE.test(password)) size += 26;
    if (PATTERNS.UPPERCASE.test(password)) size += 26;
    if (PATTERNS.DIGITS.test(password)) size += 10;
    if (PATTERNS.SPECIAL.test(password)) size += 32;

    return size || 1; // Minimum 1 to avoid log(0)
}

/**
 * Check if password contains common dictionary words
 */
function containsCommonWord(password: string): boolean {
    const commonWords = [
        'password', 'admin', 'user', 'login', 'welcome', 'qwerty',
        'letmein', 'monkey', 'dragon', 'master', 'sunshine', 'princess',
        'football', 'baseball', 'iloveyou', 'trustno1', 'shadow'
    ];

    const lowerPassword = password.toLowerCase();
    return commonWords.some(word => lowerPassword.includes(word));
}

/**
 * Check if password is in known breached list
 * This is a local check with common breached passwords
 */
export function isKnownBreachedPassword(password: string): boolean {
    const breachedPasswords = new Set([
        '123456', 'password', '123456789', '12345678', '12345',
        '1234567', '1234567890', '1234', 'qwerty', 'abc123',
        '111111', 'password123', 'admin', 'letmein', 'welcome',
        'monkey', 'password1', 'sunshine', 'princess', '000000'
    ]);

    return breachedPasswords.has(password.toLowerCase());
}

/**
 * Generate a strong password
 */
export function generateStrongPassword(
    length: number = 16,
    options: {
        includeUppercase?: boolean;
        includeLowercase?: boolean;
        includeNumbers?: boolean;
        includeSymbols?: boolean;
    } = {}
): string {
    const {
        includeUppercase = true,
        includeLowercase = true,
        includeNumbers = true,
        includeSymbols = true
    } = options;

    let charset = '';
    if (includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeNumbers) charset += '0123456789';
    if (includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!charset) {
        charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    }

    return generateSecureRandomString(length, charset);
}

/**
 * Generate a memorable passphrase
 */
export function generateMemorablePassphrase(wordCount: number = 4): string {
    const words = [
        // Adjectives
        'Blue', 'Green', 'Red', 'Golden', 'Silver', 'Bright', 'Dark', 'Swift',
        'Calm', 'Bold', 'Wise', 'Kind', 'Strong', 'Gentle', 'Fierce', 'Quick',
        // Nouns
        'Ocean', 'Mountain', 'Forest', 'River', 'Thunder', 'Crystal', 'Phoenix',
        'Dragon', 'Eagle', 'Tiger', 'Wolf', 'Falcon', 'Storm', 'Shadow', 'Star',
        'Moon', 'Sun', 'Cloud', 'Wind', 'Fire', 'Stone', 'Arrow', 'Shield'
    ];

    const selectedWords: string[] = [];
    const randomValues = crypto.getRandomValues(new Uint32Array(wordCount));

    for (let i = 0; i < wordCount; i++) {
        selectedWords.push(words[randomValues[i] % words.length]);
    }

    // Add a random number and symbol for extra security
    const numberValues = crypto.getRandomValues(new Uint32Array(2));
    const number = (numberValues[0] % 900) + 100; // 100-999
    const symbols = '!@#$%&*';
    const symbol = symbols[numberValues[1] % symbols.length];

    return selectedWords.join('') + number + symbol;
}

/**
 * Get password requirements as display text
 */
export function getPasswordRequirements(
    minLength: number = PASSWORD_CONSTANTS.MIN_LENGTH_DEFAULT,
    requireStrong: boolean = false
): string[] {
    const requirements: string[] = [
        `At least ${minLength} characters`
    ];

    if (requireStrong) {
        requirements.push('Contains uppercase letters (A-Z)');
        requirements.push('Contains lowercase letters (a-z)');
        requirements.push('Contains numbers (0-9)');
    }

    requirements.push(`Maximum ${CRYPTO_CONSTANTS.MAX_PASSWORD_LENGTH} characters`);

    return requirements;
}

/**
 * Debounce function for password strength updates
 */
export function debounce<T extends (...args: unknown[]) => void>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return function (this: unknown, ...args: Parameters<T>) {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
