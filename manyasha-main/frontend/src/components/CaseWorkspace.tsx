import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import {
    type HandoffDiagnosticSummary,
    type HandoffLeadContact,
    type HandoffLeadStatus,
    type HandoffTicketLeadDetailItem,
} from './PartnerDashboardContext';

const LEAD_STATUS_OPTIONS: Array<{ value: HandoffLeadStatus; label: string }> = [
    { value: 'new', label: 'Новая' },
    { value: 'contacted', label: 'Связались' },
    { value: 'qualified', label: 'Квалифицирована' },
    { value: 'closed', label: 'Закрыта' },
];

export function CaseWorkspace({
    ticket,
    isLoading,
    error,
    onStatusChange,
    onNoteSave,
    onChecklistToggle,
    statusUpdating,
    statusError,
    noteSaving,
    noteError,
    checklistUpdatingKey,
    checklistError,
}: {
    ticket: HandoffTicketLeadDetailItem | null;
    isLoading: boolean;
    error: string;
    onStatusChange: (status: HandoffLeadStatus) => void;
    onNoteSave: (note: string) => Promise<void>;
    onChecklistToggle: (itemKey: string, done: boolean) => void;
    statusUpdating: boolean;
    statusError: string;
    noteSaving: boolean;
    noteError: string;
    checklistUpdatingKey: string;
    checklistError: string;
}) {
    const [noteDraft, setNoteDraft] = useState(ticket?.operator_note || '');
    const [noteEditing, setNoteEditing] = useState(false);
    const [followUpCopied, setFollowUpCopied] = useState(false);
    const [summaryCopied, setSummaryCopied] = useState(false);

    useEffect(() => {
        if (!noteEditing) {
            setNoteDraft(ticket?.operator_note || '');
        }
    }, [noteEditing, ticket?.operator_note]);

    const summary = ticket?.diagnostic_summary ?? {};
    const facts = knownFacts(summary);
    const missing = Array.isArray(summary.missing_fields) ? summary.missing_fields.slice(0, 4) : [];
    const reasons = Array.isArray(summary.risk_reasons) ? summary.risk_reasons.slice(0, 4) : [];
    const riskTone = riskStyle(ticket?.risk_level || summary.risk_level);
    const nextStep = useMemo(() => buildNextStep(ticket, missing), [missing, ticket]);
    const decisionChecklist = ticket?.decision_checklist ?? [];
    const checklistDone = decisionChecklist.filter((item) => item.done).length;
    const readinessReasons = ticket?.readiness_reasons?.length ? ticket.readiness_reasons.slice(0, 4) : ['данных пока мало'];
    const blockingItems = ticket?.blocking_items?.slice(0, 4) ?? [];

    const handleNoteSave = async () => {
        try {
            await onNoteSave(noteDraft.trim());
            setNoteEditing(false);
        } catch {
            // Ошибка уже выводится через noteError.
        }
    };

    const copyText = async (text: string): Promise<boolean> => {
        if (!text) return false;
        const fallbackCopy = () => {
            if (typeof document === 'undefined') return false;
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.setAttribute('readonly', 'true');
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            const copied = document.execCommand('copy');
            document.body.removeChild(textarea);
            return copied;
        };
        try {
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
                await navigator.clipboard.writeText(text);
            } else if (!fallbackCopy()) {
                return false;
            }
            return true;
        } catch {
            if (fallbackCopy()) {
                return true;
            }
        }
        return false;
    };

    const copyFollowUpMessage = async () => {
        if (await copyText(ticket?.follow_up_message?.text || '')) {
            setFollowUpCopied(true);
            window.setTimeout(() => setFollowUpCopied(false), 1600);
        }
    };

    const copyInternalSummary = async () => {
        if (await copyText(ticket?.internal_case_summary?.text || '')) {
            setSummaryCopied(true);
            window.setTimeout(() => setSummaryCopied(false), 1600);
        }
    };

    const downloadInternalSummary = () => {
        const text = ticket?.internal_case_summary?.text || '';
        if (!text || typeof document === 'undefined') return;
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `manyasha-case-${ticket?.ticket_id.slice(0, 8) || 'summary'}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return <aside data-testid="case-workspace" style={styles.workspace}>Загружаем дело...</aside>;
    }

    if (error) {
        return (
            <aside data-testid="case-workspace" style={styles.workspace}>
                <div role="alert" style={styles.errorBanner}>{error}</div>
            </aside>
        );
    }

    if (!ticket) {
        return (
            <aside data-testid="case-workspace" style={styles.workspace}>
                <p style={styles.empty}>Выберите заявку, чтобы открыть рабочее пространство дела.</p>
            </aside>
        );
    }

    return (
        <aside data-testid="case-workspace" style={styles.workspace}>
            <div style={styles.header}>
                <div>
                    <p style={styles.eyebrow}>Рабочее пространство дела</p>
                    <h2 style={styles.title}>Дело #{ticket.ticket_id.slice(0, 8)}</h2>
                    <p style={styles.meta}>{formatDate(ticket.created_at)} · канал: {ticket.channel || 'web_chat'}</p>
                </div>
                <span style={{ ...styles.riskBadge, ...riskTone }}>{riskLabel(ticket.risk_level || summary.risk_level)}</span>
            </div>

            <section data-testid="case-workspace-quality" style={styles.qualityPanel}>
                <div>
                    <p style={styles.qualityCaption}>Оценка качества лида, не юридический вывод</p>
                    <strong style={styles.qualityScore}>{ticket.quality_score ?? 0}/100 · {qualityLabel(ticket.quality_label)}</strong>
                </div>
                <span style={{ ...styles.qualityBadge, ...qualityStyle(ticket.quality_label) }}>
                    {qualityLabel(ticket.quality_label)}
                </span>
                <div style={styles.qualityReasons}>
                    {(ticket.quality_reasons || []).slice(0, 4).map((reason) => (
                        <span key={reason} style={styles.reasonPill}>{reason}</span>
                    ))}
                    {(ticket.quality_reasons || []).length === 0 ? <span style={styles.reasonPill}>данных пока мало</span> : null}
                </div>
                <div style={styles.nextActionBox}>
                    <strong>{actionLabel(ticket.next_best_action)}</strong>
                    <span>{ticket.next_best_action_reason || 'Попросите документы и подтвердите вводные.'}</span>
                </div>
            </section>

            <section data-testid="case-workspace-readiness" style={styles.readinessPanel}>
                <div style={styles.blockHeader}>
                    <div>
                        <strong>Готовность дела</strong>
                        <p style={styles.readinessHint}>Операционная готовность, не юридическое заключение.</p>
                    </div>
                    <span data-testid="case-workspace-readiness-badge" style={{ ...styles.readinessBadge, ...readinessStyle(ticket.readiness_state) }}>
                        {ticket.readiness_label || readinessLabel(ticket.readiness_state)}
                    </span>
                </div>
                <div style={styles.readinessGrid}>
                    <div>
                        <span style={styles.readinessSubhead}>Почему так</span>
                        <InfoList items={readinessReasons} />
                    </div>
                    <div>
                        <span style={styles.readinessSubhead}>Что блокирует</span>
                        <InfoList items={blockingItems.length ? blockingItems : ['явных блокеров нет']} />
                    </div>
                </div>
                <div style={styles.readinessAction}>
                    <strong>Рекомендация оператору</strong>
                    <span>{ticket.recommended_operator_action || 'Уточните вводные и выберите следующий безопасный шаг.'}</span>
                </div>
            </section>

            <section style={styles.block}>
                <div style={styles.blockHeader}>
                    <strong>Контакт и статус</strong>
                    <label style={styles.statusControl}>
                        <span style={styles.srOnly}>Статус заявки</span>
                        <select
                            aria-label="Статус заявки в деле"
                            data-testid="case-workspace-status-select"
                            disabled={statusUpdating}
                            onChange={(event) => onStatusChange(event.target.value as HandoffLeadStatus)}
                            style={styles.statusSelect}
                            value={normalizeLeadStatus(ticket.status)}
                        >
                            {LEAD_STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </label>
                </div>
                {statusUpdating ? <p style={styles.hint}>Сохраняем статус...</p> : null}
                {statusError ? <p role="alert" style={styles.errorText}>{statusError}</p> : null}
                <ContactActions contact={ticket.contact} />
            </section>

            <section style={styles.block}>
                <strong>Диагностика</strong>
                <InfoList items={facts.length ? facts : ['Пока нет диагностических данных']} />
            </section>

            <section style={styles.grid}>
                <div style={styles.block}>
                    <strong>Риски</strong>
                    <InfoList items={reasons.length ? reasons : ['Явные причины риска не указаны']} />
                    {ticket.report_email_sent ? <ReportEmailBadge ticket={ticket} /> : null}
                </div>
                <div style={styles.block}>
                    <strong>Недостающие данные</strong>
                    <InfoList items={missing.length ? missing : ['Ключевые вводные уже собраны или уточняются в разговоре']} />
                </div>
            </section>

            <section data-testid="case-workspace-documents" style={styles.block}>
                <div style={styles.blockHeader}>
                    <strong>Документы</strong>
                    <span style={styles.documentHint}>Подготовительный список, не юридическое заключение</span>
                </div>
                <div style={styles.documentList}>
                    {(ticket.document_checklist || []).length ? ticket.document_checklist.map((doc) => (
                        <article key={doc.key} style={styles.documentItem}>
                            <span style={{ ...styles.documentPriority, ...documentPriorityStyle(doc.priority) }}>
                                {documentPriorityLabel(doc.priority)}
                            </span>
                            <div>
                                <strong>{doc.title}</strong>
                                <p style={styles.documentReason}>{doc.reason}</p>
                                <span style={styles.documentSource}>Источник: {documentSourceLabel(doc.source)}</span>
                            </div>
                        </article>
                    )) : (
                        <p style={styles.mutedText}>Пока достаточно базовых документов: паспорт, СНИЛС/ИНН и сведения о долгах.</p>
                    )}
                </div>
            </section>

            {decisionChecklist.length ? (
                <section data-testid="case-workspace-decision-checklist" style={styles.block}>
                    <div style={styles.blockHeader}>
                        <div>
                            <strong>Проверка перед решением</strong>
                            <p style={styles.checklistHint}>Внутренний checklist оператора, не юридическое заключение.</p>
                        </div>
                        <span data-testid="case-workspace-decision-progress" style={styles.progressPill}>
                            {checklistDone}/{decisionChecklist.length}
                        </span>
                    </div>
                    <div style={styles.decisionChecklist}>
                        {decisionChecklist.map((item) => (
                            <label key={item.key} style={styles.decisionItem}>
                                <input
                                    aria-label={item.title}
                                    checked={item.done}
                                    disabled={checklistUpdatingKey === item.key}
                                    onChange={(event) => onChecklistToggle(item.key, event.target.checked)}
                                    type="checkbox"
                                />
                                <span style={styles.decisionText}>
                                    <span style={styles.decisionTitleRow}>
                                        <strong>{item.title}</strong>
                                        {item.required ? <em style={styles.requiredPill}>обязательно</em> : <em style={styles.optionalPill}>по ситуации</em>}
                                    </span>
                                    <small style={styles.decisionReason}>{item.reason}</small>
                                </span>
                            </label>
                        ))}
                    </div>
                    {checklistError ? <p role="alert" style={styles.errorText}>{checklistError}</p> : null}
                </section>
            ) : null}

            <section data-testid="case-workspace-follow-up" style={styles.block}>
                <div style={styles.blockHeader}>
                    <div>
                        <strong>Сообщение клиенту</strong>
                        <p style={styles.followUpHint}>Черновик для ручной отправки. Авто-отправки нет.</p>
                    </div>
                    <button
                        data-testid="case-workspace-follow-up-copy"
                        disabled={!ticket.follow_up_message?.text}
                        onClick={() => void copyFollowUpMessage()}
                        style={styles.softButton}
                        type="button"
                    >
                        {followUpCopied ? 'Скопировано' : 'Скопировать'}
                    </button>
                </div>
                <textarea
                    aria-label="Черновик сообщения клиенту"
                    readOnly
                    style={styles.followUpTextarea}
                    value={ticket.follow_up_message?.text || 'Черновик пока недоступен.'}
                />
                <div style={styles.followUpMeta}>
                    <span>Тон: {toneLabel(ticket.follow_up_message?.tone)}</span>
                    {(ticket.follow_up_message?.warnings || []).slice(0, 2).map((warning) => (
                        <span key={warning}>{warning}</span>
                    ))}
                </div>
            </section>

            <section data-testid="case-workspace-export-summary" style={styles.block}>
                <div style={styles.blockHeader}>
                    <div>
                        <strong>Внутренняя сводка</strong>
                        <p style={styles.followUpHint}>Для передачи юристу вручную. Авто-отправки нет.</p>
                    </div>
                    <div style={styles.summaryActions}>
                        <button
                            data-testid="case-workspace-summary-copy"
                            disabled={!ticket.internal_case_summary?.text}
                            onClick={() => void copyInternalSummary()}
                            style={styles.softButton}
                            type="button"
                        >
                            {summaryCopied ? 'Сводка скопирована' : 'Скопировать сводку'}
                        </button>
                        <button
                            data-testid="case-workspace-summary-download"
                            disabled={!ticket.internal_case_summary?.text}
                            onClick={downloadInternalSummary}
                            style={styles.softButton}
                            type="button"
                        >
                            Скачать .txt
                        </button>
                    </div>
                </div>
                <details style={styles.summaryDetails}>
                    <summary style={styles.summaryToggle}>Показать текст сводки</summary>
                    <textarea
                        aria-label="Внутренняя сводка дела"
                        readOnly
                        style={styles.summaryTextarea}
                        value={ticket.internal_case_summary?.text || 'Сводка пока недоступна.'}
                    />
                </details>
                <p style={styles.summaryMeta}>
                    {ticket.internal_case_summary?.generated_at
                        ? `Сформировано: ${formatDate(ticket.internal_case_summary.generated_at)}`
                        : 'Сводка формируется из текущих данных дела.'}
                </p>
            </section>

            <section data-testid="case-workspace-timeline" style={styles.block}>
                <strong>История действий</strong>
                <ol style={styles.timeline}>
                    {(ticket.timeline || []).length ? ticket.timeline.map((event) => (
                        <li key={`${event.kind}-${event.at || event.label}`} style={styles.timelineItem}>
                            <span style={styles.timelineDate}>{event.at ? formatDate(event.at) : 'дата не указана'}</span>
                            <span style={styles.timelineLabel}>{event.label}</span>
                            {event.detail ? <span style={styles.timelineDetail}>{event.detail}</span> : null}
                        </li>
                    )) : (
                        <li style={styles.timelineItem}>История пока состоит только из создания заявки.</li>
                    )}
                </ol>
            </section>

            <section data-testid="case-workspace-note" style={styles.block}>
                <div style={styles.blockHeader}>
                    <strong>Заметка оператора</strong>
                    {!noteEditing ? (
                        <button onClick={() => setNoteEditing(true)} style={styles.softButton} type="button">
                            {ticket.operator_note ? 'Изменить' : 'Добавить'}
                        </button>
                    ) : null}
                </div>
                {noteEditing ? (
                    <>
                        <textarea
                            aria-label="Внутренняя заметка оператора"
                            maxLength={1000}
                            onChange={(event) => setNoteDraft(event.target.value)}
                            placeholder="Например: попросить справку ФССП, перезвонить завтра после 15:00."
                            style={styles.noteTextarea}
                            value={noteDraft}
                        />
                        <div style={styles.noteFooter}>
                            <span style={styles.counter}>{noteDraft.length}/1000</span>
                            <div style={styles.noteActions}>
                                <button disabled={noteSaving} onClick={handleNoteSave} style={styles.primaryButton} type="button">
                                    {noteSaving ? 'Сохраняем...' : 'Сохранить'}
                                </button>
                                <button
                                    disabled={noteSaving}
                                    onClick={() => {
                                        setNoteDraft(ticket.operator_note || '');
                                        setNoteEditing(false);
                                    }}
                                    style={styles.softButton}
                                    type="button"
                                >
                                    Отмена
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <p style={ticket.operator_note ? styles.noteText : styles.mutedText}>
                        {ticket.operator_note || 'Заметки пока нет.'}
                    </p>
                )}
                {noteError ? <p role="alert" style={styles.errorText}>{noteError}</p> : null}
            </section>

            <section style={{ ...styles.block, ...styles.nextStep }}>
                <strong>Следующий шаг</strong>
                <p style={styles.nextText}>{nextStep}</p>
            </section>
        </aside>
    );
}

function ContactActions({ contact }: { contact?: HandoffLeadContact }) {
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
        return <p style={styles.mutedText}>Контакты не указаны в заявке.</p>;
    }

    return (
        <div style={styles.contactBox}>
            <div style={styles.contactDetails}>
                {name ? <span>Клиент: <strong>{name}</strong></span> : null}
                {phone ? <span>Телефон: <strong>{phone}</strong></span> : null}
                {email ? <span>Email: <strong>{email}</strong></span> : null}
            </div>
            <div style={styles.contactActions}>
                {phone ? (
                    <>
                        <button onClick={() => void copyValue('phone', phone)} style={styles.softButton} type="button">
                            {copied === 'phone' ? 'Телефон скопирован' : 'Скопировать телефон'}
                        </button>
                        <a href={telHref} style={styles.linkButton}>Позвонить</a>
                    </>
                ) : null}
                {email ? (
                    <>
                        <button onClick={() => void copyValue('email', email)} style={styles.softButton} type="button">
                            {copied === 'email' ? 'Email скопирован' : 'Скопировать email'}
                        </button>
                        <a href={mailHref} style={styles.linkButton}>Написать</a>
                    </>
                ) : null}
            </div>
        </div>
    );
}

function ReportEmailBadge({ ticket }: { ticket: HandoffTicketLeadDetailItem }) {
    const status = ticket.report_email_status || 'sent';
    const email = ticket.report_email_masked || 'email скрыт';
    const sentAt = ticket.report_email_sent_at ? formatDate(ticket.report_email_sent_at) : 'дата не указана';
    return (
        <div data-testid="case-workspace-report-email" style={styles.reportEmailBox}>
            <strong>Отчёт отправлен клиенту</strong>
            <span>{sentAt} · {status} · {email}</span>
        </div>
    );
}

function InfoList({ items }: { items: string[] }) {
    return (
        <ul style={styles.infoList}>
            {items.map((item) => <li key={item} style={styles.infoItem}>{item}</li>)}
        </ul>
    );
}

function knownFacts(summary: HandoffDiagnosticSummary): string[] {
    const facts: string[] = [];
    if (summary.debt_amount) facts.push(`долг: ${summary.debt_amount}`);
    if (summary.debt_types?.length) facts.push(`типы долгов: ${summary.debt_types.slice(0, 3).join(', ')}`);
    if (summary.bailiffs) facts.push(`приставы: ${summary.bailiffs}`);
    if (summary.income) facts.push(`доход: ${summary.income}`);
    if (summary.property?.length) facts.push(`имущество: ${summary.property.slice(0, 3).join(', ')}`);
    if (summary.collectors) facts.push(`коллекторы: ${summary.collectors}`);
    if (summary.route_hint) facts.push(`маршрут: ${summary.route_hint}`);
    return facts.slice(0, 7);
}

function buildNextStep(ticket: HandoffTicketLeadDetailItem | null, missing: string[]): string {
    if (!ticket) return 'Выберите заявку, чтобы увидеть следующий шаг.';
    if (ticket.next_best_action_reason) {
        return ticket.next_best_action_reason;
    }
    const risk = String(ticket.risk_level || ticket.diagnostic_summary?.risk_level || '').toLowerCase();
    if (risk === 'high' || risk === 'critical') {
        if (missing.length) {
            return `Перед звонком уточните: ${missing.slice(0, 2).join(', ')}. Затем проверьте документы с юристом, без обещаний результата.`;
        }
        return 'Проверьте документы с юристом и подтвердите маршрут процедуры. Формулируйте выводы как предварительные.';
    }
    if (missing.length) {
        return `Сначала спокойно уточните: ${missing.slice(0, 2).join(', ')}. После этого можно точнее выбрать МФЦ, суд или другой безопасный шаг.`;
    }
    return 'Зафиксируйте вводные, подтвердите их документами и предложите следующий безопасный шаг без гарантий списания.';
}

function actionLabel(value?: string): string {
    const action = String(value || '').toLowerCase();
    const labels: Record<string, string> = {
        call_client: 'Позвонить клиенту',
        request_documents: 'Попросить документы',
        clarify_income: 'Уточнить доход',
        clarify_property: 'Уточнить имущество',
        check_bailiffs: 'Проверить приставов',
        review_mfc_eligibility: 'Проверить МФЦ',
        close_low_fit: 'Закрыть низкоприоритетную заявку',
    };
    return labels[action] || 'Попросить документы';
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

function toneLabel(value?: string): string {
    const tone = String(value || '').toLowerCase();
    if (tone.includes('calm') || tone.includes('professional')) {
        return 'спокойный профессиональный';
    }
    return tone || 'спокойный профессиональный';
}

function documentPriorityLabel(value?: string): string {
    const priority = String(value || '').toLowerCase();
    if (priority === 'required') return 'обязательно';
    if (priority === 'optional') return 'по ситуации';
    return 'желательно';
}

function documentSourceLabel(value?: string): string {
    const source = String(value || '').toLowerCase();
    const labels: Record<string, string> = {
        identity: 'личность',
        debt: 'долги',
        bailiffs: 'приставы',
        income: 'доход',
        property: 'имущество',
        collectors: 'коллекторы',
        route: 'маршрут',
    };
    return labels[source] || source || 'дело';
}

function normalizeLeadStatus(value?: string): HandoffLeadStatus {
    const status = String(value || '').toLowerCase();
    if (status === 'contacted' || status === 'qualified' || status === 'closed') {
        return status;
    }
    return 'new';
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

function documentPriorityStyle(value?: string): CSSProperties {
    const priority = String(value || '').toLowerCase();
    if (priority === 'required') {
        return { background: '#ffe6dc', color: '#8d2d1d', borderColor: '#f1b7ad' };
    }
    if (priority === 'optional') {
        return { background: '#eef3f6', color: '#526b7d', borderColor: '#d7e4ea' };
    }
    return { background: '#fff2d6', color: '#7d5122', borderColor: '#ecd39c' };
}

const styles: Record<string, CSSProperties> = {
    workspace: {
        display: 'grid',
        gap: 14,
        minWidth: 0,
        background: '#ffffff',
        border: '1px solid rgba(24, 54, 72, 0.1)',
        borderRadius: 26,
        padding: 18,
        boxShadow: '0 10px 26px rgba(15, 41, 58, 0.05)',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
    },
    eyebrow: {
        margin: 0,
        color: '#587286',
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
    },
    title: {
        margin: '6px 0 0',
        color: '#18384d',
        fontSize: 24,
    },
    meta: {
        margin: '6px 0 0',
        color: '#6a7f8e',
        fontSize: 13,
    },
    riskBadge: {
        border: '1px solid',
        borderRadius: 999,
        padding: '6px 10px',
        fontSize: 12,
        fontWeight: 900,
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
    },
    qualityPanel: {
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 12,
        borderRadius: 22,
        padding: 14,
        background: '#eef6f9',
        border: '1px solid rgba(24, 84, 112, 0.12)',
    },
    qualityCaption: {
        margin: 0,
        color: '#607685',
        fontSize: 12,
        fontWeight: 800,
    },
    qualityScore: {
        display: 'block',
        marginTop: 4,
        color: '#19384c',
        fontSize: 20,
    },
    qualityBadge: {
        alignSelf: 'start',
        border: '1px solid',
        borderRadius: 999,
        padding: '6px 10px',
        fontSize: 12,
        fontWeight: 900,
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
    },
    qualityReasons: {
        gridColumn: '1 / -1',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
    },
    reasonPill: {
        borderRadius: 999,
        padding: '5px 8px',
        background: '#fff',
        color: '#456477',
        fontSize: 12,
        fontWeight: 800,
        border: '1px solid rgba(24, 54, 72, 0.08)',
    },
    nextActionBox: {
        gridColumn: '1 / -1',
        display: 'grid',
        gap: 4,
        borderRadius: 16,
        padding: 10,
        background: '#fff',
        color: '#28465c',
        border: '1px solid rgba(24, 54, 72, 0.08)',
    },
    readinessPanel: {
        display: 'grid',
        gap: 12,
        borderRadius: 22,
        padding: 14,
        background: '#fffaf0',
        border: '1px solid rgba(125, 81, 34, 0.14)',
    },
    readinessHint: {
        margin: '4px 0 0',
        color: '#7a8790',
        fontSize: 12,
        fontWeight: 800,
    },
    readinessBadge: {
        alignSelf: 'start',
        border: '1px solid',
        borderRadius: 999,
        padding: '6px 10px',
        fontSize: 12,
        fontWeight: 900,
        whiteSpace: 'nowrap',
    },
    readinessGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 10,
    },
    readinessSubhead: {
        color: '#607685',
        fontSize: 12,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    readinessAction: {
        display: 'grid',
        gap: 4,
        borderRadius: 16,
        padding: 10,
        background: '#fff',
        color: '#28465c',
        border: '1px solid rgba(24, 54, 72, 0.08)',
    },
    block: {
        borderRadius: 20,
        padding: 14,
        background: '#f6fafc',
        border: '1px solid rgba(24, 54, 72, 0.08)',
    },
    blockHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 12,
    },
    documentHint: {
        color: '#7a8790',
        fontSize: 12,
        fontWeight: 800,
    },
    documentList: {
        display: 'grid',
        gap: 10,
        marginTop: 10,
    },
    documentItem: {
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: 10,
        alignItems: 'start',
        borderRadius: 16,
        padding: 10,
        background: '#fff',
        border: '1px solid rgba(24, 54, 72, 0.08)',
    },
    documentPriority: {
        border: '1px solid',
        borderRadius: 999,
        padding: '4px 8px',
        fontSize: 11,
        fontWeight: 900,
        whiteSpace: 'nowrap',
    },
    documentReason: {
        margin: '4px 0 0',
        color: '#607685',
        fontSize: 13,
        lineHeight: 1.4,
    },
    documentSource: {
        display: 'inline-block',
        marginTop: 6,
        color: '#7a8790',
        fontSize: 12,
        fontWeight: 800,
    },
    checklistHint: {
        margin: '4px 0 0',
        color: '#7a8790',
        fontSize: 12,
        fontWeight: 800,
    },
    progressPill: {
        borderRadius: 999,
        padding: '6px 10px',
        background: '#e8f3f7',
        color: '#234a66',
        fontSize: 12,
        fontWeight: 900,
        whiteSpace: 'nowrap',
    },
    decisionChecklist: {
        display: 'grid',
        gap: 8,
        marginTop: 10,
    },
    decisionItem: {
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: 10,
        alignItems: 'start',
        borderRadius: 16,
        padding: 10,
        background: '#fff',
        border: '1px solid rgba(24, 54, 72, 0.08)',
        cursor: 'pointer',
    },
    decisionText: {
        display: 'grid',
        gap: 4,
        minWidth: 0,
    },
    decisionTitleRow: {
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    requiredPill: {
        borderRadius: 999,
        padding: '3px 7px',
        background: '#ffe6dc',
        color: '#8d2d1d',
        fontSize: 11,
        fontStyle: 'normal',
        fontWeight: 900,
    },
    optionalPill: {
        borderRadius: 999,
        padding: '3px 7px',
        background: '#eef3f6',
        color: '#526b7d',
        fontSize: 11,
        fontStyle: 'normal',
        fontWeight: 900,
    },
    decisionReason: {
        color: '#607685',
        fontSize: 12,
        lineHeight: 1.4,
    },
    followUpHint: {
        margin: '4px 0 0',
        color: '#7a8790',
        fontSize: 12,
        fontWeight: 800,
    },
    followUpTextarea: {
        width: '100%',
        minHeight: 176,
        marginTop: 10,
        boxSizing: 'border-box',
        border: '1px solid rgba(24, 54, 72, 0.12)',
        borderRadius: 16,
        padding: 12,
        color: '#24465c',
        resize: 'vertical',
        font: 'inherit',
        lineHeight: 1.5,
        background: '#fff',
        whiteSpace: 'pre-wrap',
    },
    summaryActions: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
    },
    summaryDetails: {
        marginTop: 10,
    },
    summaryToggle: {
        cursor: 'pointer',
        color: '#234a66',
        fontSize: 13,
        fontWeight: 900,
    },
    summaryTextarea: {
        width: '100%',
        minHeight: 132,
        marginTop: 10,
        boxSizing: 'border-box',
        border: '1px solid rgba(24, 54, 72, 0.12)',
        borderRadius: 16,
        padding: 12,
        color: '#24465c',
        resize: 'vertical',
        font: 'inherit',
        fontSize: 13,
        lineHeight: 1.45,
        background: '#fff',
        whiteSpace: 'pre-wrap',
    },
    summaryMeta: {
        margin: '8px 0 0',
        color: '#7a8790',
        fontSize: 12,
        fontWeight: 800,
    },
    followUpMeta: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
        color: '#7a8790',
        fontSize: 12,
        fontWeight: 800,
    },
    statusControl: {
        display: 'inline-flex',
    },
    srOnly: {
        position: 'absolute',
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: 'hidden',
        clip: 'rect(0 0 0 0)',
        whiteSpace: 'nowrap',
        border: 0,
    },
    statusSelect: {
        border: '1px solid rgba(24, 54, 72, 0.18)',
        borderRadius: 999,
        background: '#fff',
        color: '#24465c',
        fontWeight: 800,
        padding: '7px 28px 7px 10px',
    },
    hint: {
        margin: '8px 0 0',
        color: '#657b8c',
        fontSize: 13,
    },
    errorText: {
        margin: '8px 0 0',
        color: '#8a311d',
        fontSize: 13,
        fontWeight: 800,
    },
    errorBanner: {
        borderRadius: 18,
        padding: 14,
        background: '#fff1ed',
        border: '1px solid #f1b7ad',
        color: '#8a311d',
    },
    contactBox: {
        marginTop: 12,
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
    softButton: {
        border: '1px solid rgba(24, 54, 72, 0.14)',
        borderRadius: 999,
        background: '#fff',
        color: '#234a66',
        cursor: 'pointer',
        fontWeight: 800,
        padding: '7px 11px',
    },
    primaryButton: {
        border: '1px solid rgba(24, 54, 72, 0.16)',
        borderRadius: 999,
        background: '#234a66',
        color: '#fff',
        cursor: 'pointer',
        fontWeight: 900,
        padding: '7px 12px',
    },
    linkButton: {
        border: '1px solid rgba(24, 54, 72, 0.14)',
        borderRadius: 999,
        background: '#e8f3f7',
        color: '#234a66',
        fontWeight: 800,
        padding: '7px 11px',
        textDecoration: 'none',
    },
    reportEmailBox: {
        display: 'grid',
        gap: 4,
        marginTop: 10,
        borderRadius: 16,
        padding: 10,
        background: '#eef8f3',
        border: '1px solid rgba(49, 128, 88, 0.16)',
        color: '#2d6248',
        fontSize: 13,
        overflowWrap: 'anywhere',
    },
    infoList: {
        margin: '8px 0 0',
        paddingLeft: 18,
        color: '#536c7d',
        lineHeight: 1.45,
    },
    infoItem: {
        marginBottom: 4,
    },
    timeline: {
        display: 'grid',
        gap: 8,
        margin: '10px 0 0',
        paddingLeft: 18,
        color: '#536c7d',
    },
    timelineItem: {
        display: 'grid',
        gap: 2,
    },
    timelineDate: {
        color: '#7a8a95',
        fontSize: 12,
    },
    timelineLabel: {
        color: '#24465c',
        fontWeight: 800,
    },
    timelineDetail: {
        color: '#607685',
        fontSize: 13,
        overflowWrap: 'anywhere',
    },
    noteTextarea: {
        width: '100%',
        minHeight: 92,
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
    noteActions: {
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
    },
    counter: {
        color: '#7a8790',
        fontSize: 12,
    },
    noteText: {
        margin: '8px 0 0',
        color: '#4d5d67',
        lineHeight: 1.45,
        whiteSpace: 'pre-wrap',
    },
    mutedText: {
        margin: '8px 0 0',
        color: '#7a8790',
        fontSize: 13,
    },
    nextStep: {
        background: '#fbf7ef',
        borderColor: 'rgba(150, 116, 65, 0.18)',
    },
    nextText: {
        margin: '8px 0 0',
        color: '#4d5d67',
        lineHeight: 1.5,
    },
    empty: {
        margin: 0,
        color: '#657b8c',
    },
};
