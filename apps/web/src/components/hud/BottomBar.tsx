import { useGameStore } from "../../stores/gameStore.js";
import { useUIStore } from "../../stores/uiStore.js";
import { canUnlockEvolutionNode, evolutionNodes } from "@eco-era/game-core";

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
    if (navId === "home" || navId === "settings") return true;
    return false;
  }
  if (navId === "home" || navId === "settings") return true;
  if (navId === "evolution") {
    return save.unlockedNodes.length > 0 || save.resources.organic >= 10;
  }
  if (navId === "codex") return save.species.length > 0;
  if (navId === "fossils") return save.legacies.length > 0;
  if (navId === "logs") return save.logs.length > 3;
  return false;
}

function canAnyNodeBeUnlocked(): boolean {
  const save = useGameStore.getState().save;
  if (!save) return false;
  return evolutionNodes.some((n) => {
    if (save.unlockedNodes.includes(n.id)) return false;
    return canUnlockEvolutionNode(save, n.id);
  });
}

export function BottomBar() {
  const setPage = useUIStore((s) => s.setPage);
  const page = useUIStore((s) => s.page);
  const showSheet = useUIStore((s) => s.showSheet);
  const save = useGameStore((s) => s.save);
  const isCreate = page === "create-ecology";

  if (isCreate) return null;

  const canStrategize = save && save.unlockedNodes.length > 0;
  const evolutionAlert = canAnyNodeBeUnlocked();

  return (
    <div className="bottom-bar">
      <div className="nav-icons">
        {NAV_ITEMS.filter((item) => isNavUnlocked(item.id)).map((item) => (
          <button
            key={item.id}
            className={`nav-btn ${page === item.id ? "active" : ""} ${item.id === "evolution" && evolutionAlert ? "glow-alert" : ""}`}
            onClick={() => setPage(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </div>
      {canStrategize && (
        <button className="strategy-fab" data-tooltip="生态干预" onClick={() => showSheet("strategy")}>
          <span className="fab-icon">⧩</span>
        </button>
      )}
    </div>
  );
}
