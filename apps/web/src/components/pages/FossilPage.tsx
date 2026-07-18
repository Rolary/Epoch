import { uiAssets } from "../../assets/uiAssets.js";
import { useGameStore } from "../../stores/gameStore.js";
import { useUIStore } from "../../stores/uiStore.js";

const LEGACY_ASSETS: Record<string, string> = {
  fossil: uiAssets.cards.tide,
  ancestor: uiAssets.emblems.discovery,
  empty_niche: uiAssets.resources.stability,
  warning: uiAssets.resources.mutation,
  archive: uiAssets.emblems.system,
};

export function FossilPage() {
  const legacies = useGameStore((s) => s.legacies());
  const setPage = useUIStore((s) => s.setPage);

  if (legacies.length === 0) {
    return (
      <div className="page fossil-page">
        <h2 className="page-title">化石遗产</h2>
        <div className="empty-state">
          <img className="empty-icon asset-empty-icon" src={uiAssets.emblems.reward} alt="" aria-hidden="true" />
          <p className="empty-title">等待第一个物种走完生命历程</p>
          <p className="empty-hint">当物种退出生态，它可能留下化石、生态空位或一段警示。</p>
          <button className="btn-secondary" onClick={() => setPage("home")}>
            返回潮池
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page fossil-page">
      <h2 className="page-title">化石遗产</h2>
      <p className="page-hint">离开的物种仍会影响后来生命。这里记录它们留下的结构、空位与环境教训。</p>
      <div className="fossil-list">
        {legacies.map((legacy) => (
          <div key={legacy.id} className="fossil-card">
            <img
              className="fossil-icon"
              src={LEGACY_ASSETS[legacy.type] ?? uiAssets.emblems.reward}
              alt=""
              aria-hidden="true"
            />
            <div className="fossil-info">
              <span className="fossil-name">{legacy.name}</span>
              <span className="fossil-type">{typeLabel(legacy.type)} 遗产</span>
              <span className="fossil-effect">{legacy.effect}</span>
              <span className="fossil-desc">{legacy.description}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function typeLabel(type: string): string {
  const m: Record<string, string> = {
    fossil: "化石",
    ancestor: "祖先",
    empty_niche: "生态空位",
    warning: "警示",
    archive: "博物档案",
  };
  return m[type] ?? type;
}
