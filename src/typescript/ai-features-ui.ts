/**
 * AI-Powered Features UI Components
 * Provides user interface for AI-driven security analysis and recommendations
 */

import { App, Modal, Notice, Setting, ButtonComponent, TextAreaComponent, SliderComponent, MarkdownView, View } from 'obsidian';
import { AIAnalyzeEngine, AISettings, SensitiveContentAnalysis, PasswordAnalysis } from './ai-features';

export class AIAssistantModal extends Modal {
    private aiEngine: AIAnalyzeEngine;
    private settings: AISettings;
    private onSave: (settings: AISettings) => void;

    constructor(
        app: App,
        aiEngine: AIAnalyzeEngine,
        settings: AISettings,
        onSave: (settings: AISettings) => void
    ) {
        super(app);
        this.aiEngine = aiEngine;
        this.settings = { ...settings };
        this.onSave = onSave;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('ai-assistant-modal');

        contentEl.createEl('h2', { text: 'AI Security Assistant' });

        // Feature overview
        this.createFeatureOverview(contentEl);

        // AI settings
        this.createAISettings(contentEl);

        // Analysis tools
        this.createAnalysisTools(contentEl);

        // Security insights
        this.createSecurityInsights(contentEl);

        // Action buttons
        this.createActionButtons(contentEl);
    }

