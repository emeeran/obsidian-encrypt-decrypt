/**
 * Note Encryptor - Settings Tab
 * Compact settings UI with collapsible drawers (loaded closed)
 */

import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import type { NoteEncryptorSettings } from '../types';
import { ENCRYPTION_PROFILES } from '../constants';
import { PASSWORD_PRESETS } from '../crypto/passwordGenerator';

interface NoteEncryptorPlugin extends Plugin {
    settings: NoteEncryptorSettings;
    saveSettings: () => Promise<void>;
    updateEncryptedViews: () => void;
}

export class NoteEncryptorSettingTab extends PluginSettingTab {
    private plugin: NoteEncryptorPlugin;

    constructor(app: App, plugin: NoteEncryptorPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass('note-encryptor-settings-v2');

        // Compact header with shortcuts inline
        const header = containerEl.createDiv('settings-header-v2');
        header.createEl('h2', { text: 'Note Encryptor' });
        const shortcuts = header.createDiv('shortcuts-inline');
        shortcuts.innerHTML = `<span class="kb">Ctrl+Shift+E</span> Encrypt · <span class="kb">Ctrl+Shift+D</span> Decrypt · <span class="kb">Ctrl+Shift+T</span> Toggle`;

        // Drawers (all closed by default)
        this.addDrawer(containerEl, 'Encryption', '🔐', this.encryptionContent());
        this.addDrawer(containerEl, 'Security', '🛡️', this.securityContent());
        this.addDrawer(containerEl, 'Generator', '🔑', this.generatorContent());
        this.addDrawer(containerEl, 'Display', '👁', this.displayContent());
        this.addDrawer(containerEl, 'Advanced', '⚡', this.advancedContent());

        // Minimal footer
        const footer = containerEl.createDiv('settings-footer-v2');
        footer.innerHTML = `AES-256-GCM · PBKDF2 · <a href="https://github.com/emeeran/obsidian-encrypt-decrypt" target="_blank">GitHub</a>`;
    }

    private addDrawer(container: HTMLElement, title: string, icon: string, contentFn: (el: HTMLElement) => void): void {
        const drawer = container.createDiv('drawer-v2');
        const header = drawer.createDiv('drawer-head');
        header.innerHTML = `<span class="dr-icon">${icon}</span><span class="dr-title">${title}</span><span class="dr-arrow">▸</span>`;

        const body = drawer.createDiv('drawer-body');
        body.style.display = 'none';

        header.onclick = () => {
            const open = body.style.display !== 'none';
            body.style.display = open ? 'none' : 'block';
            header.querySelector('.dr-arrow')!.textContent = open ? '▸' : '▾';
        };

        contentFn(body);
    }

    private encryptionContent(): (el: HTMLElement) => void {
        return (el: HTMLElement) => {
            // Profile selection - inline buttons
            const profiles = el.createDiv('profile-row');
            const items: Array<{k: 'fast'|'standard'|'paranoid'; l: string; d: string}> = [
                {k:'fast', l:'⚡ Fast', d:'100K'},
                {k:'standard', l:'🛡️ Standard', d:'310K'},
                {k:'paranoid', l:'🔐 Paranoid', d:'500K'}
            ];
            items.forEach(p => {
                const btn = profiles.createDiv('profile-btn');
                btn.textContent = p.l;
                btn.setAttribute('data-desc', p.d);
                if (this.plugin.settings.encryptionProfile === p.k) btn.addClass('active');
                btn.onclick = async () => {
                    this.plugin.settings.encryptionProfile = p.k;
                    this.plugin.settings.customIterations = ENCRYPTION_PROFILES[p.k].iterations;
                    await this.plugin.saveSettings();
                    this.display();
                };
            });

            new Setting(el).setName('Custom iterations').setDesc('0 = use profile')
                .addText(t => t.setPlaceholder('0').setValue(String(this.plugin.settings.customIterations))
                    .onChange(async v => { const n = parseInt(v); if(!isNaN(n)&&n>=0){ this.plugin.settings.customIterations=n; await this.plugin.saveSettings(); }}));
        };
    }

    private securityContent(): (el: HTMLElement) => void {
        return (el: HTMLElement) => {
            new Setting(el).setName('Min password length')
                .addSlider(s => s.setLimits(6,32,1).setValue(this.plugin.settings.passwordMinLength).setDynamicTooltip()
                    .onChange(async v => { this.plugin.settings.passwordMinLength=v; await this.plugin.saveSettings(); }));

            new Setting(el).setName('Integrity check').setDesc('Detect corruption')
                .addToggle(t => t.setValue(this.plugin.settings.enableIntegrityCheck).onChange(async v => { this.plugin.settings.enableIntegrityCheck=v; await this.plugin.saveSettings(); }));

            new Setting(el).setName('HMAC integrity').setDesc('Stronger verification')
                .addToggle(t => t.setValue(this.plugin.settings.useHmacIntegrity).onChange(async v => { this.plugin.settings.useHmacIntegrity=v; await this.plugin.saveSettings(); }));

            new Setting(el).setName('Rate limiting').setDesc('Block after failures')
                .addToggle(t => t.setValue(this.plugin.settings.enableRateLimiting).onChange(async v => { this.plugin.settings.enableRateLimiting=v; await this.plugin.saveSettings(); this.display(); }));

            if (this.plugin.settings.enableRateLimiting) {
                new Setting(el).setName('Max attempts')
                    .addSlider(s => s.setLimits(3,10,1).setValue(this.plugin.settings.rateLimitMaxAttempts).setDynamicTooltip()
                        .onChange(async v => { this.plugin.settings.rateLimitMaxAttempts=v; await this.plugin.saveSettings(); }));
            }

            new Setting(el).setName('Remember passwords')
                .addToggle(t => t.setValue(this.plugin.settings.enablePasswordMemory).onChange(async v => { this.plugin.settings.enablePasswordMemory=v; await this.plugin.saveSettings(); }));

            new Setting(el).setName('Preserve frontmatter')
                .addToggle(t => t.setValue(this.plugin.settings.preserveMetadata).onChange(async v => { this.plugin.settings.preserveMetadata=v; await this.plugin.saveSettings(); }));
        };
    }

