import type {
  EcologicalRole,
  EvolutionLog,
  EvolutionNode,
  FossilLegacy,
  GameState,
  PlanetProfile,
  Resources,
  SpeciesRecord,
  Talent
} from "@eco-era/shared";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const evolutionNodes: EvolutionNode[] = [
  {
    id: "organic_richness",
    name: "有机富集",
    description: "潮池在蒸发与回潮之间保留更多复杂分子。",
    cost: { organic: 30, energy: 10 },
    requires: []
  },
  {
    id: "replicating_chain",
    name: "自复制链",
    description: "少数分子开始留下可复制的结构痕迹。",
    cost: { organic: 70, minerals: 25, stability: 12 },
    requires: ["organic_richness"],
    unlocksEra: "self_replicators"
  },
  {
    id: "primitive_vesicle",
    name: "原始膜泡",
    description: "薄膜结构把反应环境与外界潮水短暂隔开。",
    cost: { organic: 90, energy: 32, minerals: 30 },
    requires: ["replicating_chain"]
  },
  {
    id: "metabolic_loop",
    name: "代谢回路",
    description: "简单循环让能量输入转化为更稳定的生命活动。",
    cost: { energy: 120, stability: 36, mutation: 18 },
    requires: ["primitive_vesicle"]
  },
  {
    id: "proto_cell",
    name: "原初细胞",
    description: "潮池中出现最早可称为生命单位的结构。",
    cost: { organic: 160, biomass: 24, stability: 48 },
    requires: ["metabolic_loop"],
    unlocksEra: "proto_cell"
  },
  {
    id: "photo_pigment",
    name: "感光色素",
    description: "部分谱系开始利用光照改变能量结构。",
    cost: { energy: 240, mutation: 60, biomass: 70 },
    requires: ["proto_cell"],
    unlocksEra: "photosynthesis_eve"
  }
];

export const talentCatalog: Talent[] = [
  {
    id: "crystal_nursery",
    name: "矿晶温床",
    tier: 1,
    icon: "crystal",
    summary: "矿物质 +18%",
    description: "矿物晶面更容易捕获早期分子，结构稳定前的准备更快。",
    effects: { minerals: 0.18 }
  },
  {
    id: "storm_affinity",
    name: "闪电亲和",
    tier: 1,
    icon: "spark",
    summary: "能量 +16%",
    description: "闪电留下更高效的能量窗口，反应链更容易被点燃。",
    effects: { energy: 0.16, mutation: 0.04 }
  },
  {
    id: "tidal_memory",
    name: "潮汐记忆",
    tier: 1,
    icon: "tide",
    summary: "有机质 +16%",
    description: "潮汐反复带回有机分子，潮池更容易形成富集层。",
    effects: { organic: 0.16 }
  },
  {
    id: "membrane_bias",
    name: "稳膜倾向",
    tier: 1,
    icon: "membrane",
    summary: "稳定性 +14%",
    description: "薄膜结构更容易短暂维持，早期筛选压力被轻微缓和。",
    effects: { stability: 0.14 }
  },
  {
    id: "mutation_spark",
    name: "异变火花",
    tier: 1,
    icon: "mutation",
    summary: "突变点 +20%",
    description: "复制错误更容易被保留下来，异常谱系更早靠近潮池。",
    effects: { mutation: 0.2 }
  }
];

export function createInitialState(id: string, name = "始源潮池", initialTalentId?: string): GameState {
  const now = new Date().toISOString();
  const initialTalent = initialTalentId ? talentCatalog.find((talent) => talent.id === initialTalentId) : undefined;
  return {
    id,
    name,
    currentEra: "primordial_pool",
    resources: {
      organic: 0,
      energy: 0,
      minerals: 0,
      stability: 40,
      mutation: 0,
      biomass: 0
    },
    environment: {
      light: 1,
      tide: 1,
      heat: 1,
      mineralFlow: 1,
      volatility: 0.28
    },
    unlockedNodes: [],
    species: [],
    legacies: [],
    logs: [
      {
        id: cryptoId("log"),
        type: "system",
        message: initialTalent
          ? `生态「${name}」建立，源质印记「${initialTalent.name}」写入潮池。`
          : "系统接入始源潮池。温热浅水、矿物晶面与闪电正在等待第一段生命痕迹。",
        createdAt: now
      }
    ],
    talents: initialTalent ? [initialTalent] : [],
    pendingTalentChoices: [],
    planetProfile: "balanced",
    lastCalculatedAt: now,
    createdAt: now,
    updatedAt: now
  };
}