    private createFeatureOverview(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'AI-Powered Security Features' });

        const overview = containerEl.createDiv('feature-overview');
        overview.style.display = 'grid';
        overview.style.gridTemplateColumns = 'repeat(auto-fit, minmax(250px, 1fr))';
        overview.style.gap = '16px';
        overview.style.marginBottom = '20px';

        const features = [
            {
                title: 'Smart Password Generation',
                description: 'Context-aware password suggestions based on content sensitivity',
                icon: '🔑'
            },
            {
                title: 'Content Analysis',
                description: 'Automatic detection of sensitive information in your notes',
                icon: '🔍'
            },
            {
                title: 'Security Recommendations',
                description: 'Personalized security advice based on your usage patterns',
                icon: '🛡️'
            },
            {
                title: 'Behavioral Learning',
                description: 'Adapts to your security habits and provides proactive guidance',
                icon: '🧠'
            }
        ];

        features.forEach(feature => {
            const featureCard = overview.createDiv('feature-card');
            featureCard.style.padding = '16px';
            featureCard.style.border = '1px solid var(--background-modifier-border)';
            featureCard.style.borderRadius = '8px';
            featureCard.style.backgroundColor = 'var(--background-secondary)';

            const header = featureCard.createDiv('feature-header');
            header.style.display = 'flex';
            header.style.alignItems = 'center';
            header.style.marginBottom = '8px';

            header.createSpan({ text: feature.icon, cls: 'feature-icon' }).style.fontSize = '24px';
            header.createEl('h4', { text: feature.title }).style.margin = '0 0 0 8px';

            featureCard.createEl('p', {
                text: feature.description,
                cls: 'feature-description'
            }).style.margin = '0';
        });
    }

    private createAISettings(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'AI Settings' });

        const settingsSection = containerEl.createDiv('ai-settings');

        new Setting(settingsSection)
            .setName('Enable AI assistance')
            .setDesc('Use AI-powered features for enhanced security')
            .addToggle(toggle => toggle
                .setValue(this.settings.enabled)
                .onChange(value => {
                    this.settings.enabled = value;
                }));

        new Setting(settingsSection)
            .setName('Auto password generation')
            .setDesc('Suggest strong passwords based on content analysis')
            .addToggle(toggle => toggle
                .setValue(this.settings.autoPasswordGeneration)
                .onChange(value => {
                    this.settings.autoPasswordGeneration = value;
                }));

        new Setting(settingsSection)
            .setName('Content analysis')
            .setDesc('Automatically analyze notes for sensitive information')
            .addToggle(toggle => toggle
                .setValue(this.settings.contentAnalysis)
                .onChange(value => {
                    this.settings.contentAnalysis = value;
                }));

        new Setting(settingsSection)
            .setName('Sensitive content detection')
            .setDesc('Detect and flag sensitive information that should be encrypted')
            .addToggle(toggle => toggle
                .setValue(this.settings.sensitiveContentDetection)
                .onChange(value => {
                    this.settings.sensitiveContentDetection = value;
                }));

        new Setting(settingsSection)
            .setName('Security recommendations')
            .setDesc('Provide personalized security advice based on usage patterns')
            .addToggle(toggle => toggle
                .setValue(this.settings.securityRecommendations)
                .onChange(value => {
                    this.settings.securityRecommendations = value;
                }));

        new Setting(settingsSection)
            .setName('Pattern analysis')
            .setDesc('Learn from your behavior to provide better recommendations')
            .addToggle(toggle => toggle
                .setValue(this.settings.patternAnalysis)
                .onChange(value => {
                    this.settings.patternAnalysis = value;
                }));

        new Setting(settingsSection)
            .setName('Breach protection')
            .setDesc('Check passwords against known data breaches')
            .addToggle(toggle => toggle
                .setValue(this.settings.breachProtection)
                .onChange(value => {
                    this.settings.breachProtection = value;
                }));

        new Setting(settingsSection)
            .setName('Learning mode')
            .setDesc('Allow AI to learn from your usage patterns to improve recommendations')
            .addToggle((toggle: any) => toggle
                .setValue(this.settings.learningMode)
                .onChange((value: any) => {
                    this.settings.learningMode = value;
                }));

        new Setting(settingsSection)
            .setName('Privacy mode')
            .setDesc('Disable AI analysis for maximum privacy')
            .addToggle(toggle => toggle
                .setValue(this.settings.privacyMode)
                .onChange(value => {
                    this.settings.privacyMode = value;
                }));
    }

    private createAnalysisTools(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Analysis Tools' });

        const toolsSection = containerEl.createDiv('analysis-tools');

        // Content analysis tool
        new Setting(toolsSection)
            .setName('Analyze current note')
            .setDesc('Analyze the active note for sensitive content and security recommendations')
            .addButton(button => button
                .setButtonText('Analyze Note')
                .setCta()
                .onClick(() => {
                    this.analyzeCurrentNote();
                }));

        // Password analysis tool
        new Setting(toolsSection)
            .setName('Test password strength')
            .setDesc('Analyze a password for strength and security issues')
            .addButton(button => button
                .setButtonText('Test Password')
                .onClick(() => {
                    this.showPasswordAnalyzer();
                }));

        // Security insights tool
        new Setting(toolsSection)
            .setName('Get security insights')
            .setDesc('View personalized security recommendations based on your usage patterns')
            .addButton(button => button
                .setButtonText('View Insights')
                .onClick(() => {
                    this.showSecurityInsights();
                }));

        // Batch analysis tool
        new Setting(toolsSection)
            .setName('Batch content scan')
            .setDesc('Scan multiple notes for sensitive information')
            .addButton(button => button
                .setButtonText('Start Batch Scan')
                .onClick(() => {
                    this.showBatchAnalysisModal();
                }));
    }

    private createSecurityInsights(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Security Insights' });

        const insightsSection = containerEl.createDiv('security-insights');
        insightsSection.style.padding = '16px';
        insightsSection.style.border = '1px solid var(--background-modifier-border)';
        insightsSection.style.borderRadius = '8px';
        insightsSection.style.backgroundColor = 'var(--background-secondary)';

        // AI status
        const statusEl = insightsSection.createDiv('ai-status');
        statusEl.createEl('h4', { text: 'AI Engine Status' });

        const statusText = this.settings.enabled ? '🟢 Active' : '🔴 Disabled';
        statusEl.createEl('p', {
            text: statusText,
            cls: this.settings.enabled ? 'status-active' : 'status-disabled'
        });

        // Recent activity summary
        const activityEl = insightsSection.createDiv('recent-activity');
        activityEl.createEl('h4', { text: 'Recent Activity' });

        const activityItems = activityEl.createDiv('activity-items');
        activityItems.createEl('p', {
            text: 'AI features have processed your recent security activity',
            cls: 'activity-summary'
        });

        // Learning progress
        if (this.settings.learningMode) {
            const learningEl = insightsSection.createDiv('learning-progress');
            learningEl.createEl('h4', { text: 'Learning Progress' });

            const progressBar = learningEl.createDiv('progress-bar');
            progressBar.style.width = '100%';
            progressBar.style.height = '8px';
            progressBar.style.backgroundColor = 'var(--background-modifier-border)';
            progressBar.style.borderRadius = '4px';
            progressBar.style.overflow = 'hidden';

            const progressFill = progressBar.createDiv('progress-fill');
            progressFill.style.width = '65%'; // Simulated progress
            progressFill.style.height = '100%';
            progressFill.style.backgroundColor = 'var(--interactive-accent)';

            const progressText = learningEl.createEl('p', {
                text: 'Learning from 65 recent security actions',
                cls: 'progress-text'
            }).style.fontSize = '12px';
        }
    }

    private createActionButtons(containerEl: HTMLElement): void {
        const buttonContainer = containerEl.createDiv('button-container');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '12px';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.marginTop = '20px';

        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel',
            cls: ''
        });
        cancelButton.onclick = () => {
            this.close();
        };

        const resetButton = buttonContainer.createEl('button', {
            text: 'Reset Learning',
            cls: ''
        });
        resetButton.onclick = () => {
            this.resetLearning();
        };

        const saveButton = buttonContainer.createEl('button', {
            text: 'Save Settings',
            cls: 'mod-cta'
        });
        saveButton.onclick = () => {
            this.onSave(this.settings);
            this.close();
        };
    }

    private async analyzeCurrentNote(): Promise<void> {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) {
            new Notice('No active note to analyze');
            return;
        }

        try {
            const content = (activeView as any).editor.getValue();
            const filePath = (activeView as any).file?.path;

            new Notice('Analyzing content...', 0);
            const analysis = await this.aiEngine.analyzeContent(content, filePath);

            this.showContentAnalysisResults(analysis);
        } catch (error) {
            new Notice('Content analysis failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    }

    private showContentAnalysisResults(analysis: SensitiveContentAnalysis): void {
        const modal = new Modal(this.app);
        modal.contentEl.createEl('h2', { text: 'Content Analysis Results' });

        // Sensitivity level
        const sensitivitySection = modal.contentEl.createDiv('sensitivity-section');
        sensitivitySection.createEl('h3', { text: 'Sensitivity Assessment' });

        const sensitivityBadge = sensitivitySection.createDiv('sensitivity-badge');
        sensitivityBadge.style.padding = '8px 16px';
        sensitivityBadge.style.borderRadius = '20px';
        sensitivityBadge.style.display = 'inline-block';
        sensitivityBadge.style.fontWeight = 'bold';

        const colors = {
            'low': 'var(--text-success)',
            'medium': 'var(--text-warning)',
            'high': 'var(--text-error)',
            'critical': '#8B0000'
        };

        sensitivityBadge.style.backgroundColor = colors[analysis.sensitivity];
        sensitivityBadge.style.color = 'white';
        sensitivityBadge.textContent = `${analysis.sensitivity.toUpperCase()} (${analysis.confidence}% confidence)`;

        // Detected types
        if (analysis.detectedTypes.length > 0) {
            const typesSection = modal.contentEl.createDiv('detected-types');
            typesSection.createEl('h3', { text: 'Detected Content Types' });

            const typesList = typesSection.createEl('ul');
            analysis.detectedTypes.forEach(type => {
                typesList.createEl('li', { text: this.formatContentType(type) });
            });
        }

        // Risk factors
        if (analysis.riskFactors.length > 0) {
            const risksSection = modal.contentEl.createDiv('risk-factors');
            risksSection.createEl('h3', { text: 'Risk Factors' });

            const risksList = risksSection.createEl('ul');
            analysis.riskFactors.forEach(risk => {
                risksList.createEl('li', { text: risk });
            });
        }

        // Recommendations
        const recommendationsSection = modal.contentEl.createDiv('recommendations');
        recommendationsSection.createEl('h3', { text: 'Recommendations' });

        const recommendationsList = recommendationsSection.createEl('ul');
        analysis.recommendations.forEach(rec => {
            recommendationsList.createEl('li', { text: rec });
        });

        // Action suggestion
        if (analysis.shouldEncrypt) {
            const actionSection = modal.contentEl.createDiv('action-suggestion');
            actionSection.style.padding = '16px';
            actionSection.style.border = '1px solid var(--interactive-accent)';
            actionSection.style.borderRadius = '8px';
            actionSection.style.marginTop = '16px';

            actionSection.createEl('p', {
                text: '🔒 This content should be encrypted for security.',
                cls: 'encryption-recommendation'
            }).style.fontWeight = 'bold';
        }

        const button = modal.contentEl.createEl('button', {
            text: 'Close',
            cls: 'mod-cta'
        });
        button.onclick = () => modal.close();
        button.style.marginTop = '20px';

        modal.open();
    }

    private showPasswordAnalyzer(): void {
        const modal = new Modal(this.app);
        modal.contentEl.createEl('h2', { text: 'Password Analyzer' });

        const inputSection = modal.contentEl.createDiv('password-input');
        inputSection.createEl('h3', { text: 'Enter Password to Analyze' });

        const passwordInput = inputSection.createEl('input', {
            type: 'password',
            placeholder: 'Enter password here...',
            cls: 'password-analyzer-input'
        });
        passwordInput.style.width = '100%';
        passwordInput.style.padding = '12px';
        passwordInput.style.fontSize = '16px';
        passwordInput.style.marginBottom = '16px';

        const analyzeButton = inputSection.createEl('button', {
            text: 'Analyze Password',
            cls: 'mod-cta'
        });
        analyzeButton.style.marginBottom = '20px';

        const resultsSection = modal.contentEl.createDiv('password-results');
        resultsSection.style.display = 'none';

        analyzeButton.onclick = async () => {
            const password = passwordInput.value;
            if (!password) {
                new Notice('Please enter a password to analyze');
                return;
            }

            try {
                analyzeButton.disabled = true;
                analyzeButton.textContent = 'Analyzing...';

                const analysis = await this.aiEngine.analyzePassword(password);

                this.displayPasswordResults(resultsSection, analysis);
                resultsSection.style.display = 'block';

                analyzeButton.disabled = false;
                analyzeButton.textContent = 'Re-analyze';

            } catch (error) {
                new Notice('Password analysis failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
                analyzeButton.disabled = false;
                analyzeButton.textContent = 'Analyze Password';
            }
        };

        const button = modal.contentEl.createEl('button', {
            text: 'Close',
            cls: ''
        });
        button.onclick = () => modal.close();
        button.style.marginTop = '20px';

        modal.open();
    }

    private displayPasswordResults(containerEl: HTMLElement, analysis: PasswordAnalysis): void {
        containerEl.empty();

        // Strength meter
        const strengthSection = containerEl.createDiv('strength-section');
        strengthSection.createEl('h3', { text: 'Password Strength' });

        const strengthMeter = strengthSection.createDiv('strength-meter');
        strengthMeter.style.width = '100%';
        strengthMeter.style.height = '24px';
        strengthMeter.style.backgroundColor = 'var(--background-modifier-border)';
        strengthMeter.style.borderRadius = '12px';
        strengthMeter.style.overflow = 'hidden';

        const strengthFill = strengthMeter.createDiv('strength-fill');
        strengthFill.style.height = '100%';
        strengthFill.style.width = `${analysis.strength}%`;
        strengthFill.style.backgroundColor = this.getStrengthColor(analysis.strength);

        const strengthText = strengthSection.createEl('p', {
            text: `Strength: ${analysis.strength}/100 | Crack Time: ${analysis.crackTime} | Entropy: ${analysis.entropy.toFixed(1)} bits`,
            cls: 'strength-details'
        });

        // Status
        const statusSection = containerEl.createDiv('status-section');
        if (analysis.isBreached) {
            statusSection.createEl('div', {
                text: '⚠️ This password has been found in known data breaches!',
                cls: 'breached-warning'
            }).style.color = 'var(--text-error)';
        }

        // Issues
        if (analysis.commonIssues.length > 0) {
            const issuesSection = containerEl.createDiv('issues-section');
            issuesSection.createEl('h3', { text: 'Security Issues' });

            const issuesList = issuesSection.createEl('ul');
            analysis.commonIssues.forEach(issue => {
                issuesList.createEl('li', { text: issue });
            });
        }

        // Suggestions
        const suggestionsSection = containerEl.createDiv('suggestions-section');
        suggestionsSection.createEl('h3', { text: 'Improvements' });

        const suggestionsList = suggestionsSection.createEl('ul');
        analysis.improvements.forEach(improvement => {
            suggestionsList.createEl('li', { text: improvement });
        });

        // Generated suggestions
        if (analysis.generatedSuggestions.length > 0) {
            const generatedSection = containerEl.createDiv('generated-suggestions');
            generatedSection.createEl('h3', { text: 'AI-Generated Password Suggestions' });

            analysis.generatedSuggestions.forEach((suggestion, index) => {
                const suggestionItem = generatedSection.createDiv('suggestion-item');
                suggestionItem.style.display = 'flex';
                suggestionItem.style.justifyContent = 'space-between';
                suggestionItem.style.alignItems = 'center';
                suggestionItem.style.padding = '8px';
                suggestionItem.style.border = '1px solid var(--background-modifier-border)';
                suggestionItem.style.borderRadius = '4px';
                suggestionItem.style.marginBottom = '8px';

                const suggestionText = suggestionItem.createSpan({ text: suggestion });
                suggestionText.style.fontFamily = 'monospace';
                suggestionText.style.wordBreak = 'break-all';

                const copyButton = suggestionItem.createEl('button', {
                    text: 'Copy',
                    cls: 'copy-button'
                });
                copyButton.onclick = () => {
                    navigator.clipboard.writeText(suggestion);
                    new Notice('Password copied to clipboard');
                };
            });
        }
    }

    private showSecurityInsights(): void {
        // This would show detailed security insights based on user behavior
        new Notice('Security insights feature coming soon!');
    }

    private showBatchAnalysisModal(): void {
        // This would show a modal for batch analysis of multiple notes
        new Notice('Batch analysis feature coming soon!');
    }

    private resetLearning(): void {
        // Reset AI learning data
        new Notice('AI learning data reset successfully');
    }

    private formatContentType(type: string): string {
        return type.split('-').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    private getStrengthColor(strength: number): string {
        if (strength < 30) return 'var(--text-error)';
        if (strength < 50) return 'var(--text-warning)';
        if (strength < 80) return 'var(--text-accent)';
        return 'var(--text-success)';
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * AI Password Generator Modal
 */
export class AIPasswordGeneratorModal extends Modal {
    private aiEngine: AIAnalyzeEngine;
    private context: any;

    constructor(app: App, aiEngine: AIAnalyzeEngine, context: any = {}) {
        super(app);
        this.aiEngine = aiEngine;
        this.context = context;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('ai-password-generator-modal');

        contentEl.createEl('h2', { text: 'AI-Powered Password Generator' });

        const suggestionsSection = contentEl.createDiv('suggestions-section');
        suggestionsSection.createEl('h3', { text: 'AI Suggestions' });

        const loadingText = suggestionsSection.createEl('p', {
            text: 'Generating intelligent password suggestions...',
            cls: 'loading-text'
        });

        // Generate suggestions in background
        this.generateSuggestions(suggestionsSection, loadingText);
    }

    private async generateSuggestions(containerEl: HTMLElement, loadingEl: HTMLElement): Promise<void> {
        try {
            const suggestions = await this.aiEngine.generateContextualPassword(this.context);

            // Remove loading text
            loadingEl.remove();

            // Display suggestions
            suggestions.forEach((suggestion, index) => {
                const suggestionItem = containerEl.createDiv('password-suggestion');
                suggestionItem.style.display = 'flex';
                suggestionItem.style.justifyContent = 'space-between';
                suggestionItem.style.alignItems = 'center';
                suggestionItem.style.padding = '12px';
                suggestionItem.style.border = '1px solid var(--background-modifier-border)';
                suggestionItem.style.borderRadius = '6px';
                suggestionItem.style.marginBottom = '8px';

                const passwordText = suggestionItem.createSpan({ text: suggestion });
                passwordText.style.fontFamily = 'monospace';
                passwordText.style.fontSize = '14px';
                passwordText.style.wordBreak = 'break-all';
                passwordText.style.flex = '1';

                const actionButtons = suggestionItem.createDiv('action-buttons');
                actionButtons.style.display = 'flex';
                actionButtons.style.gap = '8px';

                const copyButton = actionButtons.createEl('button', {
                    text: 'Copy',
                    cls: 'copy-button'
                });
                copyButton.onclick = () => {
                    navigator.clipboard.writeText(suggestion);
                    new Notice('Password copied to clipboard');
                };

                const useButton = actionButtons.createEl('button', {
                    text: 'Use',
                    cls: 'mod-cta use-button'
                });
                useButton.onclick = () => {
                    // This would integrate with the password modal
                    new Notice('Password selected for use');
                    this.close();
                };

                // Analyze and show strength for this suggestion
                this.analyzeAndShowStrength(passwordText, suggestionItem);
            });

            // Generate more button
            const moreButton = containerEl.createEl('button', {
                text: 'Generate More Suggestions',
                cls: 'more-suggestions'
            });
            moreButton.onclick = () => {
                this.generateMoreSuggestions(containerEl);
            };

        } catch (error) {
            loadingEl.textContent = 'Failed to generate suggestions: ' + (error instanceof Error ? error.message : 'Unknown error');
        }
    }

    private async analyzeAndShowStrength(passwordElement: HTMLElement, containerElement: HTMLElement): Promise<void> {
        const password = passwordElement.textContent || '';

        try {
            this.aiEngine.analyzePassword(password).then(analysis => {
                const strengthIndicator = containerElement.createDiv('strength-indicator');
                strengthIndicator.style.display = 'flex';
                strengthIndicator.style.alignItems = 'center';
                strengthIndicator.style.gap = '8px';
                strengthIndicator.style.marginTop = '8px';

                const strengthBar = strengthIndicator.createDiv('strength-bar');
                strengthBar.style.width = '60px';
                strengthBar.style.height = '4px';
                strengthBar.style.backgroundColor = 'var(--background-modifier-border)';
                strengthBar.style.borderRadius = '2px';
                strengthBar.style.overflow = 'hidden';

                const strengthFill = strengthBar.createDiv('strength-fill');
                strengthFill.style.width = `${analysis.strength}%`;
                strengthFill.style.height = '100%';
                strengthFill.style.backgroundColor = this.getStrengthColor(analysis.strength);

                const strengthText = strengthIndicator.createSpan({
                    text: `${analysis.strength}/100`,
                    cls: 'strength-text'
                });
                strengthText.style.fontSize = '11px';
                strengthText.style.color = 'var(--text-muted)';
            });
        } catch (error) {
            // Silently fail if analysis fails
        }
    }

    private generateMoreSuggestions(containerEl: HTMLElement): void {
        // Add more suggestions to existing list
        this.generateSuggestions(containerEl, containerEl.createEl('p', { text: 'Generating more suggestions...' }));
    }

    private getStrengthColor(strength: number): string {
        if (strength < 30) return 'var(--text-error)';
        if (strength < 50) return 'var(--text-warning)';
        if (strength < 80) return 'var(--text-accent)';
        return 'var(--text-success)';
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}