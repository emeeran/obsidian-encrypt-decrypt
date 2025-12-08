# Obsidian Note Encryptor

A simple, secure Obsidian plugin that encrypts individual notes with password protection using AES-256-GCM encryption.

## Features

- 🔒 **Strong Encryption**: AES-256-GCM with PBKDF2 key derivation (310,000 iterations)
- 🎯 **Individual Note Encryption**: Encrypt only the notes you want
- 📁 **Folder Encryption**: Encrypt all notes in a folder with one password
- 🎨 **Visual Indicators**: Automatic prefix on encrypted note filenames (🔒)
- 💪 **Password Strength Indicator**: Visual feedback on password strength
- 🔐 **No Password Storage**: Your password is never stored or cached
- 🛡️ **Double Encryption Protection**: Prevents accidental re-encryption

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

**Option 1: Right-click Context Menu**
1. Right-click on any `.md` file in the file explorer
2. Select "🔐 Encrypt note"
3. Enter and confirm your password

**Option 2: Command Palette**
1. Open the note you want to encrypt
2. Use Command Palette (Ctrl/Cmd+P): "Encrypt current note"
3. Enter and confirm your password

The note will be encrypted and the filename prefixed with 🔒.

### Decrypting a Note

**Option 1: Right-click Context Menu**
1. Right-click on an encrypted note in the file explorer
2. Select "🔓 Decrypt note"
3. Enter your password

**Option 2: Command Palette**
1. Open an encrypted note
2. Use Command Palette: "Decrypt current note"
3. Enter your password

### Encrypting/Decrypting a Folder

**Option 1: Right-click Context Menu**
1. Right-click on any folder in the file explorer
2. Select "🔐 Encrypt folder" or "🔓 Decrypt folder"
3. Enter password (all notes will use the same password)
4. Notes will be processed recursively (including subfolders)

**Option 2: Command Palette**
1. Use Command Palette: "Encrypt all notes in a folder" or "Decrypt all notes in a folder"
2. Select the folder from the list
3. Enter password

### Toggle Encryption

Use Command Palette: "Toggle encryption" to automatically encrypt or decrypt the current note based on its current state.

## Settings

- **Encrypted note prefix/suffix**: Customize filename indicators (default: 🔒)
- **Minimum password length**: Set minimum required characters (default: 8)
- **Show password strength**: Enable/disable the strength indicator

## Security

| Property | Value |
|----------|-------|
| Algorithm | AES-256-GCM |
| Key Derivation | PBKDF2-SHA256 |
| Iterations | 310,000 (OWASP recommended) |
| Salt | 128-bit random per encryption |
| IV | 96-bit random per encryption |

⚠️ **Important**: There is no way to recover an encrypted note without the correct password. Always keep backups.

## Commands

| Command | Description |
|---------|-------------|
| Encrypt current note | Encrypt the active note |
| Decrypt current note | Decrypt the active note |
| Toggle encryption | Smart encrypt/decrypt based on state |
| Encrypt all notes in a folder | Batch encrypt a folder |
| Decrypt all notes in a folder | Batch decrypt a folder |

## License

MIT License - see [LICENSE](LICENSE)