export function calculateResourceDelta(state: GameState, elapsedSeconds: number): Resources {
  const env = state.environment;
  const nodeBonus = 1 + state.unlockedNodes.length * 0.06;
  const speciesOrganic = sumSpeciesEffect(state, "organic");
  const speciesEnergy = sumSpeciesEffect(state, "energy");
  const legacyBonus = 1 + state.legacies.length * 0.02;
  const stabilityPressure = env.volatility * 0.012 + state.resources.mutation * 0.0002;

  const delta = {
    organic: elapsedSeconds * (0.18 * env.tide + 0.06 * env.heat + speciesOrganic) * nodeBonus * legacyBonus,
    energy: elapsedSeconds * (0.14 * env.light + 0.05 * env.heat + speciesEnergy) * nodeBonus,
    minerals: elapsedSeconds * (0.09 * env.mineralFlow + 0.02 * env.tide),
    stability: elapsedSeconds * (0.02 + state.species.length * 0.004 - stabilityPressure),
    mutation: elapsedSeconds * (0.025 * env.volatility + 0.006 * env.light + state.species.length * 0.001),
    biomass: elapsedSeconds * (state.unlockedNodes.includes("proto_cell") ? 0.07 + state.species.length * 0.008 : 0.005)
  };
  return applyTalentEffects(delta, state.talents ?? []);
}

export function advanceState(input: GameState, now = new Date()): GameState {
  const elapsedSeconds = Math.min(60 * 60 * 12, Math.max(0, (now.getTime() - new Date(input.lastCalculatedAt).getTime()) / 1000));
  if (elapsedSeconds < 1) {
    return input;
  }

  const delta = calculateResourceDelta(input, elapsedSeconds);
  const next = cloneState(input);
  for (const key of Object.keys(delta) as Array<keyof Resources>) {
    next.resources[key] = clamp(next.resources[key] + delta[key], 0, 999999);
  }

  next.resources.stability = clamp(next.resources.stability, 0, 100);
  next.planetProfile = calculatePlanetProfile(next);
  next.lastCalculatedAt = now.toISOString();
  next.updatedAt = now.toISOString();

  if (shouldCreateSpecies(next)) {
    const species = generateSpeciesTemplate(next);
    next.species.unshift(species);
    next.logs.unshift(createLog("species", `发现新谱系：${species.name}。${species.shortDescription}`));
  }

  if (shouldFossilize(next)) {
    const living = next.species.find((item) => item.status === "endangered" || item.status === "living");
    if (living) {
      living.status = "fossilized";
      const legacy = createLegacy(living);
      next.legacies.unshift(legacy);
      next.logs.unshift(createLog("legacy", `${living.name}退出当前生态，沉淀为遗产：${legacy.name}。`));
    }
  }

  return next;
}

