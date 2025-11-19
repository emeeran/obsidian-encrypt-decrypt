# Installation Guide for Note Encryptor Plugin

## Quick Install (Development/Testing)

### Prerequisites
- Node.js (v16 or higher)
- npm (comes with Node.js)
- Obsidian installed

### Step 1: Install Dependencies

Open a terminal in the plugin directory and run:

```bash
npm install
```

This will install all required dependencies including:
- TypeScript
- Obsidian API types
- esbuild (for building)
- ESLint (for code quality)

### Step 2: Build the Plugin

For a one-time build:
```bash
npm run build
```

For development (auto-rebuild on changes):
```bash
npm run dev
```

This will create a `main.js` file in the directory.

### Step 3: Install in Obsidian

**Option A: Manual Copy to Plugins Folder**

1. Locate your Obsidian vault's plugins folder:
   - Windows: `C:\Users\[YourUsername]\[VaultName]\.obsidian\plugins\`
   - Mac: `/Users/[YourUsername]/[VaultName]/.obsidian/plugins/`
   - Linux: `/home/[YourUsername]/[VaultName]/.obsidian/plugins/`

2. Create a new folder named `note-encryptor` inside the plugins folder

3. Copy these files into the new folder:
   - `main.js`
   - `manifest.json`
   - `styles.css`

**Option B: Symbolic Link (Easier for Development)**

Create a symbolic link from the plugin directory to your vault's plugins folder:

Windows (PowerShell as Administrator):
```powershell
New-Item -ItemType SymbolicLink -Path "C:\Users\[YourUsername]\[VaultName]\.obsidian\plugins\note-encryptor" -Target "C:\path\to\obsidian-note-encryptor"
```

Mac/Linux:
```bash
ln -s /path/to/obsidian-note-encryptor /Users/[YourUsername]/[VaultName]/.obsidian/plugins/note-encryptor
```

### Step 4: Enable the Plugin

1. Open Obsidian
2. Go to Settings (gear icon)
3. Navigate to Community Plugins
4. If needed, turn off Safe Mode
5. Click "Reload Plugins" or restart Obsidian
6. Find "Note Encryptor" in the plugin list
7. Toggle it on

### Step 5: Verify Installation

You should see:
- A lock icon 🔒 in the left ribbon
- "Note Encryptor" settings in the Settings panel
- Commands available in the Command Palette (Ctrl/Cmd + P):
  - "Encrypt current note"
  - "Decrypt current note"
  - "Encrypt/Decrypt current note"

## Development Tips

### Hot Reloading

If you're actively developing:

1. Run `npm run dev` in the plugin directory
2. Make changes to `main.ts`
3. In Obsidian, use Ctrl/Cmd + R to reload without restarting
4. Or use the Command Palette: "Reload app without saving"

### Debugging

1. Open Obsidian Developer Tools:
   - Windows/Linux: Ctrl + Shift + I
   - Mac: Cmd + Option + I

2. Check the Console tab for any errors or log messages

3. Add debug logging in your code:
   ```typescript
   console.log('Debug message', variable);
   ```

### Common Issues

**Plugin doesn't appear after installation:**
- Make sure `main.js`, `manifest.json`, and `styles.css` are in the correct folder
- Try restarting Obsidian completely
- Check that Safe Mode is off

**Build errors:**
- Run `npm install` again to ensure all dependencies are installed
- Check that you're using Node.js v16 or higher: `node --version`
- Delete `node_modules` folder and run `npm install` again

**"Cannot find module 'obsidian'" error:**
- Make sure you've run `npm install`
- Check that `obsidian` is listed in `package.json` devDependencies

## Testing the Plugin

### Basic Functionality Test

1. Create a test note with some content
2. Click the lock icon in the ribbon
3. Enter a test password (e.g., "testpassword123")
4. Confirm the password
5. Verify the note is encrypted (you'll see the encrypted format)
6. Click the lock icon again
7. Enter the same password
8. Verify the note is decrypted successfully

### Security Test

1. Encrypt a note with password "password1"
2. Try to decrypt with wrong password "password2"
3. Should show error: "Decryption failed: Wrong password or corrupted data"

## Publishing (Optional)

If you want to share your plugin with the Obsidian community:

1. Create a GitHub repository
2. Push your code
3. Create a release with:
   - `main.js`
   - `manifest.json`
   - `styles.css`
4. Submit to Obsidian Community Plugins:
   - Fork https://github.com/obsidianmd/obsidian-releases
   - Add your plugin to `community-plugins.json`
   - Submit a pull request

## Support

If you encounter issues:
1. Check the console for error messages
2. Verify all files are in the correct location
3. Try rebuilding: `npm run build`
4. Restart Obsidian completely

For more help, consult:
- [Obsidian Plugin Developer Docs](https://docs.obsidian.md/)
- [Obsidian Forum - Developers Section](https://forum.obsidian.md/c/developers-api/14)
