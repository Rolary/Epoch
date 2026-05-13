import type {
  EvolutionNode,
  EvolutionLog,
  FossilLegacy,
  GameState,
  Resources,
  SpeciesRecord,
  Talent,
} from "@eco-era/shared";
import { create } from "zustand";

export type ElementType = "crystal" | "spark" | "droplet" | "pulse";
export type Outcome = "positive" | "negative" | "rare";

export interface AbsorbEvent {
  type: ElementType;
  outcome: Outcome;
  id: number;
}

export interface GameStore {
  save: GameState | null;
  saveId: string | null;
  guestReady: boolean;
  loading: boolean;
  error: string | null;
  syncPending: boolean;
  lastLocalTick: number;

  // Drag element absorb queue — HomeScene pushes events, App.tsx processes them
  absorbQueue: AbsorbEvent[];
  absorbSeq: number;

  setSave: (save: GameState) => void;
  setSaveId: (id: string | null) => void;
  setGuestReady: (ready: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSyncPending: (pending: boolean) => void;
  updateLastTick: () => void;
  enqueueAbsorb: (type: ElementType, outcome: Outcome) => void;
  dequeueAbsorb: (id: number) => void;

  // derived helpers
  resources: () => Resources;
  nodes: () => EvolutionNode[];
  species: () => SpeciesRecord[];
  legacies: () => FossilLegacy[];
  logs: () => EvolutionLog[];
  talents: () => Talent[];
  pendingTalents: () => Talent[];
  currentEra: () => string;
  planetProfile: () => string;
  isNodeUnlocked: (nodeId: string) => boolean;
}

export const useGameStore = create<GameStore>((set, get) => ({
  save: null,
  saveId: null,
  guestReady: false,
  loading: false,
  error: null,
  syncPending: false,
  lastLocalTick: Date.now(),
  absorbQueue: [],
  absorbSeq: 0,

  setSave: (save) => set({ save }),
  setSaveId: (id) => set({ saveId: id }),
  setGuestReady: (ready) => set({ guestReady: ready }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSyncPending: (pending) => set({ syncPending: pending }),
  updateLastTick: () => set({ lastLocalTick: Date.now() }),

  enqueueAbsorb: (type, outcome) =>
    set((s) => {
      const id = s.absorbSeq + 1;
      return {
        absorbQueue: [...s.absorbQueue, { type, outcome, id }],
        absorbSeq: id,
      };
    }),

  dequeueAbsorb: (id) =>
    set((s) => ({
      absorbQueue: s.absorbQueue.filter((e) => e.id !== id),
    })),

  resources: () => get().save?.resources ?? { organic: 0, energy: 0, minerals: 0, stability: 40, mutation: 0, biomass: 0 },
  nodes: () => [],
  species: () => get().save?.species ?? [],
  legacies: () => get().save?.legacies ?? [],
  logs: () => get().save?.logs ?? [],
  talents: () => get().save?.talents ?? [],
  pendingTalents: () => get().save?.pendingTalentChoices ?? [],
  currentEra: () => get().save?.currentEra ?? "primordial_pool",
  planetProfile: () => get().save?.planetProfile ?? "balanced",
  isNodeUnlocked: (nodeId) => get().save?.unlockedNodes.includes(nodeId) ?? false,
}));
