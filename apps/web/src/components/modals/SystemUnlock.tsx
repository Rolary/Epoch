import { uiAssets } from "../../assets/uiAssets.js";
import { useUIStore } from "../../stores/uiStore.js";
import { GameModal } from "./GameModal.js";
import { useState } from "react";

export function SystemUnlock() {
  const modalData = useUIStore((s) => s.modalData);
  const hideModal = useUIStore((s) => s.hideModal);
  const setUnlockGuideTarget = useUIStore((s) => s.setUnlockGuideTarget);
  const [closing, setClosing] = useState(false);
  const name = (modalData.name as string) ?? "演化路径";
  const title = (modalData.title as string) ?? "新的生命痕迹出现了";
  const description = (modalData.description as string) ?? "新的痕迹已经浮上水面。";
  const impact = modalData.impact as string | undefined;
  const advice = modalData.advice as string | undefined;
  const icon = (modalData.icon as string) ?? uiAssets.emblems.system;
  const actionLabel = (modalData.actionLabel as string) ?? "前往查看";
  const hintId = modalData.hintId as string | undefined;

  const handleAction = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => {
      hideModal();
      if (hintId) setUnlockGuideTarget(hintId);
    }, 180);
  };

  return (
    <GameModal title={title} closing={closing}>
      <div className="unlock-content">
        <span className="unlock-icon asset-emblem">
          <img src={icon} alt="" aria-hidden="true" />
        </span>
        <h3 className="unlock-name">{description}</h3>
        <span className="term-badge">{name}</span>
        {impact && <p className="unlock-impact">{impact}</p>}
        {advice && <p className="unlock-advice">{advice}</p>}
        <button className="btn-primary" onClick={handleAction}>
          {actionLabel}
        </button>
      </div>
    </GameModal>
  );
}
