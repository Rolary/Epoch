import { evolutionNodes } from "@eco-era/game-core";
import type { GameState, ResourceKey } from "@eco-era/shared";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { clearLocalStorage, getGuestKey, getSaveId } from "../../api.js";
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

  if (!save) {
    return (
      <div className="page settings-page archive-page">
        <h2 className="page-title">生态档案</h2>
        <p className="page-hint">创建潮池后，这里会保存它的身份和成长记录。</p>
        <section className="archive-section">
          <h3 className="archive-section-title">存档信息</h3>
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
            <span className="archive-name">{save.name}</span>
            <span className="archive-subtitle">{ERA_LABELS[save.currentEra] ?? save.currentEra}</span>
            <span className="archive-badge">{PROFILE_LABELS[save.planetProfile] ?? "均衡演化"}</span>
          </div>
        </div>
      </section>

      <section className="archive-section">
        <h3 className="archive-section-title">成长记录</h3>
        <div className="archive-stats">
          <ArchiveStat label="演化痕迹" value={`${confirmedNodes}/${evolutionNodes.length}`} />
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
            <span className="archive-link-desc">只显示已经融入或已经回响过的源质印记。</span>
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
        <h3 className="archive-section-title">存档信息</h3>
        <div className="archive-list">
          <ArchiveRow label="游客印记" value={getGuestKey()} mono action={<CopyKeyButton status={copyStatus} onCopy={copyGuestKey} />} />
          <ArchiveRow label="存档 ID" value={getSaveId().slice(0, 16)} mono />
          <ArchiveRow label="最近记录" value={formatDateTime(save.updatedAt)} />
        </div>
      </section>

      <section className="danger-zone">
        <h3 className="archive-section-title danger-title">危险操作</h3>
        {!confirming ? (
          <button className="btn-danger" onClick={() => setConfirming(true)}>
            重置这份本地生态档案
          </button>
        ) : (
          <div className="confirm-row">
            <span className="confirm-text">这会删除本地潮池记录，并回到创建流程。</span>
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
  };
  return map[tag] ?? tag;
}

function historyTagCopy(tag: string): string {
  const map: Record<string, string> = {
    heat_tolerant: "高温事件收益略高，稳定结构更受考验。",
    stable_membrane: "稳定性恢复更强，突变速度略慢。",
    tidal_rich: "回潮更容易带来有机富集。",
    mineral_catalyst: "矿物表面正在成为反应支点。",
    mutation_biased: "错误更容易被保留下来。",
    volatile: "潮池更容易剧烈波动，也更容易打开异常窗口。",
    crowded_soup: "富集层更厚，结构更容易互相挤压。",
    clear_tide: "清潮带来秩序，早期结构更容易稳定留下。",
    edge_feeding: "边缘薄膜更早获得养料，旁支更容易出现。",
    sheltered: "庇护缝隙让脆弱结构多一次延续机会。",
    symbiotic_seed: "互养关系更容易萌发，生命会更早学会交换。",
    charged: "高能窗口更常塑造后续谱系。",
    selection_pressure: "坏事也会沉淀成后来的遗产。",
    branching: "旁支谱系更容易留下痕迹。",
    replication_fidelity: "复制更稳，但变化更谨慎。",
    error_retention: "突变更大胆，潮池更容易波动。",
    fragment_budding: "断裂也可能成为新的延续方式。",
  };
  return map[tag] ?? "这类变化正在写入潮池性格。";
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
