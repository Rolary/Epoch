import { uiAssets } from "../../assets/uiAssets.js";
import { useGameStore } from "../../stores/gameStore.js";
import { useUIStore } from "../../stores/uiStore.js";
import { GameModal } from "./GameModal.js";

const SPECIES_ROLE_ASSETS: Record<string, string> = {
  producer: uiAssets.species.producer,
  decomposer: uiAssets.species.decomposer,
  symbiont: uiAssets.species.symbiont,
  extremophile: uiAssets.species.extremophile,
  filterer: uiAssets.species.filterer,
  catalyst: uiAssets.species.catalyst,
};

export function SpeciesDiscovery() {
  const modalData = useUIStore((s) => s.modalData);
  const species = useGameStore((s) => s.species());
  const speciesId = modalData.speciesId as string | undefined;
  const showTalentAfter = modalData.showTalentAfter === true;
  const sp = species.find((s) => s.id === speciesId) ?? species[0];
  const setPage = useUIStore((s) => s.setPage);
  const hideModal = useUIStore((s) => s.hideModal);

  if (!sp) return null;

  return (
    <GameModal title="第一种生命出现了">
      <div className="discovery-content">
        <div className="discovery-visual asset-emblem">
          <img src={speciesAssetFor(sp.ecologicalRole)} alt="" aria-hidden="true" />
        </div>
        <p className="discovery-theme">这片潮池不再只是水和矿物。它有了自己的第一段生命史。</p>
        <h3 className="discovery-name">{sp.name}</h3>
        <div className="discovery-tags">
          <span className="tag">{sp.niche}</span>
          <span className="tag">{roleLabel(sp.ecologicalRole)}</span>
        </div>
        <p className="discovery-desc">{sp.shortDescription}</p>
        <p className="discovery-science">文明还很遥远，但历史已经开始。这段生命会影响后续生态。</p>
        <button
          className="btn-primary"
          onClick={() => {
            hideModal();
            setPage("codex");
            if (showTalentAfter) {
              window.setTimeout(() => {
                useUIStore.getState().showModal("talent-awakening");
              }, 250);
            }
          }}
        >
          记录这段生命
        </button>
      </div>
    </GameModal>
  );
}

function speciesAssetFor(role: string): string {
  return SPECIES_ROLE_ASSETS[role] ?? uiAssets.emblems.discovery;
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
