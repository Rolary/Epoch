import { formatChineseNumber } from "@eco-era/shared";
import { GameModal } from "./GameModal.js";
import { useUIStore } from "../../stores/uiStore.js";
import { uiAssets } from "../../assets/uiAssets.js";

export function OfflineReturn() {
  const modalData = useUIStore((s) => s.modalData);
  const hideModal = useUIStore((s) => s.hideModal);
  const minutes = (modalData.minutes as number) ?? 0;
  const gains = (modalData.gains as Record<string, number>) ?? {};
  const eventTitle = modalData.eventTitle as string | undefined;
  const observationTitle = modalData.observationTitle as string | undefined;

  return (
    <GameModal title="潮池仍在反应">
      <div className="offline-content">
        <div className="asset-emblem">
          <img src={uiAssets.emblems.reward} alt="" aria-hidden="true" />
        </div>
        <p className="offline-time">你离开了 {formatMinutes(minutes)}</p>
        <p className="offline-subtitle">潮池在你离开时仍在缓慢积累，这些养分正等待收取。</p>
        {(eventTitle || observationTitle) && (
          <div className="offline-surprise">
            <span className="offline-surprise-kicker">你不在时发生了</span>
            <span>{eventTitle ?? observationTitle}</span>
          </div>
        )}
        <div className="offline-gains">
          {Object.entries(gains)
            .filter(([, value]) => value > 0)
            .map(([key, value]) => (
              <div key={key} className="gain-item">
                <span className="gain-label">{labelRes(key)}</span>
                <span className="gain-value">+{formatChineseNumber(value)}</span>
              </div>
            ))}
        </div>
        <button className="btn-primary" onClick={hideModal}>
          回到潮池
        </button>
      </div>
    </GameModal>
  );
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${Math.max(0, Math.floor(mins))} 分钟`;
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  return `${h} 小时 ${m} 分钟`;
}

function labelRes(key: string): string {
  const labels: Record<string, string> = {
    organic: "有机质",
    energy: "能量",
    minerals: "矿物质",
    stability: "稳定性",
    mutation: "突变点",
    biomass: "生物量",
  };
  return labels[key] ?? key;
}
