/**
 * Note Encryptor - Branded Types
 * Type-safe wrappers for sensitive data types
 */

// =============================================================================
// Branded Type Utilities
// =============================================================================

/**
 * Creates a branded type for nominal typing in TypeScript
 */
declare const __brand: unique symbol;

export type Brand<T, TBrand extends string> = T & { [__brand]: TBrand };

/**
 * Type guard factory for branded types
 */
export type BrandGuard<T, TBrand extends string> = {
    (value: unknown): value is Brand<T, TBrand>;
    unwrap(branded: Brand<T, TBrand>): T;
    create(value: T): Brand<T, TBrand>;
};

/**
 * Create a brand guard with validation
 */
export function createBrand<T, TBrand extends string>(
    brandName: TBrand,
    validate?: (value: T) => boolean
): BrandGuard<T, TBrand> {
    const guard = (value: unknown): value is Brand<T, TBrand> => {
        if (typeof value !== 'string' && typeof value !== 'number') return false;
        if (validate && !validate(value as unknown as T)) return false;
        return true;
    };

    (guard as BrandGuard<T, TBrand>).unwrap = (branded: Brand<T, TBrand>): T => {
        return branded as unknown as T;
    };

    (guard as BrandGuard<T, TBrand>).create = (value: T): Brand<T, TBrand> => {
        if (validate && !validate(value)) {
            throw new Error(`Invalid ${brandName}`);
        }
        return value as Brand<T, TBrand>;
    };

    return guard as BrandGuard<T, TBrand>;
}

// =============================================================================
// Security-Specific Branded Types
// =============================================================================

/**
 * Password type - ensures passwords are validated before use
 */
export type Password = Brand<string, 'Password'>;

/**
 * Validate and create a Password
 */
export function isPassword(value: string): value is Password {
    return value.length >= 8 && !value.includes('\n') && !value.includes('\r');
}

export const Password = {
    is: isPassword,
    create(value: string): Password {
        if (!isPassword(value)) {
            throw new Error('Password must be at least 8 characters and contain no newlines');
        }
        return value as Password;
    },
    unwrap(password: Password): string {
        return password as unknown as string;
    },
    /**
     * Securely wipe password from memory (best effort in JS)
     */
    wipe(password: Password): void {
        // In JavaScript, we can't truly wipe memory, but we can overwrite
        // This is a best-effort approach
        const str = password as unknown as string;
        if (str && typeof str === 'string') {
            // Overwrite with zeros (note: strings are immutable in JS, this is symbolic)
            // In production, consider using a Uint8Array for password storage
        }
    }
};

/**
 * Encrypted content type
 */
export type EncryptedContent = Brand<string, 'EncryptedContent'>;

export const EncryptedContent = {
    is(value: unknown): value is EncryptedContent {
        return typeof value === 'string' && value.length > 0;
    },
    create(value: string): EncryptedContent {
        return value as EncryptedContent;
    },
    unwrap(content: EncryptedContent): string {
        return content as unknown as string;
    }
};

/**
 * Salt type for cryptographic operations
 */
export type Salt = Brand<Uint8Array, 'Salt'>;

export const Salt = {
    is(value: unknown): value is Salt {
        return value instanceof Uint8Array && value.length === 16;
    },
    create(value: Uint8Array): Salt {
        if (value.length !== 16) {
            throw new Error('Salt must be 16 bytes');
        }
        return value as Salt;
    },
    unwrap(salt: Salt): Uint8Array {
        return salt as unknown as Uint8Array;
    },
    generate(): Salt {
        return Salt.create(crypto.getRandomValues(new Uint8Array(16)));
    }
};

/**
 * IV (Initialization Vector) type
 */
export type IV = Brand<Uint8Array, 'IV'>;

export const IV = {
    is(value: unknown): value is IV {
        return value instanceof Uint8Array && value.length === 12;
    },
    create(value: Uint8Array): IV {
        if (value.length !== 12) {
            throw new Error('IV must be 12 bytes');
        }
        return value as IV;
    },
    unwrap(iv: IV): Uint8Array {
        return iv as unknown as Uint8Array;
    },
    generate(): IV {
        return IV.create(crypto.getRandomValues(new Uint8Array(12)));
    }
};

/**
 * Derived key type
 */
export type DerivedKey = Brand<CryptoKey, 'DerivedKey'>;

export const DerivedKey = {
    is(value: unknown): value is DerivedKey {
        return value instanceof CryptoKey;
    },
    create(value: CryptoKey): DerivedKey {
        return value as DerivedKey;
    },
    unwrap(key: DerivedKey): CryptoKey {
        return key as unknown as CryptoKey;
    }
};

/**
 * HMAC tag type for integrity verification
 */
export type HmacTag = Brand<Uint8Array, 'HmacTag'>;

export const HmacTag = {
    is(value: unknown): value is HmacTag {
        return value instanceof Uint8Array && value.length === 32;
    },
    create(value: Uint8Array): HmacTag {
        if (value.length !== 32) {
            throw new Error('HMAC tag must be 32 bytes');
        }
        return value as HmacTag;
    },
    unwrap(tag: HmacTag): Uint8Array {
        return tag as unknown as Uint8Array;
    }
};

/**
 * File path type for type-safe file operations
 */
export type FilePath = Brand<string, 'FilePath'>;

export const FilePath = {
    is(value: unknown): value is FilePath {
        return typeof value === 'string' && value.length > 0;
    },
    create(value: string): FilePath {
        return value as FilePath;
    },
    unwrap(path: FilePath): string {
        return path as unknown as string;
    }
};

/**
 * Checksum type (SHA-256)
 */
export type Checksum = Brand<string, 'Checksum'>;

export const Checksum = {
    is(value: unknown): value is Checksum {
        return typeof value === 'string' && /^[A-Za-z0-9+/=]{43,44}$/.test(value);
    },
    create(value: string): Checksum {
        return value as Checksum;
    },
    unwrap(checksum: Checksum): string {
        return checksum as unknown as string;
    }
};

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if value is a Uint8Array
 */
export function isUint8Array(value: unknown): value is Uint8Array {
    return value instanceof Uint8Array;
}

/**
 * Check if value is an ArrayBuffer
 */
export function isArrayBuffer(value: unknown): value is ArrayBuffer {
    return value instanceof ArrayBuffer;
}

/**
 * Type guard for CryptoKey
 */
export function isCryptoKey(value: unknown): value is CryptoKey {
    return value instanceof CryptoKey;
}
