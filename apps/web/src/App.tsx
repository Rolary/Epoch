import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import * as Phaser from "phaser";
import { createPhaserGame } from "./phaser/config.js";
import { useGameStore } from "./stores/gameStore.js";
import type { ElementType, Outcome } from "./stores/gameStore.js";
import { useUIStore } from "./stores/uiStore.js";
import type { Page } from "./stores/uiStore.js";
import { ensureGuest, getSave, tickSave, getSaveId, applyAction } from "./api.js";
import { calculateResourceDelta, canUnlockEvolutionNode, evolutionNodes } from "@eco-era/game-core";
import { TopBar } from "./components/hud/TopBar.js";
import { BottomBar } from "./components/hud/BottomBar.js";
import { CurrentObjective } from "./components/hud/CurrentObjective.js";
import { GuideOverlay } from "./components/overlays/GuideOverlay.js";
import { uiAssets } from "./assets/uiAssets.js";

const CreateEcology = lazy(() => import("./components/pages/CreateEcology.js").then((m) => ({ default: m.CreateEcology })));
const EvolutionPage = lazy(() => import("./components/pages/EvolutionPage.js").then((m) => ({ default: m.EvolutionPage })));
const CodexPage = lazy(() => import("./components/pages/CodexPage.js").then((m) => ({ default: m.CodexPage })));
const CodexDetailPage = lazy(() => import("./components/pages/CodexPage.js").then((m) => ({ default: m.CodexDetailPage })));
const FossilPage = lazy(() => import("./components/pages/FossilPage.js").then((m) => ({ default: m.FossilPage })));
const LogPage = lazy(() => import("./components/pages/LogPage.js").then((m) => ({ default: m.LogPage })));
const SettingsPage = lazy(() => import("./components/pages/SettingsPage.js").then((m) => ({ default: m.SettingsPage })));
const ErrorPage = lazy(() => import("./components/pages/ErrorPage.js").then((m) => ({ default: m.ErrorPage })));
const SpeciesDiscovery = lazy(() => import("./components/modals/SpeciesDiscovery.js").then((m) => ({ default: m.SpeciesDiscovery })));
const TalentAwakening = lazy(() => import("./components/modals/TalentAwakening.js").then((m) => ({ default: m.TalentAwakening })));
const OfflineReturn = lazy(() => import("./components/modals/OfflineReturn.js").then((m) => ({ default: m.OfflineReturn })));
const SystemUnlock = lazy(() => import("./components/modals/SystemUnlock.js").then((m) => ({ default: m.SystemUnlock })));
const EcologyEventModal = lazy(() => import("./components/modals/EcologyEventModal.js").then((m) => ({ default: m.EcologyEventModal })));
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

