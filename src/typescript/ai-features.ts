/**
 * AI-Powered Security Features
 * Provides intelligent password management, content analysis, and security recommendations
 */

import { App, Notice, TFile } from 'obsidian';

export interface AISettings {
    enabled: boolean;
    autoPasswordGeneration: boolean;
    contentAnalysis: boolean;
    sensitiveContentDetection: boolean;
    securityRecommendations: boolean;
    patternAnalysis: boolean;
    breachProtection: boolean;
    aiAssistance: boolean;
    privacyMode: boolean;
    learningMode: boolean;
}

export interface SensitiveContentAnalysis {
    sensitivity: 'low' | 'medium' | 'high' | 'critical';
    confidence: number; // 0-100
    detectedTypes: string[];
    riskFactors: string[];
    recommendations: string[];
    shouldEncrypt: boolean;
    suggestedPasswordStrength: 'weak' | 'medium' | 'strong' | 'very-strong';
}

export interface PasswordAnalysis {
    strength: number; // 0-100
    entropy: number;
    crackTime: string;
    patterns: string[];
    commonIssues: string[];
    improvements: string[];
    isBreached: boolean;
    breachCount: number;
    generatedSuggestions: string[];
}

export interface SecurityPattern {
    type: 'password' | 'content' | 'behavior' | 'temporal';
    pattern: string;
    confidence: number;
    riskLevel: 'low' | 'medium' | 'high';
    recommendation: string;
}

export interface ContentPattern {
    pattern: RegExp;
    category: 'personal' | 'financial' | 'medical' | 'legal' | 'business' | 'technical';
    sensitivity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
}

export class AIAnalyzeEngine {
    private app: App;
    private settings: AISettings;
    private knownBreaches: Set<string> = new Set();
    private commonPasswords: Set<string> = new Set();
    private contentPatterns: ContentPattern[] = [];
    private userPatterns: Map<string, SecurityPattern[]> = new Map();

    constructor(app: App, settings: AISettings) {
        this.app = app;
        this.settings = settings;
        this.initializeContentPatterns();
        this.loadCommonPasswords();
        this.loadKnownBreaches();
    }

    /**
     * Analyze content for sensitive information
     */
    async analyzeContent(content: string, filePath?: string): Promise<SensitiveContentAnalysis> {
        if (!this.settings.contentAnalysis || this.settings.privacyMode) {
            return this.getDefaultAnalysis();
        }

        try {
            const analysis: SensitiveContentAnalysis = {
                sensitivity: 'low',
                confidence: 0,
                detectedTypes: [],
                riskFactors: [],
                recommendations: [],
                shouldEncrypt: false,
                suggestedPasswordStrength: 'medium'
            };

            // Pattern-based detection
            await this.detectContentPatterns(content, analysis);

            // Contextual analysis
            await this.analyzeContentContext(content, filePath || '', analysis);

            // Risk assessment
            await this.assessContentRisk(content, analysis);

            // Generate recommendations
            this.generateSecurityRecommendations(analysis);

            return analysis;
        } catch (error) {
            console.error('Content analysis failed:', error);
            return this.getDefaultAnalysis();
        }
    }

    /**
     * Analyze password strength and security
     */
    async analyzePassword(password: string, context: any = {}): Promise<PasswordAnalysis> {
        if (!this.settings.enabled) {
            return this.getDefaultPasswordAnalysis();
        }

        try {
            const analysis: PasswordAnalysis = {
                strength: 0,
                entropy: 0,
                crackTime: 'Unknown',
                patterns: [],
                commonIssues: [],
                improvements: [],
                isBreached: false,
                breachCount: 0,
                generatedSuggestions: []
            };

            // Basic strength metrics
            await this.calculatePasswordStrength(password, analysis);

            // Pattern analysis
            await this.analyzePasswordPatterns(password, analysis);

            // Breach checking
            await this.checkPasswordBreaches(password, analysis);

            // Generate improvements and suggestions
            await this.generatePasswordSuggestions(analysis, context);

            return analysis;
        } catch (error) {
            console.error('Password analysis failed:', error);
            return this.getDefaultPasswordAnalysis();
        }
    }

