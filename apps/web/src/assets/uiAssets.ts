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

export const uiAssets = {
  backgrounds: {
    tidepoolBoard: bgTidepoolBoard,
    homeTidepool: bgHomeTidepool,
  },
  scene: {
    poolCenterpiece,
  },
  resources: {
    organic: resourceOrganic,
    energy: resourceEnergy,
    minerals: resourceMinerals,
    stability: resourceStability,
    mutation: resourceMutation,
    biomass: resourceBiomass,
  },
  pickups: {
    crystal: pickupCrystal,
    spark: pickupSpark,
    droplet: pickupDroplet,
    pulse: pickupPulse,
  },
  cards: {
    crystal: cardCrystal,
    energy: cardEnergy,
    tide: cardTide,
  },
  emblems: {
    discovery: emblemDiscovery,
    system: emblemSystem,
    reward: emblemReward,
  },
  species: {
    producer: speciesProducer,
    decomposer: speciesDecomposer,
    symbiont: speciesSymbiont,
    extremophile: speciesExtremophile,
    filterer: speciesFilterer,
    catalyst: speciesCatalyst,
  },
  events: {
    hotSpring: eventHotSpring,
    clearTide: eventClearTide,
  },
  evolution: {
    organicRichness: evolutionOrganicRichness,
    replicatingChain: evolutionReplicatingChain,
    primitiveVesicle: evolutionPrimitiveVesicle,
    metabolicLoop: evolutionMetabolicLoop,
    protoCell: evolutionProtoCell,
    photoPigment: evolutionPhotoPigment,
  },
} as const;

export type UIAssetKey = keyof typeof uiAssets;
