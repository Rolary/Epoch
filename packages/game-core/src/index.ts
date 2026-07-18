import type {
  ChapterProgress,
  EcologicalRole,
  EcologyEvent,
  EcologyEventOption,
  EcologyResonance,
  EcologyResonanceResult,
  EvolutionLog,
  EvolutionNode,
  FossilLegacy,
  GameState,
  HabitatId,
  HiddenTraceRecord,
  LeaderboardScoreBreakdown,
  PlanetProfile,
  PoolEffect,
  ResourceKey,
  Resources,
  ShorelineStrategy,
  SpeciesRecord,
  Talent
} from "@eco-era/shared";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const RESOURCE_CAP = 1e18;
const RESONANCE_COOLDOWN_SECONDS = 60;
const FREQUENT_HARVEST_MIN_SECONDS = 10 * 60;
const FREQUENT_HARVEST_MAX_SECONDS = 90 * 60;
const OFFLINE_EFFECT_MIN_SECONDS = 10 * 60;
export const OFFLINE_ACCUMULATION_HOURS = 5;
const OFFLINE_ACCUMULATION_SECONDS = OFFLINE_ACCUMULATION_HOURS * 60 * 60;
const HIDDEN_TRACE_SCORE_CAP_RATIO = 0.15;

type HiddenTraceDefinition = Omit<HiddenTraceRecord, "discoveredAt"> & {
  matches: (state: GameState) => boolean;
};

const hiddenTraceDefinitions: HiddenTraceDefinition[] = [
  {
    id: "peaceful_route",
    name: "和平路线",
    description: "三种早期生命都留在水中，并共同维持住第一组循环。",
    echo: "远方回声：没有物种退场，循环也没有因此中断。",
    score: 2,
    rarity: "rare",
    visualCue: "pixel_glint",
    matches: (state) => hasEcologyCycleRoles(state)
      && !state.historyTags.includes("selection_pressure")
      && !state.species.some((species) => species.status === "extinct" || species.status === "fossilized"),
  },
  {
    id: "all_of_them",
    name: "我全都要",
    description: "光、沉积与滤孔同时留在水里，没有一种生命独占潮池。",
    echo: "远方回声：光、沉积与滤孔各占一处，没有谁挤满整片浅水。",
    score: 2,
    rarity: "rare",
    visualCue: "triple_current",
    matches: (state) => hasEcologyCycleRoles(state)
      && state.resources.stability >= 45
      && livingRoles(state).size >= 3,
  },
  {
    id: "add_water_add_flour",
    name: "面多了加水，水多了加面",
    description: "多了就调，少了就补，反复往复仍没有折断一条生命线。",
    echo: "远方回声：潮水带回所缺的材料，三种生命一直没有断粮。",
    score: 3,
    rarity: "legendary",
    visualCue: "triple_current",
    matches: (state) => state.hiddenTraces!.progress!.environmentSequence.join(",").endsWith("tide,minerals,tide,minerals,tide,minerals")
      && hasEcologyCycleRoles(state)
      && state.resources.stability >= 30
      && !state.species.some((species) => species.status === "extinct"),
  },
  {
    id: "one_more_tide",
    name: "再来一个潮汐",
    description: "第一组循环已经稳定，你仍继续观察了一个完整潮汐。",
    echo: "远方回声：结束之前，总还可以再等一回合。",
    score: 2,
    rarity: "rare",
    visualCue: "quiet_ripple",
    matches: (state) => state.chapterProgress?.stage === "complete"
      && state.hiddenTraces!.progress!.quietObservationSeconds >= 10 * 60,
  },
  {
    id: "quiet_unknown",
    name: "无名小卒",
    description: "没有单一物种占满水面，生产、分解和过滤安静地持续运转。",
    echo: "远方回声：这片水没有传奇，但每次回潮都还有生命活动。",
    score: 3,
    rarity: "legendary",
    visualCue: "quiet_ripple",
    matches: (state) => state.chapterProgress?.stage === "complete"
      && state.planetProfile === "stable_pool"
      && hasEcologyCycleRoles(state)
      && !state.hiddenTraces!.records.some((record) => record.id === "become_legend")
      && state.hiddenTraces!.progress!.actionCount <= 18
      && state.hiddenTraces!.progress!.quietObservationSeconds >= 20 * 60
      && !state.species.some((species) => species.status === "extinct"),
  },
  {
    id: "become_legend",
    name: "名扬天下",
    description: "一条罕见谱系连续熬过数次高压，并扩散到每次回潮抵达的位置。",
    echo: "远方回声：它占据了潮水反复经过的每一处浅滩。",
    score: 3,
    rarity: "legendary",
    visualCue: "neon_fault",
    matches: (state) => state.hiddenTraces!.progress!.pressureEventsSurvived >= 3
      && !state.hiddenTraces!.records.some((record) => record.id === "quiet_unknown")
      && state.species.some((species) => ["extremophile", "catalyst"].includes(species.ecologicalRole)
        && (species.status === "living" || species.status === "flourishing"))
      && livingRoles(state).size >= 2,
  },
];

type PoolEffectTemplate = Omit<PoolEffect, "startedAt" | "expiresAt"> & { durationMinutes: number };

const poolEffectTemplates: PoolEffectTemplate[] = [
  {
    id: "clear_tide_afterglow",
    title: "清潮余波",
    description: "一阵清潮在你离开时洗过池底，水体变得更透亮，接下来一段时间里能量与有机质会更容易积累。",
    effectLabel: "能量 +18% · 有机质 +12%",
    tone: "buff",
    resourceMultipliers: { energy: 1.18, organic: 1.12 },
    durationMinutes: 30,
  },
  {
    id: "mineral_warm_current",
    title: "矿暖回流",
    description: "退潮露出的矿晶把余热留在浅水里，接下来一段时间里矿物质与有机质会更快汇入潮池。",
    effectLabel: "矿物质 +20% · 有机质 +10%",
    tone: "buff",
    resourceMultipliers: { minerals: 1.2, organic: 1.1 },
    durationMinutes: 25,
  },
  {
    id: "turbid_bloom",
    title: "浑浊繁盛",
    description: "薄膜在你离开时迅速铺满水面，生物量仍会加快增长，但遮住水面的浑浊会暂时拖慢能量积累。",
    effectLabel: "生物量 +24% · 能量 -18%",
    tone: "mixed",
    resourceMultipliers: { biomass: 1.24, energy: 0.82 },
    durationMinutes: 25,
  },
  {
    id: "restless_shallows",
    title: "浅水震荡",
    description: "反复回潮在你离开时搅动了脆弱结构，突变机会随之增多，但有机质的沉积会暂时放缓。",
    effectLabel: "突变点 +22% · 有机质 -12%",
    tone: "mixed",
    resourceMultipliers: { mutation: 1.22, organic: 0.88 },
    durationMinutes: 20,
  },
  {
    id: "oxygen_hush",
    title: "缺氧闷潮",
    description: "过密的薄膜在你离开时阻碍了水面交换，水体需要一段时间恢复，能量与生物量积累会暂时变慢。",
    effectLabel: "能量 -15% · 生物量 -10%",
    tone: "debuff",
    resourceMultipliers: { energy: 0.85, biomass: 0.9 },
    durationMinutes: 15,
  },
];

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
    description: "少数链体已经能够复制自身结构。",
    cost: { organic: 70, minerals: 25, stability: 12 },
    requires: ["organic_richness"],
    unlocksEra: "self_replicators"
  },
  {
    id: "replication_fidelity",
    name: "高保真复制",
    description: "复制链更少出错，潮池更容易稳定延续，但突变机会减少。",
    cost: { organic: 42, energy: 24, minerals: 16 },
    requires: ["replicating_chain"],
    branchGroupId: "replication_strategy",
    branchHint: "三种复制方式只能选择一种。"
  },
  {
    id: "error_retention",
    name: "错误保留",
    description: "一部分复制错误被保留下来，带来更多可能，也让潮池更不安定。",
    cost: { organic: 42, energy: 24, minerals: 16 },
    requires: ["replicating_chain"],
    branchGroupId: "replication_strategy",
    branchHint: "三种复制方式只能选择一种。"
  },
  {
    id: "primitive_vesicle",
    name: "原始膜泡",
    description: "薄膜结构把反应环境与外界潮水短暂隔开。",
    cost: { organic: 90, energy: 32, minerals: 30 },
    requires: ["replicating_chain"]
  },
  {
    id: "fragment_budding",
    name: "断裂繁殖",
    description: "链体断裂后仍能延续，旁支谱系更容易出现。",
    cost: { organic: 42, energy: 24, minerals: 16 },
    requires: ["replicating_chain"],
    branchGroupId: "replication_strategy",
    branchHint: "三种复制方式只能选择一种。"
  },
  {
    id: "metabolic_loop",
    name: "代谢回路",
    description: "简单循环让能量输入转化为更稳定的生命活动。",
    cost: { energy: 150, stability: 44, mutation: 26 },
    requires: ["primitive_vesicle"]
  },
  {
    id: "proto_cell",
    name: "原初细胞",
    description: "潮池中出现最早可称为生命单位的结构。",
    cost: { organic: 190, biomass: 40, stability: 58 },
    requires: ["metabolic_loop"],
    unlocksEra: "proto_cell"
  },
  {
    id: "photo_pigment",
    name: "感光色素",
    description: "部分谱系形成感光结构，能够利用浅水中的光照。",
    cost: { energy: 300, mutation: 82, biomass: 95 },
    requires: ["proto_cell"],
    unlocksEra: "photosynthesis_eve"
  },
  {
    id: "early_producer_film",
    name: "早期生产薄膜",
    description: "追逐光照的谱系在水面铺开，把光转成可被潮池继续使用的能量。",
    cost: { energy: 250, biomass: 115, mutation: 48 },
    requires: ["photo_pigment"]
  },
  {
    id: "decomposition_layer",
    name: "沉积分解层",
    description: "旧薄膜和碎片沉入池底，分解谱系把它们拆回可用材料。",
    cost: { organic: 270, minerals: 110, biomass: 125 },
    requires: ["early_producer_film"]
  },
  {
    id: "tidal_filter_pores",
    name: "潮筛滤孔",
    description: "微小孔隙反复筛取潮水中的颗粒，滤食角色稳定出现。",
    cost: { organic: 245, biomass: 170, stability: 46 },
    requires: ["decomposition_layer"]
  },
  {
    id: "mutual_ecology_cycle",
    name: "互养小循环",
    description: "生产薄膜、分解层和滤食孔隙交换材料，形成第一个小生态循环。",
    cost: { organic: 360, energy: 280, stability: 64 },
    requires: ["tidal_filter_pores"]
  },
  {
    id: "ecological_personality",
    name: "潮池的样子",
    description: "反复出现的环境变化被记录下来，形成长期生态倾向。",
    cost: { biomass: 340, stability: 36, mutation: 72 },
    requires: ["mutual_ecology_cycle"]
  },
  {
    id: "waterline_exposure",
    name: "水线显现",
    description: "第一阵生态往复推到潮池边缘，退潮开始露出仍然湿润的岩面。",
    cost: { energy: 420, minerals: 180, stability: 42 },
    requires: ["ecological_personality"]
  },
  {
    id: "shore_attachment",
    name: "湿岸附着",
    description: "已有生命能随水流抵达湿岩，能否停留取决于自身结构和附着条件。",
    cost: { organic: 360, minerals: 160, biomass: 220 },
    requires: ["waterline_exposure"]
  },
  {
    id: "shoreline_exchange",
    name: "岸线往返",
    description: "回潮开始把岸边碎屑带回浅水，水线两侧逐渐交换材料。",
    cost: { organic: 420, energy: 280, biomass: 360, stability: 24 },
    requires: ["shore_attachment"]
  }
];

