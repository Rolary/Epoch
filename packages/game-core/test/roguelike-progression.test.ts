import { describe, expect, it, vi } from "vitest";
import { formatChineseNumber } from "@eco-era/shared";
import type { EcologicalRole, SpeciesRecord } from "@eco-era/shared";
import {
  applyEcologyResonance,
  applyEcologyEventChoice,
  applyEnvironmentAction,
  advanceState,
  availableEcologyResonances,
  availableEcologyEvents,
  buildThirdChapterDebugSave,
  calculateEcologyScore,
  calculateResourceDelta,
  canUnlockEvolutionNode,
  createInitialState,
  ecologyEventChanceFor,
  OFFLINE_ACCUMULATION_HOURS,
  previewEvolutionNodeProduction,
  productionMultiplierFor,
  normalizeGameState,
  rollEcologyEvent,
  talentCatalog,
  unclaimedResourceCapacity,
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

  it("keeps ordinary tidepool event chance restrained", () => {
    const early = {
      ...createInitialState("event-chance-early"),
      unlockedNodes: ["organic_richness"]
    };
    const withLife = {
      ...early,
      species: [speciesRecord("sp-producer", "蓝膜浮群", "producer", {})]
    };
    const ecologyBurst = normalizeGameState({
      ...withLife,
      currentEra: "photosynthesis_eve" as const,
      unlockedNodes: ["organic_richness", "replicating_chain", "primitive_vesicle", "metabolic_loop", "proto_cell", "photo_pigment"],
      chapterProgress: undefined,
    });

    expect(ecologyEventChanceFor(early)).toBe(0.06);
    expect(ecologyEventChanceFor(withLife)).toBe(0.1);
    expect(ecologyEventChanceFor(ecologyBurst)).toBe(0.12);

    vi.spyOn(Math, "random").mockReturnValue(0.13);
    expect(rollEcologyEvent(ecologyBurst)).toBeNull();
    vi.restoreAllMocks();
  });

  it("uses a longer soft interval after recent tidepool events", () => {
    const state = normalizeGameState({
      ...createInitialState("event-soft-interval"),
      currentEra: "proto_cell" as const,
      unlockedNodes: ["organic_richness", "replicating_chain", "primitive_vesicle", "metabolic_loop", "proto_cell"],
      species: [speciesRecord("sp-producer", "蓝膜浮群", "producer", {})],
      logs: [
        ...Array.from({ length: 12 }, (_, index) => ({
          id: `quiet-${index}`,
          type: "system" as const,
          message: "plain tide log",
          at: "2026-05-21T00:00:00.000Z",
        })),
        {
          id: "recent-event",
          type: "event" as const,
          message: "潮池事件出现：热泉短暂喷发",
          at: "2026-05-21T00:00:00.000Z",
        },
      ]
    });

    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(rollEcologyEvent(state)).toBeNull();
    vi.restoreAllMocks();
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
            logMessage: "hot spring event applied",
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

  it("accumulates idle production into the unclaimed pool before harvest", () => {
    const state = {
      ...createInitialState("idle-unclaimed-test"),
      lastCalculatedAt: "2026-05-21T00:00:00.000Z"
    };
    const advanced = advanceState(state, new Date("2026-05-21T00:10:00.000Z"));

    expect(advanced.unclaimedResources.organic).toBeGreaterThan(0);
    expect(advanced.unclaimedResources.energy).toBeGreaterThan(0);
    expect(advanced.resources.organic).toBe(state.resources.organic);
  });

  it("stops unclaimed resources at the five-hour tidepool capacity", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const state = {
      ...createInitialState("offline-cap-test"),
      unlockedNodes: ["organic_richness"],
      lastCalculatedAt: "2099-05-21T00:00:00.000Z"
    };
    const capacity = unclaimedResourceCapacity(state);
    const first = advanceState(state, new Date("2099-05-21T20:00:00.000Z"));
    const second = advanceState(first, new Date("2099-05-22T04:00:00.000Z"));

    expect(OFFLINE_ACCUMULATION_HOURS).toBe(5);
    expect(first.unclaimedResources.organic).toBeCloseTo(capacity.organic, 6);
    expect(second.unclaimedResources.organic).toBeCloseTo(capacity.organic, 6);
    expect(second.unclaimedResources.energy).toBeCloseTo(capacity.energy, 6);
    vi.restoreAllMocks();
  });

  it("turns a meaningful offline interval into a timed tidepool effect", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const state = {
      ...createInitialState("offline-effect-test"),
      unlockedNodes: ["organic_richness"],
      lastCalculatedAt: "2099-05-21T00:00:00.000Z"
    };
    const advanced = advanceState(state, new Date("2099-05-21T00:12:00.000Z"));

    expect(advanced.activePoolEffect?.id).toBe("clear_tide_afterglow");
    expect(advanced.activePoolEffect?.description.endsWith("。")).toBe(true);
    expect(advanced.activePoolEffect?.resourceMultipliers.energy).toBeGreaterThan(1);
    expect(new Date(advanced.activePoolEffect?.expiresAt ?? 0).getTime()).toBeGreaterThan(new Date("2099-05-21T00:12:00.000Z").getTime());
    vi.restoreAllMocks();
  });

  it("applies active tidepool effects to production and drops expired effects", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2099-05-21T00:00:00.000Z"));
    const base = createInitialState("active-effect-production");
    const withEffect = {
      ...base,
      activePoolEffect: {
        id: "test-current",
        title: "测试水势",
        description: "潮池正在测试一段水势。",
        effectLabel: "能量 +20%",
        tone: "buff" as const,
        resourceMultipliers: { energy: 1.2 },
        startedAt: "2099-05-21T00:00:00.000Z",
        expiresAt: "2099-05-21T00:30:00.000Z",
      },
    };

    expect(calculateResourceDelta(withEffect, 100).energy).toBeCloseTo(calculateResourceDelta(base, 100).energy * 1.2, 6);
    expect(normalizeGameState({ ...withEffect, activePoolEffect: { ...withEffect.activePoolEffect, expiresAt: "2099-05-20T23:59:00.000Z" } }).activePoolEffect).toBeNull();
    vi.useRealTimers();
  });

  it("harvests tidepool resources while keeping old catalyze calls compatible", () => {
    const state = {
      ...createInitialState("idle-harvest-test"),
      unclaimedResources: { organic: 20, energy: 12, minerals: 6, stability: 1, mutation: 2, biomass: 0 }
    };
    const collected = applyEnvironmentAction(state, "harvest_tide");
    const catalyzed = applyEnvironmentAction(state, "catalyze");

    expect(collected.resources.organic).toBeGreaterThan(state.resources.organic);
    expect(collected.resources.energy).toBeGreaterThan(state.resources.energy);
    expect(collected.resources.minerals).toBeGreaterThan(state.resources.minerals);
    expect(collected.resources.stability).toBeGreaterThan(state.resources.stability);
    expect(collected.unclaimedResources.organic).toBe(0);
    expect(catalyzed.resources.organic).toBeGreaterThan(state.resources.organic);
  });

  it("applies a small frequent return bonus only in the target window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-21T01:00:00.000Z"));
    const base = {
      ...createInitialState("frequent-harvest-test"),
      lastHarvestedAt: "2026-05-21T00:30:00.000Z",
      unclaimedResources: { organic: 100, energy: 0, minerals: 0, stability: 0, mutation: 0, biomass: 0 }
    };
    const tooSoon = {
      ...base,
      lastHarvestedAt: "2026-05-21T00:55:00.000Z"
    };

    expect(applyEnvironmentAction(base, "harvest_tide").resources.organic).toBeGreaterThan(105);
    expect(applyEnvironmentAction(tooSoon, "harvest_tide").resources.organic).toBe(100);
    vi.useRealTimers();
  });

  it("scales production with evolution, ecology and previewed unlocks", () => {
    const base = createInitialState("idle-collect-scale-base");
    const progressed = normalizeGameState({
      ...base,
      currentEra: "photosynthesis_eve" as const,
      unlockedNodes: ["organic_richness", "replicating_chain", "primitive_vesicle", "metabolic_loop", "proto_cell", "photo_pigment"],
      species: [
        speciesRecord("sp-producer", "producer", "producer", {}),
        speciesRecord("sp-decomposer", "decomposer", "decomposer", {})
      ]
    });

    const early = productionMultiplierFor(base);
    const later = productionMultiplierFor(progressed);
    const preview = previewEvolutionNodeProduction(base, "replicating_chain");

    expect(later.organic).toBeGreaterThan(early.organic);
    expect(later.energy).toBeGreaterThan(early.energy);
    expect(preview.ratio).toBeGreaterThan(1);
  });

  it("formats large numbers with Chinese units", () => {
    expect(formatChineseNumber(9999)).toBe("9999");
    expect(formatChineseNumber(10000)).toBe("1万");
    expect(formatChineseNumber(12300)).toBe("1.23万");
    expect(formatChineseNumber(100000000)).toBe("1亿");
    expect(formatChineseNumber(10 ** 12)).toBe("1兆");
    expect(formatChineseNumber(10 ** 16)).toBe("1京");
  });

  it("applies species combo effects to matching resource channels", () => {
    const base = createInitialState("combo-test");
    const withoutCombo = calculateResourceDelta(base, 100);
    const withCombo = calculateResourceDelta({
      ...base,
      species: [
        speciesRecord("sp-producer", "蓝膜浮群", "producer", { energy: 0.09, organic: 0.03 }),
        speciesRecord("sp-decomposer", "decomposer", "decomposer", { organic: 0.08, minerals: 0.02 })
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
        speciesRecord("sp-catalyst", "catalyst", "catalyst", {}),
        speciesRecord("sp-filterer", "潮盆微囊", "filterer", {}),
        speciesRecord("sp-producer", "蓝膜浮群", "producer", {})
      ],
      lastCalculatedAt: "2026-05-21T00:00:00.000Z"
    }, new Date("2026-05-21T00:00:02.000Z"));

    expect(next.legacies[0].numericEffects).toMatchObject({ energy: 0.02, mutation: 0.01 });
    expect(next.legacies[0].tradeoffEffects).toMatchObject({ stability: -0.005 });
  });

  it("scores ecology progress above passive resource hoards", () => {
    const base = createInitialState("score-base");
    const hoard = {
      ...base,
      resources: { organic: 999999, energy: 999999, minerals: 999999, stability: 100, mutation: 999999, biomass: 999999 }
    };
    const progressed = {
      ...base,
      currentEra: "proto_cell" as const,
      resources: { organic: 120, energy: 80, minerals: 60, stability: 82, mutation: 30, biomass: 45 },
      unlockedNodes: ["organic_richness", "replicating_chain", "primitive_vesicle", "metabolic_loop", "proto_cell"],
      species: [
        speciesRecord("sp-producer", "蓝膜浮群", "producer", { energy: 0.09, organic: 0.03 }),
        speciesRecord("sp-filterer", "潮盆微囊", "filterer", { biomass: 0.04, stability: 0.02 })
      ],
      talents: [{ ...talentCatalog[0], id: "score-talent" }],
      legacies: [
        {
          id: "legacy-score",
          sourceSpeciesId: "sp-producer",
          name: "蓝膜浮群遗痕",
          type: "ancestor" as const,
          description: "",
          effect: "",
          numericEffects: { energy: 0.03 },
          createdAt: "2026-05-21T00:00:00.000Z"
        }
      ]
    };

    expect(calculateEcologyScore(progressed)).toBeGreaterThan(calculateEcologyScore(hoard));
  });

  it("adds score for species, legacies and talents", () => {
    const base = createInitialState("score-growth");
    const richer = {
      ...base,
      species: [speciesRecord("sp-catalyst", "catalyst", "catalyst", { energy: 0.04, mutation: 0.02 })],
      legacies: [
        {
          id: "legacy-catalyst",
          sourceSpeciesId: "sp-catalyst",
          name: "catalyst imprint",
          type: "fossil" as const,
          description: "",
          effect: "",
          numericEffects: { mutation: 0.01 },
          createdAt: "2026-05-21T00:00:00.000Z"
        }
      ],
      talents: [{ ...talentCatalog[0], id: "score-talent" }]
    };

    expect(calculateEcologyScore(richer)).toBeGreaterThan(calculateEcologyScore(base));
  });

  it("derives second chapter progress for old saves after photosensitive life appears", () => {
    const oldSave = {
      ...createInitialState("old-second-chapter"),
      currentEra: "photosynthesis_eve" as const,
      unlockedNodes: ["organic_richness", "replicating_chain", "primitive_vesicle", "metabolic_loop", "proto_cell", "photo_pigment"],
      chapterProgress: undefined
    };

    const normalized = normalizeGameState(oldSave);

    expect(normalized.chapterProgress?.chapter).toBe("ecology_burst");
    expect(normalized.chapterProgress?.stage).toBe("pursue_light");
    expect(normalized.chapterProgress?.currentMoodLabel).toBeTruthy();
    expect(normalized.chapterWitness?.ecologyBurst.lightWitnessed).toBe(false);
  });

  it("supports a playable second chapter path through three roles, imbalance and personality", () => {
    let state = {
      ...createInitialState("chapter-two-path"),
      currentEra: "photosynthesis_eve" as const,
      resources: { organic: 9999, energy: 9999, minerals: 9999, stability: 9999, mutation: 9999, biomass: 9999 },
      unlockedNodes: ["organic_richness", "replicating_chain", "primitive_vesicle", "metabolic_loop", "proto_cell", "photo_pigment"]
    };

    expect(normalizeGameState(state).chapterProgress?.stage).toBe("pursue_light");
    expect(canUnlockEvolutionNode(state, "early_producer_film")).toBe(true);
    state = unlockEvolutionNode(state, "early_producer_film");
    state = unlockEvolutionNode(state, "decomposition_layer");
    expect(state.chapterProgress?.stage).toBe("form_cycle");

    state = applyEcologyResonance(state, "decomposer_feeds_producer", new Date("2026-05-21T00:01:00.000Z")).state;
    expect(state.chapterWitness?.ecologyBurst.firstResonanceWitnessed).toBe(true);
    expect(state.chapterProgress?.stage).toBe("form_cycle");

    state = {
      ...state,
      lastResonanceAt: null,
      resources: { organic: 9999, energy: 9999, minerals: 9999, stability: 9999, mutation: 9999, biomass: 9999 },
    };
    state = unlockEvolutionNode(state, "tidal_filter_pores");

    expect(Array.from(new Set(state.species.map((item) => item.ecologicalRole)))).toEqual(expect.arrayContaining(["producer", "decomposer", "filterer"]));
    expect(state.chapterWitness?.ecologyBurst.rolesWitnessed).toEqual(expect.arrayContaining(["producer", "decomposer", "filterer"]));
    expect(canUnlockEvolutionNode(state, "mutual_ecology_cycle")).toBe(true);

    state = unlockEvolutionNode(state, "mutual_ecology_cycle");
    expect(state.pendingEcologyEvent?.id).toBe("bloom_pressure");
    expect(state.chapterProgress?.stage).toBe("face_imbalance");

    state = applyEcologyEventChoice(state, "bloom_pressure", "thin_bloom");
    expect(state.historyTags).toContain("ecology_imbalance_faced");
    expect(state.chapterWitness?.ecologyBurst.imbalanceWitnessed).toBe(true);
    expect(canUnlockEvolutionNode(state, "ecological_personality")).toBe(true);

    state = unlockEvolutionNode(state, "ecological_personality");
    expect(state.chapterProgress?.stage).toBe("complete");
    expect(state.logs[0]?.message).toContain("形成了长期生态倾向");
  });

  it("records the first ecology combo only once during ticks", () => {
    const base = {
      ...createInitialState("combo-log-once"),
      currentEra: "photosynthesis_eve" as const,
      unlockedNodes: ["organic_richness", "replicating_chain", "primitive_vesicle", "metabolic_loop", "proto_cell", "photo_pigment"],
      species: [
        speciesRecord("sp-producer", "蓝膜浮群", "producer", { energy: 0.09, organic: 0.03 }),
        speciesRecord("sp-decomposer", "decomposer", "decomposer", { organic: 0.08, minerals: 0.02 }),
        speciesRecord("sp-filterer", "潮盆微囊", "filterer", { biomass: 0.04, stability: 0.02 })
      ],
      lastCalculatedAt: "2026-05-21T00:00:00.000Z"
    };

    const first = advanceState(base, new Date("2026-05-21T00:00:02.000Z"));
    const second = advanceState({ ...first, lastCalculatedAt: "2026-05-21T00:00:02.000Z" }, new Date("2026-05-21T00:00:04.000Z"));

    expect(first.logs.filter((log) => log.message.includes("生态组合")).length).toBe(1);
    expect(second.logs.filter((log) => log.message.includes("生态组合")).length).toBe(1);
    expect(first.chapterProgress?.ecologyCycleFormed).toBe(true);
  });

  it("normalizes old saves with empty ecology resonance fields", () => {
    const normalized = normalizeGameState({
      ...createInitialState("old-resonance-save"),
      pendingEcologyResonances: undefined,
      resonanceHistory: undefined,
      lastResonanceAt: undefined,
      unclaimedResources: undefined,
      lastHarvestedAt: undefined,
      codexObservations: undefined,
      chapterWitness: undefined,
    } as unknown as ReturnType<typeof createInitialState>);

    expect(normalized.pendingEcologyResonances).toEqual([]);
    expect(normalized.resonanceHistory).toEqual([]);
    expect(normalized.lastResonanceAt).toBeNull();
    expect(normalized.unclaimedResources).toMatchObject({ organic: 0, energy: 0, minerals: 0 });
    expect(normalized.lastHarvestedAt).toBeTruthy();
    expect(normalized.codexObservations).toEqual([]);
    expect(normalized.chapterWitness?.ecologyBurst.rolesWitnessed).toEqual([]);
    expect(normalized.chapterWitness?.shorelineDifferentiation).toEqual({
      chapterStarted: false,
      waterlineExposed: false,
      shoreColonized: false,
      habitatsWitnessed: [],
      dryWetPressureWitnessed: false,
      shorelineExchangeWitnessed: false,
      shorelineMemoryWitnessed: false,
      shorelineStrategy: undefined,
    });
  });

  it("keeps a completed second chapter save at its stable ending until chapter three starts", () => {
    const completed = buildThirdChapterDebugSave("chapter-three-source", "exposed");
    const oldSecondChapterSave = {
      ...completed,
      chapterWitness: {
        ecologyBurst: completed.chapterWitness!.ecologyBurst,
        shorelineDifferentiation: undefined,
      },
      historyTags: completed.historyTags.filter((tag) => tag !== "waterline_exposed"),
    } as unknown as ReturnType<typeof createInitialState>;

    const normalized = normalizeGameState(oldSecondChapterSave);

    expect(normalized.chapterProgress?.chapter).toBe("ecology_burst");
    expect(normalized.chapterProgress?.stage).toBe("complete");
    expect(normalized.chapterWitness?.shorelineDifferentiation.chapterStarted).toBe(false);
    expect(normalized.species.every((species) => species.habitats === undefined)).toBe(true);
  });

  it("builds the first third chapter debug slice without inventing a shoreline species", () => {
    const save = buildThirdChapterDebugSave("chapter-three-exposed", "exposed");

    expect(save.chapterProgress?.chapter).toBe("shoreline_differentiation");
    expect(save.chapterProgress?.stage).toBe("attach_shore");
    expect(save.chapterProgress?.completedStages).toEqual(["discover_waterline"]);
    expect(save.chapterWitness?.shorelineDifferentiation).toMatchObject({
      chapterStarted: true,
      waterlineExposed: true,
      shoreColonized: false,
      habitatsWitnessed: ["shallow_water"],
    });
    expect(save.historyTags).toContain("waterline_exposed");
    expect(save.species.every((species) => species.habitats === undefined)).toBe(true);
  });

  it("guides an existing lineage to the wet rock once without directly creating a species", () => {
    let save = buildThirdChapterDebugSave("chapter-three-guide", "exposed");
    save = {
      ...save,
      resources: { organic: 9999, energy: 9999, minerals: 9999, stability: 9999, mutation: 9999, biomass: 9999 },
    };
    save = unlockEvolutionNode(save, "shore_attachment");
    save.pendingEcologyEvent = null;
    const speciesCount = save.species.length;

    const guided = applyEnvironmentAction(save, "guide_shore_tide");
    const guidedAgain = applyEnvironmentAction(guided, "guide_shore_tide");
    const attached = guided.species.find((species) => species.habitats?.includes("intertidal_wet_rock"));

    expect(guided.species).toHaveLength(speciesCount);
    expect(attached?.habitats).toEqual(expect.arrayContaining(["shallow_water", "intertidal_wet_rock"]));
    expect(guided.chapterWitness?.shorelineDifferentiation.shoreColonized).toBe(true);
    expect(guided.chapterProgress?.stage).toBe("endure_dry_wet");
    expect(guided.pendingEcologyEvent?.id).toBe("ebb_dryness");
    expect(guidedAgain.logs.filter((log) => log.message.includes("随水流抵达湿岩"))).toHaveLength(1);
  });

  it("records exactly one shoreline strategy after the ebb dryness choice", () => {
    const eventSave = buildThirdChapterDebugSave("chapter-three-event", "event");
    expect(eventSave.pendingEcologyEvent?.options.map((option) => option.id)).toEqual([
      "protect_moisture_film",
      "expose_wet_rock",
      "return_to_shallows",
    ]);

    const outcomes = [
      ["protect_moisture_film", "moisture_retention"],
      ["expose_wet_rock", "rock_attachment"],
      ["return_to_shallows", "tidal_dispersal"],
    ] as const;
    for (const [optionId, strategy] of outcomes) {
      const freshEventSave = buildThirdChapterDebugSave(`chapter-three-event-${optionId}`, "event");
      const next = applyEcologyEventChoice(freshEventSave, "ebb_dryness", optionId);
      expect(next.chapterWitness?.shorelineDifferentiation).toMatchObject({
        dryWetPressureWitnessed: true,
        shorelineStrategy: strategy,
      });
      expect(next.chapterProgress?.stage).toBe("reconnect_cycle");
      expect(next.historyTags).toContain(strategy);
      expect(outcomes.filter(([, candidate]) => candidate !== strategy).every(([, candidate]) => !next.historyTags.includes(candidate))).toBe(true);
      expect(() => applyEcologyEventChoice(next, "ebb_dryness", "protect_moisture_film")).toThrow("潮池事件不可用");
    }
  });

  it("builds the first shoreline exchange after pressure has been witnessed", () => {
    const save = buildThirdChapterDebugSave("chapter-three-exchange", "exchange");

    expect(save.chapterProgress?.chapter).toBe("shoreline_differentiation");
    expect(save.chapterProgress?.stage).toBe("shoreline_memory");
    expect(save.chapterProgress?.shorelineExchangeFormed).toBe(true);
    expect(save.chapterWitness?.shorelineDifferentiation.shorelineExchangeWitnessed).toBe(true);
    expect(save.historyTags).toContain("shoreline_exchange");
  });

  it("requires second chapter roles and cooldown before ecology resonance", () => {
    const base = createInitialState("resonance-gate");
    expect(availableEcologyResonances(base)).toHaveLength(0);

    const oneRole = {
      ...base,
      currentEra: "photosynthesis_eve" as const,
      unlockedNodes: ["organic_richness", "replicating_chain", "primitive_vesicle", "metabolic_loop", "proto_cell", "photo_pigment"],
      species: [speciesRecord("sp-producer", "蓝膜浮群", "producer", {})],
    };
    expect(availableEcologyResonances(oneRole)).toHaveLength(0);

    const twoRoles = {
      ...oneRole,
      species: [...oneRole.species, speciesRecord("sp-decomposer", "decomposer", "decomposer", {})],
    };
    expect(availableEcologyResonances(twoRoles).map((item) => item.id)).toContain("decomposer_feeds_producer");

    const cooled = {
      ...twoRoles,
      lastResonanceAt: "2026-05-21T00:00:10.000Z",
    };
    expect(availableEcologyResonances(cooled, new Date("2026-05-21T00:00:20.000Z"))).toHaveLength(0);
  });

  it("recognizes ecology roles from unlocked nodes when an old save lacks role species records", () => {
    const state = {
      ...createInitialState("node-role-migration"),
      currentEra: "photosynthesis_eve" as const,
      unlockedNodes: [
        "organic_richness",
        "replicating_chain",
        "primitive_vesicle",
        "metabolic_loop",
        "proto_cell",
        "photo_pigment",
        "early_producer_film",
        "decomposition_layer",
        "tidal_filter_pores",
      ],
      species: [],
      chapterProgress: {
        chapter: "ecology_burst" as const,
        stage: "form_cycle" as const,
        ecologyCycleFormed: false,
        currentMoodLabel: "",
        nextHintLabel: "",
      },
    };

    const resonances = availableEcologyResonances(state);
    expect(resonances.some((item) => item.id === "filter_pores_clear_tide")).toBe(true);

    const normalized = normalizeGameState(state);
    expect(normalized.species.map((item) => item.ecologicalRole)).toEqual(
      expect.arrayContaining(["producer", "decomposer", "filterer"]),
    );
    expect(normalized.species.find((item) => item.ecologicalRole === "filterer")?.name).toBe("潮筛滤泡");
  });

  it("does not revive an extinct role while backfilling old node-based species records", () => {
    const extinctFilterer = speciesRecord("sp-extinct-filterer", "旧潮筛滤泡", "filterer", {});
    extinctFilterer.status = "extinct";
    const normalized = normalizeGameState({
      ...createInitialState("extinct-role-migration"),
      unlockedNodes: ["organic_richness", "replicating_chain", "tidal_filter_pores"],
      species: [extinctFilterer],
    });

    expect(normalized.species.filter((item) => item.ecologicalRole === "filterer")).toHaveLength(1);
    expect(normalized.species[0].status).toBe("extinct");
  });

  it("applies ecology resonance without completing the second chapter", () => {
    const state = {
      ...createInitialState("resonance-apply"),
      currentEra: "photosynthesis_eve" as const,
      resources: { organic: 100, energy: 100, minerals: 100, stability: 70, mutation: 40, biomass: 80 },
      unlockedNodes: ["organic_richness", "replicating_chain", "primitive_vesicle", "metabolic_loop", "proto_cell", "photo_pigment"],
      species: [
        speciesRecord("sp-producer", "蓝膜浮群", "producer", {}),
        speciesRecord("sp-decomposer", "decomposer", "decomposer", {})
      ],
    };

    const { state: next, resonanceResult } = applyEcologyResonance(state, "decomposer_feeds_producer", new Date("2026-05-21T00:01:00.000Z"));

    expect(resonanceResult.title).toBeTruthy();
    expect(next.resources.organic).toBeGreaterThan(state.resources.organic);
    expect(next.resonanceHistory).toContain("decomposer_feeds_producer");
    expect(next.historyTags).toContain("producer_decomposer_resonance");
    expect(next.chapterWitness?.ecologyBurst.firstResonanceWitnessed).toBe(true);
    expect(next.logs[0]?.message).toBeTruthy();
    expect(next.chapterProgress?.stage).toBe("form_cycle");
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
