import bgTidepoolBoard from "./ui/bg-tidepool-board.png";
import bgHomeTidepool from "./ui/bg-home-tidepool.png";
import cardCrystal from "./ui/card-crystal.png";
import cardEnergy from "./ui/card-energy.png";
import cardTide from "./ui/card-tide.png";
import emblemDiscovery from "./ui/emblem-discovery.png";
import emblemEcologyIntervention from "./ui/emblem-ecology-intervention.png";
import emblemEcologyResonance from "./ui/emblem-ecology-resonance.png";
import emblemReward from "./ui/emblem-reward.png";
import emblemSystem from "./ui/emblem-system.png";
import eventClearTide from "./ui/events/event-clear-tide.png";
import eventHotSpring from "./ui/events/event-hot-spring.png";
import evolutionMetabolicLoop from "./ui/evolution/metabolic-loop.png";
import evolutionOrganicRichness from "./ui/evolution/organic-richness.png";
import evolutionPhotoPigment from "./ui/evolution/photo-pigment.png";
import evolutionPrimitiveVesicle from "./ui/evolution/primitive-vesicle.png";
import evolutionProtoCell from "./ui/evolution/proto-cell.png";
import evolutionReplicatingChain from "./ui/evolution/replicating-chain.png";
import pickupCrystal from "./ui/pickup-crystal.png";
import pickupDroplet from "./ui/pickup-droplet.png";
import pickupPulse from "./ui/pickup-pulse.png";
import pickupSpark from "./ui/pickup-spark.png";
import poolCenterpiece from "./ui/pool-centerpiece.png";
import resourceBiomass from "./ui/resource-biomass.png";
import resourceEnergy from "./ui/resource-energy.png";
import resourceMinerals from "./ui/resource-minerals.png";
import resourceMutation from "./ui/resource-mutation.png";
import resourceOrganic from "./ui/resource-organic.png";
import resourceStability from "./ui/resource-stability.png";
import talentEpicBlackTideOath from "./ui/talents/talent-epic-black-tide-oath.png";
import talentEpicGeneticReturn from "./ui/talents/talent-epic-genetic-return.png";
import talentEpicProtocellHerald from "./ui/talents/talent-epic-protocell-herald.png";
import talentEpicStardustCatalyst from "./ui/talents/talent-epic-stardust-catalyst.png";
import talentEpicSymbiosisEmber from "./ui/talents/talent-epic-symbiosis-ember.png";
import talentTypeCrystal from "./ui/talents/talent-type-crystal.png";
import talentTypeMembrane from "./ui/talents/talent-type-membrane.png";
import talentTypeMutation from "./ui/talents/talent-type-mutation.png";
import talentTypeSpark from "./ui/talents/talent-type-spark.png";
import talentTypeTide from "./ui/talents/talent-type-tide.png";
import speciesCatalyst from "./ui/species/species-catalyst.png";
import speciesDecomposer from "./ui/species/species-decomposer.png";
import speciesExtremophile from "./ui/species/species-extremophile.png";
import speciesFilterer from "./ui/species/species-filterer.png";
import speciesProducer from "./ui/species/species-producer.png";
import speciesSymbiont from "./ui/species/species-symbiont.png";

const imageParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
const imageSource = imageParams?.get("imageSource") ?? import.meta.env.VITE_IMAGE_SOURCE ?? "db";
const imageBaseUrl = (imageParams?.get("imageBaseUrl") ?? import.meta.env.VITE_IMAGE_BASE_URL ?? "").replace(/\/+$/, "");
const useRemoteImages = imageSource === "remote" && imageBaseUrl.length > 0;
const useDatabaseImages = imageSource !== "local" && !useRemoteImages;
let databaseAssetUrls: Record<string, string> = {};

export async function loadUiAssetUrlMap(): Promise<void> {
  if (!useDatabaseImages || typeof window === "undefined") return;

  try {
    const response = await fetch("/api/meta/ui-assets");
    if (!response.ok) return;
    const data = (await response.json()) as { assets?: Array<{ path?: string; remoteUrl?: string }> };
    databaseAssetUrls = Object.fromEntries(
      (data.assets ?? [])
        .map((asset) => [asset.path?.trim() ?? "", asset.remoteUrl?.trim() ?? ""] as const)
        .filter(([path, remoteUrl]) => path.length > 0 && remoteUrl.length > 0),
    );
    if (import.meta.env.DEV) {
      console.info(`[ui-assets] loaded ${Object.keys(databaseAssetUrls).length} database asset url(s)`);
    }
  } catch {
    databaseAssetUrls = {};
  }
}

