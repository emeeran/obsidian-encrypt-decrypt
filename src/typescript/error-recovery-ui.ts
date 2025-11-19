/**
 * Error Recovery UI Components
 * Provides user interface for error management, diagnostics, and recovery options
 */

import { App, Modal, Notice, Setting, ButtonComponent, TextAreaComponent } from 'obsidian';
import { AdvancedErrorRecovery, ErrorRecoverySettings, ErrorInfo, ErrorCategory, ErrorSeverity } from './error-recovery';

export class ErrorDiagnosticsModal extends Modal {
    private errorRecovery: AdvancedErrorRecovery;
    private settings: ErrorRecoverySettings;
    private onSave: (settings: ErrorRecoverySettings) => void;

    constructor(
        app: App,
        errorRecovery: AdvancedErrorRecovery,
        settings: ErrorRecoverySettings,
        onSave: (settings: ErrorRecoverySettings) => void
    ) {
        super(app);
        this.errorRecovery = errorRecovery;
        this.settings = { ...settings };
        this.onSave = onSave;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('error-diagnostics-modal');

        contentEl.createEl('h2', { text: 'Error Recovery & Diagnostics' });

        // Error statistics
        this.createErrorStatistics(contentEl);

        // Recovery settings
        this.createRecoverySettings(contentEl);

        // Error log viewer
        this.createErrorLogViewer(contentEl);

        // Export and actions
        this.createActionsSection(contentEl);
    }

    private createErrorStatistics(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Error Statistics' });

        const stats = this.errorRecovery.getErrorStats();
        const statsContainer = containerEl.createDiv('error-stats');

        const statsGrid = statsContainer.createDiv('stats-grid');
        statsGrid.style.display = 'grid';
        statsGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
        statsGrid.style.gap = '12px';
        statsGrid.style.marginBottom = '20px';

        // Total errors
        this.createStatCard(statsGrid, 'Total Errors', stats.total.toString(), 'var(--text-normal)');

        // Recovery rate
        this.createStatCard(statsGrid, 'Recovery Rate', `${stats.recoveryRate.toFixed(1)}%`,
            stats.recoveryRate > 80 ? 'var(--text-success)' : stats.recoveryRate > 50 ? 'var(--text-warning)' : 'var(--text-error)');

        // Errors by category
        const categorySection = statsContainer.createDiv('category-stats');
        categorySection.createEl('h4', { text: 'Errors by Category' });

        const categoryList = categorySection.createDiv('category-list');
        Object.entries(stats.byCategory).forEach(([category, count]) => {
            if (count > 0) {
                const categoryItem = categoryList.createDiv('category-item');
                categoryItem.style.display = 'flex';
                categoryItem.style.justifyContent = 'space-between';
                categoryItem.style.padding = '4px 0';

                categoryItem.createSpan({ text: this.formatCategoryName(category as ErrorCategory) });
                categoryItem.createSpan({ text: count.toString(), cls: 'category-count' });
            }
        });

        // Recent errors
        const recentSection = statsContainer.createDiv('recent-errors');
        recentSection.createEl('h4', { text: 'Recent Errors' });

        if (stats.recent.length === 0) {
            recentSection.createEl('p', { text: 'No recent errors', cls: 'no-errors' });
        } else {
            const recentList = recentSection.createDiv('recent-list');
            recentList.style.maxHeight = '200px';
            recentList.style.overflowY = 'auto';

            stats.recent.slice(0, 5).forEach(error => {
                this.createErrorSummaryItem(recentList, error);
            });
        }
    }

    private createStatCard(container: HTMLElement, title: string, value: string, color: string): void {
        const card = container.createDiv('stat-card');
        card.style.padding = '12px';
        card.style.border = '1px solid var(--background-modifier-border)';
        card.style.borderRadius = '6px';
        card.style.backgroundColor = 'var(--background-secondary)';

        const titleEl = card.createDiv('stat-title');
        titleEl.textContent = title;
        titleEl.style.fontSize = '12px';
        titleEl.style.color = 'var(--text-muted)';
        titleEl.style.marginBottom = '4px';

        const valueEl = card.createDiv('stat-value');
        valueEl.textContent = value;
        valueEl.style.fontSize = '24px';
        valueEl.style.fontWeight = 'bold';
        valueEl.style.color = color;
    }

