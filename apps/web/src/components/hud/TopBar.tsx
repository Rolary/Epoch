import { uiAssets } from "../../assets/uiAssets.js";
import { useGameStore } from "../../stores/gameStore.js";

const RESOURCE_CONFIG = [
  { key: "organic" as const, asset: uiAssets.resources.organic, label: "有机质", color: "#66BB6A" },
  { key: "energy" as const, asset: uiAssets.resources.energy, label: "能量", color: "#FFD54F" },
  { key: "minerals" as const, asset: uiAssets.resources.minerals, label: "矿物质", color: "#4FC3F7" },
  { key: "stability" as const, asset: uiAssets.resources.stability, label: "稳定性", color: "#BA68C8" },
  { key: "mutation" as const, asset: uiAssets.resources.mutation, label: "突变点", color: "#C084FC" },
  { key: "biomass" as const, asset: uiAssets.resources.biomass, label: "生物量", color: "#A3E635" },
];

export function TopBar() {
  const save = useGameStore((s) => s.save);
  const resources = save?.resources ?? { organic: 0, energy: 0, minerals: 0, stability: 40, mutation: 0, biomass: 0 };
  const unlocked = save?.unlockedNodes ?? [];
  const visibleKeys = new Set(["organic", "energy"]);

  if (unlocked.includes("organic_richness")) {
    visibleKeys.add("minerals");
    visibleKeys.add("stability");
  }

  if (unlocked.includes("replicating_chain")) {
    visibleKeys.add("mutation");
    visibleKeys.add("biomass");
  }

  return (
    <div className="top-bar">
      <div className="resource-row">
        {RESOURCE_CONFIG.filter(({ key }) => visibleKeys.has(key)).map(({ key, asset, label, color }) => (
            <div key={key} className="resource-item" data-tooltip={label}>
              <img className="resource-icon" src={asset} alt="" aria-hidden="true" />
              <span className="resource-value" style={{ color }}>
                {Math.floor(resources[key])}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
