import { StrictMode, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';

import './index.css';
import { MascotConversation } from './components/MascotConversation';
import { MascotStage } from './components/MascotStage';
import { MascotUploader } from './components/MascotUploader';
import { PartnerDashboardProvider } from './components/PartnerDashboardContext';
import { PromptEditor } from './components/PromptEditor';

function EmbeddedMascotPreview() {
    return (
        <PartnerDashboardProvider>
            <MemoryRouter initialEntries={['/partner/mascot']}>
                <section style={styles.shell}>
                    <div style={styles.layout}>
                        <div style={styles.stageColumn}>
                            <div style={styles.heroCard}>
                                <p style={styles.eyebrow}>3D-среда</p>
                                <h3 style={styles.title}>Сцена, анимации и runtime-проверка</h3>
                                <p style={styles.subtitle}>Здесь отрисовывается текущая загруженная GLB-модель Маняши. Кнопки preview и авто-демо работают прямо внутри этой страницы.</p>
                                <MascotStage />
                            </div>

                            <div style={styles.promptCard}>
                                <PromptEditor />
                            </div>
                        </div>

                        <div style={styles.controlColumn}>
                            <div style={styles.controlCard}>
                                <MascotUploader />
                            </div>

                            <div style={styles.controlCard}>
                                <MascotConversation />
                            </div>
                        </div>
                    </div>
                </section>
            </MemoryRouter>
        </PartnerDashboardProvider>
    );
}

const styles: Record<string, CSSProperties> = {
    shell: {
        maxWidth: 1280,
        margin: '0 auto',
        padding: '0 0 96px',
    },
    layout: {
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.06fr) minmax(360px, 0.94fr)',
        gap: 24,
        alignItems: 'start',
    },
    stageColumn: {
        display: 'grid',
        gap: 24,
    },
    controlColumn: {
        display: 'grid',
        gap: 24,
    },
    heroCard: {
        borderRadius: 32,
        padding: 28,
        background: 'linear-gradient(160deg, rgba(250,253,255,0.96) 0%, rgba(235,244,252,0.98) 100%)',
        border: '1px solid rgba(76, 123, 176, 0.14)',
        boxShadow: '0 26px 60px rgba(22, 58, 99, 0.08)',
        display: 'grid',
        gap: 18,
    },
    promptCard: {
        borderRadius: 32,
        overflow: 'hidden',
    },
    controlCard: {
        borderRadius: 32,
        overflow: 'hidden',
    },
    eyebrow: {
        margin: 0,
        fontSize: 12,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: '#4c7bb0',
        fontWeight: 700,
    },
    title: {
        margin: 0,
        fontSize: 'clamp(28px, 3.6vw, 42px)',
        lineHeight: 1.02,
        color: '#163a63',
        fontWeight: 800,
    },
    subtitle: {
        margin: 0,
        color: '#56708e',
        fontSize: 16,
        lineHeight: 1.6,
        maxWidth: 720,
    },
};

const rootElement = document.getElementById('manaya-mascot-runtime-root');
if (rootElement) {
    createRoot(rootElement).render(
        <StrictMode>
            <EmbeddedMascotPreview />
        </StrictMode>,
    );
}