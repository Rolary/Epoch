import { afterEach, describe, expect, it, vi } from "vitest";
import type { EcologicalRole, FossilLegacy, SpeciesRecord } from "@eco-era/shared";
import { advanceState, calculateResourceDelta, createInitialState } from "../src/index.js";

describe("legacy ecological effects", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates role-specific legacy copy and numeric effects", () => {
    const now = new Date("2026-05-21T00:00:02.000Z");
    const state = createInitialState("legacy-test");
    vi.spyOn(Math, "random").mockReturnValue(0.99);

    const next = advanceState({
      ...state,
      resources: { ...state.resources, stability: 0 },
      species: [
        speciesRecord("sp-catalyst", "晶面催化群", "catalyst"),
        speciesRecord("sp-filterer", "潮筛微囊", "filterer"),
        speciesRecord("sp-producer", "蓝膜浮群", "producer")
      ],
      lastCalculatedAt: "2026-05-21T00:00:00.000Z"
    }, now);

    expect(next.legacies).toHaveLength(1);
    expect(next.legacies[0]).toMatchObject({
      name: "晶面催化群遗痕",
      effect: "能量产出 +2% · 突变倾向 +1%",
      numericEffects: { energy: 0.02, mutation: 0.01 }
    });
    expect(next.legacies[0].description).toContain("催化晶面");
  });

  it("applies legacy effects only to the matching resource channels", () => {
    const base = createInitialState("delta-test");
    const withoutLegacy = calculateResourceDelta(base, 100);
    const withLegacy = calculateResourceDelta({
      ...base,
      legacies: [legacyRecord("new", { energy: 0.02, mutation: 0.01 })]
    }, 100);

    expect(withLegacy.energy).toBeCloseTo(withoutLegacy.energy * 1.02, 6);
    expect(withLegacy.mutation).toBeCloseTo(withoutLegacy.mutation * 1.01, 6);
    expect(withLegacy.organic).toBeCloseTo(withoutLegacy.organic, 6);
    expect(withLegacy.minerals).toBeCloseTo(withoutLegacy.minerals, 6);
  });

  it("keeps old saves without numericEffects compatible", () => {
    const base = createInitialState("old-save-test");
    const withoutLegacy = calculateResourceDelta(base, 100);
    const oldLegacy = {
      id: "legacy-old",
      sourceSpeciesId: "sp-old",
      name: "旧遗痕",
      type: "fossil",
      description: "旧版本遗产",
      effect: "所有基础资源产出 +3%",
      createdAt: "2026-05-21T00:00:00.000Z"
    } as unknown as FossilLegacy;
    const withOldLegacy = calculateResourceDelta({ ...base, legacies: [oldLegacy] }, 100);

    expect(withOldLegacy.organic).toBeCloseTo(withoutLegacy.organic * 1.02, 6);
    expect(withOldLegacy.energy).toBeCloseTo(withoutLegacy.energy, 6);
  });

  it("keeps high mutation from permanently locking stability at zero", () => {
    const base = createInitialState("high-mutation-stability-test");
    const delta = calculateResourceDelta({
      ...base,
      resources: { ...base.resources, stability: 0, mutation: 2588.26 },
      environment: { ...base.environment, light: 1.12, volatility: 0.31 },
      species: Array.from({ length: 12 }, (_, index) =>
        speciesRecord(`sp-${index}`, `species-${index}`, "catalyst")
      )
    }, 60);

    expect(delta.stability).toBeGreaterThan(0);
    expect(delta.stability).toBeLessThan(5);
  });

  it("keeps extreme mutation risky when the ecosystem has no species support", () => {
    const base = createInitialState("unsupported-high-mutation-test");
    const delta = calculateResourceDelta({
      ...base,
      resources: { ...base.resources, stability: 0, mutation: 10000 },
      environment: { ...base.environment, volatility: 0.31 }
    }, 60);

    expect(delta.stability).toBeLessThan(0);
    expect(delta.stability).toBeGreaterThan(-1);
  });
});

function speciesRecord(id: string, name: string, ecologicalRole: EcologicalRole): SpeciesRecord {
  return {
    id,
    name,
    era: "proto_cell",
    niche: "始源潮池浅层",
    status: "living",
    ecologicalRole,
    traits: [],
    vulnerabilities: [],
    numericEffects: {},
    shortDescription: "",
    visualPrompt: "",
    lineageSummary: "",
    discoveredAt: "2026-05-21T00:00:00.000Z"
  };
}

function legacyRecord(id: string, numericEffects: FossilLegacy["numericEffects"]): FossilLegacy {
  return {
    id: `legacy-${id}`,
    sourceSpeciesId: `sp-${id}`,
    name: "测试遗痕",
    type: "fossil",
    description: "测试遗产",
    effect: "测试效果",
    numericEffects,
    createdAt: "2026-05-21T00:00:00.000Z"
  };
}
