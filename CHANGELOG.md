# Changelog

All notable changes to the Obsidian Note Encryptor plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-11-19

### Added
- 🆕 **Enhanced Security Architecture**
  - Custom error classes (`EncryptionError`, `PasswordError`, `ValidationError`)
  - Memory security improvements with automatic data zeroization
  - Enhanced input validation and sanitization
  - File size limits to prevent DoS attacks (configurable, default 10MB)

- 🆕 **Advanced User Experience**
  - Real-time password strength indicator with visual feedback
  - Loading states during encryption/decryption operations
  - Optional confirmation dialogs for sensitive operations
  - Improved file naming with automatic collision detection
  - Enhanced error messages with specific error types

- 🆕 **Comprehensive Settings Interface**
  - Security settings: Strong password requirements, minimum length
  - User experience settings: Password strength indicators, confirmations
  - File size limits with configurable maximum (1-50MB)
  - Organized settings categories with clear descriptions
  - Enhanced UI with better visual hierarchy

- 🆕 **Code Architecture Improvements**
  - Separated `EncryptionService` class for better maintainability
  - Modular design with clear separation of concerns
  - Enhanced modal components with improved UX
  - Better error handling throughout the application
  - Future-proof encryption format with versioning support

- 🆕 **Developer Features**
  - Comprehensive API documentation
  - Type-safe interfaces and methods
  - Extensible architecture for plugin integrations
  - Enhanced debugging capabilities

### Changed
- 🔧 **Enhanced Encryption Format**
  - Added versioned header for future compatibility
  - Improved data structure with null-terminated header
  - Better error detection and validation
  - Maintains backward compatibility with version 1.x format

- 🔧 **Improved File Operations**
  - Enhanced file path sanitization to prevent path traversal attacks
  - Better file naming with collision resolution
  - More robust file renaming operations
  - Improved error handling for file system operations

- 🔧 **User Interface Enhancements**
  - Redesigned password modal with strength indicators
  - Better visual feedback for all operations
  - Improved settings organization and navigation
  - Enhanced responsive design for different screen sizes

### Security
- 🔒 **Memory Security**: Implemented automatic zeroization of sensitive data
- 🔒 **Input Validation**: Added comprehensive input validation for all user inputs
- 🔒 **Path Security**: Enhanced path traversal protection
- 🔒 **Error Handling**: Prevented information leakage through error messages
- 🔒 **File Size Limits**: Added configurable limits to prevent resource exhaustion

### Fixed
- 🐛 **File Naming**: Fixed issues with special characters in encrypted filenames
- 🐛 **Memory Leaks**: Resolved potential memory leaks with sensitive data
- 🐛 **Error Handling**: Improved error handling to prevent crashes
- 🐛 **UI Responsiveness**: Fixed modal responsiveness issues on mobile devices
- 🐛 **Validation**: Fixed password validation edge cases

### Performance
- ⚡ **Memory Usage**: Optimized memory usage for large files
- ⚡ **Encryption Speed**: Improved encryption performance through better memory management
- ⚡ **UI Performance**: Enhanced UI responsiveness during operations
- ⚡ **File Operations**: Optimized file I/O operations

### Documentation
- 📚 **Comprehensive Documentation**: Created extensive documentation suite
- 📚 **API Reference**: Added complete API documentation
- 📚 **Security Guide**: Created detailed security analysis and best practices
- 📚 **User Guide**: Enhanced user documentation with examples
- 📚 **Developer Guide**: Added development and integration guides

### Breaking Changes
- ⚠️ **Settings Structure**: Settings interface has been enhanced with new options
- ⚠️ **Error Handling**: Error handling behavior has been improved with specific error types
- ⚠️ **Plugin API**: Some internal methods have been restructured for better security
- ⚠️ **Requirements**: Minimum Obsidian version updated to 0.15.0

### Migration Notes
- Existing encrypted notes remain fully compatible
- Settings are automatically migrated to new format
- No manual action required for existing users
- All features from version 1.x are preserved

## [1.0.0] - 2025-11-18

### Added
- 🎉 **Initial Release**
  - Basic AES-256-GCM encryption for individual notes
  - PBKDF2 key derivation with 100,000 iterations
  - Random salt and IV generation for each encryption
  - File naming with configurable prefixes (default: "🔒 ")
  - Ribbon icon integration for quick access
  - Command palette integration
  - Basic settings interface
  - Password confirmation during encryption
  - Visual indicators for encrypted notes
  - Cross-platform compatibility (desktop and mobile)

### Features
- 🔐 **Encryption Features**
  - AES-256-GCM authenticated encryption
  - Military-grade security standards
  - Individual note encryption (not vault-wide)
  - No password storage or caching
  - Unique cryptographic parameters per encryption

