# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Obsidian plugin that provides individual note encryption using AES-256-GCM with PBKDF2 key derivation (100,000 iterations). The plugin allows users to encrypt specific notes with passwords while keeping the rest of their vault accessible.

## Development Commands

```bash
# Install dependencies
npm install

# Development mode with auto-rebuild on file changes
npm run dev

# Build for production
npm run build

# Type checking
tsc -noEmit -skipLibCheck

# Version bumping
npm run version
```

## Architecture

### Core Files Structure
- `main.ts` - Main plugin implementation with all encryption logic and UI components
- `manifest.json` - Plugin manifest for Obsidian
- `package.json` - Node.js dependencies and build scripts
- `esbuild.config.mjs` - Build configuration using esbuild

### Key Components

**Plugin Class (`NoteEncryptorPlugin`)**
- Main plugin lifecycle management in `onload()`
- Three command registration: encrypt, decrypt, and encrypt/decrypt toggle
- Ribbon icon for quick access
- Settings management via `PluginSettingTab`

**Encryption System**
- Uses Web Crypto API with AES-256-GCM encryption
- PBKDF2 key derivation with 100,000 iterations and SHA-256
- Random 128-bit salt and 96-bit IV for each encryption
- Encrypted format: `-----BEGIN ENCRYPTED NOTE-----\n[base64-data]\n-----END ENCRYPTED NOTE-----`
- Base64 data structure: salt (16 bytes) + iv (12 bytes) + encrypted data

**Password Modal (`PasswordModal`)**
- Handles password input for both encryption and decryption
- Password confirmation for encryption (minimum 8 characters)
- Different UI flows for encrypt vs decrypt operations

**Settings Tab (`NoteEncryptorSettingTab`)**
- Configurable encrypted note prefix (default: "🔒 ")
- Optional encrypted note suffix
- Security information display

### File Management
The plugin automatically renames files when encrypting/decrypting:
- Encryption: Adds prefix to filename (e.g., "My Note.md" → "🔒 My Note.md")
- Decryption: Removes prefix from filename
- Uses Obsidian's `fileManager.renameFile()` for safe file operations

### Security Implementation Details
- No password storage or caching
- Uses native Web Crypto API for cryptographic operations
- Each encryption operation generates unique salt and IV
- Proper error handling for wrong passwords and corrupted data
- Military-grade AES-256-GCM with authenticated encryption

## Build System

Uses esbuild for bundling with CommonJS output format targeting ES2018. External dependencies include Obsidian API and CodeMirror modules. The build process creates a single `main.js` file that can be loaded by Obsidian.