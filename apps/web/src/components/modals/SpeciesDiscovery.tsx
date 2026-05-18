import { uiAssets } from "../../assets/uiAssets.js";
import { useGameStore } from "../../stores/gameStore.js";
import { useUIStore } from "../../stores/uiStore.js";
import { GameModal } from "./GameModal.js";

export function SpeciesDiscovery() {
  const modalData = useUIStore((s) => s.modalData);
  const species = useGameStore((s) => s.species());
  const speciesId = modalData.speciesId as string | undefined;
  const sp = species.find((s) => s.id === speciesId) ?? species[0];
  const setPage = useUIStore((s) => s.setPage);
  const hideModal = useUIStore((s) => s.hideModal);

  if (!sp) return null;

  return (
    <GameModal title="第一种生命出现了">
      <div className="discovery-content">
        <div className="discovery-visual asset-emblem">
          <img src={uiAssets.emblems.discovery} alt="" aria-hidden="true" />
        </div>
        <p className="discovery-theme">这片潮池不再只是水和矿物。它有了自己的第一段生命史。</p>
        <h3 className="discovery-name">{sp.name}</h3>
        <div className="discovery-tags">
          <span className="tag">{sp.niche}</span>
          <span className="tag">{roleLabel(sp.ecologicalRole)}</span>
        </div>
        <p className="discovery-desc">{sp.shortDescription}</p>
        <p className="discovery-science">这段生命会被记录下来，并影响后续生态。</p>
        <button
          className="btn-primary"
          onClick={() => {
            hideModal();
            setPage("codex");
          }}
        >
          记录这段生命
        </button>
      </div>
    </GameModal>
  );
}

function roleLabel(role: string): string {
  const m: Record<string, string> = {
    producer: "生产者",
    decomposer: "分解者",
    symbiont: "共生者",
    extremophile: "极端适应者",
    filterer: "滤食者",
    catalyst: "催化者",
  };
  return m[role] ?? role;
}
