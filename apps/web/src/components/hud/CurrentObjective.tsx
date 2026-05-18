import { canUnlockEvolutionNode, evolutionNodes } from "@eco-era/game-core";
import type { ResourceKey } from "@eco-era/shared";
import { useState } from "react";
import { uiAssets } from "../../assets/uiAssets.js";
import { useGameStore } from "../../stores/gameStore.js";

const DETAILS_STORAGE_KEY = "eco-era-objective-details-open";

const RES_LABELS: Record<string, { asset: string; label: string }> = {
  organic: { asset: uiAssets.resources.organic, label: "有机质" },
  energy: { asset: uiAssets.resources.energy, label: "能量" },
  minerals: { asset: uiAssets.resources.minerals, label: "矿物质" },
  stability: { asset: uiAssets.resources.stability, label: "稳定性" },
  mutation: { asset: uiAssets.resources.mutation, label: "突变点" },
  biomass: { asset: uiAssets.resources.biomass, label: "生物量" },
};

const STORY_STAGES = ["加入养料", "留下痕迹", "学会延续", "发现生命"] as const;

export function CurrentObjective() {
  const save = useGameStore((s) => s.save);
  const [detailsOpen, setDetailsOpen] = useState(() => localStorage.getItem(DETAILS_STORAGE_KEY) === "1");

  if (!save) return null;

  const unlocked = save.unlockedNodes;
  const nextNode = evolutionNodes.find(
    (n) => !unlocked.includes(n.id) && n.requires.every((r) => unlocked.includes(r)),
  );

  let title = "让潮池活过来";
  let action = "把发光的养料拖进水里";
  let observation = "水里开始出现生命材料。";
  let term = "生命材料";
  let progressLabel = "生命材料";
  let progress = 0;
  let target = 20;
  let costEntries: Array<[string, number]> = [];

  if (nextNode && canUnlockEvolutionNode(save, nextNode.id)) {
    const copy = objectiveCopyForNode(nextNode.id, nextNode.name, nextNode.description);
    title = copy.title;
    action = nextNode.id === "organic_richness" ? "点底部演化，确认生命痕迹" : "点底部演化，确认这一步";
    observation = copy.observation;
    term = copy.term;
    progressLabel = copy.progressLabel;
    costEntries = Object.entries(nextNode.cost) as Array<[string, number]>;
    const totalRequired = costEntries.reduce((sum, [, v]) => sum + v, 0);
    const totalHave = costEntries.reduce((sum, [k, v]) => sum + Math.min(save.resources[k as ResourceKey] ?? 0, v), 0);
    progress = totalHave;
    target = totalRequired;
  } else if (unlocked.length === 0) {
    progress = Math.min(save.resources.organic, target);
    costEntries = [["organic", 20]];
  } else if (nextNode) {
    const copy = objectiveCopyForNode(nextNode.id, nextNode.name, nextNode.description);
    title = copy.title;
    action = copy.action;
    observation = copy.observation;
    term = copy.term;
    progressLabel = copy.progressLabel;
    costEntries = Object.entries(nextNode.cost) as Array<[string, number]>;
    const totalRequired = costEntries.reduce((sum, [, v]) => sum + v, 0);
    const totalHave = costEntries.reduce((sum, [k, v]) => sum + Math.min(save.resources[k as ResourceKey] ?? 0, v), 0);
    progress = totalHave;
    target = totalRequired;
  } else {
    title = "让生命追逐光";
    action = "继续投入能量";
    observation = "一些生命开始靠近光，新的生态爆发正在到来。";
    term = "感光色素";
    progressLabel = "光照准备";
    progress = save.resources.energy;
    target = 500;
  }

  const percent = Math.min(100, Math.round((progress / Math.max(1, target)) * 100));
  const currentStageIndex = getCurrentStageIndex(unlocked, save.species.length);

  const toggleDetails = () => {
    setDetailsOpen((open) => {
      const next = !open;
      localStorage.setItem(DETAILS_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  return (
    <div className={`objective-bar ${detailsOpen ? "expanded" : "compact"}`}>
      <div className="objective-mainline">
        <span className="objective-kicker">主线：养出第一只生命</span>
        <button className="objective-toggle" type="button" onClick={toggleDetails} aria-expanded={detailsOpen}>
          {detailsOpen ? "收起" : "详情"}
        </button>
      </div>

      <div className="objective-header">
        <span className="objective-title">{title}</span>
        <span className="objective-percent">{percent}%</span>
      </div>

      <div className="objective-action">{action}</div>
      <div className="objective-track">
        <div className="objective-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="objective-progress-label">
        {progressLabel} {Math.floor(progress)}/{target}
      </div>

      {detailsOpen && (
        <div className="objective-details">
          <div className="storyline-steps" aria-label="主线阶段">
            {STORY_STAGES.map((stage, index) => (
              <span
                key={stage}
                className={`storyline-step ${index === currentStageIndex ? "current" : ""} ${
                  index < currentStageIndex ? "done" : ""
                }`}
              >
                {stage}
              </span>
            ))}
          </div>
          <div className="objective-observation">{observation}</div>
          <span className="term-badge">{term}</span>
          {costEntries.length > 0 && (
            <div className="resource-capsules">
              {costEntries.map(([key, needed]) => {
                const res = RES_LABELS[key] ?? { asset: uiAssets.emblems.system, label: key };
                const current = Math.floor(save.resources[key as ResourceKey] ?? 0);
                const met = current >= needed;
                const fillPercent = Math.min(100, Math.round((current / Math.max(1, needed)) * 100));
                return (
                  <div key={key} className={`capsule ${met ? "met" : ""}`} data-tooltip={res.label}>
                    <div className="capsule-fill" style={{ width: `${fillPercent}%` }} />
                    <span className="capsule-content">
                      <img className="capsule-icon" src={res.asset} alt="" aria-hidden="true" />
                      <span className="capsule-nums">{current}/{needed}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getCurrentStageIndex(unlocked: string[], speciesCount: number) {
  if (speciesCount > 0) return 3;
  if (unlocked.includes("replicating_chain")) return 3;
  if (unlocked.includes("organic_richness")) return 2;
  if (unlocked.length > 0) return 1;
  return 0;
}

function objectiveCopyForNode(nodeId: string, fallbackName: string, fallbackDescription: string) {
  if (nodeId === "organic_richness") {
    return {
      title: "发现第一道生命痕迹",
      action: "确认第一道生命痕迹",
      observation: "复杂分子开始稳定留下痕迹。",
      term: "有机富集",
      progressLabel: "生命痕迹",
    };
  }

  if (nodeId === "replicating_chain") {
    return {
      title: "让生命学会延续",
      action: "让结构开始复制自己",
      observation: "有些结构开始重复自己，生命有了延续的可能。",
      term: "自复制链",
      progressLabel: "延续能力",
    };
  }

  if (nodeId === "primitive_vesicle" || nodeId === "proto_cell") {
    return {
      title: "等待第一种生命成形",
      action: "等待第一种生命成形",
      observation: "反应被边界包裹，第一批小生命正在接近成形。",
      term: nodeId === "primitive_vesicle" ? "原始膜泡" : "原初细胞",
      progressLabel: "成形条件",
    };
  }

  return {
    title: fallbackName,
    action: "继续推动潮池变化",
    observation: fallbackDescription,
    term: fallbackName,
    progressLabel: "阶段进度",
  };
}
