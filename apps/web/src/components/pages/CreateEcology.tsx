import { useState } from "react";
import {
  ensureGuest,
  createSave,
  getTalentChoices,
} from "../../api.js";
import { useGameStore } from "../../stores/gameStore.js";
import { useUIStore } from "../../stores/uiStore.js";
import type { Talent } from "@eco-era/shared";

export function CreateEcology() {
  const [name, setName] = useState("");
  const [talents, setTalents] = useState<Talent[]>([]);
  const [selectedTalent, setSelectedTalent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"name" | "talent">("name");
  const setSave = useGameStore((s) => s.setSave);
  const setSaveId = useGameStore((s) => s.setSaveId);
  const setGuestReady = useGameStore((s) => s.setGuestReady);
  const setPage = useUIStore((s) => s.setPage);

  const handleNameSubmit = async () => {
    if (!name.trim() || name.trim().length > 16) return;
    setLoading(true);
    setError(null);
    try {
      await ensureGuest();
      const choices = await getTalentChoices();
      setTalents(choices);
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
      setGuestReady(true);
      setPage("home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page create-ecology">
      {step === "name" && (
        <div className="create-section">
          <h1 className="create-title">命名你的生态</h1>
          <p className="create-subtitle">为这片始源潮池命名，它将成为这颗星球生命史的开端。</p>
          <div className="input-group">
            <input
              className="eco-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 16))}
              placeholder="输入生态名称（最多16字）"
              maxLength={16}
              onKeyDown={(e) => { if (e.key === "Enter") handleNameSubmit(); }}
            />
            <span className="input-count">{name.length}/16</span>
          </div>
          {error && <p className="error-text">{error}</p>}
          <button
            className="btn-primary"
            onClick={handleNameSubmit}
            disabled={!name.trim() || loading}
          >
            {loading ? "连接中…" : "确认名称"}
          </button>
        </div>
      )}

      {step === "talent" && (
        <div className="create-section">
          <h2 className="create-title">选择源质印记</h2>
          <p className="create-subtitle">这将是这颗星球最初始的长期倾向，永久生效。</p>
          <div className="talent-cards">
            {talents.map((t) => (
              <button
                key={t.id}
                className={`talent-card ${selectedTalent === t.id ? "selected" : ""}`}
                onClick={() => setSelectedTalent(t.id)}
              >
                <span className="talent-icon">{iconFor(t.icon)}</span>
                <span className="talent-name">{t.name}</span>
                <span className="talent-summary">{t.summary}</span>
                <span className="talent-desc">{t.description}</span>
              </button>
            ))}
          </div>
          {error && <p className="error-text">{error}</p>}
          <button
            className="btn-primary fixed-bottom"
            onClick={handleCreate}
            disabled={!selectedTalent || loading}
          >
            {selectedTalent
              ? `携带「${talents.find((t) => t.id === selectedTalent)?.name}」进入潮池`
              : "选择一种源质印记"}
          </button>
        </div>
      )}
    </div>
  );
}

function iconFor(icon: string): string {
  const map: Record<string, string> = { crystal: "💎", spark: "⚡", tide: "🌊", membrane: "🫧", mutation: "🧬" };
  return map[icon] ?? "✦";
}
