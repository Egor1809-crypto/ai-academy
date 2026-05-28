import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import {
    useHandoffTicketChecklistMutation,
    useHandoffTicketQuery,
    useHandoffTicketNoteMutation,
    useHandoffTicketStatusMutation,
    useHandoffTicketsQuery,
    type HandoffDiagnosticSummary,
    type HandoffLeadContact,
    type HandoffLeadRiskFilter,
    type HandoffLeadStatus,
    type HandoffLeadStatusFilter,
    type HandoffTicketLeadDetailItem,
    type HandoffTicketLeadItem,
} from './PartnerDashboardContext';
import { CaseWorkspace } from './CaseWorkspace';

const LEAD_STATUS_OPTIONS: Array<{ value: HandoffLeadStatus; label: string }> = [
    { value: 'new', label: 'Новая' },
    { value: 'contacted', label: 'Связались' },
    { value: 'qualified', label: 'Квалифицирована' },
    { value: 'closed', label: 'Закрыта' },
];

const STATUS_FILTER_OPTIONS: Array<{ value: HandoffLeadStatusFilter; label: string }> = [
    { value: 'all', label: 'Все статусы' },
    ...LEAD_STATUS_OPTIONS,
];

const RISK_FILTER_OPTIONS: Array<{ value: HandoffLeadRiskFilter; label: string }> = [
    { value: 'all', label: 'Любой риск' },
    { value: 'high', label: 'Высокий' },
    { value: 'medium', label: 'Средний' },
    { value: 'low', label: 'Низкий' },
];

