import { canUnlockEvolutionNode, evolutionNodes } from "@eco-era/game-core";
import { uiAssets } from "../../assets/uiAssets.js";
import { tickSave, unlockNode } from "../../api.js";
import { useGameStore } from "../../stores/gameStore.js";
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
          <span className="empty-icon">生命</span>
          <p className="empty-title">潮池还没有留下生命痕迹</p>
          <p className="empty-hint">回到潮池，把发光的养料拖进水里。第一道痕迹出现后，这里会打开。</p>
          <button className="btn-secondary" onClick={() => setPage("home")}>返回潮池</button>
        </div>
      </div>
    );
  }

  const handleUnlock = async (nodeId: string) => {
    try {
      const previousSpeciesCount = save.species.length;
      const synced = await tickSave(save.id);
      setSave(synced);
      const updated = await unlockNode(save.id, nodeId);
      setSave(updated);
      const newSpecies = updated.species.length > previousSpeciesCount ? updated.species[0] : undefined;
      if (newSpecies) {
        hideModal();
        useUIStore.getState().showModal("species-discovery", {
          speciesId: newSpecies.id,
          showTalentAfter: updated.pendingTalentChoices?.length > 0,
        });
        return;
      }
      if (updated.pendingTalentChoices?.length > 0) {
        hideModal();
        setTimeout(() => {
          useUIStore.getState().showModal("talent-awakening");
        }, 300);
      }
    } catch {
      // canUnlockEvolutionNode gates this path.
    }
  };

  return (
    <div className="page evolution-page">
      <h2 className="page-title">生命痕迹</h2>
      <p className="page-hint">这里会记录潮池真正留下的变化。还不能点亮时，先回去继续拖入发光养料。</p>
      <div className="evolution-path">
        {evolutionNodes.map((node, idx) => {
          const unlocked = save.unlockedNodes.includes(node.id);
          const canUnlock = canUnlockEvolutionNode(save, node.id);
          const copy = nodeCopyFor(node.id, node.name, node.description);
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
                  <img className="node-icon-img" src={iconFor(node.id)} alt="" aria-hidden="true" />
                  <span className="node-state-mark">{unlocked ? "OK" : canUnlock ? "!" : ""}</span>
                </div>
                <div className="node-info">
                  <span className="node-name">{copy.title}</span>
                  <span className="node-desc">{copy.description}</span>
                  <span className="term-badge node-term">{node.name}</span>
                  {node.branchHint && <span className="node-branch-hint">{node.branchHint}</span>}
                  {!unlocked && (
                    <span className="node-cost">
                      {Object.entries(node.cost)
                        .map(([k, v]) => `${labelFor(k)} ${v}`)
                        .join(" · ")}
                    </span>
                  )}
                  {canUnlock && <span className="node-action">{actionFor(node.id)}</span>}
                  {unlocked && <span className="node-action confirmed">已留下痕迹</span>}
                  {!unlocked && !canUnlock && <span className="node-action waiting">继续积累材料</span>}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function actionFor(nodeId: string): string {
  const map: Record<string, string> = {
    organic_richness: "点亮这道痕迹",
    replicating_chain: "让它延续",
    replication_fidelity: "保留稳定复制",
    error_retention: "保留一次错误",
    fragment_budding: "允许旁支萌发",
    primitive_vesicle: "包住这段反应",
    metabolic_loop: "接上能量循环",
    proto_cell: "记录这个跃迁",
    photo_pigment: "追逐第一缕光",
  };
  return map[nodeId] ?? "记录这个变化";
}

function iconFor(nodeId: string): string {
  const map: Record<string, string> = {
    organic_richness: uiAssets.evolution.organicRichness,
    replicating_chain: uiAssets.evolution.replicatingChain,
    replication_fidelity: uiAssets.evolution.replicatingChain,
    error_retention: uiAssets.evolution.metabolicLoop,
    fragment_budding: uiAssets.evolution.primitiveVesicle,
    primitive_vesicle: uiAssets.evolution.primitiveVesicle,
    metabolic_loop: uiAssets.evolution.metabolicLoop,
    proto_cell: uiAssets.evolution.protoCell,
    photo_pigment: uiAssets.evolution.photoPigment,
  };
  return map[nodeId] ?? uiAssets.emblems.discovery;
}
function labelFor(key: string): string {
  const map: Record<string, string> = {
    organic: "有机质",
    energy: "能量",
    minerals: "矿物质",
    stability: "稳定性",
    mutation: "突变点",
    biomass: "生物量",
  };
  return map[key] ?? key;
}

function nodeCopyFor(nodeId: string, fallbackName: string, fallbackDescription: string) {
  if (nodeId === "organic_richness") {
    return {
      title: "第一道生命痕迹",
      description: "复杂分子开始稳定留下痕迹。",
    };
  }

  if (nodeId === "replicating_chain") {
    return {
      title: "让生命学会延续",
      description: "有些结构开始重复自己，生命有了延续的可能。",
    };
  }

  if (nodeId === "primitive_vesicle" || nodeId === "proto_cell") {
    return {
      title: "等待第一种生命成形",
      description: "反应被边界包裹，第一批小生命正在接近成形。",
    };
  }

  if (nodeId === "replication_fidelity") {
    return {
      title: "高保真复制",
      description: "复制更稳，潮池会少一些大胆错误。",
    };
  }

  if (nodeId === "error_retention") {
    return {
      title: "保留复制错误",
      description: "变化会更频繁，潮池也会更容易失衡。",
    };
  }

  if (nodeId === "fragment_budding") {
    return {
      title: "让旁支萌发",
      description: "断裂结构也能延续，后续谱系更容易分叉。",
    };
  }

  if (nodeId === "metabolic_loop") {
    return {
      title: "让小生命获得能量",
      description: "简单循环开始把外界能量变成更稳定的生命活动。",
    };
  }

  if (nodeId === "photo_pigment") {
    return {
      title: "让生命追逐光",
      description: "一些生命开始靠近光，新的生态爆发正在到来。",
    };
  }

  return {
    title: fallbackName,
    description: fallbackDescription,
  };
}