export function applyEnvironmentAction(input: GameState, action: string): GameState {
  const next = cloneState(input);
  const now = new Date().toISOString();

  if (action === "catalyze") {
    next.resources.organic = clamp(next.resources.organic + 2 + next.environment.mineralFlow * 0.5, 0, 999999);
    next.resources.energy = clamp(next.resources.energy + 0.8 + next.environment.light * 0.3, 0, 999999);
    next.resources.minerals = clamp(next.resources.minerals + 0.4, 0, 999999);
    next.resources.mutation = clamp(next.resources.mutation + next.environment.volatility * 0.2, 0, 999999);
    next.logs.unshift(createLog("event", catalyzeMessage(next)));
  }

  if (action === "light") {
    spend(next.resources, { energy: 8 });
    next.environment.light = clamp(next.environment.light + 0.12, 0.4, 3);
    next.environment.volatility = clamp(next.environment.volatility + 0.03, 0, 2);
    next.logs.unshift(createLog("event", "增强光照：能量流提升，但潮池波动也变得更活跃。"));
  }

  if (action === "minerals") {
    spend(next.resources, { organic: 10 });
    next.environment.mineralFlow = clamp(next.environment.mineralFlow + 0.14, 0.4, 3);
    next.resources.stability = clamp(next.resources.stability + 2, 0, 100);
    next.logs.unshift(createLog("event", "矿物沉积：催化表面增加，部分反应获得更稳定的附着点。"));
  }

  if (action === "tide") {
    spend(next.resources, { energy: 12, stability: 3 });
    next.environment.tide = clamp(next.environment.tide + 0.16, 0.4, 3);
    next.environment.volatility = clamp(next.environment.volatility + 0.08, 0, 2);
    next.logs.unshift(createLog("event", "潮汐扰动：有机质被重新混合，脆弱结构承受新的筛选。"));
  }

  if (action === "heat") {
    spend(next.resources, { minerals: 8 });
    next.environment.heat = clamp(next.environment.heat + 0.1, 0.4, 3);
    next.resources.mutation = clamp(next.resources.mutation + 2, 0, 999999);
    next.logs.unshift(createLog("event", "提高温度：反应速度上升，突变倾向随之增强。"));
  }

  next.planetProfile = calculatePlanetProfile(next);
  next.updatedAt = now;
  return next;
}

export function unlockEvolutionNode(input: GameState, nodeId: string): GameState {
  const node = evolutionNodes.find((item) => item.id === nodeId);
  if (!node) {
    throw new Error("未知演化节点");
  }
  if (!canUnlockEvolutionNode(input, nodeId)) {
    throw new Error("演化条件尚未满足");
  }

  const next = cloneState(input);
  spend(next.resources, node.cost);
  next.unlockedNodes.push(nodeId);
  if (node.unlocksEra) {
    next.currentEra = node.unlocksEra;
    next.pendingTalentChoices = rollTalentChoices(next);
    next.logs.unshift(createLog("era", `纪元推进：${node.name}改变了潮池的生命史方向。`));
  } else {
    next.logs.unshift(createLog("system", `演化节点解锁：${node.name}。`));
  }
  next.planetProfile = calculatePlanetProfile(next);
  next.updatedAt = new Date().toISOString();
  return next;
}

export function selectTalent(input: GameState, talentId: string): GameState {
  const next = normalizeGameState(cloneState(input));
  const selected = next.pendingTalentChoices.find((talent) => talent.id === talentId);
  if (!selected) {
    throw new Error("源质印记不可用");
  }
  if (!next.talents.some((talent) => talent.id === selected.id)) {
    next.talents.push(selected);
  }
  next.pendingTalentChoices = [];
  next.logs.unshift(createLog("system", `新的源质印记「${selected.name}」融入生态。${selected.summary}`));
  next.updatedAt = new Date().toISOString();
  return next;
}

