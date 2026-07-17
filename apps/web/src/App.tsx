import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Game as PhaserGame } from "phaser";
import { useGameStore } from "./stores/gameStore.js";
import type { ElementType, Outcome } from "./stores/gameStore.js";
import { useUIStore } from "./stores/uiStore.js";
import type { NarrativePrompt, Page } from "./stores/uiStore.js";
import { createThirdChapterDebugSave, ensureGuest, getSave, tickSave, getSaveId, applyAction } from "./api.js";
import {
  calculateResourceDelta,
  canUnlockEvolutionNode,
  evolutionNodes,
  OFFLINE_ACCUMULATION_HOURS,
  unclaimedResourceCapacity,
} from "@eco-era/game-core";
import { formatChineseNumber } from "@eco-era/shared";
import type { Resources } from "@eco-era/shared";
import { TopBar } from "./components/hud/TopBar.js";
import { BottomBar } from "./components/hud/BottomBar.js";
import { CurrentObjective } from "./components/hud/CurrentObjective.js";
import { GuideOverlay } from "./components/overlays/GuideOverlay.js";
import { uiAssets } from "./assets/uiAssets.js";

const CreateEcology = lazy(() => import("./components/pages/CreateEcology.js").then((m) => ({ default: m.CreateEcology })));
const EvolutionPage = lazy(() => import("./components/pages/EvolutionPage.js").then((m) => ({ default: m.EvolutionPage })));
const CodexPage = lazy(() => import("./components/pages/CodexPage.js").then((m) => ({ default: m.CodexPage })));
const CodexDetailPage = lazy(() => import("./components/pages/CodexPage.js").then((m) => ({ default: m.CodexDetailPage })));
const TalentArchivePage = lazy(() => import("./components/pages/TalentArchivePage.js").then((m) => ({ default: m.TalentArchivePage })));
const FossilPage = lazy(() => import("./components/pages/FossilPage.js").then((m) => ({ default: m.FossilPage })));
const LogPage = lazy(() => import("./components/pages/LogPage.js").then((m) => ({ default: m.LogPage })));
const LeaderboardPage = lazy(() => import("./components/pages/LeaderboardPage.js").then((m) => ({ default: m.LeaderboardPage })));
const SettingsPage = lazy(() => import("./components/pages/SettingsPage.js").then((m) => ({ default: m.SettingsPage })));
const ErrorPage = lazy(() => import("./components/pages/ErrorPage.js").then((m) => ({ default: m.ErrorPage })));
const SpeciesDiscovery = lazy(() => import("./components/modals/SpeciesDiscovery.js").then((m) => ({ default: m.SpeciesDiscovery })));
const TalentAwakening = lazy(() => import("./components/modals/TalentAwakening.js").then((m) => ({ default: m.TalentAwakening })));
const OfflineReturn = lazy(() => import("./components/modals/OfflineReturn.js").then((m) => ({ default: m.OfflineReturn })));
const SystemUnlock = lazy(() => import("./components/modals/SystemUnlock.js").then((m) => ({ default: m.SystemUnlock })));
const HiddenTraceDiscovery = lazy(() => import("./components/modals/HiddenTraceDiscovery.js").then((m) => ({ default: m.HiddenTraceDiscovery })));
const EcologyEventModal = lazy(() => import("./components/modals/EcologyEventModal.js").then((m) => ({ default: m.EcologyEventModal })));
const DecisionConfirm = lazy(() => import("./components/modals/DecisionConfirm.js").then((m) => ({ default: m.DecisionConfirm })));
const StrategySheet = lazy(() => import("./components/sheets/StrategySheet.js").then((m) => ({ default: m.StrategySheet })));

const ELEMENT_ACTION: Record<ElementType, string> = {
  crystal: "catalyze",
  spark: "catalyze",
  droplet: "catalyze",
  pulse: "catalyze",
};

type InterventionCue = {
  id: number;
  name: string;
  asset: string;
  deltas: Array<[string, number]>;
};

function TidepoolStrategyButton() {
  const save = useGameStore((s) => s.save);
  const showSheet = useUIStore((s) => s.showSheet);
  const seenUnlockHints = useUIStore((s) => s.seenUnlockHints);
  const markUnlockHintSeen = useUIStore((s) => s.markUnlockHintSeen);
  const unlockGuideTarget = useUIStore((s) => s.unlockGuideTarget);
  const setUnlockGuideTarget = useUIStore((s) => s.setUnlockGuideTarget);

  if (!save || save.unlockedNodes.length === 0) return null;

  return (
    <button
      aria-label="生态干预"
      className={`tidepool-strategy-btn ${seenUnlockHints.includes("strategy") ? "" : "new-unlock guide-pulse"} ${
        unlockGuideTarget === "strategy" ? "unlock-guide-target" : ""
      }`}
      onClick={() => {
        markUnlockHintSeen("strategy");
        if (unlockGuideTarget === "strategy") setUnlockGuideTarget(null);
        showSheet("strategy");
      }}
    >
      <img className="tidepool-strategy-icon" src={uiAssets.emblems.ecologyIntervention} alt="" aria-hidden="true" />
    </button>
  );
}

