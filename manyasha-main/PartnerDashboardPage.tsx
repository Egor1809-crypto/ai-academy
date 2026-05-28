import { useEffect, useMemo, useState, type CSSProperties, type KeyboardEvent } from 'react';
import Joyride, { STATUS, type CallBackProps, type Step } from 'react-joyride';
import {
    MemoryRouter,
    NavLink,
    Navigate,
    Route,
    Routes,
    useLocation,
    useNavigate,
} from 'react-router-dom';

import { AnalyticsDashboard } from './AnalyticsDashboard';
import { MascotUploader } from './MascotUploader';
import {
    PartnerDashboardProvider,
    useMascotPreviewQuery,
    usePartnerDashboard,
    useRpgAnalyticsQuery,
    type PartnerDashboardApi,
} from './PartnerDashboardContext';
import { PromptEditor } from './PromptEditor';
import { RPGWeightsSlider } from './RPGWeightsSlider';

type PartnerDashboardRoute = '/partner/mascot' | '/partner/rpg' | '/partner/analytics';

interface PartnerDashboardPageProps {
    api?: PartnerDashboardApi;
    initialPath?: PartnerDashboardRoute;
}

const NAV_ITEMS: Array<{ path: PartnerDashboardRoute; label: string; shortLabel: string; description: string }> = [
    {
        path: '/partner/mascot',
        label: 'Маскот и промпт',
        shortLabel: 'Маскот',
        description: 'Загрузка ассетов, предпросмотр и партнёрский prompt.',
    },
    {
        path: '/partner/rpg',
        label: 'RPG-настройки',
        shortLabel: 'RPG',
        description: 'Весовые коэффициенты и текущий уровень партнёра.',
    },
    {
        path: '/partner/analytics',
        label: 'Аналитика',
        shortLabel: 'Аналитика',
        description: 'События, штрафы RP и обзор эффективности.',
    },
];

const JOYRIDE_STEPS: Step[] = [
    {
        target: '[data-tour="hero"]',
        content: 'Первый экран без скролла показывает маскота, уровень партнёра и текущее состояние прогресса.',
        disableBeacon: true,
    },
    {
        target: '[data-tour="sidebar"]',
        content: 'Слева навигация по разделам. Она поддерживает клавиатуру: Tab, Enter и Esc.',
    },
    {
        target: '[data-tour="mascot-upload"]',
        content: 'Здесь загружаются новые ассеты маскота и отслеживаются 5 этапов обработки.',
    },
    {
        target: '[data-tour="prompt-editor"]',
        content: 'Редактор промпта помогает соблюдать лимиты токенов и правила безопасности.',
    },
    {
        target: '[data-tour="rpg-section"]',
        content: 'В блоке RPG можно быстро перенастроить веса, а Маняша подскажет, как это влияет на прогресс.',
    },
];

export function PartnerDashboardPage({ api, initialPath = '/partner/mascot' }: PartnerDashboardPageProps) {
    return (
        <PartnerDashboardProvider api={api}>
            <MemoryRouter initialEntries={[initialPath]}>
                <DashboardShell />
            </MemoryRouter>
        </PartnerDashboardProvider>
    );
}

