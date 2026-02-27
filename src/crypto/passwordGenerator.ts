/**
 * Note Encryptor - Password Generator
 * Secure password generation with configurable options
 */

import { calculatePasswordStrength } from './passwordStrength';

// =============================================================================
// Password Generator Types
// =============================================================================

export interface PasswordGeneratorOptions {
    length: number;
    includeUppercase: boolean;
    includeLowercase: boolean;
    includeNumbers: boolean;
    includeSymbols: boolean;
    excludeAmbiguous: boolean;
    excludeSimilar: boolean;
    customSymbols?: string;
    minLength?: number;
    maxLength?: number;
}

export interface PasswordGeneratorPreset {
    name: string;
    description: string;
    options: PasswordGeneratorOptions;
}

export interface GeneratedPasswordResult {
    password: string;
    strength: {
        score: number;
        percentage: number;
        text: string;
        color: string;
    };
    entropy: number;
    charset: string;
}

// =============================================================================
// Character Sets
// =============================================================================

const CHARSETS = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    ambiguous: '0O1lI|', // Characters that look similar
    similar: 'iIlL1oO0', // Similar looking characters
};

const DEFAULT_SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

// =============================================================================
// Default Options
// =============================================================================

export const DEFAULT_PASSWORD_OPTIONS: PasswordGeneratorOptions = {
    length: 20,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeAmbiguous: false,
    excludeSimilar: false,
    minLength: 8,
    maxLength: 128,
};

// =============================================================================
// Presets
// =============================================================================

export const PASSWORD_PRESETS: Record<string, PasswordGeneratorPreset> = {
    balanced: {
        name: 'Balanced',
        description: 'Good balance of security and memorability',
        options: {
            length: 16,
            includeUppercase: true,
            includeLowercase: true,
            includeNumbers: true,
            includeSymbols: false,
            excludeAmbiguous: false,
            excludeSimilar: true,
        },
    },
    secure: {
        name: 'Secure',
        description: 'High security with all character types',
        options: {
            length: 24,
            includeUppercase: true,
            includeLowercase: true,
            includeNumbers: true,
            includeSymbols: true,
            excludeAmbiguous: true,
            excludeSimilar: true,
        },
    },
    memorable: {
        name: 'Memorable',
        description: 'Easier to type and remember',
        options: {
            length: 20,
            includeUppercase: true,
            includeLowercase: true,
            includeNumbers: true,
            includeSymbols: false,
            excludeAmbiguous: true,
            excludeSimilar: true,
        },
    },
    paranoid: {
        name: 'Paranoid',
        description: 'Maximum security, hard to type',
        options: {
            length: 32,
            includeUppercase: true,
            includeLowercase: true,
            includeNumbers: true,
            includeSymbols: true,
            excludeAmbiguous: false,
            excludeSimilar: false,
        },
    },
    pin: {
        name: 'PIN',
        description: 'Numbers only, for quick access',
        options: {
            length: 6,
            includeUppercase: false,
            includeLowercase: false,
            includeNumbers: true,
            includeSymbols: false,
            excludeAmbiguous: false,
            excludeSimilar: false,
        },
    },
};

// =============================================================================
// Password Generator Class
// =============================================================================

/**
 * Secure password generator using Web Crypto API
 */
export class PasswordGenerator {
    private options: PasswordGeneratorOptions;

    constructor(options: Partial<PasswordGeneratorOptions> = {}) {
        this.options = { ...DEFAULT_PASSWORD_OPTIONS, ...options };
    }

    /**
     * Generate a secure random password
     */
    generate(options: Partial<PasswordGeneratorOptions> = {}): GeneratedPasswordResult {
        const opts = { ...this.options, ...options };

        // Validate length
        const length = Math.min(Math.max(opts.length, opts.minLength ?? 8), opts.maxLength ?? 128);

        // Build character set
        let charset = this.buildCharset(opts);

        if (charset.length === 0) {
            charset = CHARSETS.lowercase + CHARSETS.numbers;
        }

        // Generate password
        let password = '';
        const requiredChars = this.getRequiredChars(opts);

        // Ensure at least one of each required character type
        password = requiredChars.join('');

        // Fill remaining length with random characters
        const remainingLength = length - password.length;
        for (let i = 0; i < remainingLength; i++) {
            password += this.getRandomChar(charset);
        }

        // Shuffle the password
        password = this.shuffleString(password);

        // Calculate strength and entropy
        const strength = calculatePasswordStrength(password);
        const entropy = this.calculateEntropy(password.length, charset.length);

        return {
            password,
            strength,
            entropy,
            charset,
        };
    }

