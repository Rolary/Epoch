import { evolutionNodes } from "@eco-era/game-core";
import type { ResourceKey } from "@eco-era/shared";
import { uiAssets } from "../../assets/uiAssets.js";
import { useGameStore } from "../../stores/gameStore.js";

const RES_LABELS: Record<string, { asset: string; label: string }> = {
  organic: { asset: uiAssets.resources.organic, label: "有机质" },
  energy: { asset: uiAssets.resources.energy, label: "能量" },
  minerals: { asset: uiAssets.resources.minerals, label: "矿物质" },
  stability: { asset: uiAssets.resources.stability, label: "稳定性" },
  mutation: { asset: uiAssets.resources.mutation, label: "突变点" },
  biomass: { asset: uiAssets.resources.biomass, label: "生物量" },
};

export function CurrentObjective() {
  const save = useGameStore((s) => s.save);
  if (!save) return null;

  const unlocked = save.unlockedNodes;
  const nextNode = evolutionNodes.find(
    (n) => !unlocked.includes(n.id) && n.requires.every((r) => unlocked.includes(r)),
  );

  let title = "富集有机质";
  let description = "潮池需要足够的分子材料，才可能留下第一批结构痕迹。";
  let progress = 0;
  let target = 20;
  let costEntries: Array<[string, number]> = [];

  if (unlocked.length === 0) {
    progress = Math.min(save.resources.organic, target);
    costEntries = [["organic", 20]];
  } else if (nextNode) {
    title = `点亮「${nextNode.name}」`;
    description = nextNode.description;
    costEntries = Object.entries(nextNode.cost) as Array<[string, number]>;
    const totalRequired = costEntries.reduce((sum, [, v]) => sum + v, 0);
    const totalHave = costEntries.reduce((sum, [k, v]) => sum + Math.min(save.resources[k as ResourceKey] ?? 0, v), 0);
    progress = totalHave;
    target = totalRequired;
  } else {
    title = "追逐光照";
    description = "生命开始利用光能，下一场生态爆发即将到来。";
    progress = save.resources.energy;
    target = 500;
  }

  const percent = Math.min(100, Math.round((progress / Math.max(1, target)) * 100));

  return (
    <div className="objective-bar">
      <div className="objective-header">
        <span className="objective-title">{title}</span>
        <span className="objective-percent">{percent}%</span>
      </div>
      <div className="objective-desc">{description}</div>
      <div className="objective-track">
        <div className="objective-fill" style={{ width: `${percent}%` }} />
      </div>
      {costEntries.length > 0 && (
        <div className="resource-capsules">
          {costEntries.map(([key, needed]) => {
            const res = RES_LABELS[key] ?? { asset: uiAssets.emblems.system, label: key };
            const current = Math.floor(save.resources[key as ResourceKey] ?? 0);
            const met = current >= needed;
            const fillPercent = Math.min(100, Math.round((current / Math.max(1, needed)) * 100));
            return (
              <div key={key} className={`capsule ${met ? "met" : ""}`} data-tooltip={res.label}>
                <div className="capsule-fill" style={{ width: `${fillPercent}%` }} />
                <span className="capsule-content">
                  <img className="capsule-icon" src={res.asset} alt="" aria-hidden="true" />
                  <span className="capsule-nums">{current}/{needed}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
