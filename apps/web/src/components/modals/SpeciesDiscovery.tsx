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
  const save = useGameStore((s) => s.save);
  const speciesId = modalData.speciesId as string | undefined;
  const showTalentAfter = modalData.showTalentAfter === true;
  const sp = species.find((s) => s.id === speciesId) ?? species[0];
  const setPage = useUIStore((s) => s.setPage);
  const hideModal = useUIStore((s) => s.hideModal);

  if (!sp) return null;
  const isEcologyRole = save?.chapterProgress?.chapter === "ecology_burst" && species.length > 1;
  const copy = isEcologyRole
    ? {
        title: "新的生命工作出现了",
        theme: `${roleLabel(sp.ecologicalRole)}在潮池里站稳了位置，水面、池底和潮孔开始各自有事可做。`,
        science: "它不是孤零零出现的生命。它会在这片水里留下自己的工作，也会牵动旁边的生命痕迹。",
        action: "看看这道痕迹",
      }
    : {
        title: "第一种生命出现了",
        theme: "这片潮池不再只是水和矿物。它有了自己的第一段生命史。",
        science: "文明还很遥远，但历史已经开始。这段生命会影响后续生态。",
        action: "记录这段生命",
      };

  return (
    <GameModal title={copy.title}>
      <div className="discovery-content">
        <div className="discovery-visual asset-emblem">
          <img src={speciesAssetFor(sp.ecologicalRole)} alt="" aria-hidden="true" />
        </div>
        <p className="discovery-theme">{copy.theme}</p>
        <h3 className="discovery-name">{sp.name}</h3>
        <div className="discovery-tags">
          <span className="tag">{sp.niche}</span>
          <span className="tag">{roleLabel(sp.ecologicalRole)}</span>
        </div>
        <p className="discovery-desc">{sp.shortDescription}</p>
        <p className="discovery-science">{copy.science}</p>
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
          {copy.action}
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