export function App() {
  const phaserRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const processingAbsorbIdRef = useRef<number | null>(null);
  const previousUnlockHintsRef = useRef<Set<string> | null>(null);
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
  const unlockGuideTarget = useUIStore((s) => s.unlockGuideTarget);
  const hydrateScopedUIState = useUIStore((s) => s.hydrateScopedUIState);
  const snoozedEcologyEventId = useUIStore((s) => s.snoozedEcologyEventId);
  const updateLastTick = useGameStore((s) => s.updateLastTick);
  const absorbQueue = useGameStore((s) => s.absorbQueue);
  const dequeueAbsorb = useGameStore((s) => s.dequeueAbsorb);

  const [toasts, setToasts] = useState<Array<{ id: number; text: string; color: string }>>([]);
  const [interventionCue, setInterventionCue] = useState<InterventionCue | null>(null);
  const [unlockHintQueue, setUnlockHintQueue] = useState<UnlockHint[]>([]);
  const [activeUnlockHintId, setActiveUnlockHintId] = useState<string | null>(null);

  useEffect(() => {
    const scope = save?.id ?? null;
    if (activeSaveScopeRef.current === scope) return;
    activeSaveScopeRef.current = scope;
    previousUnlockHintsRef.current = null;
    setUnlockHintQueue([]);
    setActiveUnlockHintId(null);
  }, [save?.id]);

  // Initialize Phaser
  useEffect(() => {
    if (phaserRef.current && !gameRef.current) {
      const game = createPhaserGame(phaserRef.current);
      gameRef.current = game;
      // Scene may not be immediately available — wait for next frame
      const tryWire = () => {
        const scene = game.scene.getScene("HomeScene") as {
          onAbsorb?: (type: ElementType, outcome: Outcome) => void;
        } | null;
        if (scene) {
          scene.onAbsorb = (type: ElementType, outcome: Outcome) => {
            useGameStore.getState().enqueueAbsorb(type, outcome);
          };
        } else {
          requestAnimationFrame(tryWire);
        }
      };
      requestAnimationFrame(tryWire);
    }
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  // Restore session
  useEffect(() => {
    const restore = async () => {
      const existingId = getSaveId();
      if (!existingId) { setPage("create-ecology"); return; }
      try {
        await ensureGuest();
        const s = await getSave(existingId);
        setSave(s);
        setSaveId(s.id);
        hydrateScopedUIState();
        setGuestReady(true);
        setPage("home");
      } catch { setPage("create-ecology"); }
    };
    restore();
  }, [hydrateScopedUIState]);

  // Local prediction tick
  useEffect(() => {
    if (!save || page !== "home") return;
    const interval = setInterval(() => {
      const state = useGameStore.getState();
      if (!state.save) return;
      const now = Date.now();
      const elapsed = (now - state.lastLocalTick) / 1000;
      const delta = calculateResourceDelta(state.save, Math.min(elapsed, 5));
      const next = { ...state.save };
      for (const key of Object.keys(delta) as Array<keyof typeof delta>) {
        next.resources[key] = Math.min(999999, next.resources[key] + delta[key]);
      }
      next.resources.stability = Math.max(0, Math.min(100, next.resources.stability));
      useGameStore.getState().setSave(next);
      useGameStore.getState().updateLastTick();
    }, 1000);
    return () => clearInterval(interval);
  }, [save, page]);

  // Periodic API sync
  useEffect(() => {
    if (!saveId || page !== "home") return;
    const interval = setInterval(async () => {
      try {
        const prevCount = useGameStore.getState().save?.species.length ?? 0;
        const s = await tickSave(saveId);
        setSave(s);
        const newSpecies = s.species.slice(prevCount);
        if (newSpecies.length > 0) {
          showModal("species-discovery", { speciesId: newSpecies[0].id });
        }
        if (s.pendingTalentChoices?.length > 0) {
          showModal("talent-awakening");
        }
      } catch { /* silent */ }
    }, 15000);
    return () => clearInterval(interval);
  }, [saveId, page]);

  // Process absorb queue — map elements → API actions
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
          setToasts((prev) => [...prev, { id: next.id, text: `水里变得不一样了 · ${label}+`, color: "#66BB6A" }]);
        } else if (next.outcome === "negative") {
          setToasts((prev) => [...prev, { id: next.id, text: "反应短暂失衡，潮池仍在调整", color: "#EF5350" }]);
        } else {
          setToasts((prev) => [...prev, { id: next.id, text: "第一道生命痕迹正在靠近", color: "#FFD54F" }]);
        }

        // Check species / talents
        if (newSpecies) {
          showModal("species-discovery", {
            speciesId: newSpecies.id,
            showTalentAfter: s.pendingTalentChoices?.length > 0,
          });
        } else if (s.pendingTalentChoices?.length > 0) {
          showModal("talent-awakening");
        }
      } catch {
        setToasts((prev) => [...prev, { id: next.id, text: "潮池暂时吸收不了这种变化", color: "#EF5350" }]);
      }
      processingAbsorbIdRef.current = null;
      dequeueAbsorb(next.id);
    })();
  }, [absorbQueue, saveId]);

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
    if (!save?.pendingEcologyEvent || modalType || page !== "home") return;
    if (save.pendingEcologyEvent.id === snoozedEcologyEventId) return;
    showModal("ecology-event");
  }, [save?.pendingEcologyEvent?.id, snoozedEcologyEventId, modalType, page]);

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
    setUnlockHintQueue((queue) => {
      const queued = new Set(queue.map((hint) => hint.id));
      if (activeUnlockHintId) queued.add(activeUnlockHintId);
      return [...queue, ...newlyUnlocked.filter((hint) => !queued.has(hint.id))];
    });
  }, [save, seenUnlockHints, markUnlockHintSeen, activeUnlockHintId]);

  useEffect(() => {
    if (!activeUnlockHintId) return;
    if (seenUnlockHints.includes(activeUnlockHintId)) setActiveUnlockHintId(null);
  }, [activeUnlockHintId, seenUnlockHints]);

  useEffect(() => {
    if (
      unlockHintQueue.length === 0 ||
      activeUnlockHintId ||
      unlockGuideTarget ||
      modalType ||
      sheetType ||
      page === "create-ecology" ||
      useUIStore.getState().guide
    ) return;
    const [next, ...rest] = unlockHintQueue;
    setUnlockHintQueue(rest);
    setActiveUnlockHintId(next.id);
    showModal("system-unlock", {
      hintId: next.id,
      title: next.title,
      name: next.name,
      description: next.description,
      impact: next.impact,
      advice: next.advice,
      icon: next.icon,
      actionLabel: next.actionLabel,
    });
  }, [unlockHintQueue, activeUnlockHintId, unlockGuideTarget, modalType, sheetType, page, showModal]);

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
        {page === "create-ecology" && <CreateEcology />}
        {page === "evolution" && <EvolutionPage />}
        {page === "codex" && <CodexPage />}
        {page === "codex-detail" && <CodexDetailPage />}
        {page === "fossils" && <FossilPage />}
        {page === "logs" && <LogPage />}
        {page === "settings" && <SettingsPage />}
        {page === "error" && <ErrorPage />}

        {/* Modals */}
        {modalType === "species-discovery" && <SpeciesDiscovery />}
        {modalType === "talent-awakening" && <TalentAwakening />}
        {modalType === "offline-return" && <OfflineReturn />}
        {modalType === "ecology-event" && <EcologyEventModal />}
        {modalType === "system-unlock" && <SystemUnlock />}

        {/* Sheets */}
        {sheetType === "strategy" && <StrategySheet />}
      </Suspense>

      {/* Guide — only on home page */}
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
      description: "潮池里出现了可以确认的结构痕迹。",
      impact: "点亮痕迹会推进主线，也会改变后续生命出现的条件。",
      advice: "不是每一道痕迹都通向强大，但每一次确认都会让未来少一点偶然。",
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
      description: "退出当下生态的生命不会消失，它们会沉淀成后续潮池的影响。",
      impact: "遗产会把灭绝、退场和旧谱系变成长期加成或代价。",
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

function UnlockGuideOverlay({ target }: { target: string }) {
  const copy: Record<string, { title: string; desc: string }> = {
    evolution: { title: "新的痕迹正在发亮", desc: "跟随亮起的入口，亲自确认这道变化。" },
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
