/**
 * Tests for Password Utilities
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS","moduleResolution":"node"}' tests/password-utils.test.ts
 */

import { 
    validatePassword, 
    calculatePasswordStrength, 
    generateStrongPassword,
    debounce
} from '../src/typescript/utils/password-utils';

// Simple test framework
interface TestResult {
    name: string;
    passed: boolean;
    error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void): void {
    try {
        fn();
        results.push({ name, passed: true });
        console.log(`✅ ${name}`);
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.push({ name, passed: false, error: errorMsg });
        console.log(`❌ ${name}: ${errorMsg}`);
    }
}

function assert(condition: boolean | undefined, message: string): void {
    if (!condition) {
        throw new Error(message);
    }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
}

// Tests
function runTests() {
    console.log('\n🔐 Password Utils Tests\n');
    console.log('='.repeat(50));

    // Password Validation Tests
    test('validatePassword: rejects empty password', () => {
        const result = validatePassword('', { minLength: 8 });
        assert(!result.valid, 'Should be invalid');
        assert(result.reason !== undefined, 'Should have a reason');
    });

    test('validatePassword: rejects short password', () => {
        const result = validatePassword('abc', { minLength: 8 });
        assert(!result.valid, 'Should be invalid');
        assert(result.reason?.includes('8'), 'Should mention length');
    });

    test('validatePassword: accepts valid password', () => {
        const result = validatePassword('SecurePass123!', { minLength: 8 });
        assert(result.valid, 'Should be valid');
        assertEqual(result.reason, undefined, 'Should have no reason');
    });

    test('validatePassword: enforces strong password requirements', () => {
        const result = validatePassword('lowercase', { 
            minLength: 8, 
            requireStrong: true 
        });
        assert(!result.valid, 'Should be invalid for weak password');
    });

    test('validatePassword: accepts strong password', () => {
        const result = validatePassword('SecureP@ss123!', { 
            minLength: 8, 
            requireStrong: true 
        });
        assert(result.valid, 'Should be valid for strong password');
    });

    test('validatePassword: rejects password over max length', () => {
        const longPassword = 'A'.repeat(200);
        const result = validatePassword(longPassword, { maxLength: 128 });
        assert(!result.valid, 'Should be invalid');
        assert(result.reason?.toLowerCase().includes('long'), 'Should mention too long');
    });

    // Password Strength Tests
    test('calculatePasswordStrength: weak password has low score', () => {
        const result = calculatePasswordStrength('abc');
        assert(result.score < 50, 'Score should be low for weak password');
        assert(result.text !== undefined, 'Should have text description');
    });

    test('calculatePasswordStrength: longer password has higher score', () => {
        const weak = calculatePasswordStrength('abc');
        const stronger = calculatePasswordStrength('Password123');
        assert(stronger.score > weak.score, 'Longer password should have higher score');
    });

    test('calculatePasswordStrength: complex password has good score', () => {
        const result = calculatePasswordStrength('Abc123!@#xyz');
        assert(result.score > 50, 'Score should be reasonable for complex password');
    });

    test('calculatePasswordStrength: returns percentage', () => {
        const result = calculatePasswordStrength('Password123!');
        assert(result.percentage >= 0 && result.percentage <= 100, 'Percentage should be 0-100');
    });

    test('calculatePasswordStrength: returns color', () => {
        const result = calculatePasswordStrength('Password123!');
        assert(result.color !== undefined, 'Should return a color');
        assert(result.color.length > 0, 'Color should not be empty');
    });

    // Password Generation Tests
    test('generateStrongPassword: generates password of correct length', () => {
        const password = generateStrongPassword(16);
        assertEqual(password.length, 16, 'Length should match');
    });

    test('generateStrongPassword: generates different passwords', () => {
        const p1 = generateStrongPassword(20);
        const p2 = generateStrongPassword(20);
        assert(p1 !== p2, 'Should generate different passwords');
    });

    test('generateStrongPassword: generated passwords are valid', () => {
        const password = generateStrongPassword(16);
        const validation = validatePassword(password, { minLength: 8 });
        assert(validation.valid, 'Generated password should be valid');
    });

    test('generateStrongPassword: default length works', () => {
        const password = generateStrongPassword();
        assert(password.length > 0, 'Should generate a password');
    });

    // Debounce Tests
    test('debounce: returns a function', () => {
        const debounced = debounce(() => {}, 10);
        assert(typeof debounced === 'function', 'Should return a function');
    });

    test('debounce: function can be called', () => {
        let callCount = 0;
        const debounced = debounce(() => { callCount++; }, 1);
        debounced();
        // Just verify it doesn't throw - async testing would require a proper framework
    });

    // Summary
    console.log('\n' + '='.repeat(50));
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

    if (failed > 0) {
        console.log('\n❌ Failed tests:');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`   - ${r.name}: ${r.error}`);
        });
        process.exit(1);
    } else {
        console.log('\n✅ All tests passed!');
    }
}

runTests();
