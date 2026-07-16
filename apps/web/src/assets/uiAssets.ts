const bgTidepoolBoard = new URL("./ui/bg-tidepool-board.png", import.meta.url).href;
const bgHomeTidepool = new URL("./ui/bg-home-tidepool.png", import.meta.url).href;
const cardCrystal = new URL("./ui/card-crystal.png", import.meta.url).href;
const cardEnergy = new URL("./ui/card-energy.png", import.meta.url).href;
const cardTide = new URL("./ui/card-tide.png", import.meta.url).href;
const emblemDiscovery = new URL("./ui/emblem-discovery.png", import.meta.url).href;
const emblemEcologyIntervention = new URL("./ui/emblem-ecology-intervention.png", import.meta.url).href;
const emblemEcologyResonance = new URL("./ui/emblem-ecology-resonance.png", import.meta.url).href;
const emblemReward = new URL("./ui/emblem-reward.png", import.meta.url).href;
const emblemSystem = new URL("./ui/emblem-system.png", import.meta.url).href;
const eventClearTide = new URL("./ui/events/event-clear-tide.png", import.meta.url).href;
const eventHotSpring = new URL("./ui/events/event-hot-spring.png", import.meta.url).href;
const hiddenTraceEmblem = new URL("./ui/hidden-traces/hidden-trace-emblem.png", import.meta.url).href;
const hiddenTraceNeonFault = new URL("./ui/hidden-traces/neon-fault.png", import.meta.url).href;
const hiddenTracePixelGlint = new URL("./ui/hidden-traces/pixel-glint.png", import.meta.url).href;
const hiddenTraceQuietRipple = new URL("./ui/hidden-traces/quiet-ripple.png", import.meta.url).href;
const hiddenTraceTripleCurrent = new URL("./ui/hidden-traces/triple-current.png", import.meta.url).href;
const evolutionMetabolicLoop = new URL("./ui/evolution/metabolic-loop.png", import.meta.url).href;
const evolutionOrganicRichness = new URL("./ui/evolution/organic-richness.png", import.meta.url).href;
const evolutionPhotoPigment = new URL("./ui/evolution/photo-pigment.png", import.meta.url).href;
const evolutionPrimitiveVesicle = new URL("./ui/evolution/primitive-vesicle.png", import.meta.url).href;
const evolutionProtoCell = new URL("./ui/evolution/proto-cell.png", import.meta.url).href;
const evolutionReplicatingChain = new URL("./ui/evolution/replicating-chain.png", import.meta.url).href;
const pickupCrystal = new URL("./ui/pickup-crystal.png", import.meta.url).href;
const pickupDroplet = new URL("./ui/pickup-droplet.png", import.meta.url).href;
const pickupPulse = new URL("./ui/pickup-pulse.png", import.meta.url).href;
const pickupSpark = new URL("./ui/pickup-spark.png", import.meta.url).href;
const poolCenterpiece = new URL("./ui/pool-centerpiece.png", import.meta.url).href;
const resourceBiomass = new URL("./ui/resource-biomass.png", import.meta.url).href;
const resourceEnergy = new URL("./ui/resource-energy.png", import.meta.url).href;
const resourceMinerals = new URL("./ui/resource-minerals.png", import.meta.url).href;
const resourceMutation = new URL("./ui/resource-mutation.png", import.meta.url).href;
const resourceOrganic = new URL("./ui/resource-organic.png", import.meta.url).href;
const resourceStability = new URL("./ui/resource-stability.png", import.meta.url).href;
const talentEpicBlackTideOath = new URL("./ui/talents/talent-epic-black-tide-oath.png", import.meta.url).href;
const talentEpicGeneticReturn = new URL("./ui/talents/talent-epic-genetic-return.png", import.meta.url).href;
const talentEpicProtocellHerald = new URL("./ui/talents/talent-epic-protocell-herald.png", import.meta.url).href;
const talentEpicStardustCatalyst = new URL("./ui/talents/talent-epic-stardust-catalyst.png", import.meta.url).href;
const talentEpicSymbiosisEmber = new URL("./ui/talents/talent-epic-symbiosis-ember.png", import.meta.url).href;
const talentTypeCrystal = new URL("./ui/talents/talent-type-crystal.png", import.meta.url).href;
const talentTypeMembrane = new URL("./ui/talents/talent-type-membrane.png", import.meta.url).href;
const talentTypeMutation = new URL("./ui/talents/talent-type-mutation.png", import.meta.url).href;
const talentTypeSpark = new URL("./ui/talents/talent-type-spark.png", import.meta.url).href;
const talentTypeTide = new URL("./ui/talents/talent-type-tide.png", import.meta.url).href;
const speciesCatalyst = new URL("./ui/species/species-catalyst.png", import.meta.url).href;
const speciesDecomposer = new URL("./ui/species/species-decomposer.png", import.meta.url).href;
const speciesExtremophile = new URL("./ui/species/species-extremophile.png", import.meta.url).href;
const speciesFilterer = new URL("./ui/species/species-filterer.png", import.meta.url).href;
const speciesProducer = new URL("./ui/species/species-producer.png", import.meta.url).href;
const speciesSymbiont = new URL("./ui/species/species-symbiont.png", import.meta.url).href;

const imageParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
const imageSource = imageParams?.get("imageSource") ?? import.meta.env.VITE_IMAGE_SOURCE ?? "db";
const imageBaseUrl = (imageParams?.get("imageBaseUrl") ?? import.meta.env.VITE_IMAGE_BASE_URL ?? "").replace(/\/+$/, "");
const useRemoteImages = imageSource === "remote" && imageBaseUrl.length > 0;
const useDatabaseImages = imageSource !== "local" && !useRemoteImages;
let databaseAssetUrls: Record<string, string> = {};
const UI_ASSET_CACHE_KEY = "eco-era:ui-asset-urls";
const UI_ASSET_FETCH_TIMEOUT_MS = 1200;

export async function loadUiAssetUrlMap(): Promise<void> {
  if (!useDatabaseImages || typeof window === "undefined") return;

  try {
    const cached = sessionStorage.getItem(UI_ASSET_CACHE_KEY);
    if (cached) {
      databaseAssetUrls = JSON.parse(cached) as Record<string, string>;
      return;
    }
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), UI_ASSET_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch("/api/meta/ui-assets", { signal: controller.signal });
    if (!response.ok) return;
    const data = (await response.json()) as { assets?: Array<{ path?: string; remoteUrl?: string }> };
    databaseAssetUrls = Object.fromEntries(
      (data.assets ?? [])
        .map((asset) => [asset.path?.trim() ?? "", asset.remoteUrl?.trim() ?? ""] as const)
        .filter(([path, remoteUrl]) => path.length > 0 && remoteUrl.length > 0),
    );
    try {
      sessionStorage.setItem(UI_ASSET_CACHE_KEY, JSON.stringify(databaseAssetUrls));
    } catch {
      // A failed cache write should never block the local asset fallback.
    }
    if (import.meta.env.DEV) {
      console.info(`[ui-assets] loaded ${Object.keys(databaseAssetUrls).length} database asset url(s)`);
    }
  } catch {
    databaseAssetUrls = {};
  } finally {
    window.clearTimeout(timeout);
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
  hiddenTraces: {
    get emblem() { return image("hidden-traces/hidden-trace-emblem.png", hiddenTraceEmblem); },
    get neonFault() { return image("hidden-traces/neon-fault.png", hiddenTraceNeonFault); },
    get pixelGlint() { return image("hidden-traces/pixel-glint.png", hiddenTracePixelGlint); },
    get quietRipple() { return image("hidden-traces/quiet-ripple.png", hiddenTraceQuietRipple); },
    get tripleCurrent() { return image("hidden-traces/triple-current.png", hiddenTraceTripleCurrent); },
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

// Phaser/WebGL textures must remain same-origin. Database asset URLs may be
// valid for DOM images while still lacking the CORS headers WebGL requires.
export const phaserAssets = {
  backgrounds: {
    homeTidepool: bgHomeTidepool,
  },
  scene: {
    poolCenterpiece,
  },
  pickups: {
    crystal: pickupCrystal,
    spark: pickupSpark,
    droplet: pickupDroplet,
    pulse: pickupPulse,
  },
  hiddenTraces: {
    emblem: hiddenTraceEmblem,
    neonFault: hiddenTraceNeonFault,
    pixelGlint: hiddenTracePixelGlint,
    quietRipple: hiddenTraceQuietRipple,
    tripleCurrent: hiddenTraceTripleCurrent,
  },
} as const;

export type UIAssetKey = keyof typeof uiAssets;
