# Obsidian Note Encryptor

A lightweight, robust Obsidian plugin that encrypts individual notes with password protection using military-grade AES-256-GCM encryption.

## Features

- 🔒 **Strong Encryption**: Uses AES-256-GCM with PBKDF2 key derivation (310,000 iterations)
- 🎯 **Individual Note Encryption**: Encrypt only the notes you want, not your entire vault
- 📁 **Directory Encryption**: Encrypt all notes in a folder with a single password
- 🚀 **Lightweight**: Minimal overhead, fast encryption/decryption
- 🎨 **Visual Indicators**: Automatically adds prefixes to encrypted note filenames (e.g., 🔒)
- ⌨️ **Multiple Access Methods**: Ribbon icon, commands, and hotkeys
- 🔐 **Password Confirmation**: Double-check passwords when encrypting to prevent mistakes
- 📝 **Seamless Integration**: Works with standard markdown files
- 🔐 **Hardware Security**: Optional WebAuthn/FIDO2 support for hardware security keys
- 🛡️ **Post-Quantum Ready**: Experimental quantum-resistant encryption options
- 🤖 **AI Security Assistant**: Smart password suggestions and content analysis

## Security

- **Encryption Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Derivation**: PBKDF2 with SHA-256, 310,000 iterations
- **Salt**: Unique 256-bit random salt for each encryption
- **IV**: Unique 96-bit random initialization vector for each encryption
- **No Password Storage**: Passwords are never stored or cached
- **Browser Crypto API**: Uses the native Web Crypto API for secure, tested cryptographic operations
- **Memory Protection**: Password data is securely zeroed after use

## Installation

### From Obsidian Community Plugins (Coming Soon)

1. Open Obsidian Settings
2. Go to Community Plugins and disable Safe Mode
3. Click Browse and search for "Note Encryptor"
4. Click Install, then Enable

### Manual Installation

1. Download the latest release (`main.js`, `manifest.json`, `styles.css`)
2. Create a folder named `note-encryptor` in your vault's `.obsidian/plugins/` directory
3. Copy the downloaded files into the new folder
4. Reload Obsidian
5. Enable the plugin in Settings → Community Plugins

### Build from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/obsidian-note-encryptor.git
cd obsidian-note-encryptor

# Install dependencies
npm install

# Build the plugin
npm run build

# Or run in development mode with auto-rebuild
npm run dev
```

Then copy `main.js` and `manifest.json` to your vault's plugin folder.

## Usage

### Encrypting a Note

1. Open the note you want to encrypt
2. Use one of these methods:
   - Click the lock icon 🔒 in the ribbon
   - Use Command Palette: "Encrypt current note"
   - Use Command Palette: "Encrypt/Decrypt current note"
3. Enter a strong password (minimum 8 characters)
4. Confirm the password
5. The note will be encrypted and the filename will be prefixed with 🔒

### Decrypting a Note

1. Open an encrypted note
2. Use one of these methods:
   - Click the lock icon 🔒 in the ribbon
   - Use Command Palette: "Decrypt current note"
   - Use Command Palette: "Encrypt/Decrypt current note"
3. Enter the password
4. The note will be decrypted and the 🔒 prefix will be removed

### Directory Encryption

Encrypt all notes in a folder at once:

1. Use one of these methods:
   - Click the folder lock icon 📁🔒 in the ribbon
   - Use Command Palette: "Encrypt directory"
   - Use Command Palette: "Decrypt directory"
2. Select the folder you want to encrypt/decrypt
3. Enter a password (all files will use the same password)
4. Review the files to be processed
5. Click "Encrypt" or "Decrypt" to process

**Directory Encryption Settings:**
- **Include subdirectories**: Process files in nested folders
- **Skip encrypted files**: Don't re-encrypt already encrypted files
- **Create manifest**: Track which files were encrypted (for decryption)
- **Parallel operations**: Process multiple files simultaneously (1-10)

### Settings

Access plugin settings from Settings → Note Encryptor:

- **Encrypted Note Prefix**: Customize the prefix added to encrypted notes (default: 🔒)
- **Encrypted Note Suffix**: Optional suffix to add to encrypted note filenames

## Important Notes

⚠️ **WARNING**: 
- **Keep Your Passwords Safe**: There is NO way to recover an encrypted note without the correct password
- **Backup Your Notes**: Always maintain backups of important notes before encrypting
- **Password Strength**: Use strong, unique passwords for maximum security
- **Test First**: Try encrypting a test note first to familiarize yourself with the process

## How It Works

1. **Encryption Process**:
   - Your password is used with PBKDF2 to derive a 256-bit encryption key
   - A random salt and IV are generated for each encryption
   - Your note content is encrypted using AES-256-GCM
   - The salt, IV, and encrypted data are combined and encoded in base64
   - The result is wrapped in a standard format with clear markers

2. **Decryption Process**:
   - The encrypted data is parsed and decoded from base64
   - Salt and IV are extracted
   - Your password is used with PBKDF2 to derive the same encryption key
   - The note is decrypted using AES-256-GCM
   - Original content is restored

3. **File Format**:
   ```
   -----BEGIN ENCRYPTED NOTE-----
   [base64-encoded encrypted data]
   -----END ENCRYPTED NOTE-----
   ```

## FAQ

**Q: Can I sync encrypted notes?**  
A: Yes! Encrypted notes are just text files and can be synced normally with Obsidian Sync, iCloud, Git, or any sync service.

**Q: What happens if I forget my password?**  
A: Unfortunately, there's no way to recover the content. The encryption is designed to be unbreakable without the password.

**Q: Can I use different passwords for different notes?**  
A: Yes! Each note can have its own unique password.

**Q: Is this compatible with mobile?**  
A: Yes! The plugin works on both desktop and mobile versions of Obsidian.

**Q: How long does encryption/decryption take?**  
A: Very fast! Usually under a second, even for large notes.

**Q: Can I encrypt notes with images or attachments?**  
A: Currently, only the text content is encrypted. Images and attachments remain separate files.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - See LICENSE file for details

## Support

If you find this plugin helpful, consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs or suggesting features
- 💬 Sharing it with others

## Disclaimer

While this plugin uses strong encryption, no security tool is perfect. Use at your own risk and always maintain backups of important data.

---

**Made with ❤️ for the Obsidian community**
