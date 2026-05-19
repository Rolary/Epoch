import { canUnlockEvolutionNode, evolutionNodes } from "@eco-era/game-core";
import type { ResourceKey } from "@eco-era/shared";
import { useEffect, useState } from "react";
import { uiAssets } from "../../assets/uiAssets.js";
import { useGameStore } from "../../stores/gameStore.js";

const DETAILS_STORAGE_KEY = "eco-era-objective-details-open";
const MINIMIZED_STORAGE_KEY = "eco-era-objective-minimized";
const AUTO_MINIMIZE_DELAY = 4200;

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
  const [minimized, setMinimized] = useState(() => localStorage.getItem(MINIMIZED_STORAGE_KEY) === "1");

  useEffect(() => {
    if (minimized) return;
    if (localStorage.getItem(MINIMIZED_STORAGE_KEY) === "1") return;
    const timer = window.setTimeout(() => {
      localStorage.setItem(MINIMIZED_STORAGE_KEY, "1");
      setMinimized(true);
    }, AUTO_MINIMIZE_DELAY);
    return () => window.clearTimeout(timer);
  }, [minimized]);

  const minimizeObjective = () => {
    localStorage.setItem(MINIMIZED_STORAGE_KEY, "1");
    setMinimized(true);
  };

  if (!save) return null;

  const unlocked = save.unlockedNodes;
  const nextNode = evolutionNodes.find(
    (node) => !unlocked.includes(node.id) && node.requires.every((required) => unlocked.includes(required)),
  );

  const objective = getObjective(save, nextNode);
  const percent = Math.min(100, Math.round((objective.progress / Math.max(1, objective.target)) * 100));
  const currentStageIndex = getCurrentStageIndex(unlocked, save.species.length);

  const toggleDetails = () => {
    setDetailsOpen((open) => {
      const next = !open;
      localStorage.setItem(DETAILS_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  return (
    <div
      className={`objective-bar ${detailsOpen ? "expanded" : "compact"} ${minimized ? "minimized" : "open"}`}
      role="button"
      tabIndex={0}
      onClick={() => {
        if (minimized) setMinimized(false);
      }}
      onKeyDown={(event) => {
        if (minimized && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          setMinimized(false);
        }
      }}
      aria-expanded={!minimized}
    >
      {minimized ? (
        <div className="objective-mini-content">
          <span className="objective-mini-dot" aria-hidden="true" />
          <span className="objective-mini-text">{objective.title}</span>
          <span className="objective-mini-percent">{percent}%</span>
          <span className="objective-mini-cue">展开</span>
        </div>
      ) : (
        <>
          <div className="objective-mainline">
            <span className="objective-kicker">主线：养出第一只生命</span>
            <span className="objective-mainline-actions">
              <button
                className="objective-toggle"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  minimizeObjective();
                }}
              >
                收起
              </button>
              <button
                className="objective-toggle"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleDetails();
                }}
                aria-expanded={detailsOpen}
              >
                {detailsOpen ? "少看" : "更多"}
              </button>
            </span>
          </div>

          <div className="objective-header">
            <span className="objective-title">{objective.title}</span>
            <span className="objective-percent">{percent}%</span>
          </div>

          <div className="objective-action">{objective.action}</div>
          <div className="objective-track">
            <div className="objective-fill" style={{ width: `${percent}%` }} />
          </div>
          <div className="objective-progress-label">
            {objective.progressLabel} {Math.floor(objective.progress)}/{objective.target}
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
              <div className="objective-observation">{objective.observation}</div>
              <span className="term-badge">{objective.term}</span>
              {objective.costEntries.length > 0 && (
                <div className="resource-capsules">
                  {objective.costEntries.map(([key, needed]) => {
                    const res = RES_LABELS[key] ?? { asset: uiAssets.emblems.system, label: key };
                    const current = Math.floor(save.resources[key as ResourceKey] ?? 0);
                    const met = current >= needed;
                    const fillPercent = Math.min(100, Math.round((current / Math.max(1, needed)) * 100));
                    return (
                      <div key={key} className={`capsule ${met ? "met" : ""}`} data-tooltip={res.label}>
                        <div className="capsule-fill" style={{ width: `${fillPercent}%` }} />
                        <span className="capsule-content">
                          <img className="capsule-icon" src={res.asset} alt="" aria-hidden="true" />
                          <span className="capsule-nums">
                            {current}/{needed}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function getObjective(save: NonNullable<ReturnType<typeof useGameStore.getState>["save"]>, nextNode: typeof evolutionNodes[number] | undefined) {
  const unlocked = save.unlockedNodes;
  let title = "让潮池活过来";
  let action = "把发光的养料拖进水里";
  let observation = "水里开始出现生命材料。";
  let term = "生命材料";
  let progressLabel = "生命材料";
  let progress = 0;
  let target = 20;
  let costEntries: Array<[string, number]> = [];

  if (nextNode) {
    costEntries = Object.entries(nextNode.cost) as Array<[string, number]>;
    const totalRequired = costEntries.reduce((sum, [, value]) => sum + value, 0);
    const totalHave = costEntries.reduce(
      (sum, [key, value]) => sum + Math.min(save.resources[key as ResourceKey] ?? 0, value),
      0,
    );
    progress = totalHave;
    target = totalRequired;

    if (canUnlockEvolutionNode(save, nextNode.id)) {
      const copy = objectiveCopyForNode(nextNode.id, nextNode.name, nextNode.description);
      return {
        ...copy,
        action: nextNode.id === "organic_richness" ? "点底部演化，记录生命痕迹" : "点底部演化，推进这次变化",
        progress,
        target,
        costEntries,
      };
    }

    if (unlocked.length > 0) {
      const copy = objectiveCopyForNode(nextNode.id, nextNode.name, nextNode.description);
      return { ...copy, progress, target, costEntries };
    }
  } else {
    title = "让生命追逐光";
    action = "继续投入能量";
    observation = "一些生命开始靠近光，新的生态爆发正在到来。";
    term = "感光色素";
    progressLabel = "光照准备";
    progress = save.resources.energy;
    target = 500;
  }

  return { title, action, observation, term, progressLabel, progress, target, costEntries };
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
      action: "记录第一道生命痕迹",
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
