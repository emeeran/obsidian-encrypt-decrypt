# Note Encryptor

A secure Obsidian plugin for encrypting notes and text with AES-256-GCM encryption.

![Obsidian Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%23483699&label=downloads&query=%24%5B%22note-encryptor%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json)

## Features

### 🔒 Full Note Encryption
- Encrypt entire notes with a password
- Encrypted notes display a lock screen overlay
- Automatic filename prefix (🔒) for easy identification

### 🔐 Inline Text Encryption
- Encrypt selected text within a note
- Keep sensitive information hidden while the rest remains readable
- Encrypted text appears as: `🔐«...»🔐`

### 📁 Batch Folder Encryption
- Encrypt or decrypt all notes in a folder at once
- Recursive processing includes subfolders
- Single password for the entire batch

### 🛡️ Strong Security
- **AES-256-GCM** encryption algorithm
- **PBKDF2-SHA256** key derivation with 310,000 iterations (OWASP recommended)
- Unique random salt and IV for each encryption
- Password is never stored or cached

### ✨ User Experience
- Password strength indicator
- Right-click context menu integration
- Command palette support
- Visual lock screen for encrypted notes

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

## Usage

### Encrypt a Note

| Method | Steps |
|--------|-------|
| **Right-click** | Right-click note → "🔐 Encrypt note" |
| **Command Palette** | `Ctrl/Cmd+P` → "Encrypt current note" |

### Decrypt a Note

| Method | Steps |
|--------|-------|
| **Right-click** | Right-click encrypted note → "🔓 Decrypt note" |
| **Command Palette** | `Ctrl/Cmd+P` → "Decrypt current note" |
| **Lock Screen** | Click "Decrypt to view" button on the overlay |

### Inline Text Encryption

**Encrypt selected text:**
1. Select the text you want to encrypt
2. Right-click → "🔐 Encrypt selection" or use Command Palette → "Encrypt selection (inline)"
3. Enter and confirm your password

**View encrypted text:**
- Place cursor on encrypted text → Command Palette → "Decrypt at cursor (view encrypted text)"
- This shows the content in a popup without modifying the note

**Decrypt in place:**
- Place cursor on encrypted text → Command Palette → "Decrypt at cursor (replace with decrypted text)"
- Or select the entire `🔐«...»🔐` block and right-click → "🔓 Decrypt selection"

### Folder Encryption

| Method | Steps |
|--------|-------|
| **Right-click** | Right-click folder → "🔐 Encrypt folder" or "🔓 Decrypt folder" |
| **Command Palette** | "Encrypt all notes in a folder" or "Decrypt all notes in a folder" |

All notes in the folder (and subfolders) will be processed with the same password.

## Commands

| Command | Description |
|---------|-------------|
| Encrypt current note | Encrypt the entire active note |
| Decrypt current note | Decrypt the entire active note |
| Toggle encryption | Smart encrypt/decrypt based on current state |
| Encrypt selection (inline) | Encrypt selected text within the note |
| Decrypt selection (inline) | Decrypt selected encrypted text |
| Decrypt at cursor (view) | View encrypted text without modifying |
| Decrypt at cursor (replace) | Replace encrypted text with decrypted |
| Encrypt all notes in a folder | Batch encrypt a folder |
| Decrypt all notes in a folder | Batch decrypt a folder |

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Encrypted note prefix | Prefix added to encrypted filenames | 🔒 |
| Encrypted note suffix | Suffix added to encrypted filenames | (empty) |
| Minimum password length | Minimum characters required | 8 |
| Show password strength | Display strength indicator when encrypting | On |
| Hide encrypted content | Show lock screen instead of encrypted content | On |

## Security Details

| Property | Value |
|----------|-------|
| Algorithm | AES-256-GCM |
| Key Derivation | PBKDF2-SHA256 |
| Iterations | 310,000 (OWASP 2023 recommendation) |
| Salt | 128-bit random (unique per encryption) |
| IV/Nonce | 96-bit random (unique per encryption) |

### Security Notes

- ⚠️ **No Recovery**: There is no way to recover encrypted content without the correct password
- 🔑 **Password Storage**: Passwords are never stored or cached
- 🎲 **Randomness**: Each encryption uses cryptographically secure random salt and IV
- 📋 **Clipboard**: When viewing inline encrypted text, you can copy to clipboard

## FAQ

**Q: Can I recover my note if I forget the password?**
A: No. The encryption is secure and there is no backdoor. Always keep backups and remember your passwords.

**Q: Is the same password used for all notes?**
A: You choose the password each time you encrypt. Different notes can have different passwords.

**Q: Can I encrypt notes on mobile?**
A: Yes, the plugin works on both desktop and mobile versions of Obsidian.

**Q: What happens if I re-encrypt an already encrypted note?**
A: The plugin prevents double encryption and will notify you that the note is already encrypted.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

If you encounter any issues or have suggestions:
- [Open an issue](https://github.com/emeeran/obsidian-encrypt-decrypt/issues)
- Check existing issues for solutions

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built for the [Obsidian](https://obsidian.md) community
- Uses the Web Crypto API for encryption
