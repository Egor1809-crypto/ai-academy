import {
    BufferGeometry,
    LoadingManager,
    Mesh,
    Object3D,
    SkinnedMesh,
    WebGLRenderer,
} from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

import type { MascotLODMap, MascotLODSource, MascotRenderer } from './MascotRenderer';

type MascotAssetProfile = 'mascot' | 'partner';
type MascotLodLevel = 0 | 1 | 2;

export interface MascotAssetSource {
    url: string;
    mimeType?: string;
    label?: string;
}

export interface MascotLoadRequest {
    profile?: MascotAssetProfile;
    skeleton?: MascotAssetSource;
    lods: Partial<Record<MascotLodLevel, MascotAssetSource>>;
    initialLod?: MascotLodLevel;
}

export interface MascotLoaderOptions {
    dracoDecoderPath: string;
    ktx2TranscoderPath: string;
    renderer?: WebGLRenderer | null;
    progressContainer?: HTMLElement;
    cacheName?: string;
    cacheTtlMs?: number;
    lazyDelayMs?: number;
    skeletonRevealMs?: number;
    onProgress?: (progress: MascotLoaderProgress) => void;
    onWarning?: (warning: string) => void;
}

export interface MascotLoaderProgress {
    phase: 'idle' | 'preflight' | 'skeleton' | 'lod' | 'done';
    loaded: number;
    total: number;
    percent: number;
    message: string;
}

export interface MascotLoaderWarning {
    code:
        | 'LOD_POLYGONS_EXCEEDED'
        | 'MISSING_PROGRESSIVE_SKELETON'
        | 'KTX2_RENDERER_MISSING'
        | 'MISSING_DRACO_COMPRESSION'
        | 'MISSING_KTX2_TEXTURES';
    level?: MascotLodLevel;
    message: string;
}

export interface MascotLoadResult {
    lodMap: MascotLODMap;
    warnings: MascotLoaderWarning[];
    bytesLoaded: number;
    initialLod: MascotLodLevel;
}

const MAX_MODEL_BYTES: Record<MascotAssetProfile, number> = {
    mascot: 8 * 1024 * 1024,
    partner: 15 * 1024 * 1024,
};

const LOD_POLYGON_LIMITS: Record<MascotLodLevel, number> = {
    0: 5000,
    1: 12000,
    2: 25000,
};

const DEFAULT_CACHE_NAME = 'mascot-model-cache-v1';
const DEFAULT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_LAZY_DELAY_MS = 1;
const DEFAULT_SKELETON_REVEAL_MS = 300;
const ALLOWED_MODEL_MIME_TYPES = new Set([
    'model/gltf-binary',
    'model/gltf+json',
    'application/octet-stream',
    'application/gltf-buffer',
    'application/json',
]);
const ALLOWED_IMAGE_MIME_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/ktx2',
]);
const ALLOWED_GLTF_EXTENSIONS = new Set([
    'KHR_draco_mesh_compression',
    'KHR_texture_basisu',
    'KHR_materials_unlit',
    'KHR_materials_emissive_strength',
    'KHR_lights_punctual',
    'KHR_mesh_quantization',
    'KHR_materials_variants',
]);

interface CacheMetadata {
    cachedAt: number;
}

interface LoadedAsset {
    gltf: GLTF;
    bytes: number;
}

interface ParsedGltfManifest {
    extensionsUsed: string[];
    images: Array<{ mimeType?: string }>;
    hasTextures: boolean;
}

export class MascotLoaderError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MascotLoaderError';
    }
}

export class MascotLoader {
    private readonly dracoDecoderPath: string;
    private readonly ktx2TranscoderPath: string;
    private readonly renderer: WebGLRenderer | null;
    private readonly cacheName: string;
    private readonly cacheTtlMs: number;
    private readonly lazyDelayMs: number;
    private readonly skeletonRevealMs: number;
    private readonly warnings: MascotLoaderWarning[] = [];
    private readonly progressRoot: HTMLDivElement;
    private readonly progressBar: HTMLDivElement;
    private readonly progressLabel: HTMLSpanElement;
    private readonly onProgress?: (progress: MascotLoaderProgress) => void;
    private readonly onWarning?: (warning: string) => void;

    private progressState: MascotLoaderProgress = {
        phase: 'idle',
        loaded: 0,
        total: 100,
        percent: 0,
        message: 'Ожидание загрузки модели.',
    };

