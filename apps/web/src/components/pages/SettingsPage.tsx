import { evolutionNodes } from "@eco-era/game-core";
import type { GameState, ResourceKey } from "@eco-era/shared";
import { Check, Pencil, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { clearLocalStorage, getGuestKey, getSaveId, renameSave } from "../../api.js";
import { uiAssets } from "../../assets/uiAssets.js";
import { useGameStore } from "../../stores/gameStore.js";
import { useUIStore } from "../../stores/uiStore.js";

const ERA_LABELS: Record<string, string> = {
  primordial_pool: "始源潮池",
  self_replicators: "自复制链",
  proto_cell: "原初细胞",
  photosynthesis_eve: "光合作用前夜",
};

const PROFILE_LABELS: Record<string, string> = {
  balanced: "均衡演化",
  high_mutation: "高频突变",
  stable_pool: "稳定富集",
  cataclysmic: "灾变频发",
  symbiotic: "共生繁盛",
  extreme: "极端环境",
};

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  organic: "有机质",
  energy: "能量",
  minerals: "矿物质",
  stability: "稳定性",
  mutation: "突变点",
  biomass: "生物量",
};

export function SettingsPage() {
  const save = useGameStore((s) => s.save);
  const setSave = useGameStore((s) => s.setSave);
  const setSaveId = useGameStore((s) => s.setSaveId);
  const setError = useGameStore((s) => s.setError);
  const setPage = useUIStore((s) => s.setPage);
  const [confirming, setConfirming] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "manual">("idle");
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(save?.name ?? "");
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    if (!editingName) setDraftName(save?.name ?? "");
  }, [editingName, save?.name]);

  useEffect(() => {
    if (copyStatus === "idle") return;
    const timer = window.setTimeout(() => setCopyStatus("idle"), 1800);
    return () => window.clearTimeout(timer);
  }, [copyStatus]);

  const copyGuestKey = async () => {
    const key = getGuestKey();
    if (!key) {
      setCopyStatus("manual");
      return;
    }

    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(key);
      setCopyStatus("copied");
    } catch {
      window.prompt("复制这段游客印记，用它可以恢复生态档案。", key);
      setCopyStatus("manual");
    }
  };

  const submitRename = async () => {
    if (!save || renaming) return;
    const nextName = draftName.trim();
    if (!nextName || nextName.length > 16 || nextName === save.name) {
      setEditingName(false);
      setDraftName(save.name);
      return;
    }
    setRenaming(true);
    setError(null);
    try {
      const updated = await renameSave(save.id, nextName);
      setSave(updated);
      setEditingName(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "修改生态名失败");
    } finally {
      setRenaming(false);
    }
  };

  if (!save) {
    return (
      <div className="page settings-page archive-page">
        <h2 className="page-title">生态档案</h2>
        <p className="page-hint">创建潮池后，这里会保存它的身份和成长记录。</p>
        <section className="archive-section">
          <h3 className="archive-section-title">档案凭证</h3>
          <div className="archive-list">
            <ArchiveRow label="游客印记" value={getGuestKey()} mono action={<CopyKeyButton status={copyStatus} onCopy={copyGuestKey} />} />
            <ArchiveRow label="当前状态" value="尚未创建潮池" />
          </div>
        </section>
      </div>
    );
  }

  const confirmedNodes = save.unlockedNodes.length;
  const nextNode = evolutionNodes.find(
    (node) => !save.unlockedNodes.includes(node.id) && node.requires.every((required) => save.unlockedNodes.includes(required)),
  );
  const lifeProgress = nextNode ? calculateNodeProgress(save, nextNode.cost) : 100;

  return (
    <div className="page settings-page archive-page">
      <h2 className="page-title">生态档案</h2>
      <p className="page-hint">这里记录这片潮池是谁、走到了哪里，以及它现在的生命倾向。</p>

      <section className="archive-section archive-identity">
        <h3 className="archive-section-title">潮池身份</h3>
        <div className="archive-hero">
          <img className="archive-hero-icon" src={uiAssets.scene.poolCenterpiece} alt="" aria-hidden="true" />
          <div className="archive-hero-copy">
            {editingName ? (
              <span className="archive-name-edit">
                <input
                  className="archive-name-input"
                  value={draftName}
                  maxLength={16}
                  autoFocus
                  onChange={(event) => setDraftName(event.target.value.slice(0, 16))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submitRename();
                    if (event.key === "Escape") {
                      setDraftName(save.name);
                      setEditingName(false);
                    }
                  }}
                />
                <button
                  className="archive-icon-btn"
                  type="button"
                  aria-label="确认名称"
                  disabled={renaming}
                  onClick={submitRename}
                >
                  <Check size={14} aria-hidden="true" />
                </button>
                <button
                  className="archive-icon-btn muted"
                  type="button"
                  aria-label="取消改名"
                  disabled={renaming}
                  onClick={() => {
                    setDraftName(save.name);
                    setEditingName(false);
                  }}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </span>
            ) : (
              <span className="archive-name-row">
                <span className="archive-name">{save.name}</span>
                <button
                  className="archive-icon-btn"
                  type="button"
                  aria-label="修改生态名"
                  onClick={() => {
                    setDraftName(save.name);
                    setEditingName(true);
                  }}
                >
                  <Pencil size={13} aria-hidden="true" />
                </button>
              </span>
            )}
            <span className="archive-subtitle">{ERA_LABELS[save.currentEra] ?? save.currentEra}</span>
            <span className="archive-badge">{PROFILE_LABELS[save.planetProfile] ?? "均衡演化"}</span>
          </div>
        </div>
      </section>

      <section className="archive-section">
        <h3 className="archive-section-title">成长记录</h3>
        <div className="archive-stats">
          <ArchiveStat label="已确认演化" value={`${confirmedNodes}/${evolutionNodes.length}`} />
          <ArchiveStat label="物种记录" value={`${save.species?.length ?? 0}`} />
          <ArchiveStat label="遗产记录" value={`${save.legacies?.length ?? 0}`} />
          <ArchiveStat label="源质印记" value={`${save.talents?.length ?? 0}`} />
        </div>
      </section>

      <section className="archive-section">
        <h3 className="archive-section-title">源质印记</h3>
        <button className="archive-link-card" type="button" onClick={() => setPage("talents")}>
          <img className="archive-link-icon" src={uiAssets.talents.typeCrystal} alt="" aria-hidden="true" />
          <span className="archive-link-copy">
            <span className="archive-link-title">查看已拥有印记</span>
            <span className="archive-link-desc">查看长期生效的印记，以及已经触发过的即时印记。</span>
          </span>
          <span className="archive-link-count">{(save.talents?.length ?? 0) + new Set(save.consumedTalents ?? []).size}</span>
        </button>
      </section>

      <section className="archive-section">
        <h3 className="archive-section-title">当前状态</h3>
        <div className="archive-state-grid">
          <ArchiveMetric label="生命成形" value={`${lifeProgress}%`} />
          <ArchiveMetric label="稳定性" value={`${Math.floor(save.resources.stability)}`} tone={save.resources.stability < 30 ? "warn" : "good"} />
          <ArchiveMetric label="突变倾向" value={`${Math.floor(save.resources.mutation)}`} tone={save.resources.mutation > 120 ? "warn" : "normal"} />
          <ArchiveMetric label="主要积累" value={mainResourceLabel(save)} />
        </div>
      </section>

      {(save.historyTags?.length ?? 0) >= 2 && (
        <section className="archive-section">
          <h3 className="archive-section-title">生命倾向</h3>
          <div className="archive-list">
            {save.historyTags.slice(-5).map((tag) => (
              <ArchiveRow key={tag} label={historyTagLabel(tag)} value={historyTagCopy(tag)} />
            ))}
          </div>
        </section>
      )}

      <section className="archive-section">
        <h3 className="archive-section-title">档案凭证</h3>
        <div className="archive-list">
          <ArchiveRow label="游客印记" value={getGuestKey()} mono action={<CopyKeyButton status={copyStatus} onCopy={copyGuestKey} />} />
          <ArchiveRow label="档案编号" value={getSaveId().slice(0, 16)} mono />
          <ArchiveRow label="最近记录" value={formatDateTime(save.updatedAt)} />
        </div>
      </section>

      <section className="danger-zone">
        <h3 className="archive-section-title danger-title">重新开始</h3>
        {!confirming ? (
          <button className="btn-danger" onClick={() => setConfirming(true)}>
            清除这片潮池
          </button>
        ) : (
          <div className="confirm-row">
            <span className="confirm-text">这会删除当前潮池记录，并回到命名与起始印记选择。</span>
            <button
              className="btn-danger"
              onClick={() => {
                clearLocalStorage();
                setSave(null as never);
                setSaveId(null);
                setError(null);
                setConfirming(false);
                setPage("create-ecology");
              }}
            >
              确认重置
            </button>
            <button className="btn-secondary" onClick={() => setConfirming(false)}>
              取消
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function historyTagLabel(tag: string): string {
  const map: Record<string, string> = {
    heat_tolerant: "耐热倾向",
    stable_membrane: "稳膜倾向",
    tidal_rich: "潮汐富集",
    mineral_catalyst: "矿晶依赖",
    mutation_biased: "突变偏向",
    volatile: "高波动倾向",
    crowded_soup: "丰厚原汤",
    clear_tide: "清潮记忆",
    edge_feeding: "边缘摄食",
    sheltered: "庇护缝隙",
    symbiotic_seed: "共生种源",
    charged: "高能电痕",
    selection_pressure: "筛选压力",
    branching: "旁支分化",
    replication_fidelity: "高保真复制",
    error_retention: "错误保留",
    fragment_budding: "断裂繁殖",
    producer_cycle: "浅层生产",
    decomposer_cycle: "池底回收",
    filterer_balance: "清潮过滤",
    producer_decomposer_resonance: "浅层与池底交换",
    ecology_cycle: "生态循环",
    ecology_imbalance_faced: "承受过盛",
    ecological_personality: "潮池性格",
    stable_cycle: "稳定往复",
    bloom_resonance: "繁盛回响",
    light_chasing: "追光活动",
    producer_seed: "受光种源",
    decomposer_seed: "分解种源",
    filterer_seed: "滤食种源",
    organic_richness: "有机富集",
    replicating_chain: "自复制链",
    primitive_vesicle: "原始膜泡",
    metabolic_loop: "代谢回路",
    proto_cell: "原初细胞",
    photo_pigment: "感光色素",
    early_producer_film: "早期生产薄膜",
    decomposition_layer: "沉积分解层",
    tidal_filter_pores: "潮筛滤孔",
    mutual_ecology_cycle: "互养小循环",
    waterline_exposure: "水线显现",
    waterline_exposed: "退潮水线",
    shore_attachment: "湿岸附着",
    shore_attachment_ready: "生命靠近湿岩",
    shore_colonized: "湿岩附着斑",
    niche_split: "水分分栖",
    dry_wet_pressure: "干湿压力",
    moisture_retention: "水膜保持",
    shore_moisture_preserved: "岸缘水膜",
    rock_attachment: "矿面附着",
    tidal_dispersal: "随潮播散",
    shallow_cycle_recovered: "浅水回流",
    shoreline_exchange: "岸线往返",
    shoreline_memory: "岸线记忆",
    salt_crystal_pressure: "矿盐压力",
    salt_crust_attachment: "盐晶结面",
    salt_rinsed: "浅水洗盐",
    shoreline_rinse: "岸线冲洗",
    salt_tolerance_trial: "耐盐尝试",
    mineral_imprint_recalled: "矿物印记回应",
    salt_crust_reinforced: "矿面加固",
    filterer_shoreline_rinse: "滤孔截盐",
    tidal_rinse_reinforced: "回潮洗盐",
    salt_tolerance_survived: "耐盐薄膜",
    salt_tolerance_warning: "盐压警告",
  };
  return map[tag] ?? "新的生态倾向";
}

function historyTagCopy(tag: string): string {
  const map: Record<string, string> = {
    heat_tolerant: "高温下反应更活跃，但稳定结构更容易受损。",
    stable_membrane: "稳定性恢复更强，突变速度略慢。",
    tidal_rich: "回潮更容易带来有机富集。",
    mineral_catalyst: "矿物表面正在成为反应支点。",
    mutation_biased: "错误更容易被保留下来。",
    volatile: "潮池更容易剧烈波动，异常反应也会更频繁。",
    crowded_soup: "富集层更厚，结构更容易互相挤压。",
    clear_tide: "清潮带来秩序，早期结构更容易稳定留下。",
    edge_feeding: "边缘薄膜更早获得养料，旁支更容易出现。",
    sheltered: "庇护缝隙提高了脆弱结构的存活率。",
    symbiotic_seed: "互养关系更容易形成，谱系间会更早交换材料。",
    charged: "高能反应更频繁地影响后续谱系。",
    selection_pressure: "经历压力后退出的物种更容易形成遗产。",
    branching: "旁支谱系更容易稳定存活。",
    replication_fidelity: "复制更稳，但变化更谨慎。",
    error_retention: "突变更大胆，潮池更容易波动。",
    fragment_budding: "断裂也可能成为新的延续方式。",
    producer_cycle: "受光薄膜把光转成可供生态循环使用的能量。",
    decomposer_cycle: "池底分解层把旧薄膜拆回材料，并送回新的生长。",
    filterer_balance: "滤食孔隙筛去浑浊，让水体重新留出呼吸。",
    producer_decomposer_resonance: "浅层生产与池底回收已经互相接续。",
    ecology_cycle: "生产、分解和过滤接成了第一阵往复。",
    ecology_imbalance_faced: "潮池经历过繁盛压力，并形成了稳定的应对倾向。",
    ecological_personality: "反复出现的环境变化已经形成长期生态倾向。",
    stable_cycle: "水中的生产、回收与过滤更容易恢复稳定往复。",
    bloom_resonance: "水面繁盛会更明显地改变后续生态关系。",
    light_chasing: "已有生命会主动靠近浅水中的光照。",
    producer_seed: "受光谱系已成为这片潮池的早期生产来源。",
    decomposer_seed: "分解谱系开始把沉积碎片送回生态循环。",
    filterer_seed: "滤食谱系正在筛去水中的悬浮颗粒。",
    organic_richness: "蒸发与回潮之间留下了更厚的有机沉积。",
    replicating_chain: "少数链体已经能够复制并延续自身结构。",
    primitive_vesicle: "薄膜开始把内部反应与外界潮水短暂隔开。",
    metabolic_loop: "能量输入已经能维持更稳定的生命活动。",
    proto_cell: "潮池中形成了最早可以独立延续的生命单位。",
    photo_pigment: "部分谱系能够利用浅水中的光照。",
    early_producer_film: "受光薄膜开始为小生态持续提供能量。",
    decomposition_layer: "池底分解层把旧薄膜和碎片拆回可用材料。",
    tidal_filter_pores: "滤食孔隙反复筛取颗粒，让水体保持交换空间。",
    mutual_ecology_cycle: "生产、分解与过滤已经形成第一阵材料往复。",
    waterline_exposure: "退潮第一次露出仍然湿润的岩面。",
    waterline_exposed: "浅水与湿岩之间出现了清晰可见的水线。",
    shore_attachment: "已有生命能够随水流抵达并尝试附着湿岩。",
    shore_attachment_ready: "水流正把原有谱系带向潮池边缘。",
    shore_colonized: "一支原有生命依靠自身结构停留在湿岩上。",
    niche_split: "同一支生命在浅水、湿岩和湿润岸缘留下了不同姿态。",
    dry_wet_pressure: "岸边生命已经经历一次退潮带来的失水与暴露。",
    moisture_retention: "较慢蒸发的水膜降低了岸边生命最先承受的失水压力。",
    shore_moisture_preserved: "湿岩上保留了一层更稳定的薄水膜。",
    rock_attachment: "完全暴露的岩面筛选出更牢固的附着结构。",
    tidal_dispersal: "岸边碎屑更容易随回潮退回浅水并向外播散。",
    shallow_cycle_recovered: "回潮把岸边材料带回原有浅水循环。",
    shoreline_exchange: "浅水与岸边已经开始互相带回材料。",
    shoreline_memory: "潮池已经留下第一段可回看的水线变化。",
    salt_crystal_pressure: "连续蒸发让盐晶沿着湿岩附着斑生长。",
    salt_crust_attachment: "附着斑利用矿盐形成了更牢固的岸面结层。",
    salt_rinsed: "浅水洗过湿岩，盐晶与碎屑被带回原有循环。",
    shoreline_rinse: "一阵回水降低了岸边薄膜承受的盐分压力。",
    salt_tolerance_trial: "岸边生命曾在不清除盐晶的情况下承受浓盐。",
    mineral_imprint_recalled: "已有矿物源质印记让盐晶排列得更规整。",
    salt_crust_reinforced: "原有矿面附着倾向让盐晶结面更加牢固。",
    filterer_shoreline_rinse: "滤食孔隙截住了被冲回浅水的细小盐粒。",
    tidal_rinse_reinforced: "随潮播散倾向让洗落的材料更快回到浅水。",
    salt_tolerance_survived: "幸存结构收紧薄膜，在盐晶之间保持活动。",
    salt_tolerance_warning: "脆弱薄膜在浓盐中退缩，留下了需要恢复水分的空位。",
  };
  return map[tag] ?? "这类变化正在形成长期生态倾向。";
}

function ArchiveRow({
  label,
  value,
  mono = false,
  action,
}: {
  label: string;
  value: string;
  mono?: boolean;
  action?: ReactNode;
}) {
  return (
    <div className="archive-row">
      <span className="archive-label">{label}</span>
      <span className="archive-value-group">
        <span className={`archive-value ${mono ? "mono" : ""}`}>{value || "尚未生成"}</span>
        {action}
      </span>
    </div>
  );
}

function CopyKeyButton({ status, onCopy }: { status: "idle" | "copied" | "manual"; onCopy: () => void }) {
  const label = status === "copied" ? "已复制" : status === "manual" ? "请手动复制" : "复制";
  return (
    <button className={`archive-copy-btn ${status !== "idle" ? "active" : ""}`} type="button" onClick={onCopy}>
      {label}
    </button>
  );
}

function ArchiveStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="archive-stat">
      <span className="archive-stat-value">{value}</span>
      <span className="archive-stat-label">{label}</span>
    </div>
  );
}

function ArchiveMetric({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "good" | "warn" }) {
  return (
    <div className={`archive-metric metric-${tone}`}>
      <span className="archive-metric-label">{label}</span>
      <span className="archive-metric-value">{value}</span>
    </div>
  );
}

function calculateNodeProgress(save: GameState, cost: Partial<Record<ResourceKey, number>>): number {
  const entries = Object.entries(cost) as Array<[ResourceKey, number]>;
  const required = entries.reduce((sum, [, value]) => sum + value, 0);
  const current = entries.reduce((sum, [key, value]) => sum + Math.min(save.resources[key] ?? 0, value), 0);
  return Math.min(100, Math.round((current / Math.max(1, required)) * 100));
}

function mainResourceLabel(save: GameState): string {
  const order: ResourceKey[] = ["organic", "energy", "minerals", "biomass", "mutation", "stability"];
  const key = order.reduce((best, item) => (save.resources[item] > save.resources[best] ? item : best), order[0]);
  return `${RESOURCE_LABELS[key]} ${Math.floor(save.resources[key])}`;
}

function formatDateTime(iso: string): string {
  try {
    const date = new Date(iso);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `${month}-${day} ${hour}:${minute}`;
  } catch {
    return "未知";
  }
}
