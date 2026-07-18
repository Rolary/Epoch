import type { CodexObservation, SpeciesRecord } from "@eco-era/shared";
import { useGameStore } from "../../stores/gameStore.js";
import { useUIStore } from "../../stores/uiStore.js";
import { uiAssets } from "../../assets/uiAssets.js";

const SPECIES_ROLE_ASSETS: Record<string, string> = {
  producer: uiAssets.species.producer,
  decomposer: uiAssets.species.decomposer,
  symbiont: uiAssets.species.symbiont,
  extremophile: uiAssets.species.extremophile,
  filterer: uiAssets.species.filterer,
  catalyst: uiAssets.species.catalyst,
};

export function CodexPage() {
  const save = useGameStore((s) => s.save);
  const species = uniqueSpecies(useGameStore((s) => s.species()));
  const observations = summarizeObservations(save?.codexObservations ?? []);
  const setPage = useUIStore((s) => s.setPage);
  const setSpeciesDetailId = useUIStore((s) => s.setSpeciesDetailId);

  if (species.length === 0) {
    return (
      <div className="page codex-page">
        <h2 className="page-title">物种图鉴</h2>
        <div className="empty-state">
          <img className="empty-icon asset-empty-icon" src={uiAssets.emblems.discovery} alt="" aria-hidden="true" />
          <p className="empty-title">潮池仍在孕育生命</p>
          <p className="empty-hint">新的生命形态成形后，图鉴会自动记录。</p>
          <button className="btn-secondary" onClick={() => setPage("home")}>返回潮池</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page codex-page">
      <h2 className="page-title">物种图鉴</h2>
      <p className="page-hint">已记录 {species.length} 个谱系。查看它们生活的位置、生态角色和当前影响。</p>
      <div className="codex-role-summary" aria-label="生态角色概览">
        {roleSummary(species).map((role) => (
          <div key={role.id} className={`codex-role-chip ${role.count > 0 ? "active" : ""}`}>
            <img src={role.asset} alt="" aria-hidden="true" />
            <span>{role.label}</span>
            <strong>{role.count}</strong>
          </div>
        ))}
      </div>
      {observations.length > 0 && <CodexObservationPanel observations={observations} />}
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
              <img src={speciesAssetFor(sp.ecologicalRole)} alt="" aria-hidden="true" />
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
  const sp = species.find((item) => item.id === detailId);
  const observations = summarizeObservations(
    (save?.codexObservations ?? []).filter((item) => item.relatedSpeciesId === detailId),
  );

  if (!sp) {
    setPage("codex");
    return null;
  }
  const hasShorelinePosture = (sp.historyTags ?? []).includes("shore_colonized")
    || sp.habitats?.includes("intertidal_wet_rock");

  return (
    <div className="page codex-detail-page">
      <button className="btn-back" onClick={() => setPage("codex")}>← 图鉴</button>
      <div className={`detail-visual asset-detail ${hasShorelinePosture ? "shoreline-posture-visual" : ""}`}>
        <img
          src={hasShorelinePosture ? uiAssets.species.shorelineRolePosture : speciesAssetFor(sp.ecologicalRole)}
          alt=""
          aria-hidden="true"
        />
      </div>
      <h2 className="detail-name">{sp.name}</h2>
      <div className="detail-tags">
        <span className="tag">{sp.niche}</span>
        <span className="tag">{roleLabel(sp.ecologicalRole)}</span>
        <span className={`tag status-${sp.status}`}>{statusLabel(sp.status)}</span>
        {(sp.historyTags ?? []).map((tag) => <span key={tag} className="tag">{historyTagLabel(tag)}</span>)}
      </div>
      <p className="detail-desc">{sp.shortDescription}</p>
      <div className="detail-grid">
        <DetailBlock label="特性" value={sp.traits.join("、") || "待观察"} />
        <DetailBlock label="脆弱点" value={sp.vulnerabilities.join("、") || "待观察"} />
        <DetailBlock label="生态影响" value={speciesEffectCopy(sp)} />
        <DetailBlock label="生态关系" value={`${roleRelationCopy(sp.ecologicalRole)}${recentResonanceCopy(sp.ecologicalRole, save?.resonanceHistory ?? [])}`} />
        {hasShorelinePosture && <DetailBlock label="跨水线姿态" value="水下时结构舒展，抵达湿岩后缩成紧密薄膜并附着在岩面；这是同一支生命对干湿变化的适应。" />}
        {(sp.historyTags ?? []).length > 0 && <DetailBlock label="生命史倾向" value={(sp.historyTags ?? []).map(historyTagLabel).join("、")} />}
        <DetailBlock label="谱系" value={sp.lineageSummary} />
        {sp.legacyHint && <DetailBlock label="遗产可能" value={sp.legacyHint} />}
        {observations.length > 0 && (
          <DetailBlock
            label="新观察"
            value={observations.map((item) => `${item.title}${item.repeatCount > 1 ? ` ×${item.repeatCount}` : ""}`).join(" / ")}
          />
        )}
      </div>
    </div>
  );
}

type SummarizedObservation = CodexObservation & { repeatCount: number };

function CodexObservationPanel({ observations }: { observations: SummarizedObservation[] }) {
  return (
    <section className="codex-observation-panel">
      <span className="codex-observation-kicker">生态发现</span>
      {observations.slice(0, 3).map((item) => (
        <article key={item.id} className={`codex-observation ${item.isNew ? "new" : ""}`}>
          <span className="codex-observation-title">
            {item.title}
            {item.repeatCount > 1 && <small>重复观察 {item.repeatCount} 次</small>}
          </span>
          <span className="codex-observation-desc">{item.description}</span>
        </article>
      ))}
    </section>
  );
}

function summarizeObservations(observations: CodexObservation[]): SummarizedObservation[] {
  const groups = new Map<string, SummarizedObservation>();
  for (const observation of observations) {
    const key = `${observation.relatedSpeciesId}:${observation.relatedRole}:${observation.title}`;
    const current = groups.get(key);
    if (current) {
      current.repeatCount += 1;
      current.isNew = current.isNew || observation.isNew;
      continue;
    }
    groups.set(key, { ...observation, repeatCount: 1 });
  }
  return Array.from(groups.values());
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-block">
      <span className="detail-label">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function uniqueSpecies(species: SpeciesRecord[] | undefined) {
  const seen = new Set<string>();
  const seenIdentity = new Set<string>();
  const result: SpeciesRecord[] = [];
  for (const item of species ?? []) {
    const identity = `${item.name}:${item.ecologicalRole}:${item.niche}`;
    if (seen.has(item.id) || seenIdentity.has(identity)) continue;
    seen.add(item.id);
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
  const roles = new Set((save?.species ?? []).filter((item) => item.status === "living" || item.status === "flourishing").map((item) => item.ecologicalRole));
  if (save?.chapterProgress?.ecologyCycleFormed || save?.unlockedNodes.includes("mutual_ecology_cycle")) {
    if (["producer", "decomposer", "filterer"].includes(role)) return { label: "参与小循环", tone: "active" };
  }
  if (role === "producer" && roles.has("decomposer")) return { label: "等待滤食者", tone: "waiting" };
  if (role === "decomposer" && roles.has("producer")) return { label: "回喂生产者", tone: "active" };
  if (role === "filterer" && roles.has("producer")) return { label: "稳定水体", tone: "active" };
  if (["producer", "decomposer", "filterer"].includes(role)) return { label: "等待组合", tone: "waiting" };
  return { label: "旁支角色", tone: "quiet" };
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

function speciesEffectCopy(sp: SpeciesRecord) {
  return Object.entries(sp.numericEffects)
    .filter(([, value]) => value !== 0)
    .map(([key, value]) => `${labelRes(key)} ${value > 0 ? "+" : ""}${(value * 100).toFixed(0)}%`)
    .join(" · ") || "待评估";
}

function historyTagLabel(tag: string): string {
  const labels: Record<string, string> = {
    heat_tolerant: "耐热倾向",
    stable_membrane: "稳膜倾向",
    tidal_rich: "潮汐富集",
    mineral_catalyst: "矿晶依赖",
    mutation_biased: "突变偏向",
    selection_pressure: "筛选压力",
    symbiotic_seed: "共生种源",
    replication_fidelity: "高保真复制",
    error_retention: "错误保留",
    fragment_budding: "断裂繁殖",
    light_chasing: "追光倾向",
    ecology_cycle: "生态循环",
    ecology_imbalance_faced: "经历失衡",
    ecological_personality: "潮池的样子",
    producer_seed: "生产谱系",
    decomposer_seed: "分解谱系",
    filterer_seed: "滤食谱系",
    edge_feeding: "潮孔摄食",
    shore_colonized: "贴岸记录",
    intertidal_attachment: "湿岩附着",
  };
  return labels[tag] ?? tag;
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    producer: "生产者",
    decomposer: "分解者",
    symbiont: "共生者",
    extremophile: "极端适应者",
    filterer: "滤食者",
    catalyst: "催化者",
  };
  return labels[role] ?? role;
}

function roleRelationCopy(role: string): string {
  const copy: Record<string, string> = {
    producer: "把光照转成能量；若有分解者回收残余物，会更容易形成循环。",
    decomposer: "把旧薄膜和碎片拆回材料；能为生产薄膜补充材料，也会缓解过度繁盛。",
    filterer: "筛入潮汐颗粒并稳定水体；与生产者、分解者共同形成第一组小循环。",
    symbiont: "在不同谱系之间交换养分；互养关系越多，生态循环越稳定。",
    extremophile: "在热盐或强扰动里维持生命；会把潮池推向极端适应。",
    catalyst: "加快矿物晶面上的反应；与耐受者组合时更容易保留大胆变化。",
  };
  return copy[role] ?? "它正在改变周围材料的流动方式。";
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    living: "现存",
    flourishing: "繁盛",
    endangered: "濒危",
    extinct: "灭绝",
    fossilized: "化石化",
  };
  return labels[status] ?? status;
}

function labelRes(key: string): string {
  const labels: Record<string, string> = {
    organic: "有机质",
    energy: "能量",
    minerals: "矿物质",
    stability: "稳定性",
    mutation: "突变",
    biomass: "生物量",
  };
  return labels[key] ?? key;
}

function speciesAssetFor(role: string): string {
  return SPECIES_ROLE_ASSETS[role] ?? uiAssets.emblems.discovery;
}
