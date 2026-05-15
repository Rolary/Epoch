import bgTidepoolBoard from "./ui/bg-tidepool-board.png";
import bgHomeTidepool from "./ui/bg-home-tidepool.png";
import cardCrystal from "./ui/card-crystal.png";
import cardEnergy from "./ui/card-energy.png";
import cardTide from "./ui/card-tide.png";
import emblemDiscovery from "./ui/emblem-discovery.png";
import emblemReward from "./ui/emblem-reward.png";
import emblemSystem from "./ui/emblem-system.png";
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
} as const;

export type UIAssetKey = keyof typeof uiAssets;
