import type {
  EcologicalRole,
  EcologyEvent,
  EcologyEventOption,
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
    id: "replication_fidelity",
    name: "高保真复制",
    description: "复制链更少出错，潮池更容易稳定延续，但突变机会减少。",
    cost: { organic: 42, energy: 24, minerals: 16 },
    requires: ["replicating_chain"],
    branchGroupId: "replication_strategy",
    branchHint: "复制路线只能留下一个主倾向。"
  },
  {
    id: "error_retention",
    name: "错误保留",
    description: "一部分复制错误被保留下来，带来更多可能，也让潮池更不安定。",
    cost: { organic: 42, energy: 24, minerals: 16 },
    requires: ["replicating_chain"],
    branchGroupId: "replication_strategy",
    branchHint: "复制路线只能留下一个主倾向。"
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
    branchHint: "复制路线只能留下一个主倾向。"
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

export const ecologyEvents: EcologyEvent[] = [
  {
    id: "hot_spring_pulse",
    title: "热泉短暂喷发",
    description: "潮池边缘升温，薄膜开始颤动。热量带来了反应窗口，也让脆弱结构更容易散开。",
    tendencyTag: "耐热倾向",
    options: [
      {
        id: "approach_heat",
        title: "靠近热泉",
        description: "接住高温带来的能量与矿物，让潮池记住这次灼热。",
        resourceEffect: { energy: 34, minerals: 18, stability: -10 },
        environmentEffect: { heat: 0.18, volatility: 0.08 },
        addHistoryTags: ["heat_tolerant", "volatile"],
        logMessage: "热泉把潮池边缘点亮，后来的结构开始带上一点耐热倾向。"
      },
      {
        id: "retreat_shallows",
        title: "退回浅水",
        description: "避开最剧烈的喷发，让薄膜结构先稳住。",
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
        logMessage: "一部分结构靠近热泉，潮池第一次显露出筛选的痕迹。"
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
        title: "留住碎片",
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
        logMessage: "潮池边缘先吃到了回潮碎片，旁支生命的影子开始变多。"
      }
    ]
  },
  {
    id: "lightning_window",
    title: "近岸闪电落下",
    description: "亮白电光劈入浅水，短暂打开了高能反应窗口。",
    tendencyTag: "高能突变",
    options: [
      {
        id: "catch_charge",
        title: "接住电光",
        description: "获得大量能量和突变点，但潮池会剧烈震荡。",
        resourceEffect: { energy: 58, mutation: 24, stability: -14 },
        environmentEffect: { light: 0.14, volatility: 0.12 },
        addHistoryTags: ["charged", "volatile"],
        logMessage: "闪电把浅水点亮，潮池记住了高能反应的味道。"
      },
      {
        id: "ground_crystals",
        title: "导入矿晶",
        description: "让矿物晶面承接电荷，换取较温和的催化窗口。",
        resourceEffect: { energy: 26, minerals: 20, stability: 4 },
        environmentEffect: { mineralFlow: 0.1 },
        addHistoryTags: ["mineral_catalyst"],
        logMessage: "矿晶接住了电荷，后来的链体更容易贴着晶面反应。"
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
        logMessage: "有机膜覆上矿架，潮池开始把晶面当作生命的脚手架。"
      },
      {
        id: "break_shelf",
        title: "击碎矿架",
        description: "释放更多矿物颗粒，但会扰乱已有薄膜。",
        resourceEffect: { minerals: 52, mutation: 10, stability: -8 },
        environmentEffect: { mineralFlow: 0.18, volatility: 0.05 },
        addHistoryTags: ["mineral_catalyst", "selection_pressure"],
        logMessage: "矿架碎成细粒，潮池得到更多表面，也留下了轻微的筛选压力。"
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
    description: "潮池短暂进入循环稳定期，脆弱结构获得喘息窗口。",
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
    description: "闪电留下更高效的能量窗口，反应链更容易被点燃。",
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
    description: "物种间自发形成微弱互养，谱系越多收益越高。",
    effects: { organic: 0.16 },
    trait: { id: "eco_resonance", name: "生态共振", desc: "每有1个现存/繁盛物种全资源+1.5%（上限15%）" }
  },
  {
    id: "cataclysm_ward",
    name: "灾变预警", tier: 1, rarity: "legendary", weight: 18,
    icon: "spark", summary: "能量 +16% · 适应缓冲",
    description: "潮池对极端事件有微弱预适应，负面反应概率降低。",
    effects: { energy: 0.16 },
    trait: { id: "adaptive_buffer", name: "适应缓冲", desc: "负面反馈概率从25%降至15%且不抖动屏幕" }
  },
  {
    id: "split_growth",
    name: "分裂增殖", tier: 1, rarity: "legendary", weight: 18,
    icon: "crystal", summary: "矿物质 +16% · 复制遗产",
    description: "每次结构跃迁后残留的碎片成为下一次跃迁起点。",
    effects: { minerals: 0.16 },
    trait: { id: "replicate_legacy", name: "复制遗产", desc: "解锁演化节点后返还40%消耗资源" }
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
    trait: { id: "pulse_surge", name: "脉冲加速", desc: "每吸收4个元素自动生成1个脉冲元素" }
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
    description: "吸收能量闪光时可能带动周围元素同时入池。",
    effects: { energy: 0.18 },
    trait: { id: "chain_reaction", name: "连锁反应", desc: "吸收能量闪光时50%概率带动附近2个元素入池" }
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
    description: "白昼残留的热量被沉积物缓慢释放，反应窗口更长。",
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
    description: "潮水带来的电荷差打开了温和的高能反应窗口。",
    effects: { energy: 0.17, organic: 0.07 }
  },
  {
    id: "algae_film_prelude",
    name: "藻膜前奏", tier: 1, rarity: "rare", weight: 24,
    icon: "type_tide", summary: "生物量 +14%，能量 +10%",
    description: "最早的薄层色素影子浮在水面，让后续代谢更早靠近光。",
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
    trait: { id: "lattice_rewrite", name: "晶面复写", desc: "矿晶相关事件更容易沉淀为长期倾向" }
  },
  {
    id: "boundary_chorus",
    name: "边界合唱", tier: 1, rarity: "legendary", weight: 14,
    icon: "type_membrane", summary: "稳定性 +13% · 群膜共振",
    description: "多个膜泡以相近节奏涨缩，脆弱边界开始互相支撑。",
    effects: { stability: 0.13 },
    trait: { id: "membrane_chorus", name: "群膜共振", desc: "稳定性收益更容易和生物量收益同时出现" }
  },
  {
    id: "post_disaster_revival",
    name: "灾后复苏", tier: 1, rarity: "legendary", weight: 14,
    icon: "type_spark", summary: "能量 +13% · 复苏窗口",
    description: "剧烈扰动后留下的能量梯度，反而成为下一轮生命的窗口。",
    effects: { energy: 0.13 },
    trait: { id: "revival_window", name: "复苏窗口", desc: "低稳定性后的恢复事件更容易留下正面收益" }
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
    trait: { id: "stardust_reaction", name: "星尘反应", desc: "矿物与能量同时充足时，催化收益更容易放大" }
  },
  {
    id: "black_tide_oath",
    name: "黑潮誓约", tier: 1, rarity: "epic", weight: 6,
    icon: "epic_black_tide_oath", summary: "有机质 +16%，突变 +11% · 黑潮沉约",
    description: "一次深色回潮带来未知有机碎片，潮池记住了更大胆的组合。",
    effects: { organic: 0.16, mutation: 0.11 },
    trait: { id: "black_tide_vow", name: "黑潮沉约", desc: "高波动与潮汐富集更容易同时沉淀" }
  },
  {
    id: "protocell_herald",
    name: "原核先声", tier: 1, rarity: "epic", weight: 6,
    icon: "epic_protocell_herald", summary: "生物量 +16%，稳定性 +10% · 细胞前兆",
    description: "膜、代谢与复制的片段短暂同频，像是在预告真正细胞的到来。",
    effects: { biomass: 0.16, stability: 0.10 },
    trait: { id: "cellular_omen", name: "细胞前兆", desc: "膜泡与代谢节点附近更容易出现物种记录" }
  },
  {
    id: "symbiosis_ember",
    name: "共生火种", tier: 1, rarity: "epic", weight: 5,
    icon: "epic_symbiosis_ember", summary: "稳定性 +12%，有机质 +12% · 共生萌发",
    description: "两类脆弱结构开始交换残余物，互养关系第一次有了火种。",
    effects: { stability: 0.12, organic: 0.12 },
    trait: { id: "symbiosis_seedling", name: "共生萌发", desc: "共生、滤食与边缘摄食倾向更容易连接" }
  },
  {
    id: "genetic_return_tide",
    name: "遗传回潮", tier: 1, rarity: "epic", weight: 5,
    icon: "epic_genetic_return", summary: "突变 +13%，生物量 +13% · 遗传回响",
    description: "旧链体片段被潮水带回，后来的生命似乎能借到远古错误。",
    effects: { mutation: 0.13, biomass: 0.13 },
    trait: { id: "genetic_echo", name: "遗传回响", desc: "化石、遗产与新印记觉醒更容易形成叙事连接" }
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
    consumedTalents: [],
    pendingEcologyEvent: null,
    historyTags: initialTalent ? historyTagsForTalent(initialTalent.id) : [],
    eventHistory: [],
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
  const mutationPressure = 0.045 * (state.resources.mutation / (state.resources.mutation + 600));
  const stabilityPressure = env.volatility * 0.012 + mutationPressure;
  const stabilityRecovery = state.resources.stability < 35 ? 0.035 : 0.02;

  // Trait: 生态共振 — each living/flourishing species gives +1.5% all resources (max 15%)
  const hasEcoResonance = (state.talents ?? []).some((t) => t.trait?.id === "eco_resonance");
  const livingCount = state.species.filter((s) => s.status === "living" || s.status === "flourishing").length;
  const resonanceBonus = hasEcoResonance ? 1 + Math.min(livingCount * 0.015, 0.15) : 1;

  const delta = {
    organic: elapsedSeconds * (0.18 * env.tide + 0.06 * env.heat + speciesOrganic) * nodeBonus * legacyMultiplierFor(state, "organic") * resonanceBonus,
    energy: elapsedSeconds * (0.14 * env.light + 0.05 * env.heat + speciesEnergy) * nodeBonus * legacyMultiplierFor(state, "energy") * resonanceBonus,
    minerals: elapsedSeconds * (0.09 * env.mineralFlow + 0.02 * env.tide) * legacyMultiplierFor(state, "minerals") * resonanceBonus,
    stability: elapsedSeconds * (stabilityRecovery + state.species.length * 0.004 - stabilityPressure) * legacyMultiplierFor(state, "stability"),
    mutation: elapsedSeconds * (0.025 * env.volatility + 0.006 * env.light + state.species.length * 0.001) * legacyMultiplierFor(state, "mutation") * resonanceBonus,
    biomass: elapsedSeconds * (state.unlockedNodes.includes("proto_cell") ? 0.07 + state.species.length * 0.008 : 0.005) * legacyMultiplierFor(state, "biomass") * resonanceBonus
  };
  return applyEcologyComboEffects(applyHistoryTagEffects(applyTalentEffects(delta, state.talents ?? []), state), state);
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
      next.logs.unshift(createLog("legacy", `${living.name}退出当前生态，沉淀为遗产：${legacy.name}。`));

      // Trait: 化石唤醒 — each fossilization grants a new talent choice
      const hasFossilAwaken = (next.talents ?? []).some((t) => t.trait?.id === "fossil_awaken");
      if (hasFossilAwaken) {
        next.pendingTalentChoices = rollTalentChoices(next);
        next.logs.unshift(createLog("system", "远古回声：化石遗产唤醒了新的源质印记选择。"));
      }
    }
  }

  maybeAssignEcologyEvent(next);

  return next;
}

export function applyEnvironmentAction(input: GameState, action: string): GameState {
  const next = cloneState(input);
  const now = new Date().toISOString();

  if (action === "catalyze") {
    const wasQuiet = next.resources.organic < 1 && next.resources.energy < 1 && next.resources.minerals < 1;
    next.resources.organic = clamp(next.resources.organic + 2 + next.environment.mineralFlow * 0.5, 0, 999999);
    next.resources.energy = clamp(next.resources.energy + 0.8 + next.environment.light * 0.3, 0, 999999);
    next.resources.minerals = clamp(next.resources.minerals + 0.4, 0, 999999);
    next.resources.stability = clamp(next.resources.stability + 0.25 + next.environment.mineralFlow * 0.08, 0, 100);
    next.resources.mutation = clamp(next.resources.mutation + next.environment.volatility * 0.2, 0, 999999);
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
    next.resources.mutation = clamp(next.resources.mutation + 2, 0, 999999);
    next.logs.unshift(createLog("event", "提高温度：反应速度上升，突变倾向随之增强。"));
  }

  next.planetProfile = calculatePlanetProfile(next);
  maybeAssignEcologyEvent(next);
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

  // Trait: 复制遗产 — refund 40% of node cost
  const hasReplicateLegacy = (next.talents ?? []).some((t) => t.trait?.id === "replicate_legacy");
  if (hasReplicateLegacy) {
    for (const key of Object.keys(node.cost) as Array<keyof Resources>) {
      const refund = (node.cost[key] ?? 0) * 0.4;
      next.resources[key] = clamp(next.resources[key] + refund, 0, 999999);
    }
    next.logs.unshift(createLog("system", "复制遗产：结构跃迁残留物返还40%消耗。"));
  }

  if (node.unlocksEra) {
    next.currentEra = node.unlocksEra;
    next.pendingTalentChoices = rollTalentChoices(next);
    next.logs.unshift(createLog("era", `纪元推进：${node.name}改变了潮池的生命史方向。`));
  } else {
    next.logs.unshift(createLog("system", `演化节点解锁：${node.name}。`));
  }
  const echo = mainlineEchoForNode(node.id);
  if (echo) {
    next.logs.unshift(createLog("event", echo));
  }
  if (node.branchGroupId) {
    next.historyTags = addUniqueTags(next.historyTags ?? [], [node.id]);
    next.logs.unshift(createLog("event", `复制链留下了「${node.name}」倾向，后来的生命会沿着这道痕迹分化。`));
  }
  next.planetProfile = calculatePlanetProfile(next);
  maybeAssignEcologyEvent(next);
  next.updatedAt = new Date().toISOString();
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
    return true;
  });
}

