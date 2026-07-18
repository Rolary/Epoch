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
  const sp = species.find((s) => s.id === speciesId) ?? species[0];
  const setPage = useUIStore((s) => s.setPage);
  const hideModal = useUIStore((s) => s.hideModal);
  const completeNarrative = useUIStore((s) => s.completeNarrative);
  const narrativeId = modalData.narrativeId as string | undefined;

  if (!sp) return null;
  const isEcologyRole = save?.chapterProgress?.chapter === "ecology_burst" && species.length > 1;
  const copy = isEcologyRole
    ? {
        title: "新的生态角色出现了",
        theme: `${roleLabel(sp.ecologicalRole)}已经稳定生活在潮池中。`,
        science: "它会改变周围的材料流动，并与已有生命形成新的关系。",
        action: "查看这个物种",
      }
    : {
        title: "第一种生命出现了",
        theme: "水和矿物之间，出现了能够维持自身活动的生命。",
        science: "它的结构与习性会影响此后出现的生态角色。",
        action: "收入图鉴",
      };

  return (
    <GameModal
      title={copy.title}
      onClose={() => {
        if (narrativeId) completeNarrative(narrativeId);
      }}
    >
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
            if (narrativeId) completeNarrative(narrativeId);
            else hideModal();
            setPage("codex");
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
