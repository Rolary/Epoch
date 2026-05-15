import { uiAssets } from "../../assets/uiAssets.js";
import { useUIStore } from "../../stores/uiStore.js";
import { GameModal } from "./GameModal.js";

export function SystemUnlock() {
  const modalData = useUIStore((s) => s.modalData);
  const hideModal = useUIStore((s) => s.hideModal);
  const name = (modalData.name as string) ?? "";

  return (
    <GameModal title="系统解锁">
      <div className="unlock-content">
        <span className="unlock-icon asset-emblem">
          <img src={uiAssets.emblems.system} alt="" aria-hidden="true" />
        </span>
        <h3 className="unlock-name">{name}</h3>
        <p className="unlock-desc">已解锁</p>
        <button className="btn-primary" onClick={hideModal}>
          知道了
        </button>
      </div>
    </GameModal>
  );
}
