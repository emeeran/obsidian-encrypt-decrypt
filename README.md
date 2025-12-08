# Obsidian Note Encryptor

A simple, secure Obsidian plugin that encrypts individual notes with password protection using AES-256-GCM encryption.

## Features

- 🔒 **Strong Encryption**: AES-256-GCM with PBKDF2 key derivation (310,000 iterations)
- 🎯 **Individual Note Encryption**: Encrypt only the notes you want
- 📁 **Folder Encryption**: Encrypt all notes in a folder with one password
- 🎨 **Visual Indicators**: Automatic prefix on encrypted note filenames (🔒)
- ⌨️ **Multiple Access Methods**: Ribbon icon, commands, and hotkeys
- 💪 **Password Strength Indicator**: Visual feedback on password strength
- 🔐 **No Password Storage**: Your password is never stored or cached

## Installation

### From Obsidian Community Plugins

1. Open Obsidian Settings → Community Plugins
2. Disable Safe Mode
3. Click Browse and search for "Note Encryptor"
4. Click Install, then Enable

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release
2. Create folder: `<vault>/.obsidian/plugins/note-encryptor/`
3. Copy the downloaded files into the folder
4. Reload Obsidian and enable the plugin

## Usage

### Encrypting a Note

1. Open the note you want to encrypt
2. Click the lock icon 🔒 in the ribbon, or use Command Palette: "Encrypt current note"
3. Enter and confirm your password
4. The note will be encrypted and the filename prefixed with 🔒

### Decrypting a Note

1. Open an encrypted note
2. Click the lock icon 🔒 in the ribbon, or use Command Palette: "Decrypt current note"
3. Enter your password
4. The note will be decrypted

### Encrypting/Decrypting a Folder

1. Use Command Palette: "Encrypt all notes in a folder" or "Decrypt all notes in a folder"
2. Select the folder from the list
3. Enter password (all notes will use the same password)
4. Notes will be processed recursively (including subfolders)

### Settings- **Encrypted note prefix/suffix**: Customize filename indicators
- **Minimum password length**: Set minimum required characters (default: 8)
- **Show password strength**: Enable/disable the strength indicator

## Security

| Property | Value |
|----------|-------|
| Algorithm | AES-256-GCM |
| Key Derivation | PBKDF2-SHA256 |
| Iterations | 310,000 |
| Salt | 128-bit random per encryption |
| IV | 96-bit random per encryption |

⚠️ **Important**: There is no way to recover an encrypted note without the correct password. Always keep backups.

## License

MIT License - see [LICENSE](LICENSE)
