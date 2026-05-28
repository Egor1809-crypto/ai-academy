import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type PropsWithChildren,
} from 'react';
import {
    QueryClient,
    QueryClientProvider,
    useMutation,
    useQuery,
    useQueryClient,
    type QueryKey,
    type UseMutationResult,
    type UseQueryResult,
} from '@tanstack/react-query';

export type UploadStage = 'upload' | 'conversion' | 'validation' | 'optimization' | 'ready';

export interface PresignedUploadResponse {
    url: string;
    method: 'PUT';
    expires_at: string;
    object_key: string;
    required_headers: Record<string, string>;
}

export interface MascotPreview {
    asset_id: string | null;
    object_key: string | null;
    preview_url: string | null;
    content_type: string | null;
    prompt_version: number | null;
    prompt_token_count: number | null;
    prompt_kms_key_id: string | null;
}

export interface DevAuthSession {
    token: string;
    partner_id: string;
    partner_name: string;
    expires_at: string;
}

export interface MascotRuntime {
    asset_id: string | null;
    mode: 'placeholder3d' | 'uploaded-model' | 'sprite2d';
    status: 'demo' | 'ready' | 'processing';
    content_type: string | null;
    source_url: string | null;
    preview_url: string | null;
    sprite_url: string | null;
    skeleton_url: string | null;
    lods: Record<string, string>;
    available_animations: string[];
    active_costume: string | null;
}

export interface MascotTalkAction {
    kind: string;
    label: string;
    target: string;
    description: string | null;
}

export interface MascotVideoAction {
    key: 'idle' | 'talk' | 'whatdo' | 'greeting' | 'warning' | 'celebration';
    label: string;
    source: string;
    loop: boolean;
}

export interface MascotConversationMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface MascotTalkRequest {
    message: string;
    current_route: string;
    history: MascotConversationMessage[];
    case_context?: Record<string, unknown>;
}

export type MascotTalkPhase = 'idle' | 'book-opening' | 'book-searching' | 'answer-shown' | 'book-closing';

export interface RPGWeightsPayload {
    weight_xp: number;
    weight_qi: number;
    weight_sp: number;
    weight_rp: number;
}

export interface RPGWeightsResponse extends RPGWeightsPayload {
    partner_id: string;
    version: number;
}

export interface RPGAnalyticsResponse {
    partner_id: string;
    progress: {
        xp: number;
        qi: number;
        sp: number;
        rp: number;
        current_level: string;
        weighted_score: number;
        version: number;
    };
    weights: RPGWeightsResponse;
    event_counts: Record<string, number>;
    reputation_penalties_total: number;
    complaints_count: number;
}

export interface HandoffDiagnosticSummary {
    risk_level?: string;
    risk_reasons?: string[];
    known_count?: number;
    missing_fields?: string[];
    debt_amount?: string;
    debt_types?: string[];
    bailiffs?: string;
    income?: string;
    property?: string[];
    collectors?: string;
    route_hint?: string;
}

export interface HandoffLeadContact {
    name?: string;
    phone?: string;
    email?: string;
}

export type HandoffLeadStatus = 'new' | 'contacted' | 'qualified' | 'closed';
export type HandoffLeadStatusFilter = HandoffLeadStatus | 'all';
export type HandoffLeadRiskFilter = 'all' | 'high' | 'medium' | 'low';
export type HandoffLeadQualityLabel = 'low' | 'medium' | 'high' | 'urgent';

export interface HandoffTicketFilters {
    status?: HandoffLeadStatusFilter;
    riskLevel?: HandoffLeadRiskFilter;
    query?: string;
    limit?: number;
}