- 🎨 **User Interface**
  - Simple password modal with confirmation
  - Ribbon icon for quick access
  - Command palette commands:
    - "Encrypt current note"
    - "Decrypt current note"
    - "Encrypt/Decrypt current note"
  - Visual filename prefixing for encrypted notes
  - Basic settings interface

- ⚙️ **Configuration**
  - Configurable encrypted note prefix
  - Optional encrypted note suffix
  - Minimal settings for ease of use
  - Secure defaults

### Security
- 🔒 **Core Security**
  - AES-256-GCM encryption algorithm
  - PBKDF2 key derivation with 100,000 iterations
  - 128-bit random salt per encryption
  - 96-bit random IV per encryption
  - No password persistence or caching

- 🔒 **Security Practices**
  - Web Crypto API for cryptographic operations
  - Secure random number generation
  - Proper memory management
  - Input validation for file operations

### Technical Details
- 💻 **Technology Stack**
  - TypeScript for type safety
  - Obsidian Plugin API
  - Web Crypto API for cryptography
  - ESBuild for bundling
  - Modern JavaScript features

- 📱 **Compatibility**
  - Obsidian 0.15.0 and later
  - Desktop and mobile platforms
  - Cross-platform file system support
  - Compatibility with sync solutions

### Documentation
- 📚 **Basic Documentation**
  - Installation instructions
  - Basic usage guide
  - Security information
  - Configuration options

## [Unreleased]

### Planned for Future Releases

#### Version 2.1.0 (Roadmap)
- 🔄 **Advanced Features**
  - [ ] Batch encryption operations
  - [ ] Search integration for encrypted notes
  - [ ] Keyboard shortcuts customization
  - [ ] Password history management (optional)
  - [ ] Export/Import encryption settings

#### Version 2.2.0 (Research)
- 🔬 **Enhanced Security**
  - [ ] Hardware security key support (WebAuthn)
  - [ ] Multi-factor authentication options
  - [ ] Post-quantum cryptography research
  - [ ] Zero-knowledge proof integration
  - [ ] Advanced key management

#### Version 3.0.0 (Future)
- 🚀 **Next Generation**
  - [ ] Plugin architecture overhaul
  - [ ] Advanced user interface redesign
  - [ ] Machine learning for sensitive data detection
  - [ ] Enterprise features and compliance
  - [ ] Advanced audit and logging capabilities

### Known Issues
- No known issues in version 2.0.0

### Upcoming Breaking Changes
- None currently planned

## Version History

### Versioning Policy
- **Major (X.0.0)**: Breaking changes, major feature additions
- **Minor (x.Y.0)**: New features, enhancements
- **Patch (x.y.Z)**: Bug fixes, security updates

### Support Lifecycle
- **Current Version**: Full support including new features
- **Previous Major**: Security updates only
- **Older Versions**: No longer supported

### Update Recommendations
- **Always** update to the latest version for security patches
- **Read** migration notes before major version updates
- **Backup** your encrypted notes before updating
- **Test** new features with non-critical data first

## Security Updates

### Critical Security Patches
- All security updates will be clearly marked
- Critical patches may be released outside normal schedule
- Always update immediately for critical security fixes

### Security Advisories
- Security issues will be disclosed according to responsible disclosure
- CVE numbers will be assigned for critical vulnerabilities
- Security patches will be backported to supported versions

## Credits

### Development Team
- Lead Developer: [Your Name]
- Security Review: [Security Expert]
- UI/UX Design: [Designer]
- Quality Assurance: [QA Team]

### Community Contributions
- [Contributor 1]: Feature implementation
- [Contributor 2]: Bug fixes and improvements
- [Contributor 3]: Documentation enhancements
- [Contributor 4]: Testing and feedback

### Third-Party Libraries
- Obsidian API: Plugin framework
- Web Crypto API: Cryptographic operations
- TypeScript: Type safety and development

## License

This plugin is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

### Open Source
- Source code available on GitHub
- Contributions welcome from the community
- Issues and pull requests accepted
- Code of conduct applies

## Support

### Getting Help
- 📖 **Documentation**: Check the comprehensive documentation
- 🐛 **Bug Reports**: Open an issue on GitHub
- 💬 **Community**: Join the Discord server
- 📧 **Email**: Contact support@yourdomain.com

### Contributing
- 🔄 **Development**: Fork and submit pull requests
- 📝 **Documentation**: Help improve documentation
- 🐛 **Testing**: Report bugs with reproduction steps
- 💡 **Features**: Request new features with use cases

---

**Note**: This changelog is maintained as part of our commitment to transparency and security. All changes, especially security-related ones, are documented here for user awareness and audit purposes.