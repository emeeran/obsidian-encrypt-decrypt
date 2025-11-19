# API Reference

## Overview

This document provides a comprehensive reference for the Obsidian Note Encryptor plugin API. The plugin is built with TypeScript and provides a clean, type-safe interface for integration with other Obsidian plugins or custom scripts.

## Table of Contents
1. [Main Plugin Class](#main-plugin-class-noteencryptorplugin)
2. [Encryption Service](#encryption-service)
3. [Error Classes](#error-classes)
4. [Settings Interface](#settings-interface)
5. [UI Components](#ui-components)
6. [Utility Functions](#utility-functions)
7. [Type Definitions](#type-definitions)
8. [Examples](#examples)

## Main Plugin Class: `NoteEncryptorPlugin`

The main plugin class handles Obsidian integration and provides the primary interface for encryption operations.

### Constructor

```typescript
class NoteEncryptorPlugin extends Plugin {
    settings: NoteEncryptorSettings;
    private encryptionService: EncryptionService;
    private loadingNotice: Notice | null = null;
}
```

### Public Methods

#### `async encryptNote(view: MarkdownView): Promise<void>`

Encrypts the note currently displayed in the given MarkdownView.

**Parameters:**
- `view` (MarkdownView): The Obsidian MarkdownView containing the note to encrypt

**Throws:**
- `ValidationError`: If the note fails validation (too large, already encrypted)
- `EncryptionError`: If encryption fails
- `PasswordError`: If password validation fails

**Example:**
```typescript
const activeView = app.workspace.getActiveViewOfType(MarkdownView);
if (activeView) {
    try {
        await plugin.encryptNote(activeView);
        new Notice('Note encrypted successfully');
    } catch (error) {
        console.error('Encryption failed:', error);
    }
}
```

#### `async decryptNote(view: MarkdownView): Promise<void>`

Decrypts the note currently displayed in the given MarkdownView.

**Parameters:**
- `view` (MarkdownView): The Obsidian MarkdownView containing the note to decrypt

**Throws:**
- `ValidationError`: If the note is not encrypted or format is invalid
- `EncryptionError`: If decryption fails due to corruption
- `PasswordError`: If password is incorrect

**Example:**
```typescript
const activeView = app.workspace.getActiveViewOfType(MarkdownView);
if (activeView) {
    try {
        await plugin.decryptNote(activeView);
        new Notice('Note decrypted successfully');
    } catch (error) {
        if (error instanceof PasswordError) {
            new Notice('Incorrect password');
        }
    }
}
```

#### `async handleEncryptDecrypt(): Promise<void>`

Automatically detects whether the current note is encrypted and performs the appropriate operation.

**Example:**
```typescript
// Auto-encrypt/decrypt current note
await plugin.handleEncryptDecrypt();
```

#### `isEncrypted(content: string): boolean`

Checks if the given content is in the encrypted note format.

**Parameters:**
- `content` (string): The text content to check

**Returns:**
- `boolean`: `true` if content is encrypted, `false` otherwise

**Example:**
```typescript
const content = view.editor.getValue();
if (plugin.isEncrypted(content)) {
    console.log('This note is encrypted');
    await plugin.decryptNote(view);
} else {
    console.log('This note is not encrypted');
    await plugin.encryptNote(view);
}
```

### Private Methods

These methods are marked private but may be useful for advanced usage or debugging:

#### `validatePassword(password: string): { valid: boolean; reason?: string }`

Validates a password against the current settings.

**Returns:**
- Object with `valid` boolean and optional `reason` string

#### `calculatePasswordStrength(password: string): PasswordStrength`

Calculates password strength with visual feedback metrics.

#### `async withLoading<T>(operation: () => Promise<T>, message: string): Promise<T>`

Wraps an operation with loading indicator.

## Encryption Service: `EncryptionService`

The `EncryptionService` class handles all cryptographic operations and is separated from the main plugin for better security and maintainability.

### Constructor

```typescript
class EncryptionService {
    private readonly ENCRYPTION_VERSION = 1;
    private readonly ITERATIONS = 100000;
    private readonly SALT_LENGTH = 16;
    private readonly IV_LENGTH = 12;
    private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
}
```

### Public Methods

#### `async encrypt(text: string, password: string): Promise<string>`

Encrypts plaintext using AES-256-GCM with PBKDF2 key derivation.

**Parameters:**
- `text` (string): Plain text to encrypt
- `password` (string): Password for encryption

**Returns:**
- `Promise<string>`: Encrypted content in standard format

**Throws:**
- `ValidationError`: If text is too large or password is invalid
- `EncryptionError`: If encryption fails

**Example:**
```typescript
const encryptionService = new EncryptionService();
try {
    const plaintext = "This is a secret message";
    const password = "myStrongPassword123!";
    const encrypted = await encryptionService.encrypt(plaintext, password);
    console.log('Encrypted:', encrypted);
} catch (error) {
    console.error('Encryption failed:', error);
}
```

#### `async decrypt(encryptedText: string, password: string): Promise<string>`

Decrypts encrypted text using AES-256-GCM with PBKDF2 key derivation.

**Parameters:**
- `encryptedText` (string): Encrypted content in standard format
- `password` (string): Password for decryption

**Returns:**
- `Promise<string>`: Decrypted plain text

**Throws:**
- `EncryptionError`: If format is invalid or decryption fails
- `PasswordError`: If password is incorrect

**Example:**
```typescript
const encryptionService = new EncryptionService();
try {
    const decrypted = await encryptionService.decrypt(encrypted, password);
    console.log('Decrypted:', decrypted);
} catch (error) {
    if (error instanceof PasswordError) {
        console.log('Wrong password');
    } else {
        console.error('Decryption failed:', error);
    }
}
```

### Private Methods

#### `async zeroMemory(data: Uint8Array): Promise<void>`

Securely erases sensitive data from memory by overwriting with zeros.

**Parameters:**
- `data` (Uint8Array): Sensitive data to clear

## Error Classes

The plugin provides custom error classes for better error handling and user feedback.

### `EncryptionError`

Thrown for encryption/decryption related errors.

```typescript
class EncryptionError extends Error {
    constructor(message: string, public cause?: Error) {
        super(message);
        this.name = 'EncryptionError';
    }
}
```

**Usage:**
```typescript
try {
    await encryptionService.encrypt(text, password);
} catch (error) {
    if (error instanceof EncryptionError) {
        console.error('Encryption failed:', error.message);
        if (error.cause) {
            console.error('Caused by:', error.cause);
        }
    }
}
```

### `PasswordError`

Thrown for password-related errors.

```typescript
class PasswordError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PasswordError';
    }
}
```

**Usage:**
```typescript
try {
    await encryptionService.decrypt(encrypted, password);
} catch (error) {
    if (error instanceof PasswordError) {
        new Notice('Password error: ' + error.message);
    }
}
```

### `ValidationError`

Thrown for input validation errors.

```typescript
class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}
```

**Usage:**
```typescript
try {
    validateFileSize(content);
} catch (error) {
    if (error instanceof ValidationError) {
        new Notice('Validation error: ' + error.message);
    }
}
```

## Settings Interface: `NoteEncryptorSettings`

Interface defining the plugin's configuration options.

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

### Example Usage

```typescript
// Accessing settings
const settings = plugin.settings;
console.log('Password min length:', settings.passwordMinLength);

// Updating settings
plugin.settings.requireStrongPasswords = false;
await plugin.saveSettings();
```

## UI Components

### `EnhancedPasswordModal`

Enhanced modal for password input with strength indicator and validation.

```typescript
class EnhancedPasswordModal extends Modal {
    password: string;
    onSubmit: (password: string) => void;
    isEncrypting: boolean;
    settings: NoteEncryptorSettings;
    strengthEl: HTMLElement | null = null;
    confirmInput: HTMLInputElement | null = null;
    plugin?: NoteEncryptorPlugin;

    constructor(
        app: App,
        isEncrypting: boolean,
        settings: NoteEncryptorSettings,
        onSubmit: (password: string) => void,
        plugin?: NoteEncryptorPlugin
    );
}
```

### `ConfirmModal`

Simple confirmation modal for sensitive operations.

```typescript
class ConfirmModal extends Modal {
    result: boolean = false;
    onSubmit: (confirmed: boolean) => void;

    constructor(
        app: App,
        title: string,
        message: string,
        onSubmit: (confirmed: boolean) => void
    );
}
```

### `NoteEncryptorSettingTab`

Settings tab component for plugin configuration.

```typescript
class NoteEncryptorSettingTab extends PluginSettingTab {
    plugin: NoteEncryptorPlugin;

    constructor(app: App, plugin: NoteEncryptorPlugin);
    display(): void;
}
```

## Utility Functions

### File Operations

#### `sanitizeFilePath(path: string): string`

Prevents path traversal attacks by sanitizing file paths.

```typescript
private sanitizeFilePath(path: string): string {
    return path.replace(/\.\./g, '').replace(/[\\/]/g, '_');
}
```

#### `async generateUniqueFileName(baseName: string, extension: string): Promise<string>`

Generates unique filename to avoid conflicts.

```typescript
private async generateUniqueFileName(baseName: string, extension: string): Promise<string> {
    let counter = 1;
    let fileName = `${baseName}${extension}`;

    while (await this.app.vault.getAbstractFileByPath(fileName)) {
        fileName = `${baseName} (${counter})${extension}`;
        counter++;
    }

    return fileName;
}
```

### Loading State Management

#### `async withLoading<T>(operation: () => Promise<T>, message: string): Promise<T>`

Wraps operations with loading indicator.

```typescript
private async withLoading<T>(
    operation: () => Promise<T>,
    loadingMessage: string
): Promise<T> {
    this.loadingNotice = new Notice(loadingMessage, 0);
    try {
        const result = await operation();
        return result;
    } finally {
        if (this.loadingNotice) {
            this.loadingNotice.hide();
            this.loadingNotice = null;
        }
    }
}
```

### Confirmation Dialogs

#### `async confirmOperation(title: string, message: string): Promise<boolean>`

Shows confirmation dialog for sensitive operations.

```typescript
private async confirmOperation(
    title: string,
    message: string
): Promise<boolean> {
    return new Promise((resolve) => {
        new ConfirmModal(this.app, title, message, (confirmed) => {
            resolve(confirmed);
        }).open();
    });
}
```

## Type Definitions

### `PasswordStrength`

Interface for password strength calculation results.

```typescript
interface PasswordStrength {
    score: number;       // 0-5
    percentage: number;  // 0-100
    text: string;        // "Very Weak" to "Very Strong"
    color: string;       // Color for UI indication
}
```

### Custom Events

The plugin may emit custom events for integration purposes:

```typescript
// Example of event handling
this.registerEvent(
    this.app.workspace.on('file-open', (file) => {
        if (file && this.isEncrypted(await this.app.vault.read(file))) {
            // Handle encrypted file open
        }
    })
);
```

## Examples

### Basic Usage

```typescript
// Get plugin instance
const plugin = app.plugins.plugins['note-encryptor'];

// Encrypt current note
const view = app.workspace.getActiveViewOfType(MarkdownView);
if (view) {
    await plugin.encryptNote(view);
}

// Check if note is encrypted
const content = view.editor.getValue();
if (plugin.isEncrypted(content)) {
    console.log('Note is encrypted');
}
```

### Custom Encryption

```typescript
// Direct encryption service usage
const encryptionService = new EncryptionService();

// Encrypt custom text
const sensitiveData = "Secret information";
const password = "mySecurePassword123!";
const encrypted = await encryptionService.encrypt(sensitiveData, password);

// Decrypt custom text
const decrypted = await encryptionService.decrypt(encrypted, password);
console.log(decrypted); // "Secret information"
```

### Integration with Other Plugins

```typescript
// Example plugin integration
class MyPlugin extends Plugin {
    async onload() {
        // Get note encryptor plugin
        const encryptorPlugin = this.app.plugins.plugins['note-encryptor'];

        if (encryptorPlugin) {
            // Add custom command
            this.addCommand({
                id: 'auto-encrypt-sensitive',
                name: 'Auto-encrypt sensitive notes',
                callback: () => {
                    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                    if (view) {
                        const content = view.editor.getValue();
                        if (this.containsSensitiveData(content) && !encryptorPlugin.isEncrypted(content)) {
                            encryptorPlugin.encryptNote(view);
                        }
                    }
                }
            });
        }
    }

    private containsSensitiveData(content: string): boolean {
        const sensitiveWords = ['password', 'ssn', 'credit card', 'secret'];
        return sensitiveWords.some(word =>
            content.toLowerCase().includes(word)
        );
    }
}
```

### Advanced Error Handling

```typescript
async function secureEncryption(text: string, password: string): Promise<string> {
    const encryptionService = new EncryptionService();

    try {
        // Validate inputs
        if (!text || !password) {
            throw new ValidationError('Text and password are required');
        }

        // Encrypt
        return await encryptionService.encrypt(text, password);

    } catch (error) {
        if (error instanceof ValidationError) {
            console.error('Validation failed:', error.message);
            throw error;
        } else if (error instanceof EncryptionError) {
            console.error('Encryption failed:', error.message);
            if (error.cause) {
                console.error('Root cause:', error.cause);
            }
            throw new EncryptionError('Unable to encrypt data', error);
        } else {
            console.error('Unexpected error:', error);
            throw new EncryptionError('Unexpected encryption error', error);
        }
    }
}
```

### Batch Operations

```typescript
async function encryptMultipleFiles(files: TFile[], password: string): Promise<void> {
    const plugin = app.plugins.plugins['note-encryptor'] as NoteEncryptorPlugin;
    const results = { success: 0, failed: 0, skipped: 0 };

    for (const file of files) {
        try {
            const content = await app.vault.read(file);

            // Skip if already encrypted
            if (plugin.isEncrypted(content)) {
                results.skipped++;
                continue;
            }

            // Encrypt and update file
            const encrypted = await plugin['encryptionService'].encrypt(content, password);
            await app.vault.modify(file, encrypted);

            // Update filename
            const newName = `🔒 ${file.basename}.md`;
            const newPath = file.parent ? `${file.parent.path}/${newName}` : newName;
            await app.fileManager.renameFile(file, newPath);

            results.success++;

        } catch (error) {
            console.error(`Failed to encrypt ${file.path}:`, error);
            results.failed++;
        }
    }

    new Notice(`Batch encryption complete: ${results.success} successful, ${results.failed} failed, ${results.skipped} skipped`);
}
```

## Best Practices

### Security Considerations

1. **Never store passwords**: Use secure password management practices
2. **Clear memory**: The plugin automatically handles memory zeroization
3. **Validate inputs**: Always validate file sizes and content before encryption
4. **Handle errors**: Use proper error handling to avoid information leakage

### Performance Considerations

1. **File size limits**: Configure appropriate limits for your use case
2. **Batch operations**: Process files sequentially to avoid memory issues
3. **Loading indicators**: Use the built-in loading state management for user feedback

### Integration Tips

1. **Check plugin availability**: Always verify the plugin is loaded before use
2. **Handle version compatibility**: Check for API version compatibility
3. **Respect user settings**: Use plugin settings rather than hardcoded values

---

This API reference provides comprehensive documentation for integrating with the Obsidian Note Encryptor plugin. For additional support or questions, please refer to the main documentation or open an issue on GitHub.