export interface HandoffTicketLeadItem {
    ticket_id: string;
    partner_id: string | null;
    status: HandoffLeadStatus | string;
    priority: string;
    risk_level: string;
    category: string;
    channel: string;
    requested_channel: string;
    target_channel: string;
    lead_reason: string;
    operator_note: string;
    contact: HandoffLeadContact;
    diagnostic_summary: HandoffDiagnosticSummary;
    report_email_sent: boolean;
    report_email_sent_at: string | null;
    report_email_status: string;
    report_email_masked: string;
    quality_score: number;
    quality_label: HandoffLeadQualityLabel | string;
    quality_reasons: string[];
    next_best_action: string;
    next_best_action_reason: string;
    readiness_state: string;
    readiness_label: string;
    readiness_reasons: string[];
    blocking_items: string[];
    recommended_operator_action: string;
    created_at: string;
    updated_at: string;
}

export interface HandoffTicketTimelineItem {
    kind: string;
    label: string;
    at: string | null;
    detail: string;
}

export interface HandoffTicketDocumentChecklistItem {
    key: string;
    title: string;
    reason: string;
    priority: 'required' | 'recommended' | 'optional' | string;
    source: string;
}

export interface HandoffTicketFollowUpMessage {
    text: string;
    sections: string[];
    tone: string;
    warnings: string[];
}

export interface HandoffTicketInternalCaseSummary {
    text: string;
    sections: string[];
    generated_at: string | null;
}

export interface HandoffTicketDecisionChecklistItem {
    key: string;
    title: string;
    reason: string;
    source: string;
    required: boolean;
    done: boolean;
}

export interface HandoffTicketLeadDetailItem extends HandoffTicketLeadItem {
    timeline: HandoffTicketTimelineItem[];
    document_checklist: HandoffTicketDocumentChecklistItem[];
    decision_checklist: HandoffTicketDecisionChecklistItem[];
    follow_up_message: HandoffTicketFollowUpMessage;
    internal_case_summary: HandoffTicketInternalCaseSummary;
}

export interface PromptSavePayload {
    prompt_text: string;
    kms_key_id?: string;
}

export interface PartnerDashboardApi {
    loginDevSession(): Promise<DevAuthSession>;
    uploadMascot(file: File, prompt?: PromptSavePayload): Promise<PresignedUploadResponse>;
    getMascotPreview(): Promise<MascotPreview>;
    getMascotRuntime(): Promise<MascotRuntime>;
    openMascotTalkStream(payload: MascotTalkRequest, options?: { signal?: AbortSignal }): Promise<Response>;
    savePrompt(payload: PromptSavePayload): Promise<MascotPreview>;
    updateRpgWeights(payload: RPGWeightsPayload): Promise<RPGWeightsResponse>;
    getRpgAnalytics(): Promise<RPGAnalyticsResponse>;
    getHandoffTickets(filters?: HandoffTicketFilters): Promise<HandoffTicketLeadItem[]>;
    getHandoffTicket(ticketId: string): Promise<HandoffTicketLeadDetailItem>;
    updateHandoffTicketStatus(ticketId: string, status: HandoffLeadStatus): Promise<HandoffTicketLeadDetailItem>;
    updateHandoffTicketNote(ticketId: string, note: string): Promise<HandoffTicketLeadDetailItem>;
    updateHandoffTicketChecklist(ticketId: string, itemKey: string, done: boolean): Promise<HandoffTicketLeadDetailItem>;
}

export interface PartnerDashboardState {
    activeStage: UploadStage;
    ariaMessage: string;
    authSession: DevAuthSession | null;
    mascotTalkPhase: MascotTalkPhase;
    setUploadStage: (stage: UploadStage, ariaMessage?: string) => void;
    setMascotTalkPhase: (phase: MascotTalkPhase) => void;
    announce: (message: string) => void;
    api: PartnerDashboardApi;
}

const DEFAULT_HEADERS = {
    'Content-Type': 'application/json',
};
const DEV_AUTH_STORAGE_KEY = 'manaya.dev-auth.session';

const PartnerDashboardContext = createContext<PartnerDashboardState | null>(null);

