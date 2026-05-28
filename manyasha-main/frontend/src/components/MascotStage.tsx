import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
    AnimationClip,
    ConeGeometry,
    Group,
    MathUtils,
    Mesh,
    MeshStandardMaterial,
    NumberKeyframeTrack,
    QuaternionKeyframeTrack,
    SphereGeometry,
    VectorKeyframeTrack,
} from 'three';

import { MascotRenderer, type MascotInitResult } from '../lib/MascotRenderer';
import { MascotLoader } from '../lib/MascotLoader';
import { useMascotRuntimeQuery, usePartnerDashboard } from './PartnerDashboardContext';

const E2E_LIGHT_DASHBOARD = import.meta.env.VITE_E2E_LIGHT_DASHBOARD === '1';

function createPlaceholderMascotSource() {
    const root = new Group();
    root.name = 'mascot_root';

    const body = new Mesh(
        new SphereGeometry(0.85, 32, 24),
        new MeshStandardMaterial({ color: 0xf3d089, roughness: 0.74, metalness: 0.05 }),
    );
    body.name = 'body';
    body.scale.set(1, 1.12, 0.88);
    body.position.set(0, 0.25, 0);

    const head = new Mesh(
        new SphereGeometry(0.54, 32, 24),
        new MeshStandardMaterial({ color: 0xfff2db, roughness: 0.68, metalness: 0.02 }),
    );
    head.name = 'head';
    head.position.set(0, 1.15, 0.08);

    const cap = new Mesh(
        new ConeGeometry(0.42, 0.62, 4),
        new MeshStandardMaterial({ color: 0x2f6ea3, roughness: 0.55, metalness: 0.12 }),
    );
    cap.name = 'cap';
    cap.position.set(0, 1.7, 0);
    cap.rotation.z = MathUtils.degToRad(45);

    root.add(body, head, cap);

    const idle = new AnimationClip('idle', -1, [
        new VectorKeyframeTrack('head.position', [0, 1.2, 2.4], [0, 1.15, 0.08, 0, 1.19, 0.08, 0, 1.15, 0.08]),
    ]);
    const talking = new AnimationClip('talking', -1, [
        new VectorKeyframeTrack('head.scale', [0, 0.18, 0.36], [1, 1, 1, 1.04, 0.96, 1.02, 1, 1, 1]),
    ]);
    const greeting = new AnimationClip('greeting', 1.2, [
        new QuaternionKeyframeTrack('cap.quaternion', [0, 0.3, 0.6, 1.2], [0, 0, 0.382683, 0.923879, 0, 0, 0.707107, 0.707107, 0, 0, 0.382683, 0.923879, 0, 0, 0.382683, 0.923879]),
    ]);
    const celebration = new AnimationClip('celebration', 1.4, [
        new VectorKeyframeTrack('body.scale', [0, 0.35, 0.7, 1.05, 1.4], [1, 1.12, 0.88, 1.08, 1.18, 0.92, 1, 1.12, 0.88, 1.08, 1.18, 0.92, 1, 1.12, 0.88]),
    ]);
    const warning = new AnimationClip('warning', 1, [
        new NumberKeyframeTrack('head.rotation[z]', [0, 0.25, 0.5, 0.75, 1], [0, -0.12, 0.12, -0.12, 0]),
    ]);
    const costume = new AnimationClip('costume', 0.9, [
        new VectorKeyframeTrack('cap.scale', [0, 0.3, 0.6, 0.9], [1, 1, 1, 1.1, 1.1, 1.1, 0.96, 0.96, 0.96, 1, 1, 1]),
    ]);

    return {
        scene: root,
        animations: [idle, talking, greeting, celebration, warning, costume],
    };
}

