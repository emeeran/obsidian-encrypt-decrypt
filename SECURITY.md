# Security Information

## Encryption Specifications

### Algorithm: AES-256-GCM

The plugin uses **AES-256-GCM** (Advanced Encryption Standard with 256-bit key in Galois/Counter Mode), which is:
- Used by governments and militaries worldwide
- NIST approved (FIPS 197)
- Considered unbreakable with current technology when properly implemented
- Provides both confidentiality and authentication

### Key Derivation: PBKDF2

**PBKDF2** (Password-Based Key Derivation Function 2) is used to convert your password into a strong encryption key:
- **Hash Function**: SHA-256
- **Iterations**: 100,000 (recommended by OWASP as of 2023)
- **Salt**: 128-bit (16 bytes) random salt, unique per encryption
- **Output**: 256-bit (32 bytes) encryption key

This makes brute-force attacks computationally expensive, even with powerful hardware.

### Initialization Vector (IV)

Each encryption uses a unique **96-bit (12 bytes) random IV**:
- Generated using cryptographically secure random number generator
- Never reused for the same key
- Prevents pattern analysis attacks

### Data Format

```
┌─────────────────────────────────────────┐
│     -----BEGIN ENCRYPTED NOTE-----      │
├─────────────────────────────────────────┤
│  Salt (16 bytes) + IV (12 bytes) +      │
│  Encrypted Data + Auth Tag (16 bytes)   │
│  All base64-encoded                     │
├─────────────────────────────────────────┤
│     -----END ENCRYPTED NOTE-----        │
└─────────────────────────────────────────┘
```

## Implementation Details

### Web Crypto API

The plugin uses the browser's native **Web Crypto API** (`crypto.subtle`):
- Hardware-accelerated when available
- Thoroughly tested and audited
- Same crypto library used by web browsers for HTTPS
- No third-party crypto libraries that could have vulnerabilities

### Password Handling

- **Never stored**: Passwords are only held in memory during encryption/decryption
- **Not cached**: Each operation requires password re-entry
- **Confirmation**: Double-entry prevents typos during encryption
- **Minimum length**: 8 characters enforced (recommend 12+ for important data)

### No Password Recovery

By design, there is **no backdoor or password recovery mechanism**:
- This is a feature, not a bug
- Ensures your data cannot be accessed without your password
- Even the plugin developer cannot decrypt your notes

## Security Best Practices

### For Users

1. **Strong Passwords**:
   - Use at least 12 characters
   - Mix uppercase, lowercase, numbers, and symbols
   - Avoid dictionary words
   - Use a password manager

2. **Unique Passwords**:
   - Don't reuse passwords from other services
   - Consider using different passwords for different notes
   - Store passwords securely (e.g., password manager)

3. **Backup Strategy**:
   - Keep unencrypted backups of critical notes elsewhere
   - Test decryption before deleting unencrypted copies
   - Remember: lost password = lost data permanently

4. **Test First**:
   - Encrypt a test note before encrypting important data
   - Practice the decryption process
   - Verify you can successfully decrypt

### For Developers

1. **Audit the Code**:
   - The code is open-source for transparency
   - Review `main.ts` encryption/decryption functions
   - Check for any security vulnerabilities

2. **Report Issues**:
   - Found a security issue? Report it responsibly
   - Contact via GitHub issues (or privately if critical)

## Attack Resistance

### What This Plugin Protects Against

✅ **Unauthorized Access**: Without the password, encrypted notes are unreadable
✅ **Brute Force**: PBKDF2 with 100,000 iterations makes brute force impractical
✅ **Dictionary Attacks**: Unique salt per encryption prevents rainbow table attacks
✅ **Pattern Analysis**: GCM mode and unique IVs prevent pattern recognition
✅ **Tampering**: GCM's authentication tag detects any modifications
✅ **Passive Observation**: Encrypted data appears random, no information leakage

### What This Plugin Does NOT Protect Against