async function parseApiError(response: Response): Promise<Error> {
    let detail = 'Произошла ошибка. Проверьте введённые данные и повторите действие.';
    try {
        const payload = (await response.json()) as { detail?: string };
        if (payload.detail) {
            detail = payload.detail;
        }
    } catch {
        detail = response.statusText || detail;
    }
    return new Error(detail);
}

async function jsonFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
    const response = await fetch(input, init);
    if (!response.ok) {
        throw await parseApiError(response);
    }
    return (await response.json()) as T;
}

function readStoredDevSession(): DevAuthSession | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const raw = window.localStorage.getItem(DEV_AUTH_STORAGE_KEY);
    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw) as DevAuthSession;
    } catch {
        window.localStorage.removeItem(DEV_AUTH_STORAGE_KEY);
        return null;
    }
}

function writeStoredDevSession(session: DevAuthSession | null): void {
    if (typeof window === 'undefined') {
        return;
    }

    if (!session) {
        window.localStorage.removeItem(DEV_AUTH_STORAGE_KEY);
        return;
    }

    window.localStorage.setItem(DEV_AUTH_STORAGE_KEY, JSON.stringify(session));
}

function createDefaultApi(getAuthSession: () => DevAuthSession | null): PartnerDashboardApi {
    const withAuthHeaders = (headers?: HeadersInit): HeadersInit => {
        const authSession = getAuthSession();
        const nextHeaders = new Headers(headers ?? DEFAULT_HEADERS);
        if (authSession?.token) {
            nextHeaders.set('Authorization', `Bearer ${authSession.token}`);
        }
        return nextHeaders;
    };

    return {
        loginDevSession() {
            return jsonFetch<DevAuthSession>('/api/v1/partner/dev-auth/login', {
                method: 'POST',
                headers: DEFAULT_HEADERS,
                body: JSON.stringify({}),
            });
        },
        async uploadMascot(file, prompt) {
            const presigned = await jsonFetch<PresignedUploadResponse>('/api/v1/partner/mascot/upload', {
                method: 'POST',
                headers: withAuthHeaders(DEFAULT_HEADERS),
                body: JSON.stringify({
                    file_name: file.name,
                    content_type: file.type || 'application/octet-stream',
                    size_bytes: file.size,
                    prompt_text: prompt?.prompt_text,
                    kms_key_id: prompt?.kms_key_id,
                }),
            });

            const uploadResponse = await fetch(presigned.url, {
                method: presigned.method,
                headers: presigned.required_headers,
                body: file,
            });
            if (!uploadResponse.ok) {
                throw new Error('Файл не загрузился в объектное хранилище. Проверьте сеть, размер файла и повторите попытку.');
            }
            return presigned;
        },
        getMascotPreview() {
            return jsonFetch<MascotPreview>('/api/v1/partner/mascot/preview', { headers: withAuthHeaders() });
        },
        getMascotRuntime() {
            return jsonFetch<MascotRuntime>('/api/v1/partner/mascot/runtime', { headers: withAuthHeaders() });
        },
        async openMascotTalkStream(payload, options) {
            const response = await fetch('/api/v1/partner/mascot/talk', {
                method: 'POST',
                headers: withAuthHeaders({
                    ...DEFAULT_HEADERS,
                    Accept: 'text/event-stream',
                }),
                body: JSON.stringify(payload),
                signal: options?.signal,
            });
            if (!response.ok) {
                throw await parseApiError(response);
            }
            return response;
        },
        savePrompt(payload) {
            return jsonFetch<MascotPreview>('/api/v1/partner/prompt', {
                method: 'PATCH',
                headers: withAuthHeaders(DEFAULT_HEADERS),
                body: JSON.stringify(payload),
            });
        },
        updateRpgWeights(payload) {
            return jsonFetch<RPGWeightsResponse>('/api/v1/partner/rpg/weights', {
                method: 'PATCH',
                headers: withAuthHeaders(DEFAULT_HEADERS),
                body: JSON.stringify(payload),
            });
        },
        getRpgAnalytics() {
            return jsonFetch<RPGAnalyticsResponse>('/api/v1/partner/rpg/analytics', { headers: withAuthHeaders() });
        },
        getHandoffTickets(filters) {
            const params = new URLSearchParams();
            if (filters?.status && filters.status !== 'all') {
                params.set('status', filters.status);
            }
            if (filters?.riskLevel && filters.riskLevel !== 'all') {
                params.set('risk_level', filters.riskLevel);
            }
            if (filters?.query) {
                params.set('q', filters.query);
            }
            if (filters?.limit) {
                params.set('limit', String(filters.limit));
            }
            const suffix = params.toString() ? `?${params.toString()}` : '';
            return jsonFetch<HandoffTicketLeadItem[]>(`/api/handoff/tickets${suffix}`, { headers: withAuthHeaders() });
        },
        getHandoffTicket(ticketId) {
            return jsonFetch<HandoffTicketLeadDetailItem>(`/api/handoff/tickets/${ticketId}`, { headers: withAuthHeaders() });
        },
        updateHandoffTicketStatus(ticketId, status) {
            return jsonFetch<HandoffTicketLeadDetailItem>(`/api/handoff/tickets/${ticketId}/status`, {
                method: 'PATCH',
                headers: withAuthHeaders(DEFAULT_HEADERS),
                body: JSON.stringify({ status }),
            });
        },
        updateHandoffTicketNote(ticketId, note) {
            return jsonFetch<HandoffTicketLeadDetailItem>(`/api/handoff/tickets/${ticketId}/note`, {
                method: 'PATCH',
                headers: withAuthHeaders(DEFAULT_HEADERS),
                body: JSON.stringify({ note }),
            });
        },
        updateHandoffTicketChecklist(ticketId, itemKey, done) {
            return jsonFetch<HandoffTicketLeadDetailItem>(`/api/handoff/tickets/${ticketId}/checklist`, {
                method: 'PATCH',
                headers: withAuthHeaders(DEFAULT_HEADERS),
                body: JSON.stringify({ item_key: itemKey, done }),
            });
        },
    };
}

