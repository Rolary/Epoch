import { GameModal } from "./GameModal.js";
import { useUIStore } from "../../stores/uiStore.js";
import { useGameStore } from "../../stores/gameStore.js";
import { selectTalentApi } from "../../api.js";

export function TalentAwakening() {
  const hideModal = useUIStore((s) => s.hideModal);
  const save = useGameStore((s) => s.save);
  const setSave = useGameStore((s) => s.setSave);
  const talents = save?.pendingTalentChoices ?? [];

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

  if (talents.length === 0) return null;

  return (
    <GameModal title="源质印记觉醒">
      <div className="awakening-content">
        <p className="awakening-hint">
          生态跃迁唤醒了新的长期倾向。选择一种源质印记永久融入这颗星球。
        </p>
        <div className="talent-cards compact">
          {talents.map((t) => (
            <button
              key={t.id}
              className="talent-card"
              onClick={() => handleSelect(t.id)}
            >
              <span className="talent-icon">{iconFor(t.icon)}</span>
              <span className="talent-name">{t.name}</span>
              <span className="talent-summary">{t.summary}</span>
              <span className="talent-desc">{t.description}</span>
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
