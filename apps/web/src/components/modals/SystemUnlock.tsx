import { uiAssets } from "../../assets/uiAssets.js";
import { useUIStore } from "../../stores/uiStore.js";
import { GameModal } from "./GameModal.js";

export function SystemUnlock() {
  const modalData = useUIStore((s) => s.modalData);
  const hideModal = useUIStore((s) => s.hideModal);
  const name = (modalData.name as string) ?? "演化路径";

  return (
    <GameModal title="第一道生命痕迹出现了">
      <div className="unlock-content">
        <span className="unlock-icon asset-emblem">
          <img src={uiAssets.emblems.system} alt="" aria-hidden="true" />
        </span>
        <h3 className="unlock-name">新的结构已经可以被确认。</h3>
        <span className="term-badge">{name}</span>
        <button className="btn-primary" onClick={hideModal}>
          查看生命痕迹
        </button>
      </div>
    </GameModal>
  );
}
