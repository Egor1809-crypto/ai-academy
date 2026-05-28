import { useMemo, useState } from 'react';

import { useMascotPreviewQuery, usePartnerDashboard, usePromptSaveMutation } from './PartnerDashboardContext';

const PROMPT_LIMIT = 1800;
const FORBIDDEN_PATTERNS = ['ignore previous', 'you are now', 'pretend you', 'disregard'];

export function PromptEditor() {
    const { announce } = usePartnerDashboard();
    const previewQuery = useMascotPreviewQuery();
    const saveMutation = usePromptSaveMutation();
    const [promptText, setPromptText] = useState('');
    const [kmsKeyId, setKmsKeyId] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);

    const tokenCount = useMemo(() => estimateTokens(promptText), [promptText]);
    const remaining = PROMPT_LIMIT - tokenCount;

    const onSave = async () => {
        setLocalError(null);
        const normalized = promptText.trim();
        if (!normalized) {
            setLocalError('Промпт пустой. Введите инструкцию партнёра перед сохранением.');
            return;
        }
        if (tokenCount > PROMPT_LIMIT) {
            setLocalError(`Промпт слишком длинный: ${tokenCount} токенов. Сократите его до ${PROMPT_LIMIT} токенов или меньше.`);
            return;
        }

        const lowered = normalized.toLowerCase();
        const forbidden = FORBIDDEN_PATTERNS.find((pattern) => lowered.includes(pattern));
        if (forbidden) {
            setLocalError(`Найден запрещённый паттерн '${forbidden}'. Удалите override-инструкцию и повторите сохранение.`);
            return;
        }

        try {
            await saveMutation.mutateAsync({
                prompt_text: normalized,
                kms_key_id: kmsKeyId.trim() || undefined,
            });
            announce('Партнёрский промпт сохранён и зашифрован.');
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : 'Не удалось сохранить промпт. Проверьте длину текста и настройки шифрования.';
            setLocalError(message);
            announce(message);
        }
    };

    return (
        <section style={styles.card}>
            <p style={styles.eyebrow}>Prompt Security</p>
            <div style={styles.headerRow}>
                <h2 style={styles.title}>Редактор промпта</h2>
                <span style={{
                    ...styles.tokenBadge,
                    color: remaining < 0 ? '#8f2f1e' : '#20415a',
                    background: remaining < 0 ? '#ffe4dd' : '#edf4fb',
                }}>
                    {tokenCount}/{PROMPT_LIMIT} токенов
                </span>
            </div>

            <textarea
                value={promptText}
                onChange={(event) => setPromptText(event.target.value)}
                placeholder="Введите системный prompt партнёра. Запрещены ignore previous, you are now и другие override-инструкции."
                style={styles.textarea}
            />

            <div style={styles.formRow}>
                <label style={styles.label}>
                    KMS Key ID
                    <input
                        value={kmsKeyId}
                        onChange={(event) => setKmsKeyId(event.target.value)}
                        placeholder="Например, yandex-kms-key-id"
                        style={styles.input}
                    />
                </label>
                <div style={styles.metaBox}>
                    <strong>Активная версия</strong>
                    <div>v{previewQuery.data?.prompt_version ?? '—'}</div>
                    <div>{previewQuery.data?.prompt_token_count ?? '—'} токенов</div>
                </div>
            </div>

            {localError ? <div role="alert" style={styles.errorBanner}>{localError}</div> : null}

            <button
                type="button"
                onClick={() => {
                    void onSave();
                }}
                disabled={saveMutation.isPending}
                style={styles.button}
            >
                {saveMutation.isPending ? 'Сохраняем и шифруем...' : 'Сохранить промпт'}
            </button>
        </section>
    );
}

function estimateTokens(value: string) {
    return Math.ceil(value.trim().length / 4);
}

const styles: Record<string, React.CSSProperties> = {
    card: {
        background: '#fdf8f1',
        border: '1px solid rgba(26, 52, 69, 0.12)',
        borderRadius: 28,
        padding: 24,
        boxShadow: '0 18px 38px rgba(49, 43, 28, 0.07)',
    },
    eyebrow: {
        margin: 0,
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: '0.16em',
        color: '#7b5f35',
    },
    headerRow: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    title: {
        margin: 0,
        color: '#1d2e3f',
        fontSize: 28,
    },
    tokenBadge: {
        borderRadius: 999,
        padding: '8px 12px',
        fontWeight: 700,
    },
    textarea: {
        width: '100%',
        minHeight: 220,
        marginTop: 20,
        resize: 'vertical',
        borderRadius: 20,
        border: '1px solid #cfd8e2',
        padding: 18,
        fontSize: 15,
        lineHeight: 1.55,
        background: '#fffdf8',
    },
    formRow: {
        display: 'grid',
        gridTemplateColumns: '1.5fr 0.9fr',
        gap: 16,
        marginTop: 18,
    },
    label: {
        display: 'grid',
        gap: 8,
        fontWeight: 600,
        color: '#213243',
    },
    input: {
        borderRadius: 16,
        border: '1px solid #cfd8e2',
        padding: '12px 14px',
        background: '#fff',
    },
    metaBox: {
        borderRadius: 20,
        background: '#f2f6fb',
        padding: 16,
        color: '#314557',
        display: 'grid',
        gap: 8,
        alignContent: 'start',
    },
    errorBanner: {
        marginTop: 16,
        borderRadius: 18,
        padding: 14,
        background: '#fff1ed',
        border: '1px solid #f1b7ad',
        color: '#8a311d',
    },
    button: {
        marginTop: 18,
        borderRadius: 999,
        border: 0,
        background: '#183d63',
        color: '#fff',
        fontWeight: 700,
        padding: '14px 18px',
        cursor: 'pointer',
    },
};