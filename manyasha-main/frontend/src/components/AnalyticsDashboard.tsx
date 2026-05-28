import { useRpgAnalyticsQuery } from './PartnerDashboardContext';

export function AnalyticsDashboard() {
    const analyticsQuery = useRpgAnalyticsQuery();

    if (analyticsQuery.isLoading) {
        return <section style={styles.card}>Загружаем аналитику RPG...</section>;
    }

    if (analyticsQuery.error) {
        return (
            <section style={styles.card}>
                <div role="alert" style={styles.errorBanner}>
                    <strong>Не удалось получить аналитику</strong>
                    <p style={{ margin: '6px 0 0' }}>{analyticsQuery.error.message}</p>
                </div>
            </section>
        );
    }

    const data = analyticsQuery.data;
    if (!data) {
        return null;
    }

    const eventEntries = Object.entries(data.event_counts);

    return (
        <section style={styles.card}>
            <p style={styles.eyebrow}>RPG-панель</p>
            <h2 style={styles.title}>Аналитика партнёра</h2>

            <div style={styles.metricGrid}>
                <MetricCard label="Текущий уровень" value={data.progress.current_level} accent="#143f67" />
                <MetricCard label="Взвешенный балл" value={data.progress.weighted_score} accent="#7d5122" />
                <MetricCard label="Штрафы RP" value={data.reputation_penalties_total} accent="#8d2d1d" />
                <MetricCard label="Жалобы" value={data.complaints_count} accent="#6d2a4b" />
            </div>

            <div style={styles.progressGrid}>
                <ProgressPill title="XP" value={data.progress.xp} tone="#1c5c87" />
                <ProgressPill title="QI" value={data.progress.qi} tone="#2b7b60" />
                <ProgressPill title="SP" value={data.progress.sp} tone="#97611d" />
                <ProgressPill title="RP" value={data.progress.rp} tone="#8a2f1f" />
            </div>

            <div style={styles.eventsBlock}>
                <h3 style={styles.subTitle}>События по типам</h3>
                {eventEntries.length === 0 ? (
                    <p style={styles.helper}>Событий пока нет. После первых серверных RPG-событий здесь появится статистика.</p>
                ) : (
                    <ul style={styles.eventList}>
                        {eventEntries.map(([eventType, count]) => (
                            <li key={eventType} style={styles.eventItem}>
                                <span>{eventType}</span>
                                <strong>{count}</strong>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}

function MetricCard({ label, value, accent }: { label: string; value: string | number; accent: string }) {
    return (
        <article style={{ ...styles.metricCard, borderColor: accent }}>
            <span style={styles.metricLabel}>{label}</span>
            <strong style={{ ...styles.metricValue, color: accent }}>{value}</strong>
        </article>
    );
}

function ProgressPill({ title, value, tone }: { title: string; value: number; tone: string }) {
    return (
        <div style={{ ...styles.progressPill, background: `${tone}16` }}>
            <span style={styles.progressTitle}>{title}</span>
            <strong style={{ color: tone }}>{value}</strong>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    card: {
        background: 'linear-gradient(160deg, #f6fafc 0%, #eef3f6 100%)',
        border: '1px solid rgba(24, 54, 72, 0.1)',
        borderRadius: 28,
        padding: 24,
        boxShadow: '0 18px 36px rgba(15, 41, 58, 0.06)',
    },
    eyebrow: {
        margin: 0,
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: '0.16em',
        color: '#587286',
    },
    title: {
        margin: '8px 0 0',
        color: '#19384c',
        fontSize: 28,
    },
    metricGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 14,
        marginTop: 20,
    },
    metricCard: {
        border: '1px solid',
        borderRadius: 22,
        padding: 18,
        background: '#fff',
    },
    metricLabel: {
        display: 'block',
        color: '#597183',
        fontSize: 13,
    },
    metricValue: {
        display: 'block',
        marginTop: 10,
        fontSize: 28,
    },
    progressGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 12,
        marginTop: 18,
    },
    progressPill: {
        borderRadius: 20,
        padding: '14px 16px',
        display: 'grid',
        gap: 6,
        background: '#fff',
    },
    progressTitle: {
        color: '#557083',
        fontSize: 13,
    },
    eventsBlock: {
        marginTop: 22,
        background: '#fff',
        borderRadius: 22,
        padding: 18,
    },
    subTitle: {
        margin: 0,
        fontSize: 18,
        color: '#1d3748',
    },
    helper: {
        marginTop: 12,
        color: '#647a8a',
        lineHeight: 1.5,
    },
    eventList: {
        listStyle: 'none',
        padding: 0,
        margin: '14px 0 0',
        display: 'grid',
        gap: 10,
    },
    eventItem: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        paddingBottom: 10,
        borderBottom: '1px solid rgba(20, 47, 68, 0.08)',
        color: '#244256',
    },
    errorBanner: {
        borderRadius: 18,
        padding: 14,
        background: '#fff1ed',
        border: '1px solid #f1b7ad',
        color: '#8a311d',
    },
};