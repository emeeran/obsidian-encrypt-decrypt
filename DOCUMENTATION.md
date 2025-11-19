# Obsidian Note Encryptor - Enhanced Documentation

## Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Installation](#installation)
4. [User Guide](#user-guide)
5. [Security](#security)
6. [Configuration](#configuration)
7. [Technical Details](#technical-details)
8. [API Reference](#api-reference)
9. [Troubleshooting](#troubleshooting)
10. [Development](#development)
11. [Changelog](#changelog)
12. [Support](#support)

## Overview

Obsidian Note Encryptor is a robust, military-grade encryption plugin for Obsidian that allows users to encrypt individual notes with password protection using AES-256-GCM encryption. Unlike full-vault encryption solutions, this plugin provides granular control, allowing you to encrypt only the notes that contain sensitive information.

### Key Principles
- **Security First**: Uses industry-standard cryptographic algorithms
- **Granular Control**: Encrypt individual notes, not your entire vault
- **User Friendly**: Simple interface with powerful security features
- **No Tracking**: Your data and passwords never leave your device
- **Open Source**: Transparent code that can be audited by anyone

## Features

### 🔒 Security Features
- **AES-256-GCM Encryption**: Military-grade authenticated encryption
- **PBKDF2 Key Derivation**: 100,000 iterations for secure password-based encryption
- **Random Salt & IV**: Unique cryptographic components for each encryption
- **Password Strength Validation**: Enforces strong password policies
- **Memory Security**: Automatic clearing of sensitive data from memory
- **Versioned Encryption**: Forward-compatible encryption format

### 🎨 User Experience
- **Visual Indicators**: Automatic filename prefixes for encrypted notes
- **Multiple Access Methods**: Ribbon icon, command palette, and hotkeys
- **Password Strength Indicator**: Real-time visual feedback during password creation
- **Loading States**: Visual feedback during encryption/decryption operations
- **Confirmation Dialogs**: Optional confirmations to prevent accidental operations
- **Intuitive Interface**: Clean, modern UI that follows Obsidian design patterns

### ⚙️ Configuration Options
- **Customizable Naming**: Configure prefixes and suffixes for encrypted files
- **Security Policies**: Enforce password complexity requirements
- **File Size Limits**: Configurable limits to prevent performance issues
- **User Preferences**: Toggle features based on your workflow needs

## Installation

### Method 1: Community Plugins (Recommended)
1. Open Obsidian Settings (`Ctrl/Cmd + ,`)
2. Go to **Community plugins**
3. Disable **Safe mode**
4. Click **Browse** and search for "Note Encryptor"
5. Click **Install**, then **Enable**

### Method 2: Manual Installation
1. Download the latest release from the [GitHub repository](https://github.com/yourusername/obsidian-note-encryptor)
2. Navigate to your vault's `.obsidian/plugins/` directory
3. Create a new folder named `note-encryptor`
4. Extract the downloaded files into this folder
5. Restart Obsidian
6. Enable the plugin in **Settings → Community plugins**

### Method 3: Build from Source
```bash
# Clone the repository
git clone https://github.com/yourusername/obsidian-note-encryptor.git
cd obsidian-note-encryptor

# Install dependencies
npm install

# Build the plugin
npm run build

# Copy the output files to your plugin directory
cp main.js manifest.json styles.css ~/.obsidian/plugins/note-encryptor/
```

## User Guide

### Encrypting a Note

#### Method 1: Ribbon Icon
1. Open the note you want to encrypt
2. Click the 🔒 lock icon in the ribbon
3. Enter a strong password (minimum 8 characters by default)
4. Confirm your password
5. Click **Encrypt**

#### Method 2: Command Palette
1. Open the note you want to encrypt
2. Open command palette (`Ctrl/Cmd + P`)
3. Search for "Encrypt current note"
4. Select and execute the command
5. Follow the password prompts

#### Method 3: Auto-Detect
1. Open any note
2. Click the ribbon icon or use "Encrypt/Decrypt current note"
3. The plugin automatically detects if the note is encrypted
4. Follow the appropriate prompts

### Decrypting a Note

#### Method 1: Ribbon Icon
1. Open the encrypted note
2. Click the 🔒 lock icon in the ribbon
3. Enter the correct password
4. Click **Decrypt**

#### Method 2: Command Palette
1. Open the encrypted note
2. Open command palette (`Ctrl/Cmd + P`)
3. Search for "Decrypt current note"
4. Select and execute the command
5. Enter the password

### File Naming

When a note is encrypted:
- **Prefix**: Default "🔒 " is added to the filename
- **Original Content**: The note content is replaced with encrypted data
- **Visual Identification**: Encrypted notes are easily identifiable by their prefix

When a note is decrypted:
- **Prefix Removal**: The prefix is automatically removed from the filename
- **Content Restoration**: The original content is restored
- **File Preservation**: The file remains in the same location

### Password Requirements

By default, passwords must:
- Be at least 8 characters long
- Contain uppercase and lowercase letters
- Include at least one number
- Not exceed 1024 characters

These requirements can be configured in the plugin settings.

## Security

### Encryption Algorithm Details

| Component | Algorithm | Parameters |
|-----------|-----------|------------|
| **Encryption** | AES-256-GCM | 256-bit key, 96-bit IV |
| **Key Derivation** | PBKDF2 | 100,000 iterations, SHA-256 |
| **Salt** | Random | 128 bits per encryption |
| **IV** | Random | 96 bits per encryption |

### Security Features

#### Memory Security
- Passwords are never stored persistently
- Sensitive data is cleared from memory after use
- No caching of encryption keys or passwords

#### Data Integrity
- AES-GCM provides authenticated encryption
- Tampering with encrypted data is detected
- Corruption results in decryption failure

#### Forward Compatibility
- Versioned encryption format
- Future algorithm updates are supported
- Backward compatibility maintained

### Security Best Practices

#### Password Management
```
✅ Do:
- Use unique passwords for different notes
- Include numbers, letters, and special characters
- Use password managers for complex passwords
- Test with non-critical data first

❌ Don't:
- Use common words or phrases
- Share passwords with others
- Use the same password for multiple notes
- Store passwords in plaintext files
```

#### Backup Strategy
- Maintain regular backups of important notes
- Test restore procedures periodically
- Consider backing up passwords separately
- Use version control for critical configurations

## Configuration

### Accessing Settings

1. Open Obsidian Settings (`Ctrl/Cmd + ,`)
2. Go to **Community plugins**
3. Find **Note Encryptor** and click **Options**
4. Configure settings as needed

### Settings Categories

#### File Naming
- **Encrypted Note Prefix**: Text added to encrypted filenames (default: "🔒 ")
- **Encrypted Note Suffix**: Optional text added to encrypted filenames

#### Security Settings
- **Require Strong Passwords**: Enforce complexity requirements
- **Minimum Password Length**: Set minimum characters (4-32)
- **Maximum File Size**: Limit encryption to specified size (1-50MB)

#### User Experience
- **Show Password Strength Indicator**: Display visual strength feedback
- **Confirm Before Encryption**: Show confirmation dialog for encryption

### Recommended Configuration

For most users, the default settings provide a good balance of security and usability. Consider these adjustments:

**High Security:**
- Minimum password length: 12 characters
- Require strong passwords: Enabled
- Confirm before encryption: Enabled
- Maximum file size: 5MB

**Convenience Focused:**
- Minimum password length: 8 characters
- Require strong passwords: Disabled
- Confirm before encryption: Disabled
- Show password strength: Enabled

## Technical Details

### File Format

Encrypted notes use this format:

```
-----BEGIN ENCRYPTED NOTE-----
[Base64-encoded encrypted data]
-----END ENCRYPTED NOTE-----
```

The encrypted data contains:
1. **Header**: JSON metadata with version and algorithm information
2. **Null Terminator**: Separates header from binary data
3. **Salt**: Random 128-bit salt
4. **IV**: Random 96-bit initialization vector
5. **Encrypted Data**: AES-GCM encrypted content

### Encryption Process

1. **Input Validation**: File size and password requirements
2. **Key Derivation**: PBKDF2 with random salt
3. **Encryption**: AES-256-GCM with random IV
4. **Formatting**: Base64 encoding with clear markers
5. **File Operation**: Secure file renaming with collision detection

### Decryption Process

1. **Format Validation**: Verify encrypted note format
2. **Header Parsing**: Extract version and algorithm information
3. **Component Extraction**: Parse salt, IV, and encrypted data
4. **Key Derivation**: Recreate encryption key from password
5. **Decryption**: AES-GCM with authentication
6. **File Restoration**: Original filename and content restoration

### Performance Considerations

#### Encryption Speed
- Small notes (< 1KB): < 100ms
- Medium notes (1-100KB): < 500ms
- Large notes (100KB-1MB): < 2s
- Maximum supported size: Configurable (default 10MB)

#### Memory Usage
- Passwords: Cleared from memory immediately after use
- Temporary buffers: Automatically garbage collected
- File operations: Streaming for large files

## API Reference

### Plugin Class: `NoteEncryptorPlugin`

#### Methods

##### `async encryptNote(view: MarkdownView): Promise<void>`
Encrypts the currently active note in the given MarkdownView.

**Parameters:**
- `view`: The MarkdownView containing the note to encrypt

**Example:**
```typescript
const view = app.workspace.getActiveViewOfType(MarkdownView);
if (view) {
    await plugin.encryptNote(view);
}
```

##### `async decryptNote(view: MarkdownView): Promise<void>`
Decrypts the currently active note in the given MarkdownView.

**Parameters:**
- `view`: The MarkdownView containing the note to decrypt

**Example:**
```typescript
const view = app.workspace.getActiveViewOfType(MarkdownView);
if (view) {
    await plugin.decryptNote(view);
}
```

##### `isEncrypted(content: string): boolean`
Checks if the given content is encrypted.

**Parameters:**
- `content`: The text content to check

**Returns:**
- `boolean`: True if content is encrypted, false otherwise

**Example:**
```typescript
const content = view.editor.getValue();
if (plugin.isEncrypted(content)) {
    await plugin.decryptNote(view);
}
```

### Encryption Service: `EncryptionService`

#### Methods

##### `async encrypt(text: string, password: string): Promise<string>`
Encrypts text with the given password.

**Parameters:**
- `text`: Plain text to encrypt
- `password`: Password for encryption

**Returns:**
- `Promise<string>`: Encrypted content in standard format

##### `async decrypt(encryptedText: string, password: string): Promise<string>`
Decrypts encrypted text with the given password.

**Parameters:**
- `encryptedText`: Encrypted content to decrypt
- `password`: Password for decryption

**Returns:**
- `Promise<string>`: Decrypted plain text

### Settings Interface: `NoteEncryptorSettings`

```typescript
interface NoteEncryptorSettings {
    encryptedNotePrefix: string;        // Default: "🔒 "
    encryptedNoteSuffix: string;        // Default: ""
    requireStrongPasswords: boolean;    // Default: true
    showPasswordStrength: boolean;      // Default: true
    confirmOnEncrypt: boolean;          // Default: false
    passwordMinLength: number;          // Default: 8
    maxFileSize: number;                // Default: 10 (MB)
}
```

### Error Classes

#### `EncryptionError`
Thrown for encryption/decryption errors.

```typescript
try {
    await encryptionService.encrypt(text, password);
} catch (error) {
    if (error instanceof EncryptionError) {
        console.error('Encryption failed:', error.message);
        console.error('Cause:', error.cause);
    }
}
```

#### `PasswordError`
Thrown for password-related errors.

```typescript
try {
    await encryptionService.decrypt(encrypted, password);
} catch (error) {
    if (error instanceof PasswordError) {
        new Notice('Password error: ' + error.message);
    }
}
```

#### `ValidationError`
Thrown for validation errors.

```typescript
try {
    validateFileSize(content);
} catch (error) {
    if (error instanceof ValidationError) {
        new Notice('Validation error: ' + error.message);
    }
}
```

## Troubleshooting

### Common Issues

#### "Encryption failed" Error
**Cause:** File exceeds size limit or contains unsupported content
**Solution:**
1. Check file size in settings
2. Reduce file size or increase limit
3. Remove non-text content if present

#### "Decryption failed: Wrong password" Error
**Cause:** Incorrect password or corrupted data
**Solution:**
1. Verify password spelling and case
2. Check for extra spaces or characters
3. If file was manually edited, restore from backup

#### "Note is already encrypted" Message
**Cause:** Attempting to encrypt an already encrypted note
**Solution:**
1. This is normal behavior for encrypted notes
2. Use decrypt function instead if needed

#### File naming conflicts
**Cause:** Encrypted filename already exists
**Solution:**
1. Plugin automatically appends numbers (e.g., "note (1).md")
2. Manual file renaming is also possible

### Performance Issues

#### Slow encryption on large files
**Causes:**
- File size exceeds recommended limits
- System resources are constrained
- Multiple concurrent operations

**Solutions:**
1. Reduce maximum file size in settings
2. Close other resource-intensive applications
3. Encrypt files one at a time

#### Memory usage concerns
**Solutions:**
1. Plugin automatically clears sensitive data
2. Restart Obsidian if memory usage is high
3. Monitor system memory during operations

### Data Recovery

#### Forgotten Passwords
**⚠️ Important:** There is NO way to recover encrypted data without the correct password.

**Prevention:**
- Use password managers
- Keep secure password backups
- Test encryption with non-critical data first

#### Corrupted Files
**Symptoms:**
- Decryption fails with format errors
- File content appears damaged

**Recovery:**
1. Restore from backup if available
2. Check for file system errors
3. Contact support for advanced recovery options

## Development

### Development Setup

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/obsidian-note-encryptor.git
cd obsidian-note-encryptor
```

2. **Install dependencies:**
```bash
npm install
```

3. **Development mode:**
```bash
npm run dev
```
This will rebuild the plugin automatically when files change.

4. **Build for production:**
```bash
npm run build
```

### Project Structure

```
obsidian-note-encryptor/
├── main.ts                 # Main plugin implementation
├── manifest.json          # Plugin manifest
├── package.json           # Dependencies and scripts
├── esbuild.config.mjs     # Build configuration
├── styles.css             # Plugin styles
├── README.md              # Documentation
└── docs/                  # Additional documentation
    ├── API.md             # API reference
    ├── SECURITY.md        # Security details
    └── CONTRIBUTING.md    # Development guidelines
```

### Code Architecture

#### Main Components

1. **Plugin Class (`NoteEncryptorPlugin`)**
   - Obsidian plugin lifecycle management
   - Command and UI registration
   - Settings management

2. **Encryption Service (`EncryptionService`)**
   - Cryptographic operations
   - Format handling
   - Security implementations

3. **UI Components**
   - `EnhancedPasswordModal`: Password input with validation
   - `NoteEncryptorSettingTab`: Settings interface
   - `ConfirmModal`: Confirmation dialogs

#### Design Patterns

- **Service Layer**: Separation of cryptographic operations
- **Error Handling**: Custom error classes with specific types
- **Validation**: Input validation with specific error messages
- **State Management**: Settings persistence and retrieval

### Contributing

#### Development Guidelines

1. **Security First**: All changes must maintain security standards
2. **Testing**: Test encryption/decryption thoroughly
3. **Documentation**: Update documentation for API changes
4. **Style Guide**: Follow TypeScript and Obsidian plugin conventions

#### Pull Request Process

1. Fork the repository
2. Create feature branch from `main`
3. Implement changes with tests
4. Update documentation
5. Submit pull request with detailed description

#### Code Standards

```typescript
// Use proper TypeScript types
function encryptNote(view: MarkdownView): Promise<void>

// Handle errors appropriately
try {
    const result = await encrypt(content, password);
} catch (error) {
    if (error instanceof EncryptionError) {
        // Handle encryption errors
    }
}

// Use custom error classes
throw new PasswordError('Password too weak');
```

### Testing

#### Unit Tests
```bash
npm test
```

#### Integration Tests
Test with various file types and sizes to ensure compatibility.

#### Security Testing
- Validate encryption strength
- Test edge cases and error conditions
- Verify memory cleanup

## Changelog

### Version 2.0.0 (Enhanced Version)
- ✨ **Security Enhancements**:
  - Custom error classes for better error handling
  - Memory security improvements
  - Enhanced input validation and sanitization
  - File size limits to prevent DoS attacks

- ✨ **User Experience**:
  - Password strength indicators
  - Loading states during operations
  - Confirmation dialogs for sensitive operations
  - Improved file naming with collision detection

- ✨ **Architecture**:
  - Separated encryption service
  - Enhanced settings interface
  - Better error handling and user feedback
  - Modular design for maintainability

- 🐛 **Bug Fixes**:
  - Improved handling of large files
  - Better file path sanitization
  - Enhanced compatibility across platforms

### Version 1.0.0 (Original)
- 🎉 Initial release
- ✅ Basic AES-256-GCM encryption
- ✅ PBKDF2 key derivation (100,000 iterations)
- ✅ File naming with prefixes
- ✅ Ribbon icon and command palette integration
- ✅ Basic settings interface

## Support

### Getting Help

1. **Documentation**: Check this documentation first
2. **GitHub Issues**: Report bugs at [GitHub Issues](https://github.com/yourusername/obsidian-note-encryptor/issues)
3. **Community**: Ask questions in the [Obsidian Discord](https://discord.gg/obsidianmd)
4. **Security**: For security concerns, email security@yourdomain.com

### Reporting Issues

When reporting issues, please include:

- **Plugin Version**: Check in Obsidian settings
- **Obsidian Version**: Include app version
- **Operating System**: Windows/macOS/Linux
- **Error Messages**: Full error text if available
- **Steps to Reproduce**: Detailed reproduction steps
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happened

### Feature Requests

Feature requests are welcome! Please:

1. Check existing issues first
2. Describe use case clearly
3. Consider security implications
4. Provide implementation ideas if possible

### Security Reporting

For security vulnerabilities:

1. **Do not** use public issues
2. Email details to security@yourdomain.com
3. Include steps to reproduce
4. Allow reasonable time for response before disclosure

## License

This plugin is licensed under the [MIT License](LICENSE).

### Third-Party Licenses

- **Obsidian API**: Licensed under Obsidian's terms
- **Web Crypto API**: Native browser API
- **TypeScript**: Apache License 2.0

## Acknowledgments

- **Obsidian Team**: For the excellent note-taking platform
- **Security Community**: For cryptography best practices
- **Beta Testers**: For valuable feedback and testing
- **Contributors**: For code improvements and suggestions

---

**Made with ❤️ for the Obsidian community**

Remember: **Your security is important. Always keep backups and use strong, unique passwords!**