export function rollTalentChoices(state?: GameState, count = 3): Talent[] {
  const owned = new Set(state?.talents?.map((talent) => talent.id) ?? []);
  const pool = talentCatalog.filter((talent) => !owned.has(talent.id));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function normalizeGameState(state: GameState): GameState {
  return {
    ...state,
    talents: state.talents ?? [],
    pendingTalentChoices: state.pendingTalentChoices ?? []
  };
}

export function canUnlockEvolutionNode(state: GameState, nodeId: string): boolean {
  const node = evolutionNodes.find((item) => item.id === nodeId);
  if (!node || state.unlockedNodes.includes(nodeId)) {
    return false;
  }
  if (!node.requires.every((required) => state.unlockedNodes.includes(required))) {
    return false;
  }
  return hasResources(state.resources, node.cost);
}

export function calculatePlanetProfile(state: GameState): PlanetProfile {
  if (state.environment.volatility > 1.2 || state.resources.mutation > 220) return "high_mutation";
  if (state.legacies.length >= 3) return "cataclysmic";
  if (state.resources.stability > 75 && state.environment.volatility < 0.6) return "stable_pool";
  if (state.species.filter((item) => item.ecologicalRole === "symbiont").length >= 2) return "symbiotic";
  if (state.environment.heat > 1.8 || state.environment.mineralFlow > 1.8) return "extreme";
  return "balanced";
}

export function generateSpeciesTemplate(state: GameState): SpeciesRecord {
  const now = new Date().toISOString();
  const role = pickRole(state);
  const names: Record<EcologicalRole, string[]> = {
    producer: ["蓝膜浮群", "浅光薄膜菌", "晨潮色素体"],
    decomposer: ["灰晶分解链", "沉积裂解群", "泥隙回收体"],
    symbiont: ["共膜潮胞", "双环互养体", "矿光共生群"],
    extremophile: ["热隙原胞", "铁纹耐盐体", "火山灰链群"],
    filterer: ["潮筛微囊", "浮层滤泡", "浅湾吞粒体"],
    catalyst: ["晶面催化群", "硫纹反应体", "电痕链体"]
  };
  const name = names[role][Math.floor(Math.random() * names[role].length)];
  const niche = pickNiche(state);
  const effects = roleEffects(role);

  return {
    id: cryptoId("sp"),
    parentSpeciesId: state.species[0]?.id,
    name,
    era: state.currentEra,
    niche,
    status: state.resources.stability < 22 ? "endangered" : "living",
    ecologicalRole: role,
    traits: traitsFor(role, state.planetProfile),
    vulnerabilities: vulnerabilitiesFor(state),
    numericEffects: effects,
    shortDescription: `${name}出现在${niche}，它们把当前潮池的${roleLabel(role)}能力推向新的分支。`,
    visualPrompt: `科学图鉴插画风格，${niche}中的${name}，矿物晶体、浅海潮池、微弱荧光`,
    lineageSummary: state.species[0] ? `被记录为 ${state.species[0].name} 之后的旁支谱系。` : "这是当前星球最早被记录的谱系之一。",
    legacyHint: "若在筛选事件中退出生态，可能形成早期谱系遗产。",
    discoveredAt: now
  };
}

export function createLog(type: EvolutionLog["type"], message: string): EvolutionLog {
  return {
    id: cryptoId("log"),
    type,
    message,
    createdAt: new Date().toISOString()
  };
}

function shouldCreateSpecies(state: GameState) {
  if (state.species.length === 0 && state.unlockedNodes.includes("replicating_chain")) return true;
  if (state.species.length >= 12) return false;
  const pressure = state.resources.mutation + state.environment.volatility * 30 + state.unlockedNodes.length * 8;
  return pressure > 80 + state.species.length * 48 && Math.random() > 0.80;
}

function shouldFossilize(state: GameState) {
  if (state.species.length < 3) return false;
  return state.resources.stability < 14 && Math.random() > 0.82;
}

function createLegacy(species: SpeciesRecord): FossilLegacy {
  return {
    id: cryptoId("legacy"),
    sourceSpeciesId: species.id,
    name: `${species.name}遗痕`,
    type: species.ecologicalRole === "producer" ? "ancestor" : "fossil",
    description: `${species.name}没有完全消失，它的结构痕迹成为后续演化的参照。`,
    effect: "所有基础资源产出 +3%",
    createdAt: new Date().toISOString()
  };
}

function hasResources(resources: Resources, cost: Partial<Resources>) {
  return (Object.keys(cost) as Array<keyof Resources>).every((key) => resources[key] >= (cost[key] ?? 0));
}

function spend(resources: Resources, cost: Partial<Resources>) {
  if (!hasResources(resources, cost)) {
    throw new Error("资源不足");
  }
  for (const key of Object.keys(cost) as Array<keyof Resources>) {
    resources[key] -= cost[key] ?? 0;
  }
}

function sumSpeciesEffect(state: GameState, key: keyof Resources) {
  return state.species
    .filter((item) => item.status !== "extinct" && item.status !== "fossilized")
    .reduce((sum, item) => sum + (item.numericEffects[key] ?? 0), 0);
}

function pickRole(state: GameState): EcologicalRole {
  if (state.planetProfile === "extreme") return "extremophile";
  if (state.planetProfile === "symbiotic") return "symbiont";
  if (state.unlockedNodes.includes("photo_pigment")) return "producer";
  const roles: EcologicalRole[] = ["catalyst", "filterer", "decomposer", "producer"];
  return roles[Math.floor(Math.random() * roles.length)];
}

function pickNiche(state: GameState) {
  if (state.environment.mineralFlow > 1.5) return "矿物晶面";
  if (state.environment.tide > 1.5) return "潮汐薄膜带";
  if (state.environment.heat > 1.5) return "热泉边缘";
  return "始源潮池浅层";
}

function roleEffects(role: EcologicalRole): Partial<Resources> {
  const effects: Record<EcologicalRole, Partial<Resources>> = {
    producer: { energy: 0.09, organic: 0.03 },
    decomposer: { organic: 0.08, minerals: 0.02 },
    symbiont: { stability: 0.03, biomass: 0.03 },
    extremophile: { minerals: 0.06, mutation: 0.01 },
    filterer: { biomass: 0.04, stability: 0.02 },
    catalyst: { energy: 0.04, mutation: 0.02 }
  };
  return effects[role];
}

function traitsFor(role: EcologicalRole, profile: PlanetProfile) {
  const base: Record<EcologicalRole, string[]> = {
    producer: ["薄膜结构", "弱光捕获", "群体漂浮"],
    decomposer: ["沉积附着", "有机裂解", "慢速扩散"],
    symbiont: ["互养循环", "双层膜泡", "资源交换"],
    extremophile: ["耐热外壳", "金属离子利用", "高压适应"],
    filterer: ["微孔滤泡", "潮汐摄食", "颗粒捕获"],
    catalyst: ["晶面附着", "高能反应", "链式复制"]
  };
  return profile === "high_mutation" ? [...base[role], "异常突变"] : base[role];
}

function vulnerabilitiesFor(state: GameState) {
  const vulnerabilities = ["潮池干涸"];
  if (state.environment.light > 1.4) vulnerabilities.push("强光氧化");
  if (state.environment.heat > 1.4) vulnerabilities.push("热浪失稳");
  if (state.environment.mineralFlow > 1.5) vulnerabilities.push("矿物掩埋");
  return vulnerabilities;
}

function roleLabel(role: EcologicalRole) {
  const labels: Record<EcologicalRole, string> = {
    producer: "初级生产",
    decomposer: "物质回收",
    symbiont: "共生",
    extremophile: "极端适应",
    filterer: "过滤摄取",
    catalyst: "催化反应"
  };
  return labels[role];
}

function applyTalentEffects(delta: Resources, talents: Talent[]): Resources {
  const next = { ...delta };
  for (const talent of talents) {
    for (const key of Object.keys(talent.effects) as Array<keyof Resources>) {
      next[key] *= 1 + (talent.effects[key] ?? 0);
    }
  }
  return next;
}

function catalyzeMessage(state: GameState) {
  if (state.resources.organic < 22) return "矿物晶面捕获了一批有机分子，潮池里的反应开始变得清晰。";
  if (!state.unlockedNodes.includes("organic_richness")) return "有机质已经足够富集，潮池等待第一次结构跃迁。";
  if (!state.unlockedNodes.includes("replicating_chain")) return "薄膜边缘出现短暂链体，复制压力正在积累。";
  if (state.species.length === 0) return "异常链体在潮汐中留下痕迹，第一条谱系可能正在靠近。";
  return "潮池被再次催化，现有谱系改变了周围的能量流。";
}

function cloneState<T>(state: T): T {
  return JSON.parse(JSON.stringify(state)) as T;
}

function cryptoId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}