export const ecologyEvents: EcologyEvent[] = [
  {
    id: "hot_spring_pulse",
    title: "热泉短暂喷发",
    description: "潮池边缘升温，薄膜开始颤动。高温加快反应，也让脆弱结构更容易散开。",
    tendencyTag: "耐热倾向",
    options: [
      {
        id: "approach_heat",
        title: "靠近热泉",
        description: "利用高温带来的能量与矿物，让后来的结构更耐热。",
        resourceEffect: { energy: 34, minerals: 18, stability: -10 },
        environmentEffect: { heat: 0.18, volatility: 0.08 },
        addHistoryTags: ["heat_tolerant", "volatile"],
        logMessage: "热泉把潮池边缘点亮，后来的结构开始带上一点耐热倾向。"
      },
      {
        id: "retreat_shallows",
        title: "退回浅水",
        description: "避开最剧烈的喷发，优先维持薄膜结构。",
        resourceEffect: { stability: 14, organic: 12 },
        environmentEffect: { heat: -0.06, volatility: -0.04 },
        addHistoryTags: ["stable_membrane"],
        logMessage: "潮池退回浅水，薄膜没有追逐热量，却留下了更稳的边界。"
      },
      {
        id: "test_adaptation",
        title: "让部分结构尝试适应",
        description: "把一小段谱系推向热泉边缘，赌它们能留下新习性。",
        resourceEffect: { mutation: 18, biomass: -4 },
        environmentEffect: { heat: 0.08, volatility: 0.04 },
        addHistoryTags: ["heat_tolerant", "selection_pressure"],
        logMessage: "一部分结构靠近热泉，耐热结构的存活比例随之上升。"
      }
    ]
  },
  {
    id: "tidal_memory_surge",
    title: "回潮带来陌生碎片",
    description: "潮水把远处的有机碎片冲回池内，水面短暂变得浑浊而丰厚。",
    tendencyTag: "潮汐富集",
    options: [
      {
        id: "hold_fragments",
        title: "截留碎片",
        description: "让潮池优先积累有机质，但水体会更拥挤。",
        resourceEffect: { organic: 46, stability: -6 },
        environmentEffect: { tide: 0.16 },
        addHistoryTags: ["tidal_rich", "crowded_soup"],
        logMessage: "回潮碎片被留在池中，潮池似乎更容易形成富集层。"
      },
      {
        id: "rinse_pool",
        title: "换入清潮",
        description: "放走一部分碎片，换来更稳定的浅水环境。",
        resourceEffect: { stability: 18, minerals: 8 },
        environmentEffect: { tide: 0.06, volatility: -0.06 },
        addHistoryTags: ["clear_tide"],
        logMessage: "清潮洗过池底，早期结构少了一些拥挤，多了一点秩序。"
      },
      {
        id: "feed_edges",
        title: "喂给边缘薄膜",
        description: "让边缘结构先吸收碎片，推动更早的物种分化。",
        resourceEffect: { organic: 24, biomass: 10, mutation: 8 },
        environmentEffect: { tide: 0.08 },
        addHistoryTags: ["edge_feeding", "branching"],
        logMessage: "回潮碎片先聚集到潮池边缘，旁支谱系的出现率随之上升。"
      }
    ]
  },
  {
    id: "lightning_window",
    title: "近岸闪电落下",
    description: "亮白电光劈入浅水，短暂形成高能反应条件。",
    tendencyTag: "高能突变",
    options: [
      {
        id: "catch_charge",
        title: "引导电光",
        description: "获得大量能量和突变点，但潮池会剧烈震荡。",
        resourceEffect: { energy: 58, mutation: 24, stability: -14 },
        environmentEffect: { light: 0.14, volatility: 0.12 },
        addHistoryTags: ["charged", "volatile"],
        logMessage: "闪电把浅水点亮，高能反应在之后的潮汐中更容易出现。"
      },
      {
        id: "ground_crystals",
        title: "导入矿晶",
        description: "让矿物晶面吸收电荷，形成较温和的催化条件。",
        resourceEffect: { energy: 26, minerals: 20, stability: 4 },
        environmentEffect: { mineralFlow: 0.1 },
        addHistoryTags: ["mineral_catalyst"],
        logMessage: "矿晶积累了电荷，后来的链体更容易贴着晶面反应。"
      },
      {
        id: "preserve_errors",
        title: "保留异常链体",
        description: "保留闪电后的错误结构，推动突变路线更早显形。",
        resourceEffect: { mutation: 38, organic: 8 },
        environmentEffect: { volatility: 0.08 },
        addHistoryTags: ["charged", "mutation_biased"],
        logMessage: "异常链体没有被清掉，潮池似乎开始偏爱变化。"
      }
    ]
  },
  {
    id: "mineral_shelf_exposed",
    title: "池底矿架露出",
    description: "潮水退去后，一片细小矿架暴露出来，像是给分子准备的落脚处。",
    tendencyTag: "矿晶依赖",
    options: [
      {
        id: "coat_shelf",
        title: "覆盖有机膜",
        description: "把有机质铺上矿架，催化更稳的早期结构。",
        resourceEffect: { organic: -8, minerals: 34, stability: 12 },
        environmentEffect: { mineralFlow: 0.14 },
        addHistoryTags: ["mineral_catalyst", "stable_membrane"],
        logMessage: "有机膜覆盖矿架，晶面成为新结构的附着基础。"
      },
      {
        id: "break_shelf",
        title: "击碎矿架",
        description: "释放更多矿物颗粒，但会扰乱已有薄膜。",
        resourceEffect: { minerals: 52, mutation: 10, stability: -8 },
        environmentEffect: { mineralFlow: 0.18, volatility: 0.05 },
        addHistoryTags: ["mineral_catalyst", "selection_pressure"],
        logMessage: "矿架碎成细粒，水中附着面增加，同时产生了轻微筛选压力。"
      },
      {
        id: "leave_shelter",
        title: "保留庇护缝隙",
        description: "让薄膜躲进矿架缝隙，牺牲速度换取延续。",
        resourceEffect: { stability: 22, biomass: 6 },
        environmentEffect: { mineralFlow: 0.06, volatility: -0.03 },
        addHistoryTags: ["sheltered", "stable_membrane"],
        logMessage: "矿架缝隙成了庇护处，潮池里的延续感更明显了。"
      }
    ]
  },
  {
    id: "bloom_pressure",
    title: "繁盛薄膜阻碍水面交换",
    description: "追光的薄膜在水面迅速铺开，潮池变得丰厚，却也让下层生命更难呼吸。",
    tendencyTag: "生态失衡",
    options: [
      {
        id: "thin_bloom",
        title: "削薄表层薄膜",
        description: "保留生产者的光能优势，同时让下层水体重新流动。",
        resourceEffect: { stability: 16, biomass: -12, energy: 18 },
        environmentEffect: { light: 0.04, volatility: -0.06 },
        addHistoryTags: ["ecology_imbalance_faced", "stable_cycle"],
        logMessage: "潮池削薄了过盛薄膜，光重新照进浅层，下层生命也获得了空间。"
      },
      {
        id: "feed_decomposers",
        title: "加强池底分解",
        description: "让分解层处理过剩薄膜，回收更多材料，但水体会短暂浑浊。",
        resourceEffect: { organic: 42, minerals: 18, stability: -8 },
        environmentEffect: { tide: 0.08, volatility: 0.05 },
        addHistoryTags: ["ecology_imbalance_faced", "decomposer_cycle"],
        logMessage: "过盛薄膜沉入分解层，被拆成可再次利用的材料。"
      },
      {
        id: "let_bloom_select",
        title: "让繁盛自行筛选",
        description: "不急着干预，让耐受者和滤食者从压力里分化出来。",
        resourceEffect: { biomass: 28, mutation: 18, stability: -14 },
        environmentEffect: { volatility: 0.1 },
        addHistoryTags: ["ecology_imbalance_faced", "selection_pressure", "branching"],
        logMessage: "繁盛压力继续存在，滤食与耐受结构的存活比例随之上升。"
      }
    ]
  },
  {
    id: "murky_low_oxygen",
    title: "浑浊水体压低呼吸",
    description: "繁盛后的碎屑悬在水中，浅层光照还在，下层却开始缺少可用空间。",
    tendencyTag: "浑浊缺氧",
    options: [
      {
        id: "open_filter_channels",
        title: "打开滤食孔隙",
        description: "让滤食者优先清理悬浮颗粒，水体会变清，但生物量增长会慢下来。",
        resourceEffect: { stability: 18, biomass: -8 },
        environmentEffect: { volatility: -0.08, tide: 0.04 },
        addHistoryTags: ["ecology_imbalance_faced", "filterer_balance", "stable_cycle"],
        logMessage: "滤食孔隙打开后，浑浊颗粒减少，过滤倾向成为长期生态特征。"
      },
      {
        id: "let_debris_feed",
        title: "让碎屑沉入分解层",
        description: "由分解者处理浑浊碎屑，提高材料回收，但短期稳定性会继续下降。",
        resourceEffect: { organic: 38, minerals: 16, stability: -10 },
        environmentEffect: { volatility: 0.05 },
        addHistoryTags: ["ecology_imbalance_faced", "decomposer_cycle"],
        logMessage: "碎屑沉入分解层，材料回收增加，水体浑浊也暂时加重。"
      },
      {
        id: "favor_surface_life",
        title: "维持表层受光",
        description: "让上层薄膜继续铺开，池底和清水会先承受拥挤。",
        resourceEffect: { energy: 34, biomass: 18, stability: -16 },
        environmentEffect: { light: 0.08, volatility: 0.07 },
        addHistoryTags: ["ecology_imbalance_faced", "bloom_resonance"],
        logMessage: "表层生命继续追光，生物量增加，下层空间与呼吸压力也随之上升。"
      }
    ]
  },
  {
    id: "decomposer_layer_spread",
    title: "分解层向外扩张",
    description: "池底分解者处理大量旧薄膜，回收效率升高，也占用了新生薄膜的附着空间。",
    tendencyTag: "分解扩张",
    options: [
      {
        id: "cap_decomposition",
        title: "限制分解层边界",
        description: "把分解层压回池底，让生产薄膜和滤食孔隙重新取得空间。",
        resourceEffect: { stability: 12, biomass: 8, organic: -10 },
        environmentEffect: { volatility: -0.05 },
        addHistoryTags: ["ecology_imbalance_faced", "stable_cycle"],
        logMessage: "分解层扩张受到限制，循环边界得以维持，材料回流也随之放慢。"
      },
      {
        id: "accept_recycling_boom",
        title: "接受回收爆发",
        description: "让分解层继续扩张，获得大量可用材料，但部分薄膜会被挤出浅层。",
        resourceEffect: { organic: 54, minerals: 24, biomass: -10, stability: -8 },
        environmentEffect: { tide: 0.06, volatility: 0.04 },
        addHistoryTags: ["ecology_imbalance_faced", "decomposer_cycle"],
        logMessage: "分解层短暂扩张，旧生命被迅速拆回材料，池底的回流变得更深。"
      },
      {
        id: "seed_symbiotic_edges",
        title: "留下互养边缘",
        description: "让生产薄膜和分解层在边缘交换材料，见效较慢，但可能形成共生种源。",
        resourceEffect: { stability: 8, organic: 18, energy: 10 },
        environmentEffect: { volatility: -0.02 },
        addHistoryTags: ["ecology_imbalance_faced", "symbiotic_seed"],
        logMessage: "薄膜与分解层在边缘交换材料，潮池第一次把冲突变成了互相接续。"
      }
    ]
  },
  {
    id: "ebb_dryness",
    title: "退潮晒痕",
    description: "退潮把水线推远了，薄水膜、湿岩和刚刚留下的附着痕正在迅速失去水分。",
    tendencyTag: "岸线取舍",
    options: [
      {
        id: "protect_moisture_film",
        title: "延缓薄水膜蒸发",
        description: "让浅水多停留一阵，替贴岸的生命挡住最先到来的干燥。",
        resourceEffect: { organic: -18, stability: 14, biomass: 8 },
        environmentEffect: { tide: 0.1, heat: -0.04, volatility: -0.03 },
        addHistoryTags: ["dry_wet_pressure", "moisture_retention", "shore_moisture_preserved"],
        logMessage: "一层薄水膜覆盖湿岩，水线退得更慢；第一处附着斑得以存活，更远岩面暂未扩张。"
      },
      {
        id: "expose_wet_rock",
        title: "让湿岩见光",
        description: "允许边缘完全暴露，让留下来的结构面对光、盐与干燥。",
        resourceEffect: { minerals: 34, mutation: 18, stability: -12 },
        environmentEffect: { heat: 0.1, volatility: 0.08 },
        addHistoryTags: ["dry_wet_pressure", "rock_attachment", "selection_pressure"],
        logMessage: "湿岩在光下结出浅色薄面，一部分薄膜收缩，仍有附着斑抓在岸边。"
      },
      {
        id: "return_to_shallows",
        title: "随回潮退回浅水",
        description: "不强留岸边，让这次尝试跟着下一阵水回到原有循环。",
        resourceEffect: { organic: 26, biomass: 14, stability: 8 },
        environmentEffect: { tide: 0.12, volatility: -0.02 },
        addHistoryTags: ["dry_wet_pressure", "tidal_dispersal", "shallow_cycle_recovered"],
        logMessage: "岸痕跟着回流水纹变淡，碎屑被带回池中，浅水循环先恢复了呼吸。"
      }
    ]
  }
];

export const ecologyResonances: EcologyResonance[] = [
  {
    id: "decomposer_feeds_producer",
    title: "分解层回喂受光薄膜",
    description: "观察沉积层把旧薄膜拆回材料，再由浅光生产膜利用这些养分。",
    requiresRoles: ["producer", "decomposer"],
    resourceEffect: { organic: 28, energy: 18, stability: 4 },
    environmentEffect: { tide: 0.04 },
    addHistoryTags: ["producer_decomposer_resonance", "decomposer_cycle"],
    logMessage: "生态互动：分解层释放的材料进入受光薄膜，浅层生产得到补充。",
    resultSummary: "旧膜拆回材料，浅层更容易继续铺开。"
  },
  {
    id: "filter_pores_clear_tide",
    title: "滤孔清理浑浊水体",
    description: "让滤食孔隙过滤潮水里的颗粒，给脆弱薄膜留出更清的水层。",
    requiresRoles: ["producer", "filterer"],
    resourceEffect: { stability: 14, biomass: 10, organic: -6 },
    environmentEffect: { volatility: -0.06, tide: 0.03 },
    addHistoryTags: ["filterer_balance", "stable_cycle"],
    logMessage: "生态互动：滤食孔隙筛去浑浊颗粒，水体清澈度短暂上升。",
    resultSummary: "水体变清，过快的波动被慢慢筛掉。"
  },
  {
    id: "bloom_selection_pressure",
    title: "繁盛薄膜接受筛选",
    description: "不直接削去过盛薄膜，而是让滤食者和耐受者从拥挤里分出道路。",
    requiresRoles: ["producer", "filterer"],
    resourceEffect: { biomass: 20, mutation: 14, stability: -8 },
    environmentEffect: { volatility: 0.07 },
    addHistoryTags: ["bloom_resonance", "selection_pressure", "branching"],
    logMessage: "生态互动：繁盛薄膜经历筛选，生物量上升，浅层空间也更加拥挤。",
    resultSummary: "薄膜继续分开道路，清水会先承压。"
  }
];

