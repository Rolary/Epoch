import { GameModal } from "./GameModal.js";
import { useUIStore } from "../../stores/uiStore.js";
import { useGameStore } from "../../stores/gameStore.js";
import { selectTalentApi, getTalentChoices } from "../../api.js";
import { useState } from "react";

export function TalentAwakening() {
  const hideModal = useUIStore((s) => s.hideModal);
  const save = useGameStore((s) => s.save);
  const setSave = useGameStore((s) => s.setSave);
  const [talents, setTalents] = useState(save?.pendingTalentChoices ?? []);
  const [rollCount, setRollCount] = useState(0);
  const MAX_ROLLS = 3;

  const handleSelect = async (talentId: string) => {
    if (!save) return;
    try {
      const updated = await selectTalentApi(save.id, talentId);
      setSave(updated);
      hideModal();
    } catch {
      // ignore
    }
  };

  const handleReroll = async () => {
    if (rollCount >= MAX_ROLLS) return;
    try {
      const choices = await getTalentChoices();
      setTalents(choices);
      setRollCount((c) => c + 1);
    } catch {
      // silent
    }
  };

  if (talents.length === 0) return null;

  return (
    <GameModal title="源质印记觉醒">
      <div className="awakening-content">
        <p className="awakening-hint">
          生态跃迁唤醒了新的长期倾向。选择一种源质印记永久融入这颗星球。
        </p>
        <div className="reroll-bar">
          <span className="reroll-hint">
            刷新次数 {rollCount}/{MAX_ROLLS}
          </span>
          {rollCount < MAX_ROLLS && (
            <button className="btn-ghost" onClick={handleReroll}>
              ↻ 刷新印记
            </button>
          )}
        </div>
        <div className="talent-cards compact">
          {talents.map((t) => (
            <button
              key={t.id}
              className={`talent-card rarity-${t.rarity}`}
              onClick={() => handleSelect(t.id)}
            >
              <span className="talent-icon">{iconFor(t.icon)}</span>
              <span className="talent-name">{t.name}</span>
              {t.consumable && <span className="talent-tag consumable" data-tooltip="选中后资源立即到账，不入永久天赋">⚡ 潮涌</span>}
              <span className="talent-summary">{t.summary}</span>
              <span className="talent-desc">{t.description}</span>
              {t.trait && (
                <span className="talent-trait">✦ {t.trait.name}：{t.trait.desc}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </GameModal>
  );
}

function iconFor(icon: string): string {
  const m: Record<string, string> = { crystal: "💎", spark: "⚡", tide: "🌊", membrane: "🫧", mutation: "🧬" };
  return m[icon] ?? "✦";
}