    constructor(options: MascotLoaderOptions) {
        this.dracoDecoderPath = options.dracoDecoderPath;
        this.ktx2TranscoderPath = options.ktx2TranscoderPath;
        this.renderer = options.renderer ?? null;
        this.cacheName = options.cacheName ?? DEFAULT_CACHE_NAME;
        this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
        this.lazyDelayMs = options.lazyDelayMs ?? DEFAULT_LAZY_DELAY_MS;
        this.skeletonRevealMs = options.skeletonRevealMs ?? DEFAULT_SKELETON_REVEAL_MS;
        this.onProgress = options.onProgress;
        this.onWarning = options.onWarning;

        this.progressRoot = document.createElement('div');
        this.progressBar = document.createElement('div');
        this.progressLabel = document.createElement('span');
        this.setupProgressBar(options.progressContainer);
    }

    // Lazy-load entry point that can progressively reveal a lightweight skeleton before full LOD assets finish.
    async load(request: MascotLoadRequest): Promise<MascotLoadResult> {
        return this.loadInternal(request);
    }

    // Convenience method for direct integration with MascotRenderer.setLODModels().
    async loadIntoRenderer(renderer: MascotRenderer, request: MascotLoadRequest): Promise<MascotLoadResult> {
        const result = await this.loadInternal(request, (skeleton) => {
            renderer.setModel({
                scene: skeleton.gltf.scene,
                animations: skeleton.gltf.animations,
            });
        });
        renderer.setLODModels(result.lodMap, result.initialLod);
        return result;
    }

    private async loadInternal(
        request: MascotLoadRequest,
        onSkeletonReady?: (asset: LoadedAsset) => void,
    ): Promise<MascotLoadResult> {
        this.warnings.length = 0;
        await this.deferStart();

        const profile = request.profile ?? 'mascot';
        const initialLod = request.initialLod ?? this.pickDefaultLod();
        const maxBytes = MAX_MODEL_BYTES[profile];

        this.updateProgress('preflight', 5, 'Проверяю конфигурацию модели и ограничения безопасности.');
        this.validateRequest(request);

        let bytesLoaded = 0;
        let skeletonApplied = false;
        const revealDeadline = this.delay(this.skeletonRevealMs);
        const lodEntries = (Object.entries(request.lods) as Array<[string, MascotAssetSource | undefined]>)
            .filter((entry): entry is [string, MascotAssetSource] => Boolean(entry[1]))
            .map(([level, source]) => [Number(level) as MascotLodLevel, source] as const)
            .sort((left, right) => left[0] - right[0]);

        const progressiveSkeletonPromise = request.skeleton
            ? this.loadAsset(request.skeleton, maxBytes, 'skeleton', profile)
            : null;

        if (!progressiveSkeletonPromise) {
            this.pushWarning({
                code: 'MISSING_PROGRESSIVE_SKELETON',
                message: 'Для progressive streaming лучше передать skeleton-ресурс: тогда каркас появится примерно через 0.3 секунды.',
            });
        }

        const lodPromises = new Map<MascotLodLevel, Promise<LoadedAsset>>();
        for (const [level, source] of lodEntries) {
            lodPromises.set(level, this.loadAsset(source, maxBytes, 'lod-' + level, profile));
        }

        await revealDeadline;
        if (progressiveSkeletonPromise) {
            try {
                const skeletonAsset = await progressiveSkeletonPromise;
                bytesLoaded += skeletonAsset.bytes;
                this.updateProgress('skeleton', 25, 'Показываю облегчённый каркас персонажа, пока догружаются текстуры и LOD.');
                skeletonApplied = true;
                onSkeletonReady?.(skeletonAsset);
            } catch (error) {
                throw this.wrapError(error, 'Не удалось загрузить облегчённый каркас модели. Проверьте DRACO/KTX2-ресурсы и структуру glTF.');
            }
        }

        const lodMap: MascotLODMap = {};
        let completedLods = 0;
        for (const [level, promise] of lodPromises) {
            const loaded = await promise;
            bytesLoaded += loaded.bytes;
            lodMap[level] = this.toLodSource(loaded.gltf, level);
            completedLods += 1;
            const base = 25;
            const span = 70;
            const progress = base + Math.round((completedLods / Math.max(lodPromises.size, 1)) * span);
            this.updateProgress('lod', progress, `LOD-${level} загружен. Проверяю полигоны и подготавливаю сцену.`);
        }

        if (!skeletonApplied && request.skeleton) {
            await progressiveSkeletonPromise;
        }

        this.updateProgress('done', 100, '3D-модель подготовлена к передаче в рендерер.');
        return {
            lodMap,
            warnings: [...this.warnings],
            bytesLoaded,
            initialLod,
        };
    }

