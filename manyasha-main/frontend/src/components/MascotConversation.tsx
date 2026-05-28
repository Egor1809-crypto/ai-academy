import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
    usePartnerDashboard,
    type MascotConversationMessage,
    type MascotTalkAction,
} from './PartnerDashboardContext';

interface ConversationItem {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    actions: MascotTalkAction[];
    provider?: string;
    promptVersion?: number | null;
    isStreaming?: boolean;
}

const VIDEO_FPS = 24;
const BOOK_OPENING_FRAMES = 16;
const BOOK_CLOSING_FRAMES = 14;
const ANSWER_HOLD_MIN_FRAMES = 29; // 1208 ms
const ANSWER_HOLD_MAX_FRAMES = 43; // 1791 ms

function framesToMs(frames: number): number {
    return Math.round((frames * 1000) / VIDEO_FPS);
}

function resolveAnswerHoldMs(replyText: string): number {
    const normalizedLength = Math.max(0, replyText.trim().length);
    const extraBlocks = Math.ceil(normalizedLength / 120);
    const holdFrames = Math.min(ANSWER_HOLD_MAX_FRAMES, ANSWER_HOLD_MIN_FRAMES + (extraBlocks * 4));
    return framesToMs(holdFrames);
}

export function MascotConversation() {
    const { api, announce, setMascotTalkPhase } = usePartnerDashboard();
    const navigate = useNavigate();
    const location = useLocation();
    const [draft, setDraft] = useState('');
    const [isPending, setIsPending] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const requestAbortRef = useRef<AbortController | null>(null);
    const cycleVersionRef = useRef(0);
    const openingTimerRef = useRef<number | null>(null);
    const returnTimerRef = useRef<number | null>(null);
    const activeCycleRef = useRef<{ version: number; settled: boolean }>({ version: 0, settled: true });
    const [messages, setMessages] = useState<ConversationItem[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: 'Спросите меня, где посмотреть статус, как загрузить ассет или как настроить RPG-веса. Я подскажу следующий шаг по платформе.',
            actions: [],
        },
    ]);

    const history = useMemo<MascotConversationMessage[]>(() => {
        return messages.slice(-8).map((message) => ({
            role: message.role,
            content: message.content,
        }));
    }, [messages]);

    useEffect(() => {
        return () => {
            requestAbortRef.current?.abort();
            if (openingTimerRef.current !== null) {
                window.clearTimeout(openingTimerRef.current);
            }
            if (returnTimerRef.current !== null) {
                window.clearTimeout(returnTimerRef.current);
            }
            setMascotTalkPhase('idle');
        };
    }, [setMascotTalkPhase]);

    const clearOpeningTimer = () => {
        if (openingTimerRef.current !== null) {
            window.clearTimeout(openingTimerRef.current);
            openingTimerRef.current = null;
        }
    };

    const clearReturnTimer = () => {
        if (returnTimerRef.current !== null) {
            window.clearTimeout(returnTimerRef.current);
            returnTimerRef.current = null;
        }
    };

    const finalizeStreamingAssistantMessages = (replacementText?: string) => {
        setMessages((current) => current.map((item) => {
            if (item.role !== 'assistant' || !item.isStreaming) {
                return item;
            }
            return {
                ...item,
                content: replacementText ?? item.content,
                isStreaming: false,
            };
        }));
    };

    const scheduleSearchingPhase = (version: number) => {
        clearOpeningTimer();
        openingTimerRef.current = window.setTimeout(() => {
            if (activeCycleRef.current.version !== version || activeCycleRef.current.settled) {
                return;
            }
            setMascotTalkPhase('book-searching');
            openingTimerRef.current = null;
        }, framesToMs(BOOK_OPENING_FRAMES));
    };

    const scheduleReturnToIdle = (version: number, replyText: string) => {
        clearReturnTimer();
        const holdMs = resolveAnswerHoldMs(replyText);
        returnTimerRef.current = window.setTimeout(() => {
            if (activeCycleRef.current.version !== version) {
                return;
            }
            setMascotTalkPhase('book-closing');

            returnTimerRef.current = window.setTimeout(() => {
                if (activeCycleRef.current.version !== version) {
                    return;
                }
                setMascotTalkPhase('idle');
                returnTimerRef.current = null;
            }, framesToMs(BOOK_CLOSING_FRAMES));
        }, holdMs);
    };

    const handleSubmit = async () => {
        const message = draft.trim();
        if (!message) {
            return;
        }

        if (isPending) {
            requestAbortRef.current?.abort();
            finalizeStreamingAssistantMessages('Предыдущий ответ остановлен: начат новый поиск по книге.');
        }

        cycleVersionRef.current += 1;
        const cycleVersion = cycleVersionRef.current;
        const abortController = new AbortController();
        activeCycleRef.current = { version: cycleVersion, settled: false };
        requestAbortRef.current = abortController;
        clearOpeningTimer();
        clearReturnTimer();
        setMascotTalkPhase('book-opening');

        const userMessage: ConversationItem = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: message,
            actions: [],
        };
        const assistantId = `assistant-${Date.now()}`;
        const assistantMessage: ConversationItem = {
            id: assistantId,
            role: 'assistant',
            content: '',
            actions: [],
            isStreaming: true,
        };

        setDraft('');
        setErrorMessage(null);
        setIsPending(true);
        setMessages((current) => [...current, userMessage, assistantMessage]);
        announce('Маняша начала формировать ответ.');
        scheduleSearchingPhase(cycleVersion);

        try {
            const response = await api.openMascotTalkStream({
                message,
                current_route: location.pathname,
                history: [...history, { role: 'user', content: message }],
                case_context: {},
            }, { signal: abortController.signal });
            const stream = response.body;
            if (!stream) {
                throw new Error('Сервер не вернул поток ответа для маскота.');
            }

            await readSseStream(stream, {
                onToken: (token) => {
                    if (cycleVersionRef.current !== cycleVersion) {
                        return;
                    }
                    setMessages((current) => current.map((item) => {
                        if (item.id !== assistantId) {
                            return item;
                        }
                        return {
                            ...item,
                            content: item.content + token,
                        };
                    }));
                },
                onDone: (reply, actions, meta) => {
                    if (cycleVersionRef.current !== cycleVersion) {
                        return;
                    }
                    activeCycleRef.current = { version: cycleVersion, settled: true };
                    clearOpeningTimer();
                    setMessages((current) => current.map((item) => {
                        if (item.id !== assistantId) {
                            return item;
                        }
                        return {
                            ...item,
                            content: reply || item.content,
                            actions,
                            provider: meta.provider,
                            promptVersion: meta.promptVersion,
                            isStreaming: false,
                        };
                    }));
                    announce('Маняша завершила ответ и предложила следующий шаг.');
                    setMascotTalkPhase('answer-shown');
                    scheduleReturnToIdle(cycleVersion, reply || '');
                },
            });
        } catch (error) {
            if (abortController.signal.aborted) {
                activeCycleRef.current = { version: cycleVersion, settled: true };
                clearOpeningTimer();
                return;
            }

            activeCycleRef.current = { version: cycleVersion, settled: true };
            clearOpeningTimer();
            const messageText = error instanceof Error
                ? error.message
                : 'Не удалось получить ответ маскота. Проверьте API и повторите попытку.';
            setErrorMessage(messageText);
            setMessages((current) => current.map((item) => {
                if (item.id !== assistantId) {
                    return item;
                }
                return {
                    ...item,
                    content: 'Ответ не пришёл. Попробуйте задать вопрос ещё раз или переключитесь в нужный раздел вручную.',
                    isStreaming: false,
                };
            }));
            announce(messageText);
            setMascotTalkPhase('answer-shown');
            scheduleReturnToIdle(cycleVersion, '');
        } finally {
            if (requestAbortRef.current === abortController) {
                requestAbortRef.current = null;
            }
            if (!abortController.signal.aborted) {
                setIsPending(false);
            }
        }
    };

    return (
        <section style={styles.card}>
            <div style={styles.headerRow}>
                <div>
                    <p style={styles.eyebrow}>Диалог с маскотом</p>
                    <h2 style={styles.title}>Диалог с Маняшей</h2>
                </div>
                <span style={styles.routeBadge}>{location.pathname}</span>
            </div>

            <div style={styles.feed}>
                {messages.map((message) => (
                    <article
                        key={message.id}
                        style={{
                            ...styles.bubble,
                            ...(message.role === 'user' ? styles.userBubble : styles.assistantBubble),
                        }}
                    >
                        <strong style={styles.bubbleRole}>{message.role === 'user' ? 'Вы' : 'Маняша'}</strong>
                        <p style={styles.bubbleText}>{message.content || 'Формирую ответ...'}</p>
                        {message.role === 'assistant' && (message.provider || message.promptVersion !== undefined) ? (
                            <p style={styles.bubbleMeta}>
                                {message.provider ? `Провайдер: ${message.provider}` : 'Провайдер: неизвестен'}
                                {message.promptVersion !== undefined && message.promptVersion !== null ? ` · Промпт v${message.promptVersion}` : ''}
                            </p>
                        ) : null}
                        {message.actions.length > 0 ? (
                            <div style={styles.actionsRow}>
                                {message.actions.map((action) => (
                                    <button
                                        key={`${message.id}-${action.target}`}
                                        type="button"
                                        onClick={() => {
                                            navigate(action.target);
                                            announce(`Открыт раздел ${action.label}.`);
                                        }}
                                        style={styles.actionButton}
                                    >
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        ) : null}
                    </article>
                ))}
            </div>

            <div style={styles.composer}>
                <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Например: где посмотреть статус, как загрузить ассет или как настроить RPG-веса?"
                    style={styles.textarea}
                    onKeyDown={(event) => {
                        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                            event.preventDefault();
                            void handleSubmit();
                        }
                    }}
                />
                <button type="button" onClick={() => void handleSubmit()} disabled={isPending} style={styles.submitButton}>
                    {isPending ? 'Маняша отвечает...' : 'Отправить вопрос'}
                </button>
            </div>

            {errorMessage ? <div role="alert" style={styles.errorBanner}>{errorMessage}</div> : null}
        </section>
    );
}

async function readSseStream(
    stream: ReadableStream<Uint8Array>,
    handlers: {
        onToken: (token: string) => void;
        onDone: (reply: string, actions: MascotTalkAction[], meta: { provider?: string; promptVersion?: number | null }) => void;
    },
): Promise<void> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let pending = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                if (pending.trim()) {
                    processSseFrame(pending, handlers);
                }
                break;
            }

            pending += decoder.decode(value, { stream: true });
            const frames = pending.split('\n\n');
            pending = frames.pop() ?? '';
            for (const frame of frames) {
                processSseFrame(frame, handlers);
            }
        }
    } finally {
        reader.releaseLock();
    }
}