function DashboardShell() {
    const [runTour, setRunTour] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const isDesktop = useMediaQuery('(min-width: 920px)');
    const navigate = useNavigate();
    const location = useLocation();
    const { announce } = usePartnerDashboard();
    const analyticsQuery = useRpgAnalyticsQuery();
    const previewQuery = useMascotPreviewQuery();

    const activeIndex = Math.max(0, NAV_ITEMS.findIndex((item) => item.path === location.pathname));
    const heroSubtitle = useMemo(() => {
        if (analyticsQuery.data) {
            return `Уровень ${analyticsQuery.data.progress.current_level} · score ${analyticsQuery.data.progress.weighted_score}`;
        }
        return 'Панель управляет маскотом, промптом и RPG-настройками партнёра.';
    }, [analyticsQuery.data]);

    useEffect(() => {
        announce(`Открыт раздел ${NAV_ITEMS[activeIndex]?.label ?? 'дашборд партнёра'}.`);
    }, [activeIndex, announce]);

    const onShellKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape' && mobileMenuOpen) {
            setMobileMenuOpen(false);
            announce('Боковое меню закрыто.');
            return;
        }

        if (event.altKey && (event.key === '1' || event.key === '2' || event.key === '3')) {
            const nextIndex = Number(event.key) - 1;
            const next = NAV_ITEMS[nextIndex];
            if (next) {
                navigate(next.path);
                setMobileMenuOpen(false);
            }
        }
    };

    const onJoyrideCallback = (data: CallBackProps) => {
        if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
            setRunTour(false);
            announce('Онбординг завершён. Вы можете вернуться к нему через помощь в интерфейсе.');
        }
    };

    return (
        <div style={styles.viewport} onKeyDown={onShellKeyDown}>
            <Joyride
                run={runTour}
                steps={JOYRIDE_STEPS}
                callback={onJoyrideCallback}
                continuous
                showSkipButton
                showProgress
                disableScrolling
                locale={{
                    back: 'Назад',
                    close: 'Закрыть',
                    last: 'Завершить',
                    next: 'Далее',
                    open: 'Открыть тур',
                    skip: 'Пропустить',
                }}
                styles={{
                    options: {
                        arrowColor: '#fffaf1',
                        backgroundColor: '#fffaf1',
                        overlayColor: 'rgba(14, 27, 39, 0.42)',
                        primaryColor: '#cf8b14',
                        textColor: '#203040',
                        zIndex: 1000,
                    },
                }}
            />

            <div style={{ ...styles.mobileTopbar, display: isDesktop ? 'none' : 'flex' }}>
                <button
                    type="button"
                    onClick={() => setMobileMenuOpen((value) => !value)}
                    style={styles.mobileMenuButton}
                    aria-expanded={mobileMenuOpen}
                    aria-controls="partner-sidebar"
                >
                    {mobileMenuOpen ? 'Закрыть' : 'Разделы'}
                </button>
                <button
                    type="button"
                    onClick={() => setRunTour(true)}
                    style={styles.helpButton}
                >
                    Тур по Маняше
                </button>
            </div>

            <div style={{ ...styles.layout, ...(isDesktop ? styles.layoutDesktop : null) }}>
                <aside
                    id="partner-sidebar"
                    data-tour="sidebar"
                    style={{
                        ...styles.sidebar,
                        ...(isDesktop ? styles.sidebarDesktop : null),
                        ...(mobileMenuOpen ? styles.sidebarMobileOpen : null),
                    }}
                >
                    <div style={styles.sidebarHeader}>
                        <p style={styles.sidebarEyebrow}>Partner Console</p>
                        <h1 style={styles.sidebarTitle}>Панель партнёра</h1>
                        <p style={styles.sidebarText}>Три раздела для настройки Маняши, RPG и аналитики. Alt+1/2/3 переключают вкладки.</p>
                    </div>

                    <nav aria-label="Навигация партнёрского дашборда" style={styles.navList}>
                        {NAV_ITEMS.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => setMobileMenuOpen(false)}
                                style={({ isActive }) => ({
                                    ...styles.navLink,
                                    background: isActive ? '#193956' : 'transparent',
                                    color: isActive ? '#fff' : '#203345',
                                })}
                            >
                                <strong>{item.label}</strong>
                                <span style={styles.navDescription}>{item.description}</span>
                            </NavLink>
                        ))}
                    </nav>

                    <div style={styles.sidebarFooter}>
                        <button type="button" onClick={() => setRunTour(true)} style={styles.tourButton}>
                            Запустить онбординг
                        </button>
                        <p style={styles.sidebarHint}>Esc закрывает меню на мобильном экране 390px, Enter открывает текущий раздел через фокус на ссылке.</p>
                    </div>
                </aside>

                <main style={{ ...styles.main, ...(isDesktop ? styles.mainDesktop : null) }}>
                    <section data-tour="hero" style={{ ...styles.heroSection, ...(isDesktop ? styles.heroSectionDesktop : null) }}>
                        <div style={styles.heroTextColumn}>
                            <p style={styles.heroEyebrow}>First screen</p>
                            <h2 style={styles.heroTitle}>Маскот, уровень и ключевые настройки видны сразу</h2>
                            <p style={styles.heroSubtitle}>{heroSubtitle}</p>

                            <div style={styles.heroStats}>
                                <HeroStat label="Уровень" value={analyticsQuery.data?.progress.current_level ?? '—'} />
                                <HeroStat label="XP" value={analyticsQuery.data?.progress.xp ?? 0} />
                                <HeroStat label="RP" value={analyticsQuery.data?.progress.rp ?? 0} />
                            </div>
                        </div>

                        <div style={styles.heroMascotCard}>
                            {previewQuery.data?.preview_url ? (
                                <img src={previewQuery.data.preview_url} alt="Предпросмотр маскота партнёра" style={styles.heroMascotImage} />
                            ) : (
                                <div style={styles.heroMascotFallback}>
                                    <span style={styles.heroMascotFallbackText}>Маскот появится после первой загрузки ассета</span>
                                </div>
                            )}
                        </div>
                    </section>

                    <div style={styles.sectionTabs}>
                        {NAV_ITEMS.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                style={({ isActive }) => ({
                                    ...styles.sectionTab,
                                    background: isActive ? '#133c64' : '#eef3f7',
                                    color: isActive ? '#fff' : '#254055',
                                })}
                            >
                                {item.shortLabel}
                            </NavLink>
                        ))}
                    </div>

                    <Routes>
                        <Route
                            path="/partner/mascot"
                            element={
                                <div style={styles.stack}>
                                    <div data-tour="mascot-upload">
                                        <MascotUploader />
                                    </div>
                                    <div data-tour="prompt-editor">
                                        <PromptEditor />
                                    </div>
                                </div>
                            }
                        />
                        <Route
                            path="/partner/rpg"
                            element={
                                <div style={styles.stack} data-tour="rpg-section">
                                    <RPGWeightsSlider />
                                    <AnalyticsDashboard />
                                </div>
                            }
                        />
                        <Route path="/partner/analytics" element={<AnalyticsDashboard />} />
                        <Route path="*" element={<Navigate to="/partner/mascot" replace />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
}