export const talentCatalog: Talent[] = [
  // ── Common 永久 ──
  {
    id: "crystal_nursery",
    name: "矿晶温床", tier: 1, rarity: "common", weight: 50,
    icon: "crystal", summary: "矿物质 +18%",
    description: "矿物晶面更容易捕获早期分子，结构稳定前的准备更快。",
    effects: { minerals: 0.18 }
  },
  {
    id: "tidal_memory",
    name: "潮汐记忆", tier: 1, rarity: "common", weight: 50,
    icon: "tide", summary: "有机质 +16%",
    description: "潮汐反复带回有机分子，潮池更容易形成富集层。",
    effects: { organic: 0.16 }
  },
  {
    id: "warm_water",
    name: "暖水倾向", tier: 1, rarity: "common", weight: 50,
    icon: "spark", summary: "能量 +10%，有机质 +6%",
    description: "温热浅水让局部反应更活跃，分子碰撞频率提升。",
    effects: { energy: 0.10, organic: 0.06 }
  },
  {
    id: "trace_elements",
    name: "微量元素", tier: 1, rarity: "common", weight: 50,
    icon: "crystal", summary: "矿物质 +12%，稳定性 +5%",
    description: "微量元素提供更多催化表面，结构更易稳定。",
    effects: { minerals: 0.12, stability: 0.05 }
  },
  {
    id: "shallow_breath",
    name: "浅层呼吸", tier: 1, rarity: "common", weight: 50,
    icon: "tide", summary: "生物量 +15%，能量 +4%",
    description: "潮池表面的气液交换让基础代谢更加容易。",
    effects: { biomass: 0.15, energy: 0.04 }
  },
  // ── Common 一次性 ──
  {
    id: "energy_boost",
    name: "能量注入", tier: 1, rarity: "common", weight: 12,
    consumable: true, instantEffect: { energy: 50 },
    icon: "spark", summary: "+50 能量",
    description: "一次闪电近距离击中潮池，释放大量可吸收能量。",
    effects: {}
  },
  {
    id: "organic_surge",
    name: "富集催化", tier: 1, rarity: "common", weight: 12,
    consumable: true, instantEffect: { organic: 40 },
    icon: "tide", summary: "+40 有机质",
    description: "潮水异常携带大量有机碎片入池，分子密度瞬间升高。",
    effects: {}
  },
  {
    id: "mineral_seed",
    name: "矿物启动", tier: 1, rarity: "common", weight: 12,
    consumable: true, instantEffect: { minerals: 30 },
    icon: "crystal", summary: "+30 矿物质",
    description: "一块矿物晶体碎裂落入潮池，释放出丰富催化表面。",
    effects: {}
  },
  {
    id: "stability_fix",
    name: "稳态维护", tier: 1, rarity: "common", weight: 10,
    consumable: true, instantEffect: { stability: 80 },
    icon: "membrane", summary: "稳定性恢复到 80",
    description: "潮池短暂进入稳定期，脆弱结构的存活率随之提高。",
    effects: {}
  },
  {
    id: "mutation_seed",
    name: "突变种源", tier: 1, rarity: "common", weight: 10,
    consumable: true, instantEffect: { mutation: 25 },
    icon: "mutation", summary: "+25 突变点",
    description: "一段异常链体被冲回潮池，它的错误有可能变成新可能。",
    effects: {}
  },
  // ── Rare 永久 ──
  {
    id: "storm_affinity",
    name: "闪电亲和", tier: 1, rarity: "rare", weight: 30,
    icon: "spark", summary: "能量 +20%，突变 +6%",
    description: "闪电提高了能量利用效率，反应链更容易启动。",
    effects: { energy: 0.20, mutation: 0.06 }
  },
  {
    id: "deep_mineral",
    name: "深层矿脉", tier: 1, rarity: "rare", weight: 30,
    icon: "crystal", summary: "矿物质 +22%，稳定性 +6%",
    description: "潮池底部矿脉缓慢溶出，持续提供演化底物。",
    effects: { minerals: 0.22, stability: 0.06 }
  },
  {
    id: "tide_surge",
    name: "潮汐涌动", tier: 1, rarity: "rare", weight: 30,
    icon: "tide", summary: "有机质 +20%，能量 +8%",
    description: "潮汐节奏更深，每次回潮带回更多远海分子。",
    effects: { organic: 0.20, energy: 0.08 }
  },
  // ── Legendary 永久·特性 ──
  {
    id: "membrane_bias",
    name: "稳膜倾向", tier: 1, rarity: "legendary", weight: 18,
    icon: "membrane", summary: "稳定性 +18% · 膜泡庇护",
    description: "薄膜结构更容易短暂维持，低稳定性时自动恢复。",
    effects: { stability: 0.18 },
    trait: { id: "membrane_shelter", name: "膜泡庇护", desc: "稳定性<25时自动消耗8能量恢复12稳定性" }
  },
  {
    id: "symbiosis_net",
    name: "共生网络", tier: 1, rarity: "legendary", weight: 18,
    icon: "membrane", summary: "有机质 +16% · 生态共振",
    description: "物种间形成微弱互养，现存谱系越多，基础产出越高。",
    effects: { organic: 0.16 },
    trait: { id: "eco_resonance", name: "生态共振", desc: "每有1个现存或繁盛物种，所有基础产出+1.5%（上限15%）" }
  },
  {
    id: "cataclysm_ward",
    name: "灾变预警", tier: 1, rarity: "legendary", weight: 18,
    icon: "spark", summary: "能量 +16% · 适应缓冲",
    description: "潮池对极端事件有微弱预适应，负面反应概率降低。",
    effects: { energy: 0.16 },
    trait: { id: "adaptive_buffer", name: "适应缓冲", desc: "负面反馈概率从25%降至15%，且不会引发剧烈水面震动" }
  },
  {
    id: "split_growth",
    name: "分裂增殖", tier: 1, rarity: "legendary", weight: 18,
    icon: "crystal", summary: "矿物质 +16% · 复制遗产",
    description: "每次结构跃迁后残留的碎片成为下一次跃迁起点。",
    effects: { minerals: 0.16 },
    trait: { id: "replicate_legacy", name: "复制遗产", desc: "确认一项演化后返还40%所耗材料" }
  },
  // ── Legendary 一次性·高额 ──
  {
    id: "pool_boom",
    name: "潮池爆发", tier: 1, rarity: "legendary", weight: 10,
    consumable: true, instantEffect: { organic: 80, energy: 40 },
    icon: "tide", summary: "+80 有机质，+40 能量",
    description: "潮池短暂进入富集周期，大量有机分子集中涌现。",
    effects: {}
  },
  {
    id: "vein_break",
    name: "矿脉断裂", tier: 1, rarity: "legendary", weight: 10,
    consumable: true, instantEffect: { minerals: 60, stability: 30 },
    icon: "crystal", summary: "+60 矿物质，+30 稳定性",
    description: "池底矿脉断裂，矿物颗粒布满水面同时提供新附着点。",
    effects: {}
  },
  {
    id: "storm_surge",
    name: "闪电风暴", tier: 1, rarity: "legendary", weight: 10,
    consumable: true, instantEffect: { energy: 60, mutation: 30 },
    icon: "spark", summary: "+60 能量，+30 突变点",
    description: "连续闪电劈入浅水，高压等离子催化出异常链体。",
    effects: {}
  },
  {
    id: "soup_boil",
    name: "原始汤沸腾", tier: 1, rarity: "legendary", weight: 10,
    consumable: true, instantEffect: { organic: 50, energy: 30, minerals: 20 },
    icon: "tide", summary: "+50 有机质 +30 能量 +20 矿物质",
    description: "矿物与有机质在高温下剧烈混合，原始汤达到最大活性。",
    effects: {}
  },
  // ── Epic 永久·特性 ──
  {
    id: "mutation_spark",
    name: "异变火花", tier: 1, rarity: "epic", weight: 7,
    icon: "mutation", summary: "突变 +22% · 脉冲加速",
    description: "复制错误更容易被保留，且每4次催化触发脉冲生成。",
    effects: { mutation: 0.22 },
    trait: { id: "pulse_surge", name: "脉冲加速", desc: "每吸收4份发光养料，额外生成1份突变脉冲" }
  },
  {
    id: "ancient_echo",
    name: "远古回声", tier: 1, rarity: "epic", weight: 7,
    icon: "crystal", summary: "有机质 +18% · 化石唤醒",
    description: "每次形成化石遗产，可能唤醒新的源质印记选择。",
    effects: { organic: 0.18 },
    trait: { id: "fossil_awaken", name: "化石唤醒", desc: "形成化石遗产时获得一次印记选择机会" }
  },
  {
    id: "chain_lightning",
    name: "闪电链击", tier: 1, rarity: "epic", weight: 7,
    icon: "spark", summary: "能量 +18% · 连锁反应",
    description: "吸收能量闪光时，可能带动附近的发光养料同时入池。",
    effects: { energy: 0.18 },
    trait: { id: "chain_reaction", name: "连锁反应", desc: "吸收能量闪光时，有50%概率带动附近2份养料入池" }
  },
  // ── Common 扩展 ──
  {
    id: "exposed_rock_bed",
    name: "露岩温床", tier: 1, rarity: "common", weight: 45,
    icon: "type_crystal", summary: "矿物质 +10%，有机质 +5%",
    description: "退潮后露出的粗糙岩面让分子更容易附着，早期富集更稳。",
    effects: { minerals: 0.10, organic: 0.05 }
  },
  {
    id: "shallow_filter_layer",
    name: "浅潮滤层", tier: 1, rarity: "common", weight: 45,
    icon: "type_tide", summary: "有机质 +9%，生物量 +5%",
    description: "细小潮沟反复筛入可用碎片，薄膜边缘获得更多养分。",
    effects: { organic: 0.09, biomass: 0.05 }
  },
  {
    id: "afterheat_sediment",
    name: "余热沉积", tier: 1, rarity: "common", weight: 40,
    icon: "type_spark", summary: "能量 +9%，稳定性 +4%",
    description: "沉积物缓慢释放白昼热量，使适宜反应的时间延长。",
    effects: { energy: 0.09, stability: 0.04 }
  },
  {
    id: "membrane_glimmer",
    name: "膜泡微光", tier: 1, rarity: "common", weight: 10,
    consumable: true, instantEffect: { stability: 18, biomass: 8 },
    icon: "type_membrane", summary: "+18 稳定性，+8 生物量",
    description: "一批脆弱膜泡短暂成形，为潮池留下可用的边界材料。",
    effects: {}
  },
  {
    id: "mutation_ember",
    name: "突变余烬", tier: 1, rarity: "common", weight: 10,
    consumable: true, instantEffect: { mutation: 18, energy: 12 },
    icon: "type_mutation", summary: "+18 突变点，+12 能量",
    description: "残留电痕点亮异常链体，少量错误被保存为新的可能。",
    effects: {}
  },
  // ── Rare 扩展 ──
  {
    id: "brine_cycle",
    name: "矿盐循环", tier: 1, rarity: "rare", weight: 26,
    icon: "type_crystal", summary: "矿物质 +16%，稳定性 +9%",
    description: "反复蒸发的盐壳让离子浓度更可预测，结构更容易停留。",
    effects: { minerals: 0.16, stability: 0.09 }
  },
  {
    id: "charge_tide_window",
    name: "电荷潮窗", tier: 1, rarity: "rare", weight: 26,
    icon: "type_spark", summary: "能量 +17%，有机质 +7%",
    description: "潮水带来的电荷差形成了温和的高能反应条件。",
    effects: { energy: 0.17, organic: 0.07 }
  },
  {
    id: "algae_film_prelude",
    name: "藻膜前奏", tier: 1, rarity: "rare", weight: 24,
    icon: "type_tide", summary: "生物量 +14%，能量 +10%",
    description: "最早的薄层色素出现在水面，使后续代谢更早利用光照。",
    effects: { biomass: 0.14, energy: 0.10 }
  },
  {
    id: "homeostatic_shell",
    name: "稳态壳层", tier: 1, rarity: "rare", weight: 24,
    icon: "type_membrane", summary: "稳定性 +16%，突变 +4%",
    description: "微小边界结构开始隔开内外环境，变化不再轻易散失。",
    effects: { stability: 0.16, mutation: 0.04 }
  },
  {
    id: "split_chain_bed",
    name: "裂链温床", tier: 1, rarity: "rare", weight: 22,
    icon: "type_mutation", summary: "突变 +14%，矿物质 +9%",
    description: "断裂的链体贴附在矿物表面，错误与催化互相保存。",
    effects: { mutation: 0.14, minerals: 0.09 }
  },
  // ── Legendary 扩展 ──
  {
    id: "deep_tide_greenhouse",
    name: "深潮温室", tier: 1, rarity: "legendary", weight: 15,
    icon: "type_tide", summary: "有机质 +14% · 深潮回补",
    description: "更深的潮槽像温室一样储存养料，低潮期也能缓慢回补。",
    effects: { organic: 0.14 },
    trait: { id: "deep_tide_refill", name: "深潮回补", desc: "有机质低于40时，潮汐倾向更容易补回有机质" }
  },
  {
    id: "lattice_memory",
    name: "晶格记忆", tier: 1, rarity: "legendary", weight: 15,
    icon: "type_crystal", summary: "矿物质 +14% · 晶面复写",
    description: "矿物晶格记录了成功反应的角度，后续结构更容易重复。",
    effects: { minerals: 0.14 },
    trait: { id: "lattice_rewrite", name: "晶面复写", desc: "矿晶相关事件更容易形成长期倾向" }
  },
  {
    id: "boundary_chorus",
    name: "边界合唱", tier: 1, rarity: "legendary", weight: 14,
    icon: "type_membrane", summary: "稳定性 +13% · 群膜共振",
    description: "多个膜泡以相近节奏涨缩，相邻边界能够分担水流冲击。",
    effects: { stability: 0.13 },
    trait: { id: "membrane_chorus", name: "群膜共振", desc: "稳定性与生物量加成更容易同时出现" }
  },
  {
    id: "post_disaster_revival",
    name: "灾后复苏", tier: 1, rarity: "legendary", weight: 14,
    icon: "type_spark", summary: "能量 +13% · 复苏窗口",
    description: "剧烈扰动后仍有能量梯度，下一轮生命能够利用这些残余能量。",
    effects: { energy: 0.13 },
    trait: { id: "revival_window", name: "复苏窗口", desc: "低稳定性后的恢复事件更容易获得正面效果" }
  },
  {
    id: "lineage_drift",
    name: "谱系偏航", tier: 1, rarity: "legendary", weight: 13,
    icon: "type_mutation", summary: "突变 +16% · 旁支偏航",
    description: "一部分谱系会主动偏离主流路线，让生态更早出现旁支。",
    effects: { mutation: 0.16 },
    trait: { id: "branch_drift", name: "旁支偏航", desc: "旁支、筛选与突变相关生命史更容易出现" }
  },
  // ── Epic 扩展·源初专属 ──
  {
    id: "stardust_catalyst",
    name: "星尘催化", tier: 1, rarity: "epic", weight: 6,
    icon: "epic_stardust_catalyst", summary: "矿物质 +15%，能量 +12% · 星尘反应",
    description: "微量陨尘落入潮池，陌生晶面让常规反应突然变得高效。",
    effects: { minerals: 0.15, energy: 0.12 },
    trait: { id: "stardust_reaction", name: "星尘反应", desc: "矿物与能量同时充足时，催化效果更强" }
  },
  {
    id: "black_tide_oath",
    name: "黑潮誓约", tier: 1, rarity: "epic", weight: 6,
    icon: "epic_black_tide_oath", summary: "有机质 +16%，突变 +11% · 黑潮沉约",
    description: "一次深色回潮带来未知有机碎片，提高了异常结构组合的出现率。",
    effects: { organic: 0.16, mutation: 0.11 },
    trait: { id: "black_tide_vow", name: "黑潮沉约", desc: "高波动与潮汐富集更容易同时形成长期倾向" }
  },
  {
    id: "protocell_herald",
    name: "原核先声", tier: 1, rarity: "epic", weight: 6,
    icon: "epic_protocell_herald", summary: "生物量 +16%，稳定性 +10% · 细胞前兆",
    description: "膜、代谢与复制结构短暂结合，形成了更完整的细胞轮廓。",
    effects: { biomass: 0.16, stability: 0.10 },
    trait: { id: "cellular_omen", name: "细胞前兆", desc: "膜泡与代谢结构形成后，更容易出现新物种" }
  },
  {
    id: "symbiosis_ember",
    name: "互养前体", tier: 1, rarity: "epic", weight: 5,
    icon: "epic_symbiosis_ember", summary: "稳定性 +12%，有机质 +12% · 共生倾向",
    description: "两类脆弱结构能够交换残余物，互养关系更容易形成。",
    effects: { stability: 0.12, organic: 0.12 },
    trait: { id: "symbiosis_seedling", name: "共生倾向", desc: "共生、滤食与边缘摄食更容易形成组合" }
  },
  {
    id: "genetic_return_tide",
    name: "遗传回潮", tier: 1, rarity: "epic", weight: 5,
    icon: "epic_genetic_return", summary: "突变 +13%，生物量 +13% · 遗传回响",
    description: "旧链体片段被潮水带回，其中的复制错误重新进入后续谱系。",
    effects: { mutation: 0.13, biomass: 0.13 },
    trait: { id: "genetic_echo", name: "遗传回响", desc: "形成化石或遗产时，更容易获得新的源质印记" }
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
          ? `潮池「${name}」形成，源质印记「${initialTalent.name}」开始长期生效。`
          : "温热浅水覆盖着矿物晶面，远处闪电为潮池带来第一批能量。",
        createdAt: now
      }
    ],
    talents: initialTalent ? [initialTalent] : [],
    pendingTalentChoices: [],
    consumedTalents: [],
    pendingEcologyEvent: null,
    activePoolEffect: null,
    chapterProgress: {
      chapter: "life_birth",
      stage: "life_birth",
      completedStages: [],
      ecologyCycleFormed: false,
      currentMoodLabel: "先让复杂分子形成稳定结构。",
      nextHintLabel: "继续积累，让生命开始追逐第一缕光。",
    },
    pendingEcologyResonances: [],
    resonanceHistory: [],
    lastResonanceAt: null,
    unclaimedResources: emptyResources(),
    lastHarvestedAt: now,
    codexObservations: [],
    chapterWitness: {
      ecologyBurst: emptyEcologyBurstWitness(),
      shorelineDifferentiation: emptyShorelineDifferentiationWitness(),
    },
    historyTags: initialTalent ? historyTagsForTalent(initialTalent.id) : [],
    eventHistory: [],
    hiddenTraces: emptyHiddenTraceState(),
    planetProfile: "balanced",
    lastCalculatedAt: now,
    createdAt: now,
    updatedAt: now
  };
}