export function LeadInbox() {
    const [statusFilter, setStatusFilter] = useState<HandoffLeadStatusFilter>('all');
    const [riskFilter, setRiskFilter] = useState<HandoffLeadRiskFilter>('all');
    const [searchDraft, setSearchDraft] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    useEffect(() => {
        const timer = setTimeout(() => setSearchQuery(searchDraft.trim()), 320);
        return () => clearTimeout(timer);
    }, [searchDraft]);
    const activeFilters = useMemo(() => ({
        status: statusFilter,
        riskLevel: riskFilter,
        query: searchQuery,
    }), [riskFilter, searchQuery, statusFilter]);
    const isFiltered = statusFilter !== 'all' || riskFilter !== 'all' || searchQuery !== '';
    const ticketsQuery = useHandoffTicketsQuery(activeFilters);
    const totalTicketsQuery = useHandoffTicketsQuery({ status: 'all', riskLevel: 'all' }, { enabled: isFiltered });
    const statusMutation = useHandoffTicketStatusMutation();
    const noteMutation = useHandoffTicketNoteMutation();
    const checklistMutation = useHandoffTicketChecklistMutation();
    const tickets = ticketsQuery.data ?? [];

    useEffect(() => {
        if (!tickets.length) {
            if (selectedTicketId) {
                setSelectedTicketId(null);
            }
            return;
        }
        if (!selectedTicketId || !tickets.some((ticket) => ticket.ticket_id === selectedTicketId)) {
            setSelectedTicketId(tickets[0].ticket_id);
        }
    }, [selectedTicketId, tickets]);

    const selectedListTicket = tickets.find((ticket) => ticket.ticket_id === selectedTicketId) ?? tickets[0] ?? null;
    const detailQuery = useHandoffTicketQuery(selectedTicketId);
    const workspaceTicket = (detailQuery.data ?? (selectedListTicket ? { ...selectedListTicket, timeline: [] } : null)) as HandoffTicketLeadDetailItem | null;

    if (ticketsQuery.isLoading) {
        return <section data-testid="lead-inbox" style={styles.card}>Загружаем заявки...</section>;
    }

    if (ticketsQuery.error) {
        return (
            <section data-testid="lead-inbox" style={styles.card}>
                <div role="alert" style={styles.errorBanner}>
                    <strong>Не удалось получить заявки</strong>
                    <p style={{ margin: '6px 0 0' }}>{ticketsQuery.error.message}</p>
                </div>
            </section>
        );
    }

    const totalCount = isFiltered ? (totalTicketsQuery.data?.length ?? tickets.length) : tickets.length;
    return (
        <section data-testid="lead-inbox" style={styles.card}>
            <p style={styles.eyebrow}>Заявки оператора</p>
            <h2 style={styles.title}>Заявки из виджета</h2>
            <p data-testid="lead-inbox-privacy-note" style={styles.helper}>
                Диагностика предварительная и собрана по словам клиента. Используйте её как контекст для первого звонка, а не как юридическое заключение.
            </p>

            <div data-testid="lead-inbox-filters" style={styles.filterBar}>
                <label style={{ ...styles.filterControl, ...styles.searchControl }}>
                    <span style={styles.filterLabel}>Поиск</span>
                    <input
                        aria-label="Поиск по заявкам"
                        data-testid="lead-inbox-search"
                        onChange={(event) => setSearchDraft(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                setSearchQuery(searchDraft.trim());
                            }
                        }}
                        placeholder="Имя, телефон, email, статус..."
                        style={styles.searchInput}
                        type="search"
                        value={searchDraft}
                    />
                </label>
                <label style={styles.filterControl}>
                    <span style={styles.filterLabel}>Статус</span>
                    <select
                        aria-label="Фильтр по статусу заявки"
                        onChange={(event) => setStatusFilter(event.target.value as HandoffLeadStatusFilter)}
                        style={styles.filterSelect}
                        value={statusFilter}
                    >
                        {STATUS_FILTER_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </label>
                <label style={styles.filterControl}>
                    <span style={styles.filterLabel}>Риск</span>
                    <select
                        aria-label="Фильтр по риску заявки"
                        onChange={(event) => setRiskFilter(event.target.value as HandoffLeadRiskFilter)}
                        style={styles.filterSelect}
                        value={riskFilter}
                    >
                        {RISK_FILTER_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </label>
                <span data-testid="lead-inbox-count" style={styles.countPill}>
                    Показано {tickets.length} из {totalCount}
                </span>
            </div>

            {tickets.length === 0 ? (
                <div style={styles.emptyState}>
                    {searchQuery
                        ? 'По поиску ничего не найдено. Проверьте номер, email или снимите фильтры.'
                        : isFiltered
                        ? 'По выбранным фильтрам заявок нет. Можно снять фильтр или проверить другой статус.'
                        : 'Заявок пока нет. Когда клиент попросит консультацию, карточка появится здесь.'}
                </div>
            ) : (
                <div style={styles.caseLayout}>
                    <div aria-label="Список заявок" style={styles.ticketList}>
                        {tickets.map((ticket) => (
                            <LeadTicketCard
                                key={ticket.ticket_id}
                                selected={ticket.ticket_id === selectedTicketId}
                                ticket={ticket}
                                onSelect={() => setSelectedTicketId(ticket.ticket_id)}
                                onStatusChange={(status) => statusMutation.mutate({ ticketId: ticket.ticket_id, status })}
                                onNoteSave={(note) => noteMutation.mutateAsync({ ticketId: ticket.ticket_id, note }).then(() => undefined)}
                                statusUpdating={statusMutation.isPending && statusMutation.variables?.ticketId === ticket.ticket_id}
                                statusError={
                                    statusMutation.error && statusMutation.variables?.ticketId === ticket.ticket_id
                                        ? statusMutation.error.message
                                        : ''
                                }
                                noteSaving={noteMutation.isPending && noteMutation.variables?.ticketId === ticket.ticket_id}
                                noteError={
                                    noteMutation.error && noteMutation.variables?.ticketId === ticket.ticket_id
                                        ? noteMutation.error.message
                                        : ''
                                }
                            />
                        ))}
                    </div>
                    <CaseWorkspace
                        error={detailQuery.error ? detailQuery.error.message : ''}
                        isLoading={Boolean(selectedTicketId && detailQuery.isLoading && !detailQuery.data)}
                        noteError={
                            noteMutation.error && noteMutation.variables?.ticketId === selectedTicketId
                                ? noteMutation.error.message
                                : ''
                        }
                        noteSaving={noteMutation.isPending && noteMutation.variables?.ticketId === selectedTicketId}
                        onNoteSave={(note) => selectedTicketId
                            ? noteMutation.mutateAsync({ ticketId: selectedTicketId, note }).then(() => undefined)
                            : Promise.resolve()}
                        onChecklistToggle={(itemKey, done) => {
                            if (selectedTicketId) {
                                checklistMutation.mutate({ ticketId: selectedTicketId, itemKey, done });
                            }
                        }}
                        onStatusChange={(status) => {
                            if (selectedTicketId) {
                                statusMutation.mutate({ ticketId: selectedTicketId, status });
                            }
                        }}
                        checklistError={
                            checklistMutation.error && checklistMutation.variables?.ticketId === selectedTicketId
                                ? checklistMutation.error.message
                                : ''
                        }
                        checklistUpdatingKey={
                            checklistMutation.isPending && checklistMutation.variables?.ticketId === selectedTicketId
                                ? checklistMutation.variables.itemKey
                                : ''
                        }
                        statusError={
                            statusMutation.error && statusMutation.variables?.ticketId === selectedTicketId
                                ? statusMutation.error.message
                                : ''
                        }
                        statusUpdating={statusMutation.isPending && statusMutation.variables?.ticketId === selectedTicketId}
                        ticket={workspaceTicket}
                    />
                </div>
            )}
        </section>
    );
}

function LeadTicketCard({
    ticket,
    selected,
    onSelect,
    onStatusChange,
    onNoteSave,
    statusUpdating,
    statusError,
    noteSaving,
    noteError,
}: {
    ticket: HandoffTicketLeadItem;
    selected: boolean;
    onSelect: () => void;
    onStatusChange: (status: HandoffLeadStatus) => void;
    onNoteSave: (note: string) => Promise<void>;
    statusUpdating: boolean;
    statusError: string;
    noteSaving: boolean;
    noteError: string;
}) {
    const summary = ticket.diagnostic_summary ?? {};
    const facts = knownFacts(summary);
    const missing = Array.isArray(summary.missing_fields) ? summary.missing_fields.slice(0, 2) : [];
    const reasons = Array.isArray(summary.risk_reasons) ? summary.risk_reasons.slice(0, 3) : [];
    const riskTone = riskStyle(ticket.risk_level || summary.risk_level);
    const leadStatus = normalizeLeadStatus(ticket.status);
    const [noteDraft, setNoteDraft] = useState(ticket.operator_note || '');
    const [noteEditing, setNoteEditing] = useState(false);

    useEffect(() => {
        if (!noteEditing) {
            setNoteDraft(ticket.operator_note || '');
        }
    }, [noteEditing, ticket.operator_note]);

    const handleNoteSave = async () => {
        try {
            await onNoteSave(noteDraft.trim());
            setNoteEditing(false);
        } catch {
            // Ошибка уже показывается рядом с полем через noteError.
        }
    };

    return (
        <article data-testid="lead-ticket-card" style={{ ...styles.ticketCard, ...(selected ? styles.ticketCardSelected : {}) }}>
            <div style={styles.ticketHeader}>
                <div>
                    <p style={styles.ticketMeta}>{formatDate(ticket.created_at)} · канал: {ticket.channel || 'web_chat'}</p>
                    <h3 style={styles.ticketTitle}>Заявка #{ticket.ticket_id.slice(0, 8)}</h3>
                </div>
                <div style={styles.badgeStack}>
                    <span style={{ ...styles.riskBadge, ...riskTone }}>{riskLabel(ticket.risk_level || summary.risk_level)}</span>
                    <span data-testid="lead-quality-badge" style={{ ...styles.qualityBadge, ...qualityStyle(ticket.quality_label) }}>
                        {ticket.quality_score ?? 0}/100 · {qualityLabel(ticket.quality_label)}
                    </span>
                    <span data-testid="lead-readiness-badge" style={{ ...styles.readinessBadge, ...readinessStyle(ticket.readiness_state) }}>
                        {ticket.readiness_label || readinessLabel(ticket.readiness_state)}
                    </span>
                </div>
            </div>

            <div style={styles.statusRow}>
                <label style={styles.statusControl}>
                    <span style={styles.statusLabel}>Статус</span>
                    <select
                        aria-label="Статус заявки"
                        data-testid="lead-ticket-status-select"
                        disabled={statusUpdating}
                        onChange={(event) => onStatusChange(event.target.value as HandoffLeadStatus)}
                        style={styles.statusSelect}
                        value={leadStatus}
                    >
                        {LEAD_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </label>
                <span>Приоритет: <strong>{ticket.priority}</strong></span>
                <span>Категория: <strong>{ticket.category}</strong></span>
            </div>
            {statusUpdating ? <p style={styles.statusHint}>Сохраняем статус...</p> : null}
            {statusError ? <p role="alert" style={styles.statusError}>{statusError}</p> : null}
            <button
                aria-pressed={selected}
                data-testid="lead-ticket-open-case"
                onClick={onSelect}
                style={selected ? styles.openCaseButtonSelected : styles.openCaseButton}
                type="button"
            >
                {selected ? 'Дело открыто' : 'Открыть дело'}
            </button>

            <p style={styles.reason}>{ticket.lead_reason || 'Клиент запросил консультацию.'}</p>
            <p style={styles.qualityReason}>
                Следующий шаг: <strong>{actionLabel(ticket.next_best_action)}</strong>
                {ticket.next_best_action_reason ? ` · ${ticket.next_best_action_reason}` : ''}
            </p>
            <LeadContactActions contact={ticket.contact} />
            <ReportEmailBadge ticket={ticket} />

            <div data-testid="lead-ticket-note" style={styles.noteBox}>
                <div style={styles.noteHeader}>
                    <strong style={styles.noteTitle}>Заметка оператора</strong>
                    {!noteEditing ? (
                        <button
                            onClick={() => setNoteEditing(true)}
                            style={styles.noteButton}
                            type="button"
                        >
                            {ticket.operator_note ? 'Изменить' : 'Добавить'}
                        </button>
                    ) : null}
                </div>
                {noteEditing ? (
                    <div>
                        <textarea
                            aria-label="Внутренняя заметка оператора"
                            maxLength={1000}
                            onChange={(event) => setNoteDraft(event.target.value)}
                            placeholder="Например: попросить справку ФССП, перезвонить завтра после 15:00."
                            style={styles.noteTextarea}
                            value={noteDraft}
                        />
                        <div style={styles.noteFooter}>
                            <span style={styles.noteCounter}>{noteDraft.length}/1000</span>
                            <div style={styles.noteActions}>
                                <button
                                    disabled={noteSaving}
                                    onClick={handleNoteSave}
                                    style={styles.noteButton}
                                    type="button"
                                >
                                    {noteSaving ? 'Сохраняем...' : 'Сохранить'}
                                </button>
                                <button
                                    disabled={noteSaving}
                                    onClick={() => {
                                        setNoteDraft(ticket.operator_note || '');
                                        setNoteEditing(false);
                                    }}
                                    style={styles.noteSecondaryButton}
                                    type="button"
                                >
                                    Отмена
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <p style={ticket.operator_note ? styles.noteText : styles.noteEmpty}>
                        {ticket.operator_note || 'Заметки пока нет.'}
                    </p>
                )}
                {noteError ? <p role="alert" style={styles.statusError}>{noteError}</p> : null}
            </div>

            <div style={styles.summaryGrid}>
                <InfoBlock
                    title="Что известно"
                    items={facts.length ? facts : ['Пока нет диагностических данных']}
                />
                <InfoBlock
                    title="Что уточнить"
                    items={missing.length ? missing : ['Уточнить по разговору']}
                />
            </div>

            <details style={styles.details}>
                <summary style={styles.detailsSummary}>Диагностика</summary>
                <div style={styles.detailsContent}>
                    <InfoBlock title="Причины риска" items={reasons.length ? reasons : ['Не указаны']} />
                    <InfoBlock title="Маршрут" items={[summary.route_hint || 'needs_check']} />
                    <InfoBlock title="Прогресс" items={[`${summary.known_count ?? 0} известных пунктов`]} />
                </div>
            </details>
        </article>
    );
}

function ReportEmailBadge({ ticket }: { ticket: HandoffTicketLeadItem }) {
    if (!ticket.report_email_sent) {
        return null;
    }
    const status = ticket.report_email_status || 'sent';
    const email = ticket.report_email_masked || 'email скрыт';
    const sentAt = ticket.report_email_sent_at ? formatDate(ticket.report_email_sent_at) : 'дата не указана';
    return (
        <div data-testid="lead-report-email-summary" style={styles.reportEmailBox}>
            <strong style={styles.reportEmailTitle}>Отчёт отправлен клиенту</strong>
            <span style={styles.reportEmailMeta}>{sentAt} · {status} · {email}</span>
        </div>
    );
}

function LeadContactActions({ contact }: { contact?: HandoffLeadContact }) {
    const [copied, setCopied] = useState('');
    const name = String(contact?.name || '').trim();
    const phone = String(contact?.phone || '').trim();
    const email = String(contact?.email || '').trim();
    const telHref = phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : '';
    const mailHref = email ? `mailto:${encodeURIComponent(email)}` : '';

    const copyValue = async (kind: string, value: string) => {
        if (!value || typeof navigator === 'undefined' || !navigator.clipboard) return;
        await navigator.clipboard.writeText(value);
        setCopied(kind);
        window.setTimeout(() => setCopied(''), 1600);
    };

    if (!name && !phone && !email) {
        return <p style={styles.contactEmpty}>Контакты не указаны в заявке.</p>;
    }

    return (
        <div data-testid="lead-contact-actions" style={styles.contactBox}>
            <div style={styles.contactDetails}>
                {name ? <span>Клиент: <strong>{name}</strong></span> : null}
                {phone ? <span>Телефон: <strong>{phone}</strong></span> : null}
                {email ? <span>Email: <strong>{email}</strong></span> : null}
            </div>
            <div style={styles.contactActions}>
                {phone ? (
                    <>
                        <button
                            data-testid="lead-contact-copy-phone"
                            onClick={() => void copyValue('phone', phone)}
                            style={styles.contactButton}
                            type="button"
                        >
                            {copied === 'phone' ? 'Телефон скопирован' : 'Скопировать телефон'}
                        </button>
                        <a href={telHref} style={styles.contactLink}>Позвонить</a>
                    </>
                ) : null}
                {email ? (
                    <>
                        <button
                            data-testid="lead-contact-copy-email"
                            onClick={() => void copyValue('email', email)}
                            style={styles.contactButton}
                            type="button"
                        >
                            {copied === 'email' ? 'Email скопирован' : 'Скопировать email'}
                        </button>
                        <a href={mailHref} style={styles.contactLink}>Написать</a>
                    </>
                ) : null}
            </div>
        </div>
    );
}

function normalizeLeadStatus(value?: string): HandoffLeadStatus {
    const status = String(value || '').toLowerCase();
    if (status === 'contacted' || status === 'qualified' || status === 'closed') {
        return status;
    }
    return 'new';
}

function InfoBlock({ title, items }: { title: string; items: string[] }) {
    return (
        <div style={styles.infoBlock}>
            <strong style={styles.infoTitle}>{title}</strong>
            <ul style={styles.infoList}>
                {items.map((item) => (
                    <li key={`${title}-${item}`} style={styles.infoItem}>{item}</li>
                ))}
            </ul>
        </div>
    );
}

function knownFacts(summary: HandoffDiagnosticSummary): string[] {
    const facts: string[] = [];
    if (summary.debt_amount) facts.push(`долг: ${summary.debt_amount}`);
    if (summary.debt_types?.length) facts.push(`типы долгов: ${summary.debt_types.slice(0, 2).join(', ')}`);
    if (summary.bailiffs) facts.push(`приставы: ${summary.bailiffs}`);
    if (summary.income) facts.push(`доход: ${summary.income}`);
    if (summary.property?.length) facts.push(`имущество: ${summary.property.slice(0, 2).join(', ')}`);
    if (summary.collectors) facts.push(`коллекторы: ${summary.collectors}`);
    return facts.slice(0, 5);
}

function formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'дата не указана';
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function riskStyle(value?: string): CSSProperties {
    const risk = String(value || '').toLowerCase();
    if (risk === 'critical' || risk === 'high') {
        return { background: '#ffe6dc', color: '#8d2d1d', borderColor: '#f1b7ad' };
    }
    if (risk === 'low') {
        return { background: '#e8f6ef', color: '#27624a', borderColor: '#b8dec9' };
    }
    return { background: '#fff2d6', color: '#7d5122', borderColor: '#ecd39c' };
}

function qualityStyle(value?: string): CSSProperties {
    const label = String(value || '').toLowerCase();
    if (label === 'urgent') {
        return { background: '#8d2d1d', color: '#fff', borderColor: '#8d2d1d' };
    }
    if (label === 'high') {
        return { background: '#ffe6dc', color: '#8d2d1d', borderColor: '#f1b7ad' };
    }
    if (label === 'medium') {
        return { background: '#fff2d6', color: '#7d5122', borderColor: '#ecd39c' };
    }
    return { background: '#e8f6ef', color: '#27624a', borderColor: '#b8dec9' };
}

function qualityLabel(value?: string): string {
    const label = String(value || '').toLowerCase();
    if (label === 'urgent') return 'срочный';
    if (label === 'high') return 'высокий';
    if (label === 'medium') return 'средний';
    return 'низкий';
}

function riskLabel(value?: string): string {
    const risk = String(value || '').toLowerCase();
    if (risk === 'critical') return 'критический';
    if (risk === 'high') return 'высокий';
    if (risk === 'low') return 'низкий';
    return 'средний';
}

function readinessLabel(value?: string): string {
    const state = String(value || '').toLowerCase();
    const labels: Record<string, string> = {
        ready_to_call: 'Готово к звонку',
        needs_more_info: 'Нужно уточнить',
        needs_document_review: 'Нужны документы',
        low_fit: 'Низкая полнота',
        requires_lawyer_review: 'Проверка юриста',
    };
    return labels[state] || 'Нужно уточнить';
}

function readinessStyle(value?: string): CSSProperties {
    const state = String(value || '').toLowerCase();
    if (state === 'ready_to_call') {
        return { background: '#e8f6ef', color: '#27624a', borderColor: '#b8dec9' };
    }
    if (state === 'requires_lawyer_review') {
        return { background: '#8d2d1d', color: '#fff', borderColor: '#8d2d1d' };
    }
    if (state === 'needs_document_review') {
        return { background: '#fff2d6', color: '#7d5122', borderColor: '#ecd39c' };
    }
    if (state === 'low_fit') {
        return { background: '#eef3f6', color: '#526b7d', borderColor: '#d7e4ea' };
    }
    return { background: '#e8f3f7', color: '#234a66', borderColor: '#cfe0e8' };
}

function actionLabel(value?: string): string {
    const action = String(value || '').toLowerCase();
    const labels: Record<string, string> = {
        call_client: 'позвонить клиенту',
        request_documents: 'попросить документы',
        clarify_income: 'уточнить доход',
        clarify_property: 'уточнить имущество',
        check_bailiffs: 'проверить приставов',
        review_mfc_eligibility: 'проверить МФЦ',
        close_low_fit: 'закрыть низкоприоритетную заявку',
    };
    return labels[action] || 'попросить документы';
}

const styles: Record<string, CSSProperties> = {
    card: {
        background: 'linear-gradient(160deg, #f7fbfc 0%, #eef4f6 100%)',
        border: '1px solid rgba(24, 54, 72, 0.1)',
        borderRadius: 28,
        padding: 24,
        boxShadow: '0 18px 36px rgba(15, 41, 58, 0.06)',
        textAlign: 'left',
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
    helper: {
        marginTop: 10,
        color: '#657b8c',
        lineHeight: 1.5,
    },
    emptyState: {
        marginTop: 18,
        borderRadius: 22,
        padding: 18,
        background: '#fff',
        color: '#5e7586',
        border: '1px dashed rgba(24, 54, 72, 0.18)',
    },
    filterBar: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 10,
        marginTop: 16,
        padding: 12,
        borderRadius: 20,
        background: 'rgba(255,255,255,0.72)',
        border: '1px solid rgba(24, 54, 72, 0.08)',
    },
    filterControl: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    searchControl: {
        flex: '1 1 240px',
    },
    filterLabel: {
        color: '#526b7d',
        fontSize: 13,
        fontWeight: 800,
    },
    filterSelect: {
        minWidth: 132,
        border: '1px solid rgba(24, 54, 72, 0.16)',
        borderRadius: 999,
        background: '#fff',
        color: '#24465c',
        fontWeight: 700,
        padding: '7px 28px 7px 10px',
    },
    searchInput: {
        flex: '1 1 180px',
        minWidth: 0,
        border: '1px solid rgba(24, 54, 72, 0.16)',
        borderRadius: 999,
        background: '#fff',
        color: '#24465c',
        fontWeight: 700,
        padding: '8px 12px',
    },
    countPill: {
        borderRadius: 999,
        padding: '7px 10px',
        background: '#edf5f7',
        color: '#46677d',
        fontSize: 13,
        fontWeight: 800,
    },
    ticketList: {
        display: 'grid',
        gap: 14,
        alignContent: 'start',
    },
    caseLayout: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
        gap: 16,
        alignItems: 'start',
        marginTop: 18,
    },
    ticketCard: {
        background: '#fff',
        borderRadius: 24,
        padding: 18,
        border: '1px solid rgba(24, 54, 72, 0.1)',
        boxShadow: '0 10px 26px rgba(15, 41, 58, 0.05)',
    },
    ticketCardSelected: {
        borderColor: 'rgba(38, 104, 135, 0.32)',
        boxShadow: '0 14px 30px rgba(20, 75, 104, 0.1)',
    },
    ticketHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
    },
    ticketMeta: {
        margin: 0,
        color: '#6a7f8e',
        fontSize: 13,
    },
    ticketTitle: {
        margin: '6px 0 0',
        color: '#18384d',
        fontSize: 20,
    },
    riskBadge: {
        border: '1px solid',
        borderRadius: 999,
        padding: '6px 10px',
        fontSize: 12,
        fontWeight: 800,
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
    },
    badgeStack: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 6,
    },
    qualityBadge: {
        border: '1px solid',
        borderRadius: 999,
        padding: '5px 9px',
        fontSize: 11,
        fontWeight: 900,
        whiteSpace: 'nowrap',
    },
    readinessBadge: {
        border: '1px solid',
        borderRadius: 999,
        padding: '5px 9px',
        fontSize: 11,
        fontWeight: 900,
        whiteSpace: 'nowrap',
    },
    statusRow: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '8px 14px',
        marginTop: 14,
        color: '#415c70',
        fontSize: 14,
    },
    statusControl: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    statusLabel: {
        color: '#415c70',
        fontWeight: 700,
    },
    statusSelect: {
        border: '1px solid rgba(24, 54, 72, 0.18)',
        borderRadius: 999,
        background: '#f6fafc',
        color: '#24465c',
        fontWeight: 700,
        padding: '6px 28px 6px 10px',
    },
    statusHint: {
        margin: '8px 0 0',
        color: '#657b8c',
        fontSize: 13,
    },
    statusError: {
        margin: '8px 0 0',
        color: '#8a311d',
        fontSize: 13,
        fontWeight: 700,
    },
    openCaseButton: {
        marginTop: 10,
        border: '1px solid rgba(24, 54, 72, 0.14)',
        borderRadius: 999,
        background: '#f6fafc',
        color: '#234a66',
        cursor: 'pointer',
        fontWeight: 800,
        padding: '7px 12px',
    },
    openCaseButtonSelected: {
        marginTop: 10,
        border: '1px solid rgba(24, 54, 72, 0.18)',
        borderRadius: 999,
        background: '#234a66',
        color: '#fff',
        cursor: 'pointer',
        fontWeight: 900,
        padding: '7px 12px',
    },
    reason: {
        marginTop: 14,
        color: '#28465c',
        lineHeight: 1.45,
    },
    qualityReason: {
        margin: '8px 0 0',
        color: '#516b7c',
        fontSize: 13,
        lineHeight: 1.45,
    },
    contactBox: {
        marginTop: 12,
        borderRadius: 18,
        padding: 12,
        background: '#f4f8fb',
        border: '1px solid rgba(24, 54, 72, 0.09)',
    },
    contactDetails: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px 12px',
        color: '#405c70',
        fontSize: 14,
    },
    contactActions: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 10,
    },
    contactButton: {
        border: '1px solid rgba(24, 54, 72, 0.14)',
        borderRadius: 999,
        background: '#fff',
        color: '#234a66',
        cursor: 'pointer',
        fontWeight: 800,
        padding: '7px 11px',
    },
    contactLink: {
        border: '1px solid rgba(24, 54, 72, 0.14)',
        borderRadius: 999,
        background: '#e8f3f7',
        color: '#234a66',
        fontWeight: 800,
        padding: '7px 11px',
        textDecoration: 'none',
    },
    contactEmpty: {
        margin: '10px 0 0',
        color: '#7a8790',
        fontSize: 13,
    },
    reportEmailBox: {
        display: 'grid',
        gap: 4,
        marginTop: 12,
        borderRadius: 18,
        padding: 12,
        background: '#eef8f3',
        border: '1px solid rgba(49, 128, 88, 0.16)',
        color: '#2d6248',
    },
    reportEmailTitle: {
        fontSize: 14,
        color: '#275a43',
    },
    reportEmailMeta: {
        fontSize: 13,
        color: '#517762',
        overflowWrap: 'anywhere',
    },
    noteBox: {
        marginTop: 14,
        borderRadius: 18,
        padding: 12,
        background: '#fbf7ef',
        border: '1px solid rgba(150, 116, 65, 0.18)',
    },
    noteHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
    },
    noteTitle: {
        color: '#513f29',
        fontSize: 14,
    },
    noteText: {
        margin: '8px 0 0',
        color: '#4d5d67',
        lineHeight: 1.45,
        whiteSpace: 'pre-wrap',
    },
    noteEmpty: {
        margin: '8px 0 0',
        color: '#7a8790',
        fontSize: 13,
    },
    noteTextarea: {
        width: '100%',
        minHeight: 84,
        marginTop: 10,
        boxSizing: 'border-box',
        border: '1px solid rgba(24, 54, 72, 0.16)',
        borderRadius: 14,
        padding: 10,
        color: '#24465c',
        resize: 'vertical',
        font: 'inherit',
        lineHeight: 1.4,
        background: '#fff',
    },
    noteFooter: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
        marginTop: 8,
    },
    noteCounter: {
        color: '#7a8790',
        fontSize: 12,
    },
    noteActions: {
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
    },
    noteButton: {
        border: '1px solid rgba(24, 54, 72, 0.16)',
        borderRadius: 999,
        background: '#fff',
        color: '#234a66',
        cursor: 'pointer',
        fontWeight: 800,
        padding: '7px 12px',
    },
    noteSecondaryButton: {
        border: '1px solid rgba(24, 54, 72, 0.12)',
        borderRadius: 999,
        background: 'transparent',
        color: '#5f7280',
        cursor: 'pointer',
        fontWeight: 700,
        padding: '7px 12px',
    },
    summaryGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 12,
        marginTop: 14,
    },
    infoBlock: {
        borderRadius: 18,
        padding: 14,
        background: '#f6fafc',
        border: '1px solid rgba(24, 54, 72, 0.08)',
    },
    infoTitle: {
        display: 'block',
        color: '#1d3d55',
        marginBottom: 8,
    },
    infoList: {
        margin: 0,
        paddingLeft: 18,
        color: '#536c7d',
        lineHeight: 1.45,
    },
    infoItem: {
        marginBottom: 4,
    },
    details: {
        marginTop: 12,
        color: '#415c70',
    },
    detailsSummary: {
        cursor: 'pointer',
        fontWeight: 700,
        color: '#234a66',
    },
    detailsContent: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 10,
        marginTop: 10,
    },
    errorBanner: {
        borderRadius: 18,
        padding: 14,
        background: '#fff1ed',
        border: '1px solid #f1b7ad',
        color: '#8a311d',
    },
};
