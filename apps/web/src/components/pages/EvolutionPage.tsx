import { useGameStore } from "../../stores/gameStore.js";
import { evolutionNodes, canUnlockEvolutionNode } from "@eco-era/game-core";
import { unlockNode } from "../../api.js";
import { useUIStore } from "../../stores/uiStore.js";

export function EvolutionPage() {
  const save = useGameStore((s) => s.save);
  const setSave = useGameStore((s) => s.setSave);
  const setPage = useUIStore((s) => s.setPage);
  const hideModal = useUIStore((s) => s.hideModal);

  if (!save) {
    return (
      <div className="page evolution-page">
        <div className="empty-state">
          <span className="empty-icon">⬡</span>
          <p className="empty-title">演化路径尚未激活</p>
          <p className="empty-hint">推动潮池积累有机质，演化之门即将开启。</p>
          <button className="btn-secondary" onClick={() => setPage("home")}>返回潮池</button>
        </div>
      </div>
    );
  }

  const handleUnlock = async (nodeId: string) => {
    try {
      const updated = await unlockNode(save.id, nodeId);
      setSave(updated);
      if (updated.pendingTalentChoices?.length > 0) {
        hideModal();
        setTimeout(() => {
          useUIStore.getState().showModal("talent-awakening");
        }, 300);
      }
    } catch (e) {
      // silently fail, canUnlockEvolutionNode gates this
    }
  };

  return (
    <div className="page evolution-page">
      <h2 className="page-title">演化路径</h2>
      <p className="page-hint">点亮节点不是购买升级，而是在生命史中确认一种关键结构。</p>
      <div className="evolution-path">
        {evolutionNodes.map((node, idx) => {
          const unlocked = save.unlockedNodes.includes(node.id);
          const canUnlock = canUnlockEvolutionNode(save, node.id);
          let stateClass = "locked";
          if (unlocked) stateClass = "unlocked";
          else if (canUnlock) stateClass = "available";

          return (
            <div key={node.id} className="evolution-node-row">
              {idx > 0 && <div className={`node-connector ${unlocked ? "active" : ""}`} />}
              <button
                className={`evolution-node ${stateClass}`}
                disabled={!canUnlock}
                onClick={() => handleUnlock(node.id)}
              >
                <div className={`node-circle ${stateClass}`}>
                  <span className="node-icon">
                    {unlocked ? "★" : canUnlock ? "◆" : "◇"}
                  </span>
                </div>
                <div className="node-info">
                  <span className="node-name">{node.name}</span>
                  <span className="node-desc">{node.description}</span>
                  {!unlocked && (
                    <span className="node-cost">
                      {Object.entries(node.cost)
                        .map(([k, v]) => `${labelFor(k)} ${v}`)
                        .join(" · ")}
                    </span>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function labelFor(key: string): string {
  const map: Record<string, string> = {
    organic: "有机质", energy: "能量", minerals: "矿物质",
    stability: "稳定性", mutation: "突变点", biomass: "生物量",
  };
  return map[key] ?? key;
}
