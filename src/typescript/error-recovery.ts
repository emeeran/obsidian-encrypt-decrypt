/**
 * Advanced Error Recovery System
 * Provides intelligent error handling, recovery strategies, and resilience features
 */

import { App, TFile, Notice, Modal, Setting } from 'obsidian';
import { enhancedEncryptionService } from './enhanced-encryption';

export enum ErrorSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical'
}

export enum ErrorCategory {
    ENCRYPTION = 'encryption',
    DECRYPTION = 'decryption',
    FILE_IO = 'file_io',
    MEMORY = 'memory',
    NETWORK = 'network',
    USER_INPUT = 'user_input',
    SYSTEM = 'system',
    HARDWARE = 'hardware'
}

export interface ErrorInfo {
    id: string;
    category: ErrorCategory;
    severity: ErrorSeverity;
    message: string;
    technicalDetails: string;
    timestamp: Date;
    context?: any;
    suggestedActions: string[];
    recoverable: boolean;
    retryCount: number;
    maxRetries: number;
}

export interface RecoveryStrategy {
    name: string;
    description: string;
    canHandle: (error: ErrorInfo) => boolean;
    attemptRecovery: (error: ErrorInfo, context: any) => Promise<RecoveryResult>;
    priority: number; // Higher numbers are tried first
}

export interface RecoveryResult {
    success: boolean;
    message: string;
    data?: any;
    nextAction?: 'retry' | 'skip' | 'abort' | 'fallback';
}

export interface ErrorRecoverySettings {
    enableAutoRecovery: boolean;
    maxRetryAttempts: number;
    retryDelay: number; // milliseconds
    enableErrorReporting: boolean;
    enableErrorLogging: boolean;
    enableCrashRecovery: boolean;
    autoBackupEnabled: boolean;
    backupRetentionDays: number;
}

export class AdvancedErrorRecovery {
    private app: App;
    private settings: ErrorRecoverySettings;
    private errorLog: ErrorInfo[] = [];
    private recoveryStrategies: RecoveryStrategy[] = [];
    private activeRecoveries: Map<string, AbortController> = new Map();

    constructor(app: App, settings: ErrorRecoverySettings) {
        this.app = app;
        this.settings = settings;
        this.initializeDefaultStrategies();
        this.loadErrorLog();
        this.scheduleCleanup();
    }

    /**
     * Handle an error with intelligent recovery
     */
    async handleError(error: Error | string, context: any = {}): Promise<RecoveryResult> {
        const errorInfo = this.createErrorInfo(error, context);
        this.logError(errorInfo);

        if (!this.settings.enableAutoRecovery || errorInfo.severity === ErrorSeverity.CRITICAL) {
            return {
                success: false,
                message: errorInfo.message,
                nextAction: 'abort'
            };
        }

        return await this.attemptRecovery(errorInfo, context);
    }

    /**
     * Create a standardized error info object
     */
    private createErrorInfo(error: Error | string, context: any): ErrorInfo {
        const id = this.generateErrorId();
        const timestamp = new Date();

        let message: string;
        let technicalDetails: string;
        let category: ErrorCategory;
        let severity: ErrorSeverity;

        if (error instanceof Error) {
            message = error.message;
            technicalDetails = error.stack || error.toString();
        } else {
            message = error;
            technicalDetails = `Error: ${error}`;
        }

        // Categorize and assess severity
        const analysis = this.analyzeError(error, context);
        category = analysis.category;
        severity = analysis.severity;

        const suggestedActions = this.generateSuggestions(category, severity, context);

        return {
            id,
            category,
            severity,
            message,
            technicalDetails,
            timestamp,
            context,
            suggestedActions,
            recoverable: severity !== ErrorSeverity.CRITICAL,
            retryCount: 0,
            maxRetries: this.settings.maxRetryAttempts
        };
    }

