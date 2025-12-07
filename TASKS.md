# Obsidian Note Encryptor - Optimization Task List

> Generated: December 7, 2025
> Total Tasks: 67 | Estimated Effort: ~40-50 hours

---

## Phase 1: Code Cleanup & Dead Code Removal
**Priority: 🔴 High | Effort: ~4 hours**

### 1.1 Remove Unused Variables & Imports
- [x] **T1.1.1** Remove unused `feedback = []` variable in `main.ts` → `calculatePasswordStrength()` ✅ (Replaced with utility function)
- [ ] **T1.1.2** Remove or utilize unused `performanceCache` Map in `enhanced-encryption.ts`
- [ ] **T1.1.3** Clean up inconsistently used `userPatterns` Map in `ai-features.ts`
- [x] **T1.1.4** Audit all files for unused imports and remove them ✅ (Removed TFolder, DirectoryEncryptionManager)
- [x] **T1.1.5** Remove unused `feedback` array construction in password analysis ✅ (Using centralized utility)

### 1.2 Eliminate Duplicate Code
- [ ] **T1.2.1** Extract AES-256-GCM encryption from `post-quantum.ts` (uses same as `enhanced-encryption.ts`)
- [x] **T1.2.2** Centralize Base64 encoding/decoding into single utility ✅ (Created crypto-utils.ts)
- [x] **T1.2.3** Create shared modal styling utility (used in 5+ modals) ✅ (Created style-manager.ts)
- [ ] **T1.2.4** Consolidate plugin settings access pattern (repeated in 4 files)
- [x] **T1.2.5** Merge duplicate password validation logic ✅ (Created password-utils.ts)

### 1.3 Remove Dead/Unreachable Code
- [x] **T1.3.1** Remove or mark WASM paths as experimental (no WASM binary exists) ✅ Added warning banner
- [x] **T1.3.2** Add warning banner for simulated post-quantum crypto ✅
- [x] **T1.3.3** Document placeholder status of AI breach checking ✅
- [ ] **T1.3.4** Remove unreachable error handling branches
- [ ] **T1.3.5** Clean up commented-out code blocks

---

## Phase 2: Code Consolidation & Architecture
**Priority: 🔴 High | Effort: ~12 hours**

### 2.1 Extract Classes from `main.ts`
- [x] **T2.1.1** Create `src/typescript/ui/modals/password-modal.ts` - extract PasswordModal class ✅
- [x] **T2.1.2** Create `src/typescript/ui/modals/confirm-modal.ts` - extract ConfirmModal class ✅
- [x] **T2.1.3** Create `src/typescript/ui/settings-tab.ts` - extract NoteEncryptorSettingTab class ✅
- [ ] **T2.1.4** Update `main.ts` imports after extractions
- [ ] **T2.1.5** Verify all extracted classes work correctly
- [ ] **T2.1.6** Reduce `main.ts` from 1898 lines to ~400 lines

### 2.2 Create Shared Utilities
- [x] **T2.2.1** Create `src/typescript/utils/crypto-utils.ts` with Base64/ArrayBuffer functions ✅
- [x] **T2.2.2** Create `src/typescript/utils/password-utils.ts` with validation/strength functions ✅
- [x] **T2.2.3** Create `src/typescript/utils/file-utils.ts` with file operation helpers ✅
- [x] **T2.2.4** Create `src/typescript/ui/style-manager.ts` for centralized style injection ✅
- [x] **T2.2.5** Create `src/typescript/core/constants.ts` for crypto constants (iterations, etc.) ✅
- [x] **T2.2.6** Create `src/typescript/utils/encryption-utils.ts` for pure encryption helpers ✅
- [ ] **T2.2.7** Update all files to import from new utilities (partial - main.ts updated)

### 2.3 Consolidate Encryption Services
- [x] **T2.3.1** Create `src/typescript/core/encryption-service.ts` as single source of truth ✅
- [ ] **T2.3.2** Refactor `enhanced-encryption.ts` to use core encryption service
- [ ] **T2.3.3** Refactor `post-quantum.ts` to use core encryption service
- [ ] **T2.3.4** Update WASM wrapper to delegate to core service
- [ ] **T2.3.5** Remove duplicate encryption implementations

---

## Phase 3: Directory Encryption Feature (NEW)
**Priority: 🔴 High | Effort: ~10 hours**

### 3.1 Core Implementation
- [x] **T3.1.1** Create `src/typescript/features/directory-encryption.ts` with DirectoryEncryptionManager class ✅
- [x] **T3.1.2** Implement recursive directory traversal with file filtering ✅
- [x] **T3.1.3** Implement single-password encryption for all files in directory ✅
- [x] **T3.1.4** Create `.encrypted-manifest.json` format for tracking encrypted files ✅
- [x] **T3.1.5** Implement skip-already-encrypted logic ✅
- [x] **T3.1.6** Add parallel operations support with configurable concurrency ✅

