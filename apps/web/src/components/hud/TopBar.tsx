import { useEffect, useState } from "react";
import { formatChineseNumber } from "@eco-era/shared";
import { uiAssets } from "../../assets/uiAssets.js";
import { useGameStore } from "../../stores/gameStore.js";
import { PoolEffectStatus } from "./PoolEffectStatus.js";

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
  const [expandedResource, setExpandedResource] = useState<string | null>(null);
  const resources = save?.resources ?? { organic: 0, energy: 0, minerals: 0, stability: 40, mutation: 0, biomass: 0 };
  const unlocked = save?.unlockedNodes ?? [];
  const visibleKeys = new Set(["organic", "energy"]);

  useEffect(() => {
    if (!expandedResource) return;
    const timer = window.setTimeout(() => setExpandedResource(null), 2200);
    return () => window.clearTimeout(timer);
  }, [expandedResource]);

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
      <div className="status-rail" aria-label="潮池状态栏">
        <div className="resource-row">
          {RESOURCE_CONFIG.filter(({ key }) => visibleKeys.has(key)).map(({ key, asset, label, color }) => {
            const expanded = expandedResource === key;
            return (
              <button
                key={key}
                type="button"
                className={`resource-item ${expanded ? "expanded" : ""}`}
                aria-label={`${label} ${formatChineseNumber(resources[key])}`}
                aria-pressed={expanded}
                onClick={() => setExpandedResource((current) => current === key ? null : key)}
              >
                <img className="resource-icon" src={asset} alt="" aria-hidden="true" />
                <span className="resource-label" aria-hidden={!expanded}>{label}</span>
                <span className="resource-value" style={{ color }}>
                  {formatChineseNumber(resources[key])}
                </span>
              </button>
            );
          })}
        </div>
        <PoolEffectStatus />
      </div>
    </div>
  );
}