type UnlockHint = {
  id: string;
  title: string;
  name: string;
  description: string;
  impact: string;
  advice: string;
  icon: string;
  actionLabel: string;
  targetPage?: Page;
};

const RESOURCE_LABELS: Record<string, string> = {
  organic: "有机质",
  energy: "能量",
  minerals: "矿物质",
  stability: "稳定性",
  mutation: "突变",
  biomass: "生物量",
};

function FeedbackToast({
  text,
  color,
  onDone,
}: {
  text: string;
  color: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="feedback-toast" style={{ color }}>
      {text}
    </div>
  );
}

function InterventionBurst({ cue, onDone }: { cue: InterventionCue; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="intervention-burst" role="status" aria-live="polite">
      <div className="intervention-rings" />
      <img className="intervention-icon" src={cue.asset} alt="" aria-hidden="true" />
      <div className="intervention-copy">
        <span className="intervention-title">{cue.name}</span>
        <span className="intervention-result">
          {cue.deltas.length > 0
            ? cue.deltas.slice(0, 3).map(([key, value]) => `${RESOURCE_LABELS[key] ?? key} ${value > 0 ? "+" : ""}${value}`).join(" / ")
            : "潮池状态已改变"}
        </span>
      </div>
    </div>
  );
}

function resourceTotal(resources: Partial<Resources> | undefined) {
  if (!resources) return 0;
  return Object.values(resources).reduce((sum, value) => sum + Math.max(0, value), 0);
}

function minimumHarvestTotal(save: NonNullable<ReturnType<typeof useGameStore.getState>["save"]>) {
  return Math.max(1, resourceTotal(calculateResourceDelta(save, 2 * 60)));
}

function estimatedHarvestWaitSeconds(
  save: NonNullable<ReturnType<typeof useGameStore.getState>["save"]>,
  currentTotal: number,
  minimumTotal: number,
) {
  const perSecond = resourceTotal(calculateResourceDelta(save, 1));
  if (perSecond <= 0) return 2 * 60;
  return Math.max(1, Math.ceil((minimumTotal - currentTotal) / perSecond));
}

function formatApproximateWait(seconds: number) {
  if (seconds < 60) return `约 ${Math.max(5, Math.ceil(seconds / 5) * 5)} 秒`;
  return `约 ${Math.max(1, Math.round(seconds / 60))} 分钟`;
}

function minutesSince(iso: string | null | undefined) {
  if (!iso) return 0;
  const elapsed = (Date.now() - new Date(iso).getTime()) / 60000;
  return Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
}

function isOfflinePoolFull(save: NonNullable<ReturnType<typeof useGameStore.getState>["save"]>) {
  return minutesSince(save.lastHarvestedAt) >= OFFLINE_ACCUMULATION_HOURS * 60;
}

function returnModalKey(save: NonNullable<ReturnType<typeof useGameStore.getState>["save"]>) {
  return `eco-era:${save.id}:return-modal:${save.lastCalculatedAt}:${Math.floor(resourceTotal(save.unclaimedResources))}`;
}

function shouldShowReturnModal(save: NonNullable<ReturnType<typeof useGameStore.getState>["save"]>) {
  if (resourceTotal(save.unclaimedResources) < 15) return false;
  const key = returnModalKey(save);
  return localStorage.getItem(key) !== "1";
}

function markReturnModalSeen(save: NonNullable<ReturnType<typeof useGameStore.getState>["save"]>) {
  localStorage.setItem(returnModalKey(save), "1");
}

function TidepoolCollectButton({
  onCollect,
}: {
  onCollect: (text: string, deltas: Array<[string, number]>) => void;
}) {
  const save = useGameStore((s) => s.save);
  const setSave = useGameStore((s) => s.setSave);
  const [collecting, setCollecting] = useState(false);

  if (!save) return null;

  const unclaimed = save.unclaimedResources ?? { organic: 0, energy: 0, minerals: 0, stability: 0, mutation: 0, biomass: 0 };
  const total = resourceTotal(unclaimed);
  const minimumTotal = minimumHarvestTotal(save);
  const tooSmall = total < minimumTotal;
  const isFull = isOfflinePoolFull(save);
  const disabled = collecting;
  const waitCopy = formatApproximateWait(estimatedHarvestWaitSeconds(save, total, minimumTotal));

  const collect = async () => {
    if (disabled) return;
    if (tooSmall) {
      onCollect(`潮面还在积蓄，${waitCopy}后可以再次收获`, []);
      return;
    }
    setCollecting(true);
    const before = { ...save.resources };
    try {
      const updated = await applyAction(save.id, "harvest_tide");
      setSave(updated);
      const deltas = Object.entries(updated.resources)
        .map(([key, value]) => [key, Math.floor(value - (before[key as keyof typeof before] ?? 0))] as [string, number])
        .filter(([, value]) => value > 0);
      onCollect("潮汐养分已收集", deltas);
      window.dispatchEvent(new CustomEvent("eco-intervention", {
        detail: {
          action: "harvest_tide",
          name: "潮汐收获",
          asset: uiAssets.emblems.reward,
          deltas,
        },
      }));
    } catch {
      onCollect("潮池还没有新的养分浮上来", []);
    } finally {
      setCollecting(false);
    }
  };

  const visibleDeltas = Object.entries(unclaimed)
    .filter(([key, value]) => key !== "stability" && value >= 1)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <button
      type="button"
      className={`tidepool-collect-btn ${tooSmall ? "cooldown collapsed" : "ready"}`}
      onClick={collect}
      disabled={disabled}
      aria-label={tooSmall ? `潮汐养分积蓄中，${waitCopy}后可以再次收获` : "收集潮汐养分"}
    >
      <span className="collect-icon-wrap">
        <img className="collect-icon" src={uiAssets.emblems.reward} alt="" aria-hidden="true" />
      </span>
      <span className="collect-copy">
        <span className="collect-title">{collecting ? "收集中" : isFull ? "潮池已满" : tooSmall ? "潮面未满" : "收集潮汐养分"}</span>
        <span className="collect-subtitle">
          {isFull
            ? `已积满 ${OFFLINE_ACCUMULATION_HOURS} 小时养分，及时收取`
            : tooSmall
            ? `${waitCopy}后可以再次收获`
            : visibleDeltas.length > 0
              ? visibleDeltas.map(([key, value]) => `${RESOURCE_LABELS[key] ?? key}+${formatChineseNumber(value)}`).join(" / ")
              : "离开一会儿，水面会浮上更多养分"}
        </span>
      </span>
    </button>
  );
}

