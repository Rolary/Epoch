import { useEffect, useState } from "react";
import { uiAssets } from "../../assets/uiAssets.js";
import { useGameStore } from "../../stores/gameStore.js";

export function PoolEffectStatus() {
  const effect = useGameStore((state) => state.save?.activePoolEffect);
  const [expanded, setExpanded] = useState(false);
  const [, setClock] = useState(0);

  useEffect(() => {
    if (!effect) return;
    const timer = window.setInterval(() => setClock((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [effect?.id, effect?.expiresAt]);

  if (!effect) return null;
  const remainingMs = new Date(effect.expiresAt).getTime() - Date.now();
  if (remainingMs <= 0) return null;
  const hasBuff = Object.values(effect.resourceMultipliers).some((value) => value !== undefined && value > 1);
  const hasDebuff = Object.values(effect.resourceMultipliers).some((value) => value !== undefined && value < 1);
  const icon = effect.id === "clear_tide_afterglow"
    ? uiAssets.events.clearTide
    : effect.id === "mineral_warm_current"
      ? uiAssets.events.hotSpring
      : effect.tone === "debuff"
        ? uiAssets.resources.mutation
        : uiAssets.emblems.ecologyResonance;

  return (
    <button
      type="button"
      className={`pool-effect-status ${effect.tone} ${expanded ? "expanded" : ""}`}
      aria-label={`${effect.title}，${effect.effectLabel}，剩余${formatRemaining(remainingMs)}`}
      aria-pressed={expanded}
      onClick={() => setExpanded((value) => !value)}
    >
      <span className="pool-effect-icon-wrap" aria-hidden="true">
        <img className="pool-effect-icon" src={icon} alt="" />
        <span className="pool-effect-arrows">
          {hasBuff && <span className="pool-effect-arrow up">↑</span>}
          {hasDebuff && <span className="pool-effect-arrow down">↓</span>}
        </span>
      </span>
      <span className="pool-effect-copy" aria-hidden={!expanded}>
        <strong>{effect.title}</strong>
        <span>{effect.effectLabel}</span>
      </span>
      <time dateTime={effect.expiresAt}>{formatRemaining(remainingMs)}</time>
    </button>
  );
}

function formatRemaining(milliseconds: number) {
  const minutes = Math.max(1, Math.ceil(milliseconds / 60000));
  return minutes >= 60 ? `${Math.floor(minutes / 60)}时${minutes % 60}分` : `${minutes}分钟`;
}
