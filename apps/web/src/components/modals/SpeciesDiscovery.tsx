import { GameModal } from "./GameModal.js";
import { useUIStore } from "../../stores/uiStore.js";
import { useGameStore } from "../../stores/gameStore.js";
import { uiAssets } from "../../assets/uiAssets.js";

export function SpeciesDiscovery() {
  const modalData = useUIStore((s) => s.modalData);
  const species = useGameStore((s) => s.species());
  const speciesId = modalData.speciesId as string | undefined;
  const sp = species.find((s) => s.id === speciesId) ?? species[0];
  const setPage = useUIStore((s) => s.setPage);
  const hideModal = useUIStore((s) => s.hideModal);

  if (!sp) return null;

  return (
    <GameModal title="新物种发现">
      <div className="discovery-content">
        <div className="discovery-visual asset-emblem">
          <img src={uiAssets.emblems.discovery} alt="" aria-hidden="true" />
        </div>
        <h3 className="discovery-name">{sp.name}</h3>
        <div className="discovery-tags">
          <span className="tag">{sp.niche}</span>
          <span className="tag">{roleLabel(sp.ecologicalRole)}</span>
        </div>
        <p className="discovery-desc">{sp.shortDescription}</p>
        <button
          className="btn-primary"
          onClick={() => {
            hideModal();
            setPage("codex");
          }}
        >
          收录图鉴
        </button>
      </div>
    </GameModal>
  );
}

function roleLabel(role: string): string {
  const m: Record<string, string> = {
    producer: "生产者", decomposer: "分解者", symbiont: "共生者",
    extremophile: "极端适应者", filterer: "滤食者", catalyst: "催化剂",
  };
  return m[role] ?? role;
}
