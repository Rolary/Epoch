import { describe, expect, it, vi } from "vitest";
import {
  advanceState,
  applyEnvironmentAction,
  calculateEcologyScoreBreakdown,
  createInitialState,
  normalizeGameState,
} from "../src/index.js";

const ECOLOGY_NODES = [
  "organic_richness",
  "replicating_chain",
  "primitive_vesicle",
  "metabolic_loop",
  "proto_cell",
  "photo_pigment",
  "early_producer_film",
  "decomposition_layer",
  "tidal_filter_pores",
  "mutual_ecology_cycle",
];

function ecologyState(id: string) {
  const state = createInitialState(id);
  return normalizeGameState({
    ...state,
    currentEra: "photosynthesis_eve",
    unlockedNodes: ECOLOGY_NODES,
    resources: {
      organic: 1000,
      energy: 1000,
      minerals: 1000,
      stability: 70,
      mutation: 100,
      biomass: 500,
    },
  });
}

describe("hidden tide traces", () => {
  it("normalizes old saves without revealing or unlocking candidates", () => {
    const oldSave = { ...createInitialState("old-save"), hiddenTraces: undefined };
    const normalized = normalizeGameState(oldSave);

    expect(normalized.hiddenTraces?.records).toEqual([]);
    expect(normalized.hiddenTraces?.progress?.actionCount).toBe(0);
  });

  it("discovers ecology traces only after a server-side action evaluation", () => {
    const ready = ecologyState("ecology-traces");
    expect(ready.hiddenTraces?.records).toHaveLength(0);

    const next = applyEnvironmentAction(ready, "catalyze");
    const ids = next.hiddenTraces?.records.map((record) => record.id) ?? [];

    expect(ids).toContain("peaceful_route");
    expect(ids).toContain("all_of_them");
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("requires six alternating corrections for the water-and-flour trace", () => {
    let state = ecologyState("alternating-corrections");
    for (const action of ["tide", "minerals", "tide", "minerals", "tide"] as const) {
      state = applyEnvironmentAction(state, action);
    }
    expect(state.hiddenTraces?.records.some((record) => record.id === "add_water_add_flour")).toBe(false);

    state = applyEnvironmentAction(state, "minerals");
    expect(state.hiddenTraces?.records.some((record) => record.id === "add_water_add_flour")).toBe(true);

    const repeated = applyEnvironmentAction(state, "catalyze");
    expect(repeated.hiddenTraces?.records.filter((record) => record.id === "add_water_add_flour")).toHaveLength(1);
  });

  it("discovers one more tide after observing a completed ecology in silence", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const base = ecologyState("one-more-tide");
    const complete = normalizeGameState({
      ...base,
      unlockedNodes: [...ECOLOGY_NODES, "ecological_personality"],
      historyTags: [...base.historyTags, "stable_cycle", "ecological_personality"],
      eventHistory: ["bloom_pressure"],
      lastCalculatedAt: "2099-01-01T00:00:00.000Z",
    });

    const next = advanceState(complete, new Date("2099-01-01T00:10:01.000Z"));
    expect(next.hiddenTraces?.records.some((record) => record.id === "one_more_tide")).toBe(true);
    vi.restoreAllMocks();
  });

  it("adds hidden score once and keeps it below fifteen percent of ecology score", () => {
    const discovered = applyEnvironmentAction(ecologyState("trace-score"), "catalyze");
    const breakdown = calculateEcologyScoreBreakdown(discovered);
    const hidden = breakdown.hiddenTraces ?? 0;
    const base = Object.entries(breakdown)
      .filter(([key]) => key !== "hiddenTraces")
      .reduce((sum, [, value]) => sum + value, 0);

    expect(hidden).toBeGreaterThan(0);
    expect(hidden).toBeLessThanOrEqual(Math.floor(base * 0.15));
  });
});