export function calculateResourceDelta(state: GameState, elapsedSeconds: number): Resources {
  const env = state.environment;
  const multiplier = productionMultiplierFor(state);
  const speciesOrganic = sumSpeciesEffect(state, "organic");
  const speciesEnergy = sumSpeciesEffect(state, "energy");
  const mutationPressure = 0.045 * (state.resources.mutation / (state.resources.mutation + 600));
  const stabilityPressure = env.volatility * 0.012 + mutationPressure;
  const stabilityRecovery = state.resources.stability < 35 ? 0.035 : 0.02;

  // Trait: 生态共振 — each living/flourishing species gives +1.5% all resources (max 15%)
  const hasEcoResonance = (state.talents ?? []).some((t) => t.trait?.id === "eco_resonance");
  const livingCount = state.species.filter((s) => s.status === "living" || s.status === "flourishing").length;
  const resonanceBonus = hasEcoResonance ? 1 + Math.min(livingCount * 0.015, 0.15) : 1;

  const delta = {
    organic: elapsedSeconds * (0.18 * env.tide + 0.06 * env.heat + speciesOrganic) * multiplier.organic * legacyMultiplierFor(state, "organic") * resonanceBonus,
    energy: elapsedSeconds * (0.14 * env.light + 0.05 * env.heat + speciesEnergy) * multiplier.energy * legacyMultiplierFor(state, "energy") * resonanceBonus,
    minerals: elapsedSeconds * (0.09 * env.mineralFlow + 0.02 * env.tide) * multiplier.minerals * legacyMultiplierFor(state, "minerals") * resonanceBonus,
    stability: elapsedSeconds * (stabilityRecovery + state.species.length * 0.004 - stabilityPressure) * legacyMultiplierFor(state, "stability"),
    mutation: elapsedSeconds * (0.025 * env.volatility + 0.006 * env.light + state.species.length * 0.001) * multiplier.mutation * legacyMultiplierFor(state, "mutation") * resonanceBonus,
    biomass: elapsedSeconds * (state.unlockedNodes.includes("proto_cell") ? 0.07 + state.species.length * 0.008 : 0.005) * multiplier.biomass * legacyMultiplierFor(state, "biomass") * resonanceBonus
  };
  return applyActivePoolEffect(
    applyEcologyComboEffects(applyHistoryTagEffects(applyTalentEffects(delta, state.talents ?? []), state), state),
    state,
  );
}

export function unclaimedResourceCapacity(state: GameState): Resources {
  const baseline = calculateResourceDelta({ ...state, activePoolEffect: null }, OFFLINE_ACCUMULATION_SECONDS);
  return {
    organic: Math.max(0, baseline.organic),
    energy: Math.max(0, baseline.energy),
    minerals: Math.max(0, baseline.minerals),
    stability: 100,
    mutation: Math.max(0, baseline.mutation),
    biomass: Math.max(0, baseline.biomass),
  };
}

export function advanceState(input: GameState, now = new Date()): GameState {
  const normalized = normalizeGameState(input);
  const elapsedSeconds = Math.min(OFFLINE_ACCUMULATION_SECONDS, Math.max(0, (now.getTime() - new Date(normalized.lastCalculatedAt).getTime()) / 1000));
  if (elapsedSeconds < 1) {
    return normalized;
  }

  const delta = calculateResourceDelta(normalized, elapsedSeconds);
  const capacity = unclaimedResourceCapacity(normalized);
  const next = cloneState(normalized);
  if (next.chapterProgress?.stage === "complete") {
    next.hiddenTraces!.progress!.quietObservationSeconds += elapsedSeconds;
  }
  for (const key of Object.keys(delta) as Array<keyof Resources>) {
    next.unclaimedResources[key] = clamp((next.unclaimedResources[key] ?? 0) + delta[key], 0, capacity[key]);
  }

  next.unclaimedResources.stability = clamp(next.unclaimedResources.stability, 0, 100);
  next.planetProfile = calculatePlanetProfile(next);
  next.lastCalculatedAt = now.toISOString();
  next.updatedAt = now.toISOString();
  if (next.activePoolEffect && new Date(next.activePoolEffect.expiresAt).getTime() <= now.getTime()) {
    next.activePoolEffect = null;
  }
  if (!next.activePoolEffect && elapsedSeconds >= OFFLINE_EFFECT_MIN_SECONDS && next.unlockedNodes.length > 0) {
    next.activePoolEffect = rollOfflinePoolEffect(now);
    addLog(next, "event", `${next.activePoolEffect.description}${next.activePoolEffect.effectLabel}。`);
  }

  // Trait: 膜泡庇护 — when stability < 25, consume 8 energy to restore 12 stability
  const hasMembraneShelter = (next.talents ?? []).some((t) => t.trait?.id === "membrane_shelter");
  if (hasMembraneShelter && next.resources.stability < 25 && next.resources.energy >= 8) {
    next.resources.energy -= 8;
    next.resources.stability = clamp(next.resources.stability + 12, 0, 100);
    next.logs.unshift(createLog("system", "膜泡庇护：消耗8能量恢复12稳定性，潮池结构得到缓冲。"));
  }

  if (shouldCreateSpecies(next)) {
    const species = generateSpeciesTemplate(next);
    next.species.unshift(species);
    next.logs.unshift(createLog("species", `发现新谱系：${species.name}。${species.shortDescription}`));
  }

  const comboLog = createFirstComboLog(next);
  if (comboLog) {
    next.logs.unshift(comboLog);
  }

  if (shouldFossilize(next)) {
    const living = next.species.find((item) => item.status === "endangered" || item.status === "living");
    if (living) {
      living.status = "fossilized";
      const legacy = createLegacy(living);
      next.legacies.unshift(legacy);
      next.logs.unshift(createLog("legacy", `${living.name}退出当前生态，并形成遗产：${legacy.name}。`));

      // Trait: 化石唤醒 — each fossilization grants a new talent choice
      const hasFossilAwaken = (next.talents ?? []).some((t) => t.trait?.id === "fossil_awaken");
      if (hasFossilAwaken) {
        next.pendingTalentChoices = rollTalentChoices(next);
        next.logs.unshift(createLog("system", "远古回声：化石遗产唤醒了新的源质印记选择。"));
      }
    }
  }

  maybeAssignEcologyEvent(next);
  refreshChapterDerivedState(next, now);
  return evaluateHiddenTraces(next, now);
}

export function applyEnvironmentAction(input: GameState, action: string): GameState {
  const next = normalizeGameState(cloneState(input));
  const now = new Date().toISOString();
  recordHiddenAction(next, action, now);

  if (action === "guide_shore_tide") {
    guideShoreTide(next);
  }

  if (action === "harvest_tide") {
    const bonus = frequentHarvestBonus(next);
    const harvested = scaleResources(next.unclaimedResources, 1 + bonus);
    mergeResources(next.resources, harvested);
    next.unclaimedResources = emptyResources();
    next.lastHarvestedAt = now;
    addLog(next, "event", bonus > 0
      ? `潮汐余温仍在，收获提高${Math.round(bonus * 100)}%。`
      : "潮池把这一段积累推回水面，发光养分被收集起来。");
    maybeCreateCodexObservation(next);
  }

  if (action === "catalyze") {
    const wasQuiet = next.resources.organic < 1 && next.resources.energy < 1 && next.resources.minerals < 1;
    next.resources.organic = clamp(next.resources.organic + 2 + next.environment.mineralFlow * 0.5, 0, RESOURCE_CAP);
    next.resources.energy = clamp(next.resources.energy + 0.8 + next.environment.light * 0.3, 0, RESOURCE_CAP);
    next.resources.minerals = clamp(next.resources.minerals + 0.4, 0, RESOURCE_CAP);
    next.resources.stability = clamp(next.resources.stability + 0.25 + next.environment.mineralFlow * 0.08, 0, 100);
    next.resources.mutation = clamp(next.resources.mutation + next.environment.volatility * 0.2, 0, RESOURCE_CAP);
    addLog(next, "event", catalyzeMessage(next));
    if (wasQuiet) {
      addLog(next, "event", "这些微小变化还称不上生命，却会成为后来一切的底色。");
    }
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
    next.resources.mutation = clamp(next.resources.mutation + 2, 0, RESOURCE_CAP);
    next.logs.unshift(createLog("event", "提高温度：反应速度上升，突变倾向随之增强。"));
  }

  next.planetProfile = calculatePlanetProfile(next);
  maybeAssignEcologyEvent(next);
  refreshChapterDerivedState(next);
  next.updatedAt = now;
  return evaluateHiddenTraces(next, new Date(now));
}

export function unlockEvolutionNode(input: GameState, nodeId: string): GameState {
  const node = evolutionNodes.find((item) => item.id === nodeId);
  if (!node) {
    throw new Error("没有找到这项演化");
  }
  if (!canUnlockEvolutionNode(input, nodeId)) {
    throw new Error("演化条件尚未满足");
  }

  const next = normalizeGameState(cloneState(input));
  spend(next.resources, node.cost);
  next.unlockedNodes.push(nodeId);
  applyNodeHistoryEffects(next, nodeId);

  // Trait: 复制遗产 — refund 40% of node cost
  const hasReplicateLegacy = (next.talents ?? []).some((t) => t.trait?.id === "replicate_legacy");
  if (hasReplicateLegacy) {
    for (const key of Object.keys(node.cost) as Array<keyof Resources>) {
      const refund = (node.cost[key] ?? 0) * 0.4;
      next.resources[key] = clamp(next.resources[key] + refund, 0, key === "stability" ? 100 : RESOURCE_CAP);
    }
    next.logs.unshift(createLog("system", "复制遗产：结构跃迁残留物返还40%消耗。"));
  }

  if (node.unlocksEra) {
    next.currentEra = node.unlocksEra;
    next.pendingTalentChoices = rollTalentChoices(next);
    next.logs.unshift(createLog("era", `纪元推进：${node.name}改变了潮池的生命史方向。`));
  } else {
    next.logs.unshift(createLog("system", `确认演化：${node.name}。`));
  }
  const echo = mainlineEchoForNode(node.id);
  if (echo) {
    next.logs.unshift(createLog("event", echo));
  }
  if (node.branchGroupId) {
    next.historyTags = addUniqueTags(next.historyTags ?? [], [node.id]);
    next.logs.unshift(createLog("event", `复制链选择了「${node.name}」，后续生命将继承这种复制倾向。`));
  }
  next.planetProfile = calculatePlanetProfile(next);
  maybeAssignEcologyEvent(next);
  refreshChapterDerivedState(next);
  next.updatedAt = new Date().toISOString();
  recordHiddenAction(next, `evolution:${nodeId}`, next.updatedAt);
  return next;
}

export function availableEcologyEvents(state: GameState): EcologyEvent[] {
  const seen = new Set(state.eventHistory ?? []);
  const tags = new Set(state.historyTags ?? []);
  const talentIds = new Set((state.talents ?? []).map((talent) => talent.id));
  return ecologyEvents.filter((event) => {
    if (seen.has(event.id)) return false;
    if (event.id === "hot_spring_pulse") return state.unlockedNodes.includes("organic_richness") || state.environment.heat > 1.15 || tags.has("heat_tolerant") || talentIds.has("warm_water");
    if (event.id === "tidal_memory_surge") return state.resources.organic >= 18 || tags.has("tidal_rich") || talentIds.has("tidal_memory");
    if (event.id === "lightning_window") return state.resources.energy >= 18 || talentIds.has("storm_affinity") || talentIds.has("chain_lightning");
    if (event.id === "mineral_shelf_exposed") return state.resources.minerals >= 12 || tags.has("mineral_catalyst") || talentIds.has("crystal_nursery") || talentIds.has("deep_mineral");
    if (event.id === "bloom_pressure") return state.unlockedNodes.includes("mutual_ecology_cycle") || hasEcologyCycleRoles(state);
    if (event.id === "murky_low_oxygen") return state.unlockedNodes.includes("mutual_ecology_cycle") && (tags.has("filterer_seed") || tags.has("bloom_resonance"));
    if (event.id === "decomposer_layer_spread") return state.unlockedNodes.includes("decomposition_layer") && tags.has("decomposer_seed");
    if (event.id === "ebb_dryness") {
      const witness = normalizeChapterWitness(state).shorelineDifferentiation;
      return witness.chapterStarted && witness.shoreColonized && !witness.dryWetPressureWitnessed;
    }
    return true;
  });
}

export function rollEcologyEvent(state: GameState): EcologyEvent | null {
  if ((state.pendingTalentChoices ?? []).length > 0) return null;
  if (state.unlockedNodes.length === 0) return null;
  if (state.logs.slice(0, 14).some((log) => log.message.includes("潮池事件出现"))) return null;
  const eventChance = ecologyEventChanceFor(state);
  if (Math.random() > eventChance) return null;
  const events = availableEcologyEvents(state);
  if (events.length === 0) return null;
  const talentIds = new Set((state.talents ?? []).map((talent) => talent.id));
  const weighted = events.flatMap((event) => {
    const weight =
      (event.id === "hot_spring_pulse" && talentIds.has("warm_water")) ||
      (event.id === "tidal_memory_surge" && talentIds.has("tidal_memory")) ||
      (event.id === "lightning_window" && talentIds.has("storm_affinity")) ||
      (event.id === "mineral_shelf_exposed" && talentIds.has("crystal_nursery")) ||
      (event.id === "bloom_pressure" && state.unlockedNodes.includes("mutual_ecology_cycle")) ||
      (event.id === "murky_low_oxygen" && state.historyTags.includes("filterer_balance")) ||
      (event.id === "decomposer_layer_spread" && state.historyTags.includes("decomposer_cycle"))
        ? 2
        : 1;
    return Array.from({ length: weight }, () => event);
  });
  return weighted[Math.floor(Math.random() * weighted.length)] ?? null;
}

export function ecologyEventChanceFor(state: GameState): number {
  if (state.species.length === 0) return 0.06;
  if (state.chapterProgress?.chapter === "shoreline_differentiation") return 0.14;
  if (state.chapterProgress?.chapter === "ecology_burst") return 0.12;
  return 0.1;
}

export function applyEcologyEventChoice(input: GameState, eventId: string, optionId: string): GameState {
  const next = normalizeGameState(cloneState(input));
  const event = next.pendingEcologyEvent?.id === eventId ? next.pendingEcologyEvent : undefined;
  const option = event?.options.find((item) => item.id === optionId);
  if (!event || !option) {
    throw new Error("潮池事件不可用");
  }
  applyEventOption(next, option);
  next.pendingEcologyEvent = null;
  next.eventHistory = addUniqueTags(next.eventHistory ?? [], [event.id]);
  next.historyTags = addUniqueTags(next.historyTags ?? [], option.addHistoryTags ?? []);
  if (next.chapterProgress?.chapter === "ecology_burst" || ["bloom_pressure", "murky_low_oxygen", "decomposer_layer_spread"].includes(event.id)) {
    next.chapterWitness!.ecologyBurst.imbalanceWitnessed = true;
  }
  if (event.id === "ebb_dryness") {
    applyEbbDrynessOutcome(next, option.id);
  }
  const newTags = option.addHistoryTags ?? [];
  const hasEcho = newTags.some((tag) => (input.historyTags ?? []).includes(tag));
  next.logs.unshift(createLog("event", hasEcho ? `${option.logMessage} 这类变化正在成为潮池的性格。` : option.logMessage));
  if (["bloom_pressure", "murky_low_oxygen", "decomposer_layer_spread"].includes(event.id)
    && !next.species.some((species) => species.status === "extinct")) {
    next.hiddenTraces!.progress!.pressureEventsSurvived += 1;
  }
  next.planetProfile = calculatePlanetProfile(next);
  refreshChapterDerivedState(next);
  next.updatedAt = new Date().toISOString();
  recordHiddenAction(next, `event:${event.id}:${option.id}`, next.updatedAt);
  return evaluateHiddenTraces(next, new Date(next.updatedAt));
}