    /**
     * Analyze error to determine category and severity
     */
    private analyzeError(error: Error | string, context: any): { category: ErrorCategory; severity: ErrorSeverity } {
        const errorStr = error instanceof Error ? error.message : error;
        const lowerError = errorStr.toLowerCase();

        // Encryption/Decryption errors
        if (lowerError.includes('encryption') || lowerError.includes('decryption') || lowerError.includes('password')) {
            if (lowerError.includes('invalid') || lowerError.includes('corrupted')) {
                return { category: ErrorCategory.ENCRYPTION, severity: ErrorSeverity.HIGH };
            }
            return { category: ErrorCategory.ENCRYPTION, severity: ErrorSeverity.MEDIUM };
        }

        // File I/O errors
        if (lowerError.includes('file') || lowerError.includes('read') || lowerError.includes('write')) {
            if (lowerError.includes('not found') || lowerError.includes('permission')) {
                return { category: ErrorCategory.FILE_IO, severity: ErrorSeverity.HIGH };
            }
            return { category: ErrorCategory.FILE_IO, severity: ErrorSeverity.MEDIUM };
        }

        // Memory errors
        if (lowerError.includes('memory') || lowerError.includes('out of memory')) {
            return { category: ErrorCategory.MEMORY, severity: ErrorSeverity.HIGH };
        }

        // Network errors
        if (lowerError.includes('network') || lowerError.includes('connection') || lowerError.includes('timeout')) {
            return { category: ErrorCategory.NETWORK, severity: ErrorSeverity.MEDIUM };
        }

        // Hardware errors
        if (lowerError.includes('hardware') || lowerError.includes('security key') || lowerError.includes('biometric')) {
            return { category: ErrorCategory.HARDWARE, severity: ErrorSeverity.MEDIUM };
        }

        // User input errors
        if (lowerError.includes('password') || lowerError.includes('invalid') || lowerError.includes('required')) {
            return { category: ErrorCategory.USER_INPUT, severity: ErrorSeverity.LOW };
        }

        // System errors
        if (lowerError.includes('system') || lowerError.includes('platform') || lowerError.includes('unsupported')) {
            return { category: ErrorCategory.SYSTEM, severity: ErrorSeverity.HIGH };
        }

        // Default
        return { category: ErrorCategory.SYSTEM, severity: ErrorSeverity.MEDIUM };
    }

    /**
     * Generate recovery suggestions based on error type
     */
    private generateSuggestions(category: ErrorCategory, severity: ErrorSeverity, context: any): string[] {
        const suggestions: string[] = [];

        switch (category) {
            case ErrorCategory.ENCRYPTION:
                suggestions.push('Check password spelling and complexity');
                suggestions.push('Try a simpler password to test encryption');
                if (severity === ErrorSeverity.HIGH) {
                    suggestions.push('File may be corrupted - restore from backup');
                }
                break;

            case ErrorCategory.DECRYPTION:
                suggestions.push('Verify the correct password is being used');
                suggestions.push('Check if the file was encrypted with this plugin');
                if (severity === ErrorSeverity.HIGH) {
                    suggestions.push('The encrypted data may be corrupted');
                }
                break;

            case ErrorCategory.FILE_IO:
                suggestions.push('Check file permissions and disk space');
                suggestions.push('Ensure the file is not open in another program');
                suggestions.push('Try restarting Obsidian');
                break;

            case ErrorCategory.MEMORY:
                suggestions.push('Close other applications to free memory');
                suggestions.push('Restart the application');
                suggestions.push('Process smaller files at a time');
                break;

            case ErrorCategory.NETWORK:
                suggestions.push('Check internet connection');
                suggestions.push('Try again in a few moments');
                suggestions.push('Use offline mode if available');
                break;

            case ErrorCategory.HARDWARE:
                suggestions.push('Check hardware security key connection');
                suggestions.push('Try a different USB port');
                suggestions.push('Use password authentication as fallback');
                break;

            case ErrorCategory.USER_INPUT:
                suggestions.push('Review input requirements');
                suggestions.push('Check example formats if available');
                break;

            case ErrorCategory.SYSTEM:
                suggestions.push('Update to the latest version');
                suggestions.push('Check system requirements');
                suggestions.push('Restart the application');
                break;
        }

        if (severity === ErrorSeverity.HIGH || severity === ErrorSeverity.CRITICAL) {
            suggestions.push('Contact support if the issue persists');
        }

        return suggestions;
    }

