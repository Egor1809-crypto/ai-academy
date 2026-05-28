import {
    AmbientLight,
    AnimationAction,
    AnimationClip,
    MeshBasicMaterial,
    MeshPhongMaterial,
    MeshStandardMaterial,
    AnimationMixer,
    Clock,
    Color,
    DirectionalLight,
    Group,
    Mesh,
    Object3D,
    PerspectiveCamera,
    Scene,
    SkinnedMesh,
    Texture,
    TextureLoader,
    Vector3,
    WebGLRenderer,
} from 'three';

export type MascotViewMode = 'idle' | 'dialog';
export type MascotBackend = 'webgl' | 'sprite2d';

export interface MascotRendererOptions {
    container: HTMLElement;
    spriteUrl?: string;
    alpha?: boolean;
    preferMobileFps?: number;
    preferDesktopFps?: number;
    benchmarkThreshold?: number;
    benchmarkDurationMs?: number;
    backgroundColor?: number;
    onBackendChanged?: (backend: MascotBackend, reason: string) => void;
}

export interface MascotModelSource {
    scene: Object3D;
    animations?: AnimationClip[];
}

export interface MascotLODSource extends MascotModelSource {
    maxPolygons: number;
}

export interface MascotLODMap {
    0?: MascotLODSource;
    1?: MascotLODSource;
    2?: MascotLODSource;
}

export interface MascotInitResult {
    backend: MascotBackend;
    benchmarkScore: number | null;
    targetFps: number;
    reason: string;
}

const IDLE_SIZE = 160;
const DIALOG_SIZE = 300;
const DPR_CAP = 2;
const DEFAULT_BENCHMARK_THRESHOLD = 30;
const DEFAULT_BENCHMARK_DURATION_MS = 220;
const CROSSFADE_SECONDS = 0.25;
const MOBILE_MEDIA_QUERY = '(pointer: coarse), (max-width: 768px)';
const REDUCED_MOTION_MEDIA_QUERY = '(prefers-reduced-motion: reduce)';
const DARK_SCHEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';
const LOD_POLYGON_LIMITS: Record<0 | 1 | 2, number> = {
    0: 5000,
    1: 12000,
    2: 25000,
};

type MediaQueryChangeHandler = (event: MediaQueryListEvent) => void;

export interface MascotTextureOptions {
    materialNameIncludes?: string;
    flipY?: boolean;
}

export class MascotRenderer {
    private readonly container: HTMLElement;
    private readonly alpha: boolean;
    private readonly targetDesktopFps: number;
    private readonly targetMobileFps: number;
    private readonly benchmarkThreshold: number;
    private readonly benchmarkDurationMs: number;
    private readonly backgroundColor: number;
    private readonly onBackendChanged?: (backend: MascotBackend, reason: string) => void;

    private readonly root = document.createElement('div');
    private readonly webglCanvas = document.createElement('canvas');
    private readonly spriteCanvas = document.createElement('canvas');
    private readonly spriteContext = this.spriteCanvas.getContext('2d');
    private readonly scene = new Scene();
    private readonly camera = new PerspectiveCamera(26, 1, 0.1, 100);
    private readonly clock = new Clock();
    private readonly actions = new Map<string, AnimationAction>();
    private readonly modelRoot = new Group();
    private readonly reducedMotionQuery = window.matchMedia(REDUCED_MOTION_MEDIA_QUERY);
    private readonly darkSchemeQuery = window.matchMedia(DARK_SCHEME_MEDIA_QUERY);
    private readonly textureLoader = new TextureLoader();

    private renderer: WebGLRenderer | null = null;
    private mixer: AnimationMixer | null = null;
    private activeAction: AnimationAction | null = null;
    private ambientLight: AmbientLight | null = null;
    private keyLight: DirectionalLight | null = null;
    private fillLight: DirectionalLight | null = null;
    private currentBackend: MascotBackend = 'sprite2d';
    private currentMode: MascotViewMode = 'idle';
    private benchmarkScore: number | null = null;
    private currentLodLevel: 0 | 1 | 2 = 2;
    private frameHandle = 0;
    private lastFrameTime = 0;
    private spriteImage: HTMLImageElement | null = null;
    private lodSources: Partial<Record<0 | 1 | 2, MascotLODSource>> = {};
    private readonly queryListeners: Array<{
        query: MediaQueryList;
        handler: MediaQueryChangeHandler;
    }> = [];
    private destroyed = false;

