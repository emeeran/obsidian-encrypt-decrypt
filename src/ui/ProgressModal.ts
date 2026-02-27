/**
 * Note Encryptor - Progress Modal
 * Enhanced modal for batch operation progress
 */

import { App, Modal, Notice } from 'obsidian';
import type { BatchProgress, BatchResult } from '../types';

/**
 * Modal for displaying and controlling batch operation progress
 */
export class ProgressModal extends Modal {
    private progress: BatchProgress;
    private results: BatchResult[] = [];
    private cancelled = false;
    private onCancel?: () => void;
    private operationType: 'encrypt' | 'decrypt';
    private startTime: number;
    private fileIcons: Map<string, string> = new Map();

    constructor(
        app: App,
        operationType: 'encrypt' | 'decrypt',
        total: number
    ) {
        super(app);
        this.operationType = operationType;
        this.startTime = Date.now();
        this.progress = {
            current: 0,
            total,
            currentFile: '',
            successCount: 0,
            failCount: 0,
            status: 'pending',
        };
    }

    /**
     * Set callback for cancellation
     */
    setOnCancel(callback: () => void): void {
        this.onCancel = callback;
    }

    onOpen() {
        this.render();
    }

    onClose() {
        this.contentEl.empty();
    }

    /**
     * Render the modal content
     */
    private render(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('progress-modal');

        const isEncrypt = this.operationType === 'encrypt';
        const icon = isEncrypt ? '🔐' : '🔓';
        const title = isEncrypt ? 'Encrypting Notes' : 'Decrypting Notes';
        const actionColor = isEncrypt ? '#28a745' : '#17a2b8';

        // Header
        const header = contentEl.createDiv('progress-header');
        const iconEl = header.createSpan('progress-icon');
        iconEl.textContent = icon;
        header.createEl('h2', { text: title });

        // Status badge
        if (this.progress.status !== 'pending') {
            const badge = header.createSpan('status-badge');
            badge.textContent = this.progress.status === 'completed' ? 'Complete' : 'Running';
            badge.addClass(this.progress.status === 'completed' ? 'completed' : 'running');
        }

        // Progress section
        if (this.progress.status === 'running') {
            this.renderProgress(contentEl, actionColor);
        } else if (this.progress.status === 'completed' || this.progress.status === 'cancelled') {
            this.renderCompletion(contentEl, actionColor);
        }

        // File icon legend
        this.renderLegend(contentEl);
    }

    private renderProgress(container: HTMLElement, actionColor: string): void {
        // Progress bar
        const progressSection = container.createDiv('progress-section');

        // Calculate progress
        const percentage = this.progress.total > 0
            ? Math.round((this.progress.current / this.progress.total) * 100)
            : 0;

        // Visual progress bar
        const progressBarContainer = progressSection.createDiv('progress-bar-container');
        const progressTrack = progressBarContainer.createDiv('progress-track');
        const progressFill = progressTrack.createDiv('progress-fill');
        progressFill.style.width = `${percentage}%`;
        progressFill.style.background = `linear-gradient(90deg, ${actionColor}, ${actionColor}dd)`;

        // Progress stats
        const progressStats = progressSection.createDiv('progress-stats');

        const statPercent = progressStats.createDiv('stat-percent');
        statPercent.textContent = `${percentage}%`;
        statPercent.style.color = actionColor;

        const statFraction = progressStats.createDiv('stat-fraction');
        statFraction.textContent = `${this.progress.current} / ${this.progress.total}`;

        // Current file
        if (this.progress.currentFile) {
            const currentFileSection = container.createDiv('current-file-section');
            const fileIcon = this.fileIcons.get(this.progress.currentFile) || '📄';
            currentFileSection.createSpan('file-icon').textContent = fileIcon;
            const fileName = currentFileSection.createDiv('file-name');
            fileName.textContent = this.progress.currentFile;
            fileName.title = this.progress.currentFile;
        }

        // Status indicators
        const statusGrid = container.createDiv('status-grid');

        // Success indicator
        const successItem = statusGrid.createDiv('status-item success');
        successItem.createSpan('status-icon').textContent = '✓';
        const successLabel = successItem.createDiv('status-label');
        successLabel.textContent = 'Success';
        successItem.createDiv('status-value').textContent = String(this.progress.successCount);

        // Fail indicator
        const failItem = statusGrid.createDiv('status-item fail');
        failItem.createSpan('status-icon').textContent = '✗';
        const failLabel = failItem.createDiv('status-label');
        failLabel.textContent = 'Failed';
        const failValue = failItem.createDiv('status-value');
        failValue.textContent = String(this.progress.failCount);
        if (this.progress.failCount > 0) {
            failItem.addClass('has-errors');
        }

        // Remaining indicator
        const remainingCount = this.progress.total - this.progress.current;
        const remainingItem = statusGrid.createDiv('status-item remaining');
        remainingItem.createSpan('status-icon').textContent = '⏳';
        const remainingLabel = remainingItem.createDiv('status-label');
        remainingLabel.textContent = 'Remaining';
        remainingItem.createDiv('status-value').textContent = String(remainingCount);

        // Time elapsed
        const elapsedMs = Date.now() - this.startTime;
        const elapsed = Math.floor(elapsedMs / 1000);
        const timeSection = container.createDiv('time-section');
        timeSection.createSpan('time-label').textContent = 'Elapsed:';
        timeSection.createSpan('time-value').textContent = `${elapsed}s`;

        // Cancel button
        const actionsContainer = container.createDiv('actions-container');
        const cancelBtn = actionsContainer.createEl('button', {
            text: 'Cancel Operation',
            cls: 'cancel-btn',
        });
        cancelBtn.onclick = () => {
            this.cancelled = true;
            if (this.onCancel) {
                this.onCancel();
            }
            cancelBtn.textContent = 'Cancelling...';
            cancelBtn.disabled = true;
        };
    }