    /**
     * Generate intelligent password based on context
     */
    async generateContextualPassword(context: {
        contentSensitivity?: string;
        usageType?: string;
        userPreferences?: any;
        historicalPatterns?: string[];
    } = {}): Promise<string[]> {
        const suggestions: string[] = [];

        try {
            const baseEntropy = context.contentSensitivity === 'high' ? 128 : 64;
            const length = context.contentSensitivity === 'critical' ? 16 : 12;

            // Generate different password types
            suggestions.push(await this.generateStrongPassword(length, baseEntropy, 'mixed'));
            suggestions.push(await this.generateStrongPassword(length, baseEntropy, 'alphanumeric'));
            suggestions.push(await this.generateMemorablePassword(context));
            suggestions.push(await this.generatePatternBasedPassword(context));

            return suggestions;
        } catch (error) {
            console.error('Password generation failed:', error);
            return [this.generateFallbackPassword()];
        }
    }

    /**
     * Learn from user behavior and patterns
     */
    async learnFromBehavior(
        action: 'encrypt' | 'decrypt' | 'password_change',
        context: {
            fileSize?: number;
            contentLength?: number;
            passwordComplexity?: number;
            timeOfDay?: number;
            frequency?: number;
        }
    ): Promise<void> {
        if (!this.settings.learningMode) return;

        try {
            const userId = this.getUserId();
            const existingPatterns = this.userPatterns.get(userId) || [];

            // Analyze behavior patterns
            const pattern: SecurityPattern = {
                type: 'behavior',
                pattern: this.createBehaviorPattern(action, context),
                confidence: 0.5,
                riskLevel: 'low',
                recommendation: this.generateBehaviorRecommendation(action, context)
            };

            existingPatterns.push(pattern);

            // Keep only recent patterns
            if (existingPatterns.length > 100) {
                existingPatterns.splice(0, existingPatterns.length - 100);
            }

            this.userPatterns.set(userId, existingPatterns);
        } catch (error) {
            console.error('Behavior learning failed:', error);
        }
    }

    /**
     * Get security recommendations based on analysis
     */
    async getSecurityRecommendations(analysis: {
        recentActivity?: any[];
        contentAnalysis?: SensitiveContentAnalysis;
        passwordAnalysis?: PasswordAnalysis;
        userPatterns?: SecurityPattern[];
    }): Promise<string[]> {
        const recommendations: string[] = [];

        try {
            // Content-based recommendations
            if (analysis.contentAnalysis) {
                recommendations.push(...analysis.contentAnalysis.recommendations);
            }

            // Password-based recommendations
            if (analysis.passwordAnalysis) {
                recommendations.push(...analysis.passwordAnalysis.improvements);
            }

            // Behavioral recommendations
            if (analysis.userPatterns) {
                recommendations.push(...this.analyzeSecurityPatterns(analysis.userPatterns));
            }

            // Remove duplicates and prioritize
            return this.prioritizeRecommendations(recommendations);
        } catch (error) {
            console.error('Recommendation generation failed:', error);
            return this.getDefaultRecommendations();
        }
    }

    /**
     * Detect content patterns for sensitive information
     */
    private async detectContentPatterns(content: string, analysis: SensitiveContentAnalysis): Promise<void> {
        for (const pattern of this.contentPatterns) {
            const matches = content.match(pattern.pattern);
            if (matches) {
                analysis.detectedTypes.push(pattern.category);
                analysis.riskFactors.push(`Detected ${pattern.description}`);

                // Update sensitivity based on pattern
                const patternScore = this.getSensitivityScore(pattern.sensitivity);
                if (patternScore > this.getSensitivityScore(analysis.sensitivity)) {
                    analysis.sensitivity = pattern.sensitivity;
                }

                analysis.confidence = Math.min(100, analysis.confidence + 15);
            }
        }
    }

