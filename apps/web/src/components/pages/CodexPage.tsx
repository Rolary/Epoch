import type { SpeciesRecord } from "@eco-era/shared";
import { useGameStore } from "../../stores/gameStore.js";
import { useUIStore } from "../../stores/uiStore.js";
import { uiAssets } from "../../assets/uiAssets.js";

const SPECIES_CARD_ASSETS = [
  uiAssets.cards.crystal,
  uiAssets.cards.energy,
  uiAssets.cards.tide,
] as const;

const SPECIES_ROLE_ASSETS: Record<string, string> = {
  producer: uiAssets.species.producer,
  decomposer: uiAssets.species.decomposer,
  symbiont: uiAssets.species.symbiont,
  extremophile: uiAssets.species.extremophile,
  filterer: uiAssets.species.filterer,
  catalyst: uiAssets.species.catalyst,
};

export function CodexPage() {
  const rawSpecies = useGameStore((s) => s.species());
  const save = useGameStore((s) => s.save);
  const species = uniqueSpecies(rawSpecies);
  const setPage = useUIStore((s) => s.setPage);
  const setSpeciesDetailId = useUIStore((s) => s.setSpeciesDetailId);

  if (species.length === 0) {
    return (
      <div className="page codex-page">
        <h2 className="page-title">物种图鉴</h2>
        <div className="empty-state">
          <span className="empty-icon">◈</span>
          <p className="empty-title">潮池仍在孕育生命</p>
          <p className="empty-hint">一旦新的生命形态成形，图鉴将自动记录。</p>
          <button className="btn-secondary" onClick={() => setPage("home")}>返回潮池</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page codex-page">
      <h2 className="page-title">物种图鉴</h2>
      <p className="page-hint">
        已记录 {species.length} 个谱系 — 每个物种都参与塑造这颗星球的生态。
      </p>
      <div className="codex-role-summary" aria-label="生态角色概览">
        {roleSummary(species).map((role) => (
          <div key={role.id} className={`codex-role-chip ${role.count > 0 ? "active" : ""}`}>
            <img src={role.asset} alt="" aria-hidden="true" />
            <span>{role.label}</span>
            <strong>{role.count}</strong>
          </div>
        ))}
      </div>
      <div className="codex-list">
        {species.map((sp) => (
          <button
            key={sp.id}
            className="codex-card"
            onClick={() => {
              setSpeciesDetailId(sp.id);
              setPage("codex-detail");
            }}
          >
            <div className={`card-visual asset-card rarity-${sp.status}`}>
              <img
                src={speciesAssetFor(sp.ecologicalRole, sp.id)}
                alt=""
                aria-hidden="true"
              />
            </div>
            <div className="card-info">
              <span className="card-name">{sp.name}</span>
              <span className="card-niche">{sp.niche} · {roleLabel(sp.ecologicalRole)}</span>
              <span className={`card-cycle ${cycleStatusFor(sp.ecologicalRole, save).tone}`}>
                {cycleStatusFor(sp.ecologicalRole, save).label}
              </span>
              <span className={`card-status status-${sp.status}`}>{statusLabel(sp.status)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function CodexDetailPage() {
  const species = uniqueSpecies(useGameStore((s) => s.species()));
  const save = useGameStore((s) => s.save);
  const detailId = useUIStore((s) => s.speciesDetailId);
  const setPage = useUIStore((s) => s.setPage);
  const sp = species.find((s) => s.id === detailId);

  if (!sp) {
    setPage("codex");
    return null;
  }

  return (
    <div className="page codex-detail-page">
      <button className="btn-back" onClick={() => setPage("codex")}>← 图鉴</button>
      <div className="detail-visual asset-detail">
        <img
          src={speciesAssetFor(sp.ecologicalRole, sp.id)}
          alt=""
          aria-hidden="true"
        />
      </div>
      <h2 className="detail-name">{sp.name}</h2>
      <div className="detail-tags">
        <span className="tag">{sp.niche}</span>
        <span className="tag">{roleLabel(sp.ecologicalRole)}</span>
        <span className={`tag status-${sp.status}`}>{statusLabel(sp.status)}</span>
        {(sp.historyTags ?? []).map((tag) => (
          <span key={tag} className="tag">{historyTagLabel(tag)}</span>
        ))}
      </div>
      <p className="detail-desc">{sp.shortDescription}</p>
      <div className="detail-grid">
        <div className="detail-block">
          <span className="detail-label">特性</span>
          <span>{sp.traits.join("、")}</span>
        </div>
        <div className="detail-block">
          <span className="detail-label">脆弱点</span>
          <span>{sp.vulnerabilities.join("、")}</span>
        </div>
        <div className="detail-block">
          <span className="detail-label">生态影响</span>
          <span>
            {Object.entries(sp.numericEffects)
              .filter(([, v]) => v !== 0)
              .map(([k, v]) => `${labelRes(k)} ${v > 0 ? "+" : ""}${(v * 100).toFixed(0)}%`)
              .join(" · ") || "待评估"}
          </span>
        </div>
        <div className="detail-block">
          <span className="detail-label">生态关系</span>
          <span>{roleRelationCopy(sp.ecologicalRole)}{recentResonanceCopy(sp.ecologicalRole, save?.resonanceHistory ?? [])}</span>
        </div>
        {(sp.historyTags ?? []).length > 0 && (
          <div className="detail-block">
            <span className="detail-label">生命史倾向</span>
            <span>{(sp.historyTags ?? []).map(historyTagLabel).join("、")}</span>
          </div>
        )}
        <div className="detail-block">
          <span className="detail-label">谱系</span>
          <span>{sp.lineageSummary}</span>
        </div>
        {sp.legacyHint && (
          <div className="detail-block">
            <span className="detail-label">遗产可能</span>
            <span>{sp.legacyHint}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function recentResonanceCopy(role: string, history: string[]): string {
  const last = history.at(-1);
  if (!last) return "";
  const roleMap: Record<string, string[]> = {
    producer: ["decomposer_feeds_producer", "filter_pores_clear_tide", "bloom_selection_pressure"],
    decomposer: ["decomposer_feeds_producer"],
    filterer: ["filter_pores_clear_tide", "bloom_selection_pressure"],
  };
  if (!roleMap[role]?.includes(last)) return "";
  const copy: Record<string, string> = {
    decomposer_feeds_producer: " 最近一次共鸣中，它参与了生产与分解的回喂。",
    filter_pores_clear_tide: " 最近一次共鸣中，它参与了过滤浑浊水体。",
    bloom_selection_pressure: " 最近一次共鸣中，它参与了承受繁盛筛选。",
  };
  return copy[last] ?? "";
}

function uniqueSpecies(species: SpeciesRecord[] | undefined) {
  const seen = new Set<string>();
  const seenIdentity = new Set<string>();
  const result: SpeciesRecord[] = [];
  for (const item of species ?? []) {
    const key = item.id;
    const identity = `${item.name}:${item.ecologicalRole}:${item.niche}`;
    if (seen.has(key) || seenIdentity.has(identity)) continue;
    seen.add(key);
    seenIdentity.add(identity);
    result.push(item);
  }
  return result;
}

function roleSummary(species: Array<{ ecologicalRole: string; status: string }>) {
  const living = species.filter((item) => item.status === "living" || item.status === "flourishing");
  const count = (role: string) => living.filter((item) => item.ecologicalRole === role).length;
  return [
    { id: "producer", label: "生产者", asset: uiAssets.species.producer, count: count("producer") },
    { id: "decomposer", label: "分解者", asset: uiAssets.species.decomposer, count: count("decomposer") },
    { id: "filterer", label: "滤食者", asset: uiAssets.species.filterer, count: count("filterer") },
  ];
}

function cycleStatusFor(role: string, save: ReturnType<typeof useGameStore.getState>["save"]) {
  const roles = new Set(
    (save?.species ?? [])
      .filter((item) => item.status === "living" || item.status === "flourishing")
      .map((item) => item.ecologicalRole),
  );
  if (save?.chapterProgress?.ecologyCycleFormed || save?.unlockedNodes.includes("mutual_ecology_cycle")) {
    if (["producer", "decomposer", "filterer"].includes(role)) return { label: "参与小循环", tone: "active" };
  }
  if (role === "producer" && roles.has("decomposer")) return { label: "等待滤食者", tone: "waiting" };
  if (role === "decomposer" && roles.has("producer")) return { label: "回喂生产者", tone: "active" };
  if (role === "filterer" && roles.has("producer")) return { label: "稳定水体", tone: "active" };
  if (["producer", "decomposer", "filterer"].includes(role)) return { label: "等待组合", tone: "waiting" };
  return { label: "旁支角色", tone: "quiet" };
}

function historyTagLabel(tag: string): string {
  const m: Record<string, string> = {
    heat_tolerant: "耐热倾向",
    volatile: "高波动",
    stable_membrane: "稳膜倾向",
    tidal_rich: "潮汐富集",
    crowded_soup: "丰厚原汤",
    clear_tide: "清潮记忆",
    edge_feeding: "边缘摄食",
    branching: "旁支分化",
    charged: "高能电痕",
    mineral_catalyst: "矿晶依赖",
    mutation_biased: "突变偏向",
    selection_pressure: "筛选压力",
    sheltered: "庇护缝隙",
    symbiotic_seed: "共生种源",
    replication_fidelity: "高保真复制",
    error_retention: "错误保留",
    fragment_budding: "断裂繁殖",
    light_chasing: "追光倾向",
    producer_seed: "生产者种源",
    decomposer_seed: "分解者种源",
    filterer_seed: "滤食者种源",
    ecology_cycle: "生态循环",
    ecology_imbalance_faced: "经历失衡",
    stable_cycle: "稳定循环",
    decomposer_cycle: "分解循环",
    ecological_personality: "生态性格",
  };
  return m[tag] ?? tag;
}

function roleLabel(role: string): string {
  const m: Record<string, string> = {
    producer: "生产者", decomposer: "分解者", symbiont: "共生者",
    extremophile: "极端适应者", filterer: "滤食者", catalyst: "催化剂",
  };
  return m[role] ?? role;
}

function roleRelationCopy(role: string): string {
  const m: Record<string, string> = {
    producer: "把光照转成能量；若有分解者回收残余物，会更容易形成循环。",
    decomposer: "把旧薄膜和碎片拆回材料；能喂养生产薄膜，也会缓解过度繁盛。",
    filterer: "筛入潮汐颗粒并稳定水体；与生产者、分解者共同接上第一组小循环。",
    symbiont: "连接不同谱系的养分交换；会让生态更偏向共生网络。",
    extremophile: "在热盐或强扰动里维持生命；会把潮池推向极端适应。",
    catalyst: "加快矿物晶面上的反应；与耐受者组合时更容易保留大胆变化。",
  };
  return m[role] ?? "它会以自己的方式改变潮池里的资源流。";
}

function statusLabel(status: string): string {
  const m: Record<string, string> = {
    living: "现存", flourishing: "繁盛", endangered: "濒危",
    extinct: "灭绝", fossilized: "化石化",
  };
  return m[status] ?? status;
}

function labelRes(key: string): string {
  const m: Record<string, string> = {
    organic: "有机质", energy: "能量", minerals: "矿物质",
    stability: "稳定性", mutation: "突变", biomass: "生物量",
  };
  return m[key] ?? key;
}

function speciesAssetFor(role: string, id: string): string {
  return SPECIES_ROLE_ASSETS[role] ?? SPECIES_CARD_ASSETS[indexForId(id) % SPECIES_CARD_ASSETS.length];
}

function indexForId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash += id.charCodeAt(i) * (i + 1);
  return Math.abs(hash);
}