export function availableEcologyResonances(state: GameState, now = new Date()): EcologyResonance[] {
  const chapter = deriveChapterProgress(state);
  if (chapter.chapter !== "ecology_burst") return [];
  if (!["differentiate_roles", "form_cycle", "face_imbalance", "ecological_personality"].includes(chapter.stage)) return [];
  if (isResonanceOnCooldown(state, now)) return [];
  const roles = livingRoles(state);
  if (roles.size < 2) return [];
  return ecologyResonances.filter((resonance) =>
    resonance.requiresRoles.every((role) => roles.has(role)),
  );
}

export function applyEcologyResonance(input: GameState, resonanceId: string, now = new Date()): { state: GameState; resonanceResult: EcologyResonanceResult } {
  const next = normalizeGameState(cloneState(input));
  const resonance = availableEcologyResonances(next, now).find((item) => item.id === resonanceId);
  if (!resonance) {
    throw new Error(isResonanceOnCooldown(next, now) ? "水体仍在适应上一次互动" : "所需生态角色尚未形成稳定关系");
  }

  applyEventOption(next, {
    id: resonance.id,
    title: resonance.title,
    description: resonance.description,
    resourceEffect: resonance.resourceEffect,
    environmentEffect: resonance.environmentEffect,
    addHistoryTags: resonance.addHistoryTags,
    logMessage: resonance.logMessage
  });
  next.historyTags = addUniqueTags(next.historyTags ?? [], resonance.addHistoryTags);
  next.resonanceHistory = [...(next.resonanceHistory ?? []), resonance.id].slice(-12);
  next.lastResonanceAt = now.toISOString();
  next.chapterWitness!.ecologyBurst.firstResonanceWitnessed = true;
  next.logs.unshift(createLog("event", resonance.logMessage));
  next.planetProfile = calculatePlanetProfile(next);
  next.updatedAt = now.toISOString();
  refreshChapterDerivedState(next, now);
  recordHiddenAction(next, `resonance:${resonanceId}`, next.updatedAt);
  evaluateHiddenTraces(next, now);

  return {
    state: next,
    resonanceResult: {
      id: resonance.id,
      title: resonance.title,
      summary: resonance.resultSummary,
      resourceEffect: resonance.resourceEffect,
      environmentEffect: resonance.environmentEffect,
      historyTags: resonance.addHistoryTags
    }
  };
}

export function selectTalent(input: GameState, talentId: string): GameState {
  const next = normalizeGameState(cloneState(input));
  const selected = next.pendingTalentChoices.find((talent) => talent.id === talentId);
  if (!selected) {
    throw new Error("源质印记不可用");
  }
  next.pendingTalentChoices = [];
  if (selected.consumable) {
    // Instant effect: apply resources directly, don't add to talents
    if (selected.instantEffect) {
      for (const [key, val] of Object.entries(selected.instantEffect) as Array<[keyof Resources, number]>) {
        if (key === "stability") {
          // stability_fix: set to at least the target value
          next.resources.stability = clamp(Math.max(next.resources.stability, val), 0, 100);
        } else {
          next.resources[key] = clamp(next.resources[key] + val, 0, RESOURCE_CAP);
        }
      }
    }
    next.consumedTalents.push(selected.id);
    next.logs.unshift(createLog("system", `即时印记「${selected.name}」触发。${selected.summary}`));
  } else {
    if (!next.talents.some((talent) => talent.id === selected.id)) {
      next.talents.push(selected);
    }
    next.logs.unshift(createLog("system", `获得新的长期印记「${selected.name}」。${selected.summary}`));
  }
  next.updatedAt = new Date().toISOString();
  return next;
}

export function applyInstantEffect(state: GameState, talent: Talent): GameState {
  const next = cloneState(state);
  if (talent.instantEffect) {
    for (const [key, val] of Object.entries(talent.instantEffect) as Array<[keyof Resources, number]>) {
      if (key === "stability") {
        next.resources.stability = clamp(Math.max(next.resources.stability, val), 0, 100);
      } else {
        next.resources[key] = clamp(next.resources[key] + val, 0, RESOURCE_CAP);
      }
    }
  }
  next.consumedTalents.push(talent.id);
  next.logs.unshift(createLog("system", `即时印记「${talent.name}」触发。${talent.summary}`));
  next.pendingTalentChoices = [];
  next.updatedAt = new Date().toISOString();
  return next;
}

export function rollTalentChoices(state?: GameState, count = 3): Talent[] {
  const owned = new Set(state?.talents?.map((talent) => talent.id) ?? []);
  const consumed = new Set(state?.consumedTalents ?? []);
  const pool = talentCatalog.filter((talent) => !owned.has(talent.id) && !consumed.has(talent.id));
  if (pool.length === 0) return [];
  const result: Talent[] = [];
  const remaining = [...pool];
  for (let i = 0; i < count && remaining.length > 0; i++) {
    const totalWeight = remaining.reduce((sum, t) => sum + t.weight, 0);
    let roll = Math.random() * totalWeight;
    let accumulated = 0;
    let pickedIdx = 0;
    for (let j = 0; j < remaining.length; j++) {
      accumulated += remaining[j].weight;
      if (roll <= accumulated) {
        pickedIdx = j;
        break;
      }
    }
    if (pickedIdx >= remaining.length) pickedIdx = remaining.length - 1;
    result.push(remaining[pickedIdx]);
    remaining.splice(pickedIdx, 1);
  }
  // Cap: at most 1 consumable in the result set
  const consumables = result.filter((t) => t.consumable);
  if (consumables.length > 1) {
    consumables.sort((a, b) => b.weight - a.weight);
    // keep only the highest-weight consumable, replace others
    const poolNoConsumable = talentCatalog.filter(
      (t) => !owned.has(t.id) && !consumed.has(t.id) && !t.consumable && !result.some((r) => r.id === t.id),
    );
    for (let i = 1; i < consumables.length; i++) {
      const idx = result.indexOf(consumables[i]);
      if (poolNoConsumable.length > 0) {
        // weighted pick from non-consumable pool
        const ncTotal = poolNoConsumable.reduce((s, t) => s + t.weight, 0);
        let r2 = Math.random() * ncTotal;
        let acc = 0;
        let replaceIdx = 0;
        for (let k = 0; k < poolNoConsumable.length; k++) {
          acc += poolNoConsumable[k].weight;
          if (r2 <= acc) { replaceIdx = k; break; }
        }
        result[idx] = poolNoConsumable[replaceIdx];
        poolNoConsumable.splice(replaceIdx, 1);
      } else if (idx >= 0) {
        result.splice(idx, 1);
      }
    }
  }
  return result;
}

export function normalizeGameState(state: GameState): GameState {
  const normalized = {
    ...state,
    species: (state.species ?? []).map((species) => ({
      ...species,
      ...(species.habitats ? { habitats: normalizeHabitats(species.habitats) } : {}),
    })),
    logs: [...(state.logs ?? [])],
    talents: state.talents ?? [],
    pendingTalentChoices: state.pendingTalentChoices ?? [],
    consumedTalents: state.consumedTalents ?? [],
    pendingEcologyEvent: state.pendingEcologyEvent ?? null,
    activePoolEffect: normalizePoolEffect(state.activePoolEffect),
    pendingEcologyResonances: state.pendingEcologyResonances ?? [],
    resonanceHistory: state.resonanceHistory ?? [],
    lastResonanceAt: state.lastResonanceAt ?? null,
    unclaimedResources: { ...emptyResources(), ...(state.unclaimedResources ?? {}) },
    lastHarvestedAt: state.lastHarvestedAt ?? state.lastCalculatedAt ?? null,
    codexObservations: state.codexObservations ?? [],
    chapterWitness: normalizeChapterWitness(state),
    historyTags: state.historyTags ?? [],
    eventHistory: state.eventHistory ?? [],
    hiddenTraces: normalizeHiddenTraceState(state),
  };
  backfillUnlockedRoleSpecies(normalized);
  return {
    ...normalized,
    chapterProgress: deriveChapterProgress(normalized),
    pendingEcologyResonances: availableEcologyResonances(normalized)
  };
}

export type ThirdChapterDebugStage = "exposed" | "shore" | "event" | "exchange";

export function buildThirdChapterDebugSave(id: string, stage: ThirdChapterDebugStage = "exposed"): GameState {
  let save = createInitialState(id, "第三章验收潮池");
  const unlockOrder = [
    "organic_richness",
    "replicating_chain",
    "replication_fidelity",
    "primitive_vesicle",
    "metabolic_loop",
    "proto_cell",
    "photo_pigment",
    "early_producer_film",
    "decomposition_layer",
    "tidal_filter_pores",
    "mutual_ecology_cycle",
  ];

  for (const nodeId of unlockOrder) {
    save = {
      ...normalizeGameState(save),
      resources: { organic: 9999, energy: 9999, minerals: 9999, stability: 9999, mutation: 9999, biomass: 9999 },
    };
    if (canUnlockEvolutionNode(save, nodeId)) save = unlockEvolutionNode(save, nodeId);
  }

  if (save.pendingEcologyEvent?.id === "bloom_pressure") {
    save = applyEcologyEventChoice(save, "bloom_pressure", "thin_bloom");
  }
  save = {
    ...normalizeGameState(save),
    resources: { organic: 9999, energy: 9999, minerals: 9999, stability: 9999, mutation: 9999, biomass: 9999 },
  };
  if (canUnlockEvolutionNode(save, "ecological_personality")) {
    save = unlockEvolutionNode(save, "ecological_personality");
  }

  save = withDebugResources(save);
  if (canUnlockEvolutionNode(save, "waterline_exposure")) {
    save = unlockEvolutionNode(save, "waterline_exposure");
  }
  save.pendingEcologyEvent = null;

  if (["shore", "event", "exchange"].includes(stage)) {
    save = withDebugResources(save);
    if (canUnlockEvolutionNode(save, "shore_attachment")) {
      save = unlockEvolutionNode(save, "shore_attachment");
    }
    save.pendingEcologyEvent = null;
    save = applyEnvironmentAction(save, "guide_shore_tide");
    if (stage === "shore") save.pendingEcologyEvent = null;
  }

  if (stage === "exchange") {
    save = applyEcologyEventChoice(save, "ebb_dryness", "protect_moisture_film");
    save = withDebugResources(save);
    if (canUnlockEvolutionNode(save, "shoreline_exchange")) {
      save = unlockEvolutionNode(save, "shoreline_exchange");
    }
    save.pendingEcologyEvent = null;
  }

  return normalizeGameState({
    ...save,
    resources: { organic: 1200, energy: 1200, minerals: 1200, stability: 90, mutation: 420, biomass: 900 },
    updatedAt: new Date().toISOString(),
  });
}

function withDebugResources(save: GameState): GameState {
  return {
    ...normalizeGameState(save),
    resources: { organic: 9999, energy: 9999, minerals: 9999, stability: 9999, mutation: 9999, biomass: 9999 },
  };
}

function emptyHiddenTraceState(): NonNullable<GameState["hiddenTraces"]> {
  return {
    records: [],
    progress: {
      actionCount: 0,
      lastActionAt: null,
      environmentSequence: [],
      pressureEventsSurvived: 0,
      quietObservationSeconds: 0,
    },
  };
}

function normalizeHiddenTraceState(state: GameState): NonNullable<GameState["hiddenTraces"]> {
  const empty = emptyHiddenTraceState();
  const progress = state.hiddenTraces?.progress;
  return {
    records: [...(state.hiddenTraces?.records ?? [])],
    progress: {
      actionCount: progress?.actionCount ?? empty.progress!.actionCount,
      lastActionAt: progress?.lastActionAt ?? empty.progress!.lastActionAt,
      environmentSequence: [...(progress?.environmentSequence ?? [])].slice(-12),
      pressureEventsSurvived: progress?.pressureEventsSurvived ?? empty.progress!.pressureEventsSurvived,
      quietObservationSeconds: progress?.quietObservationSeconds ?? empty.progress!.quietObservationSeconds,
    },
  };
}

function recordHiddenAction(state: GameState, action: string, at: string) {
  const progress = state.hiddenTraces!.progress!;
  progress.actionCount += 1;
  progress.lastActionAt = at;
  progress.quietObservationSeconds = 0;
  if (action === "tide" || action === "minerals") {
    progress.environmentSequence = [...progress.environmentSequence, action].slice(-12);
  } else if (!action.startsWith("harvest_")) {
    progress.environmentSequence = [];
  }
}

export function evaluateHiddenTraces(input: GameState, now = new Date()): GameState {
  const state = input.hiddenTraces ? input : normalizeGameState(input);
  const discovered = new Set(state.hiddenTraces!.records.map((record) => record.id));

  for (const definition of hiddenTraceDefinitions) {
    if (discovered.has(definition.id) || !definition.matches(state)) continue;
    const { matches: _matches, ...record } = definition;
    state.hiddenTraces!.records.unshift({ ...record, discoveredAt: now.toISOString() });
    state.logs.unshift(createLog("event", `隐秘潮痕浮现：「${record.name}」。${record.description}`));
    discovered.add(record.id);
  }

  return state;
}

function backfillUnlockedRoleSpecies(state: GameState) {
  const nodeRoles: Array<[string, EcologicalRole, string]> = [
    ["early_producer_film", "producer", "它们把光照变成潮池可以继续使用的能量。"],
    ["decomposition_layer", "decomposer", "它们把旧薄膜和碎片拆回新的材料。"],
    ["tidal_filter_pores", "filterer", "它们反复筛入潮汐颗粒，让水体更容易维持秩序。"],
  ];

  for (const [nodeId, role, reason] of nodeRoles) {
    if (!state.unlockedNodes.includes(nodeId)) continue;
    if (state.species.some((item) => item.ecologicalRole === role)) continue;
    const species = generateSpeciesForRole(state, role, reason);
    state.species.unshift({
      ...species,
      id: `sp_migrated_${state.id}_${role}`,
      discoveredAt: state.updatedAt ?? state.lastCalculatedAt,
    });
  }
}

function emptyEcologyBurstWitness() {
  return {
    lightWitnessed: false,
    rolesWitnessed: [] as EcologicalRole[],
    firstResonanceWitnessed: false,
    cycleWitnessed: false,
    imbalanceWitnessed: false,
    personalityWitnessed: false,
  };
}

function emptyShorelineDifferentiationWitness() {
  return {
    chapterStarted: false,
    waterlineExposed: false,
    shoreColonized: false,
    habitatsWitnessed: [] as HabitatId[],
    dryWetPressureWitnessed: false,
    shorelineExchangeWitnessed: false,
    shorelineMemoryWitnessed: false,
    shorelineStrategy: undefined as ShorelineStrategy | undefined,
  };
}