    private renderCompletion(container: HTMLElement, actionColor: string): void {
        const completionSection = container.createDiv('completion-section');

        const isCancelled = this.progress.status === 'cancelled';

        // Completion icon
        const completionIcon = completionSection.createDiv('completion-icon');
        completionIcon.textContent = isCancelled ? '⚠️' : '✅';
        completionIcon.addClass(isCancelled ? 'warning' : 'success');

        // Completion message
        const completionMessage = completionSection.createDiv('completion-message');
        if (isCancelled) {
            completionMessage.textContent = 'Operation Cancelled';
            completionMessage.addClass('cancelled');
        } else {
            completionMessage.textContent = 'Operation Complete';
            completionMessage.addClass('completed');
        }

        // Summary stats
        const summaryGrid = completionSection.createDiv('summary-grid');

        const successStat = summaryGrid.createDiv('summary-stat success');
        successStat.createSpan('stat-icon').textContent = '✓';
        successStat.createDiv('stat-label').textContent = 'Processed';
        successStat.createDiv('stat-value').textContent = String(this.progress.successCount);

        if (this.progress.failCount > 0) {
            const failStat = summaryGrid.createDiv('summary-stat fail');
            failStat.createSpan('stat-icon').textContent = '✗';
            failStat.createDiv('stat-label').textContent = 'Failed';
            failStat.createDiv('stat-value').textContent = String(this.progress.failCount);
        }

        // Total time
        const elapsedMs = Date.now() - this.startTime;
        const totalTime = completionSection.createDiv('total-time');
        totalTime.createSpan('time-label').textContent = 'Total time:';
        const seconds = Math.floor(elapsedMs / 1000);
        const ms = elapsedMs % 1000;
        totalTime.createSpan('time-value').textContent = `${seconds}.${String(ms).padStart(3, '0')}s`;

        // Failed files list
        if (this.results.filter(r => !r.success).length > 0) {
            this.renderFailedFiles(container);
        }

        // Close button
        const actionsContainer = container.createDiv('actions-container');
        const closeBtn = actionsContainer.createEl('button', {
            text: 'Close',
            cls: 'mod-cta close-btn',
        });
        closeBtn.onclick = () => this.close();
    }

    private renderFailedFiles(container: HTMLElement): void {
        const failedSection = container.createDiv('failed-files-section');
        failedSection.createEl('h4', { text: 'Failed Files' });

        const failedList = failedSection.createDiv('failed-files-list');
        const failedResults = this.results.filter(r => !r.success);

        for (const result of failedResults.slice(0, 10)) {
            const item = failedList.createDiv('failed-file-item');
            item.createSpan('file-name').textContent = result.file;
            if (result.error) {
                const errorEl = item.createSpan('file-error');
                errorEl.textContent = result.error;
            }
        }

        if (failedResults.length > 10) {
            const moreCount = failedList.createDiv('more-errors');
            moreCount.textContent = `...and ${failedResults.length - 10} more`;
        }
    }

    private renderLegend(container: HTMLElement): void {
        const legend = container.createDiv('file-legend');
        const items = [
            { icon: '📄', label: 'Processing' },
            { icon: '✅', label: 'Success' },
            { icon: '❌', label: 'Failed' },
            { icon: '⏭', label: 'Skipped' },
        ];

        for (const item of items) {
            const legendItem = legend.createDiv('legend-item');
            legendItem.createSpan('legend-icon').textContent = item.icon;
            legendItem.createSpan('legend-label').textContent = item.label;
        }
    }

    /**
     * Update progress and re-render
     */
    updateProgress(progress: Partial<BatchProgress>): void {
        this.progress = { ...this.progress, ...progress };
        if (this.contentEl.children.length > 0) {
            this.render();
        }
    }

    /**
     * Add a result
     */
    addResult(result: BatchResult): void {
        this.results.push(result);
        // Update file icon based on result
        this.fileIcons.set(result.file, result.success ? '✅' : '❌');
    }

    /**
     * Check if operation was cancelled
     */
    isCancelled(): boolean {
        return this.cancelled;
    }

    /**
     * Mark operation as started
     */
    start(): void {
        this.progress.status = 'running';
        this.render();
    }

    /**
     * Mark operation as completed
     */
    complete(): void {
        this.progress.status = 'completed';
        this.render();
    }

    /**
     * Get results
     */
    getResults(): BatchResult[] {
        return this.results;
    }
}
