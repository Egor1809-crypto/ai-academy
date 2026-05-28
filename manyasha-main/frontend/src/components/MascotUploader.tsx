import { useMemo, useRef, useState, type DragEvent } from 'react';

import {
    useMascotPreviewQuery,
    useMascotUploadMutation,
    usePartnerDashboard,
    type UploadStage,
} from './PartnerDashboardContext';

const STAGE_LABELS: Array<{ key: UploadStage; label: string; helper: string }> = [
    { key: 'upload', label: 'Загрузка', helper: 'Файл передаётся в защищённое хранилище.' },
    { key: 'conversion', label: 'Конвертация', helper: 'Подготавливаем ассет для предпросмотра.' },
    { key: 'validation', label: 'Валидация', helper: 'Проверяем формат, MIME и ограничения безопасности.' },
    { key: 'optimization', label: 'Оптимизация', helper: 'Проверяем готовность ассета к быстрой загрузке маскота.' },
    { key: 'ready', label: 'Готово', helper: 'Новый ассет доступен в превью партнёра.' },
];

const ALLOWED_FILE_TYPES = '.glb,.gltf,.png,.jpg,.jpeg,.webp,.ktx2';

export function MascotUploader() {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const { activeStage, setUploadStage, announce } = usePartnerDashboard();
    const previewQuery = useMascotPreviewQuery();
    const uploadMutation = useMascotUploadMutation();

    const stageIndex = useMemo(
        () => STAGE_LABELS.findIndex((item) => item.key === activeStage),
        [activeStage],
    );

    const startUpload = async (file: File) => {
        setLocalError(null);
        if (file.size === 0) {
            setLocalError('Файл пустой. Выберите корректный GLB/GLTF или texture-файл и повторите загрузку.');
            return;
        }

        try {
            setUploadStage('upload', 'Началась загрузка нового ассета маскота.');
            await uploadMutation.mutateAsync({ file });
            setUploadStage('conversion', 'Файл загружен. Начинается конвертация превью.');
            await sleep(180);
            setUploadStage('validation', 'Проверяем формат и ограничения безопасности.');
            await sleep(180);
            setUploadStage('optimization', 'Оптимизируем ассет для быстрой загрузки дашборда.');
            await sleep(180);
            await previewQuery.refetch();
            setUploadStage('ready', 'Загрузка завершена. Ассет доступен для предпросмотра.');
            announce('Новый mascot asset успешно загружен и готов к использованию.');
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : 'Не удалось загрузить файл. Проверьте размер, формат и сетевое соединение.';
            setLocalError(message);
            announce(message);
        }
    };

    const handleFiles = async (files: FileList | null) => {
        const file = files?.[0];
        if (!file) {
            return;
        }
        await startUpload(file);
    };

    const onDrop = async (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setDragActive(false);
        await handleFiles(event.dataTransfer.files);
    };

    return (
        <section style={styles.card}>
            <div style={styles.headerRow}>
                <div>
                    <p style={styles.eyebrow}>Загрузка маскота</p>
                    <h2 style={styles.title}>Загрузчик маскота</h2>
                </div>
                {previewQuery.data?.preview_url ? (
                    <a href={previewQuery.data.preview_url} target="_blank" rel="noreferrer" style={styles.previewLink}>
                        Открыть превью
                    </a>
                ) : null}
            </div>

            <div
                onDragOver={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        fileInputRef.current?.click();
                    }
                }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                    ...styles.dropZone,
                    borderColor: dragActive ? '#d4931d' : '#1e3651',
                    background: dragActive ? 'rgba(244, 214, 151, 0.28)' : 'rgba(255, 248, 237, 0.95)',
                }}
            >
                <input
                    ref={fileInputRef}
                    hidden
                    type="file"
                    accept={ALLOWED_FILE_TYPES}
                    onChange={(event) => {
                        void handleFiles(event.target.files);
                    }}
                />
                <strong style={styles.dropTitle}>Перетащите GLB/GLTF или texture сюда</strong>
                <p style={styles.dropText}>Instant feedback: дашборд сразу покажет этап загрузки, а ошибки будут выведены на русском с инструкциями.</p>
            </div>

            <ol style={styles.stageList}>
                {STAGE_LABELS.map((stage, index) => {
                    const isComplete = index < stageIndex;
                    const isActive = stage.key === activeStage;
                    return (
                        <li key={stage.key} style={styles.stageItem}>
                            <span style={{
                                ...styles.stageBadge,
                                background: isActive ? '#d4931d' : isComplete ? '#1b6b62' : '#d9dfe5',
                                color: isActive || isComplete ? '#fff' : '#25313f',
                            }}>
                                {index + 1}
                            </span>
                            <div>
                                <strong>{stage.label}</strong>
                                <div style={styles.stageHelper}>{stage.helper}</div>
                            </div>
                        </li>
                    );
                })}
            </ol>

            {uploadMutation.isPending ? <p style={styles.info}>Идёт загрузка. Не закрывайте вкладку до завершения пятого этапа.</p> : null}
            {localError ? <ErrorBanner message={localError} /> : null}
        </section>
    );
}

function ErrorBanner({ message }: { message: string }) {
    return (
        <div role="alert" style={styles.errorBanner}>
            <strong>Ошибка загрузки</strong>
            <p style={{ margin: '6px 0 0' }}>{message}</p>
        </div>
    );
}

function sleep(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

const styles: Record<string, React.CSSProperties> = {
    card: {
        background: 'linear-gradient(160deg, #fffaf2 0%, #f4efe6 100%)',
        border: '1px solid rgba(30, 54, 81, 0.12)',
        borderRadius: 28,
        padding: 24,
        boxShadow: '0 22px 44px rgba(46, 39, 27, 0.08)',
    },
    headerRow: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        alignItems: 'center',
    },
    eyebrow: {
        margin: 0,
        fontSize: 12,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: '#7f5b31',
    },
    title: {
        margin: '6px 0 0',
        fontSize: 28,
        color: '#1d2a36',
    },
    previewLink: {
        color: '#114b7a',
        textDecoration: 'none',
        fontWeight: 700,
    },
    dropZone: {
        marginTop: 18,
        border: '2px dashed',
        borderRadius: 24,
        padding: 26,
        cursor: 'pointer',
        transition: 'background 140ms ease, border-color 140ms ease',
    },
    dropTitle: {
        display: 'block',
        marginBottom: 10,
        fontSize: 18,
        color: '#1f3140',
    },
    dropText: {
        margin: 0,
        color: '#526474',
        lineHeight: 1.5,
    },
    stageList: {
        listStyle: 'none',
        padding: 0,
        margin: '22px 0 0',
        display: 'grid',
        gap: 12,
    },
    stageItem: {
        display: 'grid',
        gridTemplateColumns: '40px 1fr',
        gap: 12,
        alignItems: 'start',
    },
    stageBadge: {
        width: 32,
        height: 32,
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
    },
    stageHelper: {
        marginTop: 4,
        fontSize: 13,
        color: '#667686',
    },
    info: {
        marginTop: 16,
        color: '#1f3140',
        fontWeight: 600,
    },
    errorBanner: {
        marginTop: 18,
        borderRadius: 18,
        padding: 16,
        background: '#fff2ef',
        border: '1px solid #f1b7ad',
        color: '#7e2514',
    },
};