function normalizeChapterWitness(state: GameState) {
  const witness = state.chapterWitness?.ecologyBurst ?? emptyEcologyBurstWitness();
  const shorelineWitness = state.chapterWitness?.shorelineDifferentiation ?? emptyShorelineDifferentiationWitness();
  const rolesFromSpecies = state.species
    .filter((item) => item.status === "living" || item.status === "flourishing")
    .map((item) => item.ecologicalRole)
    .filter((role): role is EcologicalRole => ["producer", "decomposer", "filterer"].includes(role));
  const rolesFromNodes: EcologicalRole[] = [];
  if (state.unlockedNodes.includes("early_producer_film")) rolesFromNodes.push("producer");
  if (state.unlockedNodes.includes("decomposition_layer")) rolesFromNodes.push("decomposer");
  if (state.unlockedNodes.includes("tidal_filter_pores")) rolesFromNodes.push("filterer");
  const rolesWitnessed = Array.from(new Set([...(witness.rolesWitnessed ?? []), ...rolesFromSpecies, ...rolesFromNodes]));
  return {
    ecologyBurst: {
      lightWitnessed: witness.lightWitnessed || state.unlockedNodes.includes("early_producer_film") || rolesFromSpecies.includes("producer"),
      rolesWitnessed,
      firstResonanceWitnessed: witness.firstResonanceWitnessed || (state.resonanceHistory?.length ?? 0) > 0,
      cycleWitnessed: witness.cycleWitnessed || state.unlockedNodes.includes("mutual_ecology_cycle") || hasEcologyCycleRoles(state),
      imbalanceWitnessed: witness.imbalanceWitnessed || (state.eventHistory ?? []).includes("bloom_pressure") || (state.historyTags ?? []).includes("ecology_imbalance_faced"),
      personalityWitnessed: witness.personalityWitnessed || state.unlockedNodes.includes("ecological_personality") || (state.historyTags ?? []).includes("ecological_personality"),
    },
    shorelineDifferentiation: {
      chapterStarted: Boolean(shorelineWitness.chapterStarted),
      waterlineExposed: shorelineWitness.waterlineExposed || (state.historyTags ?? []).includes("waterline_exposed"),
      shoreColonized: shorelineWitness.shoreColonized || (state.historyTags ?? []).includes("shore_colonized"),
      habitatsWitnessed: normalizeHabitats(shorelineWitness.habitatsWitnessed),
      dryWetPressureWitnessed: shorelineWitness.dryWetPressureWitnessed || (state.historyTags ?? []).includes("dry_wet_pressure"),
      shorelineExchangeWitnessed: shorelineWitness.shorelineExchangeWitnessed || (state.historyTags ?? []).includes("shoreline_exchange"),
      shorelineMemoryWitnessed: shorelineWitness.shorelineMemoryWitnessed || (state.historyTags ?? []).includes("shoreline_memory"),
      shorelineStrategy: normalizeShorelineStrategy(shorelineWitness.shorelineStrategy, state.historyTags ?? []),
    },
  };
}

function normalizeHabitats(habitats: HabitatId[] | undefined): HabitatId[] {
  const allowed = new Set<HabitatId>(["shallow_water", "intertidal_wet_rock", "moist_shore"]);
  return Array.from(new Set((habitats ?? []).filter((habitat): habitat is HabitatId => allowed.has(habitat))));
}

function normalizeShorelineStrategy(strategy: ShorelineStrategy | undefined, historyTags: string[]): ShorelineStrategy | undefined {
  const strategies: ShorelineStrategy[] = ["moisture_retention", "rock_attachment", "tidal_dispersal"];
  if (strategy && strategies.includes(strategy)) return strategy;
  return strategies.find((candidate) => historyTags.includes(candidate));
}

function markWitnessedRole(state: GameState, role: EcologicalRole) {
  const current = state.chapterWitness?.ecologyBurst.rolesWitnessed ?? [];
  state.chapterWitness!.ecologyBurst.rolesWitnessed = Array.from(new Set([...current, role]));
}

export function canUnlockEvolutionNode(state: GameState, nodeId: string): boolean {
  const node = evolutionNodes.find((item) => item.id === nodeId);
  if (!node || state.unlockedNodes.includes(nodeId)) {
    return false;
  }
  if (!node.requires.every((required) => state.unlockedNodes.includes(required))) {
    return false;
  }
  if (nodeId === "mutual_ecology_cycle" && !hasEcologyCycleRoles(state)) {
    return false;
  }
  if (nodeId === "ecological_personality" && !normalizeChapterWitness(state).ecologyBurst.imbalanceWitnessed) {
    return false;
  }
  if (nodeId === "waterline_exposure" && normalizeChapterWitness(state).ecologyBurst.personalityWitnessed !== true) {
    return false;
  }
  if (nodeId === "shore_attachment" && !normalizeChapterWitness(state).shorelineDifferentiation.waterlineExposed) {
    return false;
  }
  if (nodeId === "shoreline_exchange" && !normalizeChapterWitness(state).shorelineDifferentiation.dryWetPressureWitnessed) {
    return false;
  }
  if (node.branchGroupId) {
    const groupTaken = evolutionNodes.some(
      (item) => item.branchGroupId === node.branchGroupId && state.unlockedNodes.includes(item.id),
    );
    if (groupTaken) return false;
  }
  return hasResources(state.resources, node.cost);
}

export function calculatePlanetProfile(state: GameState): PlanetProfile {
  const tags = new Set(state.historyTags ?? []);
  if (tags.has("stable_cycle")) return "stable_pool";
  if (tags.has("decomposer_cycle") || tags.has("symbiotic_seed")) return "symbiotic";
  if (state.environment.volatility > 1.2 || state.resources.mutation > 220) return "high_mutation";
  if (state.legacies.length >= 3) return "cataclysmic";
  if (state.resources.stability > 75 && state.environment.volatility < 0.6) return "stable_pool";
  if (state.species.filter((item) => item.ecologicalRole === "symbiont").length >= 2) return "symbiotic";
  if (state.environment.heat > 1.8 || state.environment.mineralFlow > 1.8) return "extreme";
  return "balanced";
}

const ERA_SCORE: Record<GameState["currentEra"], number> = {
  primordial_pool: 0,
  self_replicators: 260,
  proto_cell: 640,
  photosynthesis_eve: 1040
};

export function calculateEcologyScore(input: GameState): number {
  const breakdown = calculateEcologyScoreBreakdown(input);
  return Math.max(0, Math.round(Object.values(breakdown).reduce((sum, value) => sum + value, 0)));
}

export function calculateEcologyScoreBreakdown(input: GameState): LeaderboardScoreBreakdown {
  const state = normalizeGameState(input);
  const livingSpecies = state.species.filter((item) => item.status !== "extinct" && item.status !== "fossilized").length;
  const resourceScore =
    cappedResourceScore(state.resources.organic, 1200, 0.055) +
    cappedResourceScore(state.resources.energy, 1200, 0.05) +
    cappedResourceScore(state.resources.minerals, 1200, 0.05) +
    cappedResourceScore(state.resources.biomass, 900, 0.09) +
    cappedResourceScore(state.resources.mutation, 700, 0.075) +
    Math.max(0, Math.min(100, state.resources.stability)) * 0.85;

  const base = {
    era: ERA_SCORE[state.currentEra],
    evolution: state.unlockedNodes.length * 115,
    species: livingSpecies * 90 + Math.max(0, state.species.length - livingSpecies) * 28,
    legacy: state.legacies.length * 72,
    talents: state.talents.length * 34 + new Set(state.consumedTalents ?? []).size * 12,
    resources: Math.round(resourceScore)
  };
  const baseTotal = Object.values(base).reduce((sum, value) => sum + value, 0);
  const rawHiddenScore = state.hiddenTraces!.records.reduce((sum, record) => sum + record.score, 0);
  const hiddenTraces = Math.min(rawHiddenScore, Math.floor(baseTotal * HIDDEN_TRACE_SCORE_CAP_RATIO));
  return hiddenTraces > 0 ? { ...base, hiddenTraces } : base;
}

function cappedResourceScore(value: number, cap: number, weight: number) {
  return Math.min(Math.max(0, value), cap) * weight;
}

export function productionMultiplierFor(state: GameState): Resources {
  const unlocked = new Set(state.unlockedNodes ?? []);
  const roles = livingRoles(state);
  const observations = state.codexObservations ?? [];
  const multipliers: Resources = {
    organic: 1,
    energy: 1,
    minerals: 1,
    stability: 1,
    mutation: 1,
    biomass: 1,
  };

  const all = (amount: number) => {
    for (const key of Object.keys(multipliers) as Array<keyof Resources>) multipliers[key] *= amount;
  };
  all(1 + (state.unlockedNodes?.length ?? 0) * 0.08);
  if (unlocked.has("replicating_chain")) {
    multipliers.organic *= 1.55;
    multipliers.mutation *= 1.25;
  }
  if (unlocked.has("proto_cell")) {
    multipliers.biomass *= 3.2;
    all(1.28);
  }
  if (unlocked.has("photo_pigment")) {
    multipliers.energy *= 2.5;
    multipliers.biomass *= 1.35;
  }
  if (roles.has("producer")) multipliers.energy *= 1.5;
  if (roles.has("decomposer")) {
    multipliers.organic *= 1.45;
    multipliers.minerals *= 1.25;
  }
  if (roles.has("filterer")) {
    multipliers.stability *= 1.25;
    multipliers.biomass *= 1.35;
  }
  if (roles.has("producer") && roles.has("decomposer")) {
    multipliers.organic *= 1.35;
    multipliers.energy *= 1.25;
  }
  if (hasEcologyCycleRoles(state) || unlocked.has("mutual_ecology_cycle")) {
    all(2.05);
  }
  if (unlocked.has("ecological_personality")) {
    all(1.65);
  }

  for (const observation of observations) {
    for (const [key, value] of Object.entries(observation.numericEffects ?? {}) as Array<[ResourceKey, number]>) {
      multipliers[key] *= 1 + value;
    }
  }
  return multipliers;
}

export function previewEvolutionNodeProduction(input: GameState, nodeId: string): { before: Resources; after: Resources; ratio: number; copy: string } {
  const state = normalizeGameState(input);
  const before = calculateResourceDelta(state, 3600);
  const node = evolutionNodes.find((item) => item.id === nodeId);
  const next = node && !state.unlockedNodes.includes(nodeId)
    ? normalizeGameState({
        ...state,
        unlockedNodes: [...state.unlockedNodes, nodeId],
        historyTags: node.branchGroupId ? addUniqueTags(state.historyTags ?? [], [nodeId]) : state.historyTags,
      })
    : state;
  if (nodeId === "mutual_ecology_cycle") {
    next.historyTags = addUniqueTags(next.historyTags ?? [], ["ecology_cycle"]);
  }
  if (nodeId === "ecological_personality") {
    next.historyTags = addUniqueTags(next.historyTags ?? [], ["ecological_personality"]);
  }
  const after = calculateResourceDelta(next, 3600);
  const beforeTotal = resourceTotal(before);
  const afterTotal = resourceTotal(after);
  return {
    before,
    after,
    ratio: beforeTotal > 0 ? afterTotal / beforeTotal : 1,
    copy: productionPreviewCopy(nodeId),
  };
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
    historyTags: speciesHistoryTagsFor(state, role),
    numericEffects: effects,
    shortDescription: `${name}出现在${niche}，提高了潮池中${roleLabel(role)}的生态作用。`,
    visualPrompt: `科学图鉴插画风格，${niche}中的${name}，矿物晶体、浅海潮池、微弱荧光`,
    lineageSummary: state.species[0] ? `被记录为 ${state.species[0].name} 之后的旁支谱系。` : "这是当前星球最早被记录的谱系之一。",
    legacyHint: "若在筛选事件中退出生态，可能形成早期谱系遗产。",
    discoveredAt: now
  };
}

function generateSpeciesForRole(state: GameState, role: EcologicalRole, reason: string): SpeciesRecord {
  const base = generateSpeciesTemplate({ ...state, species: state.species });
  const names: Record<EcologicalRole, string> = {
    producer: "浅光生产膜",
    decomposer: "沉积分解层",
    filterer: "潮筛滤泡",
    symbiont: "互养共膜群",
    extremophile: "耐隙原胞",
    catalyst: "晶面催化群"
  };
  const niches: Record<EcologicalRole, string> = {
    producer: "受光水面",
    decomposer: "池底沉积层",
    filterer: "回潮孔隙",
    symbiont: "薄膜交界处",
    extremophile: "热盐边缘",
    catalyst: "矿物晶面"
  };
  return {
    ...base,
    id: cryptoId("sp"),
    name: names[role],
    niche: niches[role],
    status: "living",
    ecologicalRole: role,
    traits: traitsFor(role, state.planetProfile),
    vulnerabilities: vulnerabilitiesFor(state),
    historyTags: speciesHistoryTagsFor(state, role),
    numericEffects: roleEffects(role),
    shortDescription: `${names[role]}出现在${niches[role]}，${reason}`,
    visualPrompt: `科学图鉴插画风格，${niches[role]}中的${names[role]}，早期潮池生态角色，微弱荧光`,
    lineageSummary: state.species[0] ? `从 ${state.species[0].name} 之后的生态分化中被记录。` : "这是第二章生态分化中最早被记录的谱系之一。",
    legacyHint: "若它在后续平衡事件中退出生态，当前作用可能转化为遗产。",
    discoveredAt: new Date().toISOString()
  };
}

function ensureRoleSpecies(state: GameState, role: EcologicalRole, reason: string) {
  const exists = state.species.some(
    (item) => item.ecologicalRole === role && item.status !== "extinct" && item.status !== "fossilized",
  );
  if (exists) return;
  const species = generateSpeciesForRole(state, role, reason);
  state.species.unshift(species);
  state.logs.unshift(createLog("species", `发现新谱系：${species.name}。${species.shortDescription}`));
}

function applyNodeHistoryEffects(state: GameState, nodeId: string) {
  const effects: Record<string, () => void> = {
    early_producer_film: () => {
      state.historyTags = addUniqueTags(state.historyTags ?? [], ["light_chasing", "producer_seed"]);
      state.environment.light = clamp(state.environment.light + 0.08, 0.4, 3);
      state.chapterWitness!.ecologyBurst.lightWitnessed = true;
      markWitnessedRole(state, "producer");
      ensureRoleSpecies(state, "producer", "它们把光照变成潮池可以继续使用的能量。");
    },
    decomposition_layer: () => {
      state.historyTags = addUniqueTags(state.historyTags ?? [], ["decomposer_seed"]);
      state.environment.tide = clamp(state.environment.tide + 0.05, 0.4, 3);
      markWitnessedRole(state, "decomposer");
      ensureRoleSpecies(state, "decomposer", "它们把旧薄膜和碎片拆回新的材料。");
    },
    tidal_filter_pores: () => {
      state.historyTags = addUniqueTags(state.historyTags ?? [], ["filterer_seed", "edge_feeding"]);
      state.resources.stability = clamp(state.resources.stability + 6, 0, 100);
      markWitnessedRole(state, "filterer");
      ensureRoleSpecies(state, "filterer", "它们反复筛入潮汐颗粒，让水体更容易维持秩序。");
    },
    mutual_ecology_cycle: () => {
      state.historyTags = addUniqueTags(state.historyTags ?? [], ["ecology_cycle"]);
      state.chapterWitness!.ecologyBurst.cycleWitnessed = true;
      state.logs.unshift(createLog("event", "第一个小生态循环形成了：生产薄膜、分解层和滤食孔隙开始交换材料。"));
    },
    ecological_personality: () => {
      state.historyTags = addUniqueTags(state.historyTags ?? [], ["ecological_personality"]);
      state.chapterWitness!.ecologyBurst.personalityWitnessed = true;
      state.logs.unshift(createLog("era", `长期生态倾向形成：${planetProfileLabel(calculatePlanetProfile(state))}。`));
    },
    waterline_exposure: () => {
      const witness = state.chapterWitness!.shorelineDifferentiation;
      witness.chapterStarted = true;
      witness.waterlineExposed = true;
      witness.habitatsWitnessed = addUniqueHabitats(witness.habitatsWitnessed, ["shallow_water"]);
      state.historyTags = addUniqueTags(state.historyTags ?? [], ["waterline_exposed"]);
      state.environment.tide = clamp(state.environment.tide - 0.08, 0.4, 3);
      state.logs.unshift(createLog("era", "水线露出来了：退潮在浅水之外留下湿岩和一圈仍未干去的岸痕。"));
    },
    shore_attachment: () => {
      state.historyTags = addUniqueTags(state.historyTags ?? [], ["shore_attachment_ready"]);
      state.logs.unshift(createLog("event", "水流正在潮池边缘聚拢，已有生命开始靠近刚刚露出的湿岩。"));
    },
    shoreline_exchange: () => {
      const witness = state.chapterWitness!.shorelineDifferentiation;
      witness.shorelineExchangeWitnessed = true;
      state.historyTags = addUniqueTags(state.historyTags ?? [], ["shoreline_exchange"]);
      state.environment.tide = clamp(state.environment.tide + 0.08, 0.4, 3);
      state.logs.unshift(createLog("event", "岸边与浅水开始第一次往返：回潮把岸边碎屑带回浅水，原有循环也把养分送向湿岩。"));
    }
  };
  effects[nodeId]?.();
}

