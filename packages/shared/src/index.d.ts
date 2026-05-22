export type ResourceKey = "organic" | "energy" | "minerals" | "stability" | "mutation" | "biomass";
export type EraId = "primordial_pool" | "self_replicators" | "proto_cell" | "photosynthesis_eve";
export type SpeciesStatus = "living" | "flourishing" | "endangered" | "extinct" | "fossilized";
export type EcologicalRole = "producer" | "decomposer" | "symbiont" | "extremophile" | "filterer" | "catalyst";
export type PlanetProfile = "balanced" | "high_mutation" | "stable_pool" | "cataclysmic" | "symbiotic" | "extreme";
export type TalentTier = 1 | 2 | 3;
export type TalentRarity = "common" | "rare" | "legendary" | "epic";
export interface Talent {
    id: string;
    name: string;
    tier: TalentTier;
    rarity: TalentRarity;
    weight: number;
    consumable?: boolean;
    instantEffect?: Partial<Record<ResourceKey, number>>;
    trait?: {
        id: string;
        name: string;
        desc: string;
    };
    icon: "crystal" | "spark" | "tide" | "membrane" | "mutation" | "type_crystal" | "type_tide" | "type_spark" | "type_membrane" | "type_mutation" | "epic_stardust_catalyst" | "epic_black_tide_oath" | "epic_protocell_herald" | "epic_symbiosis_ember" | "epic_genetic_return";
    summary: string;
    description: string;
    effects: Partial<Record<ResourceKey, number>>;
}
export interface Resources {
    organic: number;
    energy: number;
    minerals: number;
    stability: number;
    mutation: number;
    biomass: number;
}
export interface EnvironmentState {
    light: number;
    tide: number;
    heat: number;
    mineralFlow: number;
    volatility: number;
}
export interface EvolutionNode {
    id: string;
    name: string;
    description: string;
    cost: Partial<Resources>;
    requires: string[];
    unlocksEra?: EraId;
    branchGroupId?: string;
    branchHint?: string;
}
export interface EcologyEventOption {
    id: string;
    title: string;
    description: string;
    resourceEffect?: Partial<Resources>;
    environmentEffect?: Partial<EnvironmentState>;
    addHistoryTags?: string[];
    logMessage: string;
}
export interface EcologyEvent {
    id: string;
    title: string;
    description: string;
    tendencyTag: string;
    options: EcologyEventOption[];
}
export interface SpeciesRecord {
    id: string;
    parentSpeciesId?: string;
    name: string;
    era: EraId;
    niche: string;
    status: SpeciesStatus;
    ecologicalRole: EcologicalRole;
    traits: string[];
    vulnerabilities: string[];
    historyTags?: string[];
    numericEffects: Partial<Resources>;
    shortDescription: string;
    visualPrompt: string;
    lineageSummary: string;
    legacyHint?: string;
    discoveredAt: string;
}
export interface FossilLegacy {
    id: string;
    sourceSpeciesId: string;
    name: string;
    type: "fossil" | "ancestor" | "empty_niche" | "warning" | "archive";
    description: string;
    effect: string;
    numericEffects: Partial<Resources>;
    tradeoffEffects?: Partial<Resources>;
    tags?: string[];
    createdAt: string;
}
export interface EvolutionLog {
    id: string;
    type: "system" | "event" | "species" | "legacy" | "era";
    message: string;
    createdAt: string;
}
export interface GameState {
    id: string;
    name: string;
    currentEra: EraId;
    resources: Resources;
    environment: EnvironmentState;
    unlockedNodes: string[];
    species: SpeciesRecord[];
    legacies: FossilLegacy[];
    logs: EvolutionLog[];
    talents: Talent[];
    pendingTalentChoices: Talent[];
    consumedTalents: string[];
    pendingEcologyEvent?: EcologyEvent | null;
    historyTags: string[];
    eventHistory: string[];
    planetProfile: PlanetProfile;
    lastCalculatedAt: string;
    createdAt: string;
    updatedAt: string;
}
export interface GuestAuthResponse {
    guestKey: string;
}
export declare const uiAssetPaths: readonly ["bg-tidepool-board.png", "bg-home-tidepool.png", "card-crystal.png", "card-energy.png", "card-tide.png", "emblem-discovery.png", "emblem-reward.png", "emblem-system.png", "events/event-clear-tide.png", "events/event-hot-spring.png", "evolution/metabolic-loop.png", "evolution/organic-richness.png", "evolution/photo-pigment.png", "evolution/primitive-vesicle.png", "evolution/proto-cell.png", "evolution/replicating-chain.png", "pickup-crystal.png", "pickup-droplet.png", "pickup-pulse.png", "pickup-spark.png", "pool-centerpiece.png", "resource-biomass.png", "resource-energy.png", "resource-minerals.png", "resource-mutation.png", "resource-organic.png", "resource-stability.png", "talents/talent-epic-black-tide-oath.png", "talents/talent-epic-genetic-return.png", "talents/talent-epic-protocell-herald.png", "talents/talent-epic-stardust-catalyst.png", "talents/talent-epic-symbiosis-ember.png", "talents/talent-type-crystal.png", "talents/talent-type-membrane.png", "talents/talent-type-mutation.png", "talents/talent-type-spark.png", "talents/talent-type-tide.png", "species/species-catalyst.png", "species/species-decomposer.png", "species/species-extremophile.png", "species/species-filterer.png", "species/species-producer.png", "species/species-symbiont.png"];
export type UiAssetPath = (typeof uiAssetPaths)[number];
export interface UiAssetUrl {
    path: UiAssetPath | string;
    remoteUrl: string;
    updatedAt: string;
}
//# sourceMappingURL=index.d.ts.map