function useMediaQuery(query: string) {
    const getInitialValue = () => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false);
    const [matches, setMatches] = useState(getInitialValue);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const mediaQuery = window.matchMedia(query);
        const update = () => setMatches(mediaQuery.matches);
        update();

        if ('addEventListener' in mediaQuery) {
            mediaQuery.addEventListener('change', update);
            return () => mediaQuery.removeEventListener('change', update);
        }

        mediaQuery.addListener(update);
        return () => mediaQuery.removeListener(update);
    }, [query]);

    return matches;
}

function HeroStat({ label, value }: { label: string; value: string | number }) {
    return (
        <div style={styles.heroStat}>
            <span style={styles.heroStatLabel}>{label}</span>
            <strong style={styles.heroStatValue}>{value}</strong>
        </div>
    );
}

const styles: Record<string, CSSProperties> = {
    viewport: {
        minHeight: '100vh',
        background: 'radial-gradient(circle at top left, #fff8ea 0%, #edf3f6 55%, #e6edf1 100%)',
        color: '#1e2f3f',
        fontFamily: 'Avenir Next, Segoe UI, sans-serif',
    },
    mobileTopbar: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        padding: '16px 16px 0',
    },
    mobileMenuButton: {
        borderRadius: 999,
        border: 0,
        background: '#153b54',
        color: '#fff',
        padding: '12px 16px',
        fontWeight: 700,
        cursor: 'pointer',
    },
    helpButton: {
        borderRadius: 999,
        border: '1px solid rgba(22, 59, 84, 0.18)',
        background: '#fff7eb',
        color: '#1d364a',
        padding: '12px 16px',
        fontWeight: 700,
        cursor: 'pointer',
    },
    layout: {
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 18,
        padding: 16,
    },
    layoutDesktop: {
        gridTemplateColumns: '320px minmax(0, 1fr)',
        alignItems: 'start',
    },
    sidebar: {
        display: 'none',
        flexDirection: 'column',
        gap: 20,
        background: 'rgba(255, 250, 241, 0.88)',
        border: '1px solid rgba(30, 53, 73, 0.1)',
        borderRadius: 28,
        padding: 20,
        boxShadow: '0 24px 54px rgba(33, 47, 56, 0.08)',
    },
    sidebarMobileOpen: {
        display: 'flex',
    },
    sidebarDesktop: {
        display: 'flex',
        position: 'sticky',
        top: '20px',
    },
    sidebarHeader: {
        display: 'grid',
        gap: 8,
    },
    sidebarEyebrow: {
        margin: 0,
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: '0.18em',
        color: '#7b5b33',
    },
    sidebarTitle: {
        margin: 0,
        fontSize: 30,
        lineHeight: 1,
    },
    sidebarText: {
        margin: 0,
        color: '#536879',
        lineHeight: 1.55,
    },
    navList: {
        display: 'grid',
        gap: 10,
    },
    navLink: {
        textDecoration: 'none',
        borderRadius: 22,
        padding: 16,
        display: 'grid',
        gap: 8,
        transition: 'background 140ms ease, color 140ms ease',
    },
    navDescription: {
        fontSize: 13,
        lineHeight: 1.45,
        opacity: 0.9,
    },
    sidebarFooter: {
        display: 'grid',
        gap: 12,
    },
    tourButton: {
        borderRadius: 999,
        border: 0,
        background: '#cf8b14',
        color: '#fff',
        padding: '13px 16px',
        fontWeight: 700,
        cursor: 'pointer',
    },
    sidebarHint: {
        margin: 0,
        color: '#5c7181',
        fontSize: 13,
        lineHeight: 1.5,
    },
    main: {
        display: 'grid',
        gap: 20,
    },
    mainDesktop: {
        minWidth: 0,
    },
    heroSection: {
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 18,
        minHeight: 0,
        background: 'linear-gradient(145deg, rgba(255,251,243,0.92) 0%, rgba(239,246,249,0.92) 100%)',
        border: '1px solid rgba(19, 60, 100, 0.08)',
        borderRadius: 32,
        padding: 20,
        overflow: 'hidden',
    },
    heroSectionDesktop: {
        gridTemplateColumns: '1.2fr minmax(280px, 360px)',
        minHeight: 'min(78vh, 720px)',
    },
    heroTextColumn: {
        display: 'grid',
        gap: 10,
        alignContent: 'start',
    },
    heroEyebrow: {
        margin: 0,
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: '0.18em',
        color: '#816131',
    },
    heroTitle: {
        margin: 0,
        fontSize: 32,
        lineHeight: 1.05,
        maxWidth: 580,
    },
    heroSubtitle: {
        margin: 0,
        color: '#4f6677',
        lineHeight: 1.6,
        maxWidth: 580,
    },
    heroStats: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 12,
        marginTop: 10,
    },
    heroStat: {
        borderRadius: 22,
        background: '#fff',
        padding: '14px 16px',
        boxShadow: '0 12px 24px rgba(30, 45, 53, 0.05)',
    },
    heroStatLabel: {
        display: 'block',
        fontSize: 12,
        color: '#678092',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
    },
    heroStatValue: {
        display: 'block',
        marginTop: 8,
        fontSize: 22,
        color: '#183954',
    },
    heroMascotCard: {
        minHeight: 240,
        borderRadius: 28,
        background: 'radial-gradient(circle at top, rgba(247, 220, 171, 0.95) 0%, rgba(243, 205, 146, 0.65) 34%, rgba(255,255,255,0.35) 100%)',
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
    },
    heroMascotImage: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    heroMascotFallback: {
        width: '100%',
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
    },
    heroMascotFallbackText: {
        maxWidth: 220,
        textAlign: 'center',
        color: '#5d4b30',
        lineHeight: 1.6,
    },
    sectionTabs: {
        display: 'flex',
        gap: 10,
        overflowX: 'auto',
        paddingBottom: 4,
    },
    sectionTab: {
        flex: '0 0 auto',
        borderRadius: 999,
        padding: '12px 16px',
        textDecoration: 'none',
        fontWeight: 700,
    },
    stack: {
        display: 'grid',
        gap: 18,
    },
};