export function App() {
  const phaserRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<PhaserGame | null>(null);
  const processingAbsorbIdRef = useRef<number | null>(null);
  const previousUnlockHintsRef = useRef<Set<string> | null>(null);
  const previousHiddenTracesRef = useRef<Set<string> | null>(null);
  const activeSaveScopeRef = useRef<string | null>(null);
  const page = useUIStore((s) => s.page);
  const modalType = useUIStore((s) => s.modalType);
  const sheetType = useUIStore((s) => s.sheetType);
  const save = useGameStore((s) => s.save);
  const saveId = useGameStore((s) => s.saveId);
  const setSave = useGameStore((s) => s.setSave);
  const setSaveId = useGameStore((s) => s.setSaveId);
  const setGuestReady = useGameStore((s) => s.setGuestReady);
  const setPage = useUIStore((s) => s.setPage);
  const showModal = useUIStore((s) => s.showModal);
  const seenUnlockHints = useUIStore((s) => s.seenUnlockHints);
  const markUnlockHintSeen = useUIStore((s) => s.markUnlockHintSeen);
  const enqueueNarrative = useUIStore((s) => s.enqueueNarrative);
  const activateNextNarrative = useUIStore((s) => s.activateNextNarrative);
  const activeNarrative = useUIStore((s) => s.activeNarrative);
  const guide = useUIStore((s) => s.guide);
  const unlockGuideTarget = useUIStore((s) => s.unlockGuideTarget);
  const hydrateScopedUIState = useUIStore((s) => s.hydrateScopedUIState);
  const snoozedEcologyEventId = useUIStore((s) => s.snoozedEcologyEventId);
  const updateLastTick = useGameStore((s) => s.updateLastTick);
  const absorbQueue = useGameStore((s) => s.absorbQueue);
  const dequeueAbsorb = useGameStore((s) => s.dequeueAbsorb);

  const [toasts, setToasts] = useState<Array<{ id: number; text: string; color: string }>>([]);
  const [interventionCue, setInterventionCue] = useState<InterventionCue | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const scope = save?.id ?? null;
    if (activeSaveScopeRef.current === scope) return;
    activeSaveScopeRef.current = scope;
    previousUnlockHintsRef.current = null;
    previousHiddenTracesRef.current = null;
  }, [save?.id]);

  // Initialize Phaser
  useEffect(() => {
    if (!sessionReady) return;
    let cancelled = false;
    let idleHandle: number | null = null;
    let fallbackHandle: number | null = null;

    const initializePhaser = async () => {
      if (!phaserRef.current || gameRef.current) return;
      const { createPhaserGame } = await import("./phaser/config.js");
      if (cancelled || !phaserRef.current) return;

      const game = createPhaserGame(phaserRef.current);
      gameRef.current = game;
      // Scene may not be immediately available; wait for next frame.
      const tryWire = () => {
        if (cancelled) return;
        const scene = game.scene.getScene("HomeScene") as {
          onAbsorb?: (type: ElementType, outcome: Outcome) => void;
          onGuideShore?: () => Promise<void>;
        } | null;
        if (scene) {
          scene.onAbsorb = (type: ElementType, outcome: Outcome) => {
            useGameStore.getState().enqueueAbsorb(type, outcome);
          };
          scene.onGuideShore = async () => {
            const currentSaveId = useGameStore.getState().saveId;
            if (!currentSaveId) throw new Error("存档尚未准备好");
            const next = await applyAction(currentSaveId, "guide_shore_tide");
            useGameStore.getState().setSave(next);
            setToasts((prev) => [...prev, {
              id: Date.now(),
              text: "一支生命沿着水光贴住了湿岸",
              color: "#7CE6C8",
            }]);
          };
        } else {
          requestAnimationFrame(tryWire);
        }
      };
      requestAnimationFrame(tryWire);
    };

    const start = () => {
      if (!cancelled) void initializePhaser();
    };

    if ("requestIdleCallback" in window) {
      idleHandle = window.requestIdleCallback(start, { timeout: 800 });
    } else {
      fallbackHandle = globalThis.setTimeout(start, 120);
    }

    return () => {
      cancelled = true;
      if (idleHandle !== null) window.cancelIdleCallback(idleHandle);
      if (fallbackHandle !== null) globalThis.clearTimeout(fallbackHandle);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [sessionReady]);

  // Restore session
  useEffect(() => {
    const restore = async () => {
      const debugChapter = import.meta.env.DEV
        ? new URLSearchParams(window.location.search).get("debugChapter3")
        : null;
      if (debugChapter && ["exposed", "shore", "event", "exchange"].includes(debugChapter)) {
        try {
          await ensureGuest();
          const debugSave = await createThirdChapterDebugSave(debugChapter as "exposed" | "shore" | "event" | "exchange");
          setSave(debugSave);
          setSaveId(debugSave.id);
          hydrateScopedUIState();
          setGuestReady(true);
          setPage("home");
        } finally {
          setSessionReady(true);
        }
        return;
      }
      const existingId = getSaveId();
      if (!existingId) {
        setPage("create-ecology");
        setSessionReady(true);
        return;
      }
      try {
        await ensureGuest();
        const s = await getSave(existingId);
        setSave(s);
        setSaveId(s.id);
        hydrateScopedUIState();
        setGuestReady(true);
        setPage("home");
        if (shouldShowReturnModal(s)) {
          markReturnModalSeen(s);
          showModal("offline-return", {
            minutes: minutesSince(s.lastHarvestedAt ?? s.lastCalculatedAt),
            isFull: isOfflinePoolFull(s),
            gains: s.unclaimedResources,
            poolEffect: s.activePoolEffect,
            observationTitle: s.codexObservations?.find((item) => item.isNew)?.title,
          });
        }
      } catch {
        setPage("create-ecology");
      } finally {
        setSessionReady(true);
      }
    };
    restore();
  }, [hydrateScopedUIState, showModal]);

  // Local prediction tick
  useEffect(() => {
    if (!save || page !== "home") return;
    const interval = setInterval(() => {
      const state = useGameStore.getState();
      if (!state.save) return;
      const now = Date.now();
      const elapsed = (now - state.lastLocalTick) / 1000;
      const delta = calculateResourceDelta(state.save, Math.min(elapsed, 5));
      const capacity = unclaimedResourceCapacity(state.save);
      const next = { ...state.save };
      for (const key of Object.keys(delta) as Array<keyof typeof delta>) {
        next.unclaimedResources[key] = Math.min(capacity[key], (next.unclaimedResources[key] ?? 0) + delta[key]);
      }
      next.unclaimedResources.stability = Math.max(0, Math.min(100, next.unclaimedResources.stability));
      useGameStore.getState().setSave(next);
      useGameStore.getState().updateLastTick();
    }, 1000);
    return () => clearInterval(interval);
  }, [save, page]);

  // Periodic API sync
  useEffect(() => {
    if (!saveId || page !== "home" || isThirdChapterDebugPreview()) return;
    const interval = setInterval(async () => {
      try {
        const prevCount = useGameStore.getState().save?.species.length ?? 0;
        const s = await tickSave(saveId);
        setSave(s);
        const newSpecies = s.species.slice(prevCount);
        if (newSpecies.length > 0) {
          enqueueNarrative(speciesNarrative(newSpecies[0].id));
        }
        if (s.pendingTalentChoices?.length > 0) {
          enqueueNarrative({
            id: `talent-awakening:${s.id}:${s.pendingTalentChoices.map((item) => item.id).join(",")}`,
            type: "talent-awakening",
            data: {},
            priority: 68,
          });
        }
      } catch { /* silent */ }
    }, 15000);
    return () => clearInterval(interval);
  }, [saveId, page, enqueueNarrative]);

  // Process absorb queue: map elements to API actions
  useEffect(() => {
    if (absorbQueue.length === 0 || !saveId) return;
    const next = absorbQueue[0];
    if (!next) return;
    if (processingAbsorbIdRef.current === next.id) return;
    processingAbsorbIdRef.current = next.id;

    const action = ELEMENT_ACTION[next.type];
    (async () => {
      try {
        const prevCount = useGameStore.getState().save?.species.length ?? 0;
        const s = await applyAction(saveId, action);
        setSave(s);
        const newSpecies = s.species.slice(prevCount)[0];

        // Show feedback toast
        const label = next.type === "crystal" ? "矿物质" : next.type === "spark" ? "能量" : next.type === "droplet" ? "有机质" : "突变";
        if (next.outcome === "positive") {
          setToasts((prev) => [...prev, { id: next.id, text: `水纹泛起新的反应 · ${label}+`, color: "#66BB6A" }]);
        } else if (next.outcome === "negative") {
          setToasts((prev) => [...prev, { id: next.id, text: "反应短暂失衡，潮池仍在调整", color: "#EF5350" }]);
        } else {
          setToasts((prev) => [...prev, { id: next.id, text: "第一道生命痕迹正在靠近", color: "#FFD54F" }]);
        }

        // Check species / talents
        if (newSpecies) {
          enqueueNarrative(speciesNarrative(newSpecies.id));
        } else if (s.pendingTalentChoices?.length > 0) {
          enqueueNarrative({
            id: `talent-awakening:${s.id}:${s.pendingTalentChoices.map((item) => item.id).join(",")}`,
            type: "talent-awakening",
            data: {},
            priority: 68,
          });
        }
      } catch {
        setToasts((prev) => [...prev, { id: next.id, text: "潮池暂时吸收不了这种变化", color: "#EF5350" }]);
      }
      processingAbsorbIdRef.current = null;
      dequeueAbsorb(next.id);
    })();
  }, [absorbQueue, saveId, enqueueNarrative]);

  // Clean up old toasts
  useEffect(() => {
    if (toasts.length === 0) return;
    const maxToastId = Math.max(...toasts.map((t) => t.id));
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id > maxToastId - 3));
    }, 2500);
    return () => clearTimeout(timer);
  }, [toasts]);

  useEffect(() => {
    if (!save || page === "create-ecology") return;
    for (const prompt of chapterNarrativesFor(save, snoozedEcologyEventId)) {
      enqueueNarrative(prompt);
    }
  }, [save, page, snoozedEcologyEventId, enqueueNarrative]);

  useEffect(() => {
    if (!save) return;
    const hints = unlockedHintsFor(save);
    const currentIds = new Set(hints.map((hint) => hint.id));
    if (!previousUnlockHintsRef.current) {
      previousUnlockHintsRef.current = currentIds;
      for (const id of currentIds) markUnlockHintSeen(id);
      return;
    }

    const previousIds = previousUnlockHintsRef.current;
    previousUnlockHintsRef.current = currentIds;
    const newlyUnlocked = hints.filter((hint) => !previousIds.has(hint.id) && !seenUnlockHints.includes(hint.id));
    if (newlyUnlocked.length === 0) return;
    for (const hint of newlyUnlocked) {
      enqueueNarrative({
        id: `unlock:${hint.id}`,
        type: "system-unlock",
        data: { ...hint, hintId: hint.id },
        priority: 30,
        seenHintId: hint.id,
      });
    }
  }, [save, seenUnlockHints, markUnlockHintSeen, enqueueNarrative]);

  useEffect(() => {
    if (!save) return;
    const records = save.hiddenTraces?.records ?? [];
    const currentIds = new Set(records.map((record) => record.id));
    if (!previousHiddenTracesRef.current) {
      previousHiddenTracesRef.current = currentIds;
      for (const id of currentIds) markUnlockHintSeen(`hidden-trace:${id}`);
      return;
    }

    const previousIds = previousHiddenTracesRef.current;
    previousHiddenTracesRef.current = currentIds;
    const discovered = records.filter((record) => !previousIds.has(record.id) && !seenUnlockHints.includes(`hidden-trace:${record.id}`));
    for (const record of discovered.reverse()) {
      window.dispatchEvent(new CustomEvent("hidden-trace-discovered", { detail: { visualCue: record.visualCue } }));
      enqueueNarrative({
        id: `hidden-trace:${record.id}`,
        type: "hidden-trace",
        data: { record },
        priority: 76,
        seenHintId: `hidden-trace:${record.id}`,
      });
    }
  }, [save?.hiddenTraces?.records, seenUnlockHints, markUnlockHintSeen, enqueueNarrative]);

  useEffect(() => {
    if (activeNarrative || unlockGuideTarget || modalType || sheetType || page === "create-ecology" || guide) return;
    activateNextNarrative();
  }, [activeNarrative, unlockGuideTarget, modalType, sheetType, page, guide, activateNextNarrative]);

  useEffect(() => {
    if (!activeNarrative || modalType || sheetType) return;
    showModal(activeNarrative.type, { ...(activeNarrative.data ?? {}), narrativeId: activeNarrative.id });
  }, [activeNarrative, modalType, sheetType, showModal]);

  useEffect(() => {
    const onIntervention = (event: Event) => {
      const detail = (event as CustomEvent<Omit<InterventionCue, "id">>).detail;
      if (!detail) return;
      setInterventionCue({
        id: Date.now(),
        name: detail.name,
        asset: detail.asset,
        deltas: detail.deltas ?? [],
      });
    };
    window.addEventListener("eco-intervention", onIntervention);
    return () => window.removeEventListener("eco-intervention", onIntervention);
  }, []);

  const isHome = page === "home";
  const isCreate = page === "create-ecology";

  return (
    <div
      className="game-container"
      style={{ "--ui-bg": `url(${uiAssets.backgrounds.homeTidepool})` } as CSSProperties}
    >
      {/* Phaser Canvas */}
      <div
        ref={phaserRef}
        className="phaser-canvas"
        style={{ opacity: isHome || isCreate ? 1 : 0.15 }}
      />

      {/* HUD layer */}
      {isHome && (
        <div className="hud-layer">
          <TopBar />
          <CurrentObjective />
          <TidepoolCollectButton
            onCollect={(text, deltas) => {
              const detail = deltas
                .slice(0, 3)
                .map(([key, value]) => `${RESOURCE_LABELS[key] ?? key}+${value}`)
                .join(" / ");
              setToasts((prev) => [...prev, { id: Date.now(), text: detail ? `${text} · ${detail}` : text, color: "#F5D078" }]);
            }}
          />
          <TidepoolStrategyButton />
        </div>
      )}

      {/* Feedback toasts */}
      <div className="toast-stack">
        {toasts.slice(-3).map((t) => (
          <FeedbackToast
            key={t.id}
            text={t.text}
            color={t.color}
            onDone={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          />
        ))}
      </div>

      {interventionCue && (
        <InterventionBurst
          key={interventionCue.id}
          cue={interventionCue}
          onDone={() => setInterventionCue(null)}
        />
      )}

      <Suspense fallback={null}>
        {/* Pages */}
        {!isHome && (
          <div key={page} className="page-transition-layer">
            {page === "create-ecology" && <CreateEcology />}
            {page === "evolution" && <EvolutionPage />}
            {page === "codex" && <CodexPage />}
            {page === "codex-detail" && <CodexDetailPage />}
            {page === "talents" && <TalentArchivePage />}
            {page === "fossils" && <FossilPage />}
            {page === "logs" && <LogPage />}
            {page === "leaderboard" && <LeaderboardPage />}
            {page === "settings" && <SettingsPage />}
            {page === "error" && <ErrorPage />}
          </div>
        )}

        {/* Modals */}
        {modalType === "species-discovery" && <SpeciesDiscovery />}
        {modalType === "talent-awakening" && <TalentAwakening />}
        {modalType === "offline-return" && <OfflineReturn />}
        {modalType === "ecology-event" && <EcologyEventModal />}
        {modalType === "decision-confirm" && <DecisionConfirm />}
        {modalType === "system-unlock" && <SystemUnlock />}
        {modalType === "hidden-trace" && <HiddenTraceDiscovery />}

        {/* Sheets */}
        {sheetType === "strategy" && <StrategySheet />}
      </Suspense>

      {/* Guide: only on home page */}
      {page === "home" && <GuideOverlay />}

      {unlockGuideTarget && <UnlockGuideOverlay target={unlockGuideTarget} />}

      {/* Bottom bar */}
      <BottomBar />
    </div>
  );
}

