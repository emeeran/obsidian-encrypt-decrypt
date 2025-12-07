/**
 * Basic Tests for Encryption Service
 * Run with: npx ts-node tests/encryption-service.test.ts
 */

// Polyfill for Web Crypto in Node.js
import { webcrypto } from 'crypto';

// Node.js 19+ has crypto globally, but older versions don't
if (typeof globalThis.crypto === 'undefined') {
    Object.defineProperty(globalThis, 'crypto', {
        value: webcrypto,
        writable: false,
        configurable: true
    });
}

import { encrypt, decrypt, validateEncryptedContent } from '../src/typescript/core/encryption-service';

// Simple test framework
interface TestResult {
    name: string;
    passed: boolean;
    error?: string;
    duration: number;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
    const start = performance.now();
    try {
        await fn();
        results.push({ name, passed: true, duration: performance.now() - start });
        console.log(`✅ ${name}`);
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.push({ name, passed: false, error: errorMsg, duration: performance.now() - start });
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
async function runTests() {
    console.log('\n🔐 Encryption Service Tests\n');
    console.log('='.repeat(50));

    // Test 1: Basic encryption/decryption
    await test('Basic encryption and decryption', async () => {
        const plaintext = 'Hello, World!';
        const password = 'test-password-123';
        
        const encrypted = await encrypt(plaintext, password);
        assert(encrypted.success, 'Encryption should succeed');
        assert(encrypted.data.includes('-----BEGIN ENCRYPTED NOTE-----'), 'Should include encryption marker');
        
        const decrypted = await decrypt(encrypted.data, password);
        assert(decrypted.success, 'Decryption should succeed');
        assertEqual(decrypted.data, plaintext, 'Decrypted content should match original');
    });

    // Test 2: Empty content handling
    await test('Empty content returns error', async () => {
        const result = await encrypt('', 'password');
        assert(!result.success, 'Should fail for empty content');
        assert(result.error?.includes('No content'), 'Error should mention empty content');
    });

    // Test 3: Empty password handling
    await test('Empty password returns error', async () => {
        const result = await encrypt('test content', '');
        assert(!result.success, 'Should fail for empty password');
        assert(result.error?.includes('Password'), 'Error should mention password');
    });

    // Test 4: Wrong password fails decryption
    await test('Wrong password fails decryption', async () => {
        const plaintext = 'Secret message';
        const encrypted = await encrypt(plaintext, 'correct-password');
        assert(encrypted.success, 'Encryption should succeed');
        
        const decrypted = await decrypt(encrypted.data, 'wrong-password');
        assert(!decrypted.success, 'Decryption should fail with wrong password');
    });

    // Test 5: Unicode content handling
    await test('Unicode content handling', async () => {
        const plaintext = 'Hello 🌍 世界 مرحبا';
        const password = 'unicode-test';
        
        const encrypted = await encrypt(plaintext, password);
        assert(encrypted.success, 'Encryption should succeed');
        
        const decrypted = await decrypt(encrypted.data, password);
        assert(decrypted.success, 'Decryption should succeed');
        assertEqual(decrypted.data, plaintext, 'Unicode content should be preserved');
    });

    // Test 6: Large content handling
    await test('Large content handling', async () => {
        const plaintext = 'A'.repeat(100000); // 100KB
        const password = 'large-test';
        
        const encrypted = await encrypt(plaintext, password);
        assert(encrypted.success, 'Encryption should succeed');
        
        const decrypted = await decrypt(encrypted.data, password);
        assert(decrypted.success, 'Decryption should succeed');
        assertEqual(decrypted.data.length, plaintext.length, 'Content length should be preserved');
    });

    // Test 7: Content validation
    await test('Content validation', async () => {
        const plaintext = 'Test content';
        const password = 'validation-test';
        
        const encrypted = await encrypt(plaintext, password);
        assert(encrypted.success, 'Encryption should succeed');
        
        const validation = validateEncryptedContent(encrypted.data);
        assert(validation.valid, 'Encrypted content should be valid');
        assert(validation.version !== undefined, 'Version should be present');
    });

    // Test 8: Invalid encrypted content
    await test('Invalid encrypted content detection', async () => {
        const validation = validateEncryptedContent('not encrypted content');
        assert(!validation.valid, 'Should detect invalid content');
    });

    // Test 9: Metrics are returned
    await test('Encryption returns metrics', async () => {
        const encrypted = await encrypt('test', 'password');
        assert(encrypted.success, 'Encryption should succeed');
        assert(encrypted.metrics !== undefined, 'Metrics should be present');
        assert(encrypted.metrics!.encryptionTime > 0, 'Encryption time should be positive');
        assert(encrypted.metrics!.iterations > 0, 'Iterations should be positive');
    });

    // Test 10: Custom iterations
    await test('Custom iterations work', async () => {
        const plaintext = 'Custom iterations test';
        const password = 'iter-test';
        
        const encrypted = await encrypt(plaintext, password, { iterations: 1000 });
        assert(encrypted.success, 'Encryption should succeed');
        assertEqual(encrypted.metrics?.iterations, 1000, 'Custom iterations should be used');
        
        const decrypted = await decrypt(encrypted.data, password);
        assert(decrypted.success, 'Decryption should succeed');
        assertEqual(decrypted.data, plaintext, 'Content should be preserved');
    });

    // Summary
    console.log('\n' + '='.repeat(50));
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
    
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
    console.log(`⏱️  Total time: ${totalTime.toFixed(2)}ms`);
    
    if (failed > 0) {
        console.log('\n❌ Failed tests:');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`   - ${r.name}: ${r.error}`);
        });
        process.exit(1);
    } else {
        console.log('\n✅ All tests passed!');
        process.exit(0);
    }
}

runTests().catch(console.error);
