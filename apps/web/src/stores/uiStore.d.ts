export type Page = "create-ecology" | "home" | "evolution" | "codex" | "codex-detail" | "talents" | "fossils" | "logs" | "leaderboard" | "settings" | "error";
export type ModalType = "species-discovery" | "talent-awakening" | "offline-return" | "ecology-event" | "decision-confirm" | "system-unlock" | "hidden-trace" | null;
export type SheetType = "strategy" | "environment" | null;
export interface NarrativePrompt {
    id: string;
    type: NonNullable<ModalType>;
    data?: Record<string, unknown>;
    priority: number;
    seenHintId?: string;
}
export interface UIStore {
    page: Page;
    modalType: ModalType;
    sheetType: SheetType;
    modalData: Record<string, unknown>;
    sheetData: Record<string, unknown>;
    guide: boolean;
    guideStep: number;
    speciesDetailId: string | null;
    pendingTalentModal: boolean;
    strategyCooldownUntil: number;
    seenUnlockHints: string[];
    unlockGuideTarget: string | null;
    snoozedEcologyEventId: string | null;
    narrativeQueue: NarrativePrompt[];
    activeNarrative: NarrativePrompt | null;
    setPage: (page: Page) => void;
    showModal: (type: NonNullable<ModalType>, data?: Record<string, unknown>) => void;
    hideModal: () => void;
    showSheet: (type: NonNullable<SheetType>, data?: Record<string, unknown>) => void;
    hideSheet: () => void;
    setGuide: (show: boolean) => void;
    setGuideStep: (step: number) => void;
    nextGuideStep: () => void;
    setSpeciesDetailId: (id: string | null) => void;
    setPendingTalentModal: (pending: boolean) => void;
    setStrategyCooldown: (seconds: number) => void;
    markUnlockHintSeen: (id: string) => void;
    setUnlockGuideTarget: (id: string | null) => void;
    hydrateScopedUIState: () => void;
    snoozeEcologyEvent: (id: string | null) => void;
    enqueueNarrative: (prompt: NarrativePrompt) => void;
    activateNextNarrative: () => void;
    completeNarrative: (id: string) => void;
}
export declare const useUIStore: import("zustand").UseBoundStore<import("zustand").StoreApi<UIStore>>;
//# sourceMappingURL=uiStore.d.ts.map