    /**
     * Attempt recovery using available strategies
     */
    private async attemptRecovery(errorInfo: ErrorInfo, context: any): Promise<RecoveryResult> {
        const applicableStrategies = this.recoveryStrategies
            .filter(strategy => strategy.canHandle(errorInfo))
            .sort((a, b) => b.priority - a.priority);

        if (applicableStrategies.length === 0) {
            return {
                success: false,
                message: 'No recovery strategies available for this error',
                nextAction: 'abort'
            };
        }

        for (const strategy of applicableStrategies) {
            try {
                // Check if we should abort recovery
                const controller = this.activeRecoveries.get(errorInfo.id);
                if (controller?.signal.aborted) {
                    return {
                        success: false,
                        message: 'Recovery was aborted',
                        nextAction: 'abort'
                    };
                }

                const result = await strategy.attemptRecovery(errorInfo, context);
                if (result.success) {
                    this.markErrorResolved(errorInfo.id, strategy.name);
                    return result;
                }

                // Wait before trying next strategy
                if (strategy !== applicableStrategies[applicableStrategies.length - 1]) {
                    await this.delay(this.settings.retryDelay);
                }
            } catch (recoveryError) {
                console.warn(`Recovery strategy "${strategy.name}" failed:`, recoveryError);
            }
        }

        return {
            success: false,
            message: 'All recovery strategies failed',
            nextAction: 'abort'
        };
    }

    /**
     * Initialize default recovery strategies
     */
    private initializeDefaultStrategies(): void {
        // Password retry strategy
        this.addStrategy({
            name: 'Password Retry',
            description: 'Retry with corrected password input',
            canHandle: (error) => error.category === ErrorCategory.USER_INPUT && error.retryCount < 3,
            priority: 10,
            attemptRecovery: async (error, context) => {
                return await this.promptForRetryPassword(error, context);
            }
        });

        // File backup recovery strategy
        this.addStrategy({
            name: 'Backup Recovery',
            description: 'Attempt to recover from backup files',
            canHandle: (error) => error.category === ErrorCategory.FILE_IO && error.severity === ErrorSeverity.HIGH,
            priority: 8,
            attemptRecovery: async (error, context) => {
                return await this.attemptBackupRecovery(error, context);
            }
        });

        // Memory optimization strategy
        this.addStrategy({
            name: 'Memory Optimization',
            description: 'Optimize memory usage and retry',
            canHandle: (error) => error.category === ErrorCategory.MEMORY || error.message.includes('memory'),
            priority: 7,
            attemptRecovery: async (error, context) => {
                return await this.optimizeMemoryAndRetry(error, context);
            }
        });

        // Hardware fallback strategy
        this.addStrategy({
            name: 'Hardware Fallback',
            description: 'Fallback to password authentication',
            canHandle: (error) => error.category === ErrorCategory.HARDWARE,
            priority: 6,
            attemptRecovery: async (error, context) => {
                return await this.fallbackToPassword(error, context);
            }
        });

        // Encryption format fallback
        this.addStrategy({
            name: 'Format Fallback',
            description: 'Try older encryption format compatibility',
            canHandle: (error) => error.category === ErrorCategory.DECRYPTION,
            priority: 5,
            attemptRecovery: async (error, context) => {
                return await this.tryFormatCompatibility(error, context);
            }
        });

        // Generic retry strategy
        this.addStrategy({
            name: 'Generic Retry',
            description: 'Simple retry with delay',
            canHandle: (error) => error.retryCount < error.maxRetries && error.recoverable,
            priority: 1,
            attemptRecovery: async (error, context) => {
                error.retryCount++;
                await this.delay(this.settings.retryDelay);
                return {
                    success: true,
                    message: 'Retrying operation...',
                    nextAction: 'retry'
                };
            }
        });
    }

