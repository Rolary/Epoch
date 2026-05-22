import bgTidepoolBoard from "./ui/bg-tidepool-board.png";
import bgHomeTidepool from "./ui/bg-home-tidepool.png";
import cardCrystal from "./ui/card-crystal.png";
import cardEnergy from "./ui/card-energy.png";
import cardTide from "./ui/card-tide.png";
import emblemDiscovery from "./ui/emblem-discovery.png";
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
import speciesCatalyst from "./ui/species/species-catalyst.png";
import speciesDecomposer from "./ui/species/species-decomposer.png";
import speciesExtremophile from "./ui/species/species-extremophile.png";
import speciesFilterer from "./ui/species/species-filterer.png";
import speciesProducer from "./ui/species/species-producer.png";
import speciesSymbiont from "./ui/species/species-symbiont.png";

const imageParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
const imageSource = imageParams?.get("imageSource") ?? import.meta.env.VITE_IMAGE_SOURCE ?? "local";
const imageBaseUrl = (imageParams?.get("imageBaseUrl") ?? import.meta.env.VITE_IMAGE_BASE_URL ?? "").replace(/\/+$/, "");
const useRemoteImages = imageSource === "remote" && imageBaseUrl.length > 0;

function image(path: string, localAsset: string): string {
  return useRemoteImages ? `${imageBaseUrl}/${path.replace(/^\/+/, "")}` : localAsset;
}

export const uiAssets = {
  backgrounds: {
    tidepoolBoard: image("bg-tidepool-board.png", bgTidepoolBoard),
    homeTidepool: image("bg-home-tidepool.png", bgHomeTidepool),
  },
  scene: {
    poolCenterpiece: image("pool-centerpiece.png", poolCenterpiece),
  },
  resources: {
    organic: image("resource-organic.png", resourceOrganic),
    energy: image("resource-energy.png", resourceEnergy),
    minerals: image("resource-minerals.png", resourceMinerals),
    stability: image("resource-stability.png", resourceStability),
    mutation: image("resource-mutation.png", resourceMutation),
    biomass: image("resource-biomass.png", resourceBiomass),
  },
  pickups: {
    crystal: image("pickup-crystal.png", pickupCrystal),
    spark: image("pickup-spark.png", pickupSpark),
    droplet: image("pickup-droplet.png", pickupDroplet),
    pulse: image("pickup-pulse.png", pickupPulse),
  },
  cards: {
    crystal: image("card-crystal.png", cardCrystal),
    energy: image("card-energy.png", cardEnergy),
    tide: image("card-tide.png", cardTide),
  },
  emblems: {
    discovery: image("emblem-discovery.png", emblemDiscovery),
    system: image("emblem-system.png", emblemSystem),
    reward: image("emblem-reward.png", emblemReward),
  },
  species: {
    producer: image("species/species-producer.png", speciesProducer),
    decomposer: image("species/species-decomposer.png", speciesDecomposer),
    symbiont: image("species/species-symbiont.png", speciesSymbiont),
    extremophile: image("species/species-extremophile.png", speciesExtremophile),
    filterer: image("species/species-filterer.png", speciesFilterer),
    catalyst: image("species/species-catalyst.png", speciesCatalyst),
  },
  events: {
    hotSpring: image("events/event-hot-spring.png", eventHotSpring),
    clearTide: image("events/event-clear-tide.png", eventClearTide),
  },
  evolution: {
    organicRichness: image("evolution/organic-richness.png", evolutionOrganicRichness),
    replicatingChain: image("evolution/replicating-chain.png", evolutionReplicatingChain),
    primitiveVesicle: image("evolution/primitive-vesicle.png", evolutionPrimitiveVesicle),
    metabolicLoop: image("evolution/metabolic-loop.png", evolutionMetabolicLoop),
    protoCell: image("evolution/proto-cell.png", evolutionProtoCell),
    photoPigment: image("evolution/photo-pigment.png", evolutionPhotoPigment),
  },
} as const;

export type UIAssetKey = keyof typeof uiAssets;