    /**
     * Generate multiple passwords
     */
    generateMultiple(
        count: number,
        options: Partial<PasswordGeneratorOptions> = {}
    ): GeneratedPasswordResult[] {
        return Array.from({ length: count }, () => this.generate(options));
    }

    /**
     * Generate password from preset
     */
    generateFromPreset(presetName: keyof typeof PASSWORD_PRESETS): GeneratedPasswordResult {
        const preset = PASSWORD_PRESETS[presetName];
        if (!preset) {
            throw new Error(`Unknown preset: ${presetName}`);
        }
        return this.generate(preset.options);
    }

    /**
     * Build the character set based on options
     */
    private buildCharset(opts: PasswordGeneratorOptions): string {
        let charset = '';

        if (opts.includeUppercase) {
            charset += CHARSETS.uppercase;
        }

        if (opts.includeLowercase) {
            charset += CHARSETS.lowercase;
        }

        if (opts.includeNumbers) {
            charset += CHARSETS.numbers;
        }

        if (opts.includeSymbols) {
            charset += opts.customSymbols || DEFAULT_SYMBOLS;
        }

        // Exclude ambiguous characters
        if (opts.excludeAmbiguous) {
            charset = this.removeChars(charset, CHARSETS.ambiguous);
        }

        // Exclude similar characters
        if (opts.excludeSimilar) {
            charset = this.removeChars(charset, CHARSETS.similar);
        }

        return charset;
    }

    /**
     * Get required characters for each enabled type
     */
    private getRequiredChars(opts: PasswordGeneratorOptions): string[] {
        const required: string[] = [];

        if (opts.includeUppercase) {
            let chars = CHARSETS.uppercase;
            if (opts.excludeAmbiguous || opts.excludeSimilar) {
                chars = this.removeChars(chars, CHARSETS.ambiguous + CHARSETS.similar);
            }
            if (chars.length > 0) {
                required.push(this.getRandomChar(chars));
            }
        }

        if (opts.includeLowercase) {
            let chars = CHARSETS.lowercase;
            if (opts.excludeAmbiguous || opts.excludeSimilar) {
                chars = this.removeChars(chars, CHARSETS.ambiguous + CHARSETS.similar);
            }
            if (chars.length > 0) {
                required.push(this.getRandomChar(chars));
            }
        }

        if (opts.includeNumbers) {
            let chars = CHARSETS.numbers;
            if (opts.excludeAmbiguous || opts.excludeSimilar) {
                chars = this.removeChars(chars, CHARSETS.ambiguous + CHARSETS.similar);
            }
            if (chars.length > 0) {
                required.push(this.getRandomChar(chars));
            }
        }

        if (opts.includeSymbols) {
            const chars = opts.customSymbols || DEFAULT_SYMBOLS;
            required.push(this.getRandomChar(chars));
        }

        return required;
    }

    /**
     * Get a random character from charset using Web Crypto API
     */
    private getRandomChar(charset: string): string {
        const randomValues = new Uint32Array(1);
        crypto.getRandomValues(randomValues);
        const index = randomValues[0] % charset.length;
        return charset[index];
    }

    /**
     * Shuffle a string using Fisher-Yates algorithm
     */
    private shuffleString(str: string): string {
        const arr = str.split('');
        const randomValues = new Uint32Array(arr.length);
        crypto.getRandomValues(randomValues);

        for (let i = arr.length - 1; i > 0; i--) {
            const j = randomValues[i] % (i + 1);
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }

        return arr.join('');
    }

    /**
     * Remove characters from a string
     */
    private removeChars(str: string, charsToRemove: string): string {
        const toRemove = new Set(charsToRemove.split(''));
        return str.split('').filter(c => !toRemove.has(c)).join('');
    }