    constructor(options: MascotRendererOptions) {
        this.container = options.container;
        this.alpha = options.alpha ?? true;
        this.targetDesktopFps = options.preferDesktopFps ?? 60;
        this.targetMobileFps = options.preferMobileFps ?? 30;
        this.benchmarkThreshold = options.benchmarkThreshold ?? DEFAULT_BENCHMARK_THRESHOLD;
        this.benchmarkDurationMs = options.benchmarkDurationMs ?? DEFAULT_BENCHMARK_DURATION_MS;
        this.backgroundColor = options.backgroundColor ?? 0x000000;
        this.onBackendChanged = options.onBackendChanged;

        if (!this.spriteContext) {
            throw new Error('2D canvas context is unavailable.');
        }

        this.root.style.position = 'relative';
        this.root.style.width = IDLE_SIZE + 'px';
        this.root.style.height = IDLE_SIZE + 'px';

        this.webglCanvas.style.display = 'none';
        this.webglCanvas.style.width = '100%';
        this.webglCanvas.style.height = '100%';

        this.spriteCanvas.style.display = 'block';
        this.spriteCanvas.style.width = '100%';
        this.spriteCanvas.style.height = '100%';

        this.root.append(this.webglCanvas, this.spriteCanvas);
        this.container.appendChild(this.root);

        this.scene.add(this.modelRoot);
        this.setupScene();
        this.attachAccessibilityListeners();
        this.applyColorScheme();
        this.setMode('idle');

        if (options.spriteUrl) {
            this.loadSprite(options.spriteUrl);
        } else {
            this.drawSpriteFallback();
        }
    }

    async init(): Promise<MascotInitResult> {
        const webgl2Context = this.webglCanvas.getContext('webgl2', {
            alpha: this.alpha,
            antialias: true,
            premultipliedAlpha: true,
            powerPreference: 'high-performance',
        });

        if (!webgl2Context) {
            return this.activateSprite2D('WebGL 2.0 is unavailable.');
        }

        this.benchmarkScore = await this.runGpuBenchmark();
        if (this.benchmarkScore < this.benchmarkThreshold) {
            return this.activateSprite2D('GPU benchmark score is below threshold.');
        }

        this.renderer = new WebGLRenderer({
            canvas: this.webglCanvas,
            context: webgl2Context,
            alpha: this.alpha,
            antialias: true,
            powerPreference: 'high-performance',
        });
        this.applyColorScheme();
        this.renderer.outputColorSpace = 'srgb';

        this.currentBackend = 'webgl';
        this.webglCanvas.style.display = 'block';
        this.spriteCanvas.style.display = 'none';
        this.resize();
        this.start();

        const result = this.makeInitResult('WebGL 2.0 enabled after successful GPU benchmark.');
        this.onBackendChanged?.(result.backend, result.reason);
        return result;
    }

    setMode(mode: MascotViewMode): void {
        this.currentMode = mode;
        this.resize();
    }

    setModel(source: MascotModelSource): void {
        // Single-scene input remains supported and is treated as the highest LOD.
        this.lodSources = {
            2: {
                scene: source.scene,
                animations: source.animations,
                maxPolygons: LOD_POLYGON_LIMITS[2],
            },
        };
        this.mountLodScenes();
        this.setLOD(2);
    }

    // Registers up to three mesh variants and immediately activates the requested LOD.
    setLODModels(sources: MascotLODMap, initialLevel: 0 | 1 | 2 = this.currentLodLevel): void {
        this.lodSources = sources;
        this.mountLodScenes();
        this.setLOD(initialLevel);
    }

    // T-05: switches visible mesh variant according to polygon budget for mobile/tablet/desktop.
    setLOD(level: 0 | 1 | 2): void {
        const resolvedLevel = this.resolveAvailableLodLevel(level);
        this.currentLodLevel = resolvedLevel;
        this.applyLODVisibility();
        this.applyLODSource(this.lodSources[resolvedLevel]);
    }