    /**
     * Analyze content context and metadata
     */
    private async analyzeContentContext(content: string, filePath: string, analysis: SensitiveContentAnalysis): Promise<void> {
        // File name analysis
        if (filePath) {
            const fileName = filePath.toLowerCase();
            if (fileName.includes('password') || fileName.includes('secret') || fileName.includes('key')) {
                analysis.sensitivity = 'high';
                analysis.confidence = Math.max(analysis.confidence, 80);
                analysis.riskFactors.push('Filename suggests sensitive content');
            }
        }

        // Content length and complexity
        if (content.length > 10000) {
            analysis.riskFactors.push('Large document with potentially sensitive information');
            analysis.confidence = Math.min(100, analysis.confidence + 10);
        }

        // Keyword analysis
        const sensitiveKeywords = [
            'social security', 'credit card', 'bank account', 'password', 'secret key',
            'private key', 'api key', 'token', 'confidential', 'proprietary',
            'trade secret', 'personal information', 'financial', 'medical record',
            'legal document', 'contract', 'agreement', 'passport', 'driver license'
        ];

        const foundKeywords = sensitiveKeywords.filter(keyword =>
            content.toLowerCase().includes(keyword.toLowerCase())
        );

        if (foundKeywords.length > 0) {
            analysis.riskFactors.push(`Found sensitive keywords: ${foundKeywords.slice(0, 3).join(', ')}`);
            analysis.confidence = Math.min(100, analysis.confidence + foundKeywords.length * 5);
        }
    }

    /**
     * Assess overall content risk
     */
    private async assessContentRisk(content: string, analysis: SensitiveContentAnalysis): Promise<void> {
        // Structure analysis
        const hasStructuredData = /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/.test(content); // Credit card pattern
        const hasEmails = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(content);
        const hasPhoneNumbers = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(content);

        if (hasStructuredData) {
            analysis.detectedTypes.push('structured-data');
            analysis.riskFactors.push('Contains structured personal data');
            analysis.confidence = Math.min(100, analysis.confidence + 20);
        }

        if (hasEmails) {
            analysis.detectedTypes.push('contact-information');
            analysis.riskFactors.push('Contains email addresses');
            analysis.confidence = Math.min(100, analysis.confidence + 10);
        }

        if (hasPhoneNumbers) {
            analysis.detectedTypes.push('contact-information');
            analysis.riskFactors.push('Contains phone numbers');
            analysis.confidence = Math.min(100, analysis.confidence + 10);
        }

        // Determine if encryption is recommended
        analysis.shouldEncrypt = analysis.confidence > 60 || analysis.sensitivity === 'high' || analysis.sensitivity === 'critical';

        // Suggest password strength based on sensitivity
        if (analysis.sensitivity === 'critical') {
            analysis.suggestedPasswordStrength = 'very-strong';
        } else if (analysis.sensitivity === 'high') {
            analysis.suggestedPasswordStrength = 'strong';
        }
    }

    /**
     * Calculate password strength metrics
     */
    private async calculatePasswordStrength(password: string, analysis: PasswordAnalysis): Promise<void> {
        let strength = 0;
        let entropy = 0;

        // Length bonus
        strength += Math.min(30, password.length * 2);

        // Character variety
        if (/[a-z]/.test(password)) strength += 10;
        if (/[A-Z]/.test(password)) strength += 10;
        if (/\d/.test(password)) strength += 10;
        if (/[^a-zA-Z0-9]/.test(password)) strength += 15;

        // Entropy calculation
        const charset = this.getCharsetSize(password);
        entropy = password.length * Math.log2(charset);

        analysis.strength = Math.min(100, strength);
        analysis.entropy = entropy;
        analysis.crackTime = this.estimateCrackTime(entropy);
    }