export interface PartnerDashboardProviderProps extends PropsWithChildren {
    api?: PartnerDashboardApi;
    queryClient?: QueryClient;
}

export function PartnerDashboardProvider({ children, api, queryClient }: PartnerDashboardProviderProps) {
    const [activeStage, setActiveStageState] = useState<UploadStage>('upload');
    const [ariaMessage, setAriaMessage] = useState('Панель партнёра готова к работе.');
    const [authSession, setAuthSession] = useState<DevAuthSession | null>(() => readStoredDevSession());
    const [mascotTalkPhase, setMascotTalkPhaseState] = useState<MascotTalkPhase>('idle');
    const resolvedQueryClient = useMemo(() => queryClient ?? new QueryClient(), [queryClient]);
    const resolvedApi = useMemo(() => api ?? createDefaultApi(() => authSession), [api, authSession]);

    useEffect(() => {
        if (api) {
            return;
        }

        let cancelled = false;
        const bootstrap = async () => {
            if (authSession) {
                return;
            }

            try {
                const session = await resolvedApi.loginDevSession();
                if (!cancelled) {
                    setAuthSession(session);
                    writeStoredDevSession(session);
                }
            } catch (error) {
                if (!cancelled) {
                    setAriaMessage(error instanceof Error ? error.message : 'Не удалось выполнить dev-auth.');
                }
            }
        };

        void bootstrap();
        return () => {
            cancelled = true;
        };
    }, [api, authSession, resolvedApi]);

    const setUploadStage = useCallback((stage: UploadStage, message?: string) => {
        setActiveStageState(stage);
        if (message) {
            setAriaMessage(message);
        }
    }, []);

    const announce = useCallback((message: string) => {
        setAriaMessage(message);
    }, []);

    const setMascotTalkPhase = useCallback((phase: MascotTalkPhase) => {
        setMascotTalkPhaseState(phase);
    }, []);

    const value = useMemo<PartnerDashboardState>(() => ({
        activeStage,
        ariaMessage,
        authSession,
        mascotTalkPhase,
        setUploadStage,
        setMascotTalkPhase,
        announce,
        api: resolvedApi,
    }), [activeStage, ariaMessage, authSession, mascotTalkPhase, announce, resolvedApi, setUploadStage, setMascotTalkPhase]);

    return (
        <QueryClientProvider client={resolvedQueryClient}>
            <PartnerDashboardContext.Provider value={value}>
                {children}
                <div
                    aria-atomic="true"
                    aria-live="polite"
                    style={{
                        position: 'absolute',
                        width: 1,
                        height: 1,
                        padding: 0,
                        margin: -1,
                        overflow: 'hidden',
                        clip: 'rect(0 0 0 0)',
                        whiteSpace: 'nowrap',
                        border: 0,
                    }}
                >
                    {ariaMessage}
                </div>
            </PartnerDashboardContext.Provider>
        </QueryClientProvider>
    );
}

