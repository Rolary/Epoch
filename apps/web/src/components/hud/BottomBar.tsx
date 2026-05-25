import { canUnlockEvolutionNode, evolutionNodes } from "@eco-era/game-core";
import { uiAssets } from "../../assets/uiAssets.js";
import { useGameStore } from "../../stores/gameStore.js";
import { useUIStore } from "../../stores/uiStore.js";
import type { Page } from "../../stores/uiStore.js";

const NAV_ITEMS: Array<{ id: Page; asset: string; label: string }> = [
  { id: "home", asset: uiAssets.resources.stability, label: "潮池" },
  { id: "evolution", asset: uiAssets.resources.mutation, label: "演化" },
  { id: "codex", asset: uiAssets.emblems.discovery, label: "图鉴" },
  { id: "fossils", asset: uiAssets.cards.tide, label: "遗产" },
  { id: "logs", asset: uiAssets.emblems.system, label: "生命史" },
  { id: "settings", asset: uiAssets.resources.energy, label: "档案" },
];

function isNavUnlocked(navId: string): boolean {
  const save = useGameStore.getState().save;
  if (!save) return navId === "home" || navId === "settings";
  if (navId === "home" || navId === "settings") return true;
  if (navId === "evolution") return hasEvolutionAccess();
  if (navId === "codex") return save.species.length > 0;
  if (navId === "fossils") return save.legacies.length > 0;
  if (navId === "logs") return save.logs.length > 3;
  return false;
}

function canAnyNodeBeUnlocked(): boolean {
  const save = useGameStore.getState().save;
  if (!save) return false;
  return evolutionNodes.some((node) => {
    if (save.unlockedNodes.includes(node.id)) return false;
    return canUnlockEvolutionNode(save, node.id);
  });
}

function hasEvolutionAccess(): boolean {
  const save = useGameStore.getState().save;
  if (!save) return false;
  return save.unlockedNodes.length > 0 || canAnyNodeBeUnlocked();
}

export function BottomBar() {
  const setPage = useUIStore((s) => s.setPage);
  const page = useUIStore((s) => s.page);
  const seenUnlockHints = useUIStore((s) => s.seenUnlockHints);
  const markUnlockHintSeen = useUIStore((s) => s.markUnlockHintSeen);
  const unlockGuideTarget = useUIStore((s) => s.unlockGuideTarget);
  const setUnlockGuideTarget = useUIStore((s) => s.setUnlockGuideTarget);
  const isCreate = page === "create-ecology";

  if (isCreate) return null;

  const evolutionAlert = canAnyNodeBeUnlocked();

  return (
    <div className="bottom-bar">
      <div className="nav-icons">
        {NAV_ITEMS.filter((item) => isNavUnlocked(item.id)).map((item) => {
          const isNew = item.id !== "home" && item.id !== "settings" && !seenUnlockHints.includes(item.id);
          const isGuideTarget = unlockGuideTarget === item.id;
          return (
            <button
              key={item.id}
              className={`nav-btn ${page === item.id ? "active" : ""} ${
                item.id === "evolution" && evolutionAlert ? "glow-alert" : ""
              } ${isNew ? "new-unlock" : ""} ${isGuideTarget ? "unlock-guide-target" : ""}`}
              onClick={() => {
                markUnlockHintSeen(item.id);
                if (isGuideTarget) setUnlockGuideTarget(null);
                setPage(item.id);
              }}
            >
              <img className="nav-icon" src={item.asset} alt="" aria-hidden="true" />
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