    /**
     * Add a custom recovery strategy
     */
    addStrategy(strategy: RecoveryStrategy): void {
        this.recoveryStrategies.push(strategy);
    }

    /**
     * Prompt user for password retry
     */
    private async promptForRetryPassword(error: ErrorInfo, context: any): Promise<RecoveryResult> {
        return new Promise((resolve) => {
            const modal = new PasswordRetryModal(this.app, error, (password) => {
                if (password) {
                    resolve({
                        success: true,
                        message: 'Retry with new password',
                        data: { password },
                        nextAction: 'retry'
                    });
                } else {
                    resolve({
                        success: false,
                        message: 'User cancelled password retry',
                        nextAction: 'abort'
                    });
                }
            });
            modal.open();
        });
    }

    /**
     * Attempt backup recovery
     */
    private async attemptBackupRecovery(error: ErrorInfo, context: any): Promise<RecoveryResult> {
        try {
            const backupPath = await this.findBackupFile(context.filePath);
            if (backupPath) {
                return {
                    success: true,
                    message: 'Backup file found and can be restored',
                    data: { backupPath },
                    nextAction: 'fallback'
                };
            }
        } catch (backupError) {
            console.warn('Backup recovery failed:', backupError);
        }

        return {
            success: false,
            message: 'No backup available for recovery'
        };
    }

    /**
     * Optimize memory and retry
     */
    private async optimizeMemoryAndRetry(error: ErrorInfo, context: any): Promise<RecoveryResult> {
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }

        // Clear any cached data if method exists
        try {
            if ((enhancedEncryptionService as any).clearCache) {
                (enhancedEncryptionService as any).clearCache();
            }
        } catch (e) {
            // Ignore cache clearing errors
        }

        // Wait for memory to stabilize
        await this.delay(1000);