export function usePartnerDashboard(): PartnerDashboardState {
    const context = useContext(PartnerDashboardContext);
    if (!context) {
        throw new Error('PartnerDashboardContext не найден. Оберните компоненты в PartnerDashboardProvider.');
    }
    return context;
}

export function useMascotPreviewQuery(): UseQueryResult<MascotPreview, Error> {
    const { api, authSession } = usePartnerDashboard();
    return useQuery({
        queryKey: ['partner-mascot-preview'],
        queryFn: api.getMascotPreview,
        enabled: Boolean(authSession?.token),
    });
}

export function useMascotRuntimeQuery(): UseQueryResult<MascotRuntime, Error> {
    const { api, authSession } = usePartnerDashboard();
    return useQuery({
        queryKey: ['partner-mascot-runtime'],
        queryFn: api.getMascotRuntime,
        enabled: Boolean(authSession?.token),
    });
}

export function useRpgAnalyticsQuery(): UseQueryResult<RPGAnalyticsResponse, Error> {
    const { api, authSession } = usePartnerDashboard();
    return useQuery({
        queryKey: ['partner-rpg-analytics'],
        queryFn: api.getRpgAnalytics,
        enabled: Boolean(authSession?.token),
    });
}

export function useHandoffTicketsQuery(
    filters: HandoffTicketFilters = {},
    options: { enabled?: boolean } = {},
): UseQueryResult<HandoffTicketLeadItem[], Error> {
    const { api, authSession } = usePartnerDashboard();
    return useQuery({
        queryKey: ['partner-handoff-tickets', filters],
        queryFn: () => api.getHandoffTickets(filters),
        enabled: Boolean(authSession?.token) && (options.enabled ?? true),
    });
}

export function useHandoffTicketQuery(ticketId: string | null): UseQueryResult<HandoffTicketLeadDetailItem, Error> {
    const { api, authSession } = usePartnerDashboard();
    return useQuery({
        queryKey: ['partner-handoff-ticket', ticketId],
        queryFn: () => api.getHandoffTicket(ticketId || ''),
        enabled: Boolean(authSession?.token && ticketId),
    });
}

export function useHandoffTicketStatusMutation(): UseMutationResult<
    HandoffTicketLeadDetailItem,
    Error,
    { ticketId: string; status: HandoffLeadStatus },
    { previousQueries?: Array<[QueryKey, HandoffTicketLeadItem[] | undefined]>; previousDetail?: HandoffTicketLeadDetailItem }
