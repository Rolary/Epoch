import type { EcologyResonance } from "@eco-era/shared";
import { availableEcologyResonances } from "@eco-era/game-core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { applyAction, applyEcologyResonance } from "../../api.js";
import { uiAssets } from "../../assets/uiAssets.js";
import { useGameStore } from "../../stores/gameStore.js";
import { useUIStore } from "../../stores/uiStore.js";
import { BottomSheet, useCloseSheet } from "./BottomSheet.js";

const ACTIONS = [
  {
    id: "light",
    asset: uiAssets.resources.energy,
    name: "增强光照",
    gain: "提高能量产出和光反应概率",
    cost: "长期增加挥发性和氧化压力",
  },
  {
    id: "minerals",
    asset: uiAssets.resources.minerals,
    name: "矿物沉积",
    gain: "增加矿物质和结构稳定",
    cost: "可能压制薄膜结构发育",
  },
  {
    id: "tide",
    asset: uiAssets.resources.organic,
    name: "潮汐扰动",
    gain: "提高有机质和突变倾向",
    cost: "降低短期稳定性",
  },
  {
    id: "heat",
    asset: uiAssets.resources.mutation,
    name: "提高温度",
    gain: "加快反应速度和突变",
    cost: "增加失衡和灭绝风险",
  },
];

const ACTION_LABELS = new Map(ACTIONS.map((a) => [a.id, a]));
const COOLDOWN_SECONDS = 30;
const RESONANCE_COOLDOWN_SECONDS = 60;
type StrategyChapter = "life_birth" | "ecology_burst";

export function StrategySheet() {
  return (
    <BottomSheet variant="drawer">
      <StrategySheetContent />
    </BottomSheet>
  );
}