export function createLog(type: EvolutionLog["type"], message: string): EvolutionLog {
  return {
    id: cryptoId("log"),
    type,
    message,
    createdAt: new Date().toISOString()
  };
}

function addLog(state: GameState, type: EvolutionLog["type"], message: string) {
  if (state.logs[0]?.type === type && state.logs[0]?.message === message) return;
  state.logs.unshift(createLog(type, message));
}

function maybeAssignEcologyEvent(state: GameState) {
  if (state.pendingEcologyEvent) return;
  if (state.unlockedNodes.includes("mutual_ecology_cycle") && !(state.eventHistory ?? []).includes("bloom_pressure")) {
    const pressure = ecologyEvents.find((event) => event.id === "bloom_pressure");
    if (pressure) {
      state.pendingEcologyEvent = pressure;
      addLog(state, "system", `潮池事件出现：${pressure.title}`);
      return;
    }
  }
  const shorelineWitness = normalizeChapterWitness(state).shorelineDifferentiation;
  if (shorelineWitness.shoreColonized && !shorelineWitness.dryWetPressureWitnessed && !(state.eventHistory ?? []).includes("ebb_dryness")) {
    const dryness = ecologyEvents.find((event) => event.id === "ebb_dryness");
    if (dryness) {
      state.pendingEcologyEvent = dryness;
      addLog(state, "system", `岸线事件出现：${dryness.title}`);
      return;
    }
  }
  if (shorelineWitness.chapterStarted) return;
  const event = rollEcologyEvent(state);
  if (!event) return;
  state.pendingEcologyEvent = event;
  addLog(state, "system", `潮池事件出现：${event.title}`);
}

function guideShoreTide(state: GameState) {
  const witness = state.chapterWitness!.shorelineDifferentiation;
  if (state.chapterProgress?.chapter !== "shoreline_differentiation" || !state.unlockedNodes.includes("shore_attachment")) {
    throw new Error("当前还不能引导生命贴岸");
  }
  if (witness.shoreColonized) return;

  const candidates = state.species.filter((species) => species.status === "living" || species.status === "flourishing");
  if (candidates.length === 0) throw new Error("潮池里还没有能够适应湿岸的生命");
  const preferredRole: EcologicalRole = state.historyTags.includes("stable_cycle")
    ? "filterer"
    : state.historyTags.includes("decomposer_cycle")
      ? "decomposer"
      : "producer";
  const species = candidates.find((candidate) => candidate.ecologicalRole === preferredRole) ?? candidates[0];

  species.habitats = addUniqueHabitats(species.habitats ?? [], ["shallow_water", "intertidal_wet_rock"]);
  species.historyTags = addUniqueTags(species.historyTags ?? [], ["shore_colonized", "intertidal_attachment"]);
  witness.shoreColonized = true;
  witness.habitatsWitnessed = addUniqueHabitats(witness.habitatsWitnessed, ["shallow_water", "intertidal_wet_rock"]);
  state.historyTags = addUniqueTags(state.historyTags ?? [], ["shore_colonized"]);
  state.logs.unshift(createLog("species", `${species.name}随水流抵达湿岩，并靠自身结构停在了岸面上。`));
}

function applyEbbDrynessOutcome(state: GameState, optionId: string) {
  const strategyByOption: Record<string, ShorelineStrategy> = {
    protect_moisture_film: "moisture_retention",
    expose_wet_rock: "rock_attachment",
    return_to_shallows: "tidal_dispersal",
  };
  const strategy = strategyByOption[optionId];
  if (!strategy) return;

  const witness = state.chapterWitness!.shorelineDifferentiation;
  witness.dryWetPressureWitnessed = true;
  witness.shorelineStrategy = strategy;
  const shorelineSpecies = state.species.find((species) => species.habitats?.includes("intertidal_wet_rock"));
  if (shorelineSpecies && strategy === "rock_attachment" && state.resources.stability < 50) {
    shorelineSpecies.status = "endangered";
  }
  if (shorelineSpecies && strategy === "tidal_dispersal") {
    shorelineSpecies.habitats = addUniqueHabitats(
      (shorelineSpecies.habitats ?? []).filter((habitat) => habitat !== "intertidal_wet_rock"),
      ["shallow_water"],
    );
  }
}

function addUniqueHabitats(existing: HabitatId[], incoming: HabitatId[]): HabitatId[] {
  return normalizeHabitats([...existing, ...incoming]);
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
  const legacyCopy = legacyCopyFor(species.ecologicalRole, species.name);
  return {
    id: cryptoId("legacy"),
    sourceSpeciesId: species.id,
    name: `${species.name}遗痕`,
    type: species.ecologicalRole === "producer" ? "ancestor" : "fossil",
    description: legacyCopy.description,
    effect: resourceEffectText(legacyCopy.numericEffects),
    numericEffects: legacyCopy.numericEffects,
    tradeoffEffects: legacyCopy.tradeoffEffects,
    tags: species.historyTags ?? [],
    createdAt: new Date().toISOString()
  };
}

function applyEventOption(state: GameState, option: EcologyEventOption) {
  for (const [key, value] of Object.entries(option.resourceEffect ?? {}) as Array<[keyof Resources, number]>) {
    const max = key === "stability" ? 100 : RESOURCE_CAP;
    state.resources[key] = clamp(state.resources[key] + value, 0, max);
  }
  for (const [key, value] of Object.entries(option.environmentEffect ?? {}) as Array<[keyof typeof state.environment, number]>) {
    const min = key === "volatility" ? 0 : 0.4;
    const max = key === "volatility" ? 2 : 3;
    state.environment[key] = clamp(state.environment[key] + value, min, max);
  }
}

function addUniqueTags(existing: string[], incoming: string[]) {
  return Array.from(new Set([...(existing ?? []), ...incoming]));
}

function hasResources(resources: Resources, cost: Partial<Resources>) {
  return (Object.keys(cost) as Array<keyof Resources>).every((key) => resources[key] >= (cost[key] ?? 0));
}

