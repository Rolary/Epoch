import { useState, useEffect, useCallback } from "react";
import { BottomSheet } from "./BottomSheet.js";
import { useUIStore } from "../../stores/uiStore.js";
import { useGameStore } from "../../stores/gameStore.js";
import { applyAction } from "../../api.js";

const ACTIONS = [
  { id: "light", icon: "☀️", name: "增强光照", gain: "提高能量产出和光反应概率", cost: "长期增加挥发性和氧化压力" },
  { id: "minerals", icon: "💎", name: "矿物沉积", gain: "增加矿物质和结构稳定", cost: "可能压制薄膜结构发育" },
  { id: "tide", icon: "🌊", name: "潮汐扰动", gain: "提高有机质和突变倾向", cost: "降低短期稳定性" },
  { id: "heat", icon: "🔥", name: "提高温度", gain: "加快反应速度和突变", cost: "增加失衡和灭绝风险" },
];

const COOLDOWN_SECONDS = 30;

export function StrategySheet() {
  const hideSheet = useUIStore((s) => s.hideSheet);
  const save = useGameStore((s) => s.save);
  const setSave = useGameStore((s) => s.setSave);
  const showModal = useUIStore((s) => s.showModal);
  const cooldownUntil = useUIStore((s) => s.strategyCooldownUntil);
  const setStrategyCooldown = useUIStore((s) => s.setStrategyCooldown);

  const calcRemaining = useCallback(() => {
    const ms = cooldownUntil - Date.now();
    return ms > 0 ? Math.ceil(ms / 1000) : 0;
  }, [cooldownUntil]);

  const [remaining, setRemaining] = useState(calcRemaining);

  useEffect(() => {
    const remain = calcRemaining();
    setRemaining(remain);
    if (remain <= 0) return;
    const timer = setInterval(() => {
      const r = calcRemaining();
      setRemaining(r);
      if (r <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownUntil, calcRemaining]);

  const onCooldown = remaining > 0;

  const handleAction = async (action: string) => {
    if (!save || onCooldown) return;
    try {
      const updated = await applyAction(save.id, action);
      setSave(updated);
      setStrategyCooldown(COOLDOWN_SECONDS);
      hideSheet();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "资源不足";
      showModal("system-unlock", { name: msg, icon: "⚠️" });
    }
  };

  return (
    <BottomSheet>
      <div className="strategy-sheet">
        <h3 className="sheet-title">生态干预</h3>
        <p className="sheet-hint">
          干预会带来短期收益，也会留下长期压力。
          {onCooldown && <span className="cooldown-timer">冷却中 {remaining}s</span>}
        </p>
        <div className="strategy-grid">
          {ACTIONS.map((a) => (
            <button
              key={a.id}
              className={`strategy-card ${onCooldown ? "cooldown" : ""}`}
              disabled={onCooldown}
              onClick={() => handleAction(a.id)}
            >
              <span className="strategy-icon">{a.icon}</span>
              <span className="strategy-name">{a.name}</span>
              <span className="strategy-gain">↑ {a.gain}</span>
              <span className="strategy-cost">↓ {a.cost}</span>
            </button>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
}