> {
    const { api } = usePartnerDashboard();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ ticketId, status }) => api.updateHandoffTicketStatus(ticketId, status),
        onMutate: async ({ ticketId, status }) => {
            await queryClient.cancelQueries({ queryKey: ['partner-handoff-tickets'] });
            await queryClient.cancelQueries({ queryKey: ['partner-handoff-ticket', ticketId] });
            const previousQueries = queryClient.getQueriesData<HandoffTicketLeadItem[]>({ queryKey: ['partner-handoff-tickets'] });
            const previousDetail = queryClient.getQueryData<HandoffTicketLeadDetailItem>(['partner-handoff-ticket', ticketId]);
            queryClient.setQueriesData<HandoffTicketLeadItem[]>({ queryKey: ['partner-handoff-tickets'] }, (tickets) => (
                tickets?.map((ticket) => (
                    ticket.ticket_id === ticketId ? { ...ticket, status } : ticket
                )) ?? tickets
            ));
            queryClient.setQueryData<HandoffTicketLeadDetailItem>(['partner-handoff-ticket', ticketId], (ticket) => (
                ticket ? { ...ticket, status } : ticket
            ));
            return { previousQueries, previousDetail };
        },
        onError: (_error, variables, context) => {
            if (context?.previousQueries) {
                context.previousQueries.forEach(([queryKey, tickets]) => {
                    queryClient.setQueryData(queryKey, tickets);
                });
            }
            if (context?.previousDetail) {
                queryClient.setQueryData(['partner-handoff-ticket', variables.ticketId], context.previousDetail);
            }
        },
        onSuccess: (updatedTicket) => {
            queryClient.setQueriesData<HandoffTicketLeadItem[]>({ queryKey: ['partner-handoff-tickets'] }, (tickets) => (
                tickets?.map((ticket) => (
                    ticket.ticket_id === updatedTicket.ticket_id ? updatedTicket : ticket
                )) ?? [updatedTicket]
            ));
            queryClient.setQueryData(['partner-handoff-ticket', updatedTicket.ticket_id], updatedTicket);
        },
        onSettled: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['partner-handoff-tickets'] }),
                queryClient.invalidateQueries({ queryKey: ['partner-handoff-ticket'] }),
            ]);
        },
    });
}

export function useHandoffTicketNoteMutation(): UseMutationResult<
    HandoffTicketLeadDetailItem,
    Error,
    { ticketId: string; note: string },
    { previousQueries?: Array<[QueryKey, HandoffTicketLeadItem[] | undefined]>; previousDetail?: HandoffTicketLeadDetailItem }
> {
    const { api } = usePartnerDashboard();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ ticketId, note }) => api.updateHandoffTicketNote(ticketId, note),
        onMutate: async ({ ticketId, note }) => {
            await queryClient.cancelQueries({ queryKey: ['partner-handoff-tickets'] });
            await queryClient.cancelQueries({ queryKey: ['partner-handoff-ticket', ticketId] });
            const previousQueries = queryClient.getQueriesData<HandoffTicketLeadItem[]>({ queryKey: ['partner-handoff-tickets'] });
            const previousDetail = queryClient.getQueryData<HandoffTicketLeadDetailItem>(['partner-handoff-ticket', ticketId]);
            queryClient.setQueriesData<HandoffTicketLeadItem[]>({ queryKey: ['partner-handoff-tickets'] }, (tickets) => (
                tickets?.map((ticket) => (
                    ticket.ticket_id === ticketId ? { ...ticket, operator_note: note.trim() } : ticket
                )) ?? tickets
            ));
            queryClient.setQueryData<HandoffTicketLeadDetailItem>(['partner-handoff-ticket', ticketId], (ticket) => (
                ticket ? { ...ticket, operator_note: note.trim() } : ticket
            ));
            return { previousQueries, previousDetail };
        },
        onError: (_error, variables, context) => {
            if (context?.previousQueries) {
                context.previousQueries.forEach(([queryKey, tickets]) => {
                    queryClient.setQueryData(queryKey, tickets);
                });
            }
            if (context?.previousDetail) {
                queryClient.setQueryData(['partner-handoff-ticket', variables.ticketId], context.previousDetail);
            }
        },
        onSuccess: (updatedTicket) => {
            queryClient.setQueriesData<HandoffTicketLeadItem[]>({ queryKey: ['partner-handoff-tickets'] }, (tickets) => (
                tickets?.map((ticket) => (
                    ticket.ticket_id === updatedTicket.ticket_id ? updatedTicket : ticket
                )) ?? [updatedTicket]
            ));
            queryClient.setQueryData(['partner-handoff-ticket', updatedTicket.ticket_id], updatedTicket);
        },
        onSettled: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['partner-handoff-tickets'] }),
                queryClient.invalidateQueries({ queryKey: ['partner-handoff-ticket'] }),
            ]);
        },
    });
}