function spend(resources: Resources, cost: Partial<Resources>) {
  if (!hasResources(resources, cost)) {
    throw new Error("潮池还缺少所需材料");
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

function legacyMultiplierFor(state: GameState, key: keyof Resources) {
  const bonus = state.legacies.reduce((sum, legacy) => {
    const effects = legacy.numericEffects;
    if (!effects) {
      return sum + (key === "organic" ? 0.02 : 0);
    }
    return sum + (effects[key] ?? 0) + (legacy.tradeoffEffects?.[key] ?? 0);
  }, 0);
  return 1 + bonus;
}

function pickRole(state: GameState): EcologicalRole {
  if (state.planetProfile === "extreme") return "extremophile";
  if (state.planetProfile === "symbiotic") return "symbiont";
  if (state.unlockedNodes.includes("photo_pigment")) return "producer";
  const tags = new Set(state.historyTags ?? []);
  if (tags.has("heat_tolerant") && Math.random() > 0.35) return "extremophile";
  if (tags.has("symbiotic_seed") && Math.random() > 0.35) return "symbiont";
  if (tags.has("mineral_catalyst") && Math.random() > 0.45) return "catalyst";
  if (tags.has("tidal_rich") && Math.random() > 0.45) return "decomposer";
  if (tags.has("branching") && Math.random() > 0.45) return "filterer";
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

function legacyCopyFor(role: EcologicalRole, speciesName: string): { description: string; numericEffects: Partial<Resources>; tradeoffEffects?: Partial<Resources> } {
  const copy: Record<EcologicalRole, { description: string; numericEffects: Partial<Resources>; tradeoffEffects?: Partial<Resources> }> = {
    producer: {
      description: `${speciesName}不再活跃繁殖，但残留的光合薄膜让潮池更容易把光转化为可用能量。`,
      numericEffects: { energy: 0.03, organic: 0.01 },
      tradeoffEffects: { mutation: -0.005 }
    },
    decomposer: {
      description: `${speciesName}沉入底层后留下分解层，旧有结构被更稳定地拆回有机质与矿物。`,
      numericEffects: { organic: 0.03, minerals: 0.01 },
      tradeoffEffects: { biomass: -0.005 }
    },
    symbiont: {
      description: `${speciesName}留下的互养网络没有完全断开，后续生命更容易共享养分并维持稳定。`,
      numericEffects: { stability: 0.02, biomass: 0.02 },
      tradeoffEffects: { energy: -0.005 }
    },
    extremophile: {
      description: `${speciesName}的耐受壳层残存在沉积物中，让潮池更能利用极端环境带来的物质扰动。`,
      numericEffects: { minerals: 0.02, mutation: 0.01 },
      tradeoffEffects: { stability: -0.005 }
    },
    filterer: {
      description: `${speciesName}不再游动，但残留的滤食孔隙改变了潮池中颗粒与稳定性的流动。`,
      numericEffects: { biomass: 0.03, stability: 0.01 },
      tradeoffEffects: { minerals: -0.005 }
    },
    catalyst: {
      description: `${speciesName}附着过的催化晶面仍在发亮，后续反应更容易被能量与突变点燃。`,
      numericEffects: { energy: 0.02, mutation: 0.01 },
      tradeoffEffects: { stability: -0.005 }
    }
  };
  return copy[role];
}

function resourceEffectText(effects: Partial<Resources>) {
  return (Object.entries(effects) as Array<[keyof Resources, number]>)
    .filter(([, value]) => value !== 0)
    .map(([key, value]) => `${resourceLabel(key)} ${value > 0 ? "+" : ""}${(value * 100).toFixed(0)}%`)
    .join(" · ");
}

function resourceLabel(key: keyof Resources) {
  const labels: Record<keyof Resources, string> = {
    organic: "有机质产出",
    energy: "能量产出",
    minerals: "矿物质产出",
    stability: "稳定性恢复",
    mutation: "突变倾向",
    biomass: "生物量产出"
  };
  return labels[key];
}

function planetProfileLabel(profile: PlanetProfile) {
  const labels: Record<PlanetProfile, string> = {
    balanced: "平衡潮池",
    high_mutation: "突变爆发",
    stable_pool: "稳定循环",
    cataclysmic: "灾变沉积",
    symbiotic: "共生网络",
    extreme: "极端适应"
  };
  return labels[profile];
}

function traitsFor(role: EcologicalRole, profile: PlanetProfile) {
  const base: Record<EcologicalRole, string[]> = {
    producer: ["薄膜结构", "弱光捕获", "群体漂浮"],
    decomposer: ["沉积附着", "有机裂解", "慢速扩散"],
    symbiont: ["互养循环", "双层膜泡", "材料交换"],
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

function historyTagsForTalent(talentId: string) {
  const map: Record<string, string[]> = {
    crystal_nursery: ["mineral_catalyst"],
    tidal_memory: ["tidal_rich"],
    warm_water: ["heat_tolerant"],
    trace_elements: ["mineral_catalyst", "stable_membrane"],
    shallow_breath: ["edge_feeding"],
    storm_affinity: ["charged"],
    deep_mineral: ["mineral_catalyst"],
    tide_surge: ["tidal_rich"],
    membrane_bias: ["stable_membrane"],
    symbiosis_net: ["symbiotic_seed"],
    cataclysm_ward: ["sheltered"],
    split_growth: ["branching"],
    mutation_spark: ["mutation_biased"],
    ancient_echo: ["selection_pressure"],
    chain_lightning: ["charged"],
    exposed_rock_bed: ["mineral_catalyst"],
    shallow_filter_layer: ["tidal_rich", "edge_feeding"],
    afterheat_sediment: ["heat_tolerant"],
    membrane_glimmer: ["stable_membrane"],
    mutation_ember: ["mutation_biased"],
    brine_cycle: ["mineral_catalyst", "stable_membrane"],
    charge_tide_window: ["charged", "tidal_rich"],
    algae_film_prelude: ["edge_feeding"],
    homeostatic_shell: ["stable_membrane"],
    split_chain_bed: ["mutation_biased", "mineral_catalyst"],
    deep_tide_greenhouse: ["tidal_rich"],
    lattice_memory: ["mineral_catalyst"],
    boundary_chorus: ["stable_membrane", "symbiotic_seed"],
    post_disaster_revival: ["sheltered", "selection_pressure"],
    lineage_drift: ["branching", "mutation_biased"],
    stardust_catalyst: ["mineral_catalyst", "charged"],
    black_tide_oath: ["tidal_rich", "volatile"],
    protocell_herald: ["stable_membrane", "edge_feeding"],
    symbiosis_ember: ["symbiotic_seed", "edge_feeding"],
    genetic_return_tide: ["selection_pressure", "branching"]
  };
  return map[talentId] ?? [];
}

function speciesHistoryTagsFor(state: GameState, role: EcologicalRole) {
  const tags = [...(state.historyTags ?? [])];
  if (role === "extremophile") tags.push("heat_tolerant");
  if (role === "symbiont") tags.push("symbiotic_seed");
  if (role === "catalyst") tags.push("mineral_catalyst");
  return Array.from(new Set(tags)).slice(-4);
}

function applyHistoryTagEffects(delta: Resources, state: GameState): Resources {
  const next = { ...delta };
  const tags = new Set(state.historyTags ?? []);
  if (tags.has("heat_tolerant")) {
    next.energy *= 1.03;
    next.stability *= 0.98;
  }
  if (tags.has("tidal_rich")) next.organic *= 1.04;
  if (tags.has("mineral_catalyst")) next.minerals *= 1.04;
  if (tags.has("stable_membrane")) {
    next.stability *= 1.06;
    next.mutation *= 0.98;
  }
  if (tags.has("mutation_biased") || tags.has("error_retention")) next.mutation *= 1.08;
  if (tags.has("replication_fidelity")) {
    next.stability *= 1.05;
    next.mutation *= 0.94;
  }
  if (tags.has("fragment_budding")) next.biomass *= 1.06;
  return next;
}

function applyEcologyComboEffects(delta: Resources, state: GameState): Resources {
  const next = { ...delta };
  const roles = new Set(
    state.species
      .filter((item) => item.status === "living" || item.status === "flourishing")
      .map((item) => item.ecologicalRole),
  );
  if (roles.has("producer") && roles.has("decomposer")) {
    next.organic *= 1.05;
    next.energy *= 1.03;
  }
  if (roles.has("symbiont") && roles.has("filterer")) next.stability *= 1.07;
  if (roles.has("extremophile") && roles.has("catalyst")) {
    next.mutation *= 1.06;
    next.minerals *= 1.03;
  }
  return next;
}

function applyActivePoolEffect(delta: Resources, state: GameState): Resources {
  const effect = state.activePoolEffect;
  if (!effect || new Date(effect.expiresAt).getTime() <= Date.now()) return delta;
  const next = { ...delta };
  for (const [key, multiplier] of Object.entries(effect.resourceMultipliers) as Array<[ResourceKey, number]>) {
    next[key] *= multiplier;
  }
  return next;
}

function normalizePoolEffect(effect: GameState["activePoolEffect"]): PoolEffect | null {
  if (!effect) return null;
  const expiresAt = new Date(effect.expiresAt).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
  return effect;
}

function rollOfflinePoolEffect(now: Date): PoolEffect {
  const template = poolEffectTemplates[Math.floor(Math.random() * poolEffectTemplates.length)] ?? poolEffectTemplates[0];
  const { durationMinutes, ...effect } = template;
  return {
    ...effect,
    startedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + durationMinutes * 60 * 1000).toISOString(),
  };
}

function emptyResources(): Resources {
  return { organic: 0, energy: 0, minerals: 0, stability: 0, mutation: 0, biomass: 0 };
}

function resourceTotal(resources: Resources): number {
  return resources.organic + resources.energy + resources.minerals + Math.max(0, resources.stability) + resources.mutation + resources.biomass;
}

function scaleResources(resources: Resources, multiplier: number): Resources {
  return {
    organic: resources.organic * multiplier,
    energy: resources.energy * multiplier,
    minerals: resources.minerals * multiplier,
    stability: resources.stability * multiplier,
    mutation: resources.mutation * multiplier,
    biomass: resources.biomass * multiplier,
  };
}

function mergeResources(target: Resources, incoming: Resources) {
  for (const key of Object.keys(incoming) as Array<keyof Resources>) {
    target[key] = clamp(target[key] + incoming[key], 0, key === "stability" ? 100 : RESOURCE_CAP);
  }
}

function frequentHarvestBonus(state: GameState) {
  if (!state.lastHarvestedAt) return 0;
  const elapsedSeconds = (Date.now() - new Date(state.lastHarvestedAt).getTime()) / 1000;
  if (!Number.isFinite(elapsedSeconds)) return 0;
  if (elapsedSeconds < FREQUENT_HARVEST_MIN_SECONDS || elapsedSeconds > FREQUENT_HARVEST_MAX_SECONDS) return 0;
  const progress = (elapsedSeconds - FREQUENT_HARVEST_MIN_SECONDS) / (FREQUENT_HARVEST_MAX_SECONDS - FREQUENT_HARVEST_MIN_SECONDS);
  return 0.05 + Math.min(0.05, progress * 0.05);
}

function maybeCreateCodexObservation(state: GameState) {
  if (state.species.length === 0) return;
  const existing = new Set((state.codexObservations ?? []).map((item) => item.id));
  const chance = state.chapterProgress?.chapter === "ecology_burst" ? 0.28 : 0.16;
  if (Math.random() > chance) return;
  const species = state.species.find((item) => item.status === "living" || item.status === "flourishing") ?? state.species[0];
  const id = `obs_${species.ecologicalRole}_${(state.codexObservations ?? []).length + 1}`;
  if (existing.has(id)) return;
  const effectKey = observationEffectKey(species.ecologicalRole);
  const observation: NonNullable<GameState["codexObservations"]>[number] = {
    id,
    title: `${roleLabel(species.ecologicalRole)}的新习性`,
    description: `${species.name}在你离开时出现了新的活动，图鉴已记录这次生态观察。`,
    relatedSpeciesId: species.id,
    relatedRole: species.ecologicalRole,
    numericEffects: { [effectKey]: 0.015 },
    isNew: true,
    createdAt: new Date().toISOString(),
  };
  state.codexObservations = [observation, ...(state.codexObservations ?? [])].slice(0, 40);
  state.logs.unshift(createLog("species", `图鉴新观察：${observation.title}。${observation.description}`));
}

function observationEffectKey(role: EcologicalRole): ResourceKey {
  const map: Record<EcologicalRole, ResourceKey> = {
    producer: "energy",
    decomposer: "organic",
    symbiont: "stability",
    extremophile: "minerals",
    filterer: "biomass",
    catalyst: "mutation",
  };
  return map[role];
}

function productionPreviewCopy(nodeId: string) {
  const map: Record<string, string> = {
    replicating_chain: "自复制让有机质与突变进入更高产能的一段。",
    proto_cell: "原初细胞会带来大量生物量，并抬高整体产出。",
    photo_pigment: "感光色素让能量产出跃迁，开启生产者路线。",
    early_producer_film: "生产者会把光转成持续能量。",
    decomposition_layer: "分解者会提高有机质和矿物回流。",
    tidal_filter_pores: "滤食者会提高稳定和生物量效率。",
    mutual_ecology_cycle: "三类角色接成小循环后，全部基础产出大幅提升。",
    ecological_personality: "这次选择会进入潮池记忆，并影响后续生态倾向。",
  };
  return map[nodeId] ?? "这项演化会提高潮池的长期产出。";
}

function livingRoles(state: GameState): Set<EcologicalRole> {
  const roles = new Set(
    state.species
      .filter((item) => item.status === "living" || item.status === "flourishing")
      .map((item) => item.ecologicalRole),
  );
  if (state.unlockedNodes.includes("early_producer_film")) roles.add("producer");
  if (state.unlockedNodes.includes("decomposition_layer")) roles.add("decomposer");
  if (state.unlockedNodes.includes("tidal_filter_pores")) roles.add("filterer");
  return roles;
}

function hasEcologyCycleRoles(state: GameState): boolean {
  const roles = livingRoles(state);
  return roles.has("producer") && roles.has("decomposer") && roles.has("filterer");
}

function isResonanceOnCooldown(state: GameState, now = new Date()) {
  if (!state.lastResonanceAt) return false;
  const elapsedSeconds = (now.getTime() - new Date(state.lastResonanceAt).getTime()) / 1000;
  return elapsedSeconds >= 0 && elapsedSeconds < RESONANCE_COOLDOWN_SECONDS;
}

function createFirstComboLog(state: GameState): EvolutionLog | null {
  const logged = state.logs.some((log) => log.message.includes("生态组合"));
  if (logged || state.unlockedNodes.includes("mutual_ecology_cycle")) return null;
  const roles = livingRoles(state);
  if (hasEcologyCycleRoles(state)) {
    return createLog("event", "生态组合形成：生产薄膜、分解层和滤食孔隙接成小循环，材料在三者之间往返。");
  }
  if (roles.has("producer") && roles.has("decomposer")) {
    return createLog("event", "生态组合形成：分解层释放材料，新的生产薄膜获得补充。");
  }
  if (roles.has("symbiont") && roles.has("filterer")) {
    return createLog("event", "生态组合显现：滤食孔隙与互养网络开始协作，潮池更容易维持稳定。");
  }
  if (roles.has("extremophile") && roles.has("catalyst")) {
    return createLog("event", "生态组合显现：耐受结构贴上催化晶面，变化开始被更大胆地保留。");
  }
  return null;
}

function deriveChapterProgress(state: GameState): ChapterProgress {
  const unlocked = new Set(state.unlockedNodes ?? []);
  if (!unlocked.has("photo_pigment")) {
    return {
      chapter: "life_birth",
      stage: "life_birth",
      completedStages: [],
      ecologyCycleFormed: false,
      currentMoodLabel: "先让复杂分子形成稳定结构。",
      nextHintLabel: "继续积累，让生命开始追逐第一缕光。",
    };
  }

  const witness = normalizeChapterWitness(state).ecologyBurst;
  const completedStages: ChapterProgress["completedStages"] = [];
  let stage: ChapterProgress["stage"] = "pursue_light";
  const witnessedRoleCount = witness.rolesWitnessed.filter((role) => ["producer", "decomposer", "filterer"].includes(role)).length;

  if (witness.lightWitnessed) {
    completedStages.push("pursue_light");
    stage = "differentiate_roles";
    if (witnessedRoleCount >= 2 || witness.firstResonanceWitnessed) {
      completedStages.push("differentiate_roles");
      stage = "form_cycle";
    }
    if (witness.cycleWitnessed) {
      completedStages.push("form_cycle");
      stage = "face_imbalance";
    }
    if (witness.imbalanceWitnessed) {
      completedStages.push("face_imbalance");
      stage = "ecological_personality";
    }
    if (witness.personalityWitnessed) {
      completedStages.push("ecological_personality");
      stage = "complete";
    }
  }

  const ecologyProgress: ChapterProgress = {
    chapter: "ecology_burst",
    stage,
    completedStages,
    ecologyCycleFormed: completedStages.includes("form_cycle"),
    ecologyPersonality: stage === "complete" ? calculatePlanetProfile(state) : undefined,
    currentMoodLabel: ecologyStageMood(stage),
    nextHintLabel: ecologyStageHint(stage, state),
  };

  const shorelineWitness = normalizeChapterWitness(state).shorelineDifferentiation;
  if (stage !== "complete" || !shorelineWitness.chapterStarted) return ecologyProgress;

  return deriveShorelineProgress(state, shorelineWitness);
}

function deriveShorelineProgress(
  state: GameState,
  witness: NonNullable<GameState["chapterWitness"]>["shorelineDifferentiation"],
): ChapterProgress {
  const completedStages: string[] = [];
  let stage: ChapterProgress["stage"] = "discover_waterline";
  const habitats = normalizeHabitats(witness.habitatsWitnessed);

  if (witness.waterlineExposed) {
    completedStages.push("discover_waterline");
    stage = "attach_shore";
  }
  if (witness.shoreColonized) {
    completedStages.push("attach_shore");
    stage = "split_niches";
  }
  if (habitats.length >= 2) {
    completedStages.push("split_niches");
    stage = "endure_dry_wet";
  }
  if (witness.dryWetPressureWitnessed) {
    completedStages.push("endure_dry_wet");
    stage = "reconnect_cycle";
  }
  if (witness.shorelineExchangeWitnessed) {
    completedStages.push("reconnect_cycle");
    stage = "shoreline_memory";
  }
  if (witness.shorelineMemoryWitnessed) {
    completedStages.push("shoreline_memory");
    stage = "complete";
  }

  return {
    chapter: "shoreline_differentiation",
    stage,
    completedStages,
    ecologyCycleFormed: true,
    shorelineExchangeFormed: witness.shorelineExchangeWitnessed,
    connectedHabitats: habitats,
    ecologyPersonality: calculatePlanetProfile(state),
    currentMoodLabel: shorelineStageMood(stage),
    nextHintLabel: shorelineStageHint(stage),
  };
}

function shorelineStageMood(stage: ChapterProgress["stage"]): string {
  const map: Record<string, string> = {
    discover_waterline: "潮水正在退开，潮池边缘露出一圈仍然湿润的岩面。",
    attach_shore: "水线已经显现，已有生命正尝试附着在潮水之外的湿岩上。",
    split_niches: "浅水和湿岸开始留下不同的生命姿态。",
    endure_dry_wet: "岸边的薄水膜正面对第一次晒干与回潮。",
    reconnect_cycle: "岸边已有生命停留，但仍需要回潮补充材料。",
    shoreline_memory: "水线两侧已经开始往返，一段岸线历史正在成形。",
    complete: "生命已经越过水线，浅水与湿岸形成了稳定往返。",
  };
  return map[stage] ?? "潮池边缘正在发生变化。";
}

function shorelineStageHint(stage: ChapterProgress["stage"]): string {
  const map: Record<string, string> = {
    discover_waterline: "留意退潮后的边缘，湿岩会先于文字显现。",
    attach_shore: "把引导光点拖到湿岩上，观察哪支生命能够停留。",
    split_niches: "观察同一支生命在浅水与岸边怎样改变姿态。",
    endure_dry_wet: "退潮带来三种选择：延缓水膜蒸发、承担完全暴露，或退回浅水。",
    reconnect_cycle: "等待回潮把岸边的变化重新带回水中。",
    shoreline_memory: "打开潮池记忆，回看水线露出、贴岸与回流。",
    complete: "回看浅水、湿岸与回潮怎样形成第一条水线。",
  };
  return map[stage] ?? "继续观察水线。";
}

function refreshChapterDerivedState(state: GameState, now = new Date()) {
  state.chapterProgress = deriveChapterProgress(state);
  state.pendingEcologyResonances = availableEcologyResonances(state, now);
}

function ecologyStageMood(stage: ChapterProgress["stage"]) {
  const map: Record<string, string> = {
    pursue_light: "薄膜生命聚集到受光浅水，水面亮度持续上升。",
    differentiate_roles: "浅层、池底和潮孔各自有了动静。",
    form_cycle: "旧膜沉下去，清水筛回来，光重新照进浅层。",
    face_imbalance: "水面长得太满，呼吸开始变窄。",
    ecological_personality: "反复出现的环境变化正在形成长期生态倾向。",
    complete: "第一组生态循环和长期倾向已经形成。",
  };
  return map[stage] ?? "潮池正在继续演化。";
}

function ecologyStageHint(stage: ChapterProgress["stage"], state: GameState) {
  const witness = state.chapterWitness?.ecologyBurst ?? emptyEcologyBurstWitness();
  const roleCount = witness.rolesWitnessed.length;
  if (stage === "differentiate_roles") {
    if (roleCount <= 1) return "等另一处生命稳定下来，水里会多一道新的工作。";
    return "看看哪些生态角色正在交换材料。";
  }
  if (stage === "form_cycle") {
    return "再触发一次角色互动，小循环就能形成。";
  }
  if (stage === "face_imbalance") {
    return "循环刚形成，接下来要处理过度繁盛。";
  }
  if (stage === "ecological_personality") {
    return "记录这次处理结果，形成长期生态倾向。";
  }
  if (stage === "complete") {
    return "回到潮池记忆，看看它怎样从追光走到自成循环。";
  }
  return "继续让生命靠近光，水面会慢慢露出新的层次。";
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
  if (state.species.length === 0) return "潮水中出现了能够维持结构的异常链体，第一条谱系可能正在成形。";
  return "潮池被再次催化，现有谱系改变了周围的能量流。";
}

function mainlineEchoForNode(nodeId: string): string {
  const map: Record<string, string> = {
    organic_richness: "复杂分子已经能够在蒸发与回潮之间稳定聚集。",
    replicating_chain: "少数链体能够复制自身结构，变化可以延续到下一轮潮汐。",
    replication_fidelity: "复制错误减少，结构更稳定，但新变化出现得更慢。",
    error_retention: "更多复制错误被保留，旁支机会增加，水体也更不稳定。",
    fragment_budding: "链体断裂后仍可延续，新的旁支更容易出现。",
    primitive_vesicle: "薄膜把反应与外界潮水隔开，生命活动有了短暂边界。",
    metabolic_loop: "简单循环开始利用能量，潮池具备了持续反应的基础。",
    proto_cell: "第一种生命单位稳定出现，图鉴已经记录它的结构。",
    photo_pigment: "感光结构让生命聚集到浅水，新的生态角色即将出现。",
    early_producer_film: "受光薄膜稳定形成，第一类生产者出现在浅水中。",
    decomposition_layer: "旧薄膜沉入池底，为分解者提供了可以回收的材料。",
    tidal_filter_pores: "潮汐孔隙筛入颗粒，第三类生态角色开始稳定出现。",
    mutual_ecology_cycle: "第一个小循环形成，生产、分解和过滤开始交换材料。",
    ecological_personality: "反复出现的环境变化形成了长期生态倾向。",
    waterline_exposure: "潮水第一次退到小循环之外，浅水与湿岸之间出现了清晰水线。",
    shore_attachment: "水流只改变了抵达位置，生命依靠自身结构附着在湿岩上。",
    shoreline_exchange: "岸边与浅水第一次互相带回材料，越过水线的生命没有离开原有循环。",
  };
  return map[nodeId] ?? "";
}

function cloneState<T>(state: T): T {
  return JSON.parse(JSON.stringify(state)) as T;
}

function cryptoId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}
