import { create } from "zustand";

export type Page =
  | "create-ecology"
  | "home"
  | "evolution"
  | "codex"
  | "codex-detail"
  | "fossils"
  | "logs"
  | "settings"
  | "error";

export type ModalType =
  | "species-discovery"
  | "talent-awakening"
  | "offline-return"
  | "ecology-event"
  | "system-unlock"
  | null;

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

export const useUIStore = create<UIStore>((set, get) => ({
  page: "home",
  modalType: null,
  sheetType: null,
  modalData: {},
  sheetData: {},

  guide: !localStorage.getItem("eco-era-guide-done"),
  guideStep: 0,

  speciesDetailId: null,
  pendingTalentModal: false,
  strategyCooldownUntil: 0,

  setPage: (page) => set({ page, modalType: null, sheetType: null }),

  showModal: (type, data = {}) => set({ modalType: type, modalData: data }),
  hideModal: () => set({ modalType: null, modalData: {} }),

  showSheet: (type, data = {}) => set({ sheetType: type, sheetData: data }),
  hideSheet: () => set({ sheetType: null, sheetData: {} }),

  setGuide: (show) => {
    set({ guide: show });
    if (!show) localStorage.setItem("eco-era-guide-done", "1");
  },

  setGuideStep: (step) => set({ guideStep: step }),

  nextGuideStep: () => {
    const { guideStep } = get();
    set({ guideStep: guideStep + 1 });
  },

  setSpeciesDetailId: (id) => set({ speciesDetailId: id }),
  setPendingTalentModal: (pending) => set({ pendingTalentModal: pending }),
  setStrategyCooldown: (seconds) => set({ strategyCooldownUntil: Date.now() + seconds * 1000 }),
}));