### 3.2 Directory Encryption UI
- [x] **T3.2.1** Create `src/typescript/ui/modals/directory-modal.ts` with DirectoryEncryptionModal ✅
- [x] **T3.2.2** Implement directory picker/browser interface ✅
- [x] **T3.2.3** Add progress bar for batch operations ✅
- [x] **T3.2.4** Show file count and estimated time ✅
- [x] **T3.2.5** Add cancel operation capability ✅
- [x] **T3.2.6** Display summary after completion (success/failed/skipped counts) ✅

### 3.3 Settings & Commands
- [x] **T3.3.1** Add DirectoryEncryptionSettings interface to settings ✅
- [x] **T3.3.2** Add settings UI for directory encryption options ✅
- [x] **T3.3.3** Register `encrypt-directory` command ✅
- [x] **T3.3.4** Register `decrypt-directory` command ✅
- [x] **T3.3.5** Register `encrypt-directory-selective` command with picker ✅
- [x] **T3.3.6** Add ribbon icon option for directory encryption ✅

---

## Phase 4: Security Improvements
**Priority: 🔴 High | Effort: ~6 hours**

### 4.1 Cryptographic Enhancements
- [x] **T4.1.1** Make PBKDF2 iterations configurable (default: 310,000) ✅ (In constants.ts)
- [x] **T4.1.2** Replace `Math.random()` with `crypto.getRandomValues()` in password generation ✅ (In crypto-utils.ts)
- [x] **T4.1.3** Implement password memory zeroing after use ✅ (Added withSecurePassword, secureCompare in crypto-utils)
- [x] **T4.1.4** Make salt length configurable (default: 32 bytes) ✅ (In constants.ts)
- [x] **T4.1.5** Store iteration count in encrypted note metadata for future compatibility ✅ (In encryption-service.ts)

### 4.2 Privacy & Security Settings
- [ ] **T4.2.1** Add `disableErrorLogging` setting for maximum privacy
- [ ] **T4.2.2** Implement error context sanitization before logging
- [x] **T4.2.3** Add password clearing in modal `onClose()` methods ✅
- [ ] **T4.2.4** Add security audit log option
- [ ] **T4.2.5** Implement session timeout for cached credentials

---

## Phase 5: Performance Optimizations
**Priority: 🟡 Medium | Effort: ~4 hours**

### 5.1 Immediate Performance Fixes
- [x] **T5.1.1** Add existence check before style injection (prevent duplicates) ✅ (In style-manager.ts)
- [x] **T5.1.2** Optimize Base64 conversion using `Array.from` + `apply` ✅ (In crypto-utils.ts)
- [x] **T5.1.3** Add debouncing (150ms) to password strength updates ✅ (In password-utils.ts)
- [ ] **T5.1.4** Implement chunked processing for large files
- [ ] **T5.1.5** Add loading indicators for async operations

### 5.2 Caching & Lazy Loading
- [x] **T5.2.1** Lazy load post-quantum module on demand ✅
- [x] **T5.2.2** Lazy load AI features module on demand ✅
- [ ] **T5.2.3** Implement key derivation caching for same-session operations
- [ ] **T5.2.4** Add connection pooling for batch operations
- [ ] **T5.2.5** Cache compiled regex patterns in AI analysis

---

## Phase 6: TypeScript & Code Quality
**Priority: 🟡 Medium | Effort: ~6 hours**

### 6.1 Enable Strict TypeScript
- [x] **T6.1.1** Add `"strict": true` to tsconfig.json ✅
- [ ] **T6.1.2** Add `"noUnusedLocals": true` to tsconfig.json (skipped - too many false positives)
- [ ] **T6.1.3** Add `"noUnusedParameters": true` to tsconfig.json (skipped - too many false positives)
- [x] **T6.1.4** Add `"noImplicitReturns": true` to tsconfig.json ✅
- [x] **T6.1.5** Fix all resulting TypeScript errors ✅ (Fixed definite assignment issues)

### 6.2 Replace `any` Types
- [ ] **T6.2.1** Replace `(toggle: any)` with proper Obsidian types in settings
- [ ] **T6.2.2** Create type-safe plugin settings accessor
- [ ] **T6.2.3** Replace `catch (error)` with `catch (error: unknown)` pattern
- [ ] **T6.2.4** Type all context objects properly
- [ ] **T6.2.5** Add proper return types to all public methods

### 6.3 Linting Setup
- [x] **T6.3.1** Create `.eslintrc.json` configuration file ✅
- [x] **T6.3.2** Add ESLint dependencies to package.json ✅ (already present)
- [x] **T6.3.3** Add `lint` and `lint:fix` scripts to package.json ✅
- [ ] **T6.3.4** Fix all ESLint errors and warnings
- [ ] **T6.3.5** Add pre-commit hook for linting

---

## Phase 7: Testing Infrastructure
**Priority: 🟢 Low | Effort: ~8 hours**

