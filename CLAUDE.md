# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Obsidian plugin that provides individual note and directory encryption using AES-256-GCM with PBKDF2 key derivation (310,000 iterations). The plugin allows users to encrypt specific notes or entire directories with passwords while keeping the rest of their vault accessible.

## Development Commands

```bash
# Install dependencies
npm install

# Development mode with auto-rebuild on file changes
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Lint code
npm run lint

# Type checking
tsc -noEmit -skipLibCheck

# Version bumping
npm run version
```

## Architecture

### Directory Structure
```
├── main.ts                          # Main plugin entry point
├── src/
│   └── typescript/
│       ├── core/                    # Core functionality
│       │   ├── constants.ts         # Centralized crypto constants
│       │   └── encryption-service.ts # Core encryption service
│       ├── utils/                   # Utility functions
│       │   ├── crypto-utils.ts      # Low-level crypto operations
│       │   ├── encryption-utils.ts  # Encryption content helpers
│       │   ├── file-utils.ts        # File operations (Obsidian)
│       │   └── password-utils.ts    # Password validation/strength
│       ├── ui/                      # UI components
│       │   ├── modals/
│       │   │   ├── confirm-modal.ts # Reusable confirmation modal
│       │   │   └── password-modal.ts # Password input modal
│       │   ├── directory-modal.ts   # Directory encryption modal
│       │   ├── settings-tab.ts      # Settings tab component
│       │   └── style-manager.ts     # Centralized style injection
│       ├── features/
│       │   └── directory-encryption.ts # Directory encryption feature
│       ├── enhanced-encryption.ts   # Enhanced encryption with WASM
│       ├── hardware-security.ts     # WebAuthn/FIDO2 support
│       ├── hardware-security-ui.ts  # Hardware security UI
│       ├── post-quantum.ts          # Post-quantum crypto (experimental)
│       ├── post-quantum-ui.ts       # Post-quantum UI
│       ├── error-recovery.ts        # Error recovery system
│       ├── error-recovery-ui.ts     # Error recovery UI
│       ├── ai-features.ts           # AI security features
│       ├── ai-features-ui.ts        # AI features UI
│       ├── batch-operations.ts      # Batch encryption operations
│       ├── batch-ui.ts              # Batch operations UI
│       └── wasm-wrapper.ts          # WebAssembly crypto wrapper
├── tests/
│   └── encryption-service.test.ts   # Encryption service tests
└── manifest.json                    # Plugin manifest
```

### Key Components

**Plugin Class (`NoteEncryptorPlugin`)** in `main.ts`
- Main plugin lifecycle management in `onload()`
- Commands: encrypt, decrypt, toggle, directory encrypt/decrypt
- Ribbon icons for quick access
- Lazy loading of heavy modules (PostQuantum, AI features)

**Core Encryption Service** in `src/typescript/core/encryption-service.ts`
- Single source of truth for AES-256-GCM encryption
- Supports v1 (legacy) and v2 (with metadata) formats
- Returns operation metrics (timing, algorithm, iterations)
- Functions: `encrypt()`, `decrypt()`, `reEncrypt()`, `validateEncryptedContent()`

**Constants** in `src/typescript/core/constants.ts`
- `CRYPTO_CONSTANTS`: PBKDF2_ITERATIONS (310,000), SALT_LENGTH (32), IV_LENGTH (12)
- `PASSWORD_CONSTANTS`: Minimum length, strength thresholds
- `UI_CONSTANTS`: Modal settings
- `DIRECTORY_CONSTANTS`: Parallel operations, manifest settings

**Directory Encryption** in `src/typescript/features/directory-encryption.ts`
- Encrypt/decrypt all files in a directory
- Parallel processing with configurable concurrency
- Optional manifest file tracking
- Subdirectory support

**Password Modal** in `src/typescript/ui/modals/password-modal.ts`
- Password strength indicator with visual feedback
- Configurable validation rules
- Memory clearing on close for security

### Encryption Details
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Derivation**: PBKDF2 with SHA-256, 310,000 iterations
- **Salt**: 256-bit (32 bytes) random per encryption
- **IV**: 96-bit (12 bytes) random per encryption
- **Format v2**: Includes JSON metadata (version, algorithm, iterations, timestamp)
- **Format v1**: Base64: salt (16 bytes) + iv (12 bytes) + ciphertext

### Security Features
- No password storage or caching
- Password memory zeroing after use
- Secure random generation via Web Crypto API
- Hardware security key support (WebAuthn/FIDO2)
- Experimental post-quantum algorithms

## Build System

Uses esbuild for bundling with CommonJS output format targeting ES2018. External dependencies include Obsidian API and CodeMirror modules. TypeScript strict mode is enabled.

## Testing

Tests use ts-node with a simple custom test framework. Run with `npm run test`. Tests cover:
- Encryption/decryption round-trip
- Empty content/password handling
- Wrong password detection
- Unicode and large content
- V1/V2 format compatibility