function unlockedHintsFor(save: NonNullable<ReturnType<typeof useGameStore.getState>["save"]>): UnlockHint[] {
  const hints: UnlockHint[] = [];
  if (canAnyEvolutionNodeUnlock(save)) {
    hints.push({
      id: "evolution",
      title: "生命痕迹可以查看了",
      name: "演化",
      description: "潮池里有一道新的痕迹浮上来了。",
      impact: "点亮它以后，后来的生命会顺着这道水纹多走一段。",
      advice: "不用急着选最强的路。每一道被留下的痕迹，都会让这片水少一点偶然。",
      icon: uiAssets.resources.mutation,
      actionLabel: "前往查看",
      targetPage: "evolution",
    });
  }
  if (save.unlockedNodes.length > 0) {
    hints.push({
      id: "strategy",
      title: "生态干预开放了",
      name: "生态干预",
      description: "潮池开始回应更细的引导。光照、矿物、潮汐和温度都能被轻轻推向不同方向。",
      impact: "干预会带来短期收益，也会给潮池留下长期压力。",
      advice: "轻轻推一把就好，潮池记得住你的每一次用力。",
      icon: uiAssets.emblems.reward,
      actionLabel: "前往干预",
    });
  }
  if (save.species.length > 0) {
    hints.push({
      id: "codex",
      title: "图鉴开放了",
      name: "图鉴",
      description: "已发现的生命会被记录下来，它们也会影响后续生态。",
      impact: "图鉴会帮你看懂物种角色、习性和它们正在改变什么。",
      advice: "先看见它们怎样活着，再决定要把潮池推向哪里。",
      icon: uiAssets.emblems.discovery,
      actionLabel: "前往查看",
      targetPage: "codex",
    });
  }
  if (save.legacies.length > 0) {
    hints.push({
      id: "fossils",
      title: "遗产开放了",
      name: "遗产",
      description: "退出当前生态的生命不会消失，它们会沉淀成后续潮池的影响。",
      impact: "有些退场不会消失，只会沉到更深处，成为后来生命脚下的地层。",
      advice: "失去不总是终点，有些消失会成为后来生命脚下的地层。",
      icon: uiAssets.cards.tide,
      actionLabel: "前往查看",
      targetPage: "fossils",
    });
  }
  if (save.logs.length > 3) {
    hints.push({
      id: "logs",
      title: "生命史开放了",
      name: "生命史",
      description: "重复变化会被整理成潮池记忆，关键节点会单独留下。",
      impact: "生命史会记录这颗星球怎样一步步变成现在的样子。",
      advice: "当你回头看时，最小的波纹也可能已经改写了岸线。",
      icon: uiAssets.emblems.system,
      actionLabel: "前往查看",
      targetPage: "logs",
    });
  }
  return hints;
}