    // A-04: reports current reduced-motion state so host UI can align its own transitions.
    isReducedMotionEnabled(): boolean {
        return this.reducedMotionQuery.matches;
    }

    // A-05: reports whether dark color scheme is currently active.
    isDarkColorSchemeEnabled(): boolean {
        return this.darkSchemeQuery.matches;
    }

    private applyLODSource(source?: MascotLODSource): void {
        if (!source) {
            return;
        }

        this.modelRoot.position.set(0, -0.9, 0);
        this.modelRoot.rotation.set(0, 0.28, 0);

        this.actions.clear();
        this.activeAction = null;

        if (source.animations && source.animations.length > 0) {
            this.mixer = new AnimationMixer(source.scene);
            for (const clip of source.animations) {
                this.actions.set(clip.name, this.mixer.clipAction(clip));
            }
        } else {
            this.mixer = null;
        }

        this.applyLODVisibility();
    }

    // T-05: preload each available LOD scene once, then toggle only visible to avoid reload churn.
    private mountLodScenes(): void {
        this.modelRoot.clear();
        for (const level of [0, 1, 2] as const) {
            const source = this.lodSources[level];
            if (!source) {
                continue;
            }
            this.modelRoot.add(source.scene);
        }
    }

    setAnimationState(nextState: string): boolean {
        const nextAction = this.actions.get(nextState);
        if (!nextAction) {
            return false;
        }

        nextAction.enabled = true;
        nextAction.reset();

        // A-04: reduced-motion forces instant, non-animated state switching.
        if (this.reducedMotionQuery.matches) {
            this.activeAction?.stop();
            nextAction.play();
            nextAction.paused = true;
            nextAction.time = 0;
        } else {
            nextAction.play();
            if (this.activeAction && this.activeAction !== nextAction) {
                nextAction.crossFadeFrom(this.activeAction, CROSSFADE_SECONDS, true);
            } else {
                nextAction.fadeIn(CROSSFADE_SECONDS);
            }
        }

        this.activeAction = nextAction;
        return true;
    }

    start(): void {
        if (this.frameHandle || this.currentBackend !== 'webgl' || !this.renderer) {
            return;
        }

        this.clock.start();
        const targetFps = this.getTargetFps();
        const minFrameInterval = 1000 / targetFps;

        const tick = (time: number) => {
            if (this.destroyed || this.currentBackend !== 'webgl' || !this.renderer) {
                this.frameHandle = 0;
                return;
            }

            this.frameHandle = requestAnimationFrame(tick);
            if (time - this.lastFrameTime < minFrameInterval) {
                return;
            }

            const delta = Math.min(this.clock.getDelta(), 1 / 20);
            this.lastFrameTime = time;
            if (!this.reducedMotionQuery.matches) {
                this.mixer?.update(delta);
            }
            this.renderer.render(this.scene, this.camera);
        };

        this.frameHandle = requestAnimationFrame(tick);
    }

    stop(): void {
        if (!this.frameHandle) {
            return;
        }

        cancelAnimationFrame(this.frameHandle);
        this.frameHandle = 0;
    }

    resize(): void {
        const size = this.currentMode === 'dialog' ? DIALOG_SIZE : IDLE_SIZE;
        const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);

        this.root.style.width = size + 'px';
        this.root.style.height = size + 'px';

        this.webglCanvas.width = Math.round(size * dpr);
        this.webglCanvas.height = Math.round(size * dpr);
        this.spriteCanvas.width = Math.round(size * dpr);
        this.spriteCanvas.height = Math.round(size * dpr);

        if (this.renderer) {
            this.renderer.setPixelRatio(dpr);
            this.renderer.setSize(size, size, false);
        }

