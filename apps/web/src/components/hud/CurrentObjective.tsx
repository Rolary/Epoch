import { canUnlockEvolutionNode, evolutionNodes, previewEvolutionNodeProduction } from "@eco-era/game-core";
import { formatChineseNumber } from "@eco-era/shared";
import type { ResourceKey } from "@eco-era/shared";
import { useEffect, useState } from "react";
import { uiAssets } from "../../assets/uiAssets.js";
import { useGameStore } from "../../stores/gameStore.js";
import { getGuestKey, getSaveId } from "../../api.js";

const DETAILS_STORAGE_NAME = "objective-details-open";
const AUTO_MINIMIZE_DELAY = 5400;
const objectiveAutoShownScopes = new Set<string>();

const RES_LABELS: Record<string, { asset: string; label: string }> = {
  organic: { asset: uiAssets.resources.organic, label: "有机质" },
  energy: { asset: uiAssets.resources.energy, label: "能量" },
  minerals: { asset: uiAssets.resources.minerals, label: "矿物质" },
  stability: { asset: uiAssets.resources.stability, label: "稳定性" },
  mutation: { asset: uiAssets.resources.mutation, label: "突变点" },
  biomass: { asset: uiAssets.resources.biomass, label: "生物量" },
};

const LIFE_BIRTH_STAGES = ["加入养料", "留下痕迹", "学会延续", "发现生命"] as const;
const ECOLOGY_BURST_STAGES = ["追逐光照", "分化角色", "形成循环", "面对失衡", "留下性格"] as const;
const SHORELINE_STAGES = ["发现水线", "贴住湿岸", "分出栖位", "承受干湿", "接回循环", "留下岸痕"] as const;
const LIFE_HISTORY_CHAPTERS = [
  "生命诞生",
  "水中回响",
  "海陆分化",
  "复杂生命",
  "意识萌芽",
  "文明初火",
  "星球危机",
  "群星生态",
] as const;