function speciesNarrative(speciesId: string): NarrativePrompt {
  return {
    id: `species-discovery:${speciesId}`,
    type: "species-discovery",
    data: { speciesId },
    priority: 75,
  };
}

function chapterNarrativesFor(
  save: NonNullable<ReturnType<typeof useGameStore.getState>["save"]>,
  snoozedEcologyEventId: string | null,
): NarrativePrompt[] {
  const prompts: NarrativePrompt[] = [];
  const witness = save.chapterWitness?.ecologyBurst;
  const shorelineWitness = save.chapterWitness?.shorelineDifferentiation;

  if (save.pendingEcologyEvent && save.pendingEcologyEvent.id !== snoozedEcologyEventId) {
    prompts.push({
      id: `ecology-event:${save.pendingEcologyEvent.id}`,
      type: "ecology-event",
      priority: save.pendingEcologyEvent.id === "ebb_dryness" ? 65 : 100,
    });
  }

  if (save.chapterProgress?.chapter === "shoreline_differentiation" && shorelineWitness) {
    prompts.push({
      id: "chapter-shoreline-differentiation",
      type: "system-unlock",
      priority: 90,
      seenHintId: "chapter-shoreline-differentiation",
      data: {
        title: "水线露出来了",
        name: "潮池的边缘",
        description: "退潮把第一阵往复推到浅水之外，湿岩和仍未干去的沉积物第一次显现。",
        impact: "生命还没有离开潮池，但它们已经能看见另一种落脚处。",
        advice: "先观察岸边怎样变暗、反光，再让一缕水势靠近那圈湿痕。",
        icon: uiAssets.cards.tide,
        actionLabel: "看向水线",
      },
    });

    if (shorelineWitness.shoreColonized) {
      prompts.push({
        id: "shoreline-witness-colonized",
        type: "system-unlock",
        priority: 80,
        seenHintId: "shoreline-witness-colonized",
        data: {
          title: "有一支生命贴住了湿岸",
          name: "第一次贴岸",
          description: "水光只替它保留了一次机会；真正抓住湿岩的，是原有谱系自己的结构。",
          impact: "浅水与潮间湿岩开始留下不同姿态，潮池第一次拥有了边缘。",
          advice: "退潮很快会把这次尝试交给阳光、盐分和失水。",
          icon: uiAssets.species.producer,
          actionLabel: "看岸痕留下",
        },
      });
    }

    if (shorelineWitness.dryWetPressureWitnessed) {
      prompts.push({
        id: "shoreline-witness-pressure",
        type: "system-unlock",
        priority: 50,
        seenHintId: "shoreline-witness-pressure",
        data: {
          title: "退潮留下了一种岸线倾向",
          name: "晒痕之后",
          description: shorelinePressureCopy(shorelineWitness.shorelineStrategy),
          impact: "这次选择不会指定后来的物种，却会改变岸边更容易保住什么。",
          advice: "让下一阵回潮把岸边变化重新接回浅水。",
          icon: uiAssets.emblems.ecologyResonance,
          actionLabel: "等待回潮",
        },
      });
    }

    if (shorelineWitness.shorelineExchangeWitnessed) {
      prompts.push({
        id: "shoreline-witness-exchange",
        type: "system-unlock",
        priority: 35,
        seenHintId: "shoreline-witness-exchange",
        data: {
          title: "岸边与浅水接上了往返",
          name: "第一次回流",
          description: "回潮把岸边碎屑带回池中，原有循环也把养分重新送向湿岩。",
          impact: "越过水线的生命没有离开自己的历史，两处栖位开始互相影响。",
          advice: "潮池记忆会收下水线露出、第一次贴岸和第一次回流。",
          icon: uiAssets.cards.tide,
          actionLabel: "翻开潮池记忆",
          targetPage: "logs",
        },
      });
    }

    return prompts;
  }

  if (save.chapterProgress?.chapter !== "ecology_burst" || !witness) return prompts;

  prompts.push({
    id: "chapter-ecology-burst",
    type: "system-unlock",
    priority: 90,
    seenHintId: "chapter-ecology-burst",
    data: {
      title: "水面有了新的层次",
      name: "追光之后",
      description: "第一批生命没有停在原处。它们靠近光，也开始在浅层和池底留下不同的痕迹。",
      impact: "有的把光留住，有的把旧薄膜拆回材料，有的在潮水里筛住细小颗粒。",
      advice: "先看水里哪里变亮、哪里沉下、哪里开始清澈。潮池会自己说出下一步。",
      icon: uiAssets.emblems.ecologyResonance,
      actionLabel: "回到水边",
    },
  });

  if (witness.lightWitnessed) {
    prompts.push({
      id: "ecology-witness-light",
      type: "system-unlock",
      priority: 80,
      seenHintId: "ecology-witness-light",
      data: {
        title: "薄膜朝着光铺开",
        name: "追光的浅层",
        description: "水面上浮起一层很薄的光。那些生命开始把白昼留在自己身上。",
        impact: "潮池不再只是等待养分，它开始把外界的光变成自己的余温。",
        advice: "池底很快也会有动静。旧薄膜沉下去时，新的工作会在那里开始。",
        icon: uiAssets.species.producer,
        actionLabel: "看向池底",
      },
    });
  }

  if (witness.firstResonanceWitnessed) {
    prompts.push({
      id: "ecology-witness-resonance",
      type: "system-unlock",
      priority: 70,
      seenHintId: "ecology-witness-resonance",
      data: {
        title: "两处水痕接上了",
        name: "第一次回应",
        description: "沉下去的旧薄膜没有消失。它们被拆回材料，又被浅层的光接住。",
        impact: "潮池像是第一次学会把昨日的残余送回今天。",
        advice: "以后再有这样的牵动，只需看它让水更清、更盛，还是更会回收。",
        icon: uiAssets.emblems.ecologyResonance,
        actionLabel: "让它留下",
      },
    });
  }

  if (witness.cycleWitnessed) {
    prompts.push({
      id: "ecology-witness-cycle",
      type: "system-unlock",
      priority: 60,
      seenHintId: "ecology-witness-cycle",
      data: {
        title: "水里开始互相喂养",
        name: "小循环",
        description: "光、沉积和滤孔终于接成一阵缓慢的往复。潮池不再只靠外来的养分。",
        impact: "越能延续的水，也越容易长得过满。",
        advice: "接下来亲自选择潮池怎样承受自己的繁盛。",
        icon: uiAssets.emblems.ecologyResonance,
        actionLabel: "看水势变化",
      },
    });
  }

  if (witness.imbalanceWitnessed) {
    prompts.push({
      id: "ecology-witness-imbalance",
      type: "system-unlock",
      priority: 40,
      seenHintId: "ecology-witness-imbalance",
      data: {
        title: "水面承受过繁盛",
        name: "繁盛的压力",
        description: "薄膜长得太快，清水、空隙和呼吸都曾被挤压。",
        impact: "潮池留下的不只是增长，还有它怎样处理过盛。",
        advice: "现在可以把这段选择写进潮池记忆，让它成为这片水的性格。",
        icon: uiAssets.emblems.system,
        actionLabel: "留下这段水势",
      },
    });
  }

  if (save.chapterProgress.stage === "complete") {
    prompts.push({
      id: "chapter-ecology-complete",
      type: "system-unlock",
      priority: 5,
      seenHintId: "chapter-ecology-complete",
      data: {
        title: "第一阵往复已经接上",
        name: "潮池性格",
        description: "这片潮池不只是有生命，而是形成了自己的生态循环。",
        impact: "生产、分解和过滤彼此接续；繁盛带来的压力，也被它用自己的方式承受下来。",
        advice: "翻开潮池记忆，看看这片水怎样从追光走到自成循环。",
        icon: uiAssets.emblems.ecologyResonance,
        actionLabel: "翻开潮池记忆",
        targetPage: "logs",
      },
    });
  }

  return prompts;
}

