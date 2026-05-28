export type TTSJingleType = 'case_closed' | 'achievement' | 'notification';

export interface TTSSpeakOptions {
    voice?: string;
    language?: string;
    signal?: AbortSignal;
}

export interface TTSPreloadItem {
    text: string;
    voice?: string;
    language?: string;
}

export interface LipSyncCue {
    startMs: number;
    endMs: number;
    viseme: string;
    phoneme?: string;
}

export interface TTSAsset {
    url: string;
    durationMs: number;
    sizeBytes: number;
    mimeType: string;
    lipSyncCues: LipSyncCue[];
    transcript?: string;
}

export interface TTSProviderRequest {
    text: string;
    voice: string;
    language: string;
    cacheKey: string;
}

export interface TTSProvider {
    synthesize(request: TTSProviderRequest): Promise<TTSAsset>;
}

export interface TTSPlaybackResult {
    cacheKey: string;
    url: string;
    durationMs: number;
    fromCache: boolean;
    usedFallback: boolean;
}

export interface TTSManagerOptions {
    provider: TTSProvider;
    defaultVoice: string;
    defaultLanguage: string;
    cdnBaseUrl?: string;
    maxClipBytes?: number;
    maxClipDurationMs?: number;
    lipSyncToleranceMs?: number;
    onLipSyncFrame?: (cue: LipSyncCue | null) => void;
    onVisualFallback?: (payload: { text: string; reason: string }) => void;
    onError?: (error: Error) => void;
}

interface CacheEntry {
    asset: TTSAsset;
}

interface LcpPreloadEntry extends TTSPreloadItem {
    cacheKey: string;
}

const DEFAULT_MAX_CLIP_BYTES = 80 * 1024;
const DEFAULT_MAX_CLIP_DURATION_MS = 5000;
const DEFAULT_LIP_SYNC_TOLERANCE_MS = 80;
const DEFAULT_AUDIO_MIME = 'audio/mpeg';

export class TTSManager {
    private readonly provider: TTSProvider;
    private readonly defaultVoice: string;
    private readonly defaultLanguage: string;
    private readonly cdnBaseUrl?: string;
    private readonly maxClipBytes: number;
    private readonly maxClipDurationMs: number;
    private readonly lipSyncToleranceMs: number;
    private onLipSyncFrame?: (cue: LipSyncCue | null) => void;
    private onVisualFallback?: (payload: { text: string; reason: string }) => void;
    private readonly onError?: (error: Error) => void;

    private readonly cache = new Map<string, CacheEntry>();
    private readonly preloadQueue: LcpPreloadEntry[] = [];
    private readonly preloadLinks = new Set<string>();
    private readonly audio = new Audio();

    private audioContext: AudioContext | null = null;
    private lipSyncTimer: number | null = null;
    private lcpObserved = false;
    private lcpReady = false;

