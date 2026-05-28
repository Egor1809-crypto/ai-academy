import { MascotController } from './MascotController';
import { MascotRenderer } from './MascotRenderer';

export type MascotCostumeId =
    | 'gzhel'
    | 'analyst'
    | 'detective'
    | 'judge'
    | 'negotiator'
    | 'archivist'
    | 'festive'
    | 'new_year'
    | 'law_day'
    | 'partner';

export type CaseStatus = 'new' | 'analysis' | 'appeal' | 'court' | 'restructuring' | 'archive' | 'victory';
export type WardrobeTransitionType = 'standard' | 'holiday' | 'alert';

export interface WardrobeCostumeConfig {
    id: MascotCostumeId;
    label: string;
    textureUrl?: string;
    materialNameIncludes?: string;
    promptBlock: string;
    transition?: WardrobeTransitionType;
}

export interface WardrobeManagerOptions {
    renderer: MascotRenderer;
    controller: MascotController;
    costumes?: Partial<Record<MascotCostumeId, Partial<WardrobeCostumeConfig>>>;
    now?: () => Date;
}

const TRANSITION_DURATION_MS: Record<WardrobeTransitionType, number> = {
    standard: 400,
    holiday: 1200,
    alert: 300,
};

const DEFAULT_COSTUMES: Record<MascotCostumeId, WardrobeCostumeConfig> = {
    gzhel: {
        id: 'gzhel',
        label: 'Гжель',
        promptBlock: 'Костюм: Гжель. Визуальный стиль спокойный, традиционный, с кобальтово-белой палитрой.',
        transition: 'standard',
    },
    analyst: {
        id: 'analyst',
        label: 'Аналитик',
        promptBlock: 'Костюм: Аналитик. Манера ответа структурная, опирается на факты и этапы анализа.',
        transition: 'standard',
    },
    detective: {
        id: 'detective',
        label: 'Детектив',
        promptBlock: 'Костюм: Детектив. Фокус на поиске несостыковок, проверке следов и выявлении рисков.',
        transition: 'alert',
    },
    judge: {
        id: 'judge',
        label: 'Судья',
        promptBlock: 'Костюм: Судья. Тон ровный и официальный, без обещания исхода дела.',
        transition: 'alert',
    },
    negotiator: {
        id: 'negotiator',
        label: 'Переговорщик',
        promptBlock: 'Костюм: Переговорщик. Коммуникация мягкая, ориентирована на компромисс и реструктуризацию.',
        transition: 'standard',
    },
    archivist: {
        id: 'archivist',
        label: 'Архивариус',
        promptBlock: 'Костюм: Архивариус. Приоритет на порядок документов, хронологию и сохранность фактов.',
        transition: 'standard',
    },
    festive: {
        id: 'festive',
        label: 'Праздничный',
        promptBlock: 'Костюм: Праздничный. Допустим дружелюбный торжественный тон без потери деловой ясности.',
        transition: 'holiday',
    },
    new_year: {
        id: 'new_year',
        label: 'Новогодний',
        promptBlock: 'Костюм: Новогодний. Допустим сезонный акцент, но без инфантильности и без снижения формальности советов.',
        transition: 'holiday',
    },
    law_day: {
        id: 'law_day',
        label: 'День юриста',
        promptBlock: 'Костюм: День юриста. Стиль торжественный, уважительный к профессии и юридической этике.',
        transition: 'holiday',
    },
    partner: {
        id: 'partner',
        label: 'Партнёрский',
        promptBlock: 'Костюм: Партнёрский. Используй white-label визуальную тему партнёра без изменения базовой идентичности маскота.',
        transition: 'standard',
        materialNameIncludes: 'partner',
    },
};

const STATUS_TO_COSTUME: Record<CaseStatus, MascotCostumeId> = {
    new: 'analyst',
    analysis: 'detective',
    appeal: 'judge',
    court: 'judge',
    restructuring: 'negotiator',
    archive: 'archivist',
    victory: 'festive',
};