    private generatorContent(): (el: HTMLElement) => void {
        return (el: HTMLElement) => {
            new Setting(el).setName('Length')
                .addSlider(s => s.setLimits(8,64,1).setValue(this.plugin.settings.passwordGeneratorLength).setDynamicTooltip()
                    .onChange(async v => { this.plugin.settings.passwordGeneratorLength=v; await this.plugin.saveSettings(); }));

            new Setting(el).setName('Preset')
                .addDropdown(d => { Object.entries(PASSWORD_PRESETS).forEach(([k,p]) => d.addOption(k,p.name));
                    d.setValue(this.plugin.settings.passwordGeneratorPreset).onChange(async v => { this.plugin.settings.passwordGeneratorPreset=v as any; await this.plugin.saveSettings(); });});

            const chars = el.createDiv('char-toggles');
            const opts = [
                ['Uppercase', 'passwordGeneratorIncludeUppercase'],
                ['Lowercase', 'passwordGeneratorIncludeLowercase'],
                ['Numbers', 'passwordGeneratorIncludeNumbers'],
                ['Symbols', 'passwordGeneratorIncludeSymbols']
            ] as const;
            opts.forEach(([n, k]) => {
                new Setting(chars).setName(n).addToggle(t => t.setValue(this.plugin.settings[k])
                    .onChange(async v => { (this.plugin.settings as any)[k]=v; await this.plugin.saveSettings(); }));
            });
        };
    }

    private displayContent(): (el: HTMLElement) => void {
        return (el: HTMLElement) => {
            new Setting(el).setName('Hide encrypted content').setDesc('Show lock overlay')
                .addToggle(t => t.setValue(this.plugin.settings.hideEncryptedContent).onChange(async v => { this.plugin.settings.hideEncryptedContent=v; await this.plugin.saveSettings(); this.plugin.updateEncryptedViews(); }));

            new Setting(el).setName('Strength indicator')
                .addToggle(t => t.setValue(this.plugin.settings.showPasswordStrength).onChange(async v => { this.plugin.settings.showPasswordStrength=v; await this.plugin.saveSettings(); }));

            new Setting(el).setName('Note prefix')
                .addText(t => t.setValue(this.plugin.settings.encryptedNotePrefix).onChange(async v => { this.plugin.settings.encryptedNotePrefix=v; await this.plugin.saveSettings(); }));

            new Setting(el).setName('Note suffix')
                .addText(t => t.setValue(this.plugin.settings.encryptedNoteSuffix).onChange(async v => { this.plugin.settings.encryptedNoteSuffix=v; await this.plugin.saveSettings(); }));

            new Setting(el).setName('Accessibility mode')
                .addToggle(t => t.setValue(this.plugin.settings.enableAccessibilityMode).onChange(async v => { this.plugin.settings.enableAccessibilityMode=v; await this.plugin.saveSettings(); }));
        };
    }

    private advancedContent(): (el: HTMLElement) => void {
        return (el: HTMLElement) => {
            new Setting(el).setName('Web Worker').setDesc('Background encryption')
                .addToggle(t => t.setValue(this.plugin.settings.useWebWorker).onChange(async v => { this.plugin.settings.useWebWorker=v; await this.plugin.saveSettings(); }));

            new Setting(el).setName('Key caching').setDesc('Faster repeat ops')
                .addToggle(t => t.setValue(this.plugin.settings.useKeyCaching).onChange(async v => { this.plugin.settings.useKeyCaching=v; await this.plugin.saveSettings(); }));

            new Setting(el).setName('Cache TTL (min)')
                .addSlider(s => s.setLimits(1,60,1).setValue(this.plugin.settings.keyCacheTtlMinutes).setDynamicTooltip()
                    .onChange(async v => { this.plugin.settings.keyCacheTtlMinutes=v; await this.plugin.saveSettings(); }));

            new Setting(el).setName('Circuit breaker').setDesc('Failure threshold')
                .addSlider(s => s.setLimits(1,20,1).setValue(this.plugin.settings.circuitBreakerFailureThreshold).setDynamicTooltip()
                    .onChange(async v => { this.plugin.settings.circuitBreakerFailureThreshold=v; await this.plugin.saveSettings(); }));

            new Setting(el).setName('Batch concurrency')
                .addSlider(s => s.setLimits(1,10,1).setValue(this.plugin.settings.batchConcurrency).setDynamicTooltip()
                    .onChange(async v => { this.plugin.settings.batchConcurrency=v; await this.plugin.saveSettings(); }));
        };
    }
}