    private createErrorSummaryItem(container: HTMLElement, error: ErrorInfo): void {
        const item = container.createDiv('error-summary-item');
        item.style.padding = '8px';
        item.style.borderBottom = '1px solid var(--background-modifier-border)';
        item.style.cursor = 'pointer';

        const header = item.createDiv('error-header');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';

        const message = header.createSpan({ text: error.message, cls: 'error-message' });
        message.style.flex = '1';
        message.style.marginRight = '8px';
        message.style.overflow = 'hidden';
        message.style.textOverflow = 'ellipsis';
        message.style.whiteSpace = 'nowrap';

        const severityBadge = header.createSpan({
            text: error.severity.toUpperCase(),
            cls: `severity-badge severity-${error.severity}`
        });
        this.styleSeverityBadge(severityBadge, error.severity);

        const meta = item.createDiv('error-meta');
        meta.style.fontSize = '11px';
        meta.style.color = 'var(--text-muted)';
        meta.style.display = 'flex';
        meta.style.justifyContent = 'space-between';
        meta.style.marginTop = '4px';

        meta.createSpan({ text: this.formatCategoryName(error.category) });
        meta.createSpan({ text: this.formatRelativeTime(error.timestamp) });

        item.onclick = () => {
            this.showErrorDetailsModal(error);
        };
    }

    private createRecoverySettings(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Recovery Settings' });

        const settingsContainer = containerEl.createDiv('recovery-settings');

        new Setting(settingsContainer)
            .setName('Enable auto-recovery')
            .setDesc('Automatically attempt to recover from errors')
            .addToggle(toggle => toggle
                .setValue(this.settings.enableAutoRecovery)
                .onChange(value => {
                    this.settings.enableAutoRecovery = value;
                }));

        new Setting(settingsContainer)
            .setName('Max retry attempts')
            .setDesc('Maximum number of automatic retry attempts')
            .addSlider(slider => slider
                .setLimits(1, 10, 1)
                .setValue(this.settings.maxRetryAttempts)
                .setDynamicTooltip()
                .onChange(value => {
                    this.settings.maxRetryAttempts = value;
                }));

        new Setting(settingsContainer)
            .setName('Retry delay (seconds)')
            .setDesc('Delay between retry attempts')
            .addSlider(slider => slider
                .setLimits(1, 60, 1)
                .setValue(this.settings.retryDelay / 1000)
                .setDynamicTooltip()
                .onChange(value => {
                    this.settings.retryDelay = value * 1000;
                }));

        new Setting(settingsContainer)
            .setName('Enable error reporting')
            .setDesc('Send anonymous error reports to improve the plugin')
            .addToggle(toggle => toggle
                .setValue(this.settings.enableErrorReporting)
                .onChange(value => {
                    this.settings.enableErrorReporting = value;
                }));

        new Setting(settingsContainer)
            .setName('Enable error logging')
            .setDesc('Keep a local log of errors for diagnostics')
            .addToggle(toggle => toggle
                .setValue(this.settings.enableErrorLogging)
                .onChange(value => {
                    this.settings.enableErrorLogging = value;
                }));

        new Setting(settingsContainer)
            .setName('Enable crash recovery')
            .setDesc('Attempt to recover from application crashes')
            .addToggle(toggle => toggle
                .setValue(this.settings.enableCrashRecovery)
                .onChange(value => {
                    this.settings.enableCrashRecovery = value;
                }));

        new Setting(settingsContainer)
            .setName('Auto-backup enabled')
            .setDesc('Create automatic backups before risky operations')
            .addToggle(toggle => toggle
                .setValue(this.settings.autoBackupEnabled)
                .onChange(value => {
                    this.settings.autoBackupEnabled = value;
                }));
    }

    private createErrorLogViewer(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Error Log' });

        const logContainer = containerEl.createDiv('error-log-container');

        const logControls = logContainer.createDiv('log-controls');
        logControls.style.display = 'flex';
        logControls.style.justifyContent = 'space-between';
        logControls.style.alignItems = 'center';
        logControls.style.marginBottom = '12px';

        const clearButton = logControls.createEl('button', {
            text: 'Clear Log',
            cls: ''
        });
        clearButton.onclick = () => {
            this.errorRecovery.clearErrorLog();
            this.createErrorLogViewer(containerEl); // Refresh
            new Notice('Error log cleared');
        };

        const exportButton = logControls.createEl('button', {
            text: 'Export Log',
            cls: 'mod-cta'
        });
        exportButton.onclick = () => {
            this.exportErrorLog();
        };

        const logContent = logContainer.createDiv('log-content');
        logContent.style.maxHeight = '300px';
        logContent.style.overflowY = 'auto';
        logContent.style.border = '1px solid var(--background-modifier-border)';
        logContent.style.borderRadius = '4px';
        logContent.style.padding = '8px';

        const errors = this.errorRecovery.getErrorLog();
        if (errors.length === 0) {
            logContent.createEl('p', {
                text: 'No errors logged',
                cls: 'empty-log'
            });
        } else {
            errors.forEach(error => {
                this.createDetailedErrorItem(logContent, error);
            });
        }
    }

