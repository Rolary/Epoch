import { GameModal } from "./GameModal.js";
import { useUIStore } from "../../stores/uiStore.js";
import { uiAssets } from "../../assets/uiAssets.js";

export function OfflineReturn() {
  const modalData = useUIStore((s) => s.modalData);
  const hideModal = useUIStore((s) => s.hideModal);
  const minutes = (modalData.minutes as number) ?? 0;
  const gains = (modalData.gains as Record<string, number>) ?? {};

  return (
    <GameModal title="潮池仍在反应">
      <div className="offline-content">
        <div className="asset-emblem">
          <img src={uiAssets.emblems.reward} alt="" aria-hidden="true" />
        </div>
        <p className="offline-time">你离开了 {formatMinutes(minutes)}</p>
        <p className="offline-subtitle">潮池在你离开时仍在缓慢演化。</p>
        <div className="offline-gains">
          {Object.entries(gains).map(([k, v]) => (
            <div key={k} className="gain-item">
              <span className="gain-label">{labelRes(k)}</span>
              <span className="gain-value">+{Math.floor(v)}</span>
            </div>
          ))}
        </div>
        <button className="btn-primary" onClick={hideModal}>
          收取
        </button>
      </div>
    </GameModal>
  );
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${Math.floor(mins)} 分钟`;
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  return `${h} 小时 ${m} 分钟`;
}

function labelRes(key: string): string {
  const m: Record<string, string> = {
    organic: "有机质", energy: "能量", minerals: "矿物质",
    stability: "稳定性", mutation: "突变点", biomass: "生物量",
  };
  return m[key] ?? key;
}
