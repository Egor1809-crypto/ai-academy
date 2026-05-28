import {
    createContext,
    useCallback,
    useContext,
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

export interface PromptSavePayload {
    prompt_text: string;
    kms_key_id?: string;
}

export interface PartnerDashboardApi {
    uploadMascot(file: File, prompt?: PromptSavePayload): Promise<PresignedUploadResponse>;
    getMascotPreview(): Promise<MascotPreview>;
    savePrompt(payload: PromptSavePayload): Promise<MascotPreview>;
    updateRpgWeights(payload: RPGWeightsPayload): Promise<RPGWeightsResponse>;
    getRpgAnalytics(): Promise<RPGAnalyticsResponse>;
}

export interface PartnerDashboardState {
    activeStage: UploadStage;
    ariaMessage: string;
    setUploadStage: (stage: UploadStage, ariaMessage?: string) => void;
    announce: (message: string) => void;
    api: PartnerDashboardApi;
}

const DEFAULT_HEADERS = {
    'Content-Type': 'application/json',
};

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

function createDefaultApi(): PartnerDashboardApi {
    return {
        async uploadMascot(file, prompt) {
            const presigned = await jsonFetch<PresignedUploadResponse>('/api/v1/partner/mascot/upload', {
                method: 'POST',
                headers: DEFAULT_HEADERS,
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
            return jsonFetch<MascotPreview>('/api/v1/partner/mascot/preview');
        },
        savePrompt(payload) {
            return jsonFetch<MascotPreview>('/api/v1/partner/prompt', {
                method: 'PATCH',
                headers: DEFAULT_HEADERS,
                body: JSON.stringify(payload),
            });
        },
        updateRpgWeights(payload) {
            return jsonFetch<RPGWeightsResponse>('/api/v1/partner/rpg/weights', {
                method: 'PATCH',
                headers: DEFAULT_HEADERS,
                body: JSON.stringify(payload),
            });
        },
        getRpgAnalytics() {
            return jsonFetch<RPGAnalyticsResponse>('/api/v1/partner/rpg/analytics');
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
    const resolvedQueryClient = useMemo(() => queryClient ?? new QueryClient(), [queryClient]);
    const resolvedApi = useMemo(() => api ?? createDefaultApi(), [api]);

    const setUploadStage = useCallback((stage: UploadStage, message?: string) => {
        setActiveStageState(stage);
        if (message) {
            setAriaMessage(message);
        }
    }, []);

    const announce = useCallback((message: string) => {
        setAriaMessage(message);
    }, []);

    const value = useMemo<PartnerDashboardState>(() => ({
        activeStage,
        ariaMessage,
        setUploadStage,
        announce,
        api: resolvedApi,
    }), [activeStage, ariaMessage, announce, resolvedApi, setUploadStage]);

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
    const { api } = usePartnerDashboard();
    return useQuery({
        queryKey: ['partner-mascot-preview'],
        queryFn: api.getMascotPreview,
    });
}

export function useRpgAnalyticsQuery(): UseQueryResult<RPGAnalyticsResponse, Error> {
    const { api } = usePartnerDashboard();
    return useQuery({
        queryKey: ['partner-rpg-analytics'],
        queryFn: api.getRpgAnalytics,
    });
}

export function useMascotUploadMutation(): UseMutationResult<PresignedUploadResponse, Error, { file: File; prompt?: PromptSavePayload }> {
    const { api } = usePartnerDashboard();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ file, prompt }) => api.uploadMascot(file, prompt),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['partner-mascot-preview'] });
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