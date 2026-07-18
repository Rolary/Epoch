import type { Talent } from "@eco-era/shared";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { createSave, ensureGuest, getTalentChoices, restoreGuestKey } from "../../api.js";
import { uiAssets } from "../../assets/uiAssets.js";
import { useGameStore } from "../../stores/gameStore.js";
import { useUIStore } from "../../stores/uiStore.js";
import { talentAssetFor } from "../talents/talentPresentation.js";

export function CreateEcology() {
  const [name, setName] = useState("");
  const [talents, setTalents] = useState<Talent[]>([]);
  const [selectedTalent, setSelectedTalent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"name" | "talent">("name");
  const [rollCount, setRollCount] = useState(0);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreKey, setRestoreKey] = useState("");
  const MAX_ROLLS = 3;
  const setSave = useGameStore((s) => s.setSave);
  const setSaveId = useGameStore((s) => s.setSaveId);
  const setGuestReady = useGameStore((s) => s.setGuestReady);
  const setPage = useUIStore((s) => s.setPage);
  const hydrateScopedUIState = useUIStore((s) => s.hydrateScopedUIState);

  const handleNameSubmit = async () => {
    if (!name.trim() || name.trim().length > 16) return;
    setLoading(true);
    setError(null);
    try {
      await ensureGuest();
      const choices = await getTalentChoices();
      setTalents(choices);
      setSelectedTalent(null);
      setStep("talent");
    } catch (e) {
      setError(e instanceof Error ? e.message : "连接失败");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedTalent) return;
    setLoading(true);
    setError(null);
    try {
      const save = await createSave(name.trim(), selectedTalent);
      setSave(save);
      setSaveId(save.id);
      hydrateScopedUIState();
      setGuestReady(true);
      setPage("home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreKey.trim()) {
      setError("请输入旧游客印记");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const save = await restoreGuestKey(restoreKey);
      setSave(save);
      setSaveId(save.id);
      hydrateScopedUIState();
      setGuestReady(true);
      setPage("home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "恢复失败");
    } finally {
      setLoading(false);
    }
  };

  const handleReroll = async () => {
    if (rollCount >= MAX_ROLLS) return;
    setLoading(true);
    try {
      const choices = await getTalentChoices();
      setTalents(choices);
      setSelectedTalent(null);
      setRollCount((c) => c + 1);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page create-ecology">
      {step === "name" && (
        <div className="create-section">
          <img className="create-pool-preview" src={uiAssets.scene.poolCenterpiece} alt="" aria-hidden="true" />
          <h1 className="create-title">命名你的生态</h1>
          <p className="create-subtitle">
            一切从这片浅水开始。先给它一个名字，再看生命会在这里长成什么样。
          </p>
          <div className="input-group">
            <input
              className="eco-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 16))}
              placeholder="输入生态名称"
              maxLength={16}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameSubmit();
              }}
            />
            <span className="input-count">{name.length}/16</span>
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn-primary" onClick={handleNameSubmit} disabled={!name.trim() || loading}>
            {loading ? "连接中..." : "确认名称"}
          </button>
          <div className="restore-panel">
            <button
              className="restore-toggle"
              type="button"
              onClick={() => {
                setRestoreOpen((open) => !open);
                setError(null);
              }}
            >
              {restoreOpen ? "收起旧印记" : "用旧印记恢复"}
            </button>
            {restoreOpen && (
              <div className="restore-form">
                <input
                  className="eco-input restore-input"
                  type="text"
                  value={restoreKey}
                  onChange={(e) => setRestoreKey(e.target.value)}
                  placeholder="粘贴游客印记 guest_..."
                  autoCapitalize="off"
                  autoComplete="off"
                  spellCheck={false}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRestore();
                  }}
                />
                <button className="btn-secondary restore-button" type="button" onClick={handleRestore} disabled={loading}>
                  {loading ? "寻找中..." : "恢复最近档案"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {step === "talent" && (
        <div className="create-section">
          <h2 className="create-title">选择源质印记</h2>
          <p className="create-subtitle">这项起始倾向会持续影响潮池此后的生长。</p>
          <div className="reroll-bar">
            <span className="reroll-hint">
              刷新次数 {rollCount}/{MAX_ROLLS}
            </span>
            {rollCount < MAX_ROLLS && (
              <button className="reroll-icon-btn" onClick={handleReroll} disabled={loading} aria-label="刷新印记">
                <RefreshCw size={18} aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="talent-cards">
            {talents.map((t) => (
              <button
                key={t.id}
                className={`talent-card rarity-${t.rarity} ${selectedTalent === t.id ? "selected" : ""}`}
                onClick={() => setSelectedTalent(t.id)}
              >
                <img
                  className="talent-icon"
                  src={talentAssetFor(t)}
                  alt=""
                  aria-hidden="true"
                />
                <span className="talent-name">{t.name}</span>
                {t.consumable && (
                  <span className="talent-tag consumable" data-tooltip="选中后立即获得所列材料，不形成长期印记">
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
          {error && <p className="error-text">{error}</p>}
          <button className="btn-primary fixed-bottom" onClick={handleCreate} disabled={!selectedTalent || loading}>
            {selectedTalent ? `携带「${talents.find((t) => t.id === selectedTalent)?.name}」进入潮池` : "选择一种源质印记"}
          </button>
        </div>
      )}
    </div>
  );
}
