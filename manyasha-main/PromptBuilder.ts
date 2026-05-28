export type PromptRole = 'system' | 'user' | 'assistant';

export interface PromptMessage {
    role: PromptRole;
    content: string;
    createdAt?: string;
}

export interface PromptContext {
    systemBase: string;
    partnerPrompt?: string;
    levelBlock: string;
    costumeBlock: string;
    caseData: Record<string, unknown>;
    history: PromptMessage[];
    modelContextTokens: number;
    historySummary?: string;
    maxHistoryPairs?: number;
}

export interface PromptWarning {
    code:
        | 'PARTNER_PROMPT_TOO_LONG'
        | 'PROMPT_PATTERN_BLOCKED'
        | 'HISTORY_TRIMMED'
        | 'HISTORY_SUMMARIZED'
        | 'CASE_DATA_REDACTED'
        | 'TOKEN_BUDGET_TRIMMED';
    message: string;
}

export interface PromptMetadata {
    totalTokens: number;
    maxPromptTokens: number;
    responseBufferTokens: number;
    partnerPromptTokens: number;
    historyPairsIncluded: number;
    historyPairsSummarized: number;
    warnings: PromptWarning[];
}

export interface PromptBuildResult {
    prompt: string;
    metadata: PromptMetadata;
}

const DEFAULT_MAX_HISTORY_PAIRS = 8;
const CONTEXT_USAGE_RATIO = 0.8;
const RESPONSE_BUFFER_RATIO = 0.2;
const MAX_PARTNER_PROMPT_TOKENS = 1800;
const FORBIDDEN_PATTERNS = [
    /ignore\s+previous/gi,
    /you\s+are\s+now/gi,
    /pretend\s+you/gi,
    /disregard/gi,
];
const PII_KEY_PATTERNS = [
    /fio/i,
    /full_?name/i,
    /name/i,
    /snils/i,
    /address/i,
    /phone/i,
    /email/i,
    /passport/i,
    /inn/i,
    /birth/i,
    /surname/i,
    /lastname/i,
    /middlename/i,
];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class PromptBuilder {
    // Main entry point: builds a fixed-layout prompt and returns prompt budget metadata.
    buildPrompt(context: PromptContext): PromptBuildResult {
        this.validateContext(context);

        const warnings: PromptWarning[] = [];
        const maxPromptTokens = Math.max(1, Math.floor(context.modelContextTokens * CONTEXT_USAGE_RATIO));
        const responseBufferTokens = Math.max(1, context.modelContextTokens - maxPromptTokens);

        const normalizedSystemBase = this.sanitizeUserFacingBlock(context.systemBase, warnings, 'system base');
        const normalizedPartnerPrompt = this.normalizePartnerPrompt(context.partnerPrompt, warnings);
        const normalizedLevelBlock = this.sanitizeUserFacingBlock(context.levelBlock, warnings, 'level block');
        const normalizedCostumeBlock = this.sanitizeUserFacingBlock(context.costumeBlock, warnings, 'costume block');
        const caseDataJson = this.buildCaseDataJson(context.caseData, warnings);

        const systemBlock = this.buildSystemBlock(normalizedSystemBase, normalizedPartnerPrompt);
        const blockPrefix = [
            systemBlock,
            this.wrapSection('level_block', normalizedLevelBlock),
            this.wrapSection('costume_block', normalizedCostumeBlock),
            this.wrapSection('case_data_json', caseDataJson),
        ].join('\n\n');

        const historyResult = this.buildHistoryBlock({
            history: context.history,
            historySummary: context.historySummary,
            maxHistoryPairs: context.maxHistoryPairs ?? DEFAULT_MAX_HISTORY_PAIRS,
            maxPromptTokens,
            prefixTokens: this.estimateTokens(blockPrefix),
            warnings,
        });

        let prompt = [blockPrefix, historyResult.historyBlock].join('\n\n');
        let totalTokens = this.estimateTokens(prompt);

        if (totalTokens > maxPromptTokens) {
            warnings.push({
                code: 'TOKEN_BUDGET_TRIMMED',
                message: 'Промпт превысил 80% контекстного окна модели. История была дополнительно сокращена.',
            });
            const emergencyHistory = this.buildHistoryBlock({
                history: context.history,
                historySummary: context.historySummary,
                maxHistoryPairs: 2,
                maxPromptTokens,
                prefixTokens: this.estimateTokens(blockPrefix),
                warnings,
                forceCompact: true,
            });
            prompt = [blockPrefix, emergencyHistory.historyBlock].join('\n\n');
            totalTokens = this.estimateTokens(prompt);

            return {
                prompt,
                metadata: {
                    totalTokens,
                    maxPromptTokens,
                    responseBufferTokens,
                    partnerPromptTokens: this.estimateTokens(normalizedPartnerPrompt),
                    historyPairsIncluded: emergencyHistory.includedPairs,
                    historyPairsSummarized: emergencyHistory.summarizedPairs,
                    warnings,
                },
            };
        }

        return {
            prompt,
            metadata: {
                totalTokens,
                maxPromptTokens,
                responseBufferTokens,
                partnerPromptTokens: this.estimateTokens(normalizedPartnerPrompt),
                historyPairsIncluded: historyResult.includedPairs,
                historyPairsSummarized: historyResult.summarizedPairs,
                warnings,
            },
        };
    }

    // AI-02: simple deterministic token estimator to enforce prompt budgets without a model-specific tokenizer.
    estimateTokens(input: string): number {
        if (!input) {
            return 0;
        }
        return Math.ceil(input.trim().length / 4);
    }

    // AI-04: ensures case_data_json contains only de-identified UUID-based references and safe scalar metadata.
    private buildCaseDataJson(caseData: Record<string, unknown>, warnings: PromptWarning[]): string {
        const sanitized = this.sanitizeCaseData(caseData, warnings);
        return JSON.stringify(sanitized, null, 2);
    }

    private sanitizeCaseData(value: unknown, warnings: PromptWarning[], path = 'case_data'): unknown {
        if (value === null) {
            return null;
        }

        if (Array.isArray(value)) {
            const sanitizedItems = value
                .map((item, index) => this.sanitizeCaseData(item, warnings, `${path}[${index}]`))
                .filter((item) => item !== undefined);
            return sanitizedItems;
        }

        if (typeof value === 'object') {
            const result: Record<string, unknown> = {};
            for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
                if (PII_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
                    warnings.push({
                        code: 'CASE_DATA_REDACTED',
                        message: `Поле ${path}.${key} удалено из case_data_json, потому что похоже на ПДн. Разрешены только обезличенные идентификаторы и безопасные служебные признаки.`,
                    });
                    continue;
                }

                const sanitizedValue = this.sanitizeCaseData(nestedValue, warnings, `${path}.${key}`);
                if (sanitizedValue !== undefined) {
                    result[key] = sanitizedValue;
                }
            }
            return result;
        }

        if (typeof value === 'string') {
            if (UUID_PATTERN.test(value)) {
                return value;
            }

            warnings.push({
                code: 'CASE_DATA_REDACTED',
                message: `Значение ${path} удалено из case_data_json, потому что строковые поля должны содержать только UUID без ФИО, адресов и иных ПДн.`,
            });
            return undefined;
        }

        if (typeof value === 'number' || typeof value === 'boolean') {
            return value;
        }

        return undefined;
    }

    // AI-06: validates partner prompt size before it is merged into the system block.
    private normalizePartnerPrompt(partnerPrompt: string | undefined, warnings: PromptWarning[]): string {
        if (!partnerPrompt) {
            return '';
        }

        let sanitized = this.sanitizeUserFacingBlock(partnerPrompt, warnings, 'partner prompt');
        let tokens = this.estimateTokens(sanitized);
        if (tokens > MAX_PARTNER_PROMPT_TOKENS) {
            warnings.push({
                code: 'PARTNER_PROMPT_TOO_LONG',
                message: `Партнёрский промпт превышал лимит ${MAX_PARTNER_PROMPT_TOKENS} токенов и был обрезан до допустимого размера.`,
            });
            sanitized = this.trimToTokenBudget(sanitized, MAX_PARTNER_PROMPT_TOKENS);
            tokens = this.estimateTokens(sanitized);
        }

        return sanitized;
    }

    // S-17/S-19: escapes XML-sensitive characters and neutralizes blocked prompt-injection patterns.
    private sanitizeUserFacingBlock(input: string, warnings: PromptWarning[], label: string): string {
        let sanitized = this.escapeXml(input.trim());
        for (const pattern of FORBIDDEN_PATTERNS) {
            if (pattern.test(sanitized)) {
                sanitized = sanitized.replace(pattern, '[blocked-pattern]');
                warnings.push({
                    code: 'PROMPT_PATTERN_BLOCKED',
                    message: `В блоке ${label} найден опасный паттерн prompt injection. Фрагмент заменён на безопасную метку.`,
                });
            }
            pattern.lastIndex = 0;
        }
        return sanitized;
    }

    // S-23: hard guardrails are injected into the system block and cannot be overridden user content.
    private buildSystemBlock(systemBase: string, partnerPrompt: string): string {
        const legalGuardrails = [
            'Маскот не даёт юридических гарантий и не утверждает исход дела.',
            'Запрещено формулировать категоричные обещания в стиле: "вы должны" или "суд решит".',
            'Ответы должны быть осторожными, нейтральными и без имитации официального решения суда или госоргана.',
        ].join('\n');

        const systemParts = [
            systemBase,
            partnerPrompt ? `Партнёрский блок:\n${partnerPrompt}` : '',
            `Guardrails:\n${legalGuardrails}`,
        ].filter(Boolean);

        return this.wrapSection('system_base', systemParts.join('\n\n'));
    }

    // AI-03: keeps only the latest N user+assistant pairs and summarizes older context.
    private buildHistoryBlock(params: {
        history: PromptMessage[];
        historySummary?: string;
        maxHistoryPairs: number;
        maxPromptTokens: number;
        prefixTokens: number;
        warnings: PromptWarning[];
        forceCompact?: boolean;
    }): { historyBlock: string; includedPairs: number; summarizedPairs: number } {
        const compact = params.forceCompact ?? false;
        const pairs = this.toUserAssistantPairs(params.history, params.warnings);
        const maxPairs = Math.max(0, params.maxHistoryPairs);
        const recentPairs = pairs.slice(-maxPairs);
        const olderPairs = pairs.slice(0, Math.max(0, pairs.length - recentPairs.length));

        if (olderPairs.length > 0) {
            params.warnings.push({
                code: 'HISTORY_TRIMMED',
                message: `История ограничена последними ${recentPairs.length} парами user/assistant. Более ранние сообщения вынесены в summary.`,
            });
        }

        const summaryText = olderPairs.length > 0
            ? this.buildHistorySummary(olderPairs, params.historySummary, params.warnings, compact)
            : '';

        const recentHistoryText = recentPairs
            .map((pair, index) => {
                const userBlock = this.wrapSection('history_user', pair.user);
                const assistantBlock = this.wrapSection('history_assistant', pair.assistant);
                return `<!-- pair:${index + 1} -->\n${userBlock}\n${assistantBlock}`;
            })
            .join('\n');

        let historyBlock = this.wrapSection(
            'history',
            [summaryText ? this.wrapSection('history_summary', summaryText) : '', recentHistoryText].filter(Boolean).join('\n'),
        );

        while (this.estimateTokens(historyBlock) + params.prefixTokens > params.maxPromptTokens && recentPairs.length > 0) {
            recentPairs.shift();
            params.warnings.push({
                code: 'TOKEN_BUDGET_TRIMMED',
                message: 'Часть недавней истории удалена, чтобы сохранить 20% буфер для ответа модели.',
            });
            const recomputedRecent = recentPairs
                .map((pair, index) => {
                    const userBlock = this.wrapSection('history_user', pair.user);
                    const assistantBlock = this.wrapSection('history_assistant', pair.assistant);
                    return `<!-- pair:${index + 1} -->\n${userBlock}\n${assistantBlock}`;
                })
                .join('\n');
            historyBlock = this.wrapSection(
                'history',
                [summaryText ? this.wrapSection('history_summary', summaryText) : '', recomputedRecent].filter(Boolean).join('\n'),
            );
        }

        return {
            historyBlock,
            includedPairs: recentPairs.length,
            summarizedPairs: olderPairs.length,
        };
    }

    private buildHistorySummary(
        olderPairs: Array<{ user: string; assistant: string }>,
        providedSummary: string | undefined,
        warnings: PromptWarning[],
        compact: boolean,
    ): string {
        warnings.push({
            code: 'HISTORY_SUMMARIZED',
            message: 'Сообщения старше последних 8 пар свернуты в summary, чтобы не переполнять контекст модели.',
        });

        if (providedSummary) {
            return this.sanitizeUserFacingBlock(providedSummary, warnings, 'history summary');
        }

        const snippetLimit = compact ? 48 : 96;
        const outline = olderPairs.slice(-3).map((pair, index) => {
            const userSnippet = this.compactText(pair.user, snippetLimit);
            const assistantSnippet = this.compactText(pair.assistant, snippetLimit);
            return `Эпизод ${index + 1}: user=${userSnippet}; assistant=${assistantSnippet}`;
        });

        return [
            `Суммаризировано ранних пар: ${olderPairs.length}.`,
            ...outline,
        ].join('\n');
    }

    private toUserAssistantPairs(history: PromptMessage[], warnings: PromptWarning[]): Array<{ user: string; assistant: string }> {
        const sanitizedMessages = history
            .filter((message) => message.role === 'user' || message.role === 'assistant')
            .map((message) => ({
                role: message.role,
                content: this.sanitizeUserFacingBlock(message.content, warnings, `history ${message.role}`),
            }));

        const pairs: Array<{ user: string; assistant: string }> = [];
        let pendingUser: string | null = null;

        for (const message of sanitizedMessages) {
            if (message.role === 'user') {
                pendingUser = message.content;
                continue;
            }

            if (message.role === 'assistant' && pendingUser !== null) {
                pairs.push({
                    user: pendingUser,
                    assistant: message.content,
                });
                pendingUser = null;
            }
        }

        return pairs;
    }

    private trimToTokenBudget(value: string, maxTokens: number): string {
        let candidate = value;
        while (candidate.length > 0 && this.estimateTokens(candidate) > maxTokens) {
            candidate = candidate.slice(0, Math.max(0, candidate.length - 64)).trimEnd();
        }
        return candidate;
    }

    private wrapSection(tag: string, content: string): string {
        return `<${tag}>\n${content}\n</${tag}>`;
    }

    private compactText(value: string, limit: number): string {
        if (value.length <= limit) {
            return value;
        }
        return `${value.slice(0, Math.max(0, limit - 1))}…`;
    }

    private escapeXml(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    private validateContext(context: PromptContext): void {
        if (!context.systemBase.trim()) {
            throw new Error('systemBase не должен быть пустым.');
        }
        if (!context.levelBlock.trim()) {
            throw new Error('levelBlock не должен быть пустым.');
        }
        if (!context.costumeBlock.trim()) {
            throw new Error('costumeBlock не должен быть пустым.');
        }
        if (!Number.isFinite(context.modelContextTokens) || context.modelContextTokens <= 0) {
            throw new Error('modelContextTokens должен быть положительным числом.');
        }
    }
}

export function buildPrompt(context: PromptContext): PromptBuildResult {
    return new PromptBuilder().buildPrompt(context);
}