    constructor(options: TTSManagerOptions) {
        this.provider = options.provider;
        this.defaultVoice = options.defaultVoice;
        this.defaultLanguage = options.defaultLanguage;
        this.cdnBaseUrl = options.cdnBaseUrl;
        this.maxClipBytes = options.maxClipBytes ?? DEFAULT_MAX_CLIP_BYTES;
        this.maxClipDurationMs = options.maxClipDurationMs ?? DEFAULT_MAX_CLIP_DURATION_MS;
        this.lipSyncToleranceMs = options.lipSyncToleranceMs ?? DEFAULT_LIP_SYNC_TOLERANCE_MS;
        this.onLipSyncFrame = options.onLipSyncFrame;
        this.onVisualFallback = options.onVisualFallback;
        this.onError = options.onError;

        this.audio.preload = 'none';
        this.audio.crossOrigin = 'anonymous';
        (this.audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
        this.audio.addEventListener('ended', () => this.clearLipSync());
        this.audio.addEventListener('pause', () => {
            if (this.audio.currentTime === 0 || this.audio.ended) {
                this.clearLipSync();
            }
        });

        this.observeLcp();
    }

    // Allows orchestration layers to receive viseme updates after the TTS manager is constructed.
    setLipSyncListener(listener?: (cue: LipSyncCue | null) => void): void {
        this.onLipSyncFrame = listener;
    }

    // Allows UI controllers to react to text bubble fallback when audio cannot be synthesized or played.
    setVisualFallbackListener(listener?: (payload: { text: string; reason: string }) => void): void {
        this.onVisualFallback = listener;
    }

    // Main TTS entry point with cache-first lookup, playback, lip-sync scheduling, and visual fallback.
    async speak(text: string, options: TTSSpeakOptions = {}): Promise<TTSPlaybackResult> {
        const normalizedText = text.trim();
        if (!normalizedText) {
            throw new Error('Текст для озвучки пустой. Передайте непустую реплику в speak(text).');
        }

        const voice = options.voice ?? this.defaultVoice;
        const language = options.language ?? this.defaultLanguage;
        const cacheKey = await this.createCacheKey(normalizedText, voice, language);

        try {
            const assetResult = await this.getOrCreateAsset(normalizedText, voice, language, cacheKey, options.signal);
            this.stop();
            this.audio.src = assetResult.asset.url;
            this.audio.preload = 'auto';
            await this.audio.play();
            this.startLipSync(assetResult.asset.lipSyncCues);

            return {
                cacheKey,
                url: assetResult.asset.url,
                durationMs: assetResult.asset.durationMs,
                fromCache: assetResult.fromCache,
                usedFallback: false,
            };
        } catch (error) {
            const wrapped = this.toError(error, 'Не удалось воспроизвести TTS. Показываю текстовый bubble вместо озвучки.');
            this.onError?.(wrapped);
            this.onVisualFallback?.({ text: normalizedText, reason: wrapped.message });
            this.clearLipSync();

            return {
                cacheKey,
                url: '',
                durationMs: 0,
                fromCache: false,
                usedFallback: true,
            };
        }
    }

    // P-09: preloads repeated replies after LCP so the audio is hot in browser cache before the user asks for it.
    async preload(replies: TTSPreloadItem[]): Promise<void> {
        const entries = await Promise.all(
            replies.map(async (reply) => ({
                ...reply,
                cacheKey: await this.createCacheKey(
                    reply.text.trim(),
                    reply.voice ?? this.defaultVoice,
                    reply.language ?? this.defaultLanguage,
                ),
            })),
        );

        if (!this.lcpReady) {
            this.preloadQueue.push(...entries);
            return;
        }

        await Promise.all(entries.map((entry) => this.preloadEntry(entry)));
    }

    // W-04: Web Audio API jingles are synthesized locally and do not depend on external TTS services.
    async playJingle(type: TTSJingleType): Promise<void> {
        const audioContext = this.getAudioContext();
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        const now = audioContext.currentTime + 0.01;
        const sequence = this.getJingleNotes(type);
        for (const note of sequence) {
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();
            oscillator.type = note.wave;
            oscillator.frequency.setValueAtTime(note.frequency, now + note.offset);

            gain.gain.setValueAtTime(0.0001, now + note.offset);
            gain.gain.exponentialRampToValueAtTime(note.gain, now + note.offset + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + note.offset + note.duration);

            oscillator.connect(gain);
            gain.connect(audioContext.destination);
            oscillator.start(now + note.offset);
            oscillator.stop(now + note.offset + note.duration);
        }
    }

    // Stops active speech playback and clears current viseme state.
    stop(): void {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.clearLipSync();
    }

    private async getOrCreateAsset(
        text: string,
        voice: string,
        language: string,
        cacheKey: string,
        signal?: AbortSignal,
    ): Promise<{ asset: TTSAsset; fromCache: boolean }> {
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return { asset: cached.asset, fromCache: true };
        }

        if (signal?.aborted) {
            throw new Error('Запрос TTS был отменён до начала синтеза.');
        }

        const asset = await this.provider.synthesize({
            text,
            voice,
            language,
            cacheKey,
        });

        this.validateAsset(asset, text);
        this.cache.set(cacheKey, { asset });
        return { asset, fromCache: false };
    }

    private validateAsset(asset: TTSAsset, text: string): void {
        if (asset.mimeType !== DEFAULT_AUDIO_MIME) {
            throw new Error(
                `TTS вернул MIME-тип ${asset.mimeType}. Ожидается MP3 (${DEFAULT_AUDIO_MIME}) 128 kbps для браузерного плеера.`,
            );
        }

        if (asset.sizeBytes > this.maxClipBytes) {
            throw new Error(
                `Аудио для реплики "${this.compactText(text)}" весит ${(asset.sizeBytes / 1024).toFixed(1)} КБ и превышает лимит ${(this.maxClipBytes / 1024).toFixed(0)} КБ.`,
            );
        }

        if (asset.durationMs > this.maxClipDurationMs) {
            throw new Error(
                `Длительность TTS ${Math.round(asset.durationMs)} мс превышает лимит ${this.maxClipDurationMs} мс. Сократите реплику или делите её на части.`,
            );
        }

        this.validateLipSync(asset.lipSyncCues);
    }

    // T-13: validates cue continuity so viseme scheduling stays within the configured lip-sync tolerance window.
    private validateLipSync(cues: LipSyncCue[]): void {
        for (let index = 0; index < cues.length; index += 1) {
            const cue = cues[index];
            if (cue.endMs < cue.startMs) {
                throw new Error('Lip-sync cues некорректны: endMs не может быть меньше startMs.');
            }

            const nextCue = cues[index + 1];
            if (!nextCue) {
                continue;
            }

            const gap = Math.abs(nextCue.startMs - cue.endMs);
            if (gap > this.lipSyncToleranceMs) {
                throw new Error(
                    `Lip-sync cues имеют разрыв ${gap} мс, что хуже допустимого окна ±${this.lipSyncToleranceMs} мс. Перегенерируйте фонемы через rhubarb-lip-sync или Oculus LipSync.`,
                );
            }
        }
    }