    // Service-worker-friendly cache-first fetch with TTL backed by the Cache Storage API.
    private async fetchWithCache(url: string): Promise<Response> {
        if (typeof caches === 'undefined') {
            return fetch(url, { credentials: 'same-origin' });
        }

        const cache = await caches.open(this.cacheName);
        const metaKey = new Request(this.createMetaUrl(url));
        const cachedResponse = await cache.match(url);
        const cachedMeta = await cache.match(metaKey);

        if (cachedResponse && cachedMeta) {
            const metadata = (await cachedMeta.json()) as CacheMetadata;
            if (Date.now() - metadata.cachedAt <= this.cacheTtlMs) {
                return cachedResponse;
            }
            await cache.delete(url);
            await cache.delete(metaKey);
        }

        const networkResponse = await fetch(url, { credentials: 'same-origin' });
        if (!networkResponse.ok) {
            throw new MascotLoaderError(`Не удалось скачать ресурс ${url}. Сервер вернул статус ${networkResponse.status}.`);
        }

        await cache.put(url, networkResponse.clone());
        await cache.put(metaKey, new Response(JSON.stringify({ cachedAt: Date.now() } satisfies CacheMetadata), {
            headers: { 'Content-Type': 'application/json' },
        }));

        return networkResponse;
    }

    // T-07: start network activity outside the critical rendering path so page load stays responsive.
    private deferStart(): Promise<void> {
        return new Promise((resolve) => {
            const start = () => window.setTimeout(resolve, this.lazyDelayMs);
            if ('requestIdleCallback' in window) {
                window.requestIdleCallback(() => start(), { timeout: 500 });
                return;
            }
            start();
        });
    }

    private async loadAsset(
        source: MascotAssetSource,
        maxBytes: number,
        stage: string,
        profile: MascotAssetProfile,
    ): Promise<LoadedAsset> {
        const response = await this.fetchWithCache(source.url);
        const contentType = this.normalizeMimeType(source.mimeType ?? response.headers.get('Content-Type') ?? '');
        this.validateTopLevelMimeType(contentType, source.url);

        const bytes = await response.arrayBuffer();
        this.validateSize(bytes.byteLength, maxBytes, source.url);
        const manifest = this.parseGltfManifest(bytes, source.url, contentType);
        this.validateManifest(manifest, source.url, profile);

        const manager = new LoadingManager();
        const gltfLoader = new GLTFLoader(manager);
        const dracoLoader = new DRACOLoader(manager);
        dracoLoader.setDecoderPath(this.dracoDecoderPath);
        gltfLoader.setDRACOLoader(dracoLoader);

        const ktx2Loader = new KTX2Loader(manager);
        ktx2Loader.setTranscoderPath(this.ktx2TranscoderPath);
        if (this.renderer) {
            ktx2Loader.detectSupport(this.renderer);
            gltfLoader.setKTX2Loader(ktx2Loader);
        } else if (manifest.hasTextures) {
            this.pushWarning({
                code: 'KTX2_RENDERER_MISSING',
                message: 'KTX2-текстуры обнаружены, но WebGLRenderer не передан в MascotLoader. Передайте renderer, чтобы Basis Universal декодировался корректно.',
            });
        }

        this.updateProgress(stage === 'skeleton' ? 'skeleton' : 'lod', Math.min(this.progressState.percent + 10, 85), `Загружаю ${source.label ?? source.url}.`);
        try {
            const gltf = await gltfLoader.parseAsync(bytes, this.resolveResourceRoot(source.url));
            return { gltf, bytes: bytes.byteLength };
        } catch (error) {
            throw this.wrapError(error, `Не удалось разобрать файл ${source.url}. Убедитесь, что glTF собран с DRACO и KTX2 и не содержит запрещённых расширений.`);
        } finally {
            dracoLoader.dispose();
            ktx2Loader.dispose();
        }
    }

    private toLodSource(gltf: GLTF, level: MascotLodLevel): MascotLODSource {
        const polygons = this.countPolygons(gltf.scene);
        const limit = LOD_POLYGON_LIMITS[level];
        if (polygons > limit) {
            this.pushWarning({
                code: 'LOD_POLYGONS_EXCEEDED',
                level,
                message: `LOD-${level} содержит ${polygons} полигонов при лимите ${limit}. Сожмите геометрию сильнее или подготовьте отдельную low-poly версию.`,
            });
        }

        return {
            scene: gltf.scene,
            animations: gltf.animations,
            maxPolygons: limit,
        };
    }