function processSseFrame(
    frame: string,
    handlers: {
        onToken: (token: string) => void;
        onDone: (reply: string, actions: MascotTalkAction[], meta: { provider?: string; promptVersion?: number | null }) => void;
    },
): void {
    for (const line of frame.split('\n')) {
        const normalized = line.trim();
        if (!normalized.startsWith('data:')) {
            continue;
        }

        const body = normalized.slice(5).trim();
        if (!body) {
            continue;
        }

        const payload = JSON.parse(body) as {
            token?: string;
            done?: boolean;
            reply?: string;
            actions?: MascotTalkAction[];
            provider?: string;
            prompt_version?: number | null;
        };
        if (payload.token) {
            handlers.onToken(payload.token);
        }
        if (payload.done) {
            handlers.onDone(payload.reply ?? '', payload.actions ?? [], {
                provider: payload.provider,
                promptVersion: payload.prompt_version,
            });
        }
    }
}

const styles: Record<string, React.CSSProperties> = {
    card: {
        background: 'linear-gradient(160deg, #fffaf2 0%, #eef4f8 100%)',
        border: '1px solid rgba(30, 54, 81, 0.12)',
        borderRadius: 28,
        padding: 24,
        boxShadow: '0 22px 44px rgba(46, 39, 27, 0.08)',
        display: 'grid',
        gap: 16,
    },
    headerRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
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
    routeBadge: {
        borderRadius: 999,
        background: '#edf4fb',
        color: '#1f4762',
        padding: '8px 12px',
        fontWeight: 700,
        fontSize: 13,
    },
    feed: {
        display: 'grid',
        gap: 12,
        maxHeight: 420,
        overflowY: 'auto',
        paddingRight: 4,
    },
    bubble: {
        borderRadius: 22,
        padding: 16,
        display: 'grid',
        gap: 10,
    },
    userBubble: {
        background: '#183d63',
        color: '#fff',
        justifySelf: 'end',
        width: 'min(100%, 88%)',
    },
    assistantBubble: {
        background: '#fffdf8',
        color: '#1c3041',
        border: '1px solid rgba(30, 54, 81, 0.12)',
        width: 'min(100%, 92%)',
    },
    bubbleRole: {
        fontSize: 12,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
    },
    bubbleText: {
        margin: 0,
        lineHeight: 1.55,
        whiteSpace: 'pre-wrap',
    },
    bubbleMeta: {
        margin: 0,
        fontSize: 12,
        opacity: 0.72,
    },
    actionsRow: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
    },
    actionButton: {
        borderRadius: 999,
        border: 0,
        background: '#d4931d',
        color: '#fff',
        fontWeight: 700,
        padding: '10px 14px',
        cursor: 'pointer',
    },
    composer: {
        display: 'grid',
        gap: 12,
    },
    textarea: {
        width: '100%',
        minHeight: 120,
        resize: 'vertical',
        borderRadius: 20,
        border: '1px solid #cfd8e2',
        padding: 16,
        fontSize: 15,
        lineHeight: 1.55,
        background: '#fffdf8',
    },
    submitButton: {
        justifySelf: 'start',
        borderRadius: 999,
        border: 0,
        background: '#153b54',
        color: '#fff',
        fontWeight: 700,
        padding: '14px 18px',
        cursor: 'pointer',
    },
    errorBanner: {
        borderRadius: 18,
        padding: 14,
        background: '#fff1ed',
        border: '1px solid #f1b7ad',
        color: '#8a311d',
    },
};
