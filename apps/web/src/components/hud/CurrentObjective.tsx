import { useGameStore } from "../../stores/gameStore.js";
import { evolutionNodes } from "@eco-era/game-core";

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

  if (unlocked.length === 0) {
    title = "富集有机质";
    description = "潮池需要足够的分子材料，才可能留下第一批结构痕迹。";
    progress = Math.min(save.resources.organic, target);
    target = 20;
  } else if (nextNode) {
    title = `点亮「${nextNode.name}」`;
    description = nextNode.description;
    const cost = nextNode.cost;
    const keys = Object.keys(cost) as Array<keyof typeof cost>;
    const totalRequired = keys.reduce((sum, k) => sum + (cost[k] ?? 0), 0);
    const totalHave = keys.reduce((sum, k) => sum + Math.min(save.resources[k], cost[k] ?? 0), 0);
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
    </div>
  );
}