export function MascotStage() {
    if (E2E_LIGHT_DASHBOARD) {
        return (
            <div style={styles.wrapper}>
                <div style={styles.stage} aria-label="Сцена маскота" />
                <div style={styles.meta}>
                    <strong style={styles.metaTitle}>Среда маскота</strong>
                    <p style={styles.metaText}>Лёгкий test-preview режим без WebGL для стабильных e2e performance checks.</p>
                    <p style={styles.metaLine}>Режим: test-light</p>
                    <p style={styles.metaLine}>Статус: ready</p>
                    <p style={styles.metaLine}>Ассет: e2e placeholder</p>
                    <p style={styles.metaLine}>Рендер: static</p>
                    <p style={styles.metaLine}>Активная анимация: idle</p>
                </div>
            </div>
        );
    }

    const containerRef = useRef<HTMLDivElement | null>(null);
    const rendererRef = useRef<MascotRenderer | null>(null);
    const demoTimerRef = useRef<number | null>(null);
    const [backendInfo, setBackendInfo] = useState<MascotInitResult | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [warningMessages, setWarningMessages] = useState<string[]>([]);
    const [activeAnimation, setActiveAnimation] = useState('idle');
    const [autoPreviewEnabled, setAutoPreviewEnabled] = useState(true);
    const { mascotTalkPhase } = usePartnerDashboard();
    const runtimeQuery = useMascotRuntimeQuery();
    const runtime = runtimeQuery.data;

    const supportedAnimations = useMemo(() => {
        const fallback = ['idle', 'talking', 'greeting', 'celebration', 'warning', 'costume'];
        const incoming = runtime?.available_animations?.filter(Boolean) ?? [];
        return incoming.length > 0 ? incoming : fallback;
    }, [runtime?.available_animations]);

    const summary = useMemo(() => {
        if (runtime?.mode === 'uploaded-model') {
            return 'Подключён runtime-ассет партнёра.';
        }
        if (runtime?.mode === 'sprite2d') {
            return 'Используется 2D sprite fallback партнёра.';
        }
        return 'Запущен технический demo-маскот. Когда появится реальный ассет, источник сменится через runtime API.';
    }, [runtime?.mode]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || !runtime) {
            return;
        }

        const renderer = new MascotRenderer({
            container,
            spriteUrl: runtime.sprite_url ?? runtime.preview_url ?? undefined,
            backgroundColor: 0x000000,
        });
        rendererRef.current = renderer;

        let disposed = false;
        const bootstrap = async () => {
            try {
                setErrorMessage(null);
                setWarningMessages([]);
                setActiveAnimation('idle');
                const initResult = await renderer.init();
                if (disposed) {
                    renderer.dispose();
                    return;
                }

                setBackendInfo(initResult);

                if (runtime.mode === 'uploaded-model' && runtime.source_url && initResult.backend === 'webgl') {
                    const loader = new MascotLoader({
                        dracoDecoderPath: '/draco/',
                        ktx2TranscoderPath: '/basis/',
                        renderer: renderer.getWebGLRenderer(),
                        progressContainer: container,
                        onWarning: (warning) => {
                            setWarningMessages((current) => {
                                if (current.includes(warning)) {
                                    return current;
                                }
                                return [...current, warning];
                            });
                        },
                    });
                    try {
                        await loader.loadIntoRenderer(renderer, {
                            profile: 'partner',
                            initialLod: 2,
                            lods: {
                                2: { url: runtime.source_url, mimeType: runtime.content_type ?? undefined, label: 'partner-runtime' },
                            },
                        });
                    } catch (error) {
                        setErrorMessage(error instanceof Error ? error.message : 'Не удалось загрузить partner-runtime модель.');
                        renderer.setModel(createPlaceholderMascotSource());
                    }
                } else if (initResult.backend === 'webgl') {
                    renderer.setModel(createPlaceholderMascotSource());
                }

                renderer.setAnimationState('idle');
                setActiveAnimation('idle');
            } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : 'Не удалось запустить runtime маскота.');
            }
        };

        void bootstrap();
        return () => {
            disposed = true;
            if (demoTimerRef.current) {
                window.clearTimeout(demoTimerRef.current);
                demoTimerRef.current = null;
            }
            rendererRef.current = null;
            renderer.dispose();
        };
    }, [runtime]);

    useEffect(() => {
        if (!autoPreviewEnabled || !runtime || supportedAnimations.length === 0 || mascotTalkPhase !== 'idle') {
            return;
        }

        if (runtime.mode === 'sprite2d') {
            return;
        }

        const renderer = rendererRef.current;
        if (!renderer || renderer.getBackend() !== 'webgl') {
            return;
        }

        const sequence = supportedAnimations.includes('idle')
            ? [...supportedAnimations.filter((name) => name !== 'idle'), 'idle']
            : supportedAnimations;
        if (sequence.length === 0) {
            return;
        }

        let index = 0;
        const scheduleNext = () => {
            demoTimerRef.current = window.setTimeout(() => {
                const nextAnimation = sequence[index % sequence.length];
                index += 1;
                const applied = renderer.setAnimationState(nextAnimation);
                if (applied) {
                    setActiveAnimation(nextAnimation);
                    setErrorMessage(null);
                }
                scheduleNext();
            }, 2200);
        };

        scheduleNext();
        return () => {
            if (demoTimerRef.current) {
                window.clearTimeout(demoTimerRef.current);
                demoTimerRef.current = null;
            }
        };
    }, [autoPreviewEnabled, mascotTalkPhase, runtime, supportedAnimations]);

    useEffect(() => {
        if (!runtime) {
            return;
        }

        if (mascotTalkPhase !== 'idle') {
            setAutoPreviewEnabled(false);
        }

        const renderer = rendererRef.current;
        if (!renderer || renderer.getBackend() !== 'webgl') {
            return;
        }

        const animationByPhase = resolveAnimationForPhase(mascotTalkPhase, supportedAnimations);
        if (!animationByPhase) {
            if (mascotTalkPhase === 'idle') {
                const idleApplied = renderer.setAnimationState('idle');
                if (idleApplied) {
                    setActiveAnimation('idle');
                }
            }
            return;
        }

        const applied = renderer.setAnimationState(animationByPhase);
        if (applied) {
            setActiveAnimation(animationByPhase);
            setErrorMessage(null);
        }
    }, [mascotTalkPhase, runtime, supportedAnimations]);

    const applyAnimation = (animationName: string) => {
        const renderer = rendererRef.current;
        if (!renderer || renderer.getBackend() !== 'webgl') {
            setErrorMessage('Ручной preview анимаций доступен только в WebGL-режиме.');
            return;
        }

        const applied = renderer.setAnimationState(animationName);
        if (!applied) {
            setErrorMessage(`Клип ${animationName} не найден внутри текущего ассета.`);
            return;
        }

        setActiveAnimation(animationName);
        setErrorMessage(null);
    };

    return (
        <div style={styles.wrapper}>
            <div ref={containerRef} style={styles.stage} aria-label="Сцена маскота" />
            <div style={styles.meta}>
                <strong style={styles.metaTitle}>Среда маскота</strong>
                <p style={styles.metaText}>{summary}</p>
                <p style={styles.metaLine}>Режим: {runtime?.mode ?? 'загрузка'}</p>
                <p style={styles.metaLine}>Статус: {runtime?.status ?? 'загрузка'}</p>
                <p style={styles.metaLine}>Ассет: {runtime?.asset_id ?? 'нет загруженного ассета'}</p>
                <p style={styles.metaLine}>Рендер: {backendInfo?.backend ?? 'инициализация'}</p>
                <p style={styles.metaLine}>Активная анимация: {activeAnimation}</p>
                <div style={styles.previewToolbar}>
                    <button
                        type="button"
                        onClick={() => setAutoPreviewEnabled((value) => !value)}
                        style={{
                            ...styles.previewToggle,
                            background: autoPreviewEnabled ? '#163f5f' : '#edf3f7',
                            color: autoPreviewEnabled ? '#fff' : '#254055',
                        }}
                    >
                        {autoPreviewEnabled ? 'Автодемо включено' : 'Автодемо выключено'}
                    </button>
                </div>
                <div style={styles.animationGrid}>
                    {supportedAnimations.map((animationName) => (
                        <button
                            key={animationName}
                            type="button"
                            onClick={() => {
                                setAutoPreviewEnabled(false);
                                applyAnimation(animationName);
                            }}
                            style={{
                                ...styles.animationButton,
                                background: activeAnimation === animationName ? '#d4931d' : '#fff',
                                color: activeAnimation === animationName ? '#fff' : '#28445d',
                            }}
                        >
                            {animationName}
                        </button>
                    ))}
                </div>
                {warningMessages.map((warning) => (
                    <p key={warning} style={styles.warning}>{warning}</p>
                ))}
                {errorMessage ? <p style={styles.error}>{errorMessage}</p> : null}
            </div>
        </div>
    );
}

