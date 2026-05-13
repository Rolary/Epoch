import { useGameStore } from "../../stores/gameStore.js";
import { useUIStore } from "../../stores/uiStore.js";

const NAV_ITEMS = [
  { id: "home" as const, icon: "◉", label: "潮池" },
  { id: "evolution" as const, icon: "⬡", label: "演化" },
  { id: "codex" as const, icon: "◈", label: "图鉴" },
  { id: "fossils" as const, icon: "❖", label: "遗产" },
  { id: "logs" as const, icon: "☰", label: "日志" },
  { id: "settings" as const, icon: "⚙", label: "设置" },
];

function isNavUnlocked(navId: string): boolean {
  const save = useGameStore.getState().save;
  if (!save) {
    if (navId === "home" || navId === "settings" || navId === "create-ecology") return true;
    return false;
  }
  if (navId === "home" || navId === "settings") return true;
  if (navId === "evolution" && save.unlockedNodes.length >= 0 && save.resources.organic >= 10) return true;
  if (navId === "codex" && save.species.length > 0) return true;
  if (navId === "fossils" && save.legacies.length > 0) return true;
  if (navId === "logs" && save.logs.length > 3) return true;
  return false;
}

export function BottomBar() {
  const setPage = useUIStore((s) => s.setPage);
  const page = useUIStore((s) => s.page);
  const showSheet = useUIStore((s) => s.showSheet);
  const save = useGameStore((s) => s.save);
  const isCreate = page === "create-ecology";

  if (isCreate) return null;

  const canStrategize = save && save.unlockedNodes.length > 0;

  return (
    <div className="bottom-bar">
      <div className="nav-icons">
        {NAV_ITEMS.filter((item) => isNavUnlocked(item.id)).map((item) => (
          <button
            key={item.id}
            className={`nav-btn ${page === item.id ? "active" : ""}`}
            onClick={() => setPage(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </div>
      {canStrategize && (
        <button className="strategy-fab" onClick={() => showSheet("strategy")}>
          <span className="fab-icon">⧩</span>
        </button>
      )}
    </div>
  );
}