    private createDetailedErrorItem(container: HTMLElement, error: ErrorInfo): void {
        const item = container.createDiv('detailed-error-item');
        item.style.marginBottom = '16px';
        item.style.padding = '12px';
        item.style.border = '1px solid var(--background-modifier-border)';
        item.style.borderRadius = '4px';
        item.style.backgroundColor = 'var(--background-secondary)';

        const header = item.createDiv('error-header');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '8px';

        const message = header.createSpan({ text: error.message, cls: 'error-message' });
        message.style.fontWeight = 'bold';

        const timestamp = header.createSpan({
            text: this.formatTimestamp(error.timestamp),
            cls: 'error-timestamp'
        });
        timestamp.style.fontSize = '12px';
        timestamp.style.color = 'var(--text-muted)';

        const meta = item.createDiv('error-meta');
        meta.style.display = 'flex';
        meta.style.gap = '12px';
        meta.style.marginBottom = '8px';
        meta.style.fontSize = '12px';

        meta.createSpan({ text: `Category: ${this.formatCategoryName(error.category)}` });
        meta.createSpan({ text: `Severity: ${error.severity.toUpperCase()}` });
        meta.createSpan({ text: `Retries: ${error.retryCount}/${error.maxRetries}` });

        if (error.suggestedActions.length > 0) {
            const suggestionsSection = item.createDiv('suggestions-section');
            suggestionsSection.createEl('h5', { text: 'Suggestions:' });
            const suggestionsList = suggestionsSection.createEl('ul');
            suggestionsList.style.margin = '4px 0';
            suggestionsList.style.paddingLeft = '20px';

            error.suggestedActions.forEach(suggestion => {
                suggestionsList.createEl('li', { text: suggestion });
            });
        }

        const technicalDetails = item.createEl('details', { cls: 'error-technical-details' });
        technicalDetails.createEl('summary', { text: 'Technical Details' });
        const pre = technicalDetails.createEl('pre');
        pre.style.fontSize = '11px';
        pre.style.maxHeight = '100px';
        pre.style.overflow = 'auto';
        pre.style.backgroundColor = 'var(--background-primary)';
        pre.style.padding = '8px';
        pre.style.borderRadius = '4px';
        pre.style.whiteSpace = 'pre-wrap';
        pre.textContent = error.technicalDetails;
    }

    private createActionsSection(containerEl: HTMLElement): void {
        containerEl.createEl('h3', { text: 'Actions' });

        const actionsContainer = containerEl.createDiv('actions-container');
        actionsContainer.style.display = 'flex';
        actionsContainer.style.flexDirection = 'column';
        actionsContainer.style.gap = '12px';

        // Test error recovery
        new Setting(actionsContainer)
            .setName('Test error recovery')
            .setDesc('Simulate an error to test recovery mechanisms')
            .addButton(button => button
                .setButtonText('Test Recovery')
                .onClick(() => {
                    this.testErrorRecovery();
                }));

        // Reset to defaults
        new Setting(actionsContainer)
            .setName('Reset to defaults')
            .setDesc('Reset all recovery settings to default values')
            .addButton(button => button
                .setButtonText('Reset Settings')
                .setWarning()
                .onClick(() => {
                    this.resetToDefaults();
                }));

        // Save settings button
        const saveButtonContainer = actionsContainer.createDiv('save-button-container');
        saveButtonContainer.style.marginTop = '20px';
        saveButtonContainer.style.display = 'flex';
        saveButtonContainer.style.justifyContent = 'flex-end';

        const saveButton = saveButtonContainer.createEl('button', {
            text: 'Save Settings',
            cls: 'mod-cta'
        });
        saveButton.onclick = () => {
            this.onSave(this.settings);
            this.close();
        };

        const cancelButton = saveButtonContainer.createEl('button', {
            text: 'Cancel',
            cls: ''
        });
        cancelButton.onclick = () => {
            this.close();
        };
    }

    private showErrorDetailsModal(error: ErrorInfo): void {
        const modal = new Modal(this.app);
        modal.contentEl.createEl('h2', { text: 'Error Details' });

        const detailsContainer = modal.contentEl.createDiv('error-details');

        this.createDetailedErrorItem(detailsContainer, error);

        const button = modal.contentEl.createEl('button', {
            text: 'Close',
            cls: 'mod-cta'
        });
        button.onclick = () => modal.close();
        button.style.marginTop = '20px';

        modal.open();
    }

