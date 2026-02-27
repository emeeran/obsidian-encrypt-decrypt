/**
 * Note Encryptor - Password Strength Calculator
 * Evaluates password strength with multiple criteria
 */

import type { PasswordStrength } from '../types';

/**
 * Calculate password strength based on multiple criteria
 * @param password - Password to evaluate
 * @returns PasswordStrength object with score, percentage, text, and color
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
    let score = 0;

    // Length criteria
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 15;
    if (password.length >= 16) score += 15;

    // Character type criteria
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^a-zA-Z0-9]/.test(password)) score += 20;

    // Variety bonus
    const characterTypes = [
        /[a-z]/,
        /[A-Z]/,
        /[0-9]/,
        /[^a-zA-Z0-9]/,
    ].filter((regex) => regex.test(password)).length;

    if (characterTypes >= 3) score += 10;
    if (characterTypes === 4) score += 10;

    const percentage = Math.min(100, score);

    let text: string;
    let color: string;

    if (percentage < 30) {
        text = 'Weak';
        color = '#dc3545'; // Red
    } else if (percentage < 60) {
        text = 'Fair';
        color = '#ffc107'; // Yellow
    } else if (percentage < 80) {
        text = 'Good';
        color = '#28a745'; // Green
    } else {
        text = 'Strong';
        color = '#20c997'; // Teal
    }

    return { score, percentage, text, color };
}

/**
 * Check if password meets minimum requirements
 * @param password - Password to check
 * @param minLength - Minimum length required
 * @returns true if password meets requirements
 */
export function isPasswordValid(password: string, minLength: number): boolean {
    return password.length >= minLength;
}

/**
 * Get password requirements description
 * @param minLength - Minimum length required
 * @returns Human-readable requirements string
 */
export function getPasswordRequirements(minLength: number): string {
    return `Password must be at least ${minLength} characters. ` +
        `Use a mix of uppercase, lowercase, numbers, and symbols for better security.`;
}
