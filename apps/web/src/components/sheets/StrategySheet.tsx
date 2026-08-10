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
    cost: "消耗 8 能量，水体波动略微增加",
    requires: { energy: 8 },
  },
  {
    id: "minerals",
    asset: uiAssets.resources.minerals,
    name: "矿物沉积",
    gain: "提高矿物产出并恢复 2 稳定性",
    cost: "消耗 10 有机质",
    requires: { organic: 10 },
  },
  {
    id: "tide",
    asset: uiAssets.resources.organic,
    name: "潮汐扰动",
    gain: "提高有机质和突变倾向",
    cost: "消耗 12 能量和 3 稳定性",
    requires: { energy: 12, stability: 3 },
  },
  {
    id: "heat",
    asset: uiAssets.resources.mutation,
    name: "提高温度",
    gain: "加快反应速度并获得 2 突变点",
    cost: "消耗 8 矿物质",
    requires: { minerals: 8 },
  },
];

const ACTION_LABELS = new Map(ACTIONS.map((a) => [a.id, a]));
const COOLDOWN_SECONDS = 30;
const RESONANCE_COOLDOWN_SECONDS = 60;
type StrategyChapter = "life_birth" | "ecology_burst";
const LOCKED_RESONANCE_PREVIEWS = [
  { id: "producer_decomposer", title: "浅层与池底", desc: "旧薄膜被拆回材料，再送回受光的浅层。", roles: ["producer", "decomposer"] },
  { id: "full_cycle", title: "第一组循环", desc: "生产、分解和过滤齐备后，材料会在三者之间往返。", roles: ["producer", "decomposer", "filterer"] },
];

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
  const snoozeEcologyEvent = useUIStore((s) => s.snoozeEcologyEvent);
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
  const roleStatuses = ecologyRoleStatuses(save);
  const resonanceRemaining = save ? calcResonanceRemaining(save.lastResonanceAt) : 0;
  const selectedChapter = chapterTwoUnlocked ? activeChapter : "life_birth";
  const isBusy = Boolean(submittingId);
  const panelHint = selectedChapter === "ecology_burst"
    ? (save?.chapterProgress?.currentMoodLabel ?? "水中的生态角色正在交换材料。")
    : "改变一项环境条件，观察水体的即时反应与长期压力。";

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
    const currentSave = save;
    const resonance = resonances.find((item) => item.id === resonanceId);
    if (!resonance) return;
    showModal("decision-confirm", {
      title: "观察这组生态互动吗？",
      description: resonance.description,
      gain: resonanceDirectionCopy(resonance.id),
      cost: resonanceTradeoffCopy(resonance.id),
      confirmLabel: "确认选择",
      cancelLabel: "先放一放",
      onConfirm: async () => {
        setSubmittingId(resonanceId);
        try {
          const { save: updated, resonanceResult } = await applyEcologyResonance(currentSave.id, resonanceId);
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
          const msg = e instanceof Error ? e.message : "这组生态互动暂时无法发生";
          showModal("system-unlock", { name: msg });
        } finally {
          setSubmittingId(null);
        }
      },
    });
  };

  const reopenPendingEvent = () => {
    snoozeEcologyEvent(null);
    closeSheet();
    showModal("ecology-event");
  };

  const chapterTabs = useMemo(() => [
    { id: "life_birth" as const, label: "生命诞生", disabled: false },
    ...(chapterTwoUnlocked
      ? [{ id: "ecology_burst" as const, label: "生态爆发", disabled: false }]
      : []),
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

      {save?.pendingEcologyEvent && (
        <button
          className="pending-ecology-event"
          type="button"
          onClick={reopenPendingEvent}
        >
          <span className="pending-ecology-event-kicker">
            {save.chapterProgress?.chapter === "shoreline_differentiation" ? "岸线现象" : "潮池现象"}
          </span>
          <strong>{save.pendingEcologyEvent.title}</strong>
          <span>{save.pendingEcologyEvent.description}</span>
          <small>继续选择回应</small>
        </button>
      )}

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
              <span className="resonance-kicker">生态互动</span>
              <span className="resonance-note">
                {resonances.length > 0 ? "选择一组生态互动" : resonanceEmptyTitle(roleStatuses, resonanceRemaining, save?.chapterProgress?.stage)}
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
              {save?.chapterProgress?.stage !== "complete" && LOCKED_RESONANCE_PREVIEWS
                .filter((preview) => !preview.roles.every((role) => roleStatuses.some((item) => item.id === role && item.active)))
                .slice(0, 1)
                .map((preview) => (
                <LockedResonancePreview
                  key={preview.id}
                  preview={preview}
                  activeRoles={new Set(roleStatuses.filter((role) => role.active).map((role) => role.id))}
                />
                ))}
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
            <p className="strategy-next-hint">确认感光色素后，新的生态角色会逐步出现。</p>
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
  const save = useGameStore((s) => s.save);
  const disabled = onCooldown || Boolean(submittingId);
  return (
    <div className="strategy-grid">
      {ACTIONS.map((a) => {
        const affordable = Boolean(save) && Object.entries(a.requires).every(
          ([key, value]) => (save?.resources[key as keyof typeof save.resources] ?? 0) >= value,
        );
        return (
          <button
            key={a.id}
            className={`strategy-card ${disabled ? "cooldown" : ""} ${!affordable ? "unavailable" : ""} ${submittingId === a.id ? "submitting" : ""}`}
            disabled={disabled || !affordable}
            onClick={() => onAction(a.id)}
          >
            <span className="strategy-card-top">
              <img className="strategy-icon" src={a.asset} alt="" aria-hidden="true" />
              <span className="strategy-card-state">
                {submittingId === a.id ? "提交中" : onCooldown ? `${remaining}s` : affordable ? "可用" : "材料不足"}
              </span>
            </span>
            <span className="strategy-name">{a.name}</span>
            <span className="strategy-gain">+ {a.gain}</span>
            <span className="strategy-cost">- {a.cost}</span>
          </button>
        );
      })}
    </div>
  );
}

function LockedResonancePreview({
  preview,
  activeRoles,
}: {
  preview: { title: string; desc: string; roles: string[] };
  activeRoles: Set<string>;
}) {
  const ready = preview.roles.every((role) => activeRoles.has(role));
  const missing = preview.roles.filter((role) => !activeRoles.has(role)).map(rolePreviewLabel);
  return (
    <div className={`resonance-card resonance-preview ${ready ? "ready" : "locked"}`}>
      <span className="resonance-icon-wrap">
        <img className="resonance-icon" src={uiAssets.emblems.ecologyResonance} alt="" aria-hidden="true" />
      </span>
      <span className="resonance-copy">
        <span className="resonance-title-row">
          <span className="resonance-title">{preview.title}</span>
          <span className="resonance-state">{ready ? "角色齐备" : `缺 ${missing.join("、")}`}</span>
        </span>
        <span className="resonance-desc">{preview.desc}</span>
      </span>
    </div>
  );
}

function rolePreviewLabel(role: string) {
  const labels: Record<string, string> = {
    producer: "生产者",
    decomposer: "分解者",
    filterer: "滤食者",
  };
  return labels[role] ?? role;
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
          <span className="resonance-effect">{resonanceDirectionCopy(resonance.id)}</span>
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

function ecologyRoleStatuses(save: ReturnType<typeof useGameStore.getState>["save"]) {
  const livingRoles = new Set(
    (save?.species ?? [])
      .filter((item) => item.status === "living" || item.status === "flourishing")
      .map((item) => item.ecologicalRole),
  );
  if (save?.unlockedNodes.includes("early_producer_film")) livingRoles.add("producer");
  if (save?.unlockedNodes.includes("decomposition_layer")) livingRoles.add("decomposer");
  if (save?.unlockedNodes.includes("tidal_filter_pores")) livingRoles.add("filterer");
  return [
    { id: "producer", label: "生产者", asset: uiAssets.species.producer, active: livingRoles.has("producer") },
    { id: "decomposer", label: "分解者", asset: uiAssets.species.decomposer, active: livingRoles.has("decomposer") },
    { id: "filterer", label: "滤食者", asset: uiAssets.species.filterer, active: livingRoles.has("filterer") },
  ];
}

function resonanceEmptyTitle(roles: ReturnType<typeof ecologyRoleStatuses>, remaining: number, stage: string | undefined) {
  if (stage === "complete") return "第一组生态循环已经稳定";
  if (remaining > 0) return `共鸣冷却 ${remaining}s`;
  const activeCount = roles.filter((role) => role.active).length;
  return activeCount >= 2 ? "暂时没有新的生态互动" : "还缺少一种生态角色";
}

function resonanceEmptyCopy(roles: ReturnType<typeof ecologyRoleStatuses>, remaining: number, stage: string | undefined) {
  if (stage === "complete") return "生产、分解和过滤已经形成稳定循环，相关变化已记录进生命史。";
  if (remaining > 0) return `水体仍在适应上一次变化。${remaining}s 后可以再次观察生态互动。`;
  const active = roles.filter((role) => role.active).map((role) => role.label);
  if (active.length === 0) return "先在演化页记录早期生产薄膜，让第一类生态角色出现。";
  if (active.length === 1) return `现在只有${active[0]}已经稳定。等另一种角色出现后，新的互动才会形成。`;
  return "当前角色尚未形成新的关系。继续照看潮池，或等待环境变化改变它们的状态。";
}

function calcResonanceRemaining(lastResonanceAt: string | null | undefined) {
  if (!lastResonanceAt) return 0;
  const elapsed = (Date.now() - new Date(lastResonanceAt).getTime()) / 1000;
  if (!Number.isFinite(elapsed) || elapsed < 0) return RESONANCE_COOLDOWN_SECONDS;
  return Math.max(0, Math.ceil(RESONANCE_COOLDOWN_SECONDS - elapsed));
}

function resonanceDirectionCopy(resonanceId: string) {
  const map: Record<string, string> = {
    decomposer_feeds_producer: "旧薄膜拆回来的养分，会被送回受光的浅层。",
    filter_pores_clear_tide: "滤孔会过滤浑浊颗粒，让水层恢复清澈。",
    bloom_selection_pressure: "拥挤会筛掉脆弱薄膜，也会增加旁支分化。",
  };
  return map[resonanceId] ?? "这次互动会改变相关物种的生长条件。";
}

function resonanceTradeoffCopy(resonanceId: string) {
  const map: Record<string, string> = {
    decomposer_feeds_producer: "",
    filter_pores_clear_tide: "过滤会消耗少量有机质，短时繁盛会慢一点。",
    bloom_selection_pressure: "水面会更挤，稳定会先承压。",
  };
  return map[resonanceId] ?? "这次变化会进入生命史记录。";
}
