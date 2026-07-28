import type { EcologicalRole, GameState } from "@eco-era/shared";

const EARLY_ECOLOGY_ROLES: EcologicalRole[] = ["producer", "decomposer", "filterer"];

export function countEarlyRoles(save: GameState): number {
  const roles = new Set(save.chapterWitness?.ecologyBurst.rolesWitnessed ?? []);
  for (const species of save.species) {
    if (species.status === "living" || species.status === "flourishing") {
      roles.add(species.ecologicalRole);
    }
  }
  if (save.unlockedNodes.includes("early_producer_film")) roles.add("producer");
  if (save.unlockedNodes.includes("decomposition_layer")) roles.add("decomposer");
  if (save.unlockedNodes.includes("tidal_filter_pores")) roles.add("filterer");
  return EARLY_ECOLOGY_ROLES.filter((role) => roles.has(role)).length;
}