    // S-09: validates glTF extensions and texture declarations before handing data to the runtime loader.
    private validateManifest(manifest: ParsedGltfManifest, url: string, profile: MascotAssetProfile): void {
        for (const extension of manifest.extensionsUsed) {
            if (!ALLOWED_GLTF_EXTENSIONS.has(extension)) {
                throw new MascotLoaderError(
                    `Файл ${url} использует запрещённое расширение ${extension}. Разрешены только extensions из whitelist безопасности.`,
                );
            }
        }

        if (!manifest.extensionsUsed.includes('KHR_draco_mesh_compression')) {
            if (profile === 'partner') {
                this.pushWarning({
                    code: 'MISSING_DRACO_COMPRESSION',
                    message: `Файл ${url} загружен без KHR_draco_mesh_compression. Для локального demo он будет принят, но для production лучше переэкспортировать модель с DRACO-компрессией.`,
                });
            } else {
                throw new MascotLoaderError(
                    `Файл ${url} не содержит обязательное расширение KHR_draco_mesh_compression. Экспортируйте модель с DRACO-компрессией.`,
                );
            }
        }

        if (manifest.hasTextures && !manifest.extensionsUsed.includes('KHR_texture_basisu')) {
            if (profile === 'partner') {
                this.pushWarning({
                    code: 'MISSING_KTX2_TEXTURES',
                    message: `Файл ${url} содержит текстуры без KHR_texture_basisu. Для локального demo это допустимо, но для production текстуры нужно перекодировать в Basis Universal / KTX2.`,
                });
            } else {
                throw new MascotLoaderError(
                    `Файл ${url} содержит текстуры без KHR_texture_basisu. Перекодируйте текстуры в Basis Universal / KTX2.`,
                );
            }
        }

        for (const image of manifest.images) {
            if (image.mimeType && !ALLOWED_IMAGE_MIME_TYPES.has(this.normalizeMimeType(image.mimeType))) {
                throw new MascotLoaderError(
                    `Файл ${url} содержит текстуру с MIME-типом ${image.mimeType}, который не входит в whitelist. Используйте PNG, JPEG, WebP или KTX2.`,
                );
            }
        }
    }

    // S-12: top-level model content-type whitelist blocks unexpected payloads before parsing.
    private validateTopLevelMimeType(contentType: string, url: string): void {
        if (!ALLOWED_MODEL_MIME_TYPES.has(contentType)) {
            throw new MascotLoaderError(
                `Файл ${url} имеет MIME-тип ${contentType || 'unknown'}. Разрешены только model/gltf-binary, model/gltf+json и совместимые бинарные ответы CDN.`,
            );
        }
    }

    private validateSize(sizeBytes: number, maxBytes: number, url: string): void {
        if (sizeBytes > maxBytes) {
            const limitMb = (maxBytes / (1024 * 1024)).toFixed(0);
            const actualMb = (sizeBytes / (1024 * 1024)).toFixed(2);
            throw new MascotLoaderError(
                `Файл ${url} весит ${actualMb} МБ и превышает лимит ${limitMb} МБ. Уменьшите меш, примените DRACO и KTX2, затем переэкспортируйте asset.`,
            );
        }
    }

    private validateRequest(request: MascotLoadRequest): void {
        if (!request.lods[0] && !request.lods[1] && !request.lods[2]) {
            throw new MascotLoaderError('Не переданы LOD-ресурсы. Укажите хотя бы один URL в request.lods.');
        }
    }

    private parseGltfManifest(bytes: ArrayBuffer, url: string, contentType: string): ParsedGltfManifest {
        const normalizedType = this.normalizeMimeType(contentType);
        if (normalizedType === 'model/gltf+json' || url.toLowerCase().endsWith('.gltf')) {
            const json = new TextDecoder().decode(bytes);
            return this.extractManifest(JSON.parse(json) as Record<string, unknown>);
        }

        return this.extractManifest(this.readGlbJsonChunk(bytes));
    }

    private readGlbJsonChunk(bytes: ArrayBuffer): Record<string, unknown> {
        const view = new DataView(bytes);
        const magic = view.getUint32(0, true);
        const version = view.getUint32(4, true);
        if (magic !== 0x46546c67 || version !== 2) {
            throw new MascotLoaderError('Получен некорректный GLB-файл. Проверьте экспорт и MIME-типы на сервере.');
        }

        let offset = 12;
        while (offset < view.byteLength) {
            const chunkLength = view.getUint32(offset, true);
            const chunkType = view.getUint32(offset + 4, true);
            offset += 8;

            if (chunkType === 0x4e4f534a) {
                const chunk = new Uint8Array(bytes, offset, chunkLength);
                const text = new TextDecoder().decode(chunk).trim();
                return JSON.parse(text) as Record<string, unknown>;
            }

            offset += chunkLength;
        }

        throw new MascotLoaderError('В GLB-файле не найден JSON chunk. Проверьте корректность упаковки asset.');
    }

