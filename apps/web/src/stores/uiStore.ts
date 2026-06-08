import { create } from "zustand";
import { getGuestKey, getSaveId } from "../api.js";

export type Page =
  | "create-ecology"
  | "home"
  | "evolution"
  | "codex"
  | "codex-detail"
  | "talents"
  | "fossils"
  | "logs"
  | "leaderboard"
  | "settings"
  | "error";

export type ModalType =
  | "species-discovery"
  | "talent-awakening"
  | "offline-return"
  | "ecology-event"
  | "decision-confirm"
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
  seenUnlockHints: string[];
  unlockGuideTarget: string | null;
  snoozedEcologyEventId: string | null;

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
}

function getPlayerStorageScope(): string {
  return getSaveId() || getGuestKey() || "anonymous";
}

function scopedStorageKey(name: string): string {
  return `eco-era:${getPlayerStorageScope()}:${name}`;
}

function readScopedSeenUnlockHints(): string[] {
  try {
    return JSON.parse(localStorage.getItem(scopedStorageKey("seen-unlock-hints")) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function readScopedGuideState(): boolean {
  return localStorage.getItem(scopedStorageKey("guide-done")) !== "1";
}

export const useUIStore = create<UIStore>((set, get) => ({
  page: "home",
  modalType: null,
  sheetType: null,
  modalData: {},
  sheetData: {},

  guide: readScopedGuideState(),
  guideStep: 0,

  speciesDetailId: null,
  pendingTalentModal: false,
  strategyCooldownUntil: 0,
  seenUnlockHints: readScopedSeenUnlockHints(),
  unlockGuideTarget: null,
  snoozedEcologyEventId: null,

  setPage: (page) => set({ page, modalType: null, sheetType: null }),

  showModal: (type, data = {}) => set({ modalType: type, modalData: data }),
  hideModal: () => set({ modalType: null, modalData: {} }),

  showSheet: (type, data = {}) => set({ sheetType: type, sheetData: data }),
  hideSheet: () => set({ sheetType: null, sheetData: {} }),

  setGuide: (show) => {
    set({ guide: show });
    if (!show) localStorage.setItem(scopedStorageKey("guide-done"), "1");
  },

  setGuideStep: (step) => set({ guideStep: step }),

  nextGuideStep: () => {
    const { guideStep } = get();
    set({ guideStep: guideStep + 1 });
  },

  setSpeciesDetailId: (id) => set({ speciesDetailId: id }),
  setPendingTalentModal: (pending) => set({ pendingTalentModal: pending }),
  setStrategyCooldown: (seconds) => set({ strategyCooldownUntil: Date.now() + seconds * 1000 }),
  markUnlockHintSeen: (id) =>
    set((state) => {
      const seenUnlockHints = Array.from(new Set([...state.seenUnlockHints, id]));
      localStorage.setItem(scopedStorageKey("seen-unlock-hints"), JSON.stringify(seenUnlockHints));
      return { seenUnlockHints };
    }),
  setUnlockGuideTarget: (id) => set({ unlockGuideTarget: id }),
  snoozeEcologyEvent: (id) => set({ snoozedEcologyEventId: id }),
  hydrateScopedUIState: () =>
    set({
      guide: readScopedGuideState(),
      guideStep: 0,
      seenUnlockHints: readScopedSeenUnlockHints(),
      unlockGuideTarget: null,
      snoozedEcologyEventId: null,
      modalType: null,
      modalData: {},
      sheetType: null,
      sheetData: {},
    }),
}));
