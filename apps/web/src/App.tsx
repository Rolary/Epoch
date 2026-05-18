import { useEffect, useRef, useState, useCallback } from "react";
import type { CSSProperties } from "react";
import * as Phaser from "phaser";
import { createPhaserGame } from "./phaser/config.js";
import { useGameStore } from "./stores/gameStore.js";
import type { ElementType, Outcome } from "./stores/gameStore.js";
import { useUIStore } from "./stores/uiStore.js";
import { ensureGuest, getSave, tickSave, getSaveId, applyAction } from "./api.js";
import { calculateResourceDelta } from "@eco-era/game-core";
import { TopBar } from "./components/hud/TopBar.js";
import { BottomBar } from "./components/hud/BottomBar.js";
import { CurrentObjective } from "./components/hud/CurrentObjective.js";
import { CreateEcology } from "./components/pages/CreateEcology.js";
import { EvolutionPage } from "./components/pages/EvolutionPage.js";
import { CodexPage, CodexDetailPage } from "./components/pages/CodexPage.js";
import { FossilPage } from "./components/pages/FossilPage.js";
import { LogPage } from "./components/pages/LogPage.js";
import { SettingsPage } from "./components/pages/SettingsPage.js";
import { ErrorPage } from "./components/pages/ErrorPage.js";
import { SpeciesDiscovery } from "./components/modals/SpeciesDiscovery.js";
import { TalentAwakening } from "./components/modals/TalentAwakening.js";
import { OfflineReturn } from "./components/modals/OfflineReturn.js";
import { SystemUnlock } from "./components/modals/SystemUnlock.js";
import { StrategySheet } from "./components/sheets/StrategySheet.js";
import { GuideOverlay } from "./components/overlays/GuideOverlay.js";
import { uiAssets } from "./assets/uiAssets.js";

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
  const updateLastTick = useGameStore((s) => s.updateLastTick);
  const absorbQueue = useGameStore((s) => s.absorbQueue);
  const dequeueAbsorb = useGameStore((s) => s.dequeueAbsorb);

  const [toasts, setToasts] = useState<Array<{ id: number; text: string; color: string }>>([]);
  const [interventionCue, setInterventionCue] = useState<InterventionCue | null>(null);

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
        setGuestReady(true);
        setPage("home");
      } catch { setPage("create-ecology"); }
    };
    restore();
  }, []);

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
        const s = await tickSave(saveId);
        setSave(s);
        const prevCount = save?.species.length ?? 0;
        if (s.species.length > prevCount) {
          showModal("species-discovery", { speciesId: s.species[0].id });
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

    const action = ELEMENT_ACTION[next.type];
    (async () => {
      try {
        const s = await applyAction(saveId, action);
        setSave(s);

        // Show feedback toast
        const label = next.type === "crystal" ? "矿物质" : next.type === "spark" ? "能量" : next.type === "droplet" ? "有机质" : "突变";
        if (next.outcome === "positive") {
          setToasts((prev) => [...prev, { id: next.id, text: `水里变得不一样了 · ${label}+`, color: "#66BB6A" }]);
        } else if (next.outcome === "negative") {
          setToasts((prev) => [...prev, { id: next.id, text: "反应短暂失衡，潮池仍在调整", color: "#EF5350" }]);
        } else {
          setToasts((prev) => [...prev, { id: next.id, text: "第一道生命痕迹正在靠近", color: "#FFD54F" }]);
          // Check for new species
          const prevCount = save?.species.length ?? 0;
          if (s.species.length > prevCount) {
            showModal("species-discovery", { speciesId: s.species[0].id });
          }
        }

        // Check species / talents
        const prevCount = save?.species.length ?? 0;
        if (s.species.length > prevCount && next.outcome !== "rare") {
          showModal("species-discovery", { speciesId: s.species[0].id });
        }
        if (s.pendingTalentChoices?.length > 0) {
          showModal("talent-awakening");
        }
      } catch {
        setToasts((prev) => [...prev, { id: next.id, text: "潮池暂时吸收不了这种变化", color: "#EF5350" }]);
      }
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
      {modalType === "system-unlock" && <SystemUnlock />}

      {/* Sheets */}
      {sheetType === "strategy" && <StrategySheet />}

      {/* Guide — only on home page */}
      {page === "home" && <GuideOverlay />}

      {/* Bottom bar */}
      <BottomBar />
    </div>
  );
}