export class WardrobeManager {
    private readonly renderer: MascotRenderer;
    private readonly controller: MascotController;
    private readonly now: () => Date;
    private readonly costumes: Record<MascotCostumeId, WardrobeCostumeConfig>;

    private activeCostumeId: MascotCostumeId = 'gzhel';
    private activePartnerSkinUrl: string | null = null;

    constructor(options: WardrobeManagerOptions) {
        this.renderer = options.renderer;
        this.controller = options.controller;
        this.now = options.now ?? (() => new Date());
        this.costumes = this.buildCostumeCatalog(options.costumes);
        this.controller.setCostumeBlock(this.costumes[this.activeCostumeId].promptBlock);
    }

    // Applies a costume by id, updates prompt injection, and performs a timed wardrobe transition.
    async setCostume(costumeId: MascotCostumeId): Promise<void> {
        const costume = this.costumes[costumeId];
        if (!costume) {
            throw new Error(`Неизвестный costumeId: ${costumeId}`);
        }

        const durationMs = TRANSITION_DURATION_MS[costume.transition ?? 'standard'];
        this.renderer.setAnimationState('costume_change');

        if (costume.textureUrl) {
            const applied = await this.renderer.setTexture(costume.textureUrl, {
                materialNameIncludes: costume.materialNameIncludes,
            });
            if (!applied) {
                throw new Error(`Не удалось применить текстуру костюма ${costume.label}. Проверь названия материалов и textureUrl.`);
            }
        }

        this.activeCostumeId = costumeId;
        this.controller.setCostumeBlock(costume.promptBlock);
        await this.delay(Math.min(durationMs, 500));
    }

    // White-label partner skin is applied as a runtime texture swap without reloading GLB.
    async setPartnerSkin(textureUrl: string): Promise<void> {
        const applied = await this.renderer.setTexture(textureUrl, {
            materialNameIncludes: this.costumes.partner.materialNameIncludes,
        });
        if (!applied) {
            throw new Error('Не удалось применить партнёрский skin. Проверь materialNameIncludes и наличие подходящих mesh materials.');
        }

        this.activePartnerSkinUrl = textureUrl;
        this.activeCostumeId = 'partner';
        this.controller.setCostumeBlock(this.costumes.partner.promptBlock);
        await this.delay(TRANSITION_DURATION_MS.standard);
    }

    // Selects seasonal costumes for known calendar dates: 31 Dec, 3 Nov, 8 Mar.
    async checkCalendarTriggers(): Promise<MascotCostumeId | null> {
        const date = this.now();
        const day = date.getDate();
        const month = date.getMonth() + 1;

        if (month === 12 && day === 31) {
            await this.setCostume('new_year');
            return 'new_year';
        }
        if (month === 11 && day === 3) {
            await this.setCostume('law_day');
            return 'law_day';
        }
        if (month === 3 && day === 8) {
            await this.setCostume('festive');
            return 'festive';
        }

        return null;
    }

    async applyStatusTrigger(status: CaseStatus): Promise<MascotCostumeId> {
        const costumeId = STATUS_TO_COSTUME[status];
        await this.setCostume(costumeId);
        return costumeId;
    }

    getActiveCostumeId(): MascotCostumeId {
        return this.activeCostumeId;
    }

    getActivePartnerSkinUrl(): string | null {
        return this.activePartnerSkinUrl;
    }

    private buildCostumeCatalog(
        overrides?: Partial<Record<MascotCostumeId, Partial<WardrobeCostumeConfig>>>,
    ): Record<MascotCostumeId, WardrobeCostumeConfig> {
        const result = {} as Record<MascotCostumeId, WardrobeCostumeConfig>;
        for (const costumeId of Object.keys(DEFAULT_COSTUMES) as MascotCostumeId[]) {
            result[costumeId] = {
                ...DEFAULT_COSTUMES[costumeId],
                ...overrides?.[costumeId],
            };
        }
        return result;
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => window.setTimeout(resolve, ms));
    }
}