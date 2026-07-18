import { canUnlockEvolutionNode, evolutionNodes, previewEvolutionNodeProduction } from "@eco-era/game-core";
import { formatChineseNumber } from "@eco-era/shared";
import type { EvolutionNode, Resources } from "@eco-era/shared";
import { useMemo, useState } from "react";
import { tickSave, unlockNode } from "../../api.js";
import { uiAssets } from "../../assets/uiAssets.js";
import { useGameStore } from "../../stores/gameStore.js";
import { useUIStore } from "../../stores/uiStore.js";

type ChapterId = "life_birth" | "ecology_burst";

const CHAPTERS: Array<{
  id: ChapterId;
  title: string;
  objective: string;
  nodeIds: string[];
}> = [
  {
    id: "life_birth",
    title: "生命诞生篇",
    objective: "目标：养出第一种追光生命",
    nodeIds: [
      "organic_richness",
      "replicating_chain",
      "replication_fidelity",
      "error_retention",
      "fragment_budding",
      "primitive_vesicle",
      "metabolic_loop",
      "proto_cell",
      "photo_pigment",
    ],
  },
  {
    id: "ecology_burst",
    title: "生态爆发篇",
    objective: "目标：形成第一个小生态循环",
    nodeIds: [
      "early_producer_film",
      "decomposition_layer",
      "tidal_filter_pores",
      "mutual_ecology_cycle",
      "ecological_personality",
    ],
  },
];

