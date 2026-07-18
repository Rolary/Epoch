import type { HiddenTraceRecord } from "@eco-era/shared";
import { uiAssets } from "../../assets/uiAssets.js";
import { useUIStore } from "../../stores/uiStore.js";
import { GameModal } from "./GameModal.js";

export function HiddenTraceDiscovery() {
  const modalData = useUIStore((state) => state.modalData);
  const completeNarrative = useUIStore((state) => state.completeNarrative);
  const hideModal = useUIStore((state) => state.hideModal);
  const setPage = useUIStore((state) => state.setPage);
  const record = modalData.record as HiddenTraceRecord | undefined;
  const narrativeId = modalData.narrativeId as string | undefined;

  if (!record) return null;

  const close = () => {
    if (narrativeId) completeNarrative(narrativeId);
    else hideModal();
  };

  return (
    <GameModal title="发现隐秘潮痕" onClose={close}>
      <div className={`hidden-trace-discovery trace-${record.rarity}`}>
        <span className="hidden-trace-emblem">
          <img src={uiAssets.hiddenTraces.emblem} alt="" aria-hidden="true" />
        </span>
        <span className="hidden-trace-kicker">隐秘潮痕</span>
        <h3>{record.name}</h3>
        <p>{record.description}</p>
        <span className="hidden-trace-score">潮池评分 +{record.score}</span>
        <button
          className="btn-primary"
          onClick={() => {
            close();
            setPage("logs");
          }}
        >
          收入潮池记忆
        </button>
      </div>
    </GameModal>
  );
}