    private extractManifest(json: Record<string, unknown>): ParsedGltfManifest {
        const extensionsUsed = Array.isArray(json.extensionsUsed)
            ? json.extensionsUsed.filter((value): value is string => typeof value === 'string')
            : [];
        const images = Array.isArray(json.images)
            ? json.images
                  .filter((value): value is { mimeType?: string } => typeof value === 'object' && value !== null)
                  .map((value) => ({ mimeType: typeof value.mimeType === 'string' ? value.mimeType : undefined }))
            : [];

        return {
            extensionsUsed,
            images,
            hasTextures: images.length > 0,
        };
    }

    private countPolygons(root: Object3D): number {
        let triangles = 0;
        root.traverse((node: Object3D) => {
            if (!(node instanceof Mesh) && !(node instanceof SkinnedMesh)) {
                return;
            }

            const geometry = node.geometry as BufferGeometry | undefined;
            if (!geometry) {
                return;
            }

            if (geometry.index) {
                triangles += Math.floor(geometry.index.count / 3);
                return;
            }

            const position = geometry.getAttribute('position');
            if (position) {
                triangles += Math.floor(position.count / 3);
            }
        });
        return triangles;
    }

    private setupProgressBar(progressContainer?: HTMLElement): void {
        this.progressRoot.style.position = 'relative';
        this.progressRoot.style.display = 'flex';
        this.progressRoot.style.flexDirection = 'column';
        this.progressRoot.style.gap = '6px';
        this.progressRoot.style.width = '100%';
        this.progressRoot.style.maxWidth = '300px';
        this.progressRoot.style.fontFamily = 'ui-sans-serif, system-ui, sans-serif';

        const track = document.createElement('div');
        track.style.height = '8px';
        track.style.borderRadius = '999px';
        track.style.overflow = 'hidden';
        track.style.background = 'rgba(24, 30, 40, 0.14)';

        this.progressBar.style.width = '0%';
        this.progressBar.style.height = '100%';
        this.progressBar.style.borderRadius = 'inherit';
        this.progressBar.style.background = 'linear-gradient(90deg, #d99821 0%, #efc35a 100%)';
        this.progressBar.style.transition = 'width 140ms ease-out';

        this.progressLabel.style.fontSize = '12px';
        this.progressLabel.style.lineHeight = '16px';
        this.progressLabel.style.color = '#3b3126';
        this.progressLabel.textContent = this.progressState.message;

        track.appendChild(this.progressBar);
        this.progressRoot.append(track, this.progressLabel);
        (progressContainer ?? document.body).appendChild(this.progressRoot);
    }

    private updateProgress(phase: MascotLoaderProgress['phase'], percent: number, message: string): void {
        this.progressState = {
            phase,
            loaded: percent,
            total: 100,
            percent: Math.max(0, Math.min(100, percent)),
            message,
        };
        this.progressBar.style.width = this.progressState.percent + '%';
        this.progressLabel.textContent = `${this.progressState.percent}% · ${message}`;
        this.onProgress?.(this.progressState);
    }

    private pushWarning(warning: MascotLoaderWarning): void {
        this.warnings.push(warning);
        this.onWarning?.(warning.message);
    }

    private pickDefaultLod(): MascotLodLevel {
        if (window.matchMedia('(pointer: coarse), (max-width: 480px)').matches) {
            return 0;
        }
        if (window.matchMedia('(max-width: 1024px)').matches) {
            return 1;
        }
        return 2;
    }

    private createMetaUrl(url: string): string {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}__mascot_cache_meta=1`;
    }

    private resolveResourceRoot(url: string): string {
        const lastSlashIndex = url.lastIndexOf('/');
        return lastSlashIndex >= 0 ? url.slice(0, lastSlashIndex + 1) : './';
    }

    private normalizeMimeType(value: string): string {
        return value.split(';', 1)[0].trim().toLowerCase();
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => window.setTimeout(resolve, ms));
    }

    private wrapError(error: unknown, fallbackMessage: string): MascotLoaderError {
        if (error instanceof MascotLoaderError) {
            return error;
        }
        if (error instanceof Error && error.message) {
            return new MascotLoaderError(`${fallbackMessage} Причина: ${error.message}`);
        }
        return new MascotLoaderError(fallbackMessage);
    }
}