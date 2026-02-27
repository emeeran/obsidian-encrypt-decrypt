/**
 * Note Encryptor - Metadata Utilities
 * YAML frontmatter extraction and preservation
 */

import type { FrontmatterExtraction } from '../types';

/**
 * Extract YAML frontmatter from content
 * @param content - Full file content
 * @returns Object with frontmatter (if exists) and body
 */
export function extractFrontmatter(content: string): FrontmatterExtraction {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;

    const match = content.match(frontmatterRegex);

    if (!match) {
        return { frontmatter: null, body: content };
    }

    const frontmatter = match[0];
    const body = content.slice(match[0].length);

    return { frontmatter, body };
}

/**
 * Re-insert frontmatter before body content
 * @param body - Main content body
 * @param frontmatter - YAML frontmatter (including --- delimiters) or null
 * @returns Combined content
 */
export function reinsertFrontmatter(body: string, frontmatter: string | null): string {
    if (!frontmatter) {
        return body;
    }

    // Ensure frontmatter ends with newline
    const normalizedFrontmatter = frontmatter.endsWith('\n')
        ? frontmatter
        : frontmatter + '\n';

    return normalizedFrontmatter + body;
}

/**
 * Check if content has YAML frontmatter
 * @param content - Content to check
 * @returns true if frontmatter exists
 */
export function hasFrontmatter(content: string): boolean {
    return /^---\s*\n[\s\S]*?\n---\s*\n/.test(content);
}

/**
 * Parse frontmatter into an object (simple key-value parsing)
 * @param frontmatter - Raw frontmatter string with delimiters
 * @returns Parsed key-value object
 */
export function parseFrontmatter(frontmatter: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    // Remove delimiters
    const content = frontmatter
        .replace(/^---\s*\n/, '')
        .replace(/\n---\s*\n?$/, '');

    const lines = content.split('\n');

    for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) continue;

        const key = line.slice(0, colonIndex).trim();
        let value: unknown = line.slice(colonIndex + 1).trim();

        // Parse simple values
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        else if (value === 'null') value = null;
        else if (/^\d+$/.test(value as string)) value = parseInt(value as string, 10);
        else if (/^\d+\.\d+$/.test(value as string)) value = parseFloat(value as string);
        else if (/^["'](.*)["']$/.test(value as string)) {
            value = (value as string).slice(1, -1);
        }

        result[key] = value;
    }

    return result;
}

/**
 * Create frontmatter string from object
 * @param data - Key-value object
 * @returns Formatted frontmatter string with delimiters
 */
export function createFrontmatter(data: Record<string, unknown>): string {
    const entries = Object.entries(data)
        .map(([key, value]) => {
            if (typeof value === 'string') {
                // Quote strings that contain special characters
                if (/[:\n\r#{ }[\],&*?|<>=!'"`]|\s$|^\s/.test(value)) {
                    return `${key}: "${value.replace(/"/g, '\\"')}"`;
                }
                return `${key}: ${value}`;
            }
            if (value === null) return `${key}: null`;
            if (typeof value === 'boolean') return `${key}: ${value}`;
            if (typeof value === 'number') return `${key}: ${value}`;
            return `${key}: ${JSON.stringify(value)}`;
        })
        .join('\n');

    return `---\n${entries}\n---\n`;
}

/**
 * Add or update a frontmatter field
 * @param content - Full file content
 * @param key - Field key
 * @param value - Field value
 * @returns Updated content
 */
export function setFrontmatterField(
    content: string,
    key: string,
    value: unknown
): string {
    const { frontmatter, body } = extractFrontmatter(content);

    let data: Record<string, unknown>;
    if (frontmatter) {
        data = parseFrontmatter(frontmatter);
    } else {
        data = {};
    }

    data[key] = value;

    const newFrontmatter = createFrontmatter(data);
    return reinsertFrontmatter(body, newFrontmatter);
}

/**
 * Remove a frontmatter field
 * @param content - Full file content
 * @param key - Field key to remove
 * @returns Updated content
 */
export function removeFrontmatterField(content: string, key: string): string {
    const { frontmatter, body } = extractFrontmatter(content);

    if (!frontmatter) {
        return content;
    }

    const data = parseFrontmatter(frontmatter);
    delete data[key];

    // If no fields left, remove frontmatter entirely
    if (Object.keys(data).length === 0) {
        return body;
    }

    const newFrontmatter = createFrontmatter(data);
    return reinsertFrontmatter(body, newFrontmatter);
}