        return {
            success: true,
            message: 'Memory optimized, retrying operation',
            nextAction: 'retry'
        };
    }

    /**
     * Fallback to password authentication
     */
    private async fallbackToPassword(error: ErrorInfo, context: any): Promise<RecoveryResult> {
        return {
            success: true,
            message: 'Falling back to password authentication',
            nextAction: 'fallback'
        };
    }

    /**
     * Try format compatibility
     */
    private async tryFormatCompatibility(error: ErrorInfo, context: any): Promise<RecoveryResult> {
        // Try legacy decryption if available
        if (context.content && context.content.includes('-----BEGIN ENCRYPTED NOTE-----')) {
            // This would try older format decryption
            return {
                success: true,
                message: 'Trying legacy encryption format',
                nextAction: 'retry'
            };
        }

        return {
            success: false,
            message: 'Format compatibility not applicable'
        };
    }

    /**
     * Get error statistics
     */
    getErrorStats(): {
        total: number;
        byCategory: Record<ErrorCategory, number>;
        bySeverity: Record<ErrorSeverity, number>;
        recent: ErrorInfo[];
        recoveryRate: number;
    } {
        const byCategory = {} as Record<ErrorCategory, number>;
        const bySeverity = {} as Record<ErrorSeverity, number>;

        Object.values(ErrorCategory).forEach(cat => byCategory[cat] = 0);
        Object.values(ErrorSeverity).forEach(sev => bySeverity[sev] = 0);

        let resolvedCount = 0;
        this.errorLog.forEach(error => {
            byCategory[error.category]++;
            bySeverity[error.severity]++;
            if ((error as any).resolved) resolvedCount++;
        });

        const recent = this.errorLog
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 10);

        const recoveryRate = this.errorLog.length > 0 ? (resolvedCount / this.errorLog.length) * 100 : 0;

        return {
            total: this.errorLog.length,
            byCategory,
            bySeverity,
            recent,
            recoveryRate
        };
    }

    /**
     * Get error log
     */
    getErrorLog(): ErrorInfo[] {
        return [...this.errorLog];
    }

    /**
     * Clear error log
     */
    clearErrorLog(): void {
        this.errorLog = [];
        this.saveErrorLog();
    }

    /**
     * Export error report
     */
    exportErrorReport(): string {
        const stats = this.getErrorStats();
        const report = {
            timestamp: new Date().toISOString(),
            version: '2.2.0',
            stats,
            errors: this.errorLog,
            systemInfo: this.getSystemInfo()
        };

        return JSON.stringify(report, null, 2);
    }

    private logError(errorInfo: ErrorInfo): void {
        this.errorLog.push(errorInfo);

        // Limit log size
        if (this.errorLog.length > 1000) {
            this.errorLog = this.errorLog.slice(-1000);
        }

        if (this.settings.enableErrorLogging) {
            this.saveErrorLog();
        }
    }

    private markErrorResolved(errorId: string, strategy: string): void {
        const error = this.errorLog.find(e => e.id === errorId);
        if (error) {
            (error as any).resolved = true;
            (error as any).resolutionStrategy = strategy;
            this.saveErrorLog();
        }
    }

    private generateErrorId(): string {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private async findBackupFile(filePath: string): Promise<string | null> {
        // Implementation for finding backup files
        // This would look for .backup, .bak, or version history files
        return null; // Placeholder
    }

    private getSystemInfo(): any {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            obsidianVersion: (this.app as any).version || 'unknown',
            timestamp: new Date().toISOString()
        };
    }

    private async loadErrorLog(): Promise<void> {
        try {
            const plugin = (this.app as any).plugins?.plugins['note-encryptor'];
            const saved = plugin?.settings?.errorLog;
            if (saved && Array.isArray(saved)) {
                this.errorLog = saved.map((item: any) => ({
                    ...item,
                    timestamp: new Date(item.timestamp)
                }));
            }
        } catch (error) {
            console.warn('Failed to load error log:', error);
        }
    }

    private async saveErrorLog(): Promise<void> {
        try {
            const plugin = (this.app as any).plugins?.plugins['note-encryptor'];
            if (plugin && plugin.settings) {
                plugin.settings.errorLog = this.errorLog;
                await plugin.saveSettings();
            }
        } catch (error) {
            console.warn('Failed to save error log:', error);
        }
    }

    private scheduleCleanup(): void {
        // Clean up old errors every hour
        setInterval(() => {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 30); // Keep 30 days

            const originalLength = this.errorLog.length;
            this.errorLog = this.errorLog.filter(error => error.timestamp > cutoff);

            if (this.errorLog.length < originalLength) {
                this.saveErrorLog();
            }
        }, 60 * 60 * 1000); // 1 hour
    }
}

/**
 * Password retry modal
 */
class PasswordRetryModal extends Modal {
    private error: ErrorInfo;
    private onSubmit: (password: string | null) => void;

    constructor(app: App, error: ErrorInfo, onSubmit: (password: string | null) => void) {
        super(app);
        this.error = error;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('password-retry-modal');

        contentEl.createEl('h2', { text: 'Authentication Failed' });

        contentEl.createEl('p', {
            text: this.error.message,
            cls: 'error-message'
        });

        contentEl.createEl('h3', { text: 'Suggestions:' });
        const suggestionsList = contentEl.createEl('ul');
        this.error.suggestedActions.forEach(suggestion => {
            suggestionsList.createEl('li', { text: suggestion });
        });

        const passwordInput = contentEl.createEl('input', {
            type: 'password',
            placeholder: 'Enter password to retry'
        });
        passwordInput.style.width = '100%';
        passwordInput.style.padding = '8px';
        passwordInput.style.margin = '16px 0';

        const buttonContainer = contentEl.createDiv('button-container');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '12px';
        buttonContainer.style.justifyContent = 'flex-end';

        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel',
            cls: ''
        });
        cancelButton.onclick = () => {
            this.onSubmit(null);
            this.close();
        };

        const retryButton = buttonContainer.createEl('button', {
            text: 'Retry',
            cls: 'mod-cta'
        });
        retryButton.onclick = () => {
            this.onSubmit(passwordInput.value);
            this.close();
        };

        setTimeout(() => passwordInput.focus(), 100);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}