import { evolutionNodes } from "@eco-era/game-core";
import type { GameState, ResourceKey } from "@eco-era/shared";
import { useState } from "react";
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

  if (!save) {
    return (
      <div className="page settings-page archive-page">
        <h2 className="page-title">生态档案</h2>
        <p className="page-hint">创建潮池后，这里会保存它的身份和成长记录。</p>
        <section className="archive-section">
          <h3 className="archive-section-title">存档信息</h3>
          <div className="archive-list">
            <ArchiveRow label="游客印记" value={getGuestKey()} mono />
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
        <h3 className="archive-section-title">当前状态</h3>
        <div className="archive-state-grid">
          <ArchiveMetric label="生命成形" value={`${lifeProgress}%`} />
          <ArchiveMetric label="稳定性" value={`${Math.floor(save.resources.stability)}`} tone={save.resources.stability < 30 ? "warn" : "good"} />
          <ArchiveMetric label="突变倾向" value={`${Math.floor(save.resources.mutation)}`} tone={save.resources.mutation > 120 ? "warn" : "normal"} />
          <ArchiveMetric label="主要积累" value={mainResourceLabel(save)} />
        </div>
      </section>

      <section className="archive-section">
        <h3 className="archive-section-title">存档信息</h3>
        <div className="archive-list">
          <ArchiveRow label="游客印记" value={getGuestKey()} mono />
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

function ArchiveRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="archive-row">
      <span className="archive-label">{label}</span>
      <span className={`archive-value ${mono ? "mono" : ""}`}>{value}</span>
    </div>
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
