import { describe, expect, it, vi } from "vitest";
import type { EcologicalRole, SpeciesRecord } from "@eco-era/shared";
import {
  applyEcologyEventChoice,
  advanceState,
  availableEcologyEvents,
  calculateResourceDelta,
  canUnlockEvolutionNode,
  createInitialState,
  unlockEvolutionNode
} from "../src/index.js";

describe("roguelike life-history progression", () => {
  it("allows only one replication branch in a branch group", () => {
    const state = createInitialState("branch-test");
    const ready = {
      ...state,
      resources: { organic: 999, energy: 999, minerals: 999, stability: 999, mutation: 999, biomass: 999 },
      unlockedNodes: ["organic_richness", "replicating_chain"]
    };

    expect(canUnlockEvolutionNode(ready, "replication_fidelity")).toBe(true);
    const next = unlockEvolutionNode(ready, "replication_fidelity");

    expect(next.unlockedNodes).toContain("replication_fidelity");
    expect(next.historyTags).toContain("replication_fidelity");
    expect(canUnlockEvolutionNode(next, "error_retention")).toBe(false);
    expect(canUnlockEvolutionNode(next, "fragment_budding")).toBe(false);
  });

  it("filters ecology events by current pool conditions", () => {
    const state = createInitialState("event-filter-test");
    const events = availableEcologyEvents({
      ...state,
      resources: { ...state.resources, organic: 20, energy: 2, minerals: 2 }
    });

    expect(events.map((event) => event.id)).toContain("tidal_memory_surge");
    expect(events.map((event) => event.id)).not.toContain("lightning_window");
  });

  it("applies ecology event choices and records discoverable history tags", () => {
    const state = {
      ...createInitialState("event-apply-test"),
      pendingEcologyEvent: {
        id: "hot_spring_pulse",
        title: "热泉短暂喷发",
        description: "",
        tendencyTag: "耐热倾向",
        options: [
          {
            id: "approach_heat",
            title: "靠近热泉",
            description: "",
            resourceEffect: { energy: 34, stability: -10 },
            environmentEffect: { heat: 0.18 },
            addHistoryTags: ["heat_tolerant"],
            logMessage: "热泉把潮池边缘点亮。"
          }
        ]
      }
    };

    const next = applyEcologyEventChoice(state, "hot_spring_pulse", "approach_heat");

    expect(next.pendingEcologyEvent).toBeNull();
    expect(next.resources.energy).toBe(34);
    expect(next.resources.stability).toBe(30);
    expect(next.environment.heat).toBeCloseTo(1.18, 6);
    expect(next.historyTags).toContain("heat_tolerant");
    expect(next.eventHistory).toContain("hot_spring_pulse");
  });

  it("applies species combo effects to matching resource channels", () => {
    const base = createInitialState("combo-test");
    const withoutCombo = calculateResourceDelta(base, 100);
    const withCombo = calculateResourceDelta({
      ...base,
      species: [
        speciesRecord("sp-producer", "蓝膜浮群", "producer", { energy: 0.09, organic: 0.03 }),
        speciesRecord("sp-decomposer", "灰晶分解链", "decomposer", { organic: 0.08, minerals: 0.02 })
      ]
    }, 100);

    expect(withCombo.organic).toBeGreaterThan(withoutCombo.organic);
    expect(withCombo.energy).toBeGreaterThan(withoutCombo.energy);
  });

  it("uses legacy tradeoffs as durable costs", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const state = createInitialState("legacy-tradeoff-test");
    const next = advanceState({
      ...state,
      resources: { ...state.resources, stability: 0 },
      species: [
        speciesRecord("sp-catalyst", "晶面催化群", "catalyst", {}),
        speciesRecord("sp-filterer", "潮筛微囊", "filterer", {}),
        speciesRecord("sp-producer", "蓝膜浮群", "producer", {})
      ],
      lastCalculatedAt: "2026-05-21T00:00:00.000Z"
    }, new Date("2026-05-21T00:00:02.000Z"));

    expect(next.legacies[0].numericEffects).toMatchObject({ energy: 0.02, mutation: 0.01 });
    expect(next.legacies[0].tradeoffEffects).toMatchObject({ stability: -0.005 });
  });
});

function speciesRecord(
  id: string,
  name: string,
  ecologicalRole: EcologicalRole,
  numericEffects: SpeciesRecord["numericEffects"]
): SpeciesRecord {
  return {
    id,
    name,
    era: "proto_cell",
    niche: "始源潮池浅层",
    status: "living",
    ecologicalRole,
    traits: [],
    vulnerabilities: [],
    numericEffects,
    shortDescription: "",
    visualPrompt: "",
    lineageSummary: "",
    discoveredAt: "2026-05-21T00:00:00.000Z"
  };
}