    /**
     * Calculate password entropy
     */
    private calculateEntropy(length: number, charsetSize: number): number {
        return Math.floor(length * Math.log2(charsetSize));
    }

    /**
     * Update generator options
     */
    setOptions(options: Partial<PasswordGeneratorOptions>): void {
        this.options = { ...this.options, ...options };
    }

    /**
     * Get current options
     */
    getOptions(): Readonly<PasswordGeneratorOptions> {
        return { ...this.options };
    }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Generate a secure password with default options
 */
export function generatePassword(options?: Partial<PasswordGeneratorOptions>): string {
    const generator = new PasswordGenerator(options);
    return generator.generate().password;
}

/**
 * Generate a secure password with full result
 */
export function generatePasswordWithResult(
    options?: Partial<PasswordGeneratorOptions>
): GeneratedPasswordResult {
    const generator = new PasswordGenerator(options);
    return generator.generate();
}

/**
 * Generate a password from a preset
 */
export function generatePasswordFromPreset(
    preset: keyof typeof PASSWORD_PRESETS
): GeneratedPasswordResult {
    const generator = new PasswordGenerator();
    return generator.generateFromPreset(preset);
}

/**
 * Generate a passphrase (multiple random words)
 */
export function generatePassphrase(wordCount: number = 4, separator: string = '-'): string {
    // Word list for passphrase generation (subset of EFF's long wordlist)
    const words = [
        'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
        'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
        'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
        'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance',
        'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
        'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album',
        'alcohol', 'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone',
        'alpha', 'already', 'also', 'alter', 'always', 'amateur', 'amazing', 'among',
        'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger', 'angle', 'angry',
        'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique',
        'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april',
        'arch', 'arctic', 'area', 'arena', 'argue', 'arm', 'armed', 'armor',
        'army', 'around', 'arrange', 'arrest', 'arrive', 'arrow', 'art', 'artefact',
    ];

    const randomValues = new Uint32Array(wordCount);
    crypto.getRandomValues(randomValues);

    const selectedWords = Array.from(randomValues, v => words[v % words.length]);
    return selectedWords.join(separator);
}

// =============================================================================
// Password Analysis
// =============================================================================

/**
 * Analyze a password and return detailed information
 */
export function analyzePassword(password: string): {
    length: number;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumbers: boolean;
    hasSymbols: boolean;
    uniqueChars: number;
    entropy: number;
    crackTime: string;
    strength: ReturnType<typeof calculatePasswordStrength>;
} {
    const length = password.length;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSymbols = /[^a-zA-Z0-9]/.test(password);

    let charsetSize = 0;
    if (hasUppercase) charsetSize += 26;
    if (hasLowercase) charsetSize += 26;
    if (hasNumbers) charsetSize += 10;
    if (hasSymbols) charsetSize += 32;

    const uniqueChars = new Set(password.split('')).size;
    const entropy = Math.floor(length * Math.log2(charsetSize || 1));
    const strength = calculatePasswordStrength(password);
    const crackTime = estimateCrackTime(entropy);

    return {
        length,
        hasUppercase,
        hasLowercase,
        hasNumbers,
        hasSymbols,
        uniqueChars,
        entropy,
        crackTime,
        strength,
    };
}

/**
 * Estimate crack time based on entropy
 */
function estimateCrackTime(entropy: number): string {
    // Assuming 10 billion guesses per second (modern hardware)
    const guessesPerSecond = 10e9;
    const combinations = Math.pow(2, entropy);
    const seconds = combinations / guessesPerSecond / 2; // Average case

    if (seconds < 1) return 'Instant';
    if (seconds < 60) return `${Math.round(seconds)} seconds`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
    if (seconds < 31536000) return `${Math.round(seconds / 86400)} days`;
    if (seconds < 31536000 * 100) return `${Math.round(seconds / 31536000)} years`;
    if (seconds < 31536000 * 1000000) return `${Math.round(seconds / 31536000 / 1000)} thousand years`;
    if (seconds < 31536000 * 1000000000) return `${Math.round(seconds / 31536000 / 1000000)} million years`;
    return 'Billions of years';
}
