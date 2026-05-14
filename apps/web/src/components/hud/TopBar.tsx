import { useGameStore } from "../../stores/gameStore.js";

const RESOURCE_CONFIG = [
  { key: "energy" as const, icon: "⚡", label: "能量", color: "#FFD54F" },
  { key: "organic" as const, icon: "🧪", label: "有机质", color: "#66BB6A" },
  { key: "minerals" as const, icon: "💎", label: "矿物质", color: "#4FC3F7" },
  { key: "stability" as const, icon: "🛡️", label: "稳定性", color: "#BA68C8" },
];

export function TopBar() {
  const resources = useGameStore().resources();
  return (
    <div className="top-bar">
      <div className="resource-row">
        {RESOURCE_CONFIG.map(({ key, icon, label, color }) => (
          <div key={key} className="resource-item" data-tooltip={label}>
            <span className="resource-icon">{icon}</span>
            <span className="resource-value" style={{ color }}>{Math.floor(resources[key])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
