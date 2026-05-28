import { PromptBuilder, type PromptBuildResult, type PromptContext } from './PromptBuilder';
import { MascotRenderer } from './MascotRenderer';
import { TTSManager, type TTSJingleType } from './TTSManager';

export interface MascotControllerOptions {
    renderer: MascotRenderer;
    ttsManager: TTSManager;
    promptBuilder?: PromptBuilder;
    ariaLiveContainer?: HTMLElement;
    onBubbleFallback?: (text: string, reason: string) => void;
    onPromptBuilt?: (result: PromptBuildResult) => void;
    onStreamUpdate?: (text: string) => void;
}

export interface LLMStreamChunk {
    token?: string;
    done?: boolean;
    error?: string;
}

export interface LLMStreamResult {
    text: string;
    firstTokenLatencyMs: number;
    withinTarget: boolean;
}

const FIRST_TOKEN_TARGET_MS = 1200;
const BLOCKED_TTS_PATTERNS = [
    /\b\d{3}-\d{3}-\d{3} \d{2}\b/g,
    /\b\d{11}\b/g,
    /\b(?:ул\.|улица|проспект|д\.|дом|кв\.|квартира)\s+[^,.;\n]+/gi,
    /\b[A-ZА-ЯЁ][a-zа-яё]+\s+[A-ZА-ЯЁ][a-zа-яё]+\s+[A-ZА-ЯЁ][a-zа-яё]+\b/g,
];

export class MascotController {
    private readonly renderer: MascotRenderer;
    private readonly ttsManager: TTSManager;
    private readonly promptBuilder: PromptBuilder;
    private readonly ariaLiveElement: HTMLDivElement;
    private readonly onBubbleFallback?: (text: string, reason: string) => void;
    private readonly onPromptBuilt?: (result: PromptBuildResult) => void;
    private readonly onStreamUpdate?: (text: string) => void;
    private costumeBlockOverride = '';

    constructor(options: MascotControllerOptions) {
        this.renderer = options.renderer;
        this.promptBuilder = options.promptBuilder ?? new PromptBuilder();
        this.onBubbleFallback = options.onBubbleFallback;
        this.onPromptBuilt = options.onPromptBuilt;
        this.onStreamUpdate = options.onStreamUpdate;
        this.ariaLiveElement = this.createAriaLiveRegion(options.ariaLiveContainer);
        this.ttsManager = options.ttsManager;

        this.patchTtsCallbacks();
    }

    // AI-01: builds the final LLM prompt from fixed blocks before a request is sent to the model.
    buildPrompt(context: PromptContext): PromptBuildResult {
        const mergedContext: PromptContext = {
            ...context,
            costumeBlock: [context.costumeBlock, this.costumeBlockOverride].filter(Boolean).join('\n').trim(),
        };
        const result = this.promptBuilder.buildPrompt(mergedContext);
        this.onPromptBuilt?.(result);
        return result;
    }

    // Allows wardrobe logic to inject the currently active costume description into subsequent prompts.
    setCostumeBlock(costumeBlock: string): void {
        this.costumeBlockOverride = costumeBlock.trim();
    }

    // Speaks the final assistant reply, validates for PII first, updates aria-live, and drives viseme morph targets.
    async speakReply(text: string): Promise<void> {
        const sanitized = text.trim();
        if (!sanitized) {
            return;
        }

        this.updateAriaLive(sanitized);
        this.validateTextForTts(sanitized);

        const result = await this.ttsManager.speak(sanitized);
        if (result.usedFallback) {
            this.onBubbleFallback?.(sanitized, 'TTS недоступен, показан текстовый fallback.');
        }
    }

    // P-08: consumes SSE or async token streams, tracks first-token latency, and optionally voices the final reply.
    async handleLLMStream(
        stream: ReadableStream<string | Uint8Array> | AsyncIterable<string | Uint8Array | LLMStreamChunk>,
        options: { autoSpeak?: boolean } = {},
    ): Promise<LLMStreamResult> {
        const startedAt = performance.now();
        let firstTokenLatencyMs = Number.POSITIVE_INFINITY;
        let text = '';

        for await (const chunk of this.iterateStream(stream)) {
            if (chunk.done) {
                break;
            }

            if (chunk.error) {
                throw new Error(`LLM streaming завершился с ошибкой: ${chunk.error}`);
            }

            if (!chunk.token) {
                continue;
            }

            if (!Number.isFinite(firstTokenLatencyMs)) {
                firstTokenLatencyMs = performance.now() - startedAt;
            }

            text += chunk.token;
            this.onStreamUpdate?.(text);
        }

        const withinTarget = firstTokenLatencyMs <= FIRST_TOKEN_TARGET_MS;
        if (options.autoSpeak !== false) {
            await this.speakReply(text);
        } else {
            this.updateAriaLive(text);
        }

        return {
            text,
            firstTokenLatencyMs: Number.isFinite(firstTokenLatencyMs) ? firstTokenLatencyMs : performance.now() - startedAt,
            withinTarget,
        };
    }

    // W-04: delegates success and notification sound cues to TTSManager's Web Audio jingle engine.
    async triggerJingle(type: TTSJingleType): Promise<void> {
        await this.ttsManager.playJingle(type);
    }