function resolveAnimationForPhase(
    phase: 'idle' | 'book-opening' | 'book-searching' | 'answer-shown' | 'book-closing',
    supportedAnimations: string[],
): string | null {
    const priorityByPhase: Record<typeof phase, string[]> = {
        idle: ['idle'],
        'book-opening': ['whatdo', 'greeting', 'talking'],
        'book-searching': ['whatdo', 'talking', 'idle'],
        'answer-shown': ['whatdo', 'talking', 'idle'],
        'book-closing': ['greeting', 'idle'],
    };

    const candidates = priorityByPhase[phase];
    for (const name of candidates) {
        if (supportedAnimations.includes(name)) {
            return name;
        }
    }

    return null;
}

const styles: Record<string, CSSProperties> = {
    wrapper: {
        display: 'grid',
        gap: 12,
        alignItems: 'center',
        justifyItems: 'center',
        width: '100%',
    },
    stage: {
        width: 300,
        height: 300,
        borderRadius: 26,
        background: 'radial-gradient(circle at 30% 20%, rgba(255, 245, 221, 0.88), rgba(215, 228, 237, 0.96))',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45), 0 18px 40px rgba(25, 45, 66, 0.12)',
        overflow: 'hidden',
        display: 'grid',
        placeItems: 'center',
    },
    meta: {
        width: '100%',
        borderRadius: 18,
        padding: '14px 16px',
        background: 'rgba(255, 252, 246, 0.92)',
        border: '1px solid rgba(30, 54, 81, 0.1)',
    },
    metaTitle: {
        display: 'block',
        color: '#19344d',
        marginBottom: 6,
    },
    metaText: {
        margin: '0 0 8px',
        color: '#465a6d',
        lineHeight: 1.45,
        fontSize: 14,
    },
    metaLine: {
        margin: '4px 0',
        color: '#28445d',
        fontSize: 13,
    },
    previewToolbar: {
        marginTop: 12,
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
    },
    previewToggle: {
        borderRadius: 999,
        border: 0,
        padding: '10px 12px',
        fontWeight: 700,
        fontSize: 12,
        cursor: 'pointer',
    },
    animationGrid: {
        marginTop: 10,
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
    },
    animationButton: {
        borderRadius: 999,
        border: '1px solid rgba(30, 54, 81, 0.14)',
        padding: '8px 12px',
        fontWeight: 700,
        fontSize: 12,
        cursor: 'pointer',
    },
    error: {
        margin: '8px 0 0',
        color: '#8b2a1a',
        fontSize: 13,
        fontWeight: 700,
    },
    warning: {
        margin: '8px 0 0',
        color: '#7b5b15',
        fontSize: 13,
        fontWeight: 600,
    },
};