    /**
     * Analyze password patterns
     */
    private async analyzePasswordPatterns(password: string, analysis: PasswordAnalysis): Promise<void> {
        // Common patterns
        if (/^[a-zA-Z]+$/.test(password)) {
            analysis.patterns.push('letters-only');
            analysis.commonIssues.push('Contains only letters');
        }

        if (/^\d+$/.test(password)) {
            analysis.patterns.push('numbers-only');
            analysis.commonIssues.push('Contains only numbers');
        }

        if (/^[a-zA-Z]+\d+$/.test(password)) {
            analysis.patterns.push('word-number');
            analysis.commonIssues.push('Word followed by numbers');
        }

        if (/^(.)\1+$/.test(password)) {
            analysis.patterns.push('repeated-character');
            analysis.commonIssues.push('Uses repeated characters');
        }

        if (/^(123|abc|qwer|asdf)/.test(password.toLowerCase())) {
            analysis.patterns.push('sequential');
            analysis.commonIssues.push('Uses sequential characters');
        }

        // Dictionary words
        if (this.containsDictionaryWord(password)) {
            analysis.patterns.push('dictionary-word');
            analysis.commonIssues.push('Contains common dictionary words');
        }
    }

    /**
     * Check password against known breaches
     */
    private async checkPasswordBreaches(password: string, analysis: PasswordAnalysis): Promise<void> {
        const normalizedPassword = password.toLowerCase();
        analysis.isBreached = this.knownBreaches.has(normalizedPassword) || this.commonPasswords.has(normalizedPassword);

        if (analysis.isBreached) {
            analysis.patterns.push('breached-password');
            analysis.commonIssues.push('Password found in known breaches');
            analysis.strength = Math.max(0, analysis.strength - 50);
        }
    }

    /**
     * Generate password improvement suggestions
     */
    private async generatePasswordSuggestions(analysis: PasswordAnalysis, context: any): Promise<void> {
        if (analysis.strength < 50) {
            analysis.improvements.push('Use a longer password (12+ characters)');
        }

        if (!/[a-z]/.test(context.password)) {
            analysis.improvements.push('Include lowercase letters');
        }

        if (!/[A-Z]/.test(context.password)) {
            analysis.improvements.push('Include uppercase letters');
        }

        if (!/\d/.test(context.password)) {
            analysis.improvements.push('Include numbers');
        }

        if (!/[^a-zA-Z0-9]/.test(context.password)) {
            analysis.improvements.push('Include special characters');
        }

        if (analysis.patterns.includes('dictionary-word')) {
            analysis.improvements.push('Avoid common dictionary words');
        }

        // Generate strong password suggestions
        analysis.generatedSuggestions = await this.generateContextualPassword({
            contentSensitivity: context.contentSensitivity,
            usageType: context.usageType
        });
    }

    /**
     * Generate a strong password
     */
    private async generateStrongPassword(length: number, entropy: number, type: 'mixed' | 'alphanumeric' | 'numeric' | 'letters'): Promise<string> {
        const charset = type === 'mixed' ?
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?' :
            type === 'alphanumeric' ?
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' :
            type === 'numeric' ?
            '0123456789' :
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }

        return password;
    }

    /**
     * Generate a memorable password
     */
    private async generateMemorablePassword(context: any): Promise<string> {
        const words = [
            'Blue', 'Green', 'Red', 'Yellow', 'Purple', 'Orange', 'Black', 'White',
            'Ocean', 'Mountain', 'Forest', 'Desert', 'River', 'Lake', 'Sun', 'Moon',
            'Star', 'Cloud', 'Wind', 'Fire', 'Water', 'Earth', 'Sky', 'Stone',
            'Apple', 'Banana', 'Orange', 'Grape', 'Mango', 'Cherry', 'Lemon', 'Peach'
        ];

        const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
        const symbols = ['!', '@', '#', '$', '%', '&', '*'];

        const word1 = words[Math.floor(Math.random() * words.length)];
        const word2 = words[Math.floor(Math.random() * words.length)];
        const number = numbers[Math.floor(Math.random() * numbers.length)];
        const symbol = symbols[Math.floor(Math.random() * symbols.length)];

        return `${word1}${word2}${number}${symbol}`;
    }

    /**
     * Generate pattern-based password
     */
    private async generatePatternBasedPassword(context: any): Promise<string> {
        const patterns = [
            () => {
                const word = 'Secure';
                const number = Math.floor(Math.random() * 9000) + 1000;
                const symbols = '!@#$%';
                return `${word}${number}${symbols[Math.floor(Math.random() * symbols.length)]}`;
            },
            () => {
                const adjectives = ['Strong', 'Safe', 'Private', 'Secret', 'Hidden'];
                const nouns = ['Vault', 'Lock', 'Key', 'Shield', 'Guard'];
                return adjectives[Math.floor(Math.random() * adjectives.length)] +
                       nouns[Math.floor(Math.random() * nouns.length)] +
                       Math.floor(Math.random() * 9000) + 1000;
            }
        ];

        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        return pattern();
    }

    /**
     * Generate fallback password
     */
    private generateFallbackPassword(): string {
        return 'SecurePass123!@#';
    }

    /**
     * Initialize content detection patterns
     */
    private initializeContentPatterns(): void {
        this.contentPatterns = [
            // Personal information
            {
                pattern: /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
                category: 'personal',
                sensitivity: 'critical',
                description: 'Social Security Number'
            },
            {
                pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card
                category: 'financial',
                sensitivity: 'critical',
                description: 'Credit Card Number'
            },
            {
                pattern: /\b[A-Z]{2}\d{7}\b/g, // Passport
                category: 'personal',
                sensitivity: 'high',
                description: 'Passport Number'
            },
            {
                pattern: /\b\d{2}[-/\s]\d{2}[-/\s]\d{4}\b/g, // Dates
                category: 'personal',
                sensitivity: 'medium',
                description: 'Date of Birth'
            },
            {
                pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
                category: 'personal',
                sensitivity: 'medium',
                description: 'Email Address'
            },
            {
                pattern: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, // Phone
                category: 'personal',
                sensitivity: 'medium',
                description: 'Phone Number'
            },
            // Financial information
            {
                pattern: /\b\d{9}\b/g, // Bank account (US)
                category: 'financial',
                sensitivity: 'high',
                description: 'Bank Account Number'
            },
            {
                pattern: /\b[A-Z]{4}\d{4}\b/g, // IBAN partial
                category: 'financial',
                sensitivity: 'high',
                description: 'Bank Account/IBAN'
            },
            // Technical
            {
                pattern: /(?:sk_|pk_|key|token|secret|password)[\s:=]+["']?[A-Za-z0-9+/=]{20,}["']?/gi,
                category: 'technical',
                sensitivity: 'critical',
                description: 'API Key or Secret'
            },
            {
                pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g,
                category: 'technical',
                sensitivity: 'critical',
                description: 'Private Key'
            },
            // Medical
            {
                pattern: /\b(?:blood pressure|cholesterol|diabetes|medication|prescription)\b/gi,
                category: 'medical',
                sensitivity: 'high',
                description: 'Medical Information'
            },
            // Legal
            {
                pattern: /\b(?:contract|agreement|lawsuit|attorney|legal)\b/gi,
                category: 'legal',
                sensitivity: 'high',
                description: 'Legal Information'
            }
        ];
    }

    /**
     * Load common passwords (simulated)
     */
    private loadCommonPasswords(): void {
        const common = [
            'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
            'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'password1'
        ];

        common.forEach(pwd => this.commonPasswords.add(pwd.toLowerCase()));
    }

    /**
     * Load known breaches (simulated)
     */
    private loadKnownBreaches(): void {
        // This would normally load from a real breach database
        // For demo purposes, we'll use common breached passwords
        const breached = [
            '123456', 'password', '123456789', '12345678', '12345',
            '1234567', '1234567890', '1234', 'qwerty', 'abc123',
            '111111', 'password123', 'admin', 'letmein', 'welcome',
            'monkey', '1234567890', 'password1', 'sunshine', 'princess'
        ];

        breached.forEach(pwd => this.knownBreaches.add(pwd.toLowerCase()));
    }

    /**
     * Helper methods
     */
    private getDefaultAnalysis(): SensitiveContentAnalysis {
        return {
            sensitivity: 'low',
            confidence: 0,
            detectedTypes: [],
            riskFactors: [],
            recommendations: [],
            shouldEncrypt: false,
            suggestedPasswordStrength: 'medium'
        };
    }

    private getDefaultPasswordAnalysis(): PasswordAnalysis {
        return {
            strength: 50,
            entropy: 30,
            crackTime: 'Unknown',
            patterns: [],
            commonIssues: [],
            improvements: [],
            isBreached: false,
            breachCount: 0,
            generatedSuggestions: []
        };
    }

    private getSensitivityScore(sensitivity: string): number {
        const scores = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
        return scores[sensitivity as keyof typeof scores] || 0;
    }

    private getCharsetSize(password: string): number {
        let size = 0;
        if (/[a-z]/.test(password)) size += 26;
        if (/[A-Z]/.test(password)) size += 26;
        if (/\d/.test(password)) size += 10;
        if (/[^a-zA-Z0-9]/.test(password)) size += 32;
        return size;
    }

    private estimateCrackTime(entropy: number): string {
        if (entropy < 30) return 'Instant';
        if (entropy < 40) return 'Minutes';
        if (entropy < 50) return 'Hours';
        if (entropy < 60) return 'Days';
        if (entropy < 70) return 'Years';
        if (entropy < 80) return 'Centuries';
        return 'Millennia+';
    }

    private containsDictionaryWord(password: string): boolean {
        // Simplified check - in production would use proper dictionary
        const commonWords = ['password', 'admin', 'user', 'login', 'welcome', 'qwerty'];
        const lowerPassword = password.toLowerCase();
        return commonWords.some(word => lowerPassword.includes(word));
    }

    private createBehaviorPattern(action: string, context: any): string {
        return `${action}_${context.fileSize || 0}_${context.timeOfDay || 0}`;
    }

    private generateBehaviorRecommendation(action: string, context: any): string {
        if (action === 'encrypt' && context.passwordComplexity < 50) {
            return 'Consider using stronger passwords for encryption';
        }
        return 'Behavior pattern analyzed';
    }

    private analyzeSecurityPatterns(patterns: SecurityPattern[]): string[] {
        return patterns
            .filter(p => p.riskLevel === 'high' && p.confidence > 0.7)
            .map(p => p.recommendation)
            .slice(0, 3);
    }

    private prioritizeRecommendations(recommendations: string[]): string[] {
        // Remove duplicates and prioritize
        const unique = Array.from(new Set(recommendations));
        return unique.slice(0, 5); // Top 5 recommendations
    }

    private getDefaultRecommendations(): string[] {
        return [
            'Use strong, unique passwords for each encrypted note',
            'Enable two-factor authentication when available',
            'Regularly review and update your security settings'
        ];
    }

    private getUserId(): string {
        // Generate or retrieve user ID for pattern storage
        return 'obsidian_user_' + (this.app.vault.getName() || 'default');
    }

    private generateSecurityRecommendations(analysis: SensitiveContentAnalysis): void {
        if (analysis.shouldEncrypt) {
            analysis.recommendations.push('This content should be encrypted due to detected sensitive information');
        }

        if (analysis.sensitivity === 'critical') {
            analysis.recommendations.push('Use very strong passwords for this content');
            analysis.recommendations.push('Consider additional security measures like hardware authentication');
        }

        if (analysis.confidence > 80) {
            analysis.recommendations.push('High confidence in sensitive content detection - immediate encryption recommended');
        }
    }
}