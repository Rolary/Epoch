import { useEffect, useState } from "react";
import { useGameStore } from "../../stores/gameStore.js";

export function PoolEffectStatus() {
  const effect = useGameStore((state) => state.save?.activePoolEffect);
  const [, setClock] = useState(0);

  useEffect(() => {
    if (!effect) return;
    const timer = window.setInterval(() => setClock((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [effect?.id, effect?.expiresAt]);

  if (!effect) return null;
  const remainingMs = new Date(effect.expiresAt).getTime() - Date.now();
  if (remainingMs <= 0) return null;

  return (
    <div
      className={`pool-effect-status ${effect.tone}`}
      role="status"
      aria-label={`${effect.title}，${effect.effectLabel}，剩余${formatRemaining(remainingMs)}`}
    >
      <span className="pool-effect-mark" aria-hidden="true" />
      <span className="pool-effect-copy">
        <strong>{effect.title}</strong>
        <span>{effect.effectLabel}</span>
      </span>
      <time dateTime={effect.expiresAt}>{formatRemaining(remainingMs)}</time>
    </div>
  );
}

function formatRemaining(milliseconds: number) {
  const minutes = Math.max(1, Math.ceil(milliseconds / 60000));
  return minutes >= 60 ? `${Math.floor(minutes / 60)}时${minutes % 60}分` : `${minutes}分钟`;
}
