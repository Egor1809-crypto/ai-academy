import { useEffect, useMemo, useState } from 'react';

import { usePartnerDashboard, useRpgAnalyticsQuery, useRpgWeightsMutation, type RPGWeightsPayload } from './PartnerDashboardContext';

const WEIGHT_KEYS: Array<keyof RPGWeightsPayload> = ['weight_xp', 'weight_qi', 'weight_sp', 'weight_rp'];
const WEIGHT_LABELS: Record<keyof RPGWeightsPayload, string> = {
    weight_xp: 'XP: дела',
    weight_qi: 'QI: качество',
    weight_sp: 'SP: скорость',
    weight_rp: 'RP: репутация',
};

export function RPGWeightsSlider() {
    const { announce } = usePartnerDashboard();
    const analyticsQuery = useRpgAnalyticsQuery();
    const weightsMutation = useRpgWeightsMutation();
    const [weights, setWeights] = useState<RPGWeightsPayload>({
        weight_xp: 25,
        weight_qi: 25,
        weight_sp: 25,
        weight_rp: 25,
    });
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        if (analyticsQuery.data?.weights) {
            setWeights({
                weight_xp: analyticsQuery.data.weights.weight_xp,
                weight_qi: analyticsQuery.data.weights.weight_qi,
                weight_sp: analyticsQuery.data.weights.weight_sp,
                weight_rp: analyticsQuery.data.weights.weight_rp,
            });
        }
    }, [analyticsQuery.data?.weights]);

    const total = useMemo(
        () => weights.weight_xp + weights.weight_qi + weights.weight_sp + weights.weight_rp,
        [weights],
    );

    const updateWeight = (key: keyof RPGWeightsPayload, nextValue: number) => {
        setWeights((previous) => normalizeWeights({ ...previous, [key]: nextValue }, key));
    };

    const onSave = async () => {
        setLocalError(null);
        if (total !== 100) {
            setLocalError('Сумма весов должна быть ровно 100. Переместите слайдеры, чтобы авто-нормализация завершилась корректно.');
            return;
        }

        try {
            await weightsMutation.mutateAsync(weights);
            announce('RPG веса сохранены. Аналитика и уровень партнёра обновлены.');
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : 'Не удалось сохранить веса. Проверьте соединение и повторите попытку.';
            setLocalError(message);
            announce(message);
        }
    };

    return (
        <section style={styles.card}>
            <div style={styles.headerRow}>
                <div>
                    <p style={styles.eyebrow}>RPG-настройки</p>
                    <h2 style={styles.title}>Весовые коэффициенты</h2>
                </div>
                <div style={{
                    ...styles.totalBadge,
                    background: total === 100 ? '#e8f7f0' : '#fff1dd',
                    color: total === 100 ? '#176452' : '#8b4b11',
                }}>
                    Сумма: {total}%
                </div>
            </div>

            <div style={styles.sliderGrid}>
                {WEIGHT_KEYS.map((key) => (
                    <label key={key} style={styles.sliderLabel}>
                        <div style={styles.sliderMeta}>
                            <span>{WEIGHT_LABELS[key]}</span>
                            <strong>{weights[key]}%</strong>
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={weights[key]}
                            onChange={(event) => updateWeight(key, Number(event.target.value))}
                        />
                    </label>
                ))}
            </div>

            <p style={styles.helper}>Авто-нормализация перераспределяет оставшийся процент между другими слайдерами, чтобы сумма всегда стремилась к 100%.</p>
            {localError ? <div role="alert" style={styles.errorBanner}>{localError}</div> : null}

            <button
                type="button"
                onClick={() => {
                    void onSave();
                }}
                disabled={weightsMutation.isPending}
                style={styles.button}
            >
                {weightsMutation.isPending ? 'Сохраняем...' : 'Сохранить веса'}
            </button>
        </section>
    );
}

function normalizeWeights(next: RPGWeightsPayload, changedKey: keyof RPGWeightsPayload): RPGWeightsPayload {
    const remainingKeys = WEIGHT_KEYS.filter((key) => key !== changedKey);
    const nextChangedValue = Math.max(0, Math.min(100, next[changedKey]));
    const remainderTarget = 100 - nextChangedValue;
    const currentRemainder = remainingKeys.reduce((sum, key) => sum + next[key], 0);

    if (remainingKeys.length === 0) {
        return { ...next, [changedKey]: 100 };
    }

    if (currentRemainder === 0) {
        const even = Math.floor(remainderTarget / remainingKeys.length);
        let leftover = remainderTarget - even * remainingKeys.length;
        const result = { ...next, [changedKey]: nextChangedValue };
        for (const key of remainingKeys) {
            result[key] = even + (leftover > 0 ? 1 : 0);
            if (leftover > 0) {
                leftover -= 1;
            }
        }
        return result;
    }

    const scaled = { ...next, [changedKey]: nextChangedValue };
    let distributed = 0;
    remainingKeys.forEach((key, index) => {
        if (index === remainingKeys.length - 1) {
            scaled[key] = remainderTarget - distributed;
            return;
        }
        const value = Math.max(0, Math.round((next[key] / currentRemainder) * remainderTarget));
        scaled[key] = value;
        distributed += value;
    });
    return scaled;
}

const styles: Record<string, React.CSSProperties> = {
    card: {
        background: '#f8fbfd',
        border: '1px solid rgba(17, 64, 90, 0.12)',
        borderRadius: 28,
        padding: 24,
        boxShadow: '0 20px 40px rgba(18, 45, 59, 0.06)',
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
        textTransform: 'uppercase',
        letterSpacing: '0.16em',
        color: '#5d7484',
    },
    title: {
        margin: '8px 0 0',
        fontSize: 28,
        color: '#173449',
    },
    totalBadge: {
        borderRadius: 999,
        padding: '9px 12px',
        fontWeight: 700,
    },
    sliderGrid: {
        display: 'grid',
        gap: 18,
        marginTop: 20,
    },
    sliderLabel: {
        display: 'grid',
        gap: 10,
        color: '#21384b',
    },
    sliderMeta: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
    },
    helper: {
        marginTop: 18,
        color: '#5a7080',
        lineHeight: 1.55,
    },
    errorBanner: {
        marginTop: 14,
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
        background: '#153b54',
        color: '#fff',
        fontWeight: 700,
        padding: '14px 18px',
        cursor: 'pointer',
    },
};