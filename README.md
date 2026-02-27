# Note Encryptor

A secure Obsidian plugin for encrypting notes and text with AES-256-GCM encryption.

![Obsidian Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%23483699&label=downloads&query=%24%5B%22note-encryptor%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json)
![Version](https://img.shields.io/badge/version-2.1.0-blue)

## What's New in v2.1

### New Features
- **Password Generator** - Generate strong passwords with presets (Fast, Standard, Paranoid, PIN)
- **Encrypted Backups** - Create and restore encrypted backups of all your encrypted notes
- **HMAC Integrity** - Optional stronger integrity verification (replaces simple checksums)
- **Web Worker Support** - Non-blocking encryption for large files
- **Key Caching** - Faster repeat operations with configurable TTL

### Security Enhancements
- Timing-safe comparison to prevent timing attacks
- Secure memory wiping utilities
- Circuit breaker pattern for batch operations

### UI Improvements
- Compact settings with collapsible drawers
- Password generator modal with entropy display
- Backup/restore modals
- Accessibility mode and high contrast support

---

## Features

### Full Note Encryption
- Encrypt entire notes with a password
- Encrypted notes display a lock screen overlay
- Automatic filename prefix (🔒) for easy identification
- Preserve YAML frontmatter option

### Inline Text Encryption
- Encrypt selected text within a note
- Keep sensitive information hidden while the rest remains readable
- Encrypted text appears as: `🔐«...»🔐`

### Batch Folder Encryption
- Encrypt or decrypt all notes in a folder at once
- Recursive processing includes subfolders
- Progress tracking with detailed results
- Circuit breaker stops on repeated failures

### Encrypted Backups (New)
- Bundle all encrypted notes into a single encrypted backup file
- Restore from backup with password verification
- Includes vault metadata and integrity checks

### Password Generator (New)
- Multiple presets: Fast, Standard, Paranoid, PIN, Passphrase
- Configurable character sets (uppercase, lowercase, numbers, symbols)
- Entropy calculation and crack time estimation
- One-click copy and use

### Strong Security
- **AES-256-GCM** encryption algorithm
- **PBKDF2-SHA256** key derivation (configurable iterations: 100K-500K)
- Unique random salt and IV for each encryption
- Optional HMAC integrity verification
- Rate limiting to prevent brute-force attacks
- Timing-safe password comparison

### User Experience
- Password strength indicator with crack time estimate
- Right-click context menu integration
- Command palette support with keyboard shortcuts
- Visual lock screen for encrypted notes
- Compact settings UI with collapsible sections

---

## Installation

### From Community Plugins (Recommended)

1. Open **Settings** → **Community Plugins**
2. Disable **Safe Mode**
3. Click **Browse** and search for "**Note Encryptor**"
4. Click **Install**, then **Enable**

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/emeeran/obsidian-encrypt-decrypt/releases)
2. Create folder: `<vault>/.obsidian/plugins/note-encryptor/`
3. Copy the downloaded files into the folder
4. Reload Obsidian and enable the plugin in Settings → Community Plugins

---

## Usage

### Quick Reference

| Action | Shortcut |
|--------|----------|
| Encrypt note | `Ctrl+Shift+E` |
| Decrypt note | `Ctrl+Shift+D` |
| Toggle encryption | `Ctrl+Shift+T` |

### Encrypt a Note

| Method | Steps |
|--------|-------|
| **Keyboard** | `Ctrl+Shift+E` |
| **Right-click** | Right-click note → "🔐 Encrypt note" |
| **Command** | `Ctrl+P` → "Encrypt current note" |

### Decrypt a Note

| Method | Steps |
|--------|-------|
| **Keyboard** | `Ctrl+Shift+D` |
| **Right-click** | Right-click encrypted note → "🔓 Decrypt note" |
| **Lock Screen** | Click "Decrypt to view" button |

### Inline Text Encryption

**Encrypt:**
1. Select text → Right-click → "🔐 Encrypt selection"
2. Enter password (use generator for strong passwords)

**View (popup):**
- Cursor on encrypted text → `Ctrl+P` → "Decrypt at cursor (view)"

**Decrypt in place:**
- Cursor on encrypted text → `Ctrl+P` → "Decrypt at cursor (replace)"

### Folder Encryption

| Method | Steps |
|--------|-------|
| **Right-click** | Right-click folder → "🔐 Encrypt folder" |
| **Command** | `Ctrl+P` → "Encrypt all notes in a folder" |

### Backups (New)

**Create backup:**
1. `Ctrl+P` → "Create backup" (coming soon)
2. Choose whether to include unencrypted notes
3. Set a strong backup password
4. Backup file downloads automatically