function image(path: string, localAsset: string): string {
  if (useDatabaseImages) {
    return databaseAssetUrls[path] ?? localAsset;
  }
  return useRemoteImages ? `${imageBaseUrl}/${path.replace(/^\/+/, "")}` : localAsset;
}

export const uiAssets = {
  backgrounds: {
    get tidepoolBoard() { return image("bg-tidepool-board.png", bgTidepoolBoard); },
    get homeTidepool() { return image("bg-home-tidepool.png", bgHomeTidepool); },
  },
  scene: {
    get poolCenterpiece() { return image("pool-centerpiece.png", poolCenterpiece); },
  },
  resources: {
    get organic() { return image("resource-organic.png", resourceOrganic); },
    get energy() { return image("resource-energy.png", resourceEnergy); },
    get minerals() { return image("resource-minerals.png", resourceMinerals); },
    get stability() { return image("resource-stability.png", resourceStability); },
    get mutation() { return image("resource-mutation.png", resourceMutation); },
    get biomass() { return image("resource-biomass.png", resourceBiomass); },
  },
  talents: {
    get typeCrystal() { return image("talents/talent-type-crystal.png", talentTypeCrystal); },
    get typeTide() { return image("talents/talent-type-tide.png", talentTypeTide); },
    get typeSpark() { return image("talents/talent-type-spark.png", talentTypeSpark); },
    get typeMembrane() { return image("talents/talent-type-membrane.png", talentTypeMembrane); },
    get typeMutation() { return image("talents/talent-type-mutation.png", talentTypeMutation); },
    get epicStardustCatalyst() { return image("talents/talent-epic-stardust-catalyst.png", talentEpicStardustCatalyst); },
    get epicBlackTideOath() { return image("talents/talent-epic-black-tide-oath.png", talentEpicBlackTideOath); },
    get epicProtocellHerald() { return image("talents/talent-epic-protocell-herald.png", talentEpicProtocellHerald); },
    get epicSymbiosisEmber() { return image("talents/talent-epic-symbiosis-ember.png", talentEpicSymbiosisEmber); },
    get epicGeneticReturn() { return image("talents/talent-epic-genetic-return.png", talentEpicGeneticReturn); },
  },
  pickups: {
    get crystal() { return image("pickup-crystal.png", pickupCrystal); },
    get spark() { return image("pickup-spark.png", pickupSpark); },
    get droplet() { return image("pickup-droplet.png", pickupDroplet); },
    get pulse() { return image("pickup-pulse.png", pickupPulse); },
  },
  cards: {
    get crystal() { return image("card-crystal.png", cardCrystal); },
    get energy() { return image("card-energy.png", cardEnergy); },
    get tide() { return image("card-tide.png", cardTide); },
  },
  emblems: {
    get discovery() { return image("emblem-discovery.png", emblemDiscovery); },
    get ecologyIntervention() { return image("emblem-ecology-intervention.png", emblemEcologyIntervention); },
    get ecologyResonance() { return image("emblem-ecology-resonance.png", emblemEcologyResonance); },
    get system() { return image("emblem-system.png", emblemSystem); },
    get reward() { return image("emblem-reward.png", emblemReward); },
  },
  species: {
    get producer() { return image("species/species-producer.png", speciesProducer); },
    get decomposer() { return image("species/species-decomposer.png", speciesDecomposer); },
    get symbiont() { return image("species/species-symbiont.png", speciesSymbiont); },
    get extremophile() { return image("species/species-extremophile.png", speciesExtremophile); },
    get filterer() { return image("species/species-filterer.png", speciesFilterer); },
    get catalyst() { return image("species/species-catalyst.png", speciesCatalyst); },
  },
  events: {
    get hotSpring() { return image("events/event-hot-spring.png", eventHotSpring); },
    get clearTide() { return image("events/event-clear-tide.png", eventClearTide); },
  },
  evolution: {
    get organicRichness() { return image("evolution/organic-richness.png", evolutionOrganicRichness); },
    get replicatingChain() { return image("evolution/replicating-chain.png", evolutionReplicatingChain); },
    get primitiveVesicle() { return image("evolution/primitive-vesicle.png", evolutionPrimitiveVesicle); },
    get metabolicLoop() { return image("evolution/metabolic-loop.png", evolutionMetabolicLoop); },
    get protoCell() { return image("evolution/proto-cell.png", evolutionProtoCell); },
    get photoPigment() { return image("evolution/photo-pigment.png", evolutionPhotoPigment); },
  },
} as const;

export type UIAssetKey = keyof typeof uiAssets;
