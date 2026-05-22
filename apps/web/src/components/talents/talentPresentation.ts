import type { Talent } from "@eco-era/shared";
import { uiAssets } from "../../assets/uiAssets.js";

export const TALENT_ASSETS: Record<Talent["icon"], string> = {
  crystal: uiAssets.cards.crystal,
  spark: uiAssets.cards.energy,
  tide: uiAssets.cards.tide,
  membrane: uiAssets.resources.stability,
  mutation: uiAssets.resources.mutation,
  type_crystal: uiAssets.talents.typeCrystal,
  type_tide: uiAssets.talents.typeTide,
  type_spark: uiAssets.talents.typeSpark,
  type_membrane: uiAssets.talents.typeMembrane,
  type_mutation: uiAssets.talents.typeMutation,
  epic_stardust_catalyst: uiAssets.talents.epicStardustCatalyst,
  epic_black_tide_oath: uiAssets.talents.epicBlackTideOath,
  epic_protocell_herald: uiAssets.talents.epicProtocellHerald,
  epic_symbiosis_ember: uiAssets.talents.epicSymbiosisEmber,
  epic_genetic_return: uiAssets.talents.epicGeneticReturn,
};

export const RARITY_LABELS: Record<Talent["rarity"], string> = {
  common: "普通",
  rare: "稀有",
  legendary: "传说",
  epic: "源初",
};

export function talentAssetFor(talent: Talent): string {
  return TALENT_ASSETS[talent.icon] ?? uiAssets.emblems.system;
}