export function CurrentObjective() {
  const save = useGameStore((s) => s.save);
  const objectiveScope = getObjectiveScope();
  const [detailsOpen, setDetailsOpen] = useState(() => localStorage.getItem(scopedObjectiveKey(DETAILS_STORAGE_NAME)) === "1");
  const [minimized, setMinimized] = useState(() => objectiveAutoShownScopes.has(getObjectiveScope()));
  const [manuallyOpened, setManuallyOpened] = useState(false);

  useEffect(() => {
    setDetailsOpen(localStorage.getItem(scopedObjectiveKey(DETAILS_STORAGE_NAME)) === "1");
    setMinimized(objectiveAutoShownScopes.has(objectiveScope));
    setManuallyOpened(false);
  }, [objectiveScope]);

  useEffect(() => {
    if (minimized) return;
    if (manuallyOpened) return;
    if (objectiveAutoShownScopes.has(objectiveScope)) return;
    const timer = window.setTimeout(() => {
      objectiveAutoShownScopes.add(objectiveScope);
      setMinimized(true);
    }, AUTO_MINIMIZE_DELAY);
    return () => window.clearTimeout(timer);
  }, [minimized, manuallyOpened, objectiveScope]);

  const minimizeObjective = () => {
    objectiveAutoShownScopes.add(objectiveScope);
    setManuallyOpened(false);
    setMinimized(true);
  };

  if (!save) return null;

  const unlocked = save.unlockedNodes;
  const nextNode = evolutionNodes.find((node) => isReachableNextNode(node, unlocked));

  const objective = getObjective(save, nextNode);
  const preview = nextNode ? previewEvolutionNodeProduction(save, nextNode.id) : null;
  const percent = Math.min(100, Math.round((objective.progress / Math.max(1, objective.target)) * 100));
  const chapterIndex = save.chapterProgress?.chapter === "shoreline_differentiation"
    ? 2
    : save.chapterProgress?.chapter === "ecology_burst"
      ? 1
      : 0;
  const stageLabels = chapterIndex === 2 ? SHORELINE_STAGES : chapterIndex === 1 ? ECOLOGY_BURST_STAGES : LIFE_BIRTH_STAGES;
  const currentStageIndex = chapterIndex === 2
    ? getShorelineStageIndex(save.chapterProgress?.stage)
    : chapterIndex === 1
      ? getEcologyStageIndex(save.chapterProgress?.stage)
      : getCurrentStageIndex(unlocked, save.species.length);
  const mainline = chapterIndex === 2
    ? "主线：让生命越过水线"
    : chapterIndex === 1
      ? "主线：让潮池形成第一组生态循环"
      : "主线：养出第一只生命";

  const toggleDetails = () => {
    setDetailsOpen((open) => {
      const next = !open;
      localStorage.setItem(scopedObjectiveKey(DETAILS_STORAGE_NAME), next ? "1" : "0");
      return next;
    });
  };

  return (
    <div
      className={`objective-bar ${detailsOpen ? "expanded" : "compact"} ${minimized ? "minimized" : "open"}`}
      role="button"
      tabIndex={0}
      onClick={() => {
        if (minimized) {
          setManuallyOpened(true);
          setMinimized(false);
        }
      }}
      onKeyDown={(event) => {
        if (minimized && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          setManuallyOpened(true);
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
            <span className="objective-kicker">{mainline}</span>
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
            {objective.progressLabel} {formatChineseNumber(objective.progress)}/{formatChineseNumber(objective.target)}
          </div>
          {preview && preview.ratio > 1.03 && (
            <div className="objective-next-jump">
              <span>下一次跃迁</span>
              <strong>产能约 x{preview.ratio.toFixed(preview.ratio >= 10 ? 0 : preview.ratio < 1.1 ? 2 : 1)}</strong>
            </div>
          )}

          {detailsOpen && (
            <div className="objective-details">
              <div className="storyline-steps" aria-label="潮池水势">
                {stageLabels.map((stage, index) => (
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
              <div className="life-history-arc" aria-label="远景时间轴">
                <span className="life-history-title">远景时间轴</span>
                <div className="life-history-chapters">
                  {LIFE_HISTORY_CHAPTERS.map((chapter, index) => (
                    <span key={chapter} className={`life-history-chapter ${index === chapterIndex ? "current" : index < chapterIndex ? "done" : "future"}`}>
                      {chapter}
                    </span>
                  ))}
                </div>
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
                            {formatChineseNumber(current)}/{formatChineseNumber(needed)}
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
  if (save.chapterProgress?.chapter === "shoreline_differentiation") {
    return getShorelineObjective(save, nextNode);
  }
  if (save.chapterProgress?.chapter === "ecology_burst") {
    return getEcologyObjective(save, nextNode);
  }

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
    observation = "一些生命开始靠近光，水面正在露出新的层次。";
    term = "感光色素";
    progressLabel = "光照准备";
    progress = save.resources.energy;
    target = 500;
  }

  return { title, action, observation, term, progressLabel, progress, target, costEntries };
}

function getShorelineObjective(save: NonNullable<ReturnType<typeof useGameStore.getState>["save"]>, nextNode: typeof evolutionNodes[number] | undefined) {
  const stage = save.chapterProgress?.stage ?? "discover_waterline";
  const witness = save.chapterWitness?.shorelineDifferentiation;
  const stageCopy: Record<string, { title: string; action: string; observation: string; term: string; progressLabel: string; target: number; progress: number }> = {
    discover_waterline: {
      title: "让水线显现",
      action: "前往演化，让第一阵往复触到潮池边缘",
      observation: "潮池已有稳定循环，退潮正在露出新的边缘。",
      term: "水线",
      progressLabel: "水线见证",
      target: 1,
      progress: witness?.waterlineExposed ? 1 : 0,
    },
    attach_shore: {
      title: "引导生命靠近湿岸",
      action: save.unlockedNodes.includes("shore_attachment") ? "把水中的微光拖到刚露出的湿岩" : "前往演化，让生命能够贴住湿痕",
      observation: "已有生命在水线附近徘徊，但它们会自己决定是否留下。",
      term: "湿岸附着",
      progressLabel: "贴岸见证",
      target: 1,
      progress: witness?.shoreColonized ? 1 : 0,
    },
    split_niches: {
      title: "看见两处不同的生命姿态",
      action: "观察浅水和湿岩怎样留下不同痕迹",
      observation: "同一阵生命开始在水下与岸边用不同方式延续。",
      term: "相连栖位",
      progressLabel: "已见证栖位",
      target: 2,
      progress: witness?.habitatsWitnessed.length ?? 0,
    },
    endure_dry_wet: {
      title: "面对第一次退潮晒痕",
      action: save.pendingEcologyEvent?.id === "ebb_dryness" ? "决定哪些岸痕会被留下" : "等待退潮把干湿压力推到岸边",
      observation: "贴住湿岩只是开始，阳光、盐分和失水正在逼近。",
      term: "干湿压力",
      progressLabel: "岸线取舍",
      target: 1,
      progress: witness?.dryWetPressureWitnessed ? 1 : 0,
    },
    reconnect_cycle: {
      title: "让回潮带回岸边变化",
      action: "前往演化，形成岸边与浅水的第一次往返",
      observation: "越过水线不等于离开生态，岸边仍需要原有循环。",
      term: "岸线往返",
      progressLabel: "回流见证",
      target: 1,
      progress: witness?.shorelineExchangeWitnessed ? 1 : 0,
    },
    shoreline_memory: {
      title: "岸边与浅水已经形成往返",
      action: "打开潮池记忆，回看水线露出、贴岸与回流",
      observation: "浅水和湿岩开始互相带回材料，潮池第一次拥有了边缘。",
      term: "岸线记忆",
      progressLabel: "岸线片段",
      target: 3,
      progress: 3,
    },
    complete: {
      title: "生命已经越过水线",
      action: "打开潮池记忆，回看这条岸线怎样形成",
      observation: "这片潮池不再只有中心，它开始记得自己的边界。",
      term: "海陆痕迹",
      progressLabel: "岸线记忆",
      target: 1,
      progress: 1,
    },
  };
  const base = stageCopy[stage] ?? stageCopy.discover_waterline;
  const costEntries = nextNode ? Object.entries(nextNode.cost) as Array<[string, number]> : [];
  return {
    ...base,
    observation: save.chapterProgress?.currentMoodLabel ?? base.observation,
    action: nextNode && canUnlockEvolutionNode(save, nextNode.id)
      ? shorelineActionForNode(nextNode.id)
      : (save.chapterProgress?.nextHintLabel ?? base.action),
    costEntries,
  };
}

function getEcologyObjective(save: NonNullable<ReturnType<typeof useGameStore.getState>["save"]>, nextNode: typeof evolutionNodes[number] | undefined) {
  const stage = save.chapterProgress?.stage ?? "pursue_light";
  const stageCopy: Record<string, { title: string; action: string; observation: string; term: string; progressLabel: string; target: number; progress: number }> = {
    pursue_light: {
      title: "让生命追逐光",
      action: "继续积累能量和生物量，点亮受光薄膜",
      observation: "已有生命开始靠近光照，水面正露出新的层次。",
      term: "追逐光照",
      progressLabel: "光照准备",
      target: 3,
      progress: 1,
    },
    differentiate_roles: {
      title: "让不同水痕显出来",
      action: "在浅层、池底和潮孔里记录新的生命工作",
      observation: "潮池不再只有一种生命，分工正在变得可见。",
      term: "生态角色",
      progressLabel: "已识别角色",
      target: 3,
      progress: countEarlyRoles(save),
    },
    form_cycle: {
      title: "形成第一个小循环",
      action: "让生产、分解和过滤开始交换材料",
      observation: "三种生态角色已经出现，下一步是让它们产生稳定互动。",
      term: "互养循环",
      progressLabel: "循环条件",
      target: 3,
      progress: countEarlyRoles(save),
    },
    face_imbalance: {
      title: "面对繁盛后的失衡",
      action: save.pendingEcologyEvent
        ? "打开事件，决定怎样处理过度繁盛"
        : "继续照看潮池，让繁盛压力浮上水面",
      observation: "水面长得太满时，清水、空隙和呼吸都会被挤压。",
      term: "水势平衡",
      progressLabel: "失衡处理",
      target: 1,
      progress: (save.eventHistory ?? []).includes("bloom_pressure") ? 1 : 0,
    },
    ecological_personality: {
      title: "留下潮池的样子",
      action: "前往演化，留下潮池性格",
      observation: "反复出现的环境变化正在形成长期生态倾向。",
      term: "潮池性格",
      progressLabel: "记忆沉淀",
      target: 1,
      progress: save.unlockedNodes.includes("ecological_personality") ? 1 : 0,
    },
    complete: {
      title: "第一组生态循环已经形成",
      action: "打开潮池记忆，回看这段生态循环",
      observation: "生产、分解和过滤已经形成稳定互动。",
      term: "潮池记忆",
      progressLabel: "潮池记忆",
      target: 1,
      progress: 1,
    },
  };
  const base = stageCopy[stage] ?? stageCopy.differentiate_roles;
  const costEntries = nextNode ? Object.entries(nextNode.cost) as Array<[string, number]> : [];
  if (!nextNode) {
    return {
      ...base,
      observation: save.chapterProgress?.currentMoodLabel ?? base.observation,
      action: save.chapterProgress?.nextHintLabel ?? base.action,
      costEntries,
    };
  }

  return {
    ...base,
    observation: save.chapterProgress?.currentMoodLabel ?? base.observation,
    action: canUnlockEvolutionNode(save, nextNode.id)
      ? actionForEcologyNode(nextNode.id)
      : (save.chapterProgress?.nextHintLabel ?? base.action),
    progress: base.progress,
    target: base.target,
    costEntries,
  };
}

function getCurrentStageIndex(unlocked: string[], speciesCount: number) {
  if (speciesCount > 0) return 3;
  if (unlocked.includes("replicating_chain")) return 3;
  if (unlocked.includes("organic_richness")) return 2;
  if (unlocked.length > 0) return 1;
  return 0;
}

function getEcologyStageIndex(stage: string | undefined) {
  const map: Record<string, number> = {
    pursue_light: 0,
    differentiate_roles: 1,
    form_cycle: 2,
    face_imbalance: 3,
    ecological_personality: 4,
    complete: 4,
  };
  return map[stage ?? "pursue_light"] ?? 0;
}

function getShorelineStageIndex(stage: string | undefined) {
  const map: Record<string, number> = {
    discover_waterline: 0,
    attach_shore: 1,
    split_niches: 2,
    endure_dry_wet: 3,
    reconnect_cycle: 4,
    shoreline_memory: 5,
    complete: 5,
  };
  return map[stage ?? "discover_waterline"] ?? 0;
}

function shorelineActionForNode(nodeId: string) {
  const map: Record<string, string> = {
    waterline_exposure: "让水线显现",
    shore_attachment: "留下贴岸的机会",
    shoreline_exchange: "接回第一阵岸线往返",
  };
  return map[nodeId] ?? "记录这次岸线变化";
}

function countEarlyRoles(save: NonNullable<ReturnType<typeof useGameStore.getState>["save"]>) {
  const roles = new Set(save.species
    .filter((item) => item.status === "living" || item.status === "flourishing")
    .map((item) => item.ecologicalRole));
  return ["producer", "decomposer", "filterer"].filter((role) => roles.has(role as never)).length;
}

function actionForEcologyNode(nodeId: string) {
  const map: Record<string, string> = {
    early_producer_film: "记录受光生产者",
    decomposition_layer: "记录分解层",
    tidal_filter_pores: "记录滤食孔隙",
    mutual_ecology_cycle: "形成这个小循环",
    ecological_personality: "留下潮池的样子",
  };
  return map[nodeId] ?? "记录这个生态变化";
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

  if (nodeId === "photo_pigment") {
    return {
      title: "让生命追逐光",
      action: "追逐第一缕光",
      observation: "一些生命开始靠近光，水面正在露出新的层次。",
      term: "感光色素",
      progressLabel: "光照准备",
    };
  }

  if (nodeId === "early_producer_film") {
    return {
      title: "出现早期生产者",
      action: "记录受光生产者",
      observation: "受光薄膜开始把光照变成潮池可以继续使用的能量。",
      term: "生产者",
      progressLabel: "分化条件",
    };
  }

  if (nodeId === "decomposition_layer") {
    return {
      title: "出现分解者",
      action: "记录分解层",
      observation: "旧薄膜和碎片沉入池底，被拆回新的材料。",
      term: "分解者",
      progressLabel: "分化条件",
    };
  }

  if (nodeId === "tidal_filter_pores") {
    return {
      title: "出现滤食者",
      action: "记录滤食孔隙",
      observation: "潮汐孔隙筛入颗粒，第三类生态角色稳定下来。",
      term: "滤食者",
      progressLabel: "分化条件",
    };
  }

  if (nodeId === "mutual_ecology_cycle") {
    return {
      title: "形成第一个小循环",
      action: "形成这个小循环",
      observation: "生产、分解和过滤开始交换材料，循环正在形成。",
      term: "互养小循环",
      progressLabel: "循环条件",
    };
  }

  if (nodeId === "ecological_personality") {
    return {
      title: "留下潮池的样子",
      action: "记录当前生态倾向",
      observation: "反复出现的环境变化正在形成长期生态倾向。",
      term: "潮池性格",
      progressLabel: "记忆沉淀",
    };
  }

  return {
    title: fallbackName,
    action: "继续推动潮池变化",
    observation: fallbackDescription,
    term: fallbackName,
    progressLabel: "当前进度",
  };
}

function isReachableNextNode(node: typeof evolutionNodes[number], unlocked: string[]) {
  if (unlocked.includes(node.id)) return false;
  if (!node.requires.every((required) => unlocked.includes(required))) return false;
  if (!node.branchGroupId) return true;
  return !evolutionNodes.some(
    (item) => item.branchGroupId === node.branchGroupId && unlocked.includes(item.id),
  );
}

function scopedObjectiveKey(name: string): string {
  return `eco-era:${getObjectiveScope()}:${name}`;
}

function getObjectiveScope(): string {
  const scope = getSaveId() || getGuestKey() || "anonymous";
  return scope;
}