### 7.1 Test Setup
- [x] **T7.1.1** Add test script to package.json ✅
- [ ] **T7.1.2** Create `vitest.config.ts` configuration (optional - using ts-node)
- [x] **T7.1.3** Create `tests/encryption-service.test.ts` with polyfills ✅
- [x] **T7.1.4** Add ESLint test override for console statements ✅

### 7.2 Unit Tests
- [x] **T7.2.1** Create `tests/encryption-service.test.ts` (10 tests passing) ✅
- [ ] **T7.2.2** Create `tests/unit/crypto-utils.test.ts`
- [ ] **T7.2.3** Create `tests/unit/password-utils.test.ts`
- [ ] **T7.2.4** Create `tests/unit/directory-encryption.test.ts`
- [ ] **T7.2.5** Achieve 80%+ code coverage for utilities

### 7.3 Integration Tests
- [x] **T7.3.1** Encryption/decryption round-trip tested in encryption-service.test.ts ✅
- [ ] **T7.3.2** Create `tests/integration/batch-operations.test.ts`
- [ ] **T7.3.3** Test unicode and large content handling ✅ (in encryption-service.test.ts)
- [ ] **T7.3.4** Test error recovery scenarios

---

## Phase 8: Documentation & Polish
**Priority: 🟢 Low | Effort: ~4 hours**

### 8.1 Code Documentation
- [ ] **T8.1.1** Add JSDoc comments to all public methods
- [x] **T8.1.2** Update CLAUDE.md with new architecture ✅
- [x] **T8.1.3** Document directory encryption feature in README ✅
- [ ] **T8.1.4** Add inline comments for complex crypto operations

### 8.2 User Documentation
- [x] **T8.2.1** Update README with new features (iterations, features list) ✅
- [x] **T8.2.2** Add directory encryption usage guide ✅
- [ ] **T8.2.3** Document security best practices
- [ ] **T8.2.4** Add troubleshooting section

---

## Quick Reference: Task Dependencies

```
T2.2.* (Utilities) ─┬─► T2.1.* (Extract from main.ts)
                    ├─► T2.3.* (Consolidate encryption)
                    └─► T3.1.* (Directory encryption)

T1.1.* (Dead code) ─► T6.1.* (Strict TypeScript)

T2.1.* (Extract) ──► T7.2.* (Unit tests)

T3.1.* (Directory) ─► T3.2.* (UI) ─► T3.3.* (Commands)
```

---

## Recommended Implementation Order

### Sprint 1 (Days 1-2): Foundation
- [ ] T1.1.1 - T1.1.5 (Dead code removal)
- [ ] T2.2.1 - T2.2.5 (Create utilities)
- [ ] T5.1.1 - T5.1.3 (Quick performance wins)

### Sprint 2 (Days 3-5): Core Refactoring
- [ ] T2.1.1 - T2.1.6 (Extract from main.ts)
- [ ] T2.3.1 - T2.3.5 (Consolidate encryption)
- [ ] T1.2.1 - T1.2.5 (Eliminate duplicates)

### Sprint 3 (Days 6-8): Directory Encryption
- [ ] T3.1.1 - T3.1.6 (Core implementation)
- [ ] T3.2.1 - T3.2.6 (UI)
- [ ] T3.3.1 - T3.3.6 (Commands & settings)

### Sprint 4 (Days 9-10): Security & Quality
- [ ] T4.1.1 - T4.1.5 (Crypto enhancements)
- [ ] T4.2.1 - T4.2.5 (Privacy settings)
- [ ] T6.1.1 - T6.1.5 (Strict TypeScript)

### Sprint 5 (Days 11-12): Testing & Polish
- [ ] T7.1.1 - T7.1.4 (Test setup)
- [ ] T7.2.1 - T7.2.5 (Unit tests)
- [ ] T8.1.1 - T8.2.4 (Documentation)

---

## Progress Tracking

| Phase | Total Tasks | Completed | Progress |
|-------|-------------|-----------|----------|
| Phase 1: Cleanup | 15 | 0 | ░░░░░░░░░░ 0% |
| Phase 2: Architecture | 17 | 0 | ░░░░░░░░░░ 0% |
| Phase 3: Directory Enc | 12 | 0 | ░░░░░░░░░░ 0% |
| Phase 4: Security | 10 | 0 | ░░░░░░░░░░ 0% |
| Phase 5: Performance | 10 | 0 | ░░░░░░░░░░ 0% |
| Phase 6: TypeScript | 15 | 0 | ░░░░░░░░░░ 0% |
| Phase 7: Testing | 13 | 0 | ░░░░░░░░░░ 0% |
| Phase 8: Documentation | 8 | 0 | ░░░░░░░░░░ 0% |
| **TOTAL** | **100** | **0** | ░░░░░░░░░░ **0%** |

---

*Last Updated: December 7, 2025*
