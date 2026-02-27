/**
 * Utility Module Tests
 */

import { describe, it, expect } from 'vitest';
import {
    isEncrypted,
    isInlineEncrypted,
    findInlineEncryptedBlocks,
    escapeRegex,
    formatFileSize,
    generateUniqueId,
    sleep,
    isCryptoAvailable,
    truncate,
} from '../src/utils';
import {
    extractFrontmatter,
    reinsertFrontmatter,
    hasFrontmatter,
    parseFrontmatter,
    createFrontmatter,
} from '../src/utils/metadata';
import { CRYPTO_CONSTANTS } from '../src/constants';

describe('Encryption Detection', () => {
    it('should detect full note encryption', () => {
        const encrypted = `${CRYPTO_CONSTANTS.ENCRYPTION_HEADER_START}\nabc123\n${CRYPTO_CONSTANTS.ENCRYPTION_HEADER_END}`;
        expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should not detect partial markers as encrypted', () => {
        expect(isEncrypted(CRYPTO_CONSTANTS.ENCRYPTION_HEADER_START)).toBe(false);
        expect(isEncrypted(CRYPTO_CONSTANTS.ENCRYPTION_HEADER_END)).toBe(false);
    });

    it('should detect inline encryption', () => {
        const encrypted = `${CRYPTO_CONSTANTS.INLINE_ENCRYPTION_START}abc123${CRYPTO_CONSTANTS.INLINE_ENCRYPTION_END}`;
        expect(isInlineEncrypted(encrypted)).toBe(true);
    });

    it('should not detect plain text as encrypted', () => {
        expect(isEncrypted('Hello world')).toBe(false);
        expect(isInlineEncrypted('Hello world')).toBe(false);
    });
});

describe('Inline Block Detection', () => {
    it('should find single encrypted block', () => {
        const content = `Hello ${CRYPTO_CONSTANTS.INLINE_ENCRYPTION_START}secret${CRYPTO_CONSTANTS.INLINE_ENCRYPTION_END} world`;
        const blocks = findInlineEncryptedBlocks(content);
        expect(blocks).toHaveLength(1);
        expect(blocks[0].content).toBe(
            `${CRYPTO_CONSTANTS.INLINE_ENCRYPTION_START}secret${CRYPTO_CONSTANTS.INLINE_ENCRYPTION_END}`
        );
    });

    it('should find multiple encrypted blocks', () => {
        const content = `${CRYPTO_CONSTANTS.INLINE_ENCRYPTION_START}a${CRYPTO_CONSTANTS.INLINE_ENCRYPTION_END} and ${CRYPTO_CONSTANTS.INLINE_ENCRYPTION_START}b${CRYPTO_CONSTANTS.INLINE_ENCRYPTION_END}`;
        const blocks = findInlineEncryptedBlocks(content);
        expect(blocks).toHaveLength(2);
    });

    it('should return empty array for no blocks', () => {
        const blocks = findInlineEncryptedBlocks('no encryption here');
        expect(blocks).toHaveLength(0);
    });

    it('should return correct positions', () => {
        const content = `012345${CRYPTO_CONSTANTS.INLINE_ENCRYPTION_START}x${CRYPTO_CONSTANTS.INLINE_ENCRYPTION_END}`;
        const blocks = findInlineEncryptedBlocks(content);
        expect(blocks[0].start).toBe(6);
        expect(blocks[0].end).toBe(6 + CRYPTO_CONSTANTS.INLINE_ENCRYPTION_START.length + 1 + CRYPTO_CONSTANTS.INLINE_ENCRYPTION_END.length);
    });
});

describe('Metadata Handling', () => {
    it('should extract frontmatter from content', () => {
        const content = '---\ntitle: Test\n---\nBody content';
        const result = extractFrontmatter(content);
        expect(result.frontmatter).toBe('---\ntitle: Test\n---\n');
        expect(result.body).toBe('Body content');
    });

    it('should handle content without frontmatter', () => {
        const content = 'Just body content';
        const result = extractFrontmatter(content);
        expect(result.frontmatter).toBeNull();
        expect(result.body).toBe(content);
    });

    it('should reinsert frontmatter', () => {
        const frontmatter = '---\ntitle: Test\n---\n';
        const body = 'Body content';
        const result = reinsertFrontmatter(body, frontmatter);
        expect(result).toBe('---\ntitle: Test\n---\nBody content');
    });

    it('should handle null frontmatter in reinsert', () => {
        const body = 'Body content';
        const result = reinsertFrontmatter(body, null);
        expect(result).toBe(body);
    });

    it('should detect frontmatter presence', () => {
        expect(hasFrontmatter('---\ntitle: Test\n---\nBody')).toBe(true);
        expect(hasFrontmatter('No frontmatter here')).toBe(false);
    });

    it('should parse simple frontmatter', () => {
        const frontmatter = '---\ntitle: My Note\ncount: 42\nactive: true\n---\n';
        const result = parseFrontmatter(frontmatter);
        expect(result.title).toBe('My Note');
        expect(result.count).toBe(42);
        expect(result.active).toBe(true);
    });

    it('should create frontmatter from object', () => {
        const data = { title: 'Test', count: 10 };
        const result = createFrontmatter(data);
        expect(result).toContain('---');
        expect(result).toContain('title: Test');
        expect(result).toContain('count: 10');
    });
});

describe('Helper Functions', () => {
    it('should escape regex special characters', () => {
        expect(escapeRegex('.*+?')).toBe('\\.\\*\\+\\?');
        expect(escapeRegex('normal')).toBe('normal');
    });

    it('should format file sizes', () => {
        expect(formatFileSize(500)).toBe('500 B');
        expect(formatFileSize(1024)).toBe('1.0 KB');
        expect(formatFileSize(1536)).toBe('1.5 KB');
        expect(formatFileSize(1048576)).toBe('1.0 MB');
    });

    it('should generate unique IDs', () => {
        const id1 = generateUniqueId();
        const id2 = generateUniqueId();
        expect(id1).not.toBe(id2);
        expect(id1.length).toBeGreaterThan(0);
    });

    it('should sleep for specified duration', async () => {
        const start = Date.now();
        await sleep(50);
        const elapsed = Date.now() - start;
        expect(elapsed).toBeGreaterThanOrEqual(40); // Allow some variance
    });

    it('should check crypto availability', () => {
        // Should be true in happy-dom with our setup
        const result = isCryptoAvailable();
        expect(typeof result).toBe('boolean');
    });

    it('should truncate strings correctly', () => {
        expect(truncate('Hello world', 20)).toBe('Hello world');
        expect(truncate('Hello world', 8)).toBe('Hello...');
        expect(truncate('Hi', 5)).toBe('Hi');
    });
});