export function rollEcologyEvent(state: GameState): EcologyEvent | null {
  if ((state.pendingTalentChoices ?? []).length > 0) return null;
  if (state.unlockedNodes.length === 0) return null;
  if (state.logs.slice(0, 6).some((log) => log.message.includes("潮池事件出现"))) return null;
  const eventChance = state.species.length > 0 ? 0.28 : 0.16;
  if (Math.random() > eventChance) return null;
  const events = availableEcologyEvents(state);
  if (events.length === 0) return null;
  const talentIds = new Set((state.talents ?? []).map((talent) => talent.id));
  const weighted = events.flatMap((event) => {
    const weight =
      (event.id === "hot_spring_pulse" && talentIds.has("warm_water")) ||
      (event.id === "tidal_memory_surge" && talentIds.has("tidal_memory")) ||
      (event.id === "lightning_window" && talentIds.has("storm_affinity")) ||
      (event.id === "mineral_shelf_exposed" && talentIds.has("crystal_nursery"))
        ? 2
        : 1;
    return Array.from({ length: weight }, () => event);
  });
  return weighted[Math.floor(Math.random() * weighted.length)] ?? null;
}

export function applyEcologyEventChoice(input: GameState, eventId: string, optionId: string): GameState {
  const next = normalizeGameState(cloneState(input));
  const event = next.pendingEcologyEvent?.id === eventId
    ? next.pendingEcologyEvent
    : ecologyEvents.find((item) => item.id === eventId);
  const option = event?.options.find((item) => item.id === optionId);
  if (!event || !option) {
    throw new Error("潮池事件不可用");
  }
  applyEventOption(next, option);
  next.pendingEcologyEvent = null;
  next.eventHistory = addUniqueTags(next.eventHistory ?? [], [event.id]);
  next.historyTags = addUniqueTags(next.historyTags ?? [], option.addHistoryTags ?? []);
  const newTags = option.addHistoryTags ?? [];
  const hasEcho = newTags.some((tag) => (input.historyTags ?? []).includes(tag));
  next.logs.unshift(createLog("event", hasEcho ? `${option.logMessage} 这类变化正在成为潮池的性格。` : option.logMessage));
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
  next.pendingTalentChoices = [];
  if (selected.consumable) {
    // Instant effect: apply resources directly, don't add to talents
    if (selected.instantEffect) {
      for (const [key, val] of Object.entries(selected.instantEffect) as Array<[keyof Resources, number]>) {
        if (key === "stability") {
          // stability_fix: set to at least the target value
          next.resources.stability = clamp(Math.max(next.resources.stability, val), 0, 100);
        } else {
          next.resources[key] = clamp(next.resources[key] + val, 0, 999999);
        }
      }
    }
    next.consumedTalents.push(selected.id);
    next.logs.unshift(createLog("system", `一次性印记「${selected.name}」生效。${selected.summary}`));
  } else {
    if (!next.talents.some((talent) => talent.id === selected.id)) {
      next.talents.push(selected);
    }
    next.logs.unshift(createLog("system", `新的源质印记「${selected.name}」融入生态。${selected.summary}`));
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
        next.resources[key] = clamp(next.resources[key] + val, 0, 999999);
      }
    }
  }
  next.consumedTalents.push(talent.id);
  next.logs.unshift(createLog("system", `一次性印记「${talent.name}」生效。${talent.summary}`));
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
  return {
    ...state,
    talents: state.talents ?? [],
    pendingTalentChoices: state.pendingTalentChoices ?? [],
    consumedTalents: state.consumedTalents ?? [],
    pendingEcologyEvent: state.pendingEcologyEvent ?? null,
    historyTags: state.historyTags ?? [],
    eventHistory: state.eventHistory ?? []
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
  if (node.branchGroupId) {
    const groupTaken = evolutionNodes.some(
      (item) => item.branchGroupId === node.branchGroupId && state.unlockedNodes.includes(item.id),
    );
    if (groupTaken) return false;
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
    historyTags: speciesHistoryTagsFor(state, role),
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

function addLog(state: GameState, type: EvolutionLog["type"], message: string) {
  if (state.logs[0]?.type === type && state.logs[0]?.message === message) return;
  state.logs.unshift(createLog(type, message));
}

function maybeAssignEcologyEvent(state: GameState) {
  if (state.pendingEcologyEvent) return;
  const event = rollEcologyEvent(state);
  if (!event) return;
  state.pendingEcologyEvent = event;
  addLog(state, "system", `潮池事件出现：${event.title}`);
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
    const max = key === "stability" ? 100 : 999999;
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

function createFirstComboLog(state: GameState): EvolutionLog | null {
  const logged = state.logs.some((log) => log.message.includes("生态组合"));
  if (logged) return null;
  const roles = new Set(
    state.species
      .filter((item) => item.status === "living" || item.status === "flourishing")
      .map((item) => item.ecologicalRole),
  );
  if (roles.has("producer") && roles.has("decomposer")) {
    return createLog("event", "生态组合显现：分解层正在喂养新的生产薄膜，潮池开始有自己的循环。");
  }
  if (roles.has("symbiont") && roles.has("filterer")) {
    return createLog("event", "生态组合显现：滤食孔隙与互养网络接上了，潮池更容易维持稳定。");
  }
  if (roles.has("extremophile") && roles.has("catalyst")) {
    return createLog("event", "生态组合显现：耐受结构贴上催化晶面，变化开始被更大胆地保留。");
  }
  return null;
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

function mainlineEchoForNode(nodeId: string): string {
  const map: Record<string, string> = {
    organic_richness: "第一道痕迹出现时，这颗星球开始拥有可以被记住的过去。",
    replicating_chain: "能重复自己的结构，第一次把偶然变成了未来。",
    replication_fidelity: "潮池开始拥有性格；很久以后，生命也会继承这种倾向。",
    error_retention: "潮池开始拥有性格；很久以后，生命也会继承这种倾向。",
    fragment_budding: "潮池开始拥有性格；很久以后，生命也会继承这种倾向。",
    primitive_vesicle: "反应被边界轻轻包住，第一种生命的轮廓正在靠近。",
    metabolic_loop: "简单循环接上能量，潮池第一次像是在为未来保存火种。",
    proto_cell: "第一种生命被记录下来。文明还很遥远，但历史已经开始。",
    photo_pigment: "生命开始追逐光，下一段生态爆发正在靠近。",
  };
  return map[nodeId] ?? "";
}

function cloneState<T>(state: T): T {
  return JSON.parse(JSON.stringify(state)) as T;
}

function cryptoId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}