function shorelinePressureCopy(strategy: string | undefined) {
  if (strategy === "rock_attachment") return "湿岩完全见光，一部分薄膜收缩，仍有附着斑抓住了更粗糙的岩面。";
  if (strategy === "tidal_dispersal") return "岸痕随回潮变淡，碎屑退回浅水，扩散比定居更早成为这片水的选择。";
  return "薄水膜多停留了一阵，第一处附着痕被保住，更远的岸面仍在等待。";
}

function isThirdChapterDebugPreview() {
  return import.meta.env.DEV && new URLSearchParams(window.location.search).has("debugChapter3");
}

function UnlockGuideOverlay({ target }: { target: string }) {
  const copy: Record<string, { title: string; desc: string }> = {
    evolution: { title: "新的痕迹正在发亮", desc: "跟随亮起的入口，看看这道变化要不要留下。" },
    codex: { title: "新的生命留下了名字", desc: "跟随亮起的入口，看看它如何被记录。" },
    fossils: { title: "旧谱系正在沉淀", desc: "跟随亮起的入口，看看失去留下了什么。" },
    logs: { title: "潮池开始记住自己", desc: "跟随亮起的入口，回看这些变化如何相连。" },
    strategy: { title: "潮池愿意被轻轻推动", desc: "跟随亮起的入口，亲自尝试一次生态干预。" },
  };
  const current = copy[target] ?? { title: "新的入口正在发亮", desc: "跟随亮起的入口，亲自打开一次。" };
  return (
    <div className={`unlock-guide-overlay target-${target}`} aria-live="polite">
      <div className="unlock-guide-card">
        <span className="unlock-guide-title">{current.title}</span>
        <span className="unlock-guide-desc">{current.desc}</span>
      </div>
    </div>
  );
}

function canAnyEvolutionNodeUnlock(save: NonNullable<ReturnType<typeof useGameStore.getState>["save"]>) {
  return evolutionNodes.some((node) => !save.unlockedNodes.includes(node.id) && canUnlockEvolutionNode(save, node.id));
}