❌ **Keyloggers**: If malware captures your password as you type, encryption won't help
❌ **Screen Capture**: While decrypted, note content is visible
❌ **Memory Dumps**: Password briefly exists in memory during use
❌ **Weak Passwords**: "password123" can be brute-forced regardless of encryption strength
❌ **Shoulder Surfing**: Someone watching you decrypt can see the content
❌ **Compromised Device**: Malware with full system access can capture everything

## Threat Model

### Protected Scenarios

- **Stolen Laptop**: Even if someone has your device, encrypted notes are safe
- **Cloud Sync Interception**: Encrypted data is safe even if intercepted
- **Unauthorized File Access**: Family, coworkers, etc. can't read encrypted notes
- **Public Computer**: Encrypted notes remain secure after you close Obsidian

### Unprotected Scenarios

- **Actively Being Watched**: Encryption doesn't help if someone sees your screen
- **Compromised System**: If your computer has malware, all bets are off
- **Forced Disclosure**: Legal/physical coercion to reveal passwords
- **Forgotten Password**: No recovery mechanism exists

## Comparison to Alternatives

### vs. Full-Disk Encryption (BitLocker, FileVault)

| Feature | Note Encryptor | Full-Disk Encryption |
|---------|---------------|----------------------|
| Granular Control | ✅ Per-note | ❌ All or nothing |
| Cloud Sync | ✅ Encrypted | ⚠️ Decrypted before sync |
| Performance | ✅ Fast | ✅ Fast |
| Convenience | ⚠️ Password per note | ✅ Transparent |
| Security at Rest | ✅ Strong | ✅ Strong |
| Security in Use | ⚠️ Depends | ❌ Unprotected |

### vs. Obsidian Sync End-to-End Encryption

| Feature | Note Encryptor | Obsidian Sync E2EE |
|---------|---------------|---------------------|
| Local Protection | ✅ Yes | ❌ No |
| Works Offline | ✅ Yes | ✅ Yes |
| Requires Subscription | ❌ No | ✅ Yes |
| Per-Note Control | ✅ Yes | ❌ All notes |
| Cross-Device | ✅ With any sync | ✅ Built-in |

## Compliance & Standards

- **FIPS 197**: AES encryption standard
- **NIST SP 800-132**: PBKDF2 recommendations
- **OWASP**: Follows password hashing best practices
- **RFC 2898**: PBKDF2 specification
- **RFC 5288**: AES-GCM specification

## Limitations & Warnings

1. **No Plausible Deniability**: Encrypted notes are obviously encrypted
2. **Metadata Not Encrypted**: File names, sizes, modification times are visible
3. **Embedded Content**: Images and attachments are not encrypted
4. **Clipboard**: Decrypted content in clipboard is vulnerable
5. **Temporary Files**: Obsidian may create temporary files while editing

## Responsible Disclosure

If you discover a security vulnerability:

1. **DO NOT** publicly disclose it immediately
2. Contact via GitHub private security advisory
3. Provide details: steps to reproduce, impact assessment
4. Allow reasonable time for a fix (typically 90 days)
5. Coordinate public disclosure after patch is available

## Cryptographic Primitives Used

```
Password → PBKDF2-HMAC-SHA256 (100k iterations) → 256-bit Key
Random Generator → Crypto.getRandomValues() → Salt (128-bit) & IV (96-bit)
Plaintext + Key + IV → AES-256-GCM → Ciphertext + Auth Tag
```

## Code Audit Checklist

For security auditors reviewing this plugin:

- [ ] Verify no password storage or caching
- [ ] Check random number generation uses crypto-secure methods
- [ ] Confirm salt and IV are unique per encryption
- [ ] Validate PBKDF2 iteration count (100,000)
- [ ] Ensure proper error handling (no info leakage)
- [ ] Check for timing attacks in password comparison
- [ ] Verify GCM authentication tag is checked
- [ ] Confirm no use of deprecated crypto functions

## Updates & Security Patches

- Monitor GitHub for security updates
- Update plugin regularly
- Check changelog for security-related fixes
- Report issues through proper channels

---

**Remember**: Encryption is only as strong as your password and as secure as your device. Practice good security hygiene!
