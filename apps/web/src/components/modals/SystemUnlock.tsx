import { uiAssets } from "../../assets/uiAssets.js";
import { useUIStore } from "../../stores/uiStore.js";
import { GameModal } from "./GameModal.js";
import { useState } from "react";

export function SystemUnlock() {
  const modalData = useUIStore((s) => s.modalData);
  const hideModal = useUIStore((s) => s.hideModal);
  const setUnlockGuideTarget = useUIStore((s) => s.setUnlockGuideTarget);
  const completeNarrative = useUIStore((s) => s.completeNarrative);
  const setPage = useUIStore((s) => s.setPage);
  const [closing, setClosing] = useState(false);
  const name = (modalData.name as string) ?? "演化路径";
  const title = (modalData.title as string) ?? "潮池出现了新的变化";
  const description = (modalData.description as string) ?? "水体与生命的状态已经改变。";
  const impact = modalData.impact as string | undefined;
  const advice = modalData.advice as string | undefined;
  const icon = (modalData.icon as string) ?? uiAssets.emblems.system;
  const actionLabel = (modalData.actionLabel as string) ?? "前往查看";
  const hintId = modalData.hintId as string | undefined;
  const narrativeId = modalData.narrativeId as string | undefined;
  const targetPage = modalData.targetPage as Parameters<typeof setPage>[0] | undefined;

  const handleAction = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => {
      if (narrativeId) completeNarrative(narrativeId);
      else hideModal();
      if (hintId) setUnlockGuideTarget(hintId);
      else if (targetPage) setPage(targetPage);
    }, 180);
  };

  return (
    <GameModal
      title={title}
      closing={closing}
      onClose={() => {
        if (narrativeId) completeNarrative(narrativeId);
      }}
    >
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