function StrategySheetContent() {
  const closeSheet = useCloseSheet();
  const save = useGameStore((s) => s.save);
  const setSave = useGameStore((s) => s.setSave);
  const showModal = useUIStore((s) => s.showModal);
  const cooldownUntil = useUIStore((s) => s.strategyCooldownUntil);
  const setStrategyCooldown = useUIStore((s) => s.setStrategyCooldown);
  const [activeChapter, setActiveChapter] = useState<StrategyChapter>("life_birth");
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const calcRemaining = useCallback(() => {
    const ms = cooldownUntil - Date.now();
    return ms > 0 ? Math.ceil(ms / 1000) : 0;
  }, [cooldownUntil]);

  const [remaining, setRemaining] = useState(calcRemaining);

  useEffect(() => {
    const currentChapter = save?.chapterProgress?.chapter === "ecology_burst" ? "ecology_burst" : "life_birth";
    setActiveChapter(currentChapter);
  }, [save?.id, save?.chapterProgress?.chapter]);

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
  const chapterTwoUnlocked = save?.chapterProgress?.chapter === "ecology_burst" || save?.unlockedNodes.includes("photo_pigment");
  const resonances = save ? availableEcologyResonances(save) : [];
  const roleStatuses = ecologyRoleStatuses(save?.species ?? []);
  const resonanceRemaining = save ? calcResonanceRemaining(save.lastResonanceAt) : 0;
  const selectedChapter = chapterTwoUnlocked ? activeChapter : "life_birth";
  const isBusy = Boolean(submittingId);
  const panelHint = selectedChapter === "ecology_burst"
    ? "观察物种之间的短期互动，留下长期生命史痕迹。"
    : "轻推潮池环境，换取短期收益，也会留下长期压力。";

  const handleAction = async (action: string) => {
    if (!save || onCooldown || submittingId) return;
    setSubmittingId(action);
    try {
      const before = { ...save.resources };
      const updated = await applyAction(save.id, action);
      setSave(updated);
      setStrategyCooldown(COOLDOWN_SECONDS);
      closeSheet();
      const deltas = Object.entries(updated.resources)
        .map(([key, value]) => [key, Math.floor(value - (before[key as keyof typeof before] ?? 0))] as const)
        .filter(([, value]) => value !== 0);
      window.dispatchEvent(new CustomEvent("eco-intervention", {
        detail: {
          action,
          name: ACTION_LABELS.get(action)?.name ?? "生态干预",
          asset: ACTION_LABELS.get(action)?.asset ?? uiAssets.emblems.system,
          deltas,
        },
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "资源不足";
      showModal("system-unlock", { name: msg });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleResonance = async (resonanceId: string) => {
    if (!save || onCooldown || submittingId) return;
    setSubmittingId(resonanceId);
    try {
      const { save: updated, resonanceResult } = await applyEcologyResonance(save.id, resonanceId);
      setSave(updated);
      setStrategyCooldown(COOLDOWN_SECONDS);
      closeSheet();
      const deltas = Object.entries(resonanceResult.resourceEffect ?? {})
        .map(([key, value]) => [key, Math.floor(value ?? 0)] as const)
        .filter(([, value]) => value !== 0);
      window.dispatchEvent(new CustomEvent("eco-intervention", {
        detail: {
          action: resonanceId,
          name: resonanceResult.title,
          asset: resonanceIconFor(resonanceId).main,
          deltas,
        },
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "生态共鸣暂时没有形成";
      showModal("system-unlock", { name: msg });
    } finally {
      setSubmittingId(null);
    }
  };

  const chapterTabs = useMemo(() => [
    { id: "life_birth" as const, label: "生命诞生", disabled: false },
    { id: "ecology_burst" as const, label: "生态爆发", disabled: !chapterTwoUnlocked },
  ], [chapterTwoUnlocked]);

  return (
    <div className="strategy-sheet">
      <div className="sheet-heading">
        <div>
          <h3 className="sheet-title">生态干预</h3>
          <p className="sheet-hint">
            {panelHint}
            {onCooldown && <span className="cooldown-timer">冷却 {remaining}s</span>}
          </p>
        </div>
      </div>

      <div className="strategy-tabs" role="tablist" aria-label="干预章节">
        {chapterTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selectedChapter === tab.id}
            className={`strategy-tab ${selectedChapter === tab.id ? "active" : ""}`}
            disabled={tab.disabled}
            onClick={() => setActiveChapter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {selectedChapter === "ecology_burst" ? (
        <div className="strategy-panel chapter-panel ecology-panel">
          <section className="resonance-section">
            <div className="resonance-head">
              <span className="resonance-kicker">生态共鸣</span>
              <span className="resonance-note">
                {resonances.length > 0 ? "选择一段正在形成的关系" : resonanceEmptyTitle(roleStatuses, resonanceRemaining, save?.chapterProgress?.stage)}
              </span>
            </div>
            <div className="ecology-role-strip" aria-label="生态角色">
              {roleStatuses.map((role) => (
                <span key={role.id} className={`ecology-role-pill ${role.active ? "active" : ""}`}>
                  <img src={role.asset} alt="" aria-hidden="true" />
                  <span>{role.label}</span>
                </span>
              ))}
            </div>
            <div className="resonance-list">
              {resonances.length > 0 ? resonances.map((resonance) => (
                <ResonanceCard
                  key={resonance.id}
                  resonance={resonance}
                  disabled={onCooldown || isBusy}
                  submitting={submittingId === resonance.id}
                  remaining={Math.max(remaining, resonanceRemaining)}
                  onSelect={handleResonance}
                />
              )) : (
                <div className="resonance-empty">
                  {resonanceEmptyCopy(roleStatuses, resonanceRemaining, save?.chapterProgress?.stage)}
                </div>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="strategy-panel chapter-panel birth-panel">
          <ActionGrid
            onCooldown={onCooldown}
            submittingId={submittingId}
            remaining={remaining}
            onAction={handleAction}
          />
          {!chapterTwoUnlocked && (
            <p className="strategy-next-hint">点亮感光色素后，会出现第二章的生态共鸣观察。</p>
          )}
        </div>
      )}
    </div>
  );
}

function ActionGrid({
  onCooldown,
  submittingId,
  remaining,
  onAction,
}: {
  onCooldown: boolean;
  submittingId: string | null;
  remaining: number;
  onAction: (actionId: string) => void;
}) {
  const disabled = onCooldown || Boolean(submittingId);
  return (
    <div className="strategy-grid">
      {ACTIONS.map((a) => (
        <button
          key={a.id}
          className={`strategy-card ${disabled ? "cooldown" : ""} ${submittingId === a.id ? "submitting" : ""}`}
          disabled={disabled}
          onClick={() => onAction(a.id)}
        >
          <span className="strategy-card-top">
            <img className="strategy-icon" src={a.asset} alt="" aria-hidden="true" />
            <span className="strategy-card-state">
              {submittingId === a.id ? "提交中" : onCooldown ? `${remaining}s` : "可用"}
            </span>
          </span>
          <span className="strategy-name">{a.name}</span>
          <span className="strategy-gain">+ {a.gain}</span>
          <span className="strategy-cost">- {a.cost}</span>
        </button>
      ))}
    </div>
  );
}

function ResonanceCard({
  resonance,
  disabled,
  submitting,
  remaining,
  onSelect,
}: {
  resonance: EcologyResonance;
  disabled: boolean;
  submitting: boolean;
  remaining: number;
  onSelect: (resonanceId: string) => void;
}) {
  const icon = resonanceIconFor(resonance.id);
  return (
    <button
      className={`resonance-card ${disabled ? "cooldown" : ""} ${submitting ? "submitting" : ""}`}
      disabled={disabled}
      onClick={() => onSelect(resonance.id)}
    >
      <span className="resonance-icon-wrap">
        <img className="resonance-icon" src={icon.main} alt="" aria-hidden="true" />
        {icon.badges.map((badge) => (
          <img key={badge} className="resonance-mini-icon" src={badge} alt="" aria-hidden="true" />
        ))}
      </span>
      <span className="resonance-copy">
        <span className="resonance-title-row">
          <span className="resonance-title">{resonance.title}</span>
          <span className="resonance-state">{submitting ? "提交中" : remaining > 0 ? `${remaining}s` : "观察"}</span>
        </span>
        <span className="resonance-desc">{resonance.description}</span>
        <span className="resonance-effect">{resonance.resultSummary}</span>
      </span>
    </button>
  );
}

function resonanceIconFor(resonanceId: string): { main: string; badges: string[] } {
  const roleBadges: Record<string, string[]> = {
    decomposer_feeds_producer: [uiAssets.species.decomposer, uiAssets.species.producer],
    filter_pores_clear_tide: [uiAssets.species.filterer],
    bloom_selection_pressure: [uiAssets.emblems.ecologyIntervention],
  };
  return {
    main: uiAssets.emblems.ecologyResonance,
    badges: roleBadges[resonanceId] ?? [],
  };
}

function ecologyRoleStatuses(species: Array<{ ecologicalRole: string; status: string }>) {
  const livingRoles = new Set(
    species
      .filter((item) => item.status === "living" || item.status === "flourishing")
      .map((item) => item.ecologicalRole),
  );
  return [
    { id: "producer", label: "生产者", asset: uiAssets.species.producer, active: livingRoles.has("producer") },
    { id: "decomposer", label: "分解者", asset: uiAssets.species.decomposer, active: livingRoles.has("decomposer") },
    { id: "filterer", label: "滤食者", asset: uiAssets.species.filterer, active: livingRoles.has("filterer") },
  ];
}

function resonanceEmptyTitle(roles: ReturnType<typeof ecologyRoleStatuses>, remaining: number, stage: string | undefined) {
  if (stage === "complete") return "生态性格已归纳";
  if (remaining > 0) return `共鸣冷却 ${remaining}s`;
  const activeCount = roles.filter((role) => role.active).length;
  return activeCount >= 2 ? "暂无新的可观察关系" : "需要两类生态角色";
}

function resonanceEmptyCopy(roles: ReturnType<typeof ecologyRoleStatuses>, remaining: number, stage: string | undefined) {
  if (stage === "complete") return "第二章已经把这片潮池的生态性格写入生命史。之后的关系变化会进入下一章系统。";
  if (remaining > 0) return `生态共鸣已经开启，潮池还在消化上一次观察。${remaining}s 后再看新的互动方向。`;
  const active = roles.filter((role) => role.active).map((role) => role.label);
  if (active.length === 0) return "先在演化页记录早期生产薄膜，让第一类生态角色出现。";
  if (active.length === 1) return `当前只有${active[0]}。继续推进第二章节点，记录另一类角色后才会出现可选择的共鸣。`;
  return "当前角色组合没有新的共鸣选项。继续推进主线或经历平衡事件，会显露新的互动方向。";
}

function calcResonanceRemaining(lastResonanceAt: string | null | undefined) {
  if (!lastResonanceAt) return 0;
  const elapsed = (Date.now() - new Date(lastResonanceAt).getTime()) / 1000;
  if (!Number.isFinite(elapsed) || elapsed < 0) return RESONANCE_COOLDOWN_SECONDS;
  return Math.max(0, Math.ceil(RESONANCE_COOLDOWN_SECONDS - elapsed));
}
