import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { getTalentChoices, selectTalentApi } from "../../api.js";
import { useGameStore } from "../../stores/gameStore.js";
import { useUIStore } from "../../stores/uiStore.js";
import { talentAssetFor } from "../talents/talentPresentation.js";
import { GameModal } from "./GameModal.js";

export function TalentAwakening() {
  const save = useGameStore((s) => s.save);
  const setSave = useGameStore((s) => s.setSave);
  const modalData = useUIStore((s) => s.modalData);
  const completeNarrative = useUIStore((s) => s.completeNarrative);
  const narrativeId = modalData.narrativeId as string | undefined;
  const [talents, setTalents] = useState(save?.pendingTalentChoices ?? []);
  const [rollCount, setRollCount] = useState(0);
  const MAX_ROLLS = 1;

  const handleSelect = async (talentId: string) => {
    if (!save) return;
    try {
      const updated = await selectTalentApi(save.id, talentId);
      setSave(updated);
      if (narrativeId) completeNarrative(narrativeId);
      else useUIStore.getState().hideModal();
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
    <GameModal
      title="源质印记觉醒"
      dismissible={false}
    >
      <div className="awakening-content">
        <p className="awakening-hint">
          生态跃迁唤醒了新的长期倾向。选择一种源质印记，让这次变化真正沉入潮池。
        </p>
        <div className="reroll-bar">
          <span className="reroll-hint">
            刷新次数 {rollCount}/{MAX_ROLLS}
          </span>
          {rollCount < MAX_ROLLS && (
            <button className="reroll-icon-btn" onClick={handleReroll} aria-label="刷新印记">
              <RefreshCw size={18} aria-hidden="true" />
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
              <img
                className="talent-icon"
                src={talentAssetFor(t)}
                alt=""
                aria-hidden="true"
              />
              <span className="talent-name">{t.name}</span>
              {t.consumable && (
                <span className="talent-tag consumable" data-tooltip="选中后资源立刻到账，不进入永久天赋">
                  潮涌
                </span>
              )}
              <span className="talent-summary">{t.summary}</span>
              <span className="talent-desc">{t.description}</span>
              {t.trait && (
                <span className="talent-trait">
                  {t.trait.name}: {t.trait.desc}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </GameModal>
  );
}
