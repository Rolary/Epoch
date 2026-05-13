import { useGameStore } from "../../stores/gameStore.js";
import { useUIStore } from "../../stores/uiStore.js";

export function FossilPage() {
  const legacies = useGameStore((s) => s.legacies());
  const setPage = useUIStore((s) => s.setPage);

  if (legacies.length === 0) {
    return (
      <div className="page fossil-page">
        <h2 className="page-title">化石遗产</h2>
        <div className="empty-state">
          <span className="empty-icon">❖</span>
          <p className="empty-title">等待第一个物种走完生命历程</p>
          <p className="empty-hint">当物种在筛选事件中退出生态，它们会沉淀为永久遗产。</p>
          <button className="btn-secondary" onClick={() => setPage("home")}>返回潮池</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page fossil-page">
      <h2 className="page-title">化石遗产</h2>
      <p className="page-hint">每一次灭绝都是生命史重塑的契机，遗产将永久加成这颗星球。</p>
      <div className="fossil-list">
        {legacies.map((legacy) => (
          <div key={legacy.id} className="fossil-card">
            <div className="fossil-icon">{typeIcon(legacy.type)}</div>
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

function typeIcon(type: string): string {
  const m: Record<string, string> = {
    fossil: "🪨", ancestor: "🧬", empty_niche: "🔲", warning: "⚠️", archive: "📜",
  };
  return m[type] ?? "❖";
}

function typeLabel(type: string): string {
  const m: Record<string, string> = {
    fossil: "化石", ancestor: "祖先", empty_niche: "生态空位", warning: "警示", archive: "博物档案",
  };
  return m[type] ?? type;
}
