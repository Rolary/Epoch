export type ResourceKey = "organic" | "energy" | "minerals" | "stability" | "mutation" | "biomass";

export type EraId = "primordial_pool" | "self_replicators" | "proto_cell" | "photosynthesis_eve";

export type SpeciesStatus = "living" | "flourishing" | "endangered" | "extinct" | "fossilized";

export type EcologicalRole =
  | "producer"
  | "decomposer"
  | "symbiont"
  | "extremophile"
  | "filterer"
  | "catalyst";

export type PlanetProfile =
  | "balanced"
  | "high_mutation"
  | "stable_pool"
  | "cataclysmic"
  | "symbiotic"
  | "extreme";

export type TalentTier = 1 | 2 | 3;

export interface Talent {
  id: string;
  name: string;
  tier: TalentTier;
  icon: "crystal" | "spark" | "tide" | "membrane" | "mutation";
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
  planetProfile: PlanetProfile;
  lastCalculatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface GuestAuthResponse {
  guestKey: string;
}
