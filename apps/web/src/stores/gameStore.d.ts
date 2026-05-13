import type { EvolutionNode, EvolutionLog, FossilLegacy, GameState, Resources, SpeciesRecord, Talent } from "@eco-era/shared";
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
export declare const useGameStore: import("zustand").UseBoundStore<import("zustand").StoreApi<GameStore>>;
//# sourceMappingURL=gameStore.d.ts.map