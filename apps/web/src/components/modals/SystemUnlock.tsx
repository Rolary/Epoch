import { GameModal } from "./GameModal.js";
import { useUIStore } from "../../stores/uiStore.js";

export function SystemUnlock() {
  const modalData = useUIStore((s) => s.modalData);
  const hideModal = useUIStore((s) => s.hideModal);
  const name = (modalData.name as string) ?? "";
  const icon = (modalData.icon as string) ?? "✦";

  return (
    <GameModal title="系统解锁">
      <div className="unlock-content">
        <span className="unlock-icon">{icon}</span>
        <h3 className="unlock-name">{name}</h3>
        <p className="unlock-desc">已解锁</p>
        <button className="btn-primary" onClick={hideModal}>知道了</button>
      </div>
    </GameModal>
  );
}