export function EvolutionPage() {
  const save = useGameStore((s) => s.save);
  const setSave = useGameStore((s) => s.setSave);
  const setPage = useUIStore((s) => s.setPage);
  const hideModal = useUIStore((s) => s.hideModal);
  const showModal = useUIStore((s) => s.showModal);
  const enqueueNarrative = useUIStore((s) => s.enqueueNarrative);
  const chapterBlocks = useMemo(() => buildChapterBlocks(evolutionNodes), []);
  const [expandedBranchIds, setExpandedBranchIds] = useState<string[]>([]);
  const [collapsedChapters, setCollapsedChapters] = useState<Partial<Record<ChapterId, boolean>>>({});
  const [recentlyUnlockedNodeId, setRecentlyUnlockedNodeId] = useState<string | null>(null);

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

  const currentSave = save;
  const currentChapter: ChapterId = currentSave.chapterProgress?.chapter === "ecology_burst" ? "ecology_burst" : "life_birth";
  const visibleChapters = chapterBlocks.filter((chapter) =>
    chapter.id === "life_birth" || currentSave.unlockedNodes.includes("photo_pigment") || currentChapter === "ecology_burst",
  );

  const handleUnlock = async (nodeId: string) => {
    try {
      const previousSpeciesIds = new Set(save.species.map((item) => item.id));
      const synced = await tickSave(save.id);
      setSave(synced);
      const updated = await unlockNode(save.id, nodeId);
      setSave(updated);
      setRecentlyUnlockedNodeId(nodeId);
      window.setTimeout(() => setRecentlyUnlockedNodeId((current) => current === nodeId ? null : current), 900);
      const newSpecies = updated.species.find((item) => !previousSpeciesIds.has(item.id));
      hideModal();
      if (newSpecies) {
        enqueueNarrative({
          id: `species-discovery:${newSpecies.id}`,
          type: "species-discovery",
          data: { speciesId: newSpecies.id },
          priority: 75,
        });
      }
      if (updated.pendingTalentChoices?.length > 0) {
        enqueueNarrative({
          id: `talent-awakening:${updated.id}:${updated.pendingTalentChoices.map((item) => item.id).join(",")}`,
          type: "talent-awakening",
          priority: 68,
        });
      }
    } catch {
      // canUnlockEvolutionNode gates this path.
    }
  };

  const confirmBranchUnlock = (node: EvolutionNode) => {
    showModal("decision-confirm", {
      title: "要留下这道痕迹吗？",
      description: node.description,
      gain: `${node.name} 会在后来的生命里反复浮现。`,
      cost: "同一处水势里的其他可能，会先沉到旁路里。",
      confirmLabel: "让它留下",
      cancelLabel: "先放一放",
      onConfirm: () => handleUnlock(node.id),
    });
  };

  return (
    <div className="page evolution-page">
      <h2 className="page-title">生命痕迹</h2>
      <p className="page-hint">潮池已经浮出来的痕迹会停在这里，等你决定哪些要被留下。</p>
      <div className="evolution-path chaptered">
        {visibleChapters.map((chapter) => {
          const { total, unlocked } = countChapterProgress(chapter, currentSave.unlockedNodes);
          const completed = chapter.id === "life_birth"
            ? currentSave.unlockedNodes.includes("photo_pigment")
            : currentSave.unlockedNodes.includes("ecological_personality") || currentSave.chapterProgress?.stage === "complete";
          const collapsed = collapsedChapters[chapter.id] ?? (completed && chapter.id !== currentChapter);
          const available = chapter.nodes.some((node) => canUnlockEvolutionNode(currentSave, node.id));

          return (
            <section key={chapter.id} className={`evolution-chapter ${chapter.id} ${collapsed ? "collapsed" : "expanded"} ${completed ? "completed" : ""} ${chapter.id === currentChapter ? "current" : ""}`}>
              <button
                className="evolution-chapter-head"
                type="button"
                aria-expanded={!collapsed}
                onClick={() => setCollapsedChapters((state) => ({ ...state, [chapter.id]: !collapsed }))}
              >
                <span className="evolution-chapter-copy">
                  <span className="evolution-chapter-kicker">{chapter.id === currentChapter ? "当前章节" : completed ? "已完成" : "已开放"}</span>
                  <span className="evolution-chapter-title">{chapter.title}</span>
                  <span className="evolution-chapter-goal">{chapter.objective}</span>
                </span>
                <span className="evolution-chapter-meta">
                  <span className={`chapter-progress-dot ${available ? "available" : completed ? "completed" : ""}`} />
                  <span>{unlocked}/{total}</span>
                  <span className="chapter-fold-label">{collapsed ? "展开" : "收起"}</span>
                </span>
              </button>
              {collapsed ? (
                <div className="evolution-chapter-summary">
                  {completed ? "这一章的关键痕迹已被生命史记住。" : "继续积累资源后会出现新的可点亮痕迹。"}
                </div>
              ) : (
                <div className="evolution-chapter-body">
                  {chapter.blocks.map((block, idx) => renderBlock(block, idx))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );

  function renderBlock(block: PathBlock, idx: number) {
    if (block.type === "branch") {
      const selectedBranch = block.nodes.find((node) => currentSave.unlockedNodes.includes(node.id));
      const groupUnlocked = Boolean(selectedBranch);
      const groupAvailable = block.nodes.some((node) => canUnlockEvolutionNode(currentSave, node.id));
      const branchExpanded = selectedBranch ? expandedBranchIds.includes(block.id) : true;
      return (
        <div key={block.id} className={`evolution-branch-block ${groupUnlocked ? "unlocked" : groupAvailable ? "available" : "locked"} ${branchExpanded ? "expanded" : "collapsed"}`}>
          {idx > 0 && <div className={`node-connector branch-entry ${groupUnlocked || groupAvailable ? "active" : ""}`} />}
          <div className="branch-fork-cap">
            <div className="branch-fork-copy">
              <span className="branch-fork-label">只能留下一道</span>
              <span className="branch-fork-title">
                {selectedBranch ? `已留下：${selectedBranch.name}` : "复制开始分岔"}
              </span>
              <span className="branch-fork-desc">
                {selectedBranch ? "其他可能暂时沉到旁路里，潮池继续沿着这道痕迹往前。" : "这里会先留下一种水势，后来的生命会顺着它多长一段。"}
              </span>
            </div>
            {selectedBranch && (
              <button
                className="branch-toggle"
                aria-expanded={branchExpanded}
                onClick={() => {
                  setExpandedBranchIds((ids) =>
                    ids.includes(block.id) ? ids.filter((id) => id !== block.id) : [...ids, block.id],
                  );
                }}
              >
                {branchExpanded ? "收起" : "展开"}
              </button>
            )}
          </div>
          {!selectedBranch && <div className="branch-fork-lines" aria-hidden="true" />}
          {branchExpanded && (
            <div className="branch-node-grid">
              {block.nodes.map((node) => renderNode(node, true))}
            </div>
          )}
        </div>
      );
    }
    return (
      <div key={block.node.id} className="evolution-node-row">
        {idx > 0 && <div className={`node-connector ${currentSave.unlockedNodes.includes(block.node.id) ? "active" : ""}`} />}
        {renderNode(block.node, false)}
      </div>
    );
  }

  function renderNode(node: EvolutionNode, branchNode: boolean) {
    const unlocked = currentSave.unlockedNodes.includes(node.id);
    const canUnlock = canUnlockEvolutionNode(currentSave, node.id);
    const branchBlocked = isBranchBlocked(node, currentSave.unlockedNodes);
    const copy = nodeCopyFor(node.id, node.name, node.description);
    const preview = previewEvolutionNodeProduction(currentSave, node.id);
    let stateClass = "locked";
    if (unlocked) stateClass = "unlocked";
    else if (canUnlock) stateClass = "available";
    else if (branchBlocked) stateClass = "blocked";

    return (
      <button
        key={node.id}
        className={`evolution-node ${stateClass} ${branchNode ? "branch-node" : ""} ${recentlyUnlockedNodeId === node.id ? "just-unlocked" : ""}`}
        disabled={!canUnlock}
        onClick={() => (node.branchGroupId ? confirmBranchUnlock(node) : handleUnlock(node.id))}
      >
        <div className={`node-circle ${stateClass}`}>
          <img className="node-icon-img" src={iconFor(node.id)} alt="" aria-hidden="true" />
        </div>
        <div className="node-info">
          <span className="node-name">{copy.title}</span>
          <span className="node-desc">{copy.description}</span>
          <span className="term-badge node-term">{node.name}</span>
          {node.branchHint && <span className="node-branch-hint">{node.branchHint}</span>}
          {!unlocked && (
            <span className="node-preview">
              解锁后产能约 x{preview.ratio.toFixed(preview.ratio >= 10 ? 0 : 1)} · {preview.copy}
            </span>
          )}
          {!unlocked && (
            <span className="node-preview-detail">
              当前 {formatChineseNumber(resourceTotal(preview.before))}/小时 → 预计 {formatChineseNumber(resourceTotal(preview.after))}/小时
            </span>
          )}
          {!unlocked && (
            <span className="node-cost">
              {Object.entries(node.cost)
                .map(([k, v]) => `${labelFor(k)} ${formatChineseNumber(v)}`)
                .join(" / ")}
            </span>
          )}
          {canUnlock && <span className="node-action">{actionFor(node.id)}</span>}
          {unlocked && <span className="node-action confirmed">已留下痕迹</span>}
          {branchBlocked && <span className="node-action blocked">已沉到旁路</span>}
          {!unlocked && !canUnlock && !branchBlocked && <span className="node-action waiting">{lockReasonFor(currentSave, node)}</span>}
        </div>
      </button>
    );
  }
}

function resourceTotal(resources: Partial<Resources>) {
  return Object.values(resources).reduce((sum, value) => sum + Math.max(0, value), 0);
}

type PathBlock =
  | { type: "node"; node: EvolutionNode }
  | { type: "branch"; id: string; nodes: EvolutionNode[] };

type ChapterBlock = {
  id: ChapterId;
  title: string;
  objective: string;
  nodes: EvolutionNode[];
  blocks: PathBlock[];
};

function buildChapterBlocks(nodes: EvolutionNode[]): ChapterBlock[] {
  return CHAPTERS.map((chapter) => {
    const chapterNodes = chapter.nodeIds
      .map((nodeId) => nodes.find((node) => node.id === nodeId))
      .filter((node): node is EvolutionNode => Boolean(node));
    return {
      ...chapter,
      nodes: chapterNodes,
      blocks: groupEvolutionPath(chapterNodes),
    };
  });
}

function countChapterProgress(chapter: ChapterBlock, unlockedNodes: string[]) {
  return chapter.blocks.reduce(
    (progress, block) => {
      if (block.type === "node") {
        return {
          total: progress.total + 1,
          unlocked: progress.unlocked + (unlockedNodes.includes(block.node.id) ? 1 : 0),
        };
      }
      return {
        total: progress.total + 1,
        unlocked: progress.unlocked + (block.nodes.some((node) => unlockedNodes.includes(node.id)) ? 1 : 0),
      };
    },
    { total: 0, unlocked: 0 },
  );
}

function groupEvolutionPath(nodes: EvolutionNode[]): PathBlock[] {
  const blocks: PathBlock[] = [];
  const grouped = new Set<string>();
  for (const node of nodes) {
    if (!node.branchGroupId) {
      blocks.push({ type: "node", node });
      continue;
    }

    if (grouped.has(node.branchGroupId)) continue;
    grouped.add(node.branchGroupId);
    const branchNodes = nodes.filter((item) => item.branchGroupId === node.branchGroupId);
    blocks.push({ type: "branch", id: node.branchGroupId, nodes: branchNodes });
  }
  return blocks;
}

function isBranchBlocked(node: EvolutionNode, unlocked: string[]) {
  if (!node.branchGroupId || unlocked.includes(node.id)) return false;
  return evolutionNodes.some((item) => item.branchGroupId === node.branchGroupId && unlocked.includes(item.id));
}

function actionFor(nodeId: string): string {
  const map: Record<string, string> = {
    organic_richness: "点亮这道痕迹",
    replicating_chain: "让它延续",
    replication_fidelity: "保留稳定复制",
    error_retention: "保留一次错误",
    fragment_budding: "允许旁支萌发",
    primitive_vesicle: "包住这段反应",
    metabolic_loop: "形成能量循环",
    proto_cell: "记录这个跃迁",
    photo_pigment: "追逐第一缕光",
    early_producer_film: "记录受光生产者",
    decomposition_layer: "记录分解层",
    tidal_filter_pores: "记录滤食孔隙",
    mutual_ecology_cycle: "形成小循环",
    ecological_personality: "留下潮池的样子",
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
    early_producer_film: uiAssets.species.producer,
    decomposition_layer: uiAssets.species.decomposer,
    tidal_filter_pores: uiAssets.species.filterer,
    mutual_ecology_cycle: uiAssets.emblems.ecologyResonance,
    ecological_personality: uiAssets.emblems.system,
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
  const map: Record<string, { title: string; description: string }> = {
    organic_richness: {
      title: "第一道生命痕迹",
      description: "复杂分子开始稳定留下痕迹。",
    },
    replicating_chain: {
      title: "让生命学会延续",
      description: "有些结构开始重复自己，生命有了延续的可能。",
    },
    primitive_vesicle: {
      title: "等待第一种生命成形",
      description: "反应被边界包裹，第一批小生命正在接近成形。",
    },
    proto_cell: {
      title: "等待第一种生命成形",
      description: "反应被边界包裹，第一批小生命正在接近成形。",
    },
    replication_fidelity: {
      title: "高保真复制",
      description: "复制更稳，潮池会少一些大胆错误。",
    },
    error_retention: {
      title: "保留复制错误",
      description: "变化会更频繁，潮池也会更容易失衡。",
    },
    fragment_budding: {
      title: "让旁支萌发",
      description: "断裂结构也能延续，后续谱系更容易分叉。",
    },
    metabolic_loop: {
      title: "让小生命获得能量",
      description: "简单循环开始把外界能量变成更稳定的生命活动。",
    },
    photo_pigment: {
      title: "让生命追逐光",
      description: "一些生命开始靠近光，新的生态爆发正在到来。",
    },
    early_producer_film: {
      title: "出现早期生产者",
      description: "受光薄膜把光照转成可用能量，潮池出现第一个生态角色。",
    },
    decomposition_layer: {
      title: "出现分解者",
      description: "旧结构沉入池底，被拆回有机质与矿物，循环开始有底层。",
    },
    tidal_filter_pores: {
      title: "出现滤食者",
      description: "潮汐孔隙筛入颗粒，让水体稳定和生物量增长连在一起。",
    },
    mutual_ecology_cycle: {
      title: "形成第一个小循环",
      description: "光、沉积和滤孔彼此接续，潮池第一次形成可延续的往复。",
    },
    ecological_personality: {
      title: "留下潮池的样子",
      description: "这段反复出现的水势沉进记忆，潮池有了自己的样子。",
    },
  };
  return map[nodeId] ?? { title: fallbackName, description: fallbackDescription };
}

function lockReasonFor(save: NonNullable<ReturnType<typeof useGameStore.getState>["save"]>, node: EvolutionNode) {
  if (node.id === "ecological_personality" && !save.chapterWitness?.ecologyBurst.imbalanceWitnessed) {
    return "先等潮池处理一次过盛的水面";
  }
  if (save.chapterProgress?.chapter === "ecology_burst" && save.chapterProgress.nextHintLabel) {
    return save.chapterProgress.nextHintLabel;
  }
  return "继续积累材料";
}
