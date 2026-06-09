import { OFFLINE_ACCUMULATION_HOURS } from "@eco-era/game-core";
import { formatChineseNumber } from "@eco-era/shared";
import type { PoolEffect } from "@eco-era/shared";
import { GameModal } from "./GameModal.js";
import { useUIStore } from "../../stores/uiStore.js";
import { uiAssets } from "../../assets/uiAssets.js";

export function OfflineReturn() {
  const modalData = useUIStore((s) => s.modalData);
  const hideModal = useUIStore((s) => s.hideModal);
  const minutes = (modalData.minutes as number) ?? 0;
  const isFull = Boolean(modalData.isFull);
  const gains = (modalData.gains as Record<string, number>) ?? {};
  const poolEffect = modalData.poolEffect as PoolEffect | undefined;
  const observationTitle = modalData.observationTitle as string | undefined;

  return (
    <GameModal title="潮池仍在反应">
      <div className="offline-content">
        <div className="asset-emblem">
          <img src={uiAssets.emblems.reward} alt="" aria-hidden="true" />
        </div>
        <p className="offline-time">{isFull ? "潮池的养分已经盛满" : `你离开了 ${formatMinutes(minutes)}`}</p>
        <p className="offline-subtitle">
          {isFull
            ? `潮池积累了 ${OFFLINE_ACCUMULATION_HOURS} 小时养分，之后便安静地等待你回来。`
            : "潮池在你离开时仍在缓慢积累，这些养分正等待收取。"}
        </p>
        {(poolEffect || observationTitle) && (
          <div className="offline-surprise">
            <span className="offline-surprise-kicker">{poolEffect ? poolEffect.title : "潮池留下了新痕迹"}</span>
            <span>{poolEffect?.description ?? `你离开后，${observationTitle}被潮池记进了图鉴。`}</span>
            {poolEffect && (
              <span className={`offline-effect-label ${poolEffect.tone}`}>
                {poolEffect.effectLabel} · 还会持续 {formatEffectDuration(poolEffect)}
              </span>
            )}
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

function formatEffectDuration(effect: PoolEffect) {
  const minutes = Math.max(1, Math.ceil((new Date(effect.expiresAt).getTime() - Date.now()) / 60000));
  return `${minutes} 分钟`;
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
