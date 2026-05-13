import { useGameStore } from "../../stores/gameStore.js";
import { useUIStore } from "../../stores/uiStore.js";

export function CodexPage() {
  const species = useGameStore((s) => s.species());
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
            <div className={`card-visual rarity-${sp.status}`}>
              <span className="card-placeholder">{sp.name.slice(0, 2)}</span>
            </div>
            <div className="card-info">
              <span className="card-name">{sp.name}</span>
              <span className="card-niche">{sp.niche} · {roleLabel(sp.ecologicalRole)}</span>
              <span className={`card-status status-${sp.status}`}>{statusLabel(sp.status)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function CodexDetailPage() {
  const species = useGameStore((s) => s.species());
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
      <div className="detail-visual">
        <span className="detail-placeholder">{sp.name.slice(0, 3)}</span>
      </div>
      <h2 className="detail-name">{sp.name}</h2>
      <div className="detail-tags">
        <span className="tag">{sp.niche}</span>
        <span className="tag">{roleLabel(sp.ecologicalRole)}</span>
        <span className={`tag status-${sp.status}`}>{statusLabel(sp.status)}</span>
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

function roleLabel(role: string): string {
  const m: Record<string, string> = {
    producer: "生产者", decomposer: "分解者", symbiont: "共生者",
    extremophile: "极端适应者", filterer: "滤食者", catalyst: "催化剂",
  };
  return m[role] ?? role;
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