    private async testErrorRecovery(): Promise<void> {
        try {
            // Simulate a recoverable error
            const testError = new Error('This is a test error for recovery testing');
            const result = await this.errorRecovery.handleError(testError, {
                operation: 'test',
                recoverable: true
            });

            if (result.success) {
                new Notice('Recovery test successful');
            } else {
                new Notice(`Recovery test failed: ${result.message}`);
            }
        } catch (error) {
            new Notice(`Recovery test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    private resetToDefaults(): void {
        const defaultSettings: ErrorRecoverySettings = {
            enableAutoRecovery: true,
            maxRetryAttempts: 3,
            retryDelay: 2000,
            enableErrorReporting: false,
            enableErrorLogging: true,
            enableCrashRecovery: true,
            autoBackupEnabled: true,
            backupRetentionDays: 30
        };

        this.settings = { ...defaultSettings };
        this.onOpen(); // Refresh the modal
        new Notice('Settings reset to defaults');
    }

    private exportErrorLog(): void {
        const report = this.errorRecovery.exportErrorReport();
        const blob = new Blob([report], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `obsidian-encryptor-error-report-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        new Notice('Error report exported successfully');
    }

    private styleSeverityBadge(badge: HTMLElement, severity: ErrorSeverity): void {
        badge.style.fontSize = '10px';
        badge.style.padding = '2px 6px';
        badge.style.borderRadius = '12px';
        badge.style.fontWeight = 'bold';
        badge.style.textTransform = 'uppercase';

        switch (severity) {
            case ErrorSeverity.LOW:
                badge.style.backgroundColor = 'var(--background-modifier-success)';
                badge.style.color = 'var(--text-success)';
                break;
            case ErrorSeverity.MEDIUM:
                badge.style.backgroundColor = 'var(--background-modifier-warning)';
                badge.style.color = 'var(--text-warning)';
                break;
            case ErrorSeverity.HIGH:
                badge.style.backgroundColor = 'var(--background-modifier-error)';
                badge.style.color = 'var(--text-error)';
                break;
            case ErrorSeverity.CRITICAL:
                badge.style.backgroundColor = 'var(--background-modifier-error-hover)';
                badge.style.color = 'var(--text-error)';
                badge.style.animation = 'pulse 2s infinite';
                break;
        }
    }

    private formatCategoryName(category: ErrorCategory): string {
        return category.split('_').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    private formatSeverityName(severity: ErrorSeverity): string {
        return severity.charAt(0).toUpperCase() + severity.slice(1);
    }

    private formatTimestamp(date: Date): string {
        return date.toLocaleString();
    }

    private formatRelativeTime(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minutes ago`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hours ago`;

        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} days ago`;
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * Error recovery status display component
 */
export class ErrorRecoveryStatusDisplay {
    private containerEl: HTMLElement;
    private errorRecovery: AdvancedErrorRecovery;

    constructor(containerEl: HTMLElement, errorRecovery: AdvancedErrorRecovery) {
        this.containerEl = containerEl;
        this.errorRecovery = errorRecovery;
    }

    update(): void {
        this.containerEl.empty();
        this.containerEl.addClass('error-recovery-status');

        const stats = this.errorRecovery.getErrorStats();

        // Status indicator
        const statusContainer = this.containerEl.createDiv('recovery-status');
        statusContainer.style.display = 'flex';
        statusContainer.style.alignItems = 'center';
        statusContainer.style.gap = '8px';
        statusContainer.style.marginBottom = '12px';

        const statusIcon = statusContainer.createSpan();
        const statusText = statusContainer.createSpan();

        if (stats.recent.length === 0) {
            statusIcon.textContent = '✅';
            statusText.textContent = 'No recent errors';
            statusText.style.color = 'var(--text-success)';
        } else if (stats.recoveryRate > 80) {
            statusIcon.textContent = '⚡';
            statusText.textContent = `Good recovery rate (${stats.recoveryRate.toFixed(0)}%)`;
            statusText.style.color = 'var(--text-success)';
        } else {
            statusIcon.textContent = '⚠️';
            statusText.textContent = `Low recovery rate (${stats.recoveryRate.toFixed(0)}%)`;
            statusText.style.color = 'var(--text-warning)';
        }

        // Quick stats
        const quickStats = this.containerEl.createDiv('quick-stats');
        quickStats.style.display = 'grid';
        quickStats.style.gridTemplateColumns = 'repeat(2, 1fr)';
        quickStats.style.gap = '8px';
        quickStats.style.fontSize = '12px';

        quickStats.createDiv().createSpan({ text: `Total Errors: ${stats.total}` });
        quickStats.createDiv().createSpan({ text: `Recent: ${stats.recent.length}` });
        quickStats.createDiv().createSpan({ text: `Recovery Rate: ${stats.recoveryRate.toFixed(0)}%` });
        quickStats.createDiv().createSpan({ text: `Categories: ${Object.values(stats.byCategory).filter(c => c > 0).length}` });
    }
}