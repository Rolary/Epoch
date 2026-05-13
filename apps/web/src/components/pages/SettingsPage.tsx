import { useState } from "react";
import { useGameStore } from "../../stores/gameStore.js";
import { useUIStore } from "../../stores/uiStore.js";
import { clearLocalStorage, getGuestKey, getSaveId } from "../../api.js";

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

export function SettingsPage() {
  const save = useGameStore((s) => s.save);
  const setSave = useGameStore((s) => s.setSave);
  const setSaveId = useGameStore((s) => s.setSaveId);
  const setError = useGameStore((s) => s.setError);
  const setPage = useUIStore((s) => s.setPage);
  const [confirming, setConfirming] = useState(false);

  if (!save) {
    return (
      <div className="page settings-page">
        <h2 className="page-title">设置</h2>
        <div className="setting-group">
          <div className="setting-item">
            <span className="setting-label">游客印记</span>
            <span className="setting-value mono">{getGuestKey()}</span>
          </div>
          <div className="setting-item">
            <span className="setting-label">存档</span>
            <span className="setting-value">尚未创建</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page settings-page">
      <h2 className="page-title">设置与存档</h2>
      <div className="setting-group">
        <div className="setting-item">
          <span className="setting-label">生态名称</span>
          <span className="setting-value">{save.name}</span>
        </div>
        <div className="setting-item">
          <span className="setting-label">当前纪元</span>
          <span className="setting-value">{ERA_LABELS[save.currentEra] ?? save.currentEra}</span>
        </div>
        <div className="setting-item">
          <span className="setting-label">星球性格</span>
          <span className="setting-value">{PROFILE_LABELS[save.planetProfile] ?? "均衡演化"}</span>
        </div>
        <div className="setting-item">
          <span className="setting-label">游客印记</span>
          <span className="setting-value mono">{getGuestKey()}</span>
        </div>
        <div className="setting-item">
          <span className="setting-label">存档 ID</span>
          <span className="setting-value mono">{getSaveId().slice(0, 16)}</span>
        </div>
        <div className="setting-item">
          <span className="setting-label">物种记录</span>
          <span className="setting-value">{save.species?.length ?? 0} 个</span>
        </div>
        <div className="setting-item">
          <span className="setting-label">遗产记录</span>
          <span className="setting-value">{save.legacies?.length ?? 0} 个</span>
        </div>
      </div>
      <div className="setting-actions">
        {!confirming ? (
          <button className="btn-danger" onClick={() => setConfirming(true)}>
            重置本地存档
          </button>
        ) : (
          <div className="confirm-row">
            <span className="confirm-text">确定要删除本地存档？</span>
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
      </div>
    </div>
  );
}