export function useHandoffTicketChecklistMutation(): UseMutationResult<
    HandoffTicketLeadDetailItem,
    Error,
    { ticketId: string; itemKey: string; done: boolean },
    { previousDetail?: HandoffTicketLeadDetailItem }
> {
    const { api } = usePartnerDashboard();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ ticketId, itemKey, done }) => api.updateHandoffTicketChecklist(ticketId, itemKey, done),
        onMutate: async ({ ticketId, itemKey, done }) => {
            await queryClient.cancelQueries({ queryKey: ['partner-handoff-ticket', ticketId] });
            const previousDetail = queryClient.getQueryData<HandoffTicketLeadDetailItem>(['partner-handoff-ticket', ticketId]);
            queryClient.setQueryData<HandoffTicketLeadDetailItem>(['partner-handoff-ticket', ticketId], (ticket) => (
                ticket
                    ? {
                        ...ticket,
                        decision_checklist: (ticket.decision_checklist || []).map((item) => (
                            item.key === itemKey ? { ...item, done } : item
                        )),
                    }
                    : ticket
            ));
            return { previousDetail };
        },
        onError: (_error, variables, context) => {
            if (context?.previousDetail) {
                queryClient.setQueryData(['partner-handoff-ticket', variables.ticketId], context.previousDetail);
            }
        },
        onSuccess: (updatedTicket) => {
            queryClient.setQueryData(['partner-handoff-ticket', updatedTicket.ticket_id], updatedTicket);
            queryClient.setQueriesData<HandoffTicketLeadItem[]>({ queryKey: ['partner-handoff-tickets'] }, (tickets) => (
                tickets?.map((ticket) => (
                    ticket.ticket_id === updatedTicket.ticket_id ? updatedTicket : ticket
                )) ?? [updatedTicket]
            ));
        },
        onSettled: async (_data, _error, variables) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['partner-handoff-tickets'] }),
                queryClient.invalidateQueries({ queryKey: ['partner-handoff-ticket', variables.ticketId] }),
            ]);
        },
    });
}

export function useMascotUploadMutation(): UseMutationResult<PresignedUploadResponse, Error, { file: File; prompt?: PromptSavePayload }> {
    const { api } = usePartnerDashboard();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ file, prompt }) => api.uploadMascot(file, prompt),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['partner-mascot-preview'] }),
                queryClient.invalidateQueries({ queryKey: ['partner-mascot-runtime'] }),
            ]);
        },
    });
}

export function usePromptSaveMutation(): UseMutationResult<MascotPreview, Error, PromptSavePayload> {
    const { api } = usePartnerDashboard();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.savePrompt,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['partner-mascot-preview'] });
        },
    });
}

export function useRpgWeightsMutation(): UseMutationResult<RPGWeightsResponse, Error, RPGWeightsPayload> {
    const { api } = usePartnerDashboard();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: api.updateRpgWeights,
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['partner-rpg-analytics'] }),
                queryClient.invalidateQueries({ queryKey: ['partner-mascot-preview'] }),
            ]);
        },
    });
}
