/**
 * Crypto Module Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    arrayBufferToBase64,
    base64ToArrayBuffer,
    deriveKey,
    generateSalt,
    generateIV,
    calculateChecksum,
    encryptContent,
    decryptContent,
    encryptInline,
    decryptInline,
    calculatePasswordStrength,
    isPasswordValid,
} from '../src/crypto';
import { CRYPTO_CONSTANTS } from '../src/constants';

describe('Key Derivation', () => {
    it('should convert ArrayBuffer to Base64 and back', () => {
        const data = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
        const base64 = arrayBufferToBase64(data.buffer);
        const back = base64ToArrayBuffer(base64);
        expect(new Uint8Array(back)).toEqual(data);
    });

    it('should handle empty ArrayBuffer', () => {
        const data = new Uint8Array([]);
        const base64 = arrayBufferToBase64(data.buffer);
        const back = base64ToArrayBuffer(base64);
        expect(new Uint8Array(back)).toEqual(data);
    });

    it('should generate random salt of correct length', () => {
        const salt = generateSalt();
        expect(salt.length).toBe(CRYPTO_CONSTANTS.SALT_LENGTH);
    });

    it('should generate random IV of correct length', () => {
        const iv = generateIV();
        expect(iv.length).toBe(CRYPTO_CONSTANTS.IV_LENGTH);
    });

    it('should derive a key from password', async () => {
        const salt = generateSalt();
        const key = await deriveKey('test-password', salt);
        expect(key).toBeDefined();
        expect(key.type).toBe('secret');
    });

    it('should calculate consistent checksums', async () => {
        const content = 'test content';
        const checksum1 = await calculateChecksum(content);
        const checksum2 = await calculateChecksum(content);
        expect(checksum1).toBe(checksum2);
        expect(checksum1.length).toBeGreaterThan(0);
    });

    it('should produce different checksums for different content', async () => {
        const checksum1 = await calculateChecksum('content 1');
        const checksum2 = await calculateChecksum('content 2');
        expect(checksum1).not.toBe(checksum2);
    });
});

describe('Content Encryption/Decryption', () => {
    it('should encrypt and decrypt content correctly', async () => {
        const content = 'This is a secret message!';
        const password = 'my-secure-password';

        const encrypted = await encryptContent(content, password);
        expect(encrypted).toContain(CRYPTO_CONSTANTS.ENCRYPTION_HEADER_START);
        expect(encrypted).toContain(CRYPTO_CONSTANTS.ENCRYPTION_HEADER_END);

        const { content: decrypted, integrityValid } = await decryptContent(encrypted, password);
        expect(decrypted).toBe(content);
        expect(integrityValid).toBe(true);
    });

    it('should fail decryption with wrong password', async () => {
        const content = 'Secret message';
        const encrypted = await encryptContent(content, 'correct-password');

        await expect(decryptContent(encrypted, 'wrong-password')).rejects.toThrow();
    });

    it('should throw error for invalid encrypted content format', async () => {
        await expect(decryptContent('invalid content', 'password')).rejects.toThrow(
            'Invalid encrypted content format'
        );
    });

    it('should include checksum when enabled', async () => {
        const content = 'Test content with checksum';
        const encrypted = await encryptContent(content, 'password', undefined, true);
        expect(encrypted).toContain(CRYPTO_CONSTANTS.CHECKSUM_PREFIX);
    });

    it('should not include checksum when disabled', async () => {
        const content = 'Test content without checksum';
        const encrypted = await encryptContent(content, 'password', undefined, false);
        expect(encrypted).not.toContain(CRYPTO_CONSTANTS.CHECKSUM_PREFIX);
    });

    it('should use custom iterations', async () => {
        const content = 'Test content';
        const encrypted = await encryptContent(content, 'password', 100000);
        const { content: decrypted } = await decryptContent(encrypted, 'password', 100000);
        expect(decrypted).toBe(content);
    });
});

describe('Inline Encryption/Decryption', () => {
    it('should encrypt and decrypt inline content', async () => {
        const content = 'Inline secret';
        const password = 'inline-password';

        const encrypted = await encryptInline(content, password);
        expect(encrypted).toContain(CRYPTO_CONSTANTS.INLINE_ENCRYPTION_START);
        expect(encrypted).toContain(CRYPTO_CONSTANTS.INLINE_ENCRYPTION_END);

        const decrypted = await decryptInline(encrypted, password);
        expect(decrypted).toBe(content);
    });

    it('should fail with wrong password', async () => {
        const encrypted = await encryptInline('secret', 'correct');
        await expect(decryptInline(encrypted, 'wrong')).rejects.toThrow();
    });

    it('should throw error for invalid format', async () => {
        await expect(decryptInline('no markers', 'password')).rejects.toThrow(
            'Invalid inline encrypted content format'
        );
    });

    it('should throw error for empty content', async () => {
        const empty = `${CRYPTO_CONSTANTS.INLINE_ENCRYPTION_START}${CRYPTO_CONSTANTS.INLINE_ENCRYPTION_END}`;
        await expect(decryptInline(empty, 'password')).rejects.toThrow('Empty encrypted content');
    });
});

describe('Password Strength', () => {
    it('should rate weak passwords correctly', () => {
        const result = calculatePasswordStrength('abc');
        expect(result.percentage).toBeLessThan(30);
        expect(result.text).toBe('Weak');
    });

    it('should rate strong passwords correctly', () => {
        const result = calculatePasswordStrength('MyStr0ng!Pass123');
        expect(result.percentage).toBeGreaterThanOrEqual(80);
        expect(result.text).toBe('Strong');
    });

    it('should give points for length', () => {
        const short = calculatePasswordStrength('abcdefgh');
        const long = calculatePasswordStrength('abcdefghijklmnop');
        expect(long.percentage).toBeGreaterThan(short.percentage);
    });

    it('should give points for character variety', () => {
        const lettersOnly = calculatePasswordStrength('abcdefgh');
        const mixed = calculatePasswordStrength('Abc123!@#');
        expect(mixed.percentage).toBeGreaterThan(lettersOnly.percentage);
    });

    it('should validate password length correctly', () => {
        expect(isPasswordValid('short', 8)).toBe(false);
        expect(isPasswordValid('longenough', 8)).toBe(true);
        expect(isPasswordValid('exactly8', 8)).toBe(true);
    });
});