    stop(): void {
        this.ttsManager.stop();
        this.renderer.resetMorphTargets();
    }

    private patchTtsCallbacks(): void {
        this.ttsManager.setLipSyncListener((cue) => {
            if (!cue) {
                this.renderer.resetMorphTargets();
                return;
            }

            const morphName = this.mapVisemeToMorphTarget(cue.viseme, cue.phoneme);
            if (!this.renderer.setMorphTarget(morphName, 1)) {
                this.renderer.resetMorphTargets();
            }
        });

        this.ttsManager.setVisualFallbackListener((payload) => {
            this.updateAriaLive(payload.text);
            this.onBubbleFallback?.(payload.text, payload.reason);
        });
    }

    // S-02: blocks PII-looking content before it is sent to speech synthesis providers or CDN caches.
    private validateTextForTts(text: string): void {
        for (const pattern of BLOCKED_TTS_PATTERNS) {
            if (pattern.test(text)) {
                pattern.lastIndex = 0;
                throw new Error(
                    'Текст содержит признаки ПДн и не будет отправлен в TTS. Удалите ФИО, СНИЛС, адреса и иные чувствительные данные перед озвучкой.',
                );
            }
            pattern.lastIndex = 0;
        }
    }

    private mapVisemeToMorphTarget(viseme: string, phoneme?: string): string {
        const normalized = (viseme || phoneme || 'rest').toLowerCase();
        const directMap: Record<string, string> = {
            sil: 'viseme_sil',
            rest: 'viseme_sil',
            aa: 'viseme_aa',
            ah: 'viseme_aa',
            ae: 'viseme_aa',
            oh: 'viseme_oh',
            ou: 'viseme_oh',
            ee: 'viseme_ee',
            ih: 'viseme_ee',
            fv: 'viseme_fv',
            f: 'viseme_fv',
            v: 'viseme_fv',
            bmp: 'viseme_bmp',
            b: 'viseme_bmp',
            m: 'viseme_bmp',
            p: 'viseme_bmp',
            l: 'viseme_l',
            th: 'viseme_th',
            d: 'viseme_dd',
            t: 'viseme_dd',
            n: 'viseme_dd',
            k: 'viseme_kk',
            g: 'viseme_kk',
            ch: 'viseme_ch',
            sh: 'viseme_ch',
            zh: 'viseme_ch',
            rr: 'viseme_rr',
            r: 'viseme_rr',
        };

        return directMap[normalized] ?? 'viseme_sil';
    }

    private createAriaLiveRegion(container?: HTMLElement): HTMLDivElement {
        const element = document.createElement('div');
        element.setAttribute('aria-live', 'polite');
        element.setAttribute('aria-atomic', 'true');
        element.style.position = 'absolute';
        element.style.width = '1px';
        element.style.height = '1px';
        element.style.padding = '0';
        element.style.margin = '-1px';
        element.style.overflow = 'hidden';
        element.style.clip = 'rect(0 0 0 0)';
        element.style.whiteSpace = 'nowrap';
        element.style.border = '0';
        (container ?? document.body).appendChild(element);
        return element;
    }

    private updateAriaLive(text: string): void {
        this.ariaLiveElement.textContent = text;
    }

    private async *iterateStream(
        stream: ReadableStream<string | Uint8Array> | AsyncIterable<string | Uint8Array | LLMStreamChunk>,
    ): AsyncGenerator<LLMStreamChunk> {
        if (this.isAsyncIterable<string | Uint8Array | LLMStreamChunk>(stream)) {
            for await (const chunk of stream) {
                yield this.normalizeStreamChunk(chunk);
            }
            return;
        }

        const readableStream: ReadableStream<string | Uint8Array> = stream;
        const reader = readableStream.getReader();
        const decoder = new TextDecoder();
        let pending = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    if (pending.trim()) {
                        yield* this.parseSsePayload(pending);
                    }
                    break;
                }

                pending += typeof value === 'string' ? value : decoder.decode(value, { stream: true });
                const frames = pending.split('\n\n');
                pending = frames.pop() ?? '';
                for (const frame of frames) {
                    yield* this.parseSsePayload(frame);
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    private *parseSsePayload(payload: string): Generator<LLMStreamChunk> {
        const lines = payload
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);

        for (const line of lines) {
            if (!line.startsWith('data:')) {
                continue;
            }

            const body = line.slice(5).trim();
            if (!body || body === '[DONE]') {
                yield { done: true };
                continue;
            }

            try {
                const parsed = JSON.parse(body) as { token?: string; delta?: string; done?: boolean; error?: string };
                yield {
                    token: parsed.token ?? parsed.delta,
                    done: parsed.done,
                    error: parsed.error,
                };
            } catch {
                yield { token: body };
            }
        }
    }

    private normalizeStreamChunk(chunk: string | Uint8Array | LLMStreamChunk): LLMStreamChunk {
        if (typeof chunk === 'string') {
            return { token: chunk };
        }
        if (chunk instanceof Uint8Array) {
            return { token: new TextDecoder().decode(chunk) };
        }
        return chunk;
    }

    private isAsyncIterable<T>(value: unknown): value is AsyncIterable<T> {
        return Boolean(value && typeof (value as AsyncIterable<T>)[Symbol.asyncIterator] === 'function');
    }
}