**Restore backup:**
1. `Ctrl+P` → "Restore from backup" (coming soon)
2. Select the `.enc` backup file
3. Enter backup password
4. Choose whether to overwrite existing files

---

## Commands

| Command | Description |
|---------|-------------|
| `Ctrl+Shift+E` | Encrypt current note |
| `Ctrl+Shift+D` | Decrypt current note |
| `Ctrl+Shift+T` | Toggle encryption |
| Encrypt selection (inline) | Encrypt selected text |
| Decrypt selection (inline) | Decrypt selected encrypted text |
| Decrypt at cursor (view) | View encrypted text popup |
| Decrypt at cursor (replace) | Replace with decrypted text |
| Encrypt folder | Batch encrypt a folder |
| Decrypt folder | Batch decrypt a folder |

---

## Settings

### Encryption
| Setting | Description | Default |
|---------|-------------|---------|
| Profile | Fast (100K), Standard (310K), Paranoid (500K) | Standard |
| Custom iterations | Override profile default | 0 |

### Security
| Setting | Description | Default |
|---------|-------------|---------|
| Min password length | Minimum characters required | 8 |
| Integrity check | Add checksum to detect corruption | On |
| HMAC integrity | Stronger verification (slower) | Off |
| Rate limiting | Lock after failed attempts | On |
| Remember passwords | Temporarily cache passwords | Off |
| Preserve frontmatter | Keep YAML metadata unencrypted | On |

### Password Generator
| Setting | Description | Default |
|---------|-------------|---------|
| Length | Default password length | 20 |
| Preset | Balanced, Secure, Memorable, Paranoid, PIN | Secure |
| Character sets | Uppercase, lowercase, numbers, symbols | All on |

### Display
| Setting | Description | Default |
|---------|-------------|---------|
| Hide encrypted content | Show lock overlay | On |
| Strength indicator | Show when entering passwords | On |
| Note prefix/suffix | Filename decorations | 🔒 / (none) |

### Advanced
| Setting | Description | Default |
|---------|-------------|---------|
| Web Worker | Background encryption | Off |
| Key caching | Cache derived keys | On |
| Cache TTL | Minutes before keys expire | 5 |
| Circuit breaker | Stop batch after N failures | 5 |
| Batch concurrency | Parallel file processing | 5 |

---

## Security Details

| Property | Value |
|----------|-------|
| Algorithm | AES-256-GCM |
| Key Derivation | PBKDF2-SHA256 |
| Iterations | 100,000 - 500,000 (configurable) |
| Salt | 128-bit random (unique per encryption) |
| IV/Nonce | 96-bit random (unique per encryption) |
| Integrity | SHA-256 checksum or HMAC-SHA256 |

### Security Features

- **No Recovery**: No way to recover content without the correct password
- **No Password Storage**: Passwords are never permanently stored
- **Cryptographic Randomness**: Secure random salt and IV for each encryption
- **Rate Limiting**: Configurable lockout after failed attempts
- **Timing-Safe Comparison**: Prevents timing attacks on password verification
- **Optional Web Worker**: Encryption runs in background thread

---

## FAQ

**Q: Can I recover my note if I forget the password?**
A: No. The encryption has no backdoor. Keep backups and remember your passwords.

**Q: Is the same password used for all notes?**
A: You choose the password each time. Different notes can have different passwords.

**Q: Can I encrypt notes on mobile?**
A: Yes, works on both desktop and mobile Obsidian.

**Q: What if I re-encrypt an already encrypted note?**
A: The plugin prevents double encryption and notifies you.

**Q: How do backups work?**
A: Backups bundle all encrypted notes into one `.enc` file, encrypted with a separate backup password.

**Q: Is HMAC slower than checksum?**
A: Slightly, but provides stronger integrity verification. Use for sensitive data.

---

## Changelog

### v2.1.0
- Password generator with presets
- Encrypted backup and restore
- HMAC integrity verification
- Web Worker support
- Key derivation caching
- Circuit breaker for batch operations
- Timing-safe comparison
- Compact settings UI
- Accessibility mode

### v1.1.0
- Hide encrypted content option
- Community plugin submission

### v1.0.0
- Initial release
- Full note and inline encryption
- Folder batch processing

---

## Contributing

Contributions welcome! Please submit a Pull Request.

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## Support

- [Open an issue](https://github.com/emeeran/obsidian-encrypt-decrypt/issues)
- [View releases](https://github.com/emeeran/obsidian-encrypt-decrypt/releases)

---

## License

MIT License - see [LICENSE](LICENSE) file.

---

## Acknowledgments

- Built for the [Obsidian](https://obsidian.md) community
- Uses the Web Crypto API for encryption
- OWASP guidelines for key derivation parameters