    private startLipSync(cues: LipSyncCue[]): void {
        this.clearLipSync();
        if (cues.length === 0) {
            this.onLipSyncFrame?.(null);
            return;
        }

        const startedAt = performance.now();
        const step = () => {
            const elapsedMs = performance.now() - startedAt;
            const cue = cues.find((item) => elapsedMs >= item.startMs - this.lipSyncToleranceMs && elapsedMs <= item.endMs + this.lipSyncToleranceMs) ?? null;
            this.onLipSyncFrame?.(cue);

            if (this.audio.paused || this.audio.ended) {
                this.clearLipSync();
                return;
            }

            this.lipSyncTimer = window.setTimeout(step, 16);
        };

        step();
    }

    private clearLipSync(): void {
        if (this.lipSyncTimer !== null) {
            window.clearTimeout(this.lipSyncTimer);
            this.lipSyncTimer = null;
        }
        this.onLipSyncFrame?.(null);
    }

    private async preloadEntry(entry: LcpPreloadEntry): Promise<void> {
        if (this.preloadLinks.has(entry.cacheKey)) {
            return;
        }

        const voice = entry.voice ?? this.defaultVoice;
        const language = entry.language ?? this.defaultLanguage;
        const assetResult = await this.getOrCreateAsset(entry.text.trim(), voice, language, entry.cacheKey);
        this.injectPreloadLink(assetResult.asset.url, entry.cacheKey);
    }

    private injectPreloadLink(url: string, cacheKey: string): void {
        if (this.preloadLinks.has(cacheKey)) {
            return;
        }

        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'audio';
        link.href = this.normalizeUrl(url);
        link.type = DEFAULT_AUDIO_MIME;
        document.head.appendChild(link);
        this.preloadLinks.add(cacheKey);
    }

    private observeLcp(): void {
        if (this.lcpObserved || typeof PerformanceObserver === 'undefined') {
            this.lcpReady = true;
            return;
        }

        this.lcpObserved = true;
        try {
            const observer = new PerformanceObserver(() => {
                this.lcpReady = true;
                observer.disconnect();
                void this.flushPreloadQueue();
            });
            observer.observe({ type: 'largest-contentful-paint', buffered: true });

            window.setTimeout(() => {
                if (!this.lcpReady) {
                    this.lcpReady = true;
                    observer.disconnect();
                    void this.flushPreloadQueue();
                }
            }, 2500);
        } catch {
            this.lcpReady = true;
        }
    }

    private async flushPreloadQueue(): Promise<void> {
        const queue = this.preloadQueue.splice(0, this.preloadQueue.length);
        await Promise.all(queue.map((entry) => this.preloadEntry(entry)));
    }

    private getAudioContext(): AudioContext {
        if (!this.audioContext) {
            this.audioContext = new AudioContext();
        }
        return this.audioContext;
    }

    private async createCacheKey(text: string, voice: string, language: string): Promise<string> {
        const payload = `${text}\u241f${voice}\u241f${language}`;
        const bytes = new TextEncoder().encode(payload);
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        return Array.from(new Uint8Array(digest))
            .map((value) => value.toString(16).padStart(2, '0'))
            .join('');
    }

    private normalizeUrl(url: string): string {
        if (!this.cdnBaseUrl || /^https?:\/\//i.test(url)) {
            return url;
        }
        return `${this.cdnBaseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
    }

    private compactText(value: string): string {
        if (value.length <= 48) {
            return value;
        }
        return `${value.slice(0, 47)}...`;
    }

    private toError(error: unknown, fallbackMessage: string): Error {
        if (error instanceof Error) {
            return error;
        }
        return new Error(fallbackMessage);
    }

    private getJingleNotes(type: TTSJingleType): Array<{
        offset: number;
        duration: number;
        frequency: number;
        gain: number;
        wave: OscillatorType;
    }> {
        if (type === 'case_closed') {
            return [
                { offset: 0, duration: 0.16, frequency: 523.25, gain: 0.12, wave: 'triangle' },
                { offset: 0.18, duration: 0.18, frequency: 659.25, gain: 0.12, wave: 'triangle' },
                { offset: 0.38, duration: 0.28, frequency: 783.99, gain: 0.15, wave: 'triangle' },
            ];
        }
        if (type === 'achievement') {
            return [
                { offset: 0, duration: 0.14, frequency: 440, gain: 0.1, wave: 'sine' },
                { offset: 0.12, duration: 0.14, frequency: 554.37, gain: 0.11, wave: 'sine' },
                { offset: 0.24, duration: 0.24, frequency: 659.25, gain: 0.14, wave: 'sine' },
            ];
        }
        return [
            { offset: 0, duration: 0.08, frequency: 392, gain: 0.08, wave: 'square' },
            { offset: 0.1, duration: 0.1, frequency: 523.25, gain: 0.09, wave: 'square' },
        ];
    }
}