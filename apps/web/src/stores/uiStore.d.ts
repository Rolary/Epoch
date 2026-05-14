export type Page = "create-ecology" | "home" | "evolution" | "codex" | "codex-detail" | "fossils" | "logs" | "settings" | "error";
export type ModalType = "species-discovery" | "talent-awakening" | "offline-return" | "ecology-event" | "system-unlock" | null;
export type SheetType = "strategy" | "environment" | null;
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
}
export declare const useUIStore: import("zustand").UseBoundStore<import("zustand").StoreApi<UIStore>>;
//# sourceMappingURL=uiStore.d.ts.map