        this.camera.aspect = 1;
        this.camera.updateProjectionMatrix();
        this.drawSpriteFallback();
    }

    dispose(): void {
        this.destroyed = true;
        this.stop();
        this.mixer?.stopAllAction();
        this.renderer?.dispose();
        this.detachAccessibilityListeners();
        this.root.remove();
    }

    getBackend(): MascotBackend {
        return this.currentBackend;
    }

    getBenchmarkScore(): number | null {
        return this.benchmarkScore;
    }

    // Exposes the active Three.js renderer so external loaders can configure KTX2 support.
    getWebGLRenderer(): WebGLRenderer | null {
        return this.renderer;
    }

    // W-05 style texture swap hook used by wardrobe logic for white-label skins without reloading GLB assets.
    async setTexture(textureUrl: string, options: MascotTextureOptions = {}): Promise<boolean> {
        const texture = await this.loadTexture(textureUrl, options.flipY ?? false);
        let applied = false;

        this.modelRoot.traverse((node) => {
            if (!(node instanceof Mesh) && !(node instanceof SkinnedMesh)) {
                return;
            }

            const materials = Array.isArray(node.material) ? node.material : [node.material];
            for (const material of materials) {
                if (!this.canApplyTexture(material)) {
                    continue;
                }

                if (options.materialNameIncludes) {
                    const materialName = material.name || '';
                    if (!materialName.toLowerCase().includes(options.materialNameIncludes.toLowerCase())) {
                        continue;
                    }
                }

                material.map = texture;
                material.needsUpdate = true;
                applied = true;
            }
        });

        return applied;
    }

    // T-13 integration point: applies a viseme or phoneme name to mesh morph targets across active LOD scenes.
    setMorphTarget(targetName: string, influence = 1): boolean {
        let applied = false;
        const safeInfluence = Math.max(0, Math.min(1, influence));

        this.modelRoot.traverse((node) => {
            if (!(node instanceof Mesh) && !(node instanceof SkinnedMesh)) {
                return;
            }

            const dictionary = node.morphTargetDictionary;
            const influences = node.morphTargetInfluences;
            if (!dictionary || !influences) {
                return;
            }

            for (const [name, index] of Object.entries(dictionary)) {
                influences[index] = name === targetName ? safeInfluence : 0;
                if (name === targetName) {
                    applied = true;
                }
            }
        });

        return applied;
    }

    // Clears all current morph-target influences, typically when speech stops or no viseme matches.
    resetMorphTargets(): void {
        this.modelRoot.traverse((node) => {
            if (!(node instanceof Mesh) && !(node instanceof SkinnedMesh)) {
                return;
            }

            const influences = node.morphTargetInfluences;
            if (!influences) {
                return;
            }

            for (let index = 0; index < influences.length; index += 1) {
                influences[index] = 0;
            }
        });
    }

    private setupScene(): void {
        this.camera.position.set(0, 0.65, 4.8);
        this.camera.lookAt(new Vector3(0, 0.55, 0));

        // A-05: keep stable light handles so theme switching can update intensities at runtime.
        this.ambientLight = new AmbientLight(0xffffff, 1.65);
        this.keyLight = new DirectionalLight(0xffffff, 2.1);
        this.keyLight.position.set(2.4, 3.2, 4.5);

        this.fillLight = new DirectionalLight(0xbdd7ff, 0.85);
        this.fillLight.position.set(-3, 1.25, 1.5);

        this.scene.add(this.ambientLight, this.keyLight, this.fillLight);
    }

    private canApplyTexture(material: unknown): material is MeshStandardMaterial | MeshPhongMaterial | MeshBasicMaterial {
        return Boolean(
            material
                && typeof material === 'object'
                && 'map' in material
                && 'needsUpdate' in material,
        );
    }

    private loadTexture(textureUrl: string, flipY: boolean): Promise<Texture> {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                textureUrl,
                (texture) => {
                    texture.flipY = flipY;
                    resolve(texture);
                },
                undefined,
                () => reject(new Error(`Не удалось загрузить texture asset: ${textureUrl}`)),
            );
        });
    }

    // T-14: prefer running the GPU benchmark in a worker with OffscreenCanvas to keep the main thread responsive.
    private async runGpuBenchmark(): Promise<number> {
        if (typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined') {
            const workerScore = await this.runGpuBenchmarkInWorker();
            if (workerScore !== null) {
                return workerScore;
            }
        }

        const fallbackContext = this.webglCanvas.getContext('webgl2', {
            alpha: this.alpha,
            antialias: false,
            premultipliedAlpha: true,
            powerPreference: 'high-performance',
        });
        if (!fallbackContext) {
            return 0;
        }

        return this.executeGpuBenchmark(fallbackContext, performance.now.bind(performance));
    }

    // T-14: worker path uses an isolated OffscreenCanvas benchmark and returns a normalized score.
    private runGpuBenchmarkInWorker(): Promise<number | null> {
        const workerScript = `
            self.onmessage = () => {
                try {
                    const canvas = new OffscreenCanvas(256, 256);
                    const gl = canvas.getContext('webgl2', {
                        alpha: true,
                        antialias: false,
                        premultipliedAlpha: true,
                        powerPreference: 'high-performance'
                    });
                    if (!gl) {
                        self.postMessage({ score: 0 });
                        return;
                    }

                    const execute = ${this.getBenchmarkExecutorSource()};
                    const score = execute(gl, () => performance.now(), ${this.benchmarkDurationMs});
                    self.postMessage({ score });
                } catch {
                    self.postMessage({ score: null });
                }
            };
        `;

        return new Promise((resolve) => {
            const blob = new Blob([workerScript], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            const worker = new Worker(workerUrl);

            worker.onmessage = (event: MessageEvent<{ score: number | null }>) => {
                worker.terminate();
                URL.revokeObjectURL(workerUrl);
                resolve(typeof event.data?.score === 'number' ? event.data.score : null);
            };

            worker.onerror = () => {
                worker.terminate();
                URL.revokeObjectURL(workerUrl);
                resolve(null);
            };

            worker.postMessage({ type: 'start' });
        });
    }

    // Shared GPU benchmark body used both on the main thread and inside the worker.
    private executeGpuBenchmark(gl: WebGL2RenderingContext, now: () => number): number {
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        if (!vertexShader || !fragmentShader) {
            return 0;
        }

        gl.shaderSource(
            vertexShader,
            '#version 300 es\n' +
                'in vec2 position;\n' +
                'void main(){ gl_Position = vec4(position, 0.0, 1.0); }',
        );
        gl.shaderSource(
            fragmentShader,
            '#version 300 es\n' +
                'precision mediump float;\n' +
                'out vec4 color;\n' +
                'void main(){ color = vec4(0.95, 0.72, 0.18, 1.0); }',
        );
        gl.compileShader(vertexShader);
        gl.compileShader(fragmentShader);

        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS) || !gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            return 0;
        }

        const program = gl.createProgram();
        const buffer = gl.createBuffer();
        const vao = gl.createVertexArray();
        if (!program || !buffer || !vao) {
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            return 0;
        }

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            gl.deleteProgram(program);
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            gl.deleteBuffer(buffer);
            gl.deleteVertexArray(vao);
            return 0;
        }

        const triangles = 3000;
        const vertices = new Float32Array(triangles * 6);
        for (let index = 0; index < vertices.length; index += 6) {
            const x = (Math.random() * 2) - 1;
            const y = (Math.random() * 2) - 1;
            const scale = 0.015 + Math.random() * 0.03;
            vertices[index + 0] = x;
            vertices[index + 1] = y;
            vertices[index + 2] = x + scale;
            vertices[index + 3] = y;
            vertices[index + 4] = x;
            vertices[index + 5] = y + scale;
        }

        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        gl.useProgram(program);
        const positionLocation = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.viewport(0, 0, 256, 256);
        const start = now();
        let frames = 0;

        while (now() - start < this.benchmarkDurationMs) {
            gl.clearColor(0.06, 0.06, 0.07, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
            gl.finish();
            frames += 1;
        }

        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.useProgram(null);

        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        gl.deleteBuffer(buffer);
        gl.deleteVertexArray(vao);

        const elapsedMs = now() - start;
        const normalizedFps = (frames * 1000) / Math.max(elapsedMs, 1);
        return Math.round(normalizedFps / 2);
    }

    // Serializes the benchmark function for the worker so benchmark logic stays identical across both paths.
    private getBenchmarkExecutorSource(): string {
        return `function execute(gl, now, durationMs) {
            const vertexShader = gl.createShader(gl.VERTEX_SHADER);
            const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
            if (!vertexShader || !fragmentShader) {
                return 0;
            }

            gl.shaderSource(vertexShader, '#version 300 es\nin vec2 position;\nvoid main(){ gl_Position = vec4(position, 0.0, 1.0); }');
            gl.shaderSource(fragmentShader, '#version 300 es\nprecision mediump float;\nout vec4 color;\nvoid main(){ color = vec4(0.95, 0.72, 0.18, 1.0); }');
            gl.compileShader(vertexShader);
            gl.compileShader(fragmentShader);
            if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS) || !gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
                gl.deleteShader(vertexShader);
                gl.deleteShader(fragmentShader);
                return 0;
            }

            const program = gl.createProgram();
            const buffer = gl.createBuffer();
            const vao = gl.createVertexArray();
            if (!program || !buffer || !vao) {
                gl.deleteShader(vertexShader);
                gl.deleteShader(fragmentShader);
                return 0;
            }

            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                gl.deleteProgram(program);
                gl.deleteShader(vertexShader);
                gl.deleteShader(fragmentShader);
                gl.deleteBuffer(buffer);
                gl.deleteVertexArray(vao);
                return 0;
            }

            const triangles = 3000;
            const vertices = new Float32Array(triangles * 6);
            for (let index = 0; index < vertices.length; index += 6) {
                const x = (Math.random() * 2) - 1;
                const y = (Math.random() * 2) - 1;
                const scale = 0.015 + Math.random() * 0.03;
                vertices[index + 0] = x;
                vertices[index + 1] = y;
                vertices[index + 2] = x + scale;
                vertices[index + 3] = y;
                vertices[index + 4] = x;
                vertices[index + 5] = y + scale;
            }

            gl.bindVertexArray(vao);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
            gl.useProgram(program);
            const positionLocation = gl.getAttribLocation(program, 'position');
            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

            gl.viewport(0, 0, 256, 256);
            const start = now();
            let frames = 0;
            while (now() - start < durationMs) {
                gl.clearColor(0.06, 0.06, 0.07, 1);
                gl.clear(gl.COLOR_BUFFER_BIT);
                gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
                gl.finish();
                frames += 1;
            }

            gl.bindVertexArray(null);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            gl.useProgram(null);
            gl.deleteProgram(program);
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            gl.deleteBuffer(buffer);
            gl.deleteVertexArray(vao);

            const elapsedMs = now() - start;
            const normalizedFps = (frames * 1000) / Math.max(elapsedMs, 1);
            return Math.round(normalizedFps / 2);
        }`;
    }

    private activateSprite2D(reason: string): MascotInitResult {
        this.currentBackend = 'sprite2d';
        this.webglCanvas.style.display = 'none';
        this.spriteCanvas.style.display = 'block';
        this.drawSpriteFallback();

        const result = this.makeInitResult(reason);
        this.onBackendChanged?.(result.backend, result.reason);
        return result;
    }

    private makeInitResult(reason: string): MascotInitResult {
        return {
            backend: this.currentBackend,
            benchmarkScore: this.benchmarkScore,
            targetFps: this.currentBackend === 'sprite2d' ? 0 : this.getTargetFps(),
            reason,
        };
    }

    private getTargetFps(): number {
        return this.isMobileDevice() ? this.targetMobileFps : this.targetDesktopFps;
    }

    private isMobileDevice(): boolean {
        return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
    }

    private loadSprite(url: string): void {
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => {
            this.spriteImage = image;
            this.drawSpriteFallback();
        };
        image.src = url;
    }

    // A-04/A-05: live media-query listeners keep rendering behavior aligned with user preferences.
    private attachAccessibilityListeners(): void {
        const reducedMotionHandler: MediaQueryChangeHandler = () => {
            if (this.reducedMotionQuery.matches) {
                this.mixer?.stopAllAction();
                this.activeAction = null;
            }
        };
        const darkSchemeHandler: MediaQueryChangeHandler = () => {
            this.applyColorScheme();
            this.drawSpriteFallback();
        };

        this.addMediaQueryListener(this.reducedMotionQuery, reducedMotionHandler);
        this.addMediaQueryListener(this.darkSchemeQuery, darkSchemeHandler);
    }

    private detachAccessibilityListeners(): void {
        for (const entry of this.queryListeners) {
            if ('removeEventListener' in entry.query) {
                entry.query.removeEventListener('change', entry.handler);
            } else {
                entry.query.removeListener(entry.handler);
            }
        }
        this.queryListeners.length = 0;
    }

    private addMediaQueryListener(query: MediaQueryList, handler: MediaQueryChangeHandler): void {
        if ('addEventListener' in query) {
            query.addEventListener('change', handler);
        } else {
            query.addListener(handler);
        }
        this.queryListeners.push({ query, handler });
    }

    // A-05: switches scene lighting and clear color to a dark palette when the OS theme is dark.
    private applyColorScheme(): void {
        const darkScheme = this.darkSchemeQuery.matches;
        const clearColor = darkScheme ? 0x10151d : this.backgroundColor;
        this.ambientLight?.color.set(darkScheme ? 0xdce7ff : 0xffffff);
        this.ambientLight?.setIntensity(darkScheme ? 0.9 : 1.65);
        this.keyLight?.color.set(darkScheme ? 0xa8c3ff : 0xffffff);
        this.keyLight?.setIntensity(darkScheme ? 1.25 : 2.1);
        this.fillLight?.color.set(darkScheme ? 0x6f8fc7 : 0xbdd7ff);
        this.fillLight?.setIntensity(darkScheme ? 0.55 : 0.85);
        this.renderer?.setClearColor(new Color(clearColor), this.alpha ? 0 : 1);
    }

    private resolveAvailableLodLevel(level: 0 | 1 | 2): 0 | 1 | 2 {
        if (this.lodSources[level]) {
            return level;
        }

        if (level === 0 && this.lodSources[1]) {
            return 1;
        }
        if (this.lodSources[2]) {
            return 2;
        }
        if (this.lodSources[1]) {
            return 1;
        }
        return 0;
    }

    // T-05: only the active LOD mesh is visible, enabling cheap switching after preloading.
    private applyLODVisibility(): void {
        for (const level of [0, 1, 2] as const) {
            const source = this.lodSources[level];
            if (!source) {
                continue;
            }
            source.scene.visible = level === this.currentLodLevel;
        }
    }

    private drawSpriteFallback(): void {
        const ctx = this.spriteContext;
        const width = this.spriteCanvas.width;
        const height = this.spriteCanvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.24;

        ctx.clearRect(0, 0, width, height);

        // A-05: 2D fallback honors system dark mode with a darker palette.
        const background = ctx.createRadialGradient(centerX, centerY * 0.85, radius * 0.3, centerX, centerY, width * 0.7);
        if (this.darkSchemeQuery.matches) {
            background.addColorStop(0, '#273445');
            background.addColorStop(1, '#111821');
        } else {
            background.addColorStop(0, '#fcecc2');
            background.addColorStop(1, '#f0c98f');
        }
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);

        if (this.spriteImage) {
            const size = Math.min(width, height) * 0.82;
            ctx.drawImage(this.spriteImage, centerX - size / 2, centerY - size / 2, size, size);
            return;
        }

        ctx.fillStyle = this.darkSchemeQuery.matches ? '#d7e6ff' : '#2f2419';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.darkSchemeQuery.matches ? '#1c2734' : '#fff6e8';
        ctx.beginPath();
        ctx.arc(centerX, centerY + radius * 0.06, radius * 0.76, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.darkSchemeQuery.matches ? '#d7e6ff' : '#2f2419';
        ctx.beginPath();
        ctx.arc(centerX - radius * 0.3, centerY - radius * 0.05, radius * 0.09, 0, Math.PI * 2);
        ctx.arc(centerX + radius * 0.3, centerY - radius * 0.05, radius * 0.09, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = this.darkSchemeQuery.matches ? '#d7e6ff' : '#2f2419';
        ctx.lineWidth = Math.max(2, radius * 0.08);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(centerX, centerY + radius * 0.1, radius * 0.34, 0.2, Math.PI - 0.2);
        ctx